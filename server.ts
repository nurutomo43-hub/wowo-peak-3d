import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SocketMeta {
  roomCode: string | null;
  role: 'teacher' | 'student' | null;
  id: string | null;
}

type TaggedWebSocket = WebSocket & { meta: SocketMeta };

interface AvatarConfig {
  gender?: string;
  outfit?: string;
  pantsStyle?: string;
  jacket: string;
  pantsColor?: string;
  skinColor?: string;
  hairStyle?: string;
  hairColor?: string;
  headAccessory?: string;
  hat?: string;
  glasses?: boolean;
  backGear?: string;
  pack: string;
  superheroSuit?: string;
}

interface PlayerPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  cp?: number;
  state?: 'idle' | 'walk' | 'jump' | 'climb' | 'slide' | 'hurt';
}

interface EssayAnswerRecord {
  no: number;
  question: string;
  studentAnswer: string;
  correctKey: string;
  isCorrect: boolean;
  timeSpent: number;
}

interface StudentRecord {
  id: string;
  name: string;
  avatar: AvatarConfig;
  ws: TaggedWebSocket | null;
  currentCP: number;
  completedCPs: number[];
  score: number;
  correctCount: number;
  wrongCount: number;
  essayCorrect: number;
  essayWrong: number;
  essayDone: boolean;
  fallCount: number;
  answers: Array<{
    cp: number;
    question: string;
    chosen: string;
    correctKey: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
  essayAnswers: EssayAnswerRecord[];
  pose: PlayerPose;
}

interface RoomRecord {
  code: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: AvatarConfig;
  teacherPose: PlayerPose;
  teacherWs: TaggedWebSocket | null;
  students: Map<string, StudentRecord>;
  kickedIds: Set<string>;
  paused: boolean;
  sessionEnded: boolean;
  remainingSec: number;
  questions: unknown[] | null;
  essayQuestions: unknown[] | null;
  settings: {
    timeOfDay: string;
    weather: string;
    quizDuration: number;
    sessionDurationMinutes: number;
    explanationDurationSec: number;
    difficultyLevel: number;
    respawnMode: string;
    pgWeight: number;
    essayWeight: number;
  };
}

const rooms = new Map<string, RoomRecord>();

function generateRoomCode(): string {
  let code: string;
  do {
    code = String(Math.floor(10000 + Math.random() * 90000));
  } while (rooms.has(code));
  return code;
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Pendaki';
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 18);
  return cleaned || 'Pendaki';
}

