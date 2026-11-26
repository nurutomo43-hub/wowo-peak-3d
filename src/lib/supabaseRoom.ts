import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AnswerRecord,
  AvatarConfig,
  DisasterEventType,
  EmoteType,
  EssayAnswerRecord,
  EssayQuestion,
  ExportStudentRow,
  MapThemeId,
  ParticipantSummary,
  PlayerPose,
  PublicRoomState,
  QuizQuestion,
  RemotePlayerPayload,
  Role,
  RoomCommandPayload,
  RoomSettings,
  RoomStatus,
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
          eventsPerSecond: 30,
        },
      },
    });
  }
  return cachedClient;
}

export function generateRoomCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export interface RoomPresencePayload {
  id: string;
  playerId?: string;
  role: Role;
  name: string;
  avatar: AvatarConfig;
  joinedAt: number;
  cp?: number;
  pgCorrect?: number;
  isianCorrect?: number;
  score?: number;
  falls?: number;
  isianDone?: boolean;
}

export interface PersistedStudentProgress {
  id: string;
  playerId?: string;
  name: string;
  avatar: AvatarConfig;
  cp: number;
  completedCPs: number[];
  score: number;
  pgCorrect: number;
  pgWrong: number;
  isianCorrect: number;
  isianWrong: number;
  isianDone: boolean;
  falls: number;
}

export interface SupabaseRoomConfig {
  status?: RoomStatus;
  teacherId: string;
  teacherName: string;
  teacherAvatar: AvatarConfig;
  settings: RoomSettings;
  selected_map?: MapThemeId;
  paused: boolean;
  sessionEnded: boolean;
  endReason?: 'teacher' | 'timeout';
  remainingSec: number;
  sessionEndsAt: number | null;
  kickedIds: string[];
  questions: QuizQuestion[] | null;
  essayQuestions: EssayQuestion[] | null;
  studentProgress?: PersistedStudentProgress[];
  players?: PersistedStudentProgress[];
  active_event?: RoomCommandPayload | null;
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
  status: RoomStatus;
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
      type: 'position_update';
      payload: RemotePlayerPayload;
    }
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
      type: 'player_progress';
      id: string;
      playerId?: string;
      name: string;
      cp: number;
      pgCorrect: number;
      pgWrong?: number;
      isianCorrect: number;
      isianWrong?: number;
      isianDone?: boolean;
      score: number;
      falls: number;
      completedCPs?: number[];
      newAnswer?: AnswerRecord;
      newEssayAnswer?: EssayAnswerRecord;
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
      type: 'game_start';
      remainingSec: number;
      sessionEndsAt: number;
      settings: RoomSettings;
      participants: ParticipantSummary[];
    }
  | {
      type: 'participants_update';
      participants: ParticipantSummary[];
      status?: RoomStatus;
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
      status?: RoomStatus;
    }
  | {
      type: 'timer_sync';
      remainingSec: number;
      sessionDurationMinutes: number;
      paused: boolean;
      status?: RoomStatus;
    }
  | {
      type: 'teacher_event';
      eventType: DisasterEventType;
      count?: number;
      offsets?: number[];
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

let hasPlayersColumn: boolean | null = null;
let hasActiveEventColumn: boolean | null = null;
let hasSelectedMapColumn: boolean | null = null;

function isMissingPlayersColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return err.code === '42703' || err.code === 'PGRST204' || msg.includes('players');
}

function isMissingActiveEventColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return err.code === '42703' || err.code === 'PGRST204' || msg.includes('active_event');
}

function isMissingSelectedMapColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('selected_map') && (err.code === '42703' || err.code === 'PGRST204' || msg.includes('column'));
}

