import Peer, { type DataConnection } from 'peerjs';
import type {
  AnswerRecord,
  AvatarConfig,
  DisasterEventType,
  EmoteType,
  EssayAnswerRecord,
  EssayQuestion,
  ExportStudentRow,
  ParticipantSummary,
  PlayerPose,
  PublicRoomState,
  QuizQuestion,
  RemotePlayerPayload,
  Role,
  RoomSettings,
  StudentRestoreProgress,
} from '../types/game';

export const PEER_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function generateRoomCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export function makeHostPeerId(roomCode: string): string {
  return `wowo-peak-${roomCode.trim().toUpperCase()}`;
}

export function createPeerInstance(peerId?: string): Peer {
  if (peerId) {
    return new Peer(peerId, {
      config: PEER_RTC_CONFIG,
      debug: 1,
    });
  }
  return new Peer({
    config: PEER_RTC_CONFIG,
    debug: 1,
  });
}

export interface HostStudentRecord {
  id: string;
  name: string;
  avatar: AvatarConfig;
  currentCP: number;
  completedCPs: number[];
  score: number;
  correctCount: number;
  wrongCount: number;
  essayCorrect: number;
  essayWrong: number;
  essayDone: boolean;
  fallCount: number;
  answers: AnswerRecord[];
  essayAnswers: EssayAnswerRecord[];
  online: boolean;
  pose: PlayerPose;
  conn: DataConnection | null;
}

export interface HostRoomState {
  code: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: AvatarConfig;
  teacherPose: PlayerPose;
  teacherCP: number;
  settings: RoomSettings;
  paused: boolean;
  sessionEnded: boolean;
  endReason?: 'teacher' | 'timeout';
  remainingSec: number;
  questions: QuizQuestion[] | null;
  essayQuestions: EssayQuestion[] | null;
  kickedIds: Set<string>;
  students: Map<string, HostStudentRecord>;
}

export type PeerToHostMessage =
  | {
      type: 'join_room';
      studentId: string;
      name: string;
      avatar: AvatarConfig;
      restoreProgress?: StudentRestoreProgress | null;
    }
  | {
      type: 'player_pose';
      id: string;
      currentCP: number;
      score: number;
      pose: PlayerPose;
    }
  | {
      type: 'update_avatar';
      id: string;
      avatar: AvatarConfig;
    }
  | {
      type: 'player_emote';
      id: string;
      emote: EmoteType;
    }
  | {
      type: 'student_progress';
      id: string;
      currentCP?: number;
      completedCPs?: number[];
      score?: number;
      correctCount?: number;
      wrongCount?: number;
      essayCorrect?: number;
      essayWrong?: number;
      essayDone?: boolean;
      fallCount?: number;
      newAnswer?: AnswerRecord;
      newEssayAnswer?: EssayAnswerRecord;
    };

export type HostToPeerMessage =
  | {
      type: 'error_msg';
      message: string;
    }
  | {
      type: 'joined_room';
      id: string;
      name: string;
      studentData: {
        currentCP: number;
        completedCPs: number[];
        score: number;
        correctCount: number;
        wrongCount: number;
        essayCorrect: number;
        essayWrong: number;
        essayDone: boolean;
        fallCount: number;
        answers: AnswerRecord[];
        essayAnswers: EssayAnswerRecord[];
      };
      roomState: PublicRoomState;
      questions: QuizQuestion[] | null;
      essayQuestions: EssayQuestion[] | null;
      players: RemotePlayerPayload[];
    }
  | {
      type: 'world_state';
      players: RemotePlayerPayload[];
      remainingSec: number;
      paused: boolean;
    }
  | {
      type: 'player_avatar_updated';
      id: string;
      role: Role;
      avatar: AvatarConfig;
    }
  | {
      type: 'player_emote';
      id: string;
      emote: EmoteType;
    }
  | {
      type: 'player_left';
      id: string;
    }
  | {
      type: 'participants_update';
      participants: ParticipantSummary[];
    }
  | {
      type: 'settings_updated';
      settings: RoomSettings;
    }
  | {
      type: 'questions_updated';
      questions: QuizQuestion[] | null;
    }
  | {
      type: 'essay_questions_updated';
      essayQuestions: EssayQuestion[] | null;
    }
  | {
      type: 'pause_updated';
      paused: boolean;
      remainingSec: number;
    }
  | {
      type: 'timer_sync';
      remainingSec: number;
      sessionDurationMinutes: number;
      paused: boolean;
    }
  | {
      type: 'teacher_event';
      eventType: DisasterEventType;
    }
  | {
      type: 'kicked';
      message: string;
    }
  | {
      type: 'session_ended';
      reason: 'teacher' | 'timeout';
      leaderboard: ParticipantSummary[];
      exportRows: ExportStudentRow[];
    };

export function safeSendPeer(conn: DataConnection | null | undefined, msg: PeerToHostMessage | HostToPeerMessage) {
  if (!conn || !conn.open) return;
  try {
    conn.send(msg);
  } catch {
    // ignore transient WebRTC DataChannel send errors
  }
}

export function getHostParticipantsSnapshot(
  students: Map<string, HostStudentRecord>,
): ParticipantSummary[] {
  const list: ParticipantSummary[] = Array.from(students.values()).map((s) => ({
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
    online: Boolean(s.online && s.conn && s.conn.open),
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

export function getHostExportRows(students: Map<string, HostStudentRecord>): ExportStudentRow[] {
  return Array.from(students.values()).map((s) => ({
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
}

export function collectHostPlayersPayload(room: HostRoomState): RemotePlayerPayload[] {
  const players: RemotePlayerPayload[] = [
    {
      id: room.teacherId,
      role: 'teacher',
      name: room.teacherName,
      avatar: room.teacherAvatar,
      currentCP: room.teacherCP,
      score: 0,
      pose: room.teacherPose,
    },
  ];

  for (const s of room.students.values()) {
    if (s.online && s.conn && s.conn.open) {
      players.push({
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

  return players;
}

export function getHostPublicRoomState(room: HostRoomState): PublicRoomState {
  return {
    roomCode: room.code,
    settings: room.settings,
    paused: room.paused,
    sessionEnded: room.sessionEnded,
    remainingSec: Math.max(0, Math.round(room.remainingSec)),
    questionCount: room.questions ? room.questions.length : 25,
    essayQuestionCount: room.essayQuestions ? room.essayQuestions.length : 5,
    participants: getHostParticipantsSnapshot(room.students),
  };
}

export function broadcastToAllStudents(
  room: HostRoomState,
  msg: HostToPeerMessage,
  excludeStudentId?: string,
) {
  for (const stu of room.students.values()) {
    if (excludeStudentId && stu.id === excludeStudentId) continue;
    if (stu.conn && stu.conn.open) {
      safeSendPeer(stu.conn, msg);
    }
  }
}