function send(ws: TaggedWebSocket | null, type: string, payload: Record<string, unknown> = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function broadcastRoom(
  room: RoomRecord,
  type: string,
  payload: Record<string, unknown> = {},
  excludeWs: TaggedWebSocket | null = null,
) {
  const msg = JSON.stringify({ type, ...payload });
  if (room.teacherWs && room.teacherWs !== excludeWs && room.teacherWs.readyState === WebSocket.OPEN) {
    room.teacherWs.send(msg);
  }
  for (const student of room.students.values()) {
    if (student.ws && student.ws !== excludeWs && student.ws.readyState === WebSocket.OPEN) {
      student.ws.send(msg);
    }
  }
}

function getParticipantsSnapshot(room: RoomRecord) {
  const list = Array.from(room.students.values()).map((s) => ({
    id: s.id,
    name: s.name,
    avatar: s.avatar,
    currentCP: s.currentCP,
    score: s.score,
    correctCount: s.correctCount,
    wrongCount: s.wrongCount,
    essayCorrect: s.essayCorrect,
    essayWrong: s.essayWrong,
    essayDone: s.essayDone,
    fallCount: s.fallCount,
    online: Boolean(s.ws && s.ws.readyState === WebSocket.OPEN),
    finished: s.currentCP >= 25 && s.completedCPs.includes(25) && s.essayDone,
  }));
  list.sort(
    (a, b) =>
      b.correctCount + b.essayCorrect - (a.correctCount + a.essayCorrect) ||
      b.score - a.score ||
      b.currentCP - a.currentCP ||
      a.fallCount - b.fallCount,
  );
  return list;
}

function getPublicRoomState(room: RoomRecord) {
  return {
    roomCode: room.code,
    settings: room.settings,
    paused: room.paused,
    sessionEnded: room.sessionEnded,
    remainingSec: Math.max(0, Math.round(room.remainingSec)),
    questionCount: room.questions ? room.questions.length : 0,
    essayQuestionCount: room.essayQuestions ? room.essayQuestions.length : 0,
    participants: getParticipantsSnapshot(room),
  };
}

function endRoomSession(room: RoomRecord, reason: 'teacher' | 'timeout') {
  if (room.sessionEnded) return;
  room.sessionEnded = true;
  room.paused = true;
  room.remainingSec = 0;
  const leaderboard = getParticipantsSnapshot(room);
  const exportRows = Array.from(room.students.values()).map((s) => ({
    id: s.id,
    name: s.name,
    currentCP: s.currentCP,
    score: s.score,
    correctCount: s.correctCount,
    wrongCount: s.wrongCount,
    essayCorrect: s.essayCorrect,
    essayWrong: s.essayWrong,
    essayDone: s.essayDone,
    fallCount: s.fallCount,
    answers: s.answers,
    essayAnswers: s.essayAnswers,
  }));
  broadcastRoom(room, 'session_ended', { reason, leaderboard, exportRows });
}

function broadcastParticipants(room: RoomRecord) {
  broadcastRoom(room, 'participants_update', {
    participants: getParticipantsSnapshot(room),
  });
}

function collectOtherPlayers(room: RoomRecord, excludeId: string) {
  const arr: Array<Record<string, unknown>> = [];
  if (room.teacherId !== excludeId && room.teacherWs && room.teacherWs.readyState === WebSocket.OPEN) {
    arr.push({
      id: room.teacherId,
      role: 'teacher',
      name: room.teacherName,
      avatar: room.teacherAvatar,
      currentCP: room.teacherPose.cp || 0,
      score: 0,
      pose: room.teacherPose,
    });
  }
  for (const s of room.students.values()) {
    if (s.id !== excludeId && s.ws && s.ws.readyState === WebSocket.OPEN) {
      arr.push({
        id: s.id,
        role: 'student',
        name: s.name,
        avatar: s.avatar,
        currentCP: s.currentCP,
        score: s.score,
        pose: s.pose,
      });
    }
  }
  return arr;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  wss.on('connection', (rawWs: WebSocket) => {
    const ws = rawWs as TaggedWebSocket;
    ws.meta = { roomCode: null, role: null, id: null };

    ws.on('message', (rawData) => {
      let data: Record<string, any>;
      try {
        data = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      const { type } = data;

      if (type === 'create_room') {
        const code = generateRoomCode();
        const teacherName = sanitizeName(data.name || 'Guru Pemantau');
        const initDur = Math.min(45, Math.max(15, Number(data.quizDuration) || 30));
        const rawSessionMin = Number(data.sessionDurationMinutes);
        const sessionMin = [10, 15, 20, 25, 30].includes(rawSessionMin)
          ? rawSessionMin
          : Math.min(30, Math.max(10, rawSessionMin || 20));
        const rawExpSec = Number(data.explanationDurationSec);
        const expSec = Math.min(60, Math.max(40, rawExpSec || 45));
        const pgW = typeof data.pgWeight === 'number' ? data.pgWeight : 75;
        const esW = typeof data.essayWeight === 'number' ? data.essayWeight : 25;
        const room: RoomRecord = {
          code,
          teacherId: String(data.clientId || `teacher_${Date.now()}`),
          teacherName,
          teacherAvatar: data.avatar || {
            gender: 'male',
            outfit: 'windbreaker',
            pantsStyle: 'cargo',
            jacket: '#d97706',
            pantsColor: '#292524',
            skinColor: '#f1c27d',
            hairStyle: 'side_part',
            hairColor: '#1c1917',
            headAccessory: 'rimba',
            hat: 'rimba',
            glasses: true,
            backGear: 'carrier',
            pack: '#1f2937',
            superheroSuit: 'none',
          },
          teacherPose: { x: 0, y: 4.0, z: 1080, yaw: 0, cp: 0, state: 'idle' },
          teacherWs: ws,
          students: new Map(),
          kickedIds: new Set(),
          paused: false,
          sessionEnded: false,
          remainingSec: sessionMin * 60,
          questions: Array.isArray(data.questions) && data.questions.length > 0 ? data.questions : null,
          essayQuestions:
            Array.isArray(data.essayQuestions) && data.essayQuestions.length > 0
              ? data.essayQuestions
              : null,
          settings: {
            timeOfDay: 'pagi',
            weather: 'cerah',
            quizDuration: initDur,
            sessionDurationMinutes: sessionMin,
            explanationDurationSec: expSec,
            difficultyLevel: 3,
            respawnMode: 'last_cp',
            pgWeight: pgW,
            essayWeight: esW,
          },
        };
        rooms.set(code, room);
        ws.meta = { roomCode: code, role: 'teacher', id: room.teacherId };
        send(ws, 'room_created', {
          roomState: getPublicRoomState(room),
          questions: room.questions,
          essayQuestions: room.essayQuestions,
        });
        return;
      }

      if (type === 'join_room') {
        const code = String(data.roomCode || '').trim();
        const room = rooms.get(code);
        if (!room) {
          send(ws, 'error_msg', { message: `Ruangan "${code}" tidak ditemukan atau sudah ditutup.` });
          return;
        }

        const role = data.role === 'teacher' ? 'teacher' : 'student';

        if (role === 'teacher') {
          if (data.clientId && data.clientId === room.teacherId) {
            room.teacherWs = ws;
            ws.meta = { roomCode: code, role: 'teacher', id: room.teacherId };
            send(ws, 'joined_room', {
              role: 'teacher',
              id: room.teacherId,
              roomState: getPublicRoomState(room),
              questions: room.questions,
              essayQuestions: room.essayQuestions,
              otherPlayers: collectOtherPlayers(room, room.teacherId),
            });
          } else {
            send(ws, 'error_msg', { message: 'Kode ruangan sudah dimiliki Guru lain.' });
          }
          return;
        }

        const studentId = String(
          data.studentId || `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        );
        if (room.kickedIds.has(studentId)) {
          send(ws, 'kicked', { message: 'Anda telah dikeluarkan dari ruangan ini oleh Guru.' });
          return;
        }

        const cleanName = sanitizeName(data.name);
        let student = room.students.get(studentId);
        const rp = data.restoreProgress || {};

        if (student) {
          student.ws = ws;
          student.name = cleanName || student.name;
          if (data.avatar) student.avatar = data.avatar;
          if (typeof rp.currentCP === 'number' && rp.currentCP > student.currentCP) {
            student.currentCP = Math.min(25, Math.max(0, rp.currentCP));
          }
          if (typeof rp.score === 'number' && rp.score > student.score) {
            student.score = rp.score;
          }
          if (Array.isArray(rp.completedCPs) && rp.completedCPs.length > student.completedCPs.length) {
            student.completedCPs = rp.completedCPs;
          }
          if (typeof rp.essayCorrect === 'number' && rp.essayCorrect > student.essayCorrect) {
            student.essayCorrect = rp.essayCorrect;
          }
          if (typeof rp.essayWrong === 'number' && rp.essayWrong > student.essayWrong) {
            student.essayWrong = rp.essayWrong;
          }
          if (rp.essayDone) {
            student.essayDone = true;
          }
          if (Array.isArray(rp.essayAnswers) && rp.essayAnswers.length > student.essayAnswers.length) {
            student.essayAnswers = rp.essayAnswers;
          }
        } else {
          student = {
            id: studentId,
            name: cleanName,
            avatar: data.avatar || {
              gender: 'male',
              outfit: 'windbreaker',
              pantsStyle: 'cargo',
              jacket: '#ef4444',
              pantsColor: '#1e293b',
              skinColor: '#f1c27d',
              hairStyle: 'short',
              hairColor: '#1c1917',
              headAccessory: 'rimba',
              hat: 'rimba',
              glasses: false,
              backGear: 'carrier',
              pack: '#78350f',
              superheroSuit: 'none',
            },
            ws,
            currentCP: typeof rp.currentCP === 'number' ? Math.min(25, Math.max(0, rp.currentCP)) : 0,
            completedCPs: Array.isArray(rp.completedCPs) ? rp.completedCPs : [],
            score: typeof rp.score === 'number' ? rp.score : 0,
            correctCount: typeof rp.correctCount === 'number' ? rp.correctCount : 0,
            wrongCount: typeof rp.wrongCount === 'number' ? rp.wrongCount : 0,
            essayCorrect: typeof rp.essayCorrect === 'number' ? rp.essayCorrect : 0,
            essayWrong: typeof rp.essayWrong === 'number' ? rp.essayWrong : 0,
            essayDone: Boolean(rp.essayDone),
            fallCount: typeof rp.fallCount === 'number' ? rp.fallCount : 0,
            answers: Array.isArray(rp.answers) ? rp.answers : [],
            essayAnswers: Array.isArray(rp.essayAnswers) ? rp.essayAnswers : [],
            pose: rp.pose || { x: 0, y: 4.0, z: 1080, yaw: 0, state: 'idle' },
          };
          room.students.set(studentId, student);
        }

        ws.meta = { roomCode: code, role: 'student', id: studentId };

        send(ws, 'joined_room', {
          role: 'student',
          id: studentId,
          name: student.name,
          studentData: {
            currentCP: student.currentCP,
            completedCPs: student.completedCPs,
            score: student.score,
            correctCount: student.correctCount,
            wrongCount: student.wrongCount,
            essayCorrect: student.essayCorrect,
            essayWrong: student.essayWrong,
            essayDone: student.essayDone,
            fallCount: student.fallCount,
            answers: student.answers,
            essayAnswers: student.essayAnswers,
          },
          roomState: getPublicRoomState(room),
          questions: room.questions,
          essayQuestions: room.essayQuestions,
          otherPlayers: collectOtherPlayers(room, studentId),
        });

        broadcastRoom(
          room,
          'player_joined',
          {
            player: {
              id: student.id,
              role: 'student',
              name: student.name,
              avatar: student.avatar,
              currentCP: student.currentCP,
              score: student.score,
              pose: student.pose,
            },
          },
          ws,
        );

        broadcastParticipants(room);
        return;
      }

      const room = ws.meta.roomCode ? rooms.get(ws.meta.roomCode) : undefined;
      if (!room) return;

      if (type === 'player_update') {
        const { pose } = data;
        if (!pose) return;
        if (ws.meta.role === 'teacher') {
          room.teacherPose = pose;
          broadcastRoom(
            room,
            'player_moved',
            {
              id: ws.meta.id,
              role: 'teacher',
              name: room.teacherName,
              avatar: room.teacherAvatar,
              currentCP: data.currentCP || 0,
              score: 0,
              pose,
            },
            ws,
          );
        } else if (ws.meta.id) {
          const student = room.students.get(ws.meta.id);
          if (!student) return;
          student.pose = pose;
          broadcastRoom(
            room,
            'player_moved',
            {
              id: student.id,
              role: 'student',
              name: student.name,
              avatar: student.avatar,
              currentCP: student.currentCP,
              score: student.score,
              pose,
            },
            ws,
          );
        }
        return;
      }

      if (type === 'update_avatar' && data.avatar) {
        if (ws.meta.role === 'teacher') {
          room.teacherAvatar = data.avatar;
          broadcastRoom(
            room,
            'player_avatar_updated',
            { id: ws.meta.id, role: 'teacher', avatar: room.teacherAvatar },
            ws,
          );
        } else if (ws.meta.id) {
          const student = room.students.get(ws.meta.id);
          if (!student) return;
          student.avatar = data.avatar;
          broadcastRoom(
            room,
            'player_avatar_updated',
            { id: student.id, role: 'student', avatar: student.avatar },
            ws,
          );
          broadcastParticipants(room);
        }
        return;
      }

      if (type === 'player_emote' && typeof data.emote === 'string' && ws.meta.id) {
        broadcastRoom(
          room,
          'player_emote',
          { id: ws.meta.id, emote: data.emote },
          ws,
        );
        return;
      }

      if (type === 'student_progress' && ws.meta.id) {
        const student = room.students.get(ws.meta.id);
        if (!student) return;
        if (typeof data.currentCP === 'number') student.currentCP = Math.min(25, Math.max(0, data.currentCP));
        if (Array.isArray(data.completedCPs)) student.completedCPs = data.completedCPs;
        if (typeof data.score === 'number') student.score = data.score;
        if (typeof data.correctCount === 'number') student.correctCount = data.correctCount;
        if (typeof data.wrongCount === 'number') student.wrongCount = data.wrongCount;
        if (typeof data.essayCorrect === 'number') student.essayCorrect = data.essayCorrect;
        if (typeof data.essayWrong === 'number') student.essayWrong = data.essayWrong;
        if (typeof data.essayDone === 'boolean') student.essayDone = data.essayDone;
        if (typeof data.fallCount === 'number') student.fallCount = data.fallCount;
        if (data.newAnswer) student.answers.push(data.newAnswer);
        if (data.newEssayAnswer) {
          const idx = student.essayAnswers.findIndex((e) => e.no === data.newEssayAnswer.no);
          if (idx >= 0) student.essayAnswers[idx] = data.newEssayAnswer;
          else student.essayAnswers.push(data.newEssayAnswer);
        }

        broadcastParticipants(room);
        broadcastRoom(
          room,
          'player_moved',
          {
            id: student.id,
            role: 'student',
            name: student.name,
            avatar: student.avatar,
            currentCP: student.currentCP,
            score: student.score,
            pose: student.pose,
          },
          ws,
        );
        return;
      }

      // Teacher-only commands
      if (ws.meta.role !== 'teacher') return;

      if (type === 'update_settings') {
        const s = data.settings || {};
        if (typeof s.timeOfDay === 'string') room.settings.timeOfDay = s.timeOfDay;
        if (typeof s.weather === 'string') room.settings.weather = s.weather;
        if (typeof s.quizDuration === 'number') {
          room.settings.quizDuration = Math.min(45, Math.max(15, s.quizDuration));
        }
        if (typeof s.explanationDurationSec === 'number') {
          room.settings.explanationDurationSec = Math.min(60, Math.max(40, s.explanationDurationSec));
        }
        if (typeof s.sessionDurationMinutes === 'number' && !room.sessionEnded) {
          const prevTotal = room.settings.sessionDurationMinutes * 60;
          const nextMin = Math.min(30, Math.max(10, Math.round(s.sessionDurationMinutes)));
          if (nextMin !== room.settings.sessionDurationMinutes) {
            const elapsed = Math.max(0, prevTotal - room.remainingSec);
            room.settings.sessionDurationMinutes = nextMin;
            room.remainingSec = Math.max(15, nextMin * 60 - elapsed);
            broadcastRoom(room, 'timer_sync', {
              remainingSec: Math.round(room.remainingSec),
              sessionDurationMinutes: room.settings.sessionDurationMinutes,
              paused: room.paused,
            });
          }
        }
        if (typeof s.difficultyLevel === 'number') {
          room.settings.difficultyLevel = Math.min(10, Math.max(1, s.difficultyLevel));
        }
        if (typeof s.pgWeight === 'number' && typeof s.essayWeight === 'number' && s.pgWeight + s.essayWeight === 100) {
          room.settings.pgWeight = s.pgWeight;
          room.settings.essayWeight = s.essayWeight;
        }
        if (
          s.respawnMode === 'last_cp' ||
          s.respawnMode === 'prev_cp' ||
          s.respawnMode === 'base_camp'
        ) {
          room.settings.respawnMode = s.respawnMode;
        }
        broadcastRoom(room, 'settings_updated', { settings: room.settings });
        return;
      }

      if (type === 'set_questions') {
        room.questions =
          Array.isArray(data.questions) && data.questions.length > 0 ? data.questions : null;
        broadcastRoom(room, 'questions_updated', { questions: room.questions });
        return;
      }

      if (type === 'set_essay_questions') {
        room.essayQuestions =
          Array.isArray(data.essayQuestions) && data.essayQuestions.length > 0
            ? data.essayQuestions
            : null;
        broadcastRoom(room, 'essay_questions_updated', { essayQuestions: room.essayQuestions });
        return;
      }

      if (type === 'toggle_pause') {
        room.paused = Boolean(data.paused);
        broadcastRoom(room, 'pause_updated', { paused: room.paused });
        broadcastRoom(room, 'timer_sync', {
          remainingSec: Math.round(room.remainingSec),
          sessionDurationMinutes: room.settings.sessionDurationMinutes,
          paused: room.paused,
        });
        return;
      }

      if (type === 'kick_student') {
        const targetId = String(data.studentId || '');
        const target = room.students.get(targetId);
        room.kickedIds.add(targetId);
        if (target) {
          if (target.ws && target.ws.readyState === WebSocket.OPEN) {
            send(target.ws, 'kicked', { message: 'Anda telah dikeluarkan dari kelas oleh Guru.' });
            target.ws.close();
          }
          room.students.delete(targetId);
        }
        broadcastRoom(room, 'player_left', { id: targetId });
        broadcastParticipants(room);
        return;
      }

      if (type === 'trigger_event') {
        broadcastRoom(room, 'teacher_event', { eventType: data.eventType });
        return;
      }

      if (type === 'end_session') {
        endRoomSession(room, 'teacher');
        return;
      }

      // Allow teacher to force-test timeout or adjust remaining seconds cleanly if needed
      if (type === 'set_remaining_sec' && typeof data.remainingSec === 'number' && !room.sessionEnded) {
        room.remainingSec = Math.max(0, Math.min(3600, data.remainingSec));
        broadcastRoom(room, 'timer_sync', {
          remainingSec: Math.round(room.remainingSec),
          sessionDurationMinutes: room.settings.sessionDurationMinutes,
          paused: room.paused,
        });
        if (room.remainingSec <= 0) {
          endRoomSession(room, 'timeout');
        }
      }
    });

    ws.on('close', () => {
      const { roomCode, role, id } = ws.meta;
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      if (role === 'student' && id) {
        const stu = room.students.get(id);
        if (stu && stu.ws === ws) {
          stu.ws = null;
        }
        broadcastRoom(room, 'player_left', { id });
        broadcastParticipants(room);
      } else if (role === 'teacher' && room.teacherWs === ws) {
        room.teacherWs = null;
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  setInterval(() => {
    for (const room of rooms.values()) {
      if (room.sessionEnded || room.paused) continue;
      room.remainingSec = Math.max(0, room.remainingSec - 1);
      broadcastRoom(room, 'timer_sync', {
        remainingSec: Math.round(room.remainingSec),
        sessionDurationMinutes: room.settings.sessionDurationMinutes,
        paused: room.paused,
      });
      if (room.remainingSec <= 0) {
        endRoomSession(room, 'timeout');
      }
    }
  }, 1000);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`WOWO PEAK: 3D EXPEDITION running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