export function createEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function upsertSupabaseRoom(code: string, config: SupabaseRoomConfig): Promise<void> {
  const supabase = getSupabaseClient();
  const resolvedMap: MapThemeId = config.selected_map || config.settings?.selectedMap || 'nusantara';
  const normalizedConfig: SupabaseRoomConfig = {
    ...config,
    selected_map: resolvedMap,
    settings: { ...config.settings, selectedMap: resolvedMap },
  };
  const payload: Record<string, unknown> = { code, config: normalizedConfig };
  if (hasPlayersColumn === true) {
    payload.players = config.players ?? config.studentProgress ?? [];
  }
  if (hasActiveEventColumn !== false && config.active_event !== undefined) {
    payload.active_event = config.active_event;
  }
  if (hasSelectedMapColumn !== false) {
    payload.selected_map = resolvedMap;
  }

  let { error } = await supabase.from('rooms').upsert(payload, { onConflict: 'code' });
  if (error && isMissingSelectedMapColumnError(error)) {
    hasSelectedMapColumn = false;
    delete payload.selected_map;
    const retry = await supabase.from('rooms').upsert(payload, { onConflict: 'code' });
    error = retry.error;
  }
  if (error && isMissingActiveEventColumnError(error)) {
    hasActiveEventColumn = false;
    delete payload.active_event;
    const retry = await supabase.from('rooms').upsert(payload, { onConflict: 'code' });
    error = retry.error;
  }
  if (error && hasPlayersColumn === true && isMissingPlayersColumnError(error)) {
    hasPlayersColumn = false;
    delete payload.players;
    const retry = await supabase.from('rooms').upsert(payload, { onConflict: 'code' });
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message || 'Gagal menyimpan data ruangan ke tabel rooms Supabase.');
  }
  if (hasSelectedMapColumn === null && payload.selected_map !== undefined) {
    hasSelectedMapColumn = true;
  }
}

export async function publishRoomCommandToSupabase(
  code: string,
  command: RoomCommandPayload,
  latestConfig: SupabaseRoomConfig,
): Promise<void> {
  const supabase = getSupabaseClient();
  const nextMap: MapThemeId =
    command.mapId ||
    command.settings?.selectedMap ||
    latestConfig.selected_map ||
    latestConfig.settings?.selectedMap ||
    'nusantara';
  const nextConfig: SupabaseRoomConfig = {
    ...latestConfig,
    selected_map: nextMap,
    settings: {
      ...latestConfig.settings,
      ...(command.settings || {}),
      selectedMap: nextMap,
    },
    active_event: command,
  };
  const updatePayload: Record<string, unknown> = { config: nextConfig };
  if (hasActiveEventColumn !== false) {
    updatePayload.active_event = command;
  }
  if (hasSelectedMapColumn !== false) {
    updatePayload.selected_map = nextMap;
  }

  let { error } = await supabase.from('rooms').update(updatePayload).eq('code', code);
  if (error && isMissingSelectedMapColumnError(error)) {
    hasSelectedMapColumn = false;
    delete updatePayload.selected_map;
    const retry = await supabase.from('rooms').update(updatePayload).eq('code', code);
    error = retry.error;
  }
  if (error && isMissingActiveEventColumnError(error)) {
    hasActiveEventColumn = false;
    delete updatePayload.active_event;
    const retry = await supabase.from('rooms').update(updatePayload).eq('code', code);
    error = retry.error;
  }
  if (!error && hasActiveEventColumn === null && updatePayload.active_event !== undefined) {
    hasActiveEventColumn = true;
  }
  if (!error && hasSelectedMapColumn === null && updatePayload.selected_map !== undefined) {
    hasSelectedMapColumn = true;
  }
  if (error) {
    throw new Error(error.message || 'Gagal memperbarui active_event ruangan ke Supabase.');
  }
}

