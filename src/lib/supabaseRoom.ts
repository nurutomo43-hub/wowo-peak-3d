import type { RealtimeChannel } from '@supabase/supabase-js';
import { requireSupabase } from './supabaseClient';
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
  QuizQuestion,
  Role,
  RoomSettings,
  SupabaseRoomConfig,
} from '../types/game';

export interface RoomPresenceState {
  id: string;
  role: Role;
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
  pose: PlayerPose;
}

export interface TrackedStudentRecord {
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
}

export interface StudentProgressBroadcast {
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
  newAnswer?: AnswerRecord;
  newEssayAnswer?: EssayAnswerRecord;
  answers?: AnswerRecord[];
  essayAnswers?: EssayAnswerRecord[];
}

export interface PlayerPoseBroadcast {
  id: string;
  role: Role;
  name: string;
  avatar?: AvatarConfig;
  currentCP: number;
  score: number;
  pose: PlayerPose;
}

export interface PlayerAvatarBroadcast {
  id: string;
  role: Role;
  avatar: AvatarConfig;
}

export interface PlayerEmoteBroadcast {
  id: string;
  emote: EmoteType;
}

export interface TimerSyncBroadcast {
  remainingSec: number;
  sessionDurationMinutes: number;
  paused: boolean;
}

export interface SessionEndedBroadcast {
  reason: 'teacher' | 'timeout';
  leaderboard: ParticipantSummary[];
  exportRows: ExportStudentRow[];
}

export interface TeacherEventBroadcast {
  eventType: DisasterEventType;
}

export interface KickStudentBroadcast {
  studentId: string;
  message?: string;
}

function generateFiveDigitCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export async function createRoomInSupabase(config: SupabaseRoomConfig): Promise<string> {
  const supabase = requireSupabase();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateFiveDigitCode();
    const { data: existing, error: checkErr } = await supabase
      .from('rooms')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    if (checkErr) {
      throw new Error(`Gagal memeriksa tabel rooms Supabase: ${checkErr.message}`);
    }
    if (existing) continue;

    const { error: insertErr } = await supabase.from('rooms').insert({
      code,
      config,
    });

    if (!insertErr) {
      return code;
    }

    // Retry on unique constraint collision
    if (insertErr.code === '23505') {
      continue;
    }

    throw new Error(`Gagal menyimpan ruangan ke Supabase: ${insertErr.message}`);
  }

  throw new Error('Gagal menghasilkan kode ruangan unik. Silakan coba lagi.');
}

export async function fetchRoomFromSupabase(
  rawCode: string,
): Promise<{ code: string; config: SupabaseRoomConfig } | null> {
  const supabase = requireSupabase();
  const code = rawCode.trim();

  const { data, error } = await supabase
    .from('rooms')
    .select('code, config')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengambil data ruangan dari Supabase: ${error.message}`);
  }
  if (!data || !data.config) {
    return null;
  }

  return {
    code: String(data.code),
    config: data.config as SupabaseRoomConfig,
  };
}

export async function updateRoomConfigInSupabase(
  code: string,
  config: SupabaseRoomConfig,
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('rooms').update({ config }).eq('code', code);
  if (error) {
    console.warn('Gagal memperbarui config ruangan di Supabase:', error.message);
  }
}

export function computeRemainingSeconds(config: SupabaseRoomConfig): number {
  if (config.sessionEnded) return 0;
  if (config.paused || !config.sessionEndsAt) {
    return Math.max(0, Math.round(config.remainingSec ?? (config.settings?.sessionDurationMinutes || 20) * 60));
  }
  return Math.max(0, Math.round((config.sessionEndsAt - Date.now()) / 1000));
}

export function buildParticipantsSnapshot(
  records: Map<string, TrackedStudentRecord>,
): ParticipantSummary[] {
  const list: ParticipantSummary[] = Array.from(records.values()).map((s) => ({
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

export function buildExportRows(records: Map<string, TrackedStudentRecord>): ExportStudentRow[] {
  return Array.from(records.values()).map((s) => ({
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

export function createRoomRealtimeChannel(roomCode: string, clientKey: string): RealtimeChannel {
  const supabase = requireSupabase();
  return supabase.channel(`room-${roomCode}`, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: clientKey },
    },
  });
}

export async function broadcastChannelEvent<T extends object>(
  channel: RealtimeChannel | null,
  event: string,
  payload: T,
): Promise<void> {
  if (!channel) return;
  try {
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch {
    // ignore transient send errors while reconnecting
  }
}

export type RoomSettingsPayload = { settings: RoomSettings };
export type QuestionsUpdatedPayload = { questions: QuizQuestion[] | null };
export type EssayQuestionsUpdatedPayload = { essayQuestions: EssayQuestion[] | null };
export type PauseUpdatedPayload = { paused: boolean; remainingSec: number };
