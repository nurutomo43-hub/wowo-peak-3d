import LZString from 'lz-string';
import { splitAcceptedKeys } from '../game/questions';
import type { EssayQuestion, QuizQuestion, RoomSettings } from '../types/game';

interface CompactStandalonePayload {
  v: 1;
  r: string;
  t: string;
  s: {
    td: RoomSettings['timeOfDay'];
    w: RoomSettings['weather'];
    qd: number;
    sm: number;
    ed: number;
    dl: number;
    rm: RoomSettings['respawnMode'];
    pw: number;
    ew: number;
  };
  q?: Array<[string, string, string, string, string, 'A' | 'B' | 'C' | 'D', string?]>;
  e?: Array<[string, string, string?]>;
}

export interface DecodedStandalonePacket {
  roomCode: string;
  teacherName: string;
  settings: RoomSettings;
  questions: QuizQuestion[] | null;
  essayQuestions: EssayQuestion[] | null;
}

export function encodeStandaloneLink(params: {
  roomCode: string;
  teacherName: string;
  settings: RoomSettings;
  questions: QuizQuestion[] | null;
  essayQuestions: EssayQuestion[] | null;
}): string {
  const payload: CompactStandalonePayload = {
    v: 1,
    r: params.roomCode || 'MANDI',
    t: params.teacherName || 'Guru',
    s: {
      td: params.settings.timeOfDay,
      w: params.settings.weather,
      qd: params.settings.quizDuration,
      sm: params.settings.sessionDurationMinutes,
      ed: params.settings.explanationDurationSec,
      dl: params.settings.difficultyLevel,
      rm: params.settings.respawnMode,
      pw: params.settings.pgWeight,
      ew: params.settings.essayWeight,
    },
  };

  if (params.questions && params.questions.length > 0) {
    payload.q = params.questions.map((item) => [
      item.question,
      item.options.A,
      item.options.B,
      item.options.C,
      item.options.D,
      item.answer,
      item.explanation || undefined,
    ]);
  }

  if (params.essayQuestions && params.essayQuestions.length > 0) {
    payload.e = params.essayQuestions.map((item) => [
      item.question,
      item.rawKey,
      item.explanation || undefined,
    ]);
  }

  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  const cleanRoom = encodeURIComponent(params.roomCode || 'MANDI');
  return `${window.location.origin}${window.location.pathname}?role=student&room=${cleanRoom}&mode=standalone&pkg=${compressed}`;
}

export function decodeStandalonePacket(pkgParam: string): DecodedStandalonePacket | null {
  if (!pkgParam || typeof pkgParam !== 'string') return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(pkgParam);
    if (!json) return null;
    const raw = JSON.parse(json) as Partial<CompactStandalonePayload>;
    if (!raw || raw.v !== 1 || !raw.s) return null;

    const validTime = (['pagi', 'siang', 'sore', 'malam'] as const).includes(raw.s.td)
      ? raw.s.td
      : 'pagi';
    const validWeather = (
      ['cerah', 'berkabut', 'hujan', 'badai', 'salju', 'kiamat'] as const
    ).includes(raw.s.w)
      ? raw.s.w
      : 'cerah';
    const validRespawn = (['last_cp', 'prev_cp', 'base_camp'] as const).includes(raw.s.rm)
      ? raw.s.rm
      : 'last_cp';

    const pgW = typeof raw.s.pw === 'number' ? raw.s.pw : 75;
    const esW = typeof raw.s.ew === 'number' && pgW + raw.s.ew === 100 ? raw.s.ew : 100 - pgW;

    const settings: RoomSettings = {
      timeOfDay: validTime,
      weather: validWeather,
      quizDuration: Math.min(45, Math.max(15, Number(raw.s.qd) || 30)),
      sessionDurationMinutes: Math.min(30, Math.max(10, Number(raw.s.sm) || 20)),
      explanationDurationSec: Math.min(60, Math.max(40, Number(raw.s.ed) || 45)),
      difficultyLevel: Math.min(10, Math.max(1, Number(raw.s.dl) || 3)),
      respawnMode: validRespawn,
      pgWeight: pgW,
      essayWeight: esW,
    };

    let questions: QuizQuestion[] | null = null;
    if (Array.isArray(raw.q) && raw.q.length > 0) {
      questions = raw.q.map((tuple, idx) => ({
        no: idx + 1,
        question: String(tuple[0] || ''),
        options: {
          A: String(tuple[1] || ''),
          B: String(tuple[2] || ''),
          C: String(tuple[3] || ''),
          D: String(tuple[4] || ''),
        },
        answer: (['A', 'B', 'C', 'D'].includes(tuple[5]) ? tuple[5] : 'A') as
          | 'A'
          | 'B'
          | 'C'
          | 'D',
        explanation: tuple[6] ? String(tuple[6]) : undefined,
      }));
    }

    let essayQuestions: EssayQuestion[] | null = null;
    if (Array.isArray(raw.e) && raw.e.length > 0) {
      essayQuestions = raw.e.map((tuple, idx) => {
        const rawKey = String(tuple[1] || '');
        const acceptedAnswers = splitAcceptedKeys(rawKey);
        return {
          no: idx + 1,
          question: String(tuple[0] || ''),
          acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : [rawKey.trim().toLowerCase()],
          rawKey,
          explanation: tuple[2] ? String(tuple[2]) : undefined,
        };
      });
    }

    return {
      roomCode: String(raw.r || 'MANDI')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 5) || 'MANDI',
      teacherName: String(raw.t || 'Guru').slice(0, 18),
      settings,
      questions,
      essayQuestions,
    };
  } catch {
    return null;
  }
}