export async function fetchSupabaseRoomRecord(code: string): Promise<{
  config: SupabaseRoomConfig;
  players: PersistedStudentProgress[] | null;
  activeEvent: RoomCommandPayload | null;
}> {
  const supabase = getSupabaseClient();

  if (hasPlayersColumn !== false) {
    const cols = ['config', 'players'];
    if (hasActiveEventColumn !== false) cols.push('active_event');
    if (hasSelectedMapColumn !== false) cols.push('selected_map');
    const { data, error } = await supabase
      .from('rooms')
      .select(cols.join(', '))
      .eq('code', code)
      .single();

    if (!error && data) {
      hasPlayersColumn = true;
      if (hasActiveEventColumn !== false) hasActiveEventColumn = true;
      if (hasSelectedMapColumn !== false) hasSelectedMapColumn = true;
      const row = data as unknown as {
        config?: SupabaseRoomConfig;
        players?: PersistedStudentProgress[];
        active_event?: RoomCommandPayload | null;
        selected_map?: MapThemeId | null;
      };
      if (!row.config) {
        throw new Error(`Data konfigurasi ruangan "${code}" kosong atau belum dibuat Guru.`);
      }
      const resolvedMap = row.selected_map || row.config.selected_map || row.config.settings?.selectedMap || 'nusantara';
      const normalizedConfig: SupabaseRoomConfig = {
        ...row.config,
        selected_map: resolvedMap,
        settings: { ...row.config.settings, selectedMap: resolvedMap },
      };
      return {
        config: normalizedConfig,
        players: Array.isArray(row.players) ? row.players : null,
        activeEvent: row.active_event ?? row.config.active_event ?? null,
      };
    }

    if (error && isMissingSelectedMapColumnError(error)) {
      hasSelectedMapColumn = false;
    } else if (error && isMissingActiveEventColumnError(error)) {
      hasActiveEventColumn = false;
    } else if (error && isMissingPlayersColumnError(error)) {
      hasPlayersColumn = false;
    } else if (error) {
      throw new Error(error.message || `Ruangan "${code}" tidak ditemukan di Supabase.`);
    }
  }

  const fallbackCols = ['config'];
  if (hasActiveEventColumn !== false) fallbackCols.push('active_event');
  if (hasSelectedMapColumn !== false) fallbackCols.push('selected_map');
  const { data, error } = await supabase.from('rooms').select(fallbackCols.join(', ')).eq('code', code).single();
  if (error && (isMissingActiveEventColumnError(error) || isMissingSelectedMapColumnError(error))) {
    if (isMissingSelectedMapColumnError(error)) hasSelectedMapColumn = false;
    if (isMissingActiveEventColumnError(error)) hasActiveEventColumn = false;
    const retryCols = ['config'];
    if (hasActiveEventColumn !== false) retryCols.push('active_event');
    const retry = await supabase.from('rooms').select(retryCols.join(', ')).eq('code', code).single();
    if (retry.error && isMissingActiveEventColumnError(retry.error)) {
      hasActiveEventColumn = false;
      const retryBare = await supabase.from('rooms').select('config').eq('code', code).single();
      if (retryBare.error) {
        throw new Error(retryBare.error.message || `Ruangan "${code}" tidak ditemukan di Supabase.`);
      }
      const rBare = retryBare.data as unknown as { config?: SupabaseRoomConfig } | null;
      if (!rBare || !rBare.config) {
        throw new Error(`Data konfigurasi ruangan "${code}" kosong atau belum dibuat Guru.`);
      }
      const resolvedMap = rBare.config.selected_map || rBare.config.settings?.selectedMap || 'nusantara';
      return {
        config: {
          ...rBare.config,
          selected_map: resolvedMap,
          settings: { ...rBare.config.settings, selectedMap: resolvedMap },
        },
        players: null,
        activeEvent: rBare.config.active_event ?? null,
      };
    }
    if (retry.error) {
      throw new Error(retry.error.message || `Ruangan "${code}" tidak ditemukan di Supabase.`);
    }
    const rData = retry.data as unknown as {
      config?: SupabaseRoomConfig;
      active_event?: RoomCommandPayload | null;
    } | null;
    if (!rData || !rData.config) {
      throw new Error(`Data konfigurasi ruangan "${code}" kosong atau belum dibuat Guru.`);
    }
    const resolvedMap = rData.config.selected_map || rData.config.settings?.selectedMap || 'nusantara';
    return {
      config: {
        ...rData.config,
        selected_map: resolvedMap,
        settings: { ...rData.config.settings, selectedMap: resolvedMap },
      },
      players: null,
      activeEvent: rData.active_event ?? rData.config.active_event ?? null,
    };
  }
  if (error) {
    throw new Error(error.message || `Ruangan "${code}" tidak ditemukan di Supabase.`);
  }
  const row = data as unknown as {
    config?: SupabaseRoomConfig;
    active_event?: RoomCommandPayload | null;
    selected_map?: MapThemeId | null;
  } | null;
  if (!row || !row.config) {
    throw new Error(`Data konfigurasi ruangan "${code}" kosong atau belum dibuat Guru.`);
  }
  if (hasActiveEventColumn !== false) hasActiveEventColumn = true;
  if (hasSelectedMapColumn !== false) hasSelectedMapColumn = true;
  const resolvedMap = row.selected_map || row.config.selected_map || row.config.settings?.selectedMap || 'nusantara';
  return {
    config: {
      ...row.config,
      selected_map: resolvedMap,
      settings: { ...row.config.settings, selectedMap: resolvedMap },
    },
    players: null,
    activeEvent: row.active_event ?? row.config.active_event ?? null,
  };
}

