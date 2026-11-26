import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CheckCircle2, Pause } from 'lucide-react';
import { MountainWorld, CP_POINTS, SUMMIT_EXAM_POINT, getMapLayout } from './game/MountainWorld';
import { SoundEngine } from './game/SoundEngine';
import {
  DEFAULT_ESSAY_QUESTIONS,
  buildStudentEssayDeck,
  buildStudentQuizDeck,
  clearCustomEssayFromStorage,
  clearCustomPgFromStorage,
  evaluateEssayAnswer,
  loadCustomEssayFromStorage,
  loadCustomPgFromStorage,
  saveCustomEssayToStorage,
  saveCustomPgToStorage,
} from './game/questions';
import {
  disposeAvatarGroup,
  normalizeAvatarConfig,
  type R15JointRig,
} from './game/AvatarBuilder';
import { LobbyModal } from './components/LobbyModal';
import { GameHud } from './components/GameHud';
import { QuizModal } from './components/QuizModal';
import { SummitEssayModal } from './components/SummitEssayModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ClassLobbyModal } from './components/ClassLobbyModal';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  buildSupabaseRoomConfig,
  createEventId,
  createRoomRealtimeChannel,
  fetchSupabaseRoomConfig,
  fetchSupabaseRoomRecord,
  generateRoomCode,
  getHostExportRows,
  getHostParticipantsSnapshot,
  getHostPublicRoomState,
  getSupabaseConfigError,
  mergeConfigStudentsIntoHostRoom,
  publishRoomCommandToSupabase,
  sendRoomBroadcast,
  sendRoomCommandBroadcast,
  syncStudentProgressToRoomPlayers,
  upsertSupabaseRoom,
  type HostRoomState,
  type HostStudentRecord,
  type RoomBroadcastMessage,
  type RoomPresencePayload,
} from './lib/supabaseRoom';
import {
  decodeStandalonePacket,
  encodeStandaloneLink,
  type DecodedStandalonePacket,
} from './lib/standalonePacket';
import {
  DEFAULT_STUDENT_AVATAR,
  DEFAULT_TEACHER_AVATAR,
  DIFFICULTY_LEVELS,
  EMOTE_ITEMS,
  MAP_THEMES,
  type AnswerRecord,
  type AvatarConfig,
  type DisasterEventType,
  type EmoteType,
  type EssayAnswerRecord,
  type EssayQuestion,
  type ExportStudentRow,
  type HudSnapshot,
  type MapSelectionChoice,
  type MapThemeId,
  type ParticipantSummary,
  type PublicRoomState,
  type QuizQuestion,
  type RemotePlayerPayload,
  type Role,
  type RoomCommandPayload,
  type RoomSettings,
  type RoomStatus,
  type ShuffledQuestion,
  type StudentRestoreProgress,
  type TriggerDisasterPayload,
} from './types/game';

const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();

function sanitizeName(raw: string): string {
  return String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 18);
}

function loadSavedAvatar(role: Role): AvatarConfig | null {
  try {
    const raw = localStorage.getItem(`wowo_peak_avatar_${role}`);
    if (!raw) return null;
    return normalizeAvatarConfig(JSON.parse(raw) as Partial<AvatarConfig>, role);
  } catch {
    return null;
  }
}

function saveAvatarToStorage(role: Role, avatar: AvatarConfig) {
  try {
    localStorage.setItem(`wowo_peak_avatar_${role}`, JSON.stringify(avatar));
  } catch {
    // ignore quota errors
  }
}

interface ActiveQuizState {
  cpIndex: number;
  question: ShuffledQuestion;
  timeLeft: number;
  totalDuration: number;
  answered: boolean;
  chosenLetter: string | null;
  startTimeMs: number;
  explainTimeLeft: number;
}

