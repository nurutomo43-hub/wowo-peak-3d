import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
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
} from '../types/game';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseConfigError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Konfigurasi Supabase belum diisi! Pastikan environment variable VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur di Netlify / .env.';
  }
  if (!/^https?:\/\//i.test(supabaseUrl)) {
    return 'Format VITE_SUPABASE_URL tidak valid. Pastikan URL diawali https:// (contoh: https://xxxx.supabase.co).';
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient {
  const configErr = getSupabaseConfigError();
  if (configErr) {
    throw new Error(configErr);
  }
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }
  return cachedClient;
}

export function generateRoomCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export interface SupabaseRoomConfig {
  teacherId: string;
  teacherName: string;
  teacherAvatar: AvatarConfig;
  settings: RoomSettings;
  paused: boolean;
  sessionEnded: boolean;
  endReason?: 'teacher' | 'timeout';
  remainingSec: number;
  sessionEndsAt: number | null;
  kickedIds: string[];
  questions: QuizQuestion[] | null;
  essayQuestions: EssayQuestion[] | null;
  createdAt: number;
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
  lastSeenAt: number;
  pose: PlayerPose;
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
  sessionEndsAt: number | null;
  questions: QuizQuestion[] | null;
  essayQuestions: EssayQuestion[] | null;
  kickedIds: Set<string>;
  students: Map<string, HostStudentRecord>;
}

export type RoomBroadcastMessage =
  | {
      type: 'player_pose';
      payload: RemotePlayerPayload;
    }
  | {
      type: 'student_join';
      studentId: string;
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
      pose: PlayerPose;
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
    }
  | {
      type: 'update_avatar';
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
      targetId: string;
      message: string;
    }
  | {
      type: 'session_ended';
      reason: 'teacher' | 'timeout';
      leaderboard: ParticipantSummary[];
      exportRows: ExportStudentRow[];
    };

export async function upsertSupabaseRoom(code: string, config: SupabaseRoomConfig): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('rooms')
    .upsert({ code, config }, { onConflict: 'code' });

  if (error) {
    throw new Error(error.message || 'Gagal menyimpan data ruangan ke tabel rooms Supabase.');
  }
}

export async function fetchSupabaseRoomConfig(code: string): Promise<SupabaseRoomConfig> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('config')
    .eq('code', code)
    .single();

  if (error) {
    throw new Error(error.message || `Ruangan "${code}" tidak ditemukan di Supabase.`);
  }
  if (!data || !data.config) {
    throw new Error(`Data konfigurasi ruangan "${code}" kosong atau belum dibuat Guru.`);
  }
  return data.config as SupabaseRoomConfig;
}

export function buildSupabaseRoomConfig(room: HostRoomState): SupabaseRoomConfig {
  return {
    teacherId: room.teacherId,
    teacherName: room.teacherName,
    teacherAvatar: room.teacherAvatar,
    settings: room.settings,
    paused: room.paused,
    sessionEnded: room.sessionEnded,
    endReason: room.endReason,
    remainingSec: Math.max(0, Math.round(room.remainingSec)),
    sessionEndsAt: room.sessionEndsAt,
    kickedIds: Array.from(room.kickedIds),
    questions: room.questions,
    essayQuestions: room.essayQuestions,
    createdAt: Date.now(),
  };
}

export function createRoomRealtimeChannel(roomCode: string): RealtimeChannel {
  const supabase = getSupabaseClient();
  return supabase.channel(`room-${roomCode}`, {
    config: {
      broadcast: { self: false },
    },
  });
}

export function sendRoomBroadcast(
  channel: RealtimeChannel | null | undefined,
  msg: RoomBroadcastMessage,
) {
  if (!channel) return;
  try {
    void channel.send({
      type: 'broadcast',
      event: 'room_event',
      payload: msg,
    });
  } catch {
    // ignore transient channel send errors
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
    online: s.online,
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