export async function fetchSupabaseRoomConfig(code: string): Promise<SupabaseRoomConfig> {
  const rec = await fetchSupabaseRoomRecord(code);
  return rec.config;
}

export async function syncStudentProgressToRoomPlayers(
  code: string,
  student: PersistedStudentProgress,
): Promise<void> {
  if (!code || !student?.id) return;
  try {
    const supabase = getSupabaseClient();
    const { config, players: topPlayers } = await fetchSupabaseRoomRecord(code);
    const existingList = Array.isArray(topPlayers)
      ? [...topPlayers]
      : Array.isArray(config.players)
        ? [...config.players]
        : Array.isArray(config.studentProgress)
          ? [...config.studentProgress]
          : [];

    const lowerName = (student.name || '').trim().toLowerCase();
    const sid = student.playerId || student.id;
    const idx = existingList.findIndex(
      (p) =>
        p.id === sid ||
        p.playerId === sid ||
        (lowerName && (p.name || '').trim().toLowerCase() === lowerName),
    );

    if (idx >= 0) {
      const prev = existingList[idx];
      existingList[idx] = {
        ...prev,
        id: sid,
        playerId: sid,
        name: student.name || prev.name,
        avatar: student.avatar || prev.avatar,
        cp: Math.max(prev.cp || 0, student.cp || 0),
        completedCPs:
          student.completedCPs.length >= (prev.completedCPs?.length || 0)
            ? student.completedCPs
            : prev.completedCPs || [],
        score: Math.max(prev.score || 0, student.score || 0),
        pgCorrect: Math.max(prev.pgCorrect || 0, student.pgCorrect || 0),
        pgWrong: Math.max(prev.pgWrong || 0, student.pgWrong || 0),
        isianCorrect: Math.max(prev.isianCorrect || 0, student.isianCorrect || 0),
        isianWrong: Math.max(prev.isianWrong || 0, student.isianWrong || 0),
        isianDone: Boolean(prev.isianDone || student.isianDone),
        falls: Math.max(prev.falls || 0, student.falls || 0),
      };
    } else {
      existingList.push({ ...student, id: sid, playerId: sid });
    }

    if (hasPlayersColumn === true) {
      await supabase.from('rooms').update({ players: existingList }).eq('code', code);
    } else {
      const nextConfig: SupabaseRoomConfig = {
        ...config,
        players: existingList,
        studentProgress: existingList,
      };
      await supabase.from('rooms').update({ config: nextConfig }).eq('code', code);
    }
  } catch {
    // Non-blocking fallback; broadcast & Presence carry real-time updates
  }
}

export function buildSupabaseRoomConfig(room: HostRoomState): SupabaseRoomConfig {
  const studentProgress: PersistedStudentProgress[] = Array.from(room.students.values()).map(
    (s) => ({
      id: s.id,
      playerId: s.id,
      name: s.name,
      avatar: s.avatar,
      cp: s.currentCP,
      completedCPs: s.completedCPs,
      score: s.score,
      pgCorrect: s.correctCount,
      pgWrong: s.wrongCount,
      isianCorrect: s.essayCorrect,
      isianWrong: s.essayWrong,
      isianDone: s.essayDone,
      falls: s.fallCount,
    }),
  );

  const resolvedMap: MapThemeId = room.settings?.selectedMap || 'nusantara';
  return {
    status: room.status,
    teacherId: room.teacherId,
    teacherName: room.teacherName,
    teacherAvatar: room.teacherAvatar,
    settings: { ...room.settings, selectedMap: resolvedMap },
    selected_map: resolvedMap,
    paused: room.paused,
    sessionEnded: room.sessionEnded,
    endReason: room.endReason,
    remainingSec: Math.max(0, Math.round(room.remainingSec)),
    sessionEndsAt: room.sessionEndsAt,
    kickedIds: Array.from(room.kickedIds),
    questions: room.questions,
    essayQuestions: room.essayQuestions,
    studentProgress,
    players: studentProgress,
    createdAt: Date.now(),
  };
}