export function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<MountainWorld | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hostRoomRef = useRef<HostRoomState | null>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayerPayload>>(new Map());
  const lastSentPoseRef = useRef<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    state: string;
    cp: number;
    score: number;
  } | null>(null);
  const joinedAtRef = useRef<number>(Date.now());
  const studentStartedAtRef = useRef<number>(Date.now());
  const sessionDurationMinRef = useRef<number>(20);
  const isChannelSubscribedRef = useRef(false);
  const pendingProgressSyncRef = useRef(false);
  const roomPersistTimerRef = useRef<number | null>(null);
  const remainingSecRef = useRef(20 * 60);
  const timeoutFallbackRef = useRef<number | null>(null);
  const lastHandledEventIdRef = useRef<string>('');
  const handledEventIdsRef = useRef<Set<string>>(new Set());
  const intentionalDisconnectRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const nextShiftStudentIdRef = useRef<string>('');

  // Lobby & session UI state
  const [role, setRole] = useState<Role>('student');
  const [lockedStudentMode, setLockedStudentMode] = useState(false);
  const [avatar, setAvatar] = useState<AvatarConfig>({ ...DEFAULT_STUDENT_AVATAR });
  const [avatarEdited, setAvatarEdited] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [teacherName, setTeacherName] = useState('Pak/Bu Guru');
  const [initQuizDuration, setInitQuizDuration] = useState(30);
  const [initSessionDuration, setInitSessionDuration] = useState(20);
  const [initExplanationDuration, setInitExplanationDuration] = useState(45);
  const [initSelectedMap, setInitSelectedMap] = useState<MapSelectionChoice>('nusantara');
  const [customQuestions, setCustomQuestions] = useState<QuizQuestion[] | null>(
    () => loadCustomPgFromStorage()?.questions ?? null,
  );
  const [pgFileName, setPgFileName] = useState<string>(
    () => loadCustomPgFromStorage()?.fileName ?? '',
  );
  const [customEssayQuestions, setCustomEssayQuestions] = useState<EssayQuestion[] | null>(
    () => loadCustomEssayFromStorage()?.questions ?? null,
  );
  const [essayFileName, setEssayFileName] = useState<string>(
    () => loadCustomEssayFromStorage()?.fileName ?? '',
  );
  const [reconnectInfo, setReconnectInfo] = useState<StudentRestoreProgress | null>(null);
  const [lobbyError, setLobbyError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [standalonePacket, setStandalonePacket] = useState<DecodedStandalonePacket | null>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // In-game UI state
  const [inGame, setInGame] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('waiting');
  const [showClassLobby, setShowClassLobby] = useState(false);
  const [lobbyTeacherName, setLobbyTeacherName] = useState('Pak/Bu Guru');
  const [clientIdState, setClientIdState] = useState('');
  const [remainingSec, setRemainingSec] = useState(20 * 60);
  const [paused, setPaused] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionEndReason, setSessionEndReason] = useState<'teacher' | 'timeout'>('teacher');
  const [kickedMessage, setKickedMessage] = useState('');
  const [settings, setSettings] = useState<RoomSettings>({
    timeOfDay: 'pagi',
    weather: 'cerah',
    selectedMap: 'nusantara',
    quizDuration: 30,
    difficultyLevel: 3,
    respawnMode: 'last_cp',
    pgWeight: 75,
    essayWeight: 25,
    sessionDurationMinutes: 20,
    explanationDurationSec: 45,
  });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [teacherFlyMode, setTeacherFlyMode] = useState(false);
  const [questionCount, setQuestionCount] = useState(
    () => loadCustomPgFromStorage()?.questions.length ?? 25,
  );
  const [essayQuestionCount, setEssayQuestionCount] = useState(
    () => loadCustomEssayFromStorage()?.questions.length ?? 5,
  );
  const [currentCP, setCurrentCP] = useState(0);
  const [essayDone, setEssayDone] = useState(false);
  const [essayCorrect, setEssayCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [fallCount, setFallCount] = useState(0);
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [muted, setMuted] = useState(false);
  const [lowGraphics, setLowGraphics] = useState(false);
  const [warningText, setWarningText] = useState('');
  const [lightningOpacity, setLightningOpacity] = useState(0);
  const [frostActive, setFrostActive] = useState(false);
  const frostActiveRef = useRef(false);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizState | null>(null);
  const [activeEssayModal, setActiveEssayModal] = useState<{
    questions: EssayQuestion[];
    currentIndex: number;
    startTimeMs: number;
    explainTimeLeft: number;
    feedback: {
      studentAnswer: string;
      isCorrect: boolean;
      correctKey: string;
      explanation?: string;
    } | null;
  } | null>(null);
  const activeEssayRef = useRef(activeEssayModal);
  activeEssayRef.current = activeEssayModal;
  const [leaderboard, setLeaderboard] = useState<ParticipantSummary[]>([]);
  const [exportRows, setExportRows] = useState<ExportStudentRow[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [spectatingTargetName, setSpectatingTargetName] = useState<string | null>(null);
  const spectatingIdRef = useRef<string | null>(null);
  const [photoMode, setPhotoMode] = useState(false);
  const [photoSelfie, setPhotoSelfie] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [hud, setHud] = useState<HudSnapshot>({
    altitudePct: 0,
    nextCpIndex: 1,
    distToNextCp: 0,
    elevToNextCp: 0,
    radarAngleDeg: 0,
    targetBlip: { relX: 0, relY: -0.5 },
    nearbyBlips: [],
    locomotionMode: 'walk',
  });

  // Mutable live game state kept in ref so 3D loop runs at full speed without re-mounting WebGL
  const gameRef = useRef({
    inGame: false,
    role: 'student' as Role,
    roomCode: '',
    roomStatus: 'waiting' as RoomStatus,
    clientId: '',
    name: '',
    avatar: { ...DEFAULT_STUDENT_AVATAR } as AvatarConfig,
    paused: false,
    sessionEnded: false,
    respawnMode: 'last_cp' as RoomSettings['respawnMode'],
    currentCP: 0,
    completedCPs: [] as number[],
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    essayCorrect: 0,
    essayWrong: 0,
    essayDone: false,
    essayActive: false,
    essayFeedbackOpen: false,
    essayExplainLeft: 0,
    essayIsLastPending: false,
    essayAnswers: [] as EssayAnswerRecord[],
    essayQuestions: (loadCustomEssayFromStorage()?.questions ??
      DEFAULT_ESSAY_QUESTIONS) as EssayQuestion[],
    fallCount: 0,
    answers: [] as AnswerRecord[],
    quizDuration: 30,
    explanationDurationSec: 45,
    studentDeck: [] as ShuffledQuestion[],
    activeQuiz: null as ActiveQuizState | null,
    pos: new THREE.Vector3(CP_POINTS[0].x, CP_POINTS[0].y, CP_POINTS[0].z),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: Math.atan2(CP_POINTS[1].x - CP_POINTS[0].x, CP_POINTS[1].z - CP_POINTS[0].z),
    onGround: true,
    locomotionMode: 'walk' as 'walk' | 'climb' | 'slide',
    lastPoseState: 'idle' as 'idle' | 'walk' | 'jump' | 'climb' | 'slide' | 'hurt',
    walkAnimTime: 0,
    lastStepBeat: -1,
    lastLadderSoundAt: 0,
    hurtTimer: 0,
    chillSlowTimer: 0,
    lastChillWarnAt: 0,
    lastGateWarnAt: 0,
    bridgeAttemptMode: 'none' as 'none' | 'challenge' | 'safe',
    activeEmote: null as EmoteType | null,
    emoteTimer: 0,
    playerMesh: null as THREE.Group | null,
    headLamp: null as THREE.PointLight | null,
    camYaw: 0,
    camPitch: 0.34,
    camDist: 10.6,
    keys: {} as Record<string, boolean>,
    joyVec: { x: 0, y: 0 },
    nextHailIn: 16,
    nextGhostIn: 16,
    nextThunderIn: 10,
    nextMeteorIn: 8,
    nextQuakeIn: 34,
    nextFireRainIn: 30,
    lastNetSend: 0,
    lastHudSync: 0,
    lastQuizUiSync: 0,
    lastEssayUiSync: 0,
    flyMode: false,
    flyVerticalDir: 0 as -1 | 0 | 1,
    photoMode: false,
    photoPreviewOpen: false,
  });

  const warnTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const disasterCleanupTimersRef = useRef<Map<string, number>>(new Map());
  const disasterCountdownTimerRef = useRef<number | null>(null);

  const clearAllDisasterTimers = useCallback(() => {
    disasterCleanupTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    disasterCleanupTimersRef.current.clear();
    if (disasterCountdownTimerRef.current) {
      window.clearInterval(disasterCountdownTimerRef.current);
      disasterCountdownTimerRef.current = null;
    }
  }, []);

  const showToastSuccess = useCallback((text: string) => {
    setToastMsg(text);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg('');
    }, 4500);
  }, []);

  const showWarning = useCallback((text: string, sec = 3.0) => {
    if (disasterCountdownTimerRef.current) {
      window.clearInterval(disasterCountdownTimerRef.current);
      disasterCountdownTimerRef.current = null;
    }
    setWarningText(text);
    if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
    warnTimerRef.current = window.setTimeout(() => {
      setWarningText('');
    }, sec * 1000);
  }, []);

  const startDisasterCountdownBanner = useCallback((baseMessage: string, durationMs = 5000) => {
    if (warnTimerRef.current) {
      window.clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (disasterCountdownTimerRef.current) {
      window.clearInterval(disasterCountdownTimerRef.current);
      disasterCountdownTimerRef.current = null;
    }
    const endsAt = Date.now() + durationMs;
    setWarningText(`${baseMessage} (${Math.max(1, Math.ceil(durationMs / 1000))} dtk)`);
    disasterCountdownTimerRef.current = window.setInterval(() => {
      const remMs = endsAt - Date.now();
      if (remMs <= 0) {
        if (disasterCountdownTimerRef.current) {
          window.clearInterval(disasterCountdownTimerRef.current);
          disasterCountdownTimerRef.current = null;
        }
        setWarningText('');
        return;
      }
      setWarningText(`${baseMessage} (${Math.max(1, Math.ceil(remMs / 1000))} dtk)`);
    }, 250);
  }, []);

  const triggerLightningFlash = useCallback(() => {
    setLightningOpacity(0.88);
    soundRef.current?.playThunder();
    window.setTimeout(() => setLightningOpacity(0), 140);
  }, []);

  const saveStudentSession = useCallback(() => {
    const g = gameRef.current;
    if (g.role !== 'student' || !g.roomCode || !g.clientId) return;
    const payload: StudentRestoreProgress = {
      roomCode: g.roomCode,
      studentId: g.clientId,
      studentName: g.name,
      avatarConfig: g.avatar,
      currentCP: g.currentCP,
      completedCPs: g.completedCPs,
      score: g.score,
      correctCount: g.correctCount,
      wrongCount: g.wrongCount,
      essayCorrect: g.essayCorrect,
      essayWrong: g.essayWrong,
      essayDone: g.essayDone,
      fallCount: g.fallCount,
      answers: g.answers,
      essayAnswers: g.essayAnswers,
      studentStartedAt: studentStartedAtRef.current,
      remainingSec: Math.max(0, Math.round(remainingSecRef.current)),
    };
    localStorage.setItem(`wowo_peak_session_${g.roomCode}`, JSON.stringify(payload));
    localStorage.setItem('wowo_peak_last_room', g.roomCode);
  }, []);

  const clearStudentSession = useCallback((code: string) => {
    if (code) localStorage.removeItem(`wowo_peak_session_${code}`);
  }, []);

  const emitStudentProgress = useCallback(
    (overrides?: {
      cp?: number;
      isianDone?: boolean;
      newAnswer?: AnswerRecord;
      newEssayAnswer?: EssayAnswerRecord;
    }) => {
      const g = gameRef.current;
      if (g.role !== 'student' || !g.clientId) return;

      const cpVal = Math.min(25, Math.max(0, overrides?.cp ?? g.currentCP));
      const isianDoneVal = overrides?.isianDone ?? g.essayDone;

      if (!channelRef.current || !isChannelSubscribedRef.current) {
        pendingProgressSyncRef.current = true;
      }

      if (!channelRef.current) return;

      sendRoomBroadcast(channelRef.current, {
        type: 'player_progress',
        id: g.clientId,
        playerId: g.clientId,
        name: g.name,
        cp: cpVal,
        pgCorrect: g.correctCount,
        pgWrong: g.wrongCount,
        isianCorrect: g.essayCorrect,
        isianWrong: g.essayWrong,
        isianDone: isianDoneVal,
        score: g.score,
        falls: g.fallCount,
        completedCPs: g.completedCPs,
        newAnswer: overrides?.newAnswer,
        newEssayAnswer: overrides?.newEssayAnswer,
      });

      void channelRef.current
        .track({
          id: g.clientId,
          playerId: g.clientId,
          role: g.role,
          name: g.name,
          avatar: g.avatar,
          joinedAt: joinedAtRef.current,
          cp: cpVal,
          pgCorrect: g.correctCount,
          isianCorrect: g.essayCorrect,
          score: g.score,
          falls: g.fallCount,
          isianDone: isianDoneVal,
        } satisfies RoomPresencePayload)
        .catch(() => {});

      if (g.roomCode) {
        void syncStudentProgressToRoomPlayers(g.roomCode, {
          id: g.clientId,
          playerId: g.clientId,
          name: g.name,
          avatar: g.avatar,
          cp: cpVal,
          completedCPs: g.completedCPs,
          score: g.score,
          pgCorrect: g.correctCount,
          pgWrong: g.wrongCount,
          isianCorrect: g.essayCorrect,
          isianWrong: g.essayWrong,
          isianDone: isianDoneVal,
          falls: g.fallCount,
        });
      }
    },
    [],
  );

  const scheduleTeacherRoomPersist = useCallback(() => {
    const room = hostRoomRef.current;
    if (!room || gameRef.current.role !== 'teacher') return;
    if (roomPersistTimerRef.current) {
      window.clearTimeout(roomPersistTimerRef.current);
    }
    roomPersistTimerRef.current = window.setTimeout(() => {
      roomPersistTimerRef.current = null;
      const latestRoom = hostRoomRef.current;
      if (!latestRoom) return;
      void upsertSupabaseRoom(latestRoom.code, buildSupabaseRoomConfig(latestRoom)).catch(() => {});
    }, 1200);
  }, []);

  const resetCameraBehindPlayer = useCallback(() => {
    const g = gameRef.current;
    g.camYaw = g.yaw + Math.PI;
    g.camPitch = 0.34;
    g.camDist = 10.6;
  }, []);

  const handleTogglePhotoMode = useCallback(() => {
    const g = gameRef.current;
    if (!g.inGame || g.sessionEnded) return;
    const next = !g.photoMode;
    g.photoMode = next;
    g.photoPreviewOpen = false;
    setPhotoMode(next);
    setCapturedPhotoUrl(null);
    if (next) {
      setPhotoSelfie(false);
      g.camDist = 10.8;
      g.joyVec = { x: 0, y: 0 };
      soundRef.current?.playEmoteChime();
    } else {
      setPhotoSelfie(false);
      resetCameraBehindPlayer();
    }
  }, [resetCameraBehindPlayer]);

  const handleTogglePhotoAngle = useCallback(() => {
    const g = gameRef.current;
    if (!g.photoMode) return;
    setPhotoSelfie((prev) => {
      const nextSelfie = !prev;
      if (nextSelfie) {
        // Front-facing selfie angle looking back at avatar's face & friends/peak behind
        g.camYaw = g.yaw + 0.24;
        g.camPitch = 0.14;
        g.camDist = 5.8;
      } else {
        g.camYaw = g.yaw + Math.PI;
        g.camPitch = 0.32;
        g.camDist = 10.8;
      }
      return nextSelfie;
    });
  }, []);

  const handleClosePhotoPreview = useCallback(() => {
    gameRef.current.photoPreviewOpen = false;
    setCapturedPhotoUrl(null);
  }, []);

  const handleCapturePhoto = useCallback(() => {
    const world = worldRef.current;
    const g = gameRef.current;
    if (!world || !g.inGame) return;
    const glCanvas = world.captureScreenshotCanvas();
    if (!glCanvas || glCanvas.width === 0 || glCanvas.height === 0) return;

    const maxW = 1920;
    const scale = glCanvas.width > maxW ? maxW / glCanvas.width : 1;
    const outW = Math.max(1, Math.round(glCanvas.width * scale));
    const outH = Math.max(1, Math.round(glCanvas.height * scale));
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(glCanvas, 0, 0, outW, outH);

    // Crisp expedition watermark card at bottom-left
    const mapLabel =
      MAP_THEMES.find((m) => m.id === settingsRef.current.selectedMap)?.name || 'Puncak Nusantara';
    const roleLabel = g.role === 'teacher' ? 'Guru' : 'Siswa';
    const altMeters = Math.max(0, Math.round(g.pos.y));
    const cpLabel = g.currentCP >= 25 && g.essayDone ? 'Puncak Selesai' : `CP ${g.currentCP}/25`;
    const pad = Math.max(14, Math.round(outW * 0.016));
    const fontSizeTitle = Math.max(15, Math.round(outW * 0.015));
    const fontSizeSub = Math.max(12, Math.round(outW * 0.0115));
    const line1 = 'WOWO PEAK: 3D EXPEDITION';
    const line2 = `${g.name || 'Pendaki'} (${roleLabel})  ·  Ruang #${g.roomCode || '-----'}`;
    const line3 = `${mapLabel}  ·  ${cpLabel}  ·  Elevasi ${altMeters} m`;

    ctx.save();
    ctx.font = `800 ${fontSizeTitle}px "Barlow Condensed", "Plus Jakarta Sans", sans-serif`;
    const w1 = ctx.measureText(line1).width;
    ctx.font = `600 ${fontSizeSub}px "Plus Jakarta Sans", sans-serif`;
    const w2 = ctx.measureText(line2).width;
    const w3 = ctx.measureText(line3).width;
    const boxW = Math.min(outW - pad * 2, Math.ceil(Math.max(w1, w2, w3)) + pad * 1.6);
    const boxH = Math.round(fontSizeTitle + fontSizeSub * 2 + pad * 1.55);
    const boxX = pad;
    const boxY = outH - boxH - pad;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
    ctx.lineWidth = Math.max(1.5, Math.round(outW * 0.0014));
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    const textX = boxX + Math.round(pad * 0.8);
    let textY = boxY + Math.round(pad * 0.52) + fontSizeTitle;
    ctx.fillStyle = '#fbbf24';
    ctx.font = `800 ${fontSizeTitle}px "Barlow Condensed", "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(line1, textX, textY);

    textY += Math.round(fontSizeSub * 1.38);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${fontSizeSub}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(line2, textX, textY);

    textY += Math.round(fontSizeSub * 1.32);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = `600 ${fontSizeSub}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(line3, textX, textY);
    ctx.restore();

    soundRef.current?.playCameraShutter();
    g.photoPreviewOpen = true;
    setCapturedPhotoUrl(outCanvas.toDataURL('image/png'));
  }, []);

  const stopSpectate = useCallback(() => {
    if (!spectatingIdRef.current) return;
    spectatingIdRef.current = null;
    setSpectatingTargetName(null);
    resetCameraBehindPlayer();
  }, [resetCameraBehindPlayer]);

  const cycleSpectateTarget = useCallback(() => {
    const world = worldRef.current;
    const g = gameRef.current;
    if (!world || !g.inGame || g.paused || g.sessionEnded) return;
    const allRemote = Array.from(world.remotePlayers.entries());
    const studentRemote = allRemote.filter(([, entry]) => entry.role === 'student');
    const candidates = studentRemote.length > 0 ? studentRemote : allRemote;
    if (candidates.length === 0) {
      showWarning('Belum ada pendaki lain yang aktif untuk dipantau.', 2.5);
      return;
    }
    const currIdx = spectatingIdRef.current
      ? candidates.findIndex(([id]) => id === spectatingIdRef.current)
      : -1;
    const nextIdx = (currIdx + 1) % candidates.length;
    const [nextId, nextEntry] = candidates[nextIdx];
    spectatingIdRef.current = nextId;
    setSpectatingTargetName(nextEntry.name);
    g.vel.x = 0;
    g.vel.z = 0;
  }, [showWarning]);

  useEffect(() => {
    if (
      photoMode &&
      (sessionEnded || activeQuiz || activeEssayModal || (paused && role === 'student'))
    ) {
      gameRef.current.photoMode = false;
      gameRef.current.photoPreviewOpen = false;
      setPhotoMode(false);
      setPhotoSelfie(false);
      setCapturedPhotoUrl(null);
    }
  }, [activeEssayModal, activeQuiz, paused, photoMode, role, sessionEnded]);

  const tryJump = useCallback(() => {
    const g = gameRef.current;
    if (
      !g.inGame ||
      spectatingIdRef.current ||
      (g.role === 'student' && g.roomStatus !== 'started') ||
      !g.onGround ||
      g.paused ||
      g.activeQuiz ||
      g.essayActive ||
      g.sessionEnded ||
      g.photoPreviewOpen
    ) {
      return;
    }
    g.vel.y = 12.2;
    g.onGround = false;
    soundRef.current?.playJump();
  }, []);

  const handleToggleTeacherFly = useCallback(() => {
    const g = gameRef.current;
    if (g.role !== 'teacher' || !g.inGame || g.sessionEnded) return;
    const next = !g.flyMode;
    g.flyMode = next;
    g.flyVerticalDir = 0;
    g.vel.y = 0;
    if (next) {
      g.onGround = false;
      g.locomotionMode = 'walk';
    }
    setTeacherFlyMode(next);
    soundRef.current?.playEmoteChime();
    showWarning(
      next
        ? 'MODE TERBANG GURU AKTIF! Spasi/Naik terbang ke atas, Shift/C/Turun ke bawah (F = Matikan).'
        : 'Mode Terbang Guru NONAKTIF. Kembali ke fisika berjalan normal.',
      2.8,
    );
  }, [showWarning]);
  const toggleTeacherFlyRef = useRef(handleToggleTeacherFly);
  toggleTeacherFlyRef.current = handleToggleTeacherFly;

  const syncHeadlampIntensity = useCallback(() => {
    const g = gameRef.current;
    const world = worldRef.current;
    if (!world) return;
    const isNightOrFog = world.timeOfDay === 'malam' || world.weather === 'berkabut';
    const isDusk = world.timeOfDay === 'sore' || world.weather === 'badai';
    if (g.headLamp) {
      g.headLamp.intensity =
        world.timeOfDay === 'malam' ? 1.6 : world.timeOfDay === 'sore' ? 0.6 : 0;
    }
    const r15 = g.playerMesh?.userData?.r15 as R15JointRig | undefined;
    if (r15?.headlampSpot) {
      r15.headlampSpot.intensity = isNightOrFog ? 5.8 : isDusk ? 2.6 : 0.85;
    }
  }, []);

  const rebuildLocalPlayerMesh = useCallback(() => {
    const g = gameRef.current;
    const world = worldRef.current;
    if (!world || !g.inGame) return;
    if (g.playerMesh) {
      world.scene.remove(g.playerMesh);
      disposeAvatarGroup(g.playerMesh);
    }
    g.playerMesh = world.createAvatarMesh(g.avatar, g.name, g.role, g.currentCP, g.score, true);
    g.headLamp = new THREE.PointLight('#fef08a', 0, 26);
    g.headLamp.position.set(0, 2.3, -0.4);
    g.playerMesh.add(g.headLamp);
    g.playerMesh.position.copy(g.pos);
    g.playerMesh.rotation.y = g.yaw;
    world.scene.add(g.playerMesh);
    syncHeadlampIntensity();
  }, [syncHeadlampIntensity]);

  // --- Parse URL params (?role=student&room=KODE[&mode=standalone&pkg=...]) & check localStorage reconnect ---
  useEffect(() => {
    const hasCoarse =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasCoarse || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    const urlRoom = params.get('room');
    const urlPkg = params.get('pkg');

    const decodedPkg = urlPkg ? decodeStandalonePacket(urlPkg) : null;
    if (decodedPkg) {
      setStandalonePacket(decodedPkg);
      setLockedStudentMode(true);
      setRole('student');
    } else if (urlRole === 'student') {
      setLockedStudentMode(true);
      setRole('student');
    }

    const savedLobbyAvatar = loadSavedAvatar('student');
    if (savedLobbyAvatar) {
      setAvatar(savedLobbyAvatar);
    }

    const cleanRoom = decodedPkg?.roomCode
      ? decodedPkg.roomCode
      : urlRoom
        ? urlRoom.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5)
        : '';
    if (cleanRoom) {
      setRoomCodeInput(cleanRoom);
    }

    const lookupRoom = cleanRoom || localStorage.getItem('wowo_peak_last_room') || '';
    if (lookupRoom) {
      const savedRaw = localStorage.getItem(`wowo_peak_session_${lookupRoom}`);
      if (savedRaw) {
        try {
          const saved = JSON.parse(savedRaw) as StudentRestoreProgress;
          if (saved && saved.roomCode === lookupRoom && saved.studentId) {
            setReconnectInfo(saved);
            setStudentName(saved.studentName || '');
            setRoomCodeInput(saved.roomCode);
            if (saved.avatarConfig) {
              setAvatar(normalizeAvatarConfig(saved.avatarConfig, 'student'));
            }
          }
        } catch {
          // ignore corrupted storage
        }
      }
    }
  }, []);

  const finishActiveQuiz = useCallback(() => {
    const g = gameRef.current;
    if (!g.activeQuiz) return;
    const cpIndex = g.activeQuiz.cpIndex;
    g.activeQuiz = null;
    setActiveQuiz(null);
    if (cpIndex === 25) {
      showWarning(
        'CP 25 SELESAI! Daki sedikit lagi menuju Gapura Puncak untuk Pos Ujian Akhir (5 Soal Isian Singkat)!',
        5.5,
      );
    }
  }, [showWarning]);

  const submitQuizAnswer = useCallback(
    (chosenLetter: string) => {
      const g = gameRef.current;
      if (!g.activeQuiz || g.activeQuiz.answered) return;
      g.activeQuiz.answered = true;
      g.activeQuiz.chosenLetter = chosenLetter || null;
      g.activeQuiz.explainTimeLeft = Math.min(60, Math.max(5, g.explanationDurationSec || 45));

      const { cpIndex, question, timeLeft, totalDuration, startTimeMs } = g.activeQuiz;
      const isCorrect = chosenLetter === question.answer;
      const timeSpent = Math.max(1, Math.round((performance.now() - startTimeMs) / 1000));

      soundRef.current?.playQuizResult(isCorrect);

      if (isCorrect) {
        const speedBonus = Math.round((timeLeft / Math.max(1, totalDuration)) * 50);
        g.score += 100 + speedBonus;
        g.correctCount += 1;
      } else {
        g.wrongCount += 1;
      }

      g.currentCP = Math.max(g.currentCP, cpIndex);
      if (!g.completedCPs.includes(cpIndex)) {
        g.completedCPs.push(cpIndex);
      }

      const newAnswer: AnswerRecord = {
        cp: cpIndex,
        question: question.question,
        chosen: chosenLetter || 'TIMEOUT',
        correctKey: question.answer,
        isCorrect,
        timeSpent,
      };
      g.answers.push(newAnswer);

      if (g.playerMesh && worldRef.current) {
        worldRef.current.updateNameSprite(
          g.playerMesh.userData.tagSprite as THREE.Sprite,
          g.name,
          g.role,
          g.currentCP,
          g.score,
        );
        worldRef.current.updateCpGatesForRole(g.role, g.currentCP, g.completedCPs);
      }

      setCurrentCP(g.currentCP);
      setScore(g.score);
      setActiveQuiz({ ...g.activeQuiz });
      saveStudentSession();
      emitStudentProgress({ newAnswer });
    },
    [emitStudentProgress, saveStudentSession],
  );

  const openCheckpointQuiz = useCallback(
    (cpIndex: number) => {
      const g = gameRef.current;
      if (g.activeQuiz || g.essayActive || g.role !== 'student') return;
      const qObj = g.studentDeck[cpIndex - 1];
      if (!qObj) return;

      soundRef.current?.playCheckpoint();
      g.vel.set(0, 0, 0);

      if (g.bridgeAttemptMode === 'challenge') {
        g.score += 5;
        setScore(g.score);
        showWarning('Bonus Jalur Tantangan +5 pts! Hebat!', 2.6);
        if (g.playerMesh && worldRef.current) {
          worldRef.current.updateNameSprite(
            g.playerMesh.userData.tagSprite as THREE.Sprite,
            g.name,
            g.role,
            Math.max(g.currentCP, cpIndex),
            g.score,
          );
        }
      }
      g.bridgeAttemptMode = 'none';

      // Laporkan pencapaian Checkpoint terbaru secara real-time ke Guru saat siswa tiba di pos
      worldRef.current?.updateCpBeacons(g.role, Math.max(g.currentCP, cpIndex), g.completedCPs);
      emitStudentProgress({ cp: Math.max(g.currentCP, cpIndex) });

      const quizObj: ActiveQuizState = {
        cpIndex,
        question: qObj,
        timeLeft: g.quizDuration,
        totalDuration: g.quizDuration,
        answered: false,
        chosenLetter: null,
        startTimeMs: performance.now(),
        explainTimeLeft: Math.min(60, Math.max(5, g.explanationDurationSec || 45)),
      };
      g.activeQuiz = quizObj;
      setActiveQuiz({ ...quizObj });
    },
    [emitStudentProgress, showWarning],
  );

  const advanceSummitEssay = useCallback(() => {
    const g = gameRef.current;
    if (!g.essayFeedbackOpen) return;
    g.essayFeedbackOpen = false;
    g.essayExplainLeft = 0;
    const isLast = g.essayIsLastPending;
    g.essayIsLastPending = false;

    if (isLast) {
      g.essayActive = false;
      setActiveEssayModal(null);
      if (worldRef.current) {
        worldRef.current.summitCelebrationActive = true;
      }
      soundRef.current?.playCheckpoint();
      showWarning(
        'Selamat! Kamu Mencapai Puncak WOWO! Bebas bergerak & merayakan bersama teman sambil menunggu teman lainnya selesai.',
        6.0,
      );
    } else {
      const dur = Math.min(60, Math.max(5, g.explanationDurationSec || 45));
      setActiveEssayModal((curr) =>
        curr
          ? {
              ...curr,
              currentIndex: curr.currentIndex + 1,
              startTimeMs: performance.now(),
              explainTimeLeft: dur,
              feedback: null,
            }
          : null,
      );
    }
  }, [showWarning]);

  const openSummitEssay = useCallback(() => {
    const g = gameRef.current;
    if (
      g.role !== 'student' ||
      g.essayDone ||
      g.essayActive ||
      g.activeQuiz ||
      !g.completedCPs.includes(25)
    ) {
      return;
    }
    const baseQuestions =
      g.essayQuestions && g.essayQuestions.length > 0
        ? g.essayQuestions
        : DEFAULT_ESSAY_QUESTIONS;
    const questions = buildStudentEssayDeck(baseQuestions, g.roomCode, g.clientId);
    g.essayQuestions = questions;
    const firstUnansweredIdx = questions.findIndex(
      (q) => !g.essayAnswers.some((ans) => ans.no === q.no),
    );
    const startIdx =
      firstUnansweredIdx >= 0
        ? firstUnansweredIdx
        : Math.min(questions.length - 1, g.essayAnswers.length);
    soundRef.current?.playCheckpoint();
    g.vel.set(0, 0, 0);
    if (g.bridgeAttemptMode === 'challenge') {
      g.score += 5;
      setScore(g.score);
      showWarning('Bonus Jalur Tantangan +5 pts! Hebat!', 2.6);
      if (g.playerMesh && worldRef.current) {
        worldRef.current.updateNameSprite(
          g.playerMesh.userData.tagSprite as THREE.Sprite,
          g.name,
          g.role,
          g.currentCP,
          g.score,
        );
      }
      emitStudentProgress();
    }
    g.bridgeAttemptMode = 'none';
    g.essayActive = true;
    g.essayFeedbackOpen = false;
    g.essayExplainLeft = 0;
    g.essayIsLastPending = false;
    setActiveEssayModal({
      questions,
      currentIndex: startIdx,
      startTimeMs: performance.now(),
      explainTimeLeft: Math.min(60, Math.max(5, g.explanationDurationSec || 45)),
      feedback: null,
    });
  }, [emitStudentProgress, showWarning]);

  const submitSummitEssayAnswer = useCallback(
    (rawInput: string) => {
      const g = gameRef.current;
      const prev = activeEssayRef.current;
      if (!prev || prev.feedback) return;
      const q = prev.questions[prev.currentIndex];
      if (!q) return;

      const isCorrect = evaluateEssayAnswer(rawInput, q.acceptedAnswers);
      const timeSpent = Math.max(1, Math.round((performance.now() - prev.startTimeMs) / 1000));
      soundRef.current?.playQuizResult(isCorrect);

      if (isCorrect) {
        g.score += 120;
        g.essayCorrect += 1;
      } else {
        g.essayWrong += 1;
      }

      const newEssayAnswer: EssayAnswerRecord = {
        no: q.no,
        question: q.question,
        studentAnswer: rawInput.trim(),
        correctKey: q.rawKey,
        isCorrect,
        timeSpent,
      };
      g.essayAnswers.push(newEssayAnswer);

      const isLast = prev.currentIndex >= prev.questions.length - 1;
      if (isLast) {
        g.essayDone = true;
        setEssayDone(true);
      }
      setEssayCorrect(g.essayCorrect);
      setScore(g.score);
      saveStudentSession();
      emitStudentProgress({
        isianDone: isLast || g.essayDone,
        newEssayAnswer,
      });

      const explainDur = Math.min(60, Math.max(5, g.explanationDurationSec || 45));
      g.essayFeedbackOpen = true;
      g.essayExplainLeft = explainDur;
      g.essayIsLastPending = isLast;

      setActiveEssayModal({
        ...prev,
        explainTimeLeft: explainDur,
        feedback: {
          studentAnswer: rawInput.trim(),
          isCorrect,
          correctKey: q.rawKey,
          explanation: q.explanation,
        },
      });
    },
    [emitStudentProgress, saveStudentSession],
  );

  const triggerStudentFall = useCallback(
    (reasonText: string) => {
      const g = gameRef.current;
      const world = worldRef.current;
      if (g.role !== 'student' || !world) return;

      g.bridgeAttemptMode = 'none';
      g.fallCount += 1;
      setFallCount(g.fallCount);
      showWarning(reasonText, 3.0);
      soundRef.current?.playQuizResult(false);

      let targetCpIdx = g.currentCP;
      if (g.respawnMode === 'prev_cp') {
        targetCpIdx = Math.max(0, g.currentCP - 1);
      } else if (g.respawnMode === 'base_camp') {
        targetCpIdx = 0;
      }

      const safeIdx = Math.min(25, Math.max(0, targetCpIdx));
      const safeCP = world.getCpPoint(safeIdx);
      const nextCP = safeIdx >= 25 ? world.getSummitPoint() : world.getCpPoint(safeIdx + 1);
      const yawToNext = Math.atan2(nextCP.x - safeCP.x, nextCP.z - safeCP.z);
      g.pos.set(safeCP.x, world.getGroundHeight(safeCP.x, safeCP.z), safeCP.z);
      g.vel.set(0, 0, 0);
      g.onGround = true;
      g.yaw = yawToNext;
      g.camYaw = yawToNext + Math.PI;

      saveStudentSession();
      emitStudentProgress();
    },
    [emitStudentProgress, saveStudentSession, showWarning],
  );

  const applyRoomSettings = useCallback(
    (s: RoomSettings) => {
      if (!s) return;
      const prevMin = sessionDurationMinRef.current || 20;
      const normalized: RoomSettings = {
        timeOfDay: s.timeOfDay || 'pagi',
        weather: s.weather || 'cerah',
        selectedMap: s.selectedMap || 'nusantara',
        quizDuration: Math.min(60, Math.max(5, Number(s.quizDuration) || 30)),
        difficultyLevel: s.difficultyLevel || 3,
        respawnMode: s.respawnMode || 'last_cp',
        pgWeight: s.pgWeight || 75,
        essayWeight: s.essayWeight || 25,
        sessionDurationMinutes: s.sessionDurationMinutes || 20,
        explanationDurationSec: Math.min(60, Math.max(5, Number(s.explanationDurationSec) || 45)),
      };
      sessionDurationMinRef.current = normalized.sessionDurationMinutes;
      const g = gameRef.current;
      if (
        g.role === 'student' &&
        g.inGame &&
        !g.sessionEnded &&
        prevMin !== normalized.sessionDurationMinutes
      ) {
        if (g.roomStatus === 'waiting') {
          const fullSec = normalized.sessionDurationMinutes * 60;
          remainingSecRef.current = fullSec;
          setRemainingSec(fullSec);
        } else {
          const prevTotal = prevMin * 60;
          const elapsed = Math.max(0, prevTotal - remainingSecRef.current);
          const nextRem = Math.max(15, normalized.sessionDurationMinutes * 60 - elapsed);
          remainingSecRef.current = nextRem;
          setRemainingSec(nextRem);
        }
      }
      setSettings(normalized);
      g.quizDuration = normalized.quizDuration;
      g.explanationDurationSec = normalized.explanationDurationSec;
      g.respawnMode = normalized.respawnMode;
      const world = worldRef.current;
      if (world) {
        const targetMap: MapThemeId = normalized.selectedMap || 'nusantara';
        if (targetMap !== world.selectedMap) {
          world.applyMapTheme(targetMap);
          if (g.inGame && !(g.role === 'teacher' && g.flyMode)) {
            const safeIdx = Math.min(25, Math.max(0, g.currentCP));
            const safeCP = world.getCpPoint(safeIdx);
            const nextCP = safeIdx >= 25 ? world.getSummitPoint() : world.getCpPoint(safeIdx + 1);
            g.pos.set(safeCP.x, world.getGroundHeight(safeCP.x, safeCP.z), safeCP.z);
            g.vel.set(0, 0, 0);
            g.onGround = true;
            g.yaw = Math.atan2(nextCP.x - safeCP.x, nextCP.z - safeCP.z);
            resetCameraBehindPlayer();
          }
        }
        world.applyEnvironment(normalized.timeOfDay, normalized.weather);
        world.setDifficultyLevel(normalized.difficultyLevel);
      }
      syncHeadlampIntensity();
    },
    [resetCameraBehindPlayer, syncHeadlampIntensity],
  );

  const upsertRemotePlayer = useCallback((p: RemotePlayerPayload) => {
    const world = worldRef.current;
    const g = gameRef.current;
    if (!world || !p || !p.id || p.id === g.clientId) return;

    const cleanAvatar = normalizeAvatarConfig(p.avatar, p.role);
    const existing = world.remotePlayers.get(p.id);
    if (!existing) {
      const mesh = world.createAvatarMesh(
        cleanAvatar,
        p.name,
        p.role,
        p.currentCP || 0,
        p.score || 0,
        false,
      );
      world.scene.add(mesh);
      const baseCp = world.getCpPoint(0);
      const targetPos = new THREE.Vector3(
        p.pose?.x ?? baseCp.x,
        p.pose?.y ?? baseCp.y,
        p.pose?.z ?? baseCp.z,
      );
      mesh.position.copy(targetPos);
      world.remotePlayers.set(p.id, {
        mesh,
        targetPos,
        targetYaw: p.pose?.yaw ?? 0,
        name: p.name,
        role: p.role,
        avatar: cleanAvatar,
        cp: p.currentCP || 0,
        score: p.score || 0,
        walkPhase: 0,
        activeEmote: null,
        emoteTimer: 0,
        poseState: p.pose?.state || 'idle',
      });
    } else {
      if (p.avatar && JSON.stringify(p.avatar) !== JSON.stringify(existing.avatar)) {
        existing.avatar = cleanAvatar;
        const pos = existing.mesh.position.clone();
        const rotY = existing.mesh.rotation.y;
        world.scene.remove(existing.mesh);
        disposeAvatarGroup(existing.mesh);
        const newMesh = world.createAvatarMesh(
          cleanAvatar,
          p.name || existing.name,
          p.role,
          p.currentCP ?? existing.cp,
          p.score ?? existing.score,
          false,
        );
        newMesh.position.copy(pos);
        newMesh.rotation.y = rotY;
        world.scene.add(newMesh);
        existing.mesh = newMesh;
      }
      if (p.pose) {
        existing.targetPos.set(p.pose.x, p.pose.y, p.pose.z);
        if (typeof p.pose.yaw === 'number') existing.targetYaw = p.pose.yaw;
        if (p.pose.state) existing.poseState = p.pose.state;
      }
      if (p.currentCP !== existing.cp || p.score !== existing.score) {
        existing.cp = p.currentCP ?? existing.cp;
        existing.score = p.score ?? existing.score;
        world.updateNameSprite(
          existing.mesh.userData.tagSprite as THREE.Sprite,
          existing.name,
          existing.role,
          existing.cp,
          existing.score,
        );
      }
    }
  }, []);

  const removeRemotePlayer = useCallback((id: string) => {
    const world = worldRef.current;
    if (!world) return;
    const entry = world.remotePlayers.get(id);
    if (entry) {
      world.scene.remove(entry.mesh);
      disposeAvatarGroup(entry.mesh);
      world.remotePlayers.delete(id);
    }
  }, []);

  const enterGameWorld = useCallback(
    (
      roomState: PublicRoomState,
      questionsFromServer: QuizQuestion[] | null,
      essayQuestionsFromServer?: EssayQuestion[] | null,
    ) => {
      const g = gameRef.current;
      const world = worldRef.current;
      if (!world) return;

      g.inGame = true;
      g.roomCode = roomState.roomCode;
      g.roomStatus = roomState.status || 'started';
      g.paused = Boolean(roomState.paused);
      const baseEssay =
        essayQuestionsFromServer && essayQuestionsFromServer.length > 0
          ? essayQuestionsFromServer
          : DEFAULT_ESSAY_QUESTIONS;
      g.essayQuestions =
        g.role === 'student'
          ? buildStudentEssayDeck(baseEssay, g.roomCode, g.clientId)
          : baseEssay;

      setInGame(true);
      setRoomCode(roomState.roomCode);
      setRoomStatus(roomState.status || 'started');
      setRemainingSec(
        typeof roomState.remainingSec === 'number'
          ? Math.max(0, roomState.remainingSec)
          : (roomState.settings?.sessionDurationMinutes || 20) * 60,
      );
      setPaused(Boolean(roomState.paused));
      setParticipants(roomState.participants || []);
      setQuestionCount(questionsFromServer?.length || roomState.questionCount || 25);
      setEssayQuestionCount(
        essayQuestionsFromServer?.length || roomState.essayQuestionCount || 5,
      );
      setCurrentCP(g.currentCP);
      setEssayDone(g.essayDone);
      setEssayCorrect(g.essayCorrect);
      setScore(g.score);
      setFallCount(g.fallCount);

      if (g.role === 'student') {
        g.studentDeck = buildStudentQuizDeck(questionsFromServer, g.roomCode, g.clientId);
        saveStudentSession();
      }

      if (g.playerMesh) {
        world.scene.remove(g.playerMesh);
        disposeAvatarGroup(g.playerMesh);
      }
      g.playerMesh = world.createAvatarMesh(g.avatar, g.name, g.role, g.currentCP, g.score, true);
      g.headLamp = new THREE.PointLight('#fef08a', 0, 26);
      g.headLamp.position.set(0, 2.3, 0.4);
      g.playerMesh.add(g.headLamp);
      world.scene.add(g.playerMesh);

      sessionDurationMinRef.current = roomState.settings?.sessionDurationMinutes || 20;
      applyRoomSettings(roomState.settings);

      const spawnIdx = Math.min(25, Math.max(0, g.currentCP));
      const spawnCP = world.getCpPoint(spawnIdx);
      const nextCP = spawnIdx >= 25 ? world.getSummitPoint() : world.getCpPoint(spawnIdx + 1);
      const yawToNext = Math.atan2(nextCP.x - spawnCP.x, nextCP.z - spawnCP.z);
      g.pos.set(spawnCP.x, world.getGroundHeight(spawnCP.x, spawnCP.z), spawnCP.z);
      g.vel.set(0, 0, 0);
      g.onGround = true;
      g.yaw = yawToNext;
      resetCameraBehindPlayer();

      spectatingIdRef.current = null;
      setSpectatingTargetName(null);
      world.summitCelebrationActive = Boolean(g.essayDone);
      world.updateCpGatesForRole(g.role, g.currentCP, g.completedCPs);
    },
    [applyRoomSettings, resetCameraBehindPlayer, saveStudentSession],
  );

  const handleTeacherEvent = useCallback(
    (
      eventType: string,
      opts?: { durationMs?: number; timestamp?: number; count?: number; offsets?: number[] },
    ) => {
      const g = gameRef.current;
      const world = worldRef.current;
      if (g.paused || !world) return;
      if (g.role === 'student' && g.roomStatus !== 'started') return;

      const durationMs = Math.max(1000, Math.min(8000, Number(opts?.durationMs ?? 5000)));
      const durSec = durationMs / 1000;

      const existingTimer = disasterCleanupTimersRef.current.get(eventType);
      if (existingTimer) window.clearTimeout(existingTimer);
      const cleanupId = window.setTimeout(() => {
        disasterCleanupTimersRef.current.delete(eventType);
        worldRef.current?.clearDisasterEffect(eventType as DisasterEventType);
      }, durationMs);
      disasterCleanupTimersRef.current.set(eventType, cleanupId);

      if (eventType === 'brainrot') {
        soundRef.current?.playBrainrotSound();
        world.spawnBrainrotWave(g.pos.x, g.pos.z, durSec);
        startDisasterCountdownBanner('AWAS ADA BRAINROT!', durationMs);
        return;
      }

      if (eventType === 'thunder') {
        triggerLightningFlash();
        world.triggerThunderStorm(g.pos.x, g.pos.z, durSec);
        startDisasterCountdownBanner('AWAS BADAI PETIR MENYAMBAR JALUR DEPAN!', durationMs);
        return;
      }

      if (eventType === 'kuntilanak') {
        soundRef.current?.playKuntilanakLaugh();
        world.spawnKuntilanakHorde(g.pos.x, g.pos.z, opts?.count ?? 3, opts?.offsets ?? [9, 15, 21], durSec);
        startDisasterCountdownBanner(
          g.role === 'teacher'
            ? '3 KUNTILANAK MENGHADANG JALUR PENDAKIAN!'
            : '3 KUNTILANAK MENGHADANG JALUR PENDAKIAN!',
          durationMs,
        );
        return;
      }

      if (eventType === 'pocong') {
        soundRef.current?.playPocongHop();
        world.spawnPocongHorde(g.pos.x, g.pos.z, opts?.count ?? 3, opts?.offsets ?? [9, 15, 21], durSec);
        startDisasterCountdownBanner('3 POCONG MELOMPAT DI JALUR DEPAN!', durationMs);
        return;
      }

      if (eventType === 'hail') {
        soundRef.current?.playIceHail();
        world.spawnIceHailAhead(g.pos.x, g.pos.z, opts?.count ?? 50, durSec);
        startDisasterCountdownBanner('WASPADA BADAI HUJAN ES & ANGIN BEKU!', durationMs);
        return;
      }

      if (eventType === 'landslide') {
        soundRef.current?.playLandslide();
        const mode = world.selectedMap === 'salju' ? 'ice' : 'rock';
        world.spawnLandslideAhead(g.pos.x, g.pos.z, mode);
        startDisasterCountdownBanner(
          world.selectedMap === 'salju'
            ? 'LONGSORAN TEBING SALJU! Hindari bongkahan es dari atas!'
            : 'TANAH LONGSOR! Hati-hati guguran batu dari lereng atas!',
          durationMs,
        );
        return;
      }

      if (eventType === 'yeti') {
        soundRef.current?.playYetiRoar();
        world.spawnYetiHorde(g.pos.x, g.pos.z, opts?.count ?? 3, durSec);
        startDisasterCountdownBanner('AWAS MONSTER SALJU MENGHADANG!', durationMs);
        return;
      }

      if (eventType === 'snowstorm') {
        soundRef.current?.playSnowstormWind(durSec);
        world.triggerSnowstorm(durSec);
        startDisasterCountdownBanner('BADAI SALJU EVEREST! Gerakan melambat, waspadai tiupan angin beku!', durationMs);
        return;
      }

      if (eventType === 'flash_flood') {
        soundRef.current?.playFloodRumble(false);
        world.triggerFloodDisaster('flash_flood', g.pos.y, durSec, g.pos.x, g.pos.z);
        startDisasterCountdownBanner('AWAS BANJIR BANDANG! Segera naik ke tempat lebih tinggi!', durationMs);
        return;
      }

      if (eventType === 'lava_rain') {
        soundRef.current?.playWildfireCrackle();
        world.spawnLavaRainAhead(g.pos.x, g.pos.z, durSec);
        startDisasterCountdownBanner('AWAS HUJAN LAVA PIJAR! Hindari lingkaran merah!', durationMs);
        return;
      }

      if (eventType === 'lava_landslide') {
        soundRef.current?.playLandslide();
        world.spawnLandslideAhead(g.pos.x, g.pos.z, 'lava');
        startDisasterCountdownBanner('LONGSOR LAVA BEBATUAN! Hindari batu magma menggelinding!', durationMs);
        return;
      }

      if (eventType === 'lava_flood') {
        soundRef.current?.playFloodRumble(true);
        world.triggerFloodDisaster('lava_flood', g.pos.y, durSec, g.pos.x, g.pos.z);
        startDisasterCountdownBanner('BANJIR LAVA KALDERA NAIK! Segera panjat ke puncak!', durationMs);
        return;
      }

      if (eventType === 'fire_rain' || eventType === 'wildfire') {
        soundRef.current?.playWildfireCrackle();
        world.spawnFireRainAhead(g.pos.x, g.pos.z, opts?.count ?? 50, durSec);
        startDisasterCountdownBanner('WASPADA HUJAN API & BARA LANGIT!', durationMs);
        return;
      }

      if (eventType === 'heavy_rain') {
        soundRef.current?.playSlideWhoosh();
        world.triggerTemporaryWeather('heavy_rain', durSec);
        startDisasterCountdownBanner('HUJAN LEBAT MELANDA JALUR PENDAKIAN!', durationMs);
        return;
      }

      if (eventType === 'thick_fog') {
        world.triggerTemporaryWeather('thick_fog', durSec);
        startDisasterCountdownBanner('KABUT TEBAL MENYELIMUTI GUNUNG WOWO!', durationMs);
        return;
      }

      if (eventType === 'wildlife') {
        const species = world.spawnWildlifeAhead(g.pos.x, g.pos.z, undefined, durSec);
        if (species === 'tiger') {
          soundRef.current?.playTigerRoar();
          startDisasterCountdownBanner('AWAS HARIMAU SUMATERA MUNCUL DI JALUR DEPAN!', durationMs);
        } else if (species === 'bear') {
          soundRef.current?.playBearGrowl();
          startDisasterCountdownBanner('AWAS BERUANG MADU MENGHADANG DI JALUR DEPAN!', durationMs);
        } else if (species === 'boar') {
          soundRef.current?.playBoarSnort();
          startDisasterCountdownBanner('AWAS BABI HUTAN MENYERUDUK DI JALUR SETAPAK!', durationMs);
        } else {
          soundRef.current?.playSnakeHiss();
          startDisasterCountdownBanner('AWAS ULAR PITON BERBISA DI TIKUNGAN JALUR!', durationMs);
        }
        return;
      }

      if (eventType === 'earthquake') {
        soundRef.current?.playEarthquake(durSec);
        world.triggerEarthquake(g.pos.x, g.pos.z, durSec);
        startDisasterCountdownBanner('GEMPA BUMI GUNUNG WOWO! Jaga keseimbangan!', durationMs);
        return;
      }

      if (eventType === 'meteor') {
        world.spawnMeteorAhead(g.pos.x, g.pos.z, durSec);
        startDisasterCountdownBanner('HUJAN METEOR API DARI LANGIT! Hindari lingkaran merah!', durationMs);
      }
    },
    [startDisasterCountdownBanner, triggerLightningFlash],
  );

  const cleanupChannel = useCallback(() => {
    intentionalDisconnectRef.current = true;
    clearAllDisasterTimers();
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (timeoutFallbackRef.current) {
      window.clearTimeout(timeoutFallbackRef.current);
      timeoutFallbackRef.current = null;
    }
    if (roomPersistTimerRef.current) {
      window.clearTimeout(roomPersistTimerRef.current);
      roomPersistTimerRef.current = null;
    }
    if (channelRef.current) {
      try {
        void channelRef.current.untrack().catch(() => {});
      } catch {
        // ignore
      }
      try {
        void channelRef.current.unsubscribe();
      } catch {
        // ignore
      }
      channelRef.current = null;
    }
    isChannelSubscribedRef.current = false;
    pendingProgressSyncRef.current = false;
    remotePlayersRef.current.clear();
    lastSentPoseRef.current = null;
    lastHandledEventIdRef.current = '';
    handledEventIdsRef.current.clear();
    hostRoomRef.current = null;
  }, [clearAllDisasterTimers]);

  const applySessionEnded = useCallback(
    (
      reason: 'teacher' | 'timeout',
      nextLeaderboard?: ParticipantSummary[],
      nextExportRows?: ExportStudentRow[],
    ) => {
      const g = gameRef.current;
      if (g.sessionEnded) return;
      g.sessionEnded = true;
      g.roomStatus = 'ended';
      g.paused = true;
      g.activeQuiz = null;
      g.essayActive = false;
      g.essayFeedbackOpen = false;
      g.essayExplainLeft = 0;
      g.essayIsLastPending = false;
      remainingSecRef.current = 0;
      spectatingIdRef.current = null;
      setSpectatingTargetName(null);
      setRoomStatus('ended');
      setShowClassLobby(false);

      const hostRoom = hostRoomRef.current;
      const selfSummary: ParticipantSummary[] =
        g.role === 'student'
          ? [
              {
                id: g.clientId,
                name: g.name,
                avatar: g.avatar,
                currentCP: g.currentCP,
                score: g.score,
                correctCount: g.correctCount,
                wrongCount: g.wrongCount,
                essayCorrect: g.essayCorrect,
                essayWrong: g.essayWrong,
                essayDone: g.essayDone,
                fallCount: g.fallCount,
                online: true,
                finished: g.currentCP >= 25 && g.completedCPs.includes(25) && g.essayDone,
              },
            ]
          : [];
      const selfExport: ExportStudentRow[] =
        g.role === 'student'
          ? [
              {
                id: g.clientId,
                name: g.name,
                currentCP: g.currentCP,
                score: g.score,
                correctCount: g.correctCount,
                wrongCount: g.wrongCount,
                essayCorrect: g.essayCorrect,
                essayWrong: g.essayWrong,
                essayDone: g.essayDone,
                fallCount: g.fallCount,
                answers: g.answers,
                essayAnswers: g.essayAnswers,
              },
            ]
          : [];

      const finalLeaderboard =
        nextLeaderboard && nextLeaderboard.length > 0
          ? nextLeaderboard
          : hostRoom
            ? getHostParticipantsSnapshot(hostRoom.students)
            : selfSummary;
      const finalExportRows =
        nextExportRows && nextExportRows.length > 0
          ? nextExportRows
          : hostRoom
            ? getHostExportRows(hostRoom.students)
            : selfExport;

      setSessionEndReason(reason);
      setRemainingSec(0);
      setSessionEnded(true);
      setPaused(true);
      setActiveQuiz(null);
      setActiveEssayModal(null);
      setLeaderboard(finalLeaderboard);
      setExportRows(finalExportRows);
      if (g.role === 'student') {
        clearStudentSession(g.roomCode);
      }
    },
    [clearStudentSession],
  );

  const activateExpeditionOnStudent = useCallback(
    (
      _remSec?: number,
      _endsAt?: number | null,
      nextSettings?: RoomSettings,
      nextParticipants?: ParticipantSummary[],
    ) => {
      const g = gameRef.current;
      if (g.roomStatus === 'started' || g.sessionEnded) return;
      g.roomStatus = 'started';
      g.paused = false;
      setRoomStatus('started');
      setShowClassLobby(false);
      setPaused(false);

      // Anchor countdown to THIS student's own start time (full session duration, independent of Teacher's room clock)
      const durMin = nextSettings?.sessionDurationMinutes || sessionDurationMinRef.current || 20;
      sessionDurationMinRef.current = durMin;
      const fullSec = durMin * 60;
      remainingSecRef.current = fullSec;
      setRemainingSec(fullSec);
      studentStartedAtRef.current = Date.now();
      joinedAtRef.current = studentStartedAtRef.current;

      if (nextSettings) {
        applyRoomSettings(nextSettings);
      }
      if (Array.isArray(nextParticipants) && nextParticipants.length > 0) {
        setParticipants(nextParticipants);
      }
      saveStudentSession();

      soundRef.current?.playCheckpoint();
      showWarning('EKSPEDISI DIMULAI OLEH GURU! Selamat mendaki Puncak Mount WOWO!', 4.2);
    },
    [applyRoomSettings, saveStudentSession, showWarning],
  );

  const handleIncomingRoomCommand = useCallback(
    (cmd: RoomCommandPayload | null | undefined, fromDatabase = false) => {
      if (!cmd || typeof cmd !== 'object' || !cmd.type || !cmd.eventId) return;
      if (
        lastHandledEventIdRef.current === cmd.eventId ||
        handledEventIdsRef.current.has(cmd.eventId)
      ) {
        return;
      }

      const cur = gameRef.current;
      if (cur.role !== 'student' || cur.sessionEnded) return;

      const durMs = typeof cmd.duration === 'number' && cmd.duration > 0 ? cmd.duration : 5000;
      const ageMs = typeof cmd.triggeredAt === 'number' ? Date.now() - cmd.triggeredAt : 0;

      const recordHandled = () => {
        lastHandledEventIdRef.current = cmd.eventId;
        if (handledEventIdsRef.current.size > 200) {
          handledEventIdsRef.current.clear();
        }
        handledEventIdsRef.current.add(cmd.eventId);
      };

      if (cmd.type === 'start_expedition') {
        recordHandled();
        activateExpeditionOnStudent(
          cmd.remainingSec,
          cmd.sessionEndsAt,
          cmd.settings,
          cmd.participants,
        );
        return;
      }

      if (cmd.type === 'pause_class') {
        recordHandled();
        if (cur.roomStatus === 'waiting') {
          activateExpeditionOnStudent(cmd.remainingSec, cmd.sessionEndsAt, cmd.settings);
        }
        const nextPaused = Boolean(cmd.paused);
        cur.paused = nextPaused;
        setPaused(nextPaused);
        if (nextPaused && spectatingIdRef.current) {
          spectatingIdRef.current = null;
          setSpectatingTargetName(null);
        }
        showWarning(
          nextPaused
            ? 'KELAS DIJEDA SEMENTARA OLEH GURU!'
            : 'KELAS DILANJUTKAN! Teruskan pendakian ke puncak!',
          3.0,
        );
        return;
      }

      if (cmd.type === 'end_session') {
        recordHandled();
        applySessionEnded(cmd.reason ?? 'teacher', cmd.leaderboard, cmd.exportRows);
        return;
      }

      if (cmd.type === 'CHANGE_MAP') {
        recordHandled();
        const nextMap: MapThemeId = cmd.mapId || cmd.settings?.selectedMap || 'nusantara';
        applyRoomSettings({
          ...settingsRef.current,
          ...(cmd.settings || {}),
          selectedMap: nextMap,
        });
        const mapLabel =
          MAP_THEMES.find((m) => m.id === nextMap)?.name || 'Puncak Nusantara';
        showWarning(`PETA 3D BERUBAH KE: ${mapLabel.toUpperCase()}! Lanjutkan pendakianmu!`, 3.2);
        return;
      }

      // Event bencana / horor berdurasi 5 detik: abaikan jika sudah kedaluwarsa dari DB
      if (fromDatabase && ageMs > durMs + 2500) {
        recordHandled();
        return;
      }

      recordHandled();
      const remainingDurationMs = fromDatabase && ageMs > 0 ? Math.max(1200, durMs - ageMs) : durMs;
      handleTeacherEvent(cmd.type as DisasterEventType, {
        durationMs: remainingDurationMs,
        timestamp: cmd.triggeredAt,
        count: cmd.count,
        offsets: cmd.offsets,
      });
    },
    [activateExpeditionOnStudent, applyRoomSettings, applySessionEnded, handleTeacherEvent, showWarning],
  );

  const channelCallbacksRef = useRef({
    activateExpeditionOnStudent,
    applyRoomSettings,
    applySessionEnded,
    clearStudentSession,
    emitStudentProgress,
    handleIncomingRoomCommand,
    handleTeacherEvent,
    removeRemotePlayer,
    scheduleTeacherRoomPersist,
    showWarning,
    triggerLightningFlash,
    upsertRemotePlayer,
  });
  channelCallbacksRef.current = {
    activateExpeditionOnStudent,
    applyRoomSettings,
    applySessionEnded,
    clearStudentSession,
    emitStudentProgress,
    handleIncomingRoomCommand,
    handleTeacherEvent,
    removeRemotePlayer,
    scheduleTeacherRoomPersist,
    showWarning,
    triggerLightningFlash,
    upsertRemotePlayer,
  };

  const subscribeRoomChannel = useCallback((code: string) => {
    intentionalDisconnectRef.current = false;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (channelRef.current) {
      try {
        void channelRef.current.unsubscribe();
      } catch {
        // ignore
      }
      channelRef.current = null;
    }

    isChannelSubscribedRef.current = false;
    const channel = createRoomRealtimeChannel(code);
    channelRef.current = channel;

    const syncPresenceParticipants = () => {
      const cb = channelCallbacksRef.current;
      const cur = gameRef.current;
      const pState = channel.presenceState<RoomPresencePayload>();
      const presentStudents = new Map<string, RoomPresencePayload>();

      for (const entries of Object.values(pState)) {
        if (!Array.isArray(entries)) continue;
        for (const item of entries) {
          if (!item || !item.id || item.role !== 'student') continue;
          presentStudents.set(item.id, item);
        }
      }

      if (cur.role === 'teacher' && hostRoomRef.current) {
        const room = hostRoomRef.current;
        let changed = false;

        for (const [sid, p] of presentStudents.entries()) {
          if (room.kickedIds.has(sid)) continue;
          let existing = room.students.get(sid);
          const cleanName = sanitizeName(p.name) || 'Pendaki';
          if (!existing) {
            const lowerName = cleanName.toLowerCase();
            for (const candidate of room.students.values()) {
              if (candidate.name.trim().toLowerCase() === lowerName) {
                existing = candidate;
                break;
              }
            }
          }
          const cleanAv = normalizeAvatarConfig(p.avatar, 'student');
          if (!existing) {
            room.students.set(sid, {
              id: sid,
              name: cleanName,
              avatar: cleanAv,
              currentCP: Math.min(25, Math.max(0, p.cp ?? 0)),
              completedCPs: [],
              score: p.score ?? 0,
              correctCount: p.pgCorrect ?? 0,
              wrongCount: 0,
              essayCorrect: p.isianCorrect ?? 0,
              essayWrong: 0,
              essayDone: Boolean(p.isianDone),
              fallCount: p.falls ?? 0,
              answers: [],
              essayAnswers: [],
              online: true,
              lastSeenAt: Date.now(),
              pose: {
                x: worldRef.current?.getCpPoint(0).x ?? CP_POINTS[0].x,
                y: worldRef.current?.getCpPoint(0).y ?? CP_POINTS[0].y,
                z: worldRef.current?.getCpPoint(0).z ?? CP_POINTS[0].z,
                yaw: 0,
                cp: p.cp ?? 0,
                state: 'idle',
              },
            });
            changed = true;
          } else {
            if (!existing.online) {
              existing.online = true;
              changed = true;
            }
            existing.lastSeenAt = Date.now();
            if (p.avatar && JSON.stringify(p.avatar) !== JSON.stringify(existing.avatar)) {
              existing.avatar = cleanAv;
              changed = true;
            }
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
            if (typeof p.isianCorrect === 'number' && p.isianCorrect > existing.essayCorrect) {
              existing.essayCorrect = p.isianCorrect;
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
          }
        }

        for (const [sid, stu] of room.students.entries()) {
          if (stu.online && !presentStudents.has(sid)) {
            if (Date.now() - stu.lastSeenAt > 10000) {
              stu.online = false;
              changed = true;
            }
          }
        }

        if (changed) {
          const snap = getHostParticipantsSnapshot(room.students);
          setParticipants(snap);
          sendRoomBroadcast(channelRef.current, {
            type: 'participants_update',
            participants: snap,
            status: room.status,
          });
          cb.scheduleTeacherRoomPersist();
        }
      } else if (cur.role === 'student') {
        setParticipants((prev) => {
          const byId = new Map(prev.map((item) => [item.id, item]));
          for (const [sid, p] of presentStudents.entries()) {
            const prevItem = byId.get(sid);
            const cleanAv = normalizeAvatarConfig(p.avatar, 'student');
            if (prevItem) {
              byId.set(sid, {
                ...prevItem,
                name: sanitizeName(p.name) || prevItem.name,
                avatar: cleanAv,
                currentCP: typeof p.cp === 'number' ? Math.max(prevItem.currentCP, p.cp) : prevItem.currentCP,
                score: typeof p.score === 'number' ? Math.max(prevItem.score, p.score) : prevItem.score,
                correctCount:
                  typeof p.pgCorrect === 'number'
                    ? Math.max(prevItem.correctCount, p.pgCorrect)
                    : prevItem.correctCount,
                essayCorrect:
                  typeof p.isianCorrect === 'number'
                    ? Math.max(prevItem.essayCorrect, p.isianCorrect)
                    : prevItem.essayCorrect,
                fallCount:
                  typeof p.falls === 'number' ? Math.max(prevItem.fallCount, p.falls) : prevItem.fallCount,
                essayDone: prevItem.essayDone || Boolean(p.isianDone),
                online: true,
              });
            } else {
              byId.set(sid, {
                id: sid,
                name: sanitizeName(p.name) || 'Pendaki',
                avatar: cleanAv,
                currentCP: Math.min(25, Math.max(0, p.cp ?? 0)),
                score: p.score ?? 0,
                correctCount: p.pgCorrect ?? 0,
                wrongCount: 0,
                essayCorrect: p.isianCorrect ?? 0,
                essayWrong: 0,
                essayDone: Boolean(p.isianDone),
                fallCount: p.falls ?? 0,
                online: true,
                finished: false,
              });
            }
          }
          return Array.from(byId.values());
        });
      }
    };

    const findStudentByIdOrName = (room: HostRoomState, id?: string, rawName?: string) => {
      if (id) {
        const byId = room.students.get(id);
        if (byId) return byId;
      }
      const normalized = sanitizeName(rawName || '').toLowerCase();
      if (normalized) {
        for (const stu of room.students.values()) {
          if (stu.name.trim().toLowerCase() === normalized) {
            return stu;
          }
        }
      }
      return undefined;
    };

    // Jalur 1: Supabase Broadcast instan (event: 'room_command')
    channel.on('broadcast', { event: 'room_command' }, ({ payload }) => {
      channelCallbacksRef.current.handleIncomingRoomCommand(payload as RoomCommandPayload, false);
    });

    // Jalur 2: Postgres Changes pada tabel rooms (anti-missed packet saat jaringan tersendat)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${code}`,
      },
      (payload) => {
        const cb = channelCallbacksRef.current;
        const cur = gameRef.current;
        if (cur.role !== 'student' || cur.sessionEnded) return;
        const newRow = (payload.new ?? null) as {
          selected_map?: MapThemeId;
          active_event?: RoomCommandPayload | null;
          config?: {
            status?: RoomStatus;
            paused?: boolean;
            sessionEnded?: boolean;
            endReason?: 'teacher' | 'timeout';
            remainingSec?: number;
            sessionEndsAt?: number | null;
            selected_map?: MapThemeId;
            settings?: RoomSettings;
            active_event?: RoomCommandPayload | null;
          } | null;
        } | null;
        if (!newRow) return;

        const incomingCmd = newRow.active_event ?? newRow.config?.active_event ?? null;
        if (incomingCmd) {
          cb.handleIncomingRoomCommand(incomingCmd, true);
        }

        const cfg = newRow.config;
        if (!cfg) return;
        const resolvedMap = newRow.selected_map || cfg.selected_map || cfg.settings?.selectedMap;
        if (cfg.settings) {
          cb.applyRoomSettings({
            ...cfg.settings,
            selectedMap: resolvedMap || cfg.settings.selectedMap || 'nusantara',
          });
        } else if (resolvedMap) {
          cb.applyRoomSettings({
            ...settingsRef.current,
            selectedMap: resolvedMap,
          });
        }
        if (cfg.status === 'started' && cur.roomStatus === 'waiting') {
          cb.activateExpeditionOnStudent(cfg.remainingSec, cfg.sessionEndsAt, cfg.settings);
        }
        if (typeof cfg.paused === 'boolean' && cfg.paused !== cur.paused) {
          cur.paused = cfg.paused;
          setPaused(cfg.paused);
        }
        if (cfg.sessionEnded && !cur.sessionEnded) {
          cb.applySessionEnded(cfg.endReason ?? 'teacher');
        }
      },
    );

    channel.on('broadcast', { event: 'trigger_disaster' }, ({ payload }) => {
      const data = payload as TriggerDisasterPayload | undefined;
      if (!data || typeof data !== 'object' || !data.type) return;
      const cur = gameRef.current;
      if (cur.role !== 'student') return;
      channelCallbacksRef.current.handleTeacherEvent(data.type, {
        durationMs: typeof data.duration === 'number' ? data.duration : 5000,
        timestamp: data.timestamp,
        count: data.count,
        offsets: data.offsets,
      });
    });

    channel.on('broadcast', { event: 'room_event' }, ({ payload }) => {
      const cb = channelCallbacksRef.current;
      const msg = payload as RoomBroadcastMessage;
      if (!msg || typeof msg !== 'object' || !msg.type) return;
      const cur = gameRef.current;
      const world = worldRef.current;

      // Posisi 3D hanya disimpan di useRef & diupdate ke Three.js agar tidak memicu re-render React
      if (msg.type === 'position_update' || msg.type === 'player_pose') {
        const rp = msg.payload;
        if (!rp || !rp.id || rp.id === cur.clientId) return;
        remotePlayersRef.current.set(rp.id, rp);
        cb.upsertRemotePlayer(rp);

        if (cur.role === 'teacher' && hostRoomRef.current && rp.role === 'student') {
          const room = hostRoomRef.current;
          if (!room.kickedIds.has(rp.id)) {
            const stu = findStudentByIdOrName(room, rp.id, rp.name);
            if (stu) {
              stu.online = true;
              stu.lastSeenAt = Date.now();
              stu.pose = rp.pose;
            }
          }
        }
        return;
      }

      if (msg.type === 'student_join') {
        if (cur.role !== 'teacher' || !hostRoomRef.current) return;
        const room = hostRoomRef.current;
        const studentId = msg.studentId;
        if (!studentId) return;
        if (room.kickedIds.has(studentId)) {
          sendRoomBroadcast(channelRef.current, {
            type: 'kicked',
            targetId: studentId,
            message: 'Anda telah dikeluarkan dari ruangan ini oleh Guru.',
          });
          return;
        }

        const cleanAvatar = normalizeAvatarConfig(msg.avatar, 'student');
        const cleanName = sanitizeName(msg.name) || 'Pendaki';
        let stu = findStudentByIdOrName(room, studentId, cleanName);
        if (stu) {
          if (stu.id !== studentId) {
            room.students.delete(stu.id);
            stu.id = studentId;
            room.students.set(studentId, stu);
          }
          stu.online = true;
          stu.lastSeenAt = Date.now();
          stu.name = cleanName;
          stu.avatar = cleanAvatar;
          if (msg.currentCP > stu.currentCP) stu.currentCP = Math.min(25, msg.currentCP);
          if (msg.score > stu.score) stu.score = msg.score;
          if (msg.correctCount > stu.correctCount) stu.correctCount = msg.correctCount;
          if (msg.wrongCount > stu.wrongCount) stu.wrongCount = msg.wrongCount;
          if (msg.essayCorrect > stu.essayCorrect) stu.essayCorrect = msg.essayCorrect;
          if (msg.essayWrong > stu.essayWrong) stu.essayWrong = msg.essayWrong;
          if (msg.fallCount > stu.fallCount) stu.fallCount = msg.fallCount;
          if (msg.completedCPs?.length > stu.completedCPs.length) stu.completedCPs = msg.completedCPs;
          if (msg.essayDone) stu.essayDone = true;
          stu.pose = msg.pose || stu.pose;
        } else {
          stu = {
            id: studentId,
            name: cleanName,
            avatar: cleanAvatar,
            currentCP: Math.min(25, Math.max(0, msg.currentCP || 0)),
            completedCPs: Array.isArray(msg.completedCPs) ? msg.completedCPs : [],
            score: msg.score || 0,
            correctCount: msg.correctCount || 0,
            wrongCount: msg.wrongCount || 0,
            essayCorrect: msg.essayCorrect || 0,
            essayWrong: msg.essayWrong || 0,
            essayDone: Boolean(msg.essayDone),
            fallCount: msg.fallCount || 0,
            answers: Array.isArray(msg.answers) ? msg.answers : [],
            essayAnswers: Array.isArray(msg.essayAnswers) ? msg.essayAnswers : [],
            online: true,
            lastSeenAt: Date.now(),
            pose: msg.pose || {
              x: worldRef.current?.getCpPoint(0).x ?? CP_POINTS[0].x,
              y: worldRef.current?.getCpPoint(0).y ?? CP_POINTS[0].y,
              z: worldRef.current?.getCpPoint(0).z ?? CP_POINTS[0].z,
              yaw: 0,
              cp: 0,
              state: 'idle',
            },
          };
          room.students.set(studentId, stu);
        }

        cb.upsertRemotePlayer({
          id: stu.id,
          role: 'student',
          name: stu.name,
          avatar: stu.avatar,
          currentCP: stu.currentCP,
          score: stu.score,
          pose: stu.pose,
        });
        const snap = getHostParticipantsSnapshot(room.students);
        setParticipants(snap);
        sendRoomBroadcast(channelRef.current, {
          type: 'participants_update',
          participants: snap,
          status: room.status,
        });
        sendRoomBroadcast(channelRef.current, { type: 'settings_updated', settings: room.settings });
        if (room.status === 'started' && room.sessionEndsAt) {
          sendRoomBroadcast(channelRef.current, {
            type: 'game_start',
            remainingSec: Math.max(0, Math.round(remainingSecRef.current)),
            sessionEndsAt: room.sessionEndsAt,
            settings: room.settings,
            participants: snap,
          });
        } else {
          sendRoomBroadcast(channelRef.current, {
            type: 'pause_updated',
            paused: room.paused,
            remainingSec: Math.max(0, Math.round(remainingSecRef.current)),
            status: room.status,
          });
        }
        cb.scheduleTeacherRoomPersist();
        return;
      }

      if (msg.type === 'player_progress' || msg.type === 'student_progress') {
        if (cur.role !== 'teacher' || !hostRoomRef.current) return;
        const room = hostRoomRef.current;
        const senderId = msg.type === 'player_progress' ? msg.playerId || msg.id : msg.id;
        if (!senderId || room.kickedIds.has(senderId)) return;

        const payloadName = msg.type === 'player_progress' ? msg.name : undefined;
        let stu = findStudentByIdOrName(room, senderId, payloadName);
        if (!stu) {
          const cachedRemote = remotePlayersRef.current.get(senderId);
          stu = {
            id: senderId,
            name: sanitizeName(payloadName || cachedRemote?.name || '') || 'Pendaki',
            avatar: cachedRemote?.avatar || { ...DEFAULT_STUDENT_AVATAR },
            currentCP: 0,
            completedCPs: [],
            score: 0,
            correctCount: 0,
            wrongCount: 0,
            essayCorrect: 0,
            essayWrong: 0,
            essayDone: false,
            fallCount: 0,
            answers: [],
            essayAnswers: [],
            online: true,
            lastSeenAt: Date.now(),
            pose: cachedRemote?.pose || {
              x: worldRef.current?.getCpPoint(0).x ?? CP_POINTS[0].x,
              y: worldRef.current?.getCpPoint(0).y ?? CP_POINTS[0].y,
              z: worldRef.current?.getCpPoint(0).z ?? CP_POINTS[0].z,
              yaw: 0,
              cp: 0,
              state: 'idle',
            },
          };
          room.students.set(stu.id, stu);
        }

        stu.lastSeenAt = Date.now();
        stu.online = true;

        if (msg.type === 'player_progress') {
          if (msg.name) stu.name = sanitizeName(msg.name) || stu.name;
          if (typeof msg.cp === 'number') {
            stu.currentCP = Math.min(25, Math.max(stu.currentCP, msg.cp));
          }
          if (typeof msg.pgCorrect === 'number') stu.correctCount = msg.pgCorrect;
          if (typeof msg.pgWrong === 'number') stu.wrongCount = msg.pgWrong;
          if (typeof msg.isianCorrect === 'number') stu.essayCorrect = msg.isianCorrect;
          if (typeof msg.isianWrong === 'number') stu.essayWrong = msg.isianWrong;
          if (typeof msg.isianDone === 'boolean') stu.essayDone = msg.isianDone;
          if (typeof msg.score === 'number') stu.score = msg.score;
          if (typeof msg.falls === 'number') stu.fallCount = msg.falls;
          if (Array.isArray(msg.completedCPs)) stu.completedCPs = msg.completedCPs;
        } else {
          if (typeof msg.currentCP === 'number') {
            stu.currentCP = Math.min(25, Math.max(stu.currentCP, msg.currentCP));
          }
          if (Array.isArray(msg.completedCPs)) stu.completedCPs = msg.completedCPs;
          if (typeof msg.score === 'number') stu.score = msg.score;
          if (typeof msg.correctCount === 'number') stu.correctCount = msg.correctCount;
          if (typeof msg.wrongCount === 'number') stu.wrongCount = msg.wrongCount;
          if (typeof msg.essayCorrect === 'number') stu.essayCorrect = msg.essayCorrect;
          if (typeof msg.essayWrong === 'number') stu.essayWrong = msg.essayWrong;
          if (typeof msg.essayDone === 'boolean') stu.essayDone = msg.essayDone;
          if (typeof msg.fallCount === 'number') stu.fallCount = msg.fallCount;
        }

        if (msg.newAnswer && !stu.answers.some((a) => a.cp === msg.newAnswer!.cp)) {
          stu.answers.push(msg.newAnswer);
        }
        if (msg.newEssayAnswer) {
          const idx = stu.essayAnswers.findIndex((e) => e.no === msg.newEssayAnswer!.no);
          if (idx >= 0) stu.essayAnswers[idx] = msg.newEssayAnswer;
          else stu.essayAnswers.push(msg.newEssayAnswer);
        }

        cb.upsertRemotePlayer({
          id: stu.id,
          role: 'student',
          name: stu.name,
          avatar: stu.avatar,
          currentCP: stu.currentCP,
          score: stu.score,
          pose: stu.pose,
        });
        const snap = getHostParticipantsSnapshot(room.students);
        setParticipants(snap);
        sendRoomBroadcast(channelRef.current, {
          type: 'participants_update',
          participants: snap,
          status: room.status,
        });
        cb.scheduleTeacherRoomPersist();
        return;
      }

      if (msg.type === 'update_avatar') {
        if (msg.id === cur.clientId) return;
        if (cur.role === 'teacher' && hostRoomRef.current) {
          const stu = hostRoomRef.current.students.get(msg.id);
          if (stu) {
            stu.avatar = normalizeAvatarConfig(msg.avatar, 'student');
            const snap = getHostParticipantsSnapshot(hostRoomRef.current.students);
            setParticipants(snap);
            sendRoomBroadcast(channelRef.current, {
              type: 'participants_update',
              participants: snap,
              status: hostRoomRef.current.status,
            });
          }
        }
        if (world) {
          const entry = world.remotePlayers.get(msg.id);
          if (entry) {
            entry.avatar = normalizeAvatarConfig(msg.avatar, entry.role);
            const pos = entry.mesh.position.clone();
            const rotY = entry.mesh.rotation.y;
            world.scene.remove(entry.mesh);
            disposeAvatarGroup(entry.mesh);
            const newMesh = world.createAvatarMesh(
              entry.avatar,
              entry.name,
              entry.role,
              entry.cp,
              entry.score,
              false,
            );
            newMesh.position.copy(pos);
            newMesh.rotation.y = rotY;
            world.scene.add(newMesh);
            entry.mesh = newMesh;
          }
        }
        return;
      }

      if (msg.type === 'player_emote') {
        if (world && msg.id !== cur.clientId) {
          const entry = world.remotePlayers.get(msg.id);
          if (entry) {
            entry.activeEmote = msg.emote;
            entry.emoteTimer = 3.2;
            world.showAvatarEmote(entry.mesh, entry.activeEmote);
          }
        }
        return;
      }

      // Student-targeted Teacher broadcasts
      if (cur.role !== 'student') return;

      switch (msg.type) {
        case 'game_start':
          cb.activateExpeditionOnStudent(
            msg.remainingSec,
            msg.sessionEndsAt,
            msg.settings,
            msg.participants,
          );
          break;

        case 'participants_update':
          setParticipants(msg.participants || []);
          if (msg.status === 'started' && cur.roomStatus === 'waiting') {
            cb.activateExpeditionOnStudent(undefined, null, undefined, msg.participants);
          }
          break;

        case 'settings_updated': {
          const prevWeather = world?.weather;
          const prevTime = world?.timeOfDay;
          cb.applyRoomSettings(msg.settings);
          if (msg.settings.weather && msg.settings.weather !== prevWeather) {
            if (msg.settings.weather === 'hujan') {
              soundRef.current?.playSlideWhoosh();
              cb.showWarning('HUJAN LEBAT TURUN! Hati-hati jalur pendakian licin!', 3.2);
            } else if (msg.settings.weather === 'berkabut') {
              cb.showWarning('KABUT TEBAL MENYELIMUTI GUNUNG! Jarak pandang terbatas!', 3.2);
            } else if (msg.settings.weather === 'badai') {
              cb.triggerLightningFlash();
              cb.showWarning('BADAI PETIR MELANDA GUNUNG WOWO!', 3.4);
            } else if (msg.settings.weather === 'salju') {
              cb.showWarning('HUJAN SALJU TURUN DI GUNUNG WOWO!', 3.2);
            } else if (msg.settings.weather === 'kiamat') {
              cb.triggerLightningFlash();
              cb.showWarning('CUACA KIAMAT DIAKTIFKAN GURU! Waspada hujan meteor!', 3.5);
            } else if (msg.settings.weather === 'cerah') {
              cb.showWarning('Cuaca gunung kembali cerah!', 2.5);
            }
          } else if (msg.settings.timeOfDay && msg.settings.timeOfDay !== prevTime) {
            cb.showWarning(`Waktu gunung diubah Guru menjadi ${msg.settings.timeOfDay.toUpperCase()}!`, 2.4);
          }
          break;
        }

        case 'questions_updated':
          setQuestionCount(
            Array.isArray(msg.questions) && msg.questions.length > 0 ? msg.questions.length : 25,
          );
          cur.studentDeck = buildStudentQuizDeck(msg.questions, cur.roomCode, cur.clientId);
          cb.showWarning('Bank soal PG diperbarui oleh Guru!', 2.5);
          break;

        case 'essay_questions_updated': {
          const list =
            Array.isArray(msg.essayQuestions) && msg.essayQuestions.length > 0
              ? msg.essayQuestions
              : DEFAULT_ESSAY_QUESTIONS;
          cur.essayQuestions = buildStudentEssayDeck(list, cur.roomCode, cur.clientId);
          setEssayQuestionCount(cur.essayQuestions.length);
          cb.showWarning('Soal Isian Singkat Puncak diperbarui oleh Guru!', 2.5);
          break;
        }

        case 'pause_updated':
          if (msg.status === 'started' && cur.roomStatus === 'waiting') {
            cb.activateExpeditionOnStudent(msg.remainingSec);
          }
          cur.paused = Boolean(msg.paused);
          setPaused(cur.paused);
          break;

        case 'timer_sync':
          if (msg.status === 'started' && cur.roomStatus === 'waiting') {
            cb.activateExpeditionOnStudent(msg.remainingSec);
          }
          if (typeof msg.paused === 'boolean') {
            cur.paused = msg.paused;
            setPaused(msg.paused);
          }
          break;

        case 'teacher_event':
          cb.handleTeacherEvent(msg.eventType, {
            durationMs: 5000,
            count: msg.count,
            offsets: msg.offsets,
          });
          break;

        case 'kicked':
          if (msg.targetId === cur.clientId) {
            cur.sessionEnded = true;
            cur.roomStatus = 'ended';
            setRoomStatus('ended');
            setShowClassLobby(false);
            setSessionEnded(true);
            cb.clearStudentSession(cur.roomCode);
            cleanupChannel();
            setKickedMessage(msg.message || 'Anda telah dikeluarkan dari kelas oleh Guru.');
          }
          break;

        case 'session_ended':
          cb.applySessionEnded(msg.reason, msg.leaderboard, msg.exportRows);
          break;
      }
    });

    channel.on('presence', { event: 'sync' }, syncPresenceParticipants);
    channel.on('presence', { event: 'join' }, syncPresenceParticipants);
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (Array.isArray(leftPresences)) {
        for (const item of leftPresences as Array<{ id?: string }>) {
          const leftId = item?.id;
          if (!leftId || leftId === gameRef.current.clientId) continue;
          remotePlayersRef.current.delete(leftId);
          channelCallbacksRef.current.removeRemotePlayer(leftId);
        }
      }
      syncPresenceParticipants();
    });

    channel.subscribe((status) => {
      const cb = channelCallbacksRef.current;
      if (status === 'SUBSCRIBED') {
        isChannelSubscribedRef.current = true;
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        const g = gameRef.current;
        joinedAtRef.current = Date.now();
        void channel
          .track({
            id: g.clientId,
            playerId: g.clientId,
            role: g.role,
            name: g.name,
            avatar: g.avatar,
            joinedAt: joinedAtRef.current,
            cp: g.currentCP,
            pgCorrect: g.correctCount,
            isianCorrect: g.essayCorrect,
            score: g.score,
            falls: g.fallCount,
            isianDone: g.essayDone,
          } satisfies RoomPresencePayload)
          .catch(() => {});
        if (g.role === 'student') {
          sendRoomBroadcast(channel, {
            type: 'student_join',
            studentId: g.clientId,
            name: g.name,
            avatar: g.avatar,
            currentCP: g.currentCP,
            completedCPs: g.completedCPs,
            score: g.score,
            correctCount: g.correctCount,
            wrongCount: g.wrongCount,
            essayCorrect: g.essayCorrect,
            essayWrong: g.essayWrong,
            essayDone: g.essayDone,
            fallCount: g.fallCount,
            answers: g.answers,
            essayAnswers: g.essayAnswers,
            pose: {
              x: Number(g.pos.x.toFixed(2)),
              y: Number(g.pos.y.toFixed(2)),
              z: Number(g.pos.z.toFixed(2)),
              yaw: Number(g.yaw.toFixed(2)),
              cp: g.currentCP,
              state: g.lastPoseState,
            },
          });
          if (pendingProgressSyncRef.current) {
            pendingProgressSyncRef.current = false;
            cb.emitStudentProgress();
          }
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
        isChannelSubscribedRef.current = false;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          cb.showWarning('Koneksi Supabase Realtime terganggu sementara, memulihkan...', 2.5);
        }
        const g = gameRef.current;
        if (!intentionalDisconnectRef.current && g.inGame && !g.sessionEnded && g.roomCode) {
          if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            const latest = gameRef.current;
            if (!intentionalDisconnectRef.current && latest.inGame && !latest.sessionEnded && latest.roomCode) {
              subscribeRoomChannel(latest.roomCode);
            }
          }, 2000);
        }
      }
    });
  }, [cleanupChannel]);

  // 4-second Lightweight Heartbeat + visibilitychange State Recovery (without page refresh)
  useEffect(() => {
    if (!inGame || sessionEnded || isStandaloneMode || !roomCode) return;

    const pullLatestRoomState = async () => {
      const g = gameRef.current;
      if (!g.inGame || g.sessionEnded || !g.roomCode) return;
      try {
        const rec = await fetchSupabaseRoomRecord(g.roomCode);
        const cfg = rec.config;
        const cb = channelCallbacksRef.current;
        if (rec.activeEvent) {
          cb.handleIncomingRoomCommand(rec.activeEvent, true);
        }
        if (g.role === 'student') {
          if (cfg.settings) {
            cb.applyRoomSettings(cfg.settings);
          }
          if (cfg.status === 'started' && g.roomStatus === 'waiting') {
            cb.activateExpeditionOnStudent(cfg.remainingSec, cfg.sessionEndsAt, cfg.settings);
          }
          if (typeof cfg.paused === 'boolean' && cfg.paused !== g.paused) {
            g.paused = cfg.paused;
            setPaused(cfg.paused);
          }
          if (cfg.sessionEnded && !g.sessionEnded) {
            cb.applySessionEnded(cfg.endReason ?? 'teacher');
          }
        }
      } catch {
        // ignore transient fetch errors
      }
    };

    const runHeartbeat = () => {
      const g = gameRef.current;
      if (!g.inGame || g.sessionEnded || intentionalDisconnectRef.current) return;
      const ch = channelRef.current;
      if (!ch || !isChannelSubscribedRef.current || ch.state !== 'joined') {
        if (!reconnectTimerRef.current && g.roomCode) {
          subscribeRoomChannel(g.roomCode);
        }
        return;
      }
      void ch
        .track({
          id: g.clientId,
          playerId: g.clientId,
          role: g.role,
          name: g.name,
          avatar: g.avatar,
          joinedAt: joinedAtRef.current,
          cp: g.currentCP,
          pgCorrect: g.correctCount,
          isianCorrect: g.essayCorrect,
          score: g.score,
          falls: g.fallCount,
          isianDone: g.essayDone,
        } satisfies RoomPresencePayload)
        .catch(() => {});

      if (g.role === 'student') {
        void pullLatestRoomState();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const g = gameRef.current;
      if (!g.inGame || g.sessionEnded || !g.roomCode) return;
      const ch = channelRef.current;
      if (!ch || !isChannelSubscribedRef.current || ch.state !== 'joined') {
        subscribeRoomChannel(g.roomCode);
      } else if (g.role === 'student') {
        channelCallbacksRef.current.emitStudentProgress();
      }
      void pullLatestRoomState();
    };

    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
    }
    heartbeatTimerRef.current = window.setInterval(runHeartbeat, 4000);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [inGame, isStandaloneMode, roomCode, sessionEnded, subscribeRoomChannel]);

  // Throttled 650ms Position Sync — only sends when player actually moved or changed state (safe for 40+ students)
  useEffect(() => {
    if (!inGame || sessionEnded || isStandaloneMode) return;

    const broadcastId = window.setInterval(() => {
      if (!channelRef.current || !isChannelSubscribedRef.current) return;
      const g = gameRef.current;
      const px = Number(g.pos.x.toFixed(2));
      const py = Number(g.pos.y.toFixed(2));
      const pz = Number(g.pos.z.toFixed(2));
      const pyaw = Number(g.yaw.toFixed(2));
      const poseState = g.lastPoseState;

      const prev = lastSentPoseRef.current;
      const movedOrChanged =
        !prev ||
        Math.abs(px - prev.x) > 0.04 ||
        Math.abs(py - prev.y) > 0.04 ||
        Math.abs(pz - prev.z) > 0.04 ||
        Math.abs(pyaw - prev.yaw) > 0.03 ||
        poseState !== prev.state ||
        g.currentCP !== prev.cp ||
        g.score !== prev.score;

      if (!movedOrChanged) return;

      lastSentPoseRef.current = {
        x: px,
        y: py,
        z: pz,
        yaw: pyaw,
        state: poseState,
        cp: g.currentCP,
        score: g.score,
      };

      const posePayload = {
        x: px,
        y: py,
        z: pz,
        yaw: pyaw,
        cp: g.currentCP,
        state: poseState,
      };

      if (g.role === 'teacher' && hostRoomRef.current) {
        hostRoomRef.current.teacherCP = g.currentCP;
        hostRoomRef.current.teacherAvatar = g.avatar;
        hostRoomRef.current.teacherPose = posePayload;
      }

      sendRoomBroadcast(channelRef.current, {
        type: 'position_update',
        payload: {
          id: g.clientId,
          role: g.role,
          name: g.name,
          avatar: g.avatar,
          currentCP: g.currentCP,
          score: g.score,
          pose: posePayload,
        },
      });
    }, 650);

    return () => window.clearInterval(broadcastId);
  }, [inGame, isStandaloneMode, sessionEnded]);

  // Teacher 3-Second Polling: Merge Presence + Supabase `rooms` Table so student scores never stay stuck at 0 pts
  useEffect(() => {
    if (!inGame || role !== 'teacher' || sessionEnded || isStandaloneMode || !roomCode) {
      return;
    }

    const syncTeacherRoster = async () => {
      const room = hostRoomRef.current;
      const channel = channelRef.current;
      if (!room || gameRef.current.role !== 'teacher') return;

      let changed = false;

      // 1. Read live Supabase Presence state
      if (channel) {
        const pState = channel.presenceState<RoomPresencePayload>();
        for (const entries of Object.values(pState)) {
          if (!Array.isArray(entries)) continue;
          for (const item of entries) {
            const sid = item?.playerId || item?.id;
            if (!sid || item.role !== 'student' || room.kickedIds.has(sid)) continue;

            const cleanName = sanitizeName(item.name) || 'Pendaki';
            let stu = room.students.get(sid);
            if (!stu) {
              const lower = cleanName.toLowerCase();
              for (const cand of room.students.values()) {
                if (cand.name.trim().toLowerCase() === lower) {
                  stu = cand;
                  break;
                }
              }
            }

            const cleanAv = normalizeAvatarConfig(item.avatar, 'student');
            if (!stu) {
              room.students.set(sid, {
                id: sid,
                name: cleanName,
                avatar: cleanAv,
                currentCP: Math.min(25, Math.max(0, item.cp ?? 0)),
                completedCPs: [],
                score: item.score ?? 0,
                correctCount: item.pgCorrect ?? 0,
                wrongCount: 0,
                essayCorrect: item.isianCorrect ?? 0,
                essayWrong: 0,
                essayDone: Boolean(item.isianDone),
                fallCount: item.falls ?? 0,
                answers: [],
                essayAnswers: [],
                online: true,
                lastSeenAt: Date.now(),
                pose: {
                  x: worldRef.current?.getCpPoint(0).x ?? CP_POINTS[0].x,
                  y: worldRef.current?.getCpPoint(0).y ?? CP_POINTS[0].y,
                  z: worldRef.current?.getCpPoint(0).z ?? CP_POINTS[0].z,
                  yaw: 0,
                  cp: item.cp ?? 0,
                  state: 'idle',
                },
              });
              changed = true;
            } else {
              if (!stu.online) {
                stu.online = true;
                changed = true;
              }
              stu.lastSeenAt = Date.now();
              if (typeof item.cp === 'number' && item.cp > stu.currentCP) {
                stu.currentCP = Math.min(25, item.cp);
                changed = true;
              }
              if (typeof item.score === 'number' && item.score > stu.score) {
                stu.score = item.score;
                changed = true;
              }
              if (typeof item.pgCorrect === 'number' && item.pgCorrect > stu.correctCount) {
                stu.correctCount = item.pgCorrect;
                changed = true;
              }
              if (typeof item.isianCorrect === 'number' && item.isianCorrect > stu.essayCorrect) {
                stu.essayCorrect = item.isianCorrect;
                changed = true;
              }
              if (typeof item.falls === 'number' && item.falls > stu.fallCount) {
                stu.fallCount = item.falls;
                changed = true;
              }
              if (item.isianDone && !stu.essayDone) {
                stu.essayDone = true;
                changed = true;
              }
            }
          }
        }
      }

      // 2. Poll Supabase `rooms` row every 3s and merge persisted student progress
      try {
        const { config: cfg, players: topPlayers } = await fetchSupabaseRoomRecord(roomCode);
        if (mergeConfigStudentsIntoHostRoom(room, cfg, topPlayers)) {
          changed = true;
        }
      } catch {
        // ignore transient poll errors
      }

      if (changed) {
        for (const stu of room.students.values()) {
          upsertRemotePlayer({
            id: stu.id,
            role: 'student',
            name: stu.name,
            avatar: stu.avatar,
            currentCP: stu.currentCP,
            score: stu.score,
            pose: stu.pose,
          });
        }
        const snap = getHostParticipantsSnapshot(room.students);
        setParticipants(snap);
        sendRoomBroadcast(channelRef.current, {
          type: 'participants_update',
          participants: snap,
          status: room.status,
        });
        scheduleTeacherRoomPersist();
      }
    };

    const pollId = window.setInterval(() => {
      void syncTeacherRoster();
    }, 3000);
    return () => window.clearInterval(pollId);
  }, [inGame, isStandaloneMode, role, roomCode, scheduleTeacherRoomPersist, sessionEnded, upsertRemotePlayer]);

  // Fallback Safety Poll while Student is in Waiting Lobby (in case a broadcast packet was missed)
  useEffect(() => {
    if (!inGame || role !== 'student' || roomStatus !== 'waiting' || isStandaloneMode || !roomCode) {
      return;
    }
    const pollId = window.setInterval(async () => {
      try {
        const cfg = await fetchSupabaseRoomConfig(roomCode);
        if (cfg.sessionEnded) {
          applySessionEnded(cfg.endReason || 'teacher');
        } else if (cfg.status === 'started') {
          activateExpeditionOnStudent(cfg.remainingSec, cfg.sessionEndsAt, cfg.settings);
        }
      } catch {
        // ignore transient poll errors
      }
    }, 4500);
    return () => window.clearInterval(pollId);
  }, [activateExpeditionOnStudent, applySessionEnded, inGame, isStandaloneMode, role, roomCode, roomStatus]);

  // Authoritative Session Countdown Timer (Runs only after Guru starts Expedition!)
  useEffect(() => {
    if (!inGame || roomStatus !== 'started' || paused || sessionEnded) return;

    const intervalId = window.setInterval(() => {
      const next = Math.max(0, remainingSecRef.current - 1);
      remainingSecRef.current = next;
      setRemainingSec(next);

      if (gameRef.current.role === 'teacher') {
        const room = hostRoomRef.current;
        if (room) {
          room.remainingSec = next;
          if (next % 5 === 0 || next <= 10) {
            sendRoomBroadcast(channelRef.current, {
              type: 'timer_sync',
              remainingSec: next,
              sessionDurationMinutes: room.settings.sessionDurationMinutes,
              paused: false,
              status: room.status,
            });
          }
          if (next <= 0) {
            room.status = 'ended';
            room.sessionEnded = true;
            room.paused = true;
            room.endReason = 'timeout';
            const leaderboardSnap = getHostParticipantsSnapshot(room.students);
            const exportSnap = getHostExportRows(room.students);
            sendRoomBroadcast(channelRef.current, {
              type: 'session_ended',
              reason: 'timeout',
              leaderboard: leaderboardSnap,
              exportRows: exportSnap,
            });
            void upsertSupabaseRoom(room.code, buildSupabaseRoomConfig(room)).catch(() => {});
            applySessionEnded('timeout', leaderboardSnap, exportSnap);
          }
        }
      } else if (next <= 0 && !timeoutFallbackRef.current) {
        timeoutFallbackRef.current = window.setTimeout(() => {
          timeoutFallbackRef.current = null;
          if (!gameRef.current.sessionEnded) {
            applySessionEnded('timeout');
          }
        }, 1500);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [applySessionEnded, inGame, paused, roomStatus, sessionEnded]);

  // --- Mount Three.js World & Continuous Game Loop Once ---
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const sound = new SoundEngine();
    soundRef.current = sound;
    const world = new MountainWorld(mountEl);
    worldRef.current = world;

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = world.renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (st === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = now / 1000;
      const g = gameRef.current;

      if (g.inGame) {
        if (g.activeQuiz && !g.paused && !g.sessionEnded) {
          if (!g.activeQuiz.answered) {
            g.activeQuiz.timeLeft -= dt;
            if (g.activeQuiz.timeLeft <= 0) {
              g.activeQuiz.timeLeft = 0;
              submitQuizAnswer('');
            } else if (now - g.lastQuizUiSync > 120) {
              g.lastQuizUiSync = now;
              setActiveQuiz({ ...g.activeQuiz });
            }
          } else {
            g.activeQuiz.explainTimeLeft -= dt;
            if (g.activeQuiz.explainTimeLeft <= 0) {
              g.activeQuiz.explainTimeLeft = 0;
              finishActiveQuiz();
            } else if (now - g.lastQuizUiSync > 120) {
              g.lastQuizUiSync = now;
              setActiveQuiz({ ...g.activeQuiz });
            }
          }
        }

        if (g.essayActive && g.essayFeedbackOpen && !g.paused && !g.sessionEnded) {
          g.essayExplainLeft -= dt;
          if (g.essayExplainLeft <= 0) {
            g.essayExplainLeft = 0;
            advanceSummitEssay();
          } else if (now - g.lastEssayUiSync > 120) {
            g.lastEssayUiSync = now;
            const leftSnap = Math.max(0, g.essayExplainLeft);
            setActiveEssayModal((prev) => (prev ? { ...prev, explainTimeLeft: leftSnap } : null));
          }
        }

        // Emote & Hurt Timers Decay
        if (g.emoteTimer > 0) {
          g.emoteTimer -= dt;
          if (g.emoteTimer <= 0) {
            g.emoteTimer = 0;
            g.activeEmote = null;
            world.hideAvatarEmote(g.playerMesh);
          }
        }
        if (g.hurtTimer > 0) {
          g.hurtTimer = Math.max(0, g.hurtTimer - dt);
        }
        if (g.chillSlowTimer > 0) {
          g.chillSlowTimer = Math.max(0, g.chillSlowTimer - dt);
        }

        let isMoving = false;
        let spectatedEntry = spectatingIdRef.current
          ? world.remotePlayers.get(spectatingIdRef.current)
          : undefined;
        if (spectatingIdRef.current && !spectatedEntry) {
          spectatingIdRef.current = null;
          setSpectatingTargetName(null);
        }
        const canMoveCamera =
          !g.activeQuiz &&
          !g.essayActive &&
          !g.sessionEnded &&
          !g.photoPreviewOpen &&
          ((!g.paused && (g.role === 'teacher' || g.roomStatus === 'started')) || g.photoMode);
        if (canMoveCamera) {
          // Camera controls: Arrow keys + Q/E (works during normal play, peer spectate & Photo Mode)
          if (g.keys['ArrowLeft'] || g.keys['KeyQ']) g.camYaw += 2.0 * dt;
          if (g.keys['ArrowRight'] || g.keys['KeyE']) g.camYaw -= 2.0 * dt;
          if (g.keys['ArrowUp']) g.camPitch = Math.min(1.12, g.camPitch + 1.35 * dt);
          if (g.keys['ArrowDown']) g.camPitch = Math.max(0.06, g.camPitch - 1.35 * dt);
        }
        const canControlAvatar =
          !g.paused &&
          !g.activeQuiz &&
          !g.essayActive &&
          !g.sessionEnded &&
          !g.photoPreviewOpen &&
          (g.role === 'teacher' || g.roomStatus === 'started') &&
          !spectatedEntry;
        if (canControlAvatar) {

          // Character movement: WASD + mobile virtual joystick
          let moveForward =
            (g.keys['KeyW'] ? 1 : 0) -
            (g.keys['KeyS'] ? 1 : 0) -
            g.joyVec.y;
          let moveRight =
            (g.keys['KeyD'] ? 1 : 0) -
            (g.keys['KeyA'] ? 1 : 0) +
            g.joyVec.x;

          const mag = Math.hypot(moveForward, moveRight);
          if (mag > 1) {
            moveForward /= mag;
            moveRight /= mag;
          }
          isMoving = mag > 0.08;

          if (g.role === 'teacher' && g.flyMode) {
            g.locomotionMode = 'walk';
            g.onGround = false;
            const maxFlySpeed = 48.0 * 1.8;
            const sinY = Math.sin(g.camYaw);
            const cosY = Math.cos(g.camYaw);
            const dirX = -sinY * moveForward + cosY * moveRight;
            const dirZ = -cosY * moveForward - sinY * moveRight;

            const targetVx = isMoving ? dirX * maxFlySpeed : 0;
            const targetVz = isMoving ? dirZ * maxFlySpeed : 0;
            const flyAlpha = 1 - Math.exp(-12.0 * dt);
            g.vel.x += (targetVx - g.vel.x) * flyAlpha;
            g.vel.z += (targetVz - g.vel.z) * flyAlpha;
            if (!isMoving && Math.hypot(g.vel.x, g.vel.z) < 0.08) {
              g.vel.x = 0;
              g.vel.z = 0;
            }

            const keyUp = Boolean(g.keys['Space']) || g.flyVerticalDir === 1;
            const keyDown =
              Boolean(g.keys['ShiftLeft'] || g.keys['ShiftRight'] || g.keys['KeyC']) ||
              g.flyVerticalDir === -1;
            const vertDir = (keyUp ? 1 : 0) - (keyDown ? 1 : 0);
            const targetVy = vertDir * 44.0;
            g.vel.y += (targetVy - g.vel.y) * flyAlpha;
            if (vertDir === 0 && Math.abs(g.vel.y) < 0.08) {
              g.vel.y = 0;
            }

            g.pos.x = Math.max(-1420, Math.min(1420, g.pos.x + g.vel.x * dt));
            g.pos.z = Math.max(-1420, Math.min(1420, g.pos.z + g.vel.z * dt));
            g.pos.y = Math.max(-25, Math.min(760, g.pos.y + g.vel.y * dt));

            if (isMoving) {
              const targetYaw = Math.atan2(dirX, dirZ);
              const diffYaw = ((targetYaw - g.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
              g.yaw += diffYaw * (1 - Math.exp(-11.5 * dt));
            }
            const horizSpeed = Math.hypot(g.vel.x, g.vel.z);
            if (horizSpeed > 0.5) {
              g.walkAnimTime += dt * Math.min(8.5, horizSpeed * 0.16);
            }
          } else {
            const ladderRes = world.handleLadderMovement(g.pos, moveForward, dt);
            if (ladderRes.climbing) {
              g.locomotionMode = 'climb';
              g.vel.y = 0;
              g.onGround = false;
              g.walkAnimTime += dt * 10.5;
              if (now - g.lastLadderSoundAt > 260) {
                g.lastLadderSoundAt = now;
                sound.playLadderClimb();
              }
            } else {
              const slideRes = world.handleSlideMovement(g.pos, dt, sound);
              if (slideRes.sliding) {
                g.locomotionMode = 'slide';
                g.yaw = slideRes.yaw;
                g.vel.y = 0;
                g.onGround = true;
              } else {
                g.locomotionMode = 'walk';
                const isFrostSlowed =
                  g.role === 'student' && (g.chillSlowTimer > 0 || world.isFrostSlowActive());
                const chillMult = isFrostSlowed ? 0.55 : 1.0;
                const maxWalkSpeed = (g.role === 'teacher' ? 48.0 : 13.7) * chillMult;
                const sinY = Math.sin(g.camYaw);
                const cosY = Math.cos(g.camYaw);
                const dirX = -sinY * moveForward + cosY * moveRight;
                const dirZ = -cosY * moveForward - sinY * moveRight;

                const targetVx = isMoving ? dirX * maxWalkSpeed : 0;
                const targetVz = isMoving ? dirZ * maxWalkSpeed : 0;
                const onIce = g.onGround && world.isOnIceBridge(g.pos.x, g.pos.z, g.pos.y);
                const accelRate = g.onGround
                  ? onIce
                    ? isMoving
                      ? 6.2
                      : 2.8
                    : isMoving
                      ? 15.5
                      : 19.5
                  : isMoving
                    ? 7.5
                    : 3.5;
                const velAlpha = 1 - Math.exp(-accelRate * dt);
                g.vel.x += (targetVx - g.vel.x) * velAlpha;
                g.vel.z += (targetVz - g.vel.z) * velAlpha;
                if (!isMoving && Math.hypot(g.vel.x, g.vel.z) < 0.08) {
                  g.vel.x = 0;
                  g.vel.z = 0;
                }

                const horizSpeed = Math.hypot(g.vel.x, g.vel.z);
                if (isMoving) {
                  const targetYaw = Math.atan2(dirX, dirZ);
                  const diffYaw = ((targetYaw - g.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                  g.yaw += diffYaw * (1 - Math.exp(-11.5 * dt));
                }
                if (horizSpeed > 0.45) {
                  const strideRate =
                    g.role === 'teacher' ? Math.min(11.5, horizSpeed * 0.28) : horizSpeed * 0.44;
                  g.walkAnimTime += dt * strideRate;
                  const beat = Math.floor(g.walkAnimTime / Math.PI);
                  if (g.onGround && beat !== g.lastStepBeat) {
                    g.lastStepBeat = beat;
                    sound.playFootstep(world.getSurfaceTypeAt(g.pos.x, g.pos.z));
                  }
                }

                const subSteps = Math.min(4, Math.max(1, Math.ceil(dt / (1 / 60))));
                const subDt = dt / subSteps;
                const wasOnGroundBeforeStep = g.onGround;
                let landedImpactVy = 0;

                for (let s = 0; s < subSteps; s++) {
                  const prevX = g.pos.x;
                  const prevZ = g.pos.z;

                  g.pos.x = Math.max(-2200, Math.min(2200, g.pos.x + g.vel.x * subDt));
                  g.pos.z = Math.max(-2200, Math.min(2200, g.pos.z + g.vel.z * subDt));

                  if (g.role === 'student') {
                    world.applyWindPush(g.pos, subDt, g.paused);
                    world.applySlipperySlopeAndPerimeter(g.pos, subDt, g.role);
                  }

                  world.resolveHorizontalCollisions(
                    g.pos,
                    0.55,
                    g.role,
                    g.currentCP,
                    g.completedCPs,
                  );

                  const stepDist = Math.hypot(g.pos.x - prevX, g.pos.z - prevZ);
                  if (g.role === 'student' && g.onGround && stepDist > 0.005) {
                    const candidateGroundY = world.getGroundHeight(g.pos.x, g.pos.z, g.pos.y);
                    const rise = candidateGroundY - g.pos.y;
                    if (rise > 1.45 && rise / Math.max(0.05, stepDist) > 1.85) {
                      g.pos.x = prevX;
                      g.pos.z = prevZ;
                    }
                  }

                  if (g.role === 'student') {
                    const antiCheat = world.enforceStudentTrailAndGates(
                      g.pos,
                      g.currentCP,
                      g.completedCPs,
                    );
                    if (antiCheat.skippedAheadCp !== null) {
                      const safeCP = world.getCpPoint(Math.min(25, Math.max(0, g.currentCP)));
                      g.pos.set(safeCP.x, world.getGroundHeight(safeCP.x, safeCP.z), safeCP.z);
                      g.vel.set(0, 0, 0);
                      g.onGround = true;
                      showWarning('Selesaikan Checkpoint sebelumnya terlebih dahulu!', 3.0);
                      break;
                    } else if (antiCheat.blockedByGateCp !== null && now - g.lastGateWarnAt > 2000) {
                      g.lastGateWarnAt = now;
                      showWarning(
                        antiCheat.blockedByGateCp === 25
                          ? 'Jawab kuis CP 25 terlebih dahulu untuk membuka Gerbang Ujian Akhir!'
                          : `Jawab kuis CP ${antiCheat.blockedByGateCp} untuk membuka gerbang!`,
                        2.5,
                      );
                    }
                    world.resolveHorizontalCollisions(
                      g.pos,
                      0.55,
                      g.role,
                      g.currentCP,
                      g.completedCPs,
                    );
                  }

                  const wasOnGroundSub = g.onGround;
                  const prevVy = g.vel.y;
                  g.vel.y -= 28.5 * subDt;
                  g.pos.y += g.vel.y * subDt;
                  const groundY = world.getGroundHeight(g.pos.x, g.pos.z, g.pos.y);
                  if (g.pos.y <= groundY) {
                    g.pos.y = groundY;
                    g.vel.y = 0;
                    g.onGround = true;
                    if (!wasOnGroundSub && prevVy < -3.5) {
                      landedImpactVy = Math.min(landedImpactVy, prevVy);
                    }
                  } else if (wasOnGroundSub && g.vel.y <= 0 && g.pos.y - groundY < 0.24) {
                    g.pos.y = groundY;
                    g.vel.y = 0;
                    g.onGround = true;
                  } else {
                    g.onGround = false;
                  }
                }

                if (!wasOnGroundBeforeStep && g.onGround && landedImpactVy < -3.5) {
                  sound.playLand(
                    world.getSurfaceTypeAt(g.pos.x, g.pos.z),
                    Math.min(1.4, Math.abs(landedImpactVy) / 14),
                  );
                }
              }
            }
          }

          if (g.locomotionMode !== 'walk' && g.role === 'student') {
            const antiCheat = world.enforceStudentTrailAndGates(
              g.pos,
              g.currentCP,
              g.completedCPs,
            );
            if (antiCheat.skippedAheadCp !== null) {
              const safeCP = world.getCpPoint(Math.min(25, Math.max(0, g.currentCP)));
              g.pos.set(safeCP.x, world.getGroundHeight(safeCP.x, safeCP.z), safeCP.z);
              g.vel.set(0, 0, 0);
              g.onGround = true;
              showWarning('Selesaikan Checkpoint sebelumnya terlebih dahulu!', 3.0);
            } else if (antiCheat.blockedByGateCp !== null && now - g.lastGateWarnAt > 2000) {
              g.lastGateWarnAt = now;
              showWarning(
                antiCheat.blockedByGateCp === 25
                  ? 'Jawab kuis CP 25 terlebih dahulu untuk membuka Gerbang Ujian Akhir!'
                  : `Jawab kuis CP ${antiCheat.blockedByGateCp} untuk membuka gerbang!`,
                2.5,
              );
            }
          }

          if (g.role === 'student') {
            if (g.onGround) {
              const laneMode = world.getBridgeLaneAt(g.pos.x, g.pos.z, g.pos.y);
              if (laneMode === 'safe') {
                g.bridgeAttemptMode = 'safe';
              } else if (laneMode === 'challenge' && g.bridgeAttemptMode === 'none') {
                g.bridgeAttemptMode = 'challenge';
              }
            }
            const tr = world.getNearestTrailInfo(g.pos.x, g.pos.z);
            const groundBelow = world.getGroundHeight(g.pos.x, g.pos.z, g.pos.y);
            const isTerrestrialFloor =
              world.selectedMap === 'lava' ||
              world.selectedMap === 'salju';
            if (
              (groundBelow < -100 &&
                (g.pos.y < tr.y - 10.5 || g.pos.y < -18 || (isTerrestrialFloor && g.pos.y <= 0.25))) ||
              g.pos.y < -30
            ) {
              triggerStudentFall(
                world.selectedMap === 'lava'
                  ? 'Terjatuh ke lahar kawah vulkanik! Kembali ke titik aman.'
                  : world.selectedMap === 'salju'
                    ? 'Terjatuh ke jurang gletser Everest! Kembali ke titik aman.'
                    : world.selectedMap === 'nusantara'
                      ? 'Terjatuh dari jalur pulau Nusantara! Kembali ke titik aman.'
                      : 'Terjatuh ke jurang jalur gunung! Kembali ke titik aman.',
              );
            } else {
              const nextCP = g.currentCP + 1;
              if (nextCP <= 25 && !g.completedCPs.includes(nextCP)) {
                const cp = world.getCpPoint(nextCP);
                if (
                  Math.hypot(g.pos.x - cp.x, g.pos.z - cp.z) < 8.0 &&
                  Math.abs(g.pos.y - cp.y) < 6.5
                ) {
                  openCheckpointQuiz(nextCP);
                }
              } else if (
                g.currentCP === 25 &&
                g.completedCPs.includes(25) &&
                !g.essayDone &&
                !g.essayActive
              ) {
                const summitPt = world.getSummitPoint();
                if (
                  Math.hypot(g.pos.x - summitPt.x, g.pos.z - summitPt.z) < 9.5 &&
                  Math.abs(g.pos.y - summitPt.y) < 8.0
                ) {
                  openSummitEssay();
                }
              }
            }
          }

          // Storm / Kiamat Lightning & Meteor Showers, Automatic Landslides, Earthquakes, Wildfires & Ghosts
          if (world.weather === 'badai' || world.weather === 'kiamat') {
            g.nextThunderIn -= dt;
            if (g.nextThunderIn <= 0) {
              triggerLightningFlash();
              if (g.role === 'student' && !world.isInsideAnyCheckpointSafeZone(g.pos.x, g.pos.z)) {
                world.spawnLightningStrikeAhead(g.pos.x, g.pos.z);
              }
              g.nextThunderIn =
                world.weather === 'kiamat' ? 5.5 + Math.random() * 6.5 : 7 + Math.random() * 9;
            }
          }

          if (
            world.weather === 'kiamat' &&
            g.role === 'student' &&
            !world.isInsideAnyCheckpointSafeZone(g.pos.x, g.pos.z)
          ) {
            g.nextMeteorIn -= dt;
            if (g.nextMeteorIn <= 0) {
              g.nextMeteorIn = 5.5 + Math.random() * 4.5;
              showWarning('CUACA KIAMAT! Hujan Meteor Api jatuh di jalur depan!', 2.8);
              world.spawnMeteorAhead(g.pos.x, g.pos.z);
            }
          }

          if (g.role === 'student' && !world.isInsideAnyCheckpointSafeZone(g.pos.x, g.pos.z)) {
            const lvl = DIFFICULTY_LEVELS[world.difficultyLevel] || DIFFICULTY_LEVELS[3];
            g.nextHailIn -= dt * lvl.rockRate;
            if (g.nextHailIn <= 0) {
              g.nextHailIn = 18 + Math.random() * 8;
              showWarning('WASPADA BADAI HUJAN ES & ANGIN BEKU!', 3.4);
              sound.playIceHail();
              world.spawnIceHailAhead(g.pos.x, g.pos.z, 50, 5.0);
            }

            g.nextFireRainIn -= dt * lvl.rockRate;
            if (g.nextFireRainIn <= 0) {
              g.nextFireRainIn = 30 + Math.random() * 14;
              showWarning('WASPADA HUJAN API & BARA LANGIT!', 3.5);
              sound.playWildfireCrackle();
              world.spawnFireRainAhead(g.pos.x, g.pos.z, 50, 5.0);
            }

            if (world.difficultyLevel >= 4) {
              g.nextQuakeIn -= dt * lvl.rockRate;
              if (g.nextQuakeIn <= 0) {
                g.nextQuakeIn = 34 + Math.random() * 14;
                showWarning('GEMPA BUMI GUNUNG WOWO!', 5.0);
                sound.playEarthquake(5.0);
                world.triggerEarthquake(g.pos.x, g.pos.z, 5.0);
              }
            }

            const darkBoost =
              world.weather === 'berkabut' ||
              world.timeOfDay === 'sore' ||
              world.timeOfDay === 'malam'
                ? 1.5
                : 1.0;
            g.nextGhostIn -= dt * lvl.ghostRate * darkBoost;
            if (g.nextGhostIn <= 0) {
              g.nextGhostIn = 15 + Math.random() * 7;
              const ahead = world.getTrailPointAhead(g.pos.x, g.pos.z, 17);
              if (Math.random() < 0.52) {
                sound.playKuntilanakLaugh();
                world.spawnKuntilanak(ahead.x, ahead.z, 5.0);
              } else {
                world.spawnPocong(ahead.x, ahead.z, ahead.tx, ahead.tz, 5.0);
              }
            }
          }
        }

        const localPoseState =
          g.hurtTimer > 0
            ? 'hurt'
            : g.locomotionMode === 'climb'
              ? 'climb'
              : g.locomotionMode === 'slide'
                ? 'slide'
                : !g.onGround
                  ? 'jump'
                  : isMoving
                    ? 'walk'
                    : 'idle';
        g.lastPoseState = localPoseState;

        // Update Local Avatar Transform & Pose (Walk / Jump / Climb / Slide / Emote / Hurt)
        if (g.playerMesh) {
          g.playerMesh.position.copy(g.pos);
          g.playerMesh.rotation.y = g.yaw;
          world.updateAvatarBlobShadow(g.playerMesh, g.pos);
          world.animateAvatarPose(
            g.playerMesh,
            isMoving,
            g.onGround,
            g.walkAnimTime,
            g.activeEmote,
            elapsed,
            localPoseState,
          );
        }

        // Smoothly Interpolate Remote Players & Emotes
        const remoteAlpha = 1 - Math.exp(-8.5 * dt);
        for (const rp of world.remotePlayers.values()) {
          const prevDist = rp.mesh.position.distanceTo(rp.targetPos);
          rp.mesh.position.lerp(rp.targetPos, remoteAlpha);
          const diffYaw = ((rp.targetYaw - rp.mesh.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          rp.mesh.rotation.y += diffYaw * remoteAlpha;
          world.updateAvatarBlobShadow(rp.mesh, rp.mesh.position);
          const movingRemote = prevDist > 0.04;
          if (movingRemote) rp.walkPhase += dt * 8.4;
          if (rp.emoteTimer > 0) {
            rp.emoteTimer -= dt;
            if (rp.emoteTimer <= 0) {
              rp.emoteTimer = 0;
              rp.activeEmote = null;
              world.hideAvatarEmote(rp.mesh);
            }
          }
          world.animateAvatarPose(
            rp.mesh,
            movingRemote,
            true,
            rp.walkPhase,
            rp.activeEmote,
            elapsed,
            rp.poseState || (movingRemote ? 'walk' : 'idle'),
          );
        }

        // Update World Visuals, Wildlife, Ghosts & Hazard Collisions
        const { hitBy, hitIceHail, shakeIntensity, pushImpulse } = world.updateVisuals(
          dt,
          elapsed,
          g.pos,
          sound,
          g.paused,
          g.role === 'teacher' && g.flyMode,
        );
        if (hitIceHail && g.role === 'student' && !g.paused && !g.activeQuiz && !g.essayActive && !g.sessionEnded) {
          g.chillSlowTimer = 4.0;
          if (now - g.lastChillWarnAt > 2500) {
            g.lastChillWarnAt = now;
            showWarning('WASPADA BADAI HUJAN ES & ANGIN BEKU! Gerakan melambat!', 2.6);
            sound.playIceHail();
          }
        }
        if (hitBy && g.role === 'student' && !g.paused && !g.activeQuiz && !g.essayActive && !g.sessionEnded) {
          if (hitBy === 'brainrot') {
            g.hurtTimer = 0.45;
            g.vel.y = 6.5;
            g.vel.x = -Math.sin(g.yaw) * 8.5;
            g.vel.z = -Math.cos(g.yaw) * 8.5;
            g.onGround = false;
            sound.playBrainrotSound();
            showWarning('TERTABRAK MEME BRAINROT! Tetap fokus mendaki!', 2.2);
          } else if (hitBy === 'yeti') {
            g.hurtTimer = 0.48;
            const impX = pushImpulse?.x ?? -Math.sin(g.yaw) * 14.5;
            const impZ = pushImpulse?.z ?? -Math.cos(g.yaw) * 14.5;
            g.vel.x = impX;
            g.vel.z = impZ;
            g.vel.y = 6.2;
            g.onGround = false;
            sound.playYetiRoar();
            showWarning('TERTABRAK MONSTER SALJU (YETI)! Tetap fokus dan jaga keseimbangan!', 2.4);
          } else if (hitBy === 'bridge_push' || hitBy === 'bridge_boulder') {
            g.hurtTimer = 0.42;
            const impX = pushImpulse?.x ?? -Math.sin(g.yaw) * 14;
            const impZ = pushImpulse?.z ?? -Math.cos(g.yaw) * 14;
            g.vel.x = impX;
            g.vel.z = impZ;
            g.vel.y = 5.2;
            g.onGround = false;
            sound.playQuizResult(false);
            showWarning(
              hitBy === 'bridge_push'
                ? 'TERDORONG BALOK AYUNAN JEMBATAN! Jaga keseimbangan!'
                : 'TERTABRAK BATU RINTANGAN JEMBATAN! Lompat untuk menghindar!',
              2.2,
            );
          } else {
            g.hurtTimer = 0.55;
            const messages: Record<string, string> = {
              kuntilanak: 'Terkena Kuntilanak! Kembali ke titik aman.',
              pocong: 'Tertabrak Pocong dan terdorong jatuh dari tebing!',
              landslide: 'Terkena rintangan bongkahan batu gunung! Kembali ke titik aman.',
              log: 'Terhantam rintangan jalur gunung! Kembali ke titik aman.',
              tiger: 'Diterjang Harimau Sumatera! Kembali ke titik aman.',
              bear: 'Diseruduk Beruang Madu! Kembali ke titik aman.',
              boar: 'Ditabrak Babi Hutan di jalur setapak!',
              snake: 'Dipatuk Ular Piton di tikungan berbatu!',
              bridge_plank: 'Terpeleset papan jembatan goyang!',
              crumble_stone: 'Batu pijakan runtuh di bawah kaki!',
              geyser: 'Tersembur uap panas Geyser Vulkanik!',
              lightning: 'Tersambar petir badai di jalur pendakian!',
              wildfire: 'Terkena bola Hujan Api & bara langit! Kembali ke titik aman.',
              fire_rain: 'Terkena bola Hujan Api dari langit gunung! Kembali ke titik aman.',
              meteor: 'Dihantam meteor api dari langit kiamat! Kembali ke titik aman.',
              lava_rain: 'Terkena jatuhan Hujan Lava pijar! Kembali ke titik aman.',
              flood:
                world.selectedMap === 'lava'
                  ? 'Tersapu naiknya Banjir Lava kaldera! Kembali ke titik aman.'
                  : 'Terseret arus Banjir Bandang! Kembali ke titik aman.',
            };
            triggerStudentFall(messages[hitBy] || 'Terkena rintangan gunung! Kembali ke titik aman.');
          }
        }

        // Smooth Third-Person Chase Camera (+ Peer Spectate Mode & Earthquake/Landslide Shake)
        spectatedEntry = spectatingIdRef.current
          ? world.remotePlayers.get(spectatingIdRef.current)
          : undefined;
        if (spectatedEntry) {
          _camTarget.set(
            spectatedEntry.mesh.position.x,
            spectatedEntry.mesh.position.y + 2.1,
            spectatedEntry.mesh.position.z,
          );
        } else {
          _camTarget.set(g.pos.x, g.pos.y + 2.1, g.pos.z);
        }
        const horiz = Math.cos(g.camPitch) * g.camDist;
        const vert = Math.sin(g.camPitch) * g.camDist;
        const cx = _camTarget.x + Math.sin(g.camYaw) * horiz;
        const cz = _camTarget.z + Math.cos(g.camYaw) * horiz;
        const groundAtCam = world.getGroundHeight(cx, cz);
        const cy =
          groundAtCam > -100
            ? Math.max(groundAtCam + 1.25, _camTarget.y + vert)
            : _camTarget.y + vert;
        _camDesired.set(cx, cy, cz);
        world.resolveCameraCollision(_camTarget, _camDesired, 2.2);
        world.camera.position.lerp(_camDesired, 1 - Math.exp(-9.5 * dt));
        world.resolveCameraCollision(_camTarget, world.camera.position, 2.2);
        if (shakeIntensity > 0) {
          world.camera.position.x += (Math.random() - 0.5) * shakeIntensity * 1.15;
          world.camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.85;
        }
        world.camera.lookAt(_camTarget.x, _camTarget.y + 0.55, _camTarget.z);

        // Ambient Nature Audio (Wind, River/Waterfall, Birds, Crickets) & Throttled HUD Sync
        const summitPt = world.getSummitPoint();
        const minY = world.getCpPoint(0).y;
        const maxY = summitPt.y;
        const altPct = Math.max(0, Math.min(100, Math.round(((g.pos.y - minY) / Math.max(1, maxY - minY)) * 100)));
        sound.updateAmbience(
          altPct,
          world.weather,
          world.timeOfDay,
          world.getRiverProximity(g.pos.x, g.pos.z),
        );

        if (now - g.lastHudSync > 250) {
          g.lastHudSync = now;
          const nextIdx = g.currentCP >= 25 && !g.essayDone ? 26 : Math.min(25, g.currentCP + 1);
          const target = nextIdx >= 26 ? summitPt : world.getCpPoint(nextIdx);
          const dx = target.x - g.pos.x;
          const dz = target.z - g.pos.z;
          const dist = Math.round(Math.hypot(dx, dz));
          const elev = Math.max(0, Math.round(target.y - g.pos.y));
          const worldAngle = Math.atan2(dx, dz);
          const camLookAngle = g.camYaw + Math.PI;
          const relAngleDeg = THREE.MathUtils.radToDeg(camLookAngle - worldAngle);
          const radarData = world.collectRadarData(g.pos, g.camYaw, nextIdx);

          const nextFrost = g.role === 'student' && (g.chillSlowTimer > 0 || world.isFrostSlowActive());
          if (nextFrost !== frostActiveRef.current) {
            frostActiveRef.current = nextFrost;
            setFrostActive(nextFrost);
          }

          setHud({
            altitudePct: altPct,
            nextCpIndex: nextIdx,
            distToNextCp: dist,
            elevToNextCp: elev,
            radarAngleDeg: relAngleDeg,
            targetBlip: radarData.targetBlip,
            nearbyBlips: radarData.nearbyBlips,
            locomotionMode: g.locomotionMode,
          });
        }

        // Pose sync is handled cleanly on 250ms movement-delta interval in Supabase channel useEffect
      } else {
        // Sweeping scenic camera orbiting the mountain ridge & bridges while in Lobby
        const camAngle = elapsed * 0.1;
        if (world.selectedMap === 'nusantara') {
          world.camera.position.set(Math.sin(camAngle) * 660, 290, -920 + Math.cos(camAngle) * 660);
          world.camera.lookAt(0, 130, -920);
          world.updateVisuals(dt, elapsed, _camTarget.set(0, 130, -920), sound, true);
        } else {
          world.camera.position.set(Math.sin(camAngle) * 440, 325, Math.cos(camAngle) * 440);
          world.camera.lookAt(0, 210, 0);
          world.updateVisuals(dt, elapsed, _camTarget.set(0, 210, 0), sound, true);
        }
      }

      world.render();

      if (world.isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (world.isSoftwareGl) {
      frameId = window.setTimeout(tick, 40);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      gameRef.current.keys[e.code] = true;
      if (
        gameRef.current.inGame &&
        !gameRef.current.activeQuiz &&
        !gameRef.current.essayActive &&
        (e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight')
      ) {
        e.preventDefault();
      }
      if (
        e.code === 'KeyF' &&
        !e.repeat &&
        gameRef.current.inGame &&
        gameRef.current.role === 'teacher' &&
        !gameRef.current.activeQuiz &&
        !gameRef.current.essayActive &&
        !gameRef.current.sessionEnded
      ) {
        e.preventDefault();
        toggleTeacherFlyRef.current();
        return;
      }
      if (
        e.code === 'Space' &&
        gameRef.current.inGame &&
        (gameRef.current.role === 'teacher' || gameRef.current.roomStatus === 'started') &&
        !gameRef.current.activeQuiz &&
        !gameRef.current.essayActive &&
        !gameRef.current.paused
      ) {
        e.preventDefault();
        if (!(gameRef.current.role === 'teacher' && gameRef.current.flyMode)) {
          tryJump();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.code] = false;
    };

    // PC/Laptop Mouse Camera Drag
    let mouseDragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (!gameRef.current.inGame || e.pointerType === 'touch') return;
      mouseDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!mouseDragging || e.pointerType === 'touch') return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      gameRef.current.camYaw -= dx * 0.0055;
      gameRef.current.camPitch = Math.max(0.08, Math.min(1.05, gameRef.current.camPitch + dy * 0.0045));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      mouseDragging = false;
    };

    // Mobile Multi-Touch Camera (Drag anywhere on 3D canvas outside joystick & buttons = 360° camera rotation)
    let cameraTouchId: number | null = null;
    let lastTouchX = 0;
    let lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      setIsTouchDevice((prev) => (prev ? prev : true));
      const g = gameRef.current;
      if (!g.inGame || g.activeQuiz || g.essayActive || cameraTouchId !== null) return;
      const t = e.changedTouches[0];
      if (t) {
        e.preventDefault();
        cameraTouchId = t.identifier;
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (cameraTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches[i];
        if (t && t.identifier === cameraTouchId) {
          e.preventDefault();
          const dx = t.clientX - lastTouchX;
          const dy = t.clientY - lastTouchY;
          lastTouchX = t.clientX;
          lastTouchY = t.clientY;
          gameRef.current.camYaw -= dx * 0.0065;
          gameRef.current.camPitch = Math.max(
            0.08,
            Math.min(1.05, gameRef.current.camPitch + dy * 0.005),
          );
          break;
        }
      }
    };
    const onTouchEndOrCancel = (e: TouchEvent) => {
      if (cameraTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches[i];
        if (t && t.identifier === cameraTouchId) {
          cameraTouchId = null;
          break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    mountEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    mountEl.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEndOrCancel);
    window.addEventListener('touchcancel', onTouchEndOrCancel);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      clearAllDisasterTimers();
      if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      mountEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      mountEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEndOrCancel);
      window.removeEventListener('touchcancel', onTouchEndOrCancel);
      cleanupChannel();
      world.dispose();
    };
  }, [
    advanceSummitEssay,
    cleanupChannel,
    clearAllDisasterTimers,
    finishActiveQuiz,
    openCheckpointQuiz,
    openSummitEssay,
    showWarning,
    submitQuizAnswer,
    triggerLightningFlash,
    triggerStudentFall,
    tryJump,
  ]);

  // --- Action Handlers ---
  const handleLobbyRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    const savedForRole = loadSavedAvatar(nextRole);
    if (savedForRole) {
      setAvatar(savedForRole);
    } else if (!avatarEdited) {
      setAvatar(nextRole === 'teacher' ? { ...DEFAULT_TEACHER_AVATAR } : { ...DEFAULT_STUDENT_AVATAR });
    }
  };

  const handleLobbyAvatarChange = (next: AvatarConfig) => {
    setAvatarEdited(true);
    setAvatar(next);
    saveAvatarToStorage(role, next);
  };

  const handleCreateRoom = async () => {
    if (lockedStudentMode || isConnecting) return;
    soundRef.current?.init();

    const envErr = getSupabaseConfigError();
    if (envErr) {
      setLobbyError(envErr);
      return;
    }

    const cleanName = sanitizeName(teacherName) || 'Guru Pemantau';
    const dur = Math.min(60, Math.max(5, Number(initQuizDuration) || 30));
    const durSession = [10, 15, 20, 25, 30, 40, 45, 50, 60].includes(Number(initSessionDuration))
      ? Number(initSessionDuration)
      : Math.min(60, Math.max(10, Number(initSessionDuration) || 20));
    const durExplain = Math.min(60, Math.max(5, Number(initExplanationDuration) || 45));

    const generatedCode = generateRoomCode();
    const teacherId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const resolvedMap: MapThemeId =
      initSelectedMap === 'random'
        ? MAP_THEMES[Math.floor(Math.random() * MAP_THEMES.length)].id
        : initSelectedMap;
    const initStages = getMapLayout(resolvedMap).stages;
    const roomSettings: RoomSettings = {
      timeOfDay: 'pagi',
      weather: 'cerah',
      selectedMap: resolvedMap,
      quizDuration: dur,
      sessionDurationMinutes: durSession,
      explanationDurationSec: durExplain,
      difficultyLevel: 3,
      respawnMode: 'last_cp',
      pgWeight: settings.pgWeight,
      essayWeight: settings.essayWeight,
    };

    const initialSec = durSession * 60;
    const hostRoom: HostRoomState = {
      code: generatedCode,
      status: 'waiting',
      teacherId,
      teacherName: cleanName,
      teacherAvatar: { ...avatar },
      teacherPose: {
        x: initStages[0].x,
        y: initStages[0].y,
        z: initStages[0].z,
        yaw: Math.atan2(initStages[1].x - initStages[0].x, initStages[1].z - initStages[0].z),
        cp: 0,
        state: 'idle',
      },
      teacherCP: 0,
      settings: roomSettings,
      paused: false,
      sessionEnded: false,
      remainingSec: initialSec,
      sessionEndsAt: null,
      questions: customQuestions && customQuestions.length > 0 ? customQuestions : null,
      essayQuestions:
        customEssayQuestions && customEssayQuestions.length > 0 ? customEssayQuestions : null,
      kickedIds: new Set<string>(),
      students: new Map<string, HostStudentRecord>(),
    };

    setLobbyError('');
    setIsConnecting(true);
    setConnectionStatus('Menyimpan ruangan & paket soal ke Supabase...');

    try {
      await upsertSupabaseRoom(generatedCode, buildSupabaseRoomConfig(hostRoom));

      const g = gameRef.current;
      g.role = 'teacher';
      g.name = cleanName;
      g.roomCode = generatedCode;
      g.roomStatus = 'waiting';
      g.avatar = { ...avatar };
      g.quizDuration = dur;
      g.explanationDurationSec = durExplain;
      g.clientId = teacherId;
      g.sessionEnded = false;
      g.paused = false;
      g.flyMode = false;
      g.flyVerticalDir = 0;
      setTeacherFlyMode(false);

      hostRoomRef.current = hostRoom;
      remainingSecRef.current = initialSec;

      setIsStandaloneMode(false);
      setClientIdState(teacherId);
      setRole('teacher');
      setLobbyTeacherName(cleanName);
      setShowClassLobby(true);

      enterGameWorld(getHostPublicRoomState(hostRoom), hostRoom.questions, hostRoom.essayQuestions);
      subscribeRoomChannel(generatedCode);
      const chosenMapName = MAP_THEMES.find((m) => m.id === resolvedMap)?.name || resolvedMap;
      showToastSuccess(
        initSelectedMap === 'random'
          ? `Ruangan ${generatedCode} siap (Acak terpilih: ${chosenMapName})! Tunggu siswa masuk lalu tekan Mulai Ekspedisi!`
          : `Ruangan ${generatedCode} siap (Lobi Kelas). Tunggu siswa masuk lalu tekan Mulai Ekspedisi!`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyError(`Gagal membuat ruangan di Supabase: ${msg}`);
    } finally {
      setIsConnecting(false);
      setConnectionStatus('');
    }
  };

  const handleJoinStudent = async () => {
    if (isConnecting) return;
    soundRef.current?.init();

    const cleanName = sanitizeName(studentName);
    const code = (standalonePacket?.roomCode || roomCodeInput)
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .trim();
    if (!cleanName) {
      setLobbyError('Masukkan nama siswa terlebih dahulu.');
      return;
    }
    if (!standalonePacket && !/^[A-Z0-9]{5}$/.test(code)) {
      setLobbyError('Masukkan kode ruangan 5 karakter yang valid.');
      return;
    }

    const effectiveCode = code || 'MANDI';
    setStudentName(cleanName);
    setRoomCodeInput(effectiveCode);
    setLobbyError('');

    const savedRaw = localStorage.getItem(`wowo_peak_session_${effectiveCode}`);
    let saved: StudentRestoreProgress | null = null;
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw) as StudentRestoreProgress;
        if (parsed && parsed.studentName && parsed.studentName.trim().toLowerCase() === cleanName.toLowerCase()) {
          saved = parsed;
        }
      } catch {
        saved = null;
      }
    }

    const studentId =
      saved && saved.studentId
        ? saved.studentId
        : nextShiftStudentIdRef.current || createEventId();
    nextShiftStudentIdRef.current = '';

    const g = gameRef.current;
    g.role = 'student';
    g.name = cleanName;
    g.roomCode = effectiveCode;
    g.avatar = { ...avatar };
    g.clientId = studentId;
    g.sessionEnded = false;
    g.paused = false;

    setClientIdState(studentId);
    setRole('student');

    if (standalonePacket) {
      setIsStandaloneMode(true);
      setIsConnecting(false);
      setConnectionStatus('');
      if (saved) {
        g.currentCP = typeof saved.currentCP === 'number' ? Math.min(25, Math.max(0, saved.currentCP)) : 0;
        g.completedCPs = Array.isArray(saved.completedCPs) ? saved.completedCPs : [];
        g.score = typeof saved.score === 'number' ? saved.score : 0;
        g.correctCount = typeof saved.correctCount === 'number' ? saved.correctCount : 0;
        g.wrongCount = typeof saved.wrongCount === 'number' ? saved.wrongCount : 0;
        g.essayCorrect = typeof saved.essayCorrect === 'number' ? saved.essayCorrect : 0;
        g.essayWrong = typeof saved.essayWrong === 'number' ? saved.essayWrong : 0;
        g.essayDone = Boolean(saved.essayDone);
        g.fallCount = typeof saved.fallCount === 'number' ? saved.fallCount : 0;
        g.answers = Array.isArray(saved.answers) ? saved.answers : [];
        g.essayAnswers = Array.isArray(saved.essayAnswers) ? saved.essayAnswers : [];
      } else {
        g.currentCP = 0;
        g.completedCPs = [];
        g.score = 0;
        g.correctCount = 0;
        g.wrongCount = 0;
        g.essayCorrect = 0;
        g.essayWrong = 0;
        g.essayDone = false;
        g.fallCount = 0;
        g.bridgeAttemptMode = 'none';
        g.answers = [];
        g.essayAnswers = [];
      }
      const totalSec = (standalonePacket.settings.sessionDurationMinutes || 20) * 60;
      sessionDurationMinRef.current = standalonePacket.settings.sessionDurationMinutes || 20;
      const studentRem =
        saved && typeof saved.remainingSec === 'number'
          ? Math.max(0, Math.min(totalSec, Math.round(saved.remainingSec)))
          : totalSec;
      remainingSecRef.current = studentRem;
      studentStartedAtRef.current =
        saved && typeof saved.studentStartedAt === 'number' ? saved.studentStartedAt : Date.now();
      joinedAtRef.current = studentStartedAtRef.current;
      const standaloneState: PublicRoomState = {
        roomCode: effectiveCode,
        status: 'started',
        settings: standalonePacket.settings,
        paused: false,
        sessionEnded: false,
        remainingSec: studentRem,
        questionCount: standalonePacket.questions?.length || 25,
        essayQuestionCount: standalonePacket.essayQuestions?.length || 5,
        participants: [],
      };
      setShowClassLobby(false);
      setLobbyTeacherName(standalonePacket.teacherName || 'Pak/Bu Guru');
      enterGameWorld(standaloneState, standalonePacket.questions, standalonePacket.essayQuestions);
      showToastSuccess(
        `Mode Mandiri aktif! Paket soal dari ${standalonePacket.teacherName} siap dikerjakan.`,
      );
      return;
    }

    const envErr = getSupabaseConfigError();
    if (envErr) {
      setLobbyError(envErr);
      return;
    }

    setIsStandaloneMode(false);
    setIsConnecting(true);
    setConnectionStatus('Mengambil data ruangan & soal dari Supabase...');

    try {
      const config = await fetchSupabaseRoomConfig(effectiveCode);

      if (Array.isArray(config.kickedIds) && config.kickedIds.includes(studentId)) {
        throw new Error('Anda telah dikeluarkan dari ruangan ini oleh Guru.');
      }
      if (config.sessionEnded || config.status === 'ended') {
        throw new Error(`Sesi pada ruangan "${effectiveCode}" sudah diakhiri oleh Guru.`);
      }

      if (saved) {
        g.currentCP = typeof saved.currentCP === 'number' ? Math.min(25, Math.max(0, saved.currentCP)) : 0;
        g.completedCPs = Array.isArray(saved.completedCPs) ? saved.completedCPs : [];
        g.score = typeof saved.score === 'number' ? saved.score : 0;
        g.correctCount = typeof saved.correctCount === 'number' ? saved.correctCount : 0;
        g.wrongCount = typeof saved.wrongCount === 'number' ? saved.wrongCount : 0;
        g.essayCorrect = typeof saved.essayCorrect === 'number' ? saved.essayCorrect : 0;
        g.essayWrong = typeof saved.essayWrong === 'number' ? saved.essayWrong : 0;
        g.essayDone = Boolean(saved.essayDone);
        g.fallCount = typeof saved.fallCount === 'number' ? saved.fallCount : 0;
        g.answers = Array.isArray(saved.answers) ? saved.answers : [];
        g.essayAnswers = Array.isArray(saved.essayAnswers) ? saved.essayAnswers : [];
      } else {
        g.currentCP = 0;
        g.completedCPs = [];
        g.score = 0;
        g.correctCount = 0;
        g.wrongCount = 0;
        g.essayCorrect = 0;
        g.essayWrong = 0;
        g.essayDone = false;
        g.fallCount = 0;
        g.answers = [];
        g.essayAnswers = [];
      }
      g.bridgeAttemptMode = 'none';

      const initialStatus: RoomStatus = config.status === 'waiting' ? 'waiting' : 'started';
      const durMin = config.settings?.sessionDurationMinutes || 20;
      sessionDurationMinRef.current = durMin;
      const fullStudentSec = durMin * 60;
      const studentRem =
        saved && typeof saved.remainingSec === 'number'
          ? Math.max(0, Math.min(fullStudentSec, Math.round(saved.remainingSec)))
          : fullStudentSec;
      remainingSecRef.current = studentRem;
      studentStartedAtRef.current =
        saved && typeof saved.studentStartedAt === 'number' ? saved.studentStartedAt : Date.now();
      joinedAtRef.current = studentStartedAtRef.current;

      const roomState: PublicRoomState = {
        roomCode: effectiveCode,
        status: initialStatus,
        settings: config.settings,
        paused: Boolean(config.paused),
        sessionEnded: Boolean(config.sessionEnded),
        remainingSec: studentRem,
        questionCount: config.questions?.length || 25,
        essayQuestionCount: config.essayQuestions?.length || 5,
        participants: [],
      };

      setConnectionStatus('Menghubungkan ke Channel Real-Time Kelas...');
      setLobbyTeacherName(config.teacherName || 'Pak/Bu Guru');
      setShowClassLobby(initialStatus === 'waiting');
      enterGameWorld(roomState, config.questions || null, config.essayQuestions || null);

      if (config.teacherId) {
        upsertRemotePlayer({
          id: config.teacherId,
          role: 'teacher',
          name: config.teacherName || 'Guru Pemantau',
          avatar: normalizeAvatarConfig(config.teacherAvatar, 'teacher'),
          currentCP: 0,
          score: 0,
          pose: {
            x: worldRef.current?.getCpPoint(0).x ?? CP_POINTS[0].x,
            y: worldRef.current?.getCpPoint(0).y ?? CP_POINTS[0].y,
            z: worldRef.current?.getCpPoint(0).z ?? CP_POINTS[0].z,
            yaw: 0,
            cp: 0,
            state: 'idle',
          },
        });
      }

      subscribeRoomChannel(effectiveCode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyError(`Gagal bergabung ke ruangan "${effectiveCode}": ${msg}`);
    } finally {
      setIsConnecting(false);
      setConnectionStatus('');
    }
  };

  const handleToggleAudio = () => {
    soundRef.current?.init();
    const next = !muted;
    soundRef.current?.setMuted(next);
    setMuted(next);
  };

  const handleToggleLowGraphics = () => {
    const next = !lowGraphics;
    worldRef.current?.setLowGraphics(next);
    setLowGraphics(next);
  };

  const handleUpdateSettings = (partial: Partial<RoomSettings>) => {
    if (gameRef.current.role !== 'teacher') return;
    const prevTotal = settings.sessionDurationMinutes * 60;
    const merged: RoomSettings = { ...settings, ...partial };
    const room = hostRoomRef.current;

    if (
      typeof partial.sessionDurationMinutes === 'number' &&
      partial.sessionDurationMinutes !== settings.sessionDurationMinutes &&
      !gameRef.current.sessionEnded
    ) {
      const nextMin = Math.min(60, Math.max(10, Math.round(partial.sessionDurationMinutes)));
      merged.sessionDurationMinutes = nextMin;
      const elapsed = Math.max(0, prevTotal - remainingSecRef.current);
      const nextRem = Math.max(15, nextMin * 60 - elapsed);
      remainingSecRef.current = nextRem;
      setRemainingSec(nextRem);

      if (room) {
        room.remainingSec = nextRem;
        room.sessionEndsAt = gameRef.current.paused ? null : Date.now() + nextRem * 1000;
        sendRoomBroadcast(channelRef.current, {
          type: 'timer_sync',
          remainingSec: Math.round(nextRem),
          sessionDurationMinutes: nextMin,
          paused: gameRef.current.paused,
        });
      }
    }

    applyRoomSettings(merged);

    if (room) {
      room.settings = merged;
      sendRoomBroadcast(channelRef.current, { type: 'settings_updated', settings: merged });
      if (partial.selectedMap) {
        const cmd: RoomCommandPayload = {
          type: 'CHANGE_MAP',
          eventId: createEventId(),
          triggeredAt: Date.now(),
          duration: 5000,
          mapId: partial.selectedMap,
          settings: merged,
        };
        sendRoomCommandBroadcast(channelRef.current, cmd);
        void publishRoomCommandToSupabase(room.code, cmd, buildSupabaseRoomConfig(room)).catch((err) => {
          showWarning(`Gagal sinkron tema map ke Supabase: ${err instanceof Error ? err.message : String(err)}`, 3.5);
        });
      } else {
        void upsertSupabaseRoom(room.code, buildSupabaseRoomConfig(room)).catch((err) => {
          showWarning(`Gagal sinkron pengaturan ke Supabase: ${err instanceof Error ? err.message : String(err)}`, 3.5);
        });
      }
    }

    if (partial.selectedMap) {
      const mapLabel = MAP_THEMES.find((m) => m.id === partial.selectedMap)?.name || partial.selectedMap;
      showWarning(`Tema Map 3D diubah ke ${mapLabel.toUpperCase()} untuk seluruh siswa!`, 2.6);
    }

    if (partial.weather) {
      if (partial.weather === 'badai' || partial.weather === 'kiamat') {
        triggerLightningFlash();
      }
      showWarning(`Cuaca gunung diubah ke ${partial.weather.toUpperCase()} untuk seluruh siswa!`, 2.2);
    }
  };

  const handleStartExpedition = () => {
    if (gameRef.current.role !== 'teacher') return;
    const room = hostRoomRef.current;
    const rem = Math.max(15, Math.round(remainingSecRef.current));
    const endsAt = Date.now() + rem * 1000;

    gameRef.current.roomStatus = 'started';
    gameRef.current.paused = false;
    setRoomStatus('started');
    setPaused(false);
    setShowClassLobby(false);

    if (room) {
      room.status = 'started';
      room.paused = false;
      room.remainingSec = rem;
      room.sessionEndsAt = endsAt;
      const snap = getHostParticipantsSnapshot(room.students);

      const cmd: RoomCommandPayload = {
        type: 'start_expedition',
        eventId: createEventId(),
        triggeredAt: Date.now(),
        duration: 5000,
        remainingSec: rem,
        sessionEndsAt: endsAt,
        settings: room.settings,
        participants: snap,
      };
      sendRoomCommandBroadcast(channelRef.current, cmd);
      sendRoomBroadcast(channelRef.current, {
        type: 'game_start',
        remainingSec: rem,
        sessionEndsAt: endsAt,
        settings: room.settings,
        participants: snap,
      });
      sendRoomBroadcast(channelRef.current, {
        type: 'timer_sync',
        remainingSec: rem,
        sessionDurationMinutes: room.settings.sessionDurationMinutes,
        paused: false,
        status: 'started',
      });

      void publishRoomCommandToSupabase(room.code, cmd, buildSupabaseRoomConfig(room)).catch(
        (err) => {
          showWarning(
            `Gagal memperbarui status ruangan di Supabase: ${err instanceof Error ? err.message : String(err)}`,
            3.5,
          );
        },
      );
    }

    soundRef.current?.playCheckpoint();
    showToastSuccess('Ekspedisi dimulai! Timer dan pendakian berjalan serentak untuk semua siswa.');
  };

  const handleUpdateInGameAvatar = (next: AvatarConfig) => {
    setAvatar(next);
    const g = gameRef.current;
    g.avatar = { ...next };
    saveAvatarToStorage(g.role, next);
    rebuildLocalPlayerMesh();
    saveStudentSession();

    if (g.role === 'teacher' && hostRoomRef.current) {
      hostRoomRef.current.teacherAvatar = next;
    }
    sendRoomBroadcast(channelRef.current, {
      type: 'update_avatar',
      id: g.clientId,
      role: g.role,
      avatar: next,
    });
    if (channelRef.current) {
      void channelRef.current
        .track({
          id: g.clientId,
          role: g.role,
          name: g.name,
          avatar: next,
          joinedAt: joinedAtRef.current,
          cp: g.currentCP,
          pgCorrect: g.correctCount,
          isianCorrect: g.essayCorrect,
          score: g.score,
          falls: g.fallCount,
          isianDone: g.essayDone,
        } satisfies RoomPresencePayload)
        .catch(() => {});
    }
  };

  const handleLobbyCustomQuestionsChange = (
    questions: QuizQuestion[] | null,
    fileName = '',
  ) => {
    setCustomQuestions(questions);
    if (questions && questions.length > 0) {
      const cleanFile = fileName || 'Soal_PG_Kustom.xlsx';
      setPgFileName(cleanFile);
      setQuestionCount(questions.length);
      saveCustomPgToStorage(questions, cleanFile);
    } else {
      setPgFileName('');
      setQuestionCount(25);
      clearCustomPgFromStorage();
    }
  };

  const handleLobbyCustomEssayChange = (
    essayQuestions: EssayQuestion[] | null,
    fileName = '',
  ) => {
    setCustomEssayQuestions(essayQuestions);
    if (essayQuestions && essayQuestions.length > 0) {
      const cleanFile = fileName || 'Soal_Isian_Kustom.xlsx';
      setEssayFileName(cleanFile);
      setEssayQuestionCount(essayQuestions.length);
      gameRef.current.essayQuestions = essayQuestions;
      saveCustomEssayToStorage(essayQuestions, cleanFile);
    } else {
      setEssayFileName('');
      setEssayQuestionCount(5);
      gameRef.current.essayQuestions = DEFAULT_ESSAY_QUESTIONS;
      clearCustomEssayFromStorage();
    }
  };

  const handleUpdateQuestions = (questions: QuizQuestion[] | null, fileName = '') => {
    handleLobbyCustomQuestionsChange(questions, fileName);
    if (gameRef.current.role !== 'teacher') return;
    const nextQuestions = questions && questions.length > 0 ? questions : null;
    if (hostRoomRef.current) {
      hostRoomRef.current.questions = nextQuestions;
      sendRoomBroadcast(channelRef.current, {
        type: 'questions_updated',
        questions: nextQuestions,
      });
      void upsertSupabaseRoom(
        hostRoomRef.current.code,
        buildSupabaseRoomConfig(hostRoomRef.current),
      ).catch((err) => {
        showWarning(`Gagal memperbarui soal PG di Supabase: ${err instanceof Error ? err.message : String(err)}`, 3.5);
      });
    }
  };

  const handleUpdateEssayQuestions = (
    essayQuestions: EssayQuestion[] | null,
    fileName = '',
  ) => {
    handleLobbyCustomEssayChange(essayQuestions, fileName);
    if (gameRef.current.role !== 'teacher') return;
    const nextEssay = essayQuestions && essayQuestions.length > 0 ? essayQuestions : null;
    if (hostRoomRef.current) {
      hostRoomRef.current.essayQuestions = nextEssay;
      sendRoomBroadcast(channelRef.current, {
        type: 'essay_questions_updated',
        essayQuestions: nextEssay,
      });
      void upsertSupabaseRoom(
        hostRoomRef.current.code,
        buildSupabaseRoomConfig(hostRoomRef.current),
      ).catch((err) => {
        showWarning(`Gagal memperbarui soal Isian di Supabase: ${err instanceof Error ? err.message : String(err)}`, 3.5);
      });
    }
  };

  const handleTriggerEmote = (emote: EmoteType) => {
    const g = gameRef.current;
    const world = worldRef.current;
    if (!world || !g.inGame) return;
    g.activeEmote = emote;
    g.emoteTimer = 3.2;
    world.showAvatarEmote(g.playerMesh, emote);
    soundRef.current?.playEmoteChime();
    const item = EMOTE_ITEMS.find((e) => e.id === emote);
    if (item) {
      showWarning(`${item.emoji} Emote: ${item.label}`, 1.6);
    }
    sendRoomBroadcast(channelRef.current, {
      type: 'player_emote',
      id: g.clientId,
      emote,
    });
  };

  const handleTeleport = (cpIndex: number) => {
    const g = gameRef.current;
    const world = worldRef.current;
    if (g.role !== 'teacher' || !world) return;
    const cp = cpIndex >= 26 ? world.getSummitPoint() : world.getCpPoint(Math.min(25, Math.max(0, cpIndex)));
    const nextCP = cp.index >= 25 ? world.getSummitPoint() : world.getCpPoint(cp.index + 1);
    const cp25 = world.getCpPoint(25);
    g.currentCP = cp.index;
    g.pos.set(cp.x, world.getGroundHeight(cp.x, cp.z), cp.z);
    g.vel.set(0, 0, 0);
    g.onGround = true;
    g.yaw =
      cp.index >= 26
        ? Math.atan2(cp25.x - cp.x, cp25.z - cp.z) + Math.PI
        : Math.atan2(nextCP.x - cp.x, nextCP.z - cp.z);
    setCurrentCP(Math.min(25, cp.index));
    resetCameraBehindPlayer();
  };

  const handleTriggerEvent = (eventType: DisasterEventType) => {
    if (gameRef.current.role !== 'teacher') return;
    const isGhost = eventType === 'kuntilanak' || eventType === 'pocong';
    const isStormParticle =
      eventType === 'hail' ||
      eventType === 'fire_rain' ||
      eventType === 'landslide' ||
      eventType === 'wildfire';
    const count = isGhost ? 3 : eventType === 'yeti' ? 3 : isStormParticle ? 50 : eventType === 'brainrot' ? 4 : undefined;
    const offsets = isGhost ? [9, 15, 21] : undefined;
    const durationMs =
      eventType === 'flash_flood' ||
      eventType === 'lava_rain' ||
      eventType === 'lava_landslide' ||
      eventType === 'lava_flood' ||
      eventType === 'landslide' ||
      eventType === 'yeti' ||
      eventType === 'snowstorm'
        ? 7000
        : eventType === 'brainrot'
          ? 6000
          : 5000;
    const nowMs = Date.now();
    const cmd: RoomCommandPayload = {
      type: eventType,
      eventId: createEventId(),
      triggeredAt: nowMs,
      duration: durationMs,
      count,
      offsets,
    };

    handleTeacherEvent(eventType, {
      durationMs,
      timestamp: nowMs,
      count,
      offsets,
    });

    sendRoomCommandBroadcast(channelRef.current, cmd);
    if (hostRoomRef.current) {
      void publishRoomCommandToSupabase(
        hostRoomRef.current.code,
        cmd,
        buildSupabaseRoomConfig(hostRoomRef.current),
      ).catch(() => {});
    }
  };

  const handleTogglePause = () => {
    if (gameRef.current.role !== 'teacher') return;
    const nextPaused = !paused;
    gameRef.current.paused = nextPaused;
    setPaused(nextPaused);

    const rem = Math.max(0, Math.round(remainingSecRef.current));
    if (hostRoomRef.current) {
      hostRoomRef.current.paused = nextPaused;
      hostRoomRef.current.remainingSec = rem;
      hostRoomRef.current.sessionEndsAt = nextPaused ? null : Date.now() + rem * 1000;
      const cmd: RoomCommandPayload = {
        type: 'pause_class',
        eventId: createEventId(),
        triggeredAt: Date.now(),
        duration: 5000,
        paused: nextPaused,
        remainingSec: rem,
        sessionEndsAt: hostRoomRef.current.sessionEndsAt,
        settings: hostRoomRef.current.settings,
      };
      sendRoomCommandBroadcast(channelRef.current, cmd);
      sendRoomBroadcast(channelRef.current, {
        type: 'pause_updated',
        paused: nextPaused,
        remainingSec: rem,
      });
      sendRoomBroadcast(channelRef.current, {
        type: 'timer_sync',
        remainingSec: rem,
        sessionDurationMinutes: settings.sessionDurationMinutes,
        paused: nextPaused,
      });
      void publishRoomCommandToSupabase(
        hostRoomRef.current.code,
        cmd,
        buildSupabaseRoomConfig(hostRoomRef.current),
      ).catch(() => {});
    }
  };

  const handleKickStudent = (studentId: string, name: string) => {
    if (gameRef.current.role !== 'teacher') return;
    const room = hostRoomRef.current;
    if (room) {
      room.kickedIds.add(studentId);
      room.students.delete(studentId);
      removeRemotePlayer(studentId);
      const snap = getHostParticipantsSnapshot(room.students);
      setParticipants(snap);
      sendRoomBroadcast(channelRef.current, {
        type: 'kicked',
        targetId: studentId,
        message: 'Anda telah dikeluarkan dari kelas oleh Guru.',
      });
      sendRoomBroadcast(channelRef.current, { type: 'participants_update', participants: snap });
      void upsertSupabaseRoom(room.code, buildSupabaseRoomConfig(room)).catch(() => {});
    }
    showWarning(`Siswa "${name}" dikeluarkan dari ruangan.`, 2.4);
  };

  const handleEndSession = () => {
    if (gameRef.current.role !== 'teacher') return;
    const room = hostRoomRef.current;
    const leaderboardSnap = room ? getHostParticipantsSnapshot(room.students) : [];
    const exportSnap = room ? getHostExportRows(room.students) : [];

    if (room) {
      room.status = 'ended';
      room.sessionEnded = true;
      room.paused = true;
      room.remainingSec = 0;
      room.sessionEndsAt = null;
      room.endReason = 'teacher';
      const cmd: RoomCommandPayload = {
        type: 'end_session',
        eventId: createEventId(),
        triggeredAt: Date.now(),
        duration: 5000,
        reason: 'teacher',
        leaderboard: leaderboardSnap,
        exportRows: exportSnap,
      };
      sendRoomCommandBroadcast(channelRef.current, cmd);
      sendRoomBroadcast(channelRef.current, {
        type: 'session_ended',
        reason: 'teacher',
        leaderboard: leaderboardSnap,
        exportRows: exportSnap,
      });
      void publishRoomCommandToSupabase(
        room.code,
        cmd,
        buildSupabaseRoomConfig(room),
      ).catch(() => {});
    }

    applySessionEnded('teacher', leaderboardSnap, exportSnap);
  };

  const handleBackToLobby = () => {
    cleanupChannel();
    window.location.href = window.location.pathname;
  };

  const handleNextStudentShift = useCallback(() => {
    const g = gameRef.current;
    const preservedRoomCode = g.roomCode || roomCode || roomCodeInput;

    // 1. Flush final progress of the current student so Teacher & Supabase keep their scores intact
    if (g.role === 'student' && g.clientId && !isStandaloneMode) {
      emitStudentProgress();
    }

    // 2. Disconnect current student channel cleanly without deleting their record at Teacher
    cleanupChannel();

    // 3. Free temporary WebGL meshes, textures, sprites, and render lists for smooth 60 FPS shift turns
    const world = worldRef.current;
    if (world) {
      if (g.playerMesh) {
        world.scene.remove(g.playerMesh);
        disposeAvatarGroup(g.playerMesh);
        g.playerMesh = null;
        g.headLamp = null;
      }
      world.resetForNextStudentShift();
    }

    // 4. Purge all previous student's localStorage & sessionStorage entries (keep room code)
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('wowo_peak_session_') || k === 'wowo_peak_last_room' || k === 'wowo_peak_avatar_student')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore storage access issues
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore storage access issues
    }

    // 5. Generate a fresh unique playerId via crypto.randomUUID() for the next student
    const freshPlayerId = createEventId();
    nextShiftStudentIdRef.current = freshPlayerId;

    // 6. Reset timer & all mutable gameRef state back to Base Camp (CP 0) for the incoming student
    if (timeoutFallbackRef.current) {
      window.clearTimeout(timeoutFallbackRef.current);
      timeoutFallbackRef.current = null;
    }
    const fullSec = (sessionDurationMinRef.current || settings.sessionDurationMinutes || 20) * 60;
    remainingSecRef.current = fullSec;
    setRemainingSec(fullSec);
    studentStartedAtRef.current = Date.now();
    joinedAtRef.current = studentStartedAtRef.current;

    const cp0 = world?.getCpPoint(0) ?? CP_POINTS[0];
    const cp1 = world?.getCpPoint(1) ?? CP_POINTS[1];
    const startYaw = Math.atan2(cp1.x - cp0.x, cp1.z - cp0.z);
    g.inGame = false;
    g.role = 'student';
    g.roomCode = preservedRoomCode;
    g.roomStatus = 'waiting';
    g.clientId = freshPlayerId;
    g.name = '';
    g.avatar = { ...DEFAULT_STUDENT_AVATAR };
    g.paused = false;
    g.sessionEnded = false;
    g.currentCP = 0;
    g.completedCPs = [];
    g.score = 0;
    g.correctCount = 0;
    g.wrongCount = 0;
    g.essayCorrect = 0;
    g.essayWrong = 0;
    g.essayDone = false;
    g.essayActive = false;
    g.essayFeedbackOpen = false;
    g.essayExplainLeft = 0;
    g.essayIsLastPending = false;
    g.essayAnswers = [];
    g.fallCount = 0;
    g.bridgeAttemptMode = 'none';
    g.answers = [];
    g.studentDeck = [];
    g.activeQuiz = null;
    g.pos.set(cp0.x, cp0.y, cp0.z);
    g.vel.set(0, 0, 0);
    g.yaw = startYaw;
    g.camDist = 10.6;
    g.camPitch = 0.34;
    g.nextHailIn = 16;
    g.nextGhostIn = 16;
    g.onGround = true;
    g.flyMode = false;
    g.flyVerticalDir = 0;
    setTeacherFlyMode(false);
    g.hurtTimer = 0;
    g.chillSlowTimer = 0;
    frostActiveRef.current = false;
    setFrostActive(false);
    g.activeEmote = null;
    g.emoteTimer = 0;

    // 7. Reset UI state back to clean Student Join form with preserved Teacher Room Code
    spectatingIdRef.current = null;
    setSpectatingTargetName(null);
    setInGame(false);
    setSessionEnded(false);
    setPaused(false);
    setShowClassLobby(false);
    setActiveQuiz(null);
    setActiveEssayModal(null);
    setLeaderboard([]);
    setExportRows([]);
    setParticipants([]);
    setCurrentCP(0);
    setEssayDone(false);
    setEssayCorrect(0);
    setScore(0);
    setFallCount(0);
    setWarningText('');
    setReconnectInfo(null);
    setLobbyError('');
    setStudentName('');
    setAvatar({ ...DEFAULT_STUDENT_AVATAR });
    setAvatarEdited(false);
    setRole('student');
    setClientIdState(freshPlayerId);
    if (preservedRoomCode) {
      setRoomCodeInput(preservedRoomCode);
    }

    showToastSuccess(
      preservedRoomCode
        ? `Siap untuk siswa berikutnya! Kode ruangan ${preservedRoomCode} sudah terisi otomatis.`
        : 'Siap untuk siswa berikutnya! Silakan isi nama dan pilih avatar.',
    );
  }, [cleanupChannel, emitStudentProgress, isStandaloneMode, roomCode, roomCodeInput, showToastSuccess]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* Isolated Full-Viewport Three.js WebGL Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0 touch-none select-none" />

      {/* Lightning Flash Layer */}
      <div
        className="fixed inset-0 z-40 pointer-events-none bg-white transition-opacity duration-150"
        style={{ opacity: lightningOpacity }}
      />

      {/* Lightweight Ice/Blizzard Frost Screen Vignette (No backdrop-filter for 60 FPS) */}
      {inGame && frostActive && !sessionEnded && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 pointer-events-none transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(circle at center, rgba(186,230,253,0) 56%, rgba(125,211,252,0.28) 84%, rgba(224,242,254,0.52) 100%)',
            boxShadow: 'inset 0 0 42px rgba(186,230,253,0.45)',
          }}
        >
          <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-sky-950/85 border border-cyan-300/60 text-cyan-100 text-[11px] font-bold tracking-wide shadow">
            Efek Beku Salju: Kecepatan Jalan 0.55x
          </div>
        </div>
      )}

      {/* Global Green Import Toast */}
      {toastMsg && (
        <div
          role="status"
          className="fixed top-4 right-4 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950/95 border border-emerald-400 text-emerald-100 text-sm font-semibold shadow-2xl max-w-md"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Lobby Screen */}
      {!inGame && !kickedMessage && (
        <LobbyModal
          role={role}
          lockedStudentMode={lockedStudentMode}
          onChangeRole={handleLobbyRoleChange}
          avatar={avatar}
          onChangeAvatar={handleLobbyAvatarChange}
          studentName={studentName}
          onChangeStudentName={setStudentName}
          roomCodeInput={roomCodeInput}
          onChangeRoomCodeInput={setRoomCodeInput}
          teacherName={teacherName}
          onChangeTeacherName={setTeacherName}
          initQuizDuration={initQuizDuration}
          onChangeInitQuizDuration={setInitQuizDuration}
          initSessionDuration={initSessionDuration}
          onChangeInitSessionDuration={setInitSessionDuration}
          initExplanationDuration={initExplanationDuration}
          onChangeInitExplanationDuration={setInitExplanationDuration}
          initSelectedMap={initSelectedMap}
          onChangeInitSelectedMap={setInitSelectedMap}
          customQuestions={customQuestions}
          pgFileName={pgFileName}
          onChangeCustomQuestions={handleLobbyCustomQuestionsChange}
          customEssayQuestions={customEssayQuestions}
          essayFileName={essayFileName}
          onChangeCustomEssayQuestions={handleLobbyCustomEssayChange}
          pgWeight={settings.pgWeight}
          essayWeight={settings.essayWeight}
          onChangeWeights={(pgWeight, essayWeight) =>
            setSettings((prev) => ({ ...prev, pgWeight, essayWeight }))
          }
          reconnectInfo={reconnectInfo}
          errorMsg={lobbyError}
          onError={setLobbyError}
          onToastSuccess={showToastSuccess}
          onJoinStudent={handleJoinStudent}
          onCreateRoom={handleCreateRoom}
          isConnecting={isConnecting}
          connectionStatus={connectionStatus}
          supabaseConfigError={getSupabaseConfigError()}
          standalonePacketInfo={
            standalonePacket
              ? {
                  roomCode: standalonePacket.roomCode,
                  teacherName: standalonePacket.teacherName,
                  questionCount: standalonePacket.questions?.length || 25,
                  essayQuestionCount: standalonePacket.essayQuestions?.length || 5,
                }
              : null
          }
        />
      )}

      {/* In-Game HUD */}
      {inGame && (
        <GameHud
          roomCode={roomCode}
          roomStatus={roomStatus}
          showClassLobby={showClassLobby}
          role={role}
          avatar={avatar}
          currentCP={currentCP}
          essayDone={essayDone}
          essayCorrect={essayCorrect}
          score={score}
          fallCount={fallCount}
          settings={settings}
          remainingSec={remainingSec}
          paused={paused}
          hud={hud}
          muted={muted}
          lowGraphics={lowGraphics}
          participants={participants}
          questionCount={questionCount}
          essayQuestionCount={essayQuestionCount}
          pgFileName={pgFileName}
          essayFileName={essayFileName}
          warningText={warningText}
          isTouchDevice={isTouchDevice}
          onResetCamera={resetCameraBehindPlayer}
          onToggleAudio={handleToggleAudio}
          onToggleLowGraphics={handleToggleLowGraphics}
          onUpdateSettings={handleUpdateSettings}
          onUpdateAvatar={handleUpdateInGameAvatar}
          onUpdateQuestions={handleUpdateQuestions}
          onUpdateEssayQuestions={handleUpdateEssayQuestions}
          onToastSuccess={showToastSuccess}
          onTriggerEmote={handleTriggerEmote}
          onTeleport={handleTeleport}
          onTriggerEvent={handleTriggerEvent}
          onTogglePause={handleTogglePause}
          onToggleClassLobby={() => setShowClassLobby((v) => !v)}
          onStartExpedition={handleStartExpedition}
          onKickStudent={handleKickStudent}
          onEndSession={handleEndSession}
          onJoystickChange={(x, y) => {
            gameRef.current.joyVec = { x, y };
          }}
          onMobileJump={tryJump}
          isStandaloneMode={isStandaloneMode}
          onBuildStandaloneLink={() => {
            const room = hostRoomRef.current;
            return encodeStandaloneLink({
              roomCode: room?.code || roomCode,
              teacherName: room?.teacherName || sanitizeName(teacherName) || 'Guru',
              settings: room?.settings || settings,
              questions: room ? room.questions : customQuestions,
              essayQuestions: room ? room.essayQuestions : customEssayQuestions,
            });
          }}
          onFinishStandalone={() => applySessionEnded('teacher')}
          spectatingTargetName={spectatingTargetName}
          canSpectatePeers={!isStandaloneMode}
          onCycleSpectate={cycleSpectateTarget}
          onStopSpectate={stopSpectate}
          onNextStudentShift={role === 'student' ? handleNextStudentShift : undefined}
          teacherFlyMode={teacherFlyMode}
          onToggleTeacherFly={handleToggleTeacherFly}
          onFlyVerticalChange={(dir) => {
            gameRef.current.flyVerticalDir = dir;
          }}
          photoMode={photoMode}
          photoSelfie={photoSelfie}
          capturedPhotoUrl={capturedPhotoUrl}
          playerName={gameRef.current.name || (role === 'teacher' ? teacherName : studentName)}
          onTogglePhotoMode={handleTogglePhotoMode}
          onTogglePhotoAngle={handleTogglePhotoAngle}
          onCapturePhoto={handleCapturePhoto}
          onClosePhotoPreview={handleClosePhotoPreview}
        />
      )}

      {/* Class Waiting Lobby Overlay (Students while waiting, Teacher when toggled) */}
      {inGame &&
        !sessionEnded &&
        !kickedMessage &&
        ((role === 'student' && roomStatus === 'waiting') ||
          (role === 'teacher' && showClassLobby)) && (
          <ClassLobbyModal
            role={role}
            roomCode={roomCode}
            roomStatus={roomStatus}
            teacherName={lobbyTeacherName}
            currentStudentId={clientIdState}
            localStudentName={gameRef.current.name}
            localAvatar={avatar}
            participants={participants}
            settings={settings}
            questionCount={questionCount}
            essayQuestionCount={essayQuestionCount}
            onStartExpedition={handleStartExpedition}
            onHideLobby={() => setShowClassLobby(false)}
            onKickStudent={handleKickStudent}
          />
        )}

      {/* Checkpoint Multiple-Choice Quiz Modal */}
      {activeQuiz && !sessionEnded && (
        <QuizModal
          cpIndex={activeQuiz.cpIndex}
          question={activeQuiz.question}
          timeLeft={activeQuiz.timeLeft}
          totalDuration={activeQuiz.totalDuration}
          answered={activeQuiz.answered}
          chosenLetter={activeQuiz.chosenLetter}
          explanationTimeLeft={activeQuiz.explainTimeLeft}
          onSelectOption={(letter) => submitQuizAnswer(letter)}
          onContinueEarly={finishActiveQuiz}
        />
      )}

      {/* Gapura Puncak — 5-Question Short-Answer Exam Modal */}
      {activeEssayModal && !sessionEnded && (
        <SummitEssayModal
          questions={activeEssayModal.questions}
          currentIndex={activeEssayModal.currentIndex}
          feedback={activeEssayModal.feedback}
          explanationTimeLeft={activeEssayModal.explainTimeLeft}
          onSubmitAnswer={submitSummitEssayAnswer}
          onContinueEarly={advanceSummitEssay}
        />
      )}

      {/* Student Classroom Pause Freeze Screen */}
      {inGame && paused && role === 'student' && !sessionEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/82">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-400/50 p-7 text-center shadow-2xl space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-300">
              <Pause className="w-7 h-7" />
            </div>
            <h2 className="font-display text-3xl font-extrabold text-white">
              KELAS DIJEDA OLEH GURU
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Simak penjelasan Guru terlebih dahulu. Pergerakan karakter, timer kuis, satwa liar,
              hantu, dan bencana gunung dibekukan sementara.
            </p>
          </div>
        </div>
      )}

      {/* Kicked Notice Modal */}
      {kickedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-red-500/50 p-6 text-center space-y-4 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-red-400">Dikeluarkan dari Kelas</h2>
            <p className="text-sm text-slate-300">{kickedMessage}</p>
            <button
              type="button"
              onClick={handleBackToLobby}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-semibold text-white cursor-pointer"
            >
              Kembali ke Halaman Utama
            </button>
          </div>
        </div>
      )}

      {/* Final Session Leaderboard & Excel Export Modal */}
      {sessionEnded && !kickedMessage && (
        <LeaderboardModal
          roomCode={roomCode}
          role={role}
          endReason={sessionEndReason}
          currentStudentId={clientIdState}
          leaderboard={leaderboard}
          exportRows={exportRows}
          pgWeight={settings.pgWeight}
          essayWeight={settings.essayWeight}
          onBackToLobby={handleBackToLobby}
          onNextStudentShift={role === 'student' ? handleNextStudentShift : undefined}
        />
      )}
    </div>
  );
}

export default App;