export function mergeConfigStudentsIntoHostRoom(
  room: HostRoomState,
  config: SupabaseRoomConfig,
  topLevelPlayers?: PersistedStudentProgress[] | null,
): boolean {
  const combined: PersistedStudentProgress[] = [
    ...(Array.isArray(config.studentProgress) ? config.studentProgress : []),
    ...(Array.isArray(config.players) ? config.players : []),
    ...(Array.isArray(topLevelPlayers) ? topLevelPlayers : []),
  ];
  if (combined.length === 0) return false;

  let changed = false;
  for (const p of combined) {
    const sid = p.playerId || p.id;
    if (!sid || room.kickedIds.has(sid)) continue;

    let existing = room.students.get(sid);
    const cleanName = (p.name || 'Pendaki').trim();
    if (!existing && cleanName) {
      const lower = cleanName.toLowerCase();
      for (const cand of room.students.values()) {
        if (cand.name.trim().toLowerCase() === lower) {
          existing = cand;
          break;
        }
      }
    }

    if (!existing) {
      room.students.set(sid, {
        id: sid,
        name: cleanName || 'Pendaki',
        avatar: p.avatar,
        currentCP: Math.min(25, Math.max(0, p.cp || 0)),
        completedCPs: Array.isArray(p.completedCPs) ? p.completedCPs : [],
        score: p.score || 0,
        correctCount: p.pgCorrect || 0,
        wrongCount: p.pgWrong || 0,
        essayCorrect: p.isianCorrect || 0,
        essayWrong: p.isianWrong || 0,
        essayDone: Boolean(p.isianDone),
        fallCount: p.falls || 0,
        answers: [],
        essayAnswers: [],
        online: false,
        lastSeenAt: Date.now(),
        pose: { x: 0, y: 4.0, z: 148, yaw: 0, cp: p.cp || 0, state: 'idle' },
      });
      changed = true;
    } else {
      if (typeof p.cp === 'number' && p.cp > existing.currentCP) {
        existing.currentCP = Math.min(25, p.cp);
        changed = true;
      }
      if (typeof p.score === 'number' && p.score > existing.score) {
        existing.score = p.score;
        changed = true;
      }
      if (typeof p.pgCorrect === 'number' && p.pgCorrect > existing.correctCount) {
        existing.correctCount = p.pgCorrect;
        changed = true;
      }
      if (typeof p.pgWrong === 'number' && p.pgWrong > existing.wrongCount) {
        existing.wrongCount = p.pgWrong;
        changed = true;
      }
      if (typeof p.isianCorrect === 'number' && p.isianCorrect > existing.essayCorrect) {
        existing.essayCorrect = p.isianCorrect;
        changed = true;
      }
      if (typeof p.isianWrong === 'number' && p.isianWrong > existing.essayWrong) {
        existing.essayWrong = p.isianWrong;
        changed = true;
      }
      if (typeof p.falls === 'number' && p.falls > existing.fallCount) {
        existing.fallCount = p.falls;
        changed = true;
      }
      if (p.isianDone && !existing.essayDone) {
        existing.essayDone = true;
        changed = true;
      }
      if (Array.isArray(p.completedCPs) && p.completedCPs.length > existing.completedCPs.length) {
        existing.completedCPs = p.completedCPs;
        changed = true;
      }
    }
  }
  return changed;
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

export function sendTriggerDisasterBroadcast(
  channel: RealtimeChannel | null | undefined,
  payload: import('../types/game').TriggerDisasterPayload,
) {
  if (!channel) return;
  try {
    void channel.send({
      type: 'broadcast',
      event: 'trigger_disaster',
      payload,
    });
  } catch {
    // ignore transient channel send errors
  }
}

export function sendRoomCommandBroadcast(
  channel: RealtimeChannel | null | undefined,
  payload: RoomCommandPayload,
) {
  if (!channel) return;
  try {
    void channel.send({
      type: 'broadcast',
      event: 'room_command',
      payload,
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
    status: room.status,
    settings: room.settings,
    paused: room.paused,
    sessionEnded: room.sessionEnded,
    remainingSec: Math.max(0, Math.round(room.remainingSec)),
    questionCount: room.questions ? room.questions.length : 25,
    essayQuestionCount: room.essayQuestions ? room.essayQuestions.length : 5,
    participants: getHostParticipantsSnapshot(room.students),
  };
}
