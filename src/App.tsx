import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CheckCircle2, Pause } from 'lucide-react';
import { MountainWorld, CP_POINTS, SUMMIT_EXAM_POINT } from './game/MountainWorld';
import { SoundEngine } from './game/SoundEngine';
import {
  DEFAULT_ESSAY_QUESTIONS,
  buildStudentQuizDeck,
  clearCustomEssayFromStorage,
  clearCustomPgFromStorage,
  evaluateEssayAnswer,
  loadCustomEssayFromStorage,
  loadCustomPgFromStorage,
  saveCustomEssayToStorage,
  saveCustomPgToStorage,
} from './game/questions';
import { normalizeAvatarConfig, type R15JointRig } from './game/AvatarBuilder';
import { LobbyModal } from './components/LobbyModal';
import { GameHud } from './components/GameHud';
import { QuizModal } from './components/QuizModal';
import { SummitEssayModal } from './components/SummitEssayModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import {
  broadcastChannelEvent,
  buildExportRows,
  buildParticipantsSnapshot,
  computeRemainingSeconds,
  createRoomInSupabase,
  createRoomRealtimeChannel,
  fetchRoomFromSupabase,
  updateRoomConfigInSupabase,
  type EssayQuestionsUpdatedPayload,
  type KickStudentBroadcast,
  type PauseUpdatedPayload,
  type PlayerAvatarBroadcast,
  type PlayerEmoteBroadcast,
  type PlayerPoseBroadcast,
  type QuestionsUpdatedPayload,
  type RoomPresenceState,
  type RoomSettingsPayload,
  type SessionEndedBroadcast,
  type StudentProgressBroadcast,
  type TeacherEventBroadcast,
  type TimerSyncBroadcast,
  type TrackedStudentRecord,
} from './lib/supabaseRoom';
import {
  DEFAULT_STUDENT_AVATAR,
  DEFAULT_TEACHER_AVATAR,
  DIFFICULTY_LEVELS,
  EMOTE_ITEMS,
  type AnswerRecord,
  type AvatarConfig,
  type DisasterEventType,
  type EmoteType,
  type EssayAnswerRecord,
  type EssayQuestion,
  type ExportStudentRow,
  type HudSnapshot,
  type ParticipantSummary,
  type PublicRoomState,
  type QuizQuestion,
  type RemotePlayerPayload,
  type Role,
  type RoomSettings,
  type ShuffledQuestion,
  type StudentRestoreProgress,
  type SupabaseRoomConfig,
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
  const channelReadyRef = useRef(false);
  const roomConfigRef = useRef<SupabaseRoomConfig | null>(null);
  const studentRecordsRef = useRef<Map<string, TrackedStudentRecord>>(new Map());
  const remainingSecRef = useRef(20 * 60);
  const timeoutFallbackRef = useRef<number | null>(null);

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
  const [toastMsg, setToastMsg] = useState('');

  // In-game UI state
  const [inGame, setInGame] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [clientIdState, setClientIdState] = useState('');
  const [remainingSec, setRemainingSec] = useState(20 * 60);
  const [paused, setPaused] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionEndReason, setSessionEndReason] = useState<'teacher' | 'timeout'>('teacher');
  const [kickedMessage, setKickedMessage] = useState('');
  const [settings, setSettings] = useState<RoomSettings>({
    timeOfDay: 'pagi',
    weather: 'cerah',
    quizDuration: 30,
    difficultyLevel: 3,
    respawnMode: 'last_cp',
    pgWeight: 75,
    essayWeight: 25,
    sessionDurationMinutes: 20,
    explanationDurationSec: 45,
  });
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
  const [leaderboard, setLeaderboard] = useState<ParticipantSummary[]>([]);
  const [exportRows, setExportRows] = useState<ExportStudentRow[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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
    pos: new THREE.Vector3(0, 4.0, 1080),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    onGround: true,
    locomotionMode: 'walk' as 'walk' | 'climb' | 'slide',
    lastPoseState: 'idle' as 'idle' | 'walk' | 'jump' | 'climb' | 'slide' | 'hurt',
    walkAnimTime: 0,
    lastStepBeat: -1,
    lastLadderSoundAt: 0,
    hurtTimer: 0,
    lastGateWarnAt: 0,
    activeEmote: null as EmoteType | null,
    emoteTimer: 0,
    playerMesh: null as THREE.Group | null,
    headLamp: null as THREE.PointLight | null,
    camYaw: 0,
    camPitch: 0.34,
    camDist: 10.6,
    keys: {} as Record<string, boolean>,
    joyVec: { x: 0, y: 0 },
    nextLandslideIn: 14,
    nextGhostIn: 16,
    nextThunderIn: 10,
    nextMeteorIn: 8,
    nextQuakeIn: 34,
    nextWildfireIn: 38,
    lastNetSend: 0,
    lastHudSync: 0,
    lastQuizUiSync: 0,
    lastEssayUiSync: 0,
  });

  const warnTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToastSuccess = useCallback((text: string) => {
    setToastMsg(text);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg('');
    }, 4500);
  }, []);

  const showWarning = useCallback((text: string, sec = 3.0) => {
    setWarningText(text);
    if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
    warnTimerRef.current = window.setTimeout(() => {
      setWarningText('');
    }, sec * 1000);
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
    };
    localStorage.setItem(`wowo_peak_session_${g.roomCode}`, JSON.stringify(payload));
    localStorage.setItem('wowo_peak_last_room', g.roomCode);
  }, []);

  const clearStudentSession = useCallback((code: string) => {
    if (code) localStorage.removeItem(`wowo_peak_session_${code}`);
  }, []);

  const resetCameraBehindPlayer = useCallback(() => {
    gameRef.current.camYaw = 0;
    gameRef.current.camPitch = 0.34;
  }, []);

  const tryJump = useCallback(() => {
    const g = gameRef.current;
    if (!g.inGame || !g.onGround || g.paused || g.activeQuiz || g.essayActive || g.sessionEnded) {
      return;
    }
    g.vel.y = 11.4;
    g.onGround = false;
    soundRef.current?.playJump();
  }, []);

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

  // --- Parse URL params (?role=student&room=KODE) & check localStorage reconnect ---
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    const urlRoom = params.get('room');

    if (urlRole === 'student') {
      setLockedStudentMode(true);
      setRole('student');
    }

    const savedLobbyAvatar = loadSavedAvatar('student');
    if (savedLobbyAvatar) {
      setAvatar(savedLobbyAvatar);
    }

    const cleanRoom = urlRoom ? urlRoom.replace(/\D/g, '').slice(0, 5) : '';
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
      g.activeQuiz.explainTimeLeft = Math.min(60, Math.max(40, g.explanationDurationSec || 45));

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

      // Sync progress via Supabase Realtime Broadcast & Presence
      const selfRecord: TrackedStudentRecord = {
        id: g.clientId,
        name: g.name,
        avatar: g.avatar,
        currentCP: g.currentCP,
        completedCPs: [...g.completedCPs],
        score: g.score,
        correctCount: g.correctCount,
        wrongCount: g.wrongCount,
        essayCorrect: g.essayCorrect,
        essayWrong: g.essayWrong,
        essayDone: g.essayDone,
        fallCount: g.fallCount,
        answers: [...g.answers],
        essayAnswers: [...g.essayAnswers],
        online: true,
        pose: {
          x: Number(g.pos.x.toFixed(2)),
          y: Number(g.pos.y.toFixed(2)),
          z: Number(g.pos.z.toFixed(2)),
          yaw: Number(g.yaw.toFixed(2)),
          cp: g.currentCP,
          state: g.lastPoseState,
        },
      };
      studentRecordsRef.current.set(g.clientId, selfRecord);
      setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));

      if (channelRef.current && channelReadyRef.current) {
        void broadcastChannelEvent<StudentProgressBroadcast>(
          channelRef.current,
          'student_progress',
          {
            id: g.clientId,
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
            newAnswer,
          },
        );
        void channelRef.current.track({
          id: g.clientId,
          role: 'student',
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
          pose: selfRecord.pose,
        } satisfies RoomPresenceState);
      }
    },
    [saveStudentSession],
  );

  const openCheckpointQuiz = useCallback((cpIndex: number) => {
    const g = gameRef.current;
    if (g.activeQuiz || g.essayActive || g.role !== 'student') return;
    const qObj = g.studentDeck[cpIndex - 1];
    if (!qObj) return;

    soundRef.current?.playCheckpoint();
    g.vel.set(0, 0, 0);

    const quizObj: ActiveQuizState = {
      cpIndex,
      question: qObj,
      timeLeft: g.quizDuration,
      totalDuration: g.quizDuration,
      answered: false,
      chosenLetter: null,
      startTimeMs: performance.now(),
      explainTimeLeft: Math.min(60, Math.max(40, g.explanationDurationSec || 45)),
    };
    g.activeQuiz = quizObj;
    setActiveQuiz({ ...quizObj });
  }, []);

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
      showWarning(
        'SELAMAT! Seluruh 25 Kuis PG & 5 Ujian Puncak Mount WOWO berhasil dituntaskan!',
        5.5,
      );
    } else {
      const dur = Math.min(60, Math.max(40, g.explanationDurationSec || 45));
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
    const questions =
      g.essayQuestions && g.essayQuestions.length > 0
        ? g.essayQuestions
        : DEFAULT_ESSAY_QUESTIONS;
    const startIdx = Math.min(questions.length - 1, g.essayAnswers.length);
    soundRef.current?.playCheckpoint();
    g.vel.set(0, 0, 0);
    g.essayActive = true;
    g.essayFeedbackOpen = false;
    g.essayExplainLeft = 0;
    g.essayIsLastPending = false;
    setActiveEssayModal({
      questions,
      currentIndex: startIdx,
      startTimeMs: performance.now(),
      explainTimeLeft: Math.min(60, Math.max(40, g.explanationDurationSec || 45)),
      feedback: null,
    });
  }, []);

  const submitSummitEssayAnswer = useCallback(
    (rawInput: string) => {
      const g = gameRef.current;
      setActiveEssayModal((prev) => {
        if (!prev || prev.feedback) return prev;
        const q = prev.questions[prev.currentIndex];
        if (!q) return prev;

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

        const selfRecord: TrackedStudentRecord = {
          id: g.clientId,
          name: g.name,
          avatar: g.avatar,
          currentCP: g.currentCP,
          completedCPs: [...g.completedCPs],
          score: g.score,
          correctCount: g.correctCount,
          wrongCount: g.wrongCount,
          essayCorrect: g.essayCorrect,
          essayWrong: g.essayWrong,
          essayDone: isLast || g.essayDone,
          fallCount: g.fallCount,
          answers: [...g.answers],
          essayAnswers: [...g.essayAnswers],
          online: true,
          pose: {
            x: Number(g.pos.x.toFixed(2)),
            y: Number(g.pos.y.toFixed(2)),
            z: Number(g.pos.z.toFixed(2)),
            yaw: Number(g.yaw.toFixed(2)),
            cp: g.currentCP,
            state: g.lastPoseState,
          },
        };
        studentRecordsRef.current.set(g.clientId, selfRecord);
        setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));

        if (channelRef.current && channelReadyRef.current) {
          void broadcastChannelEvent<StudentProgressBroadcast>(
            channelRef.current,
            'student_progress',
            {
              id: g.clientId,
              name: g.name,
              avatar: g.avatar,
              currentCP: g.currentCP,
              completedCPs: g.completedCPs,
              score: g.score,
              correctCount: g.correctCount,
              wrongCount: g.wrongCount,
              essayCorrect: g.essayCorrect,
              essayWrong: g.essayWrong,
              essayDone: isLast || g.essayDone,
              fallCount: g.fallCount,
              newEssayAnswer,
            },
          );
          void channelRef.current.track({
            id: g.clientId,
            role: 'student',
            name: g.name,
            avatar: g.avatar,
            currentCP: g.currentCP,
            completedCPs: g.completedCPs,
            score: g.score,
            correctCount: g.correctCount,
            wrongCount: g.wrongCount,
            essayCorrect: g.essayCorrect,
            essayWrong: g.essayWrong,
            essayDone: isLast || g.essayDone,
            fallCount: g.fallCount,
            pose: selfRecord.pose,
          } satisfies RoomPresenceState);
        }

        const explainDur = Math.min(60, Math.max(40, g.explanationDurationSec || 45));
        g.essayFeedbackOpen = true;
        g.essayExplainLeft = explainDur;
        g.essayIsLastPending = isLast;

        return {
          ...prev,
          explainTimeLeft: explainDur,
          feedback: {
            studentAnswer: rawInput.trim(),
            isCorrect,
            correctKey: q.rawKey,
            explanation: q.explanation,
          },
        };
      });
    },
    [saveStudentSession],
  );

  const triggerStudentFall = useCallback(
    (reasonText: string) => {
      const g = gameRef.current;
      const world = worldRef.current;
      if (g.role !== 'student' || !world) return;

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

      const safeCP = CP_POINTS[Math.min(25, Math.max(0, targetCpIdx))];
      g.pos.set(safeCP.x, world.getGroundHeight(safeCP.x, safeCP.z) + 0.5, safeCP.z);
      g.vel.set(0, 0, 0);

      saveStudentSession();

      const existing = studentRecordsRef.current.get(g.clientId);
      if (existing) {
        existing.fallCount = g.fallCount;
        setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));
      }

      if (channelRef.current && channelReadyRef.current) {
        void broadcastChannelEvent<StudentProgressBroadcast>(
          channelRef.current,
          'student_progress',
          {
            id: g.clientId,
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
          },
        );
        void channelRef.current.track({
          id: g.clientId,
          role: 'student',
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
          pose: {
            x: Number(g.pos.x.toFixed(2)),
            y: Number(g.pos.y.toFixed(2)),
            z: Number(g.pos.z.toFixed(2)),
            yaw: Number(g.yaw.toFixed(2)),
            cp: g.currentCP,
            state: g.lastPoseState,
          },
        } satisfies RoomPresenceState);
      }
    },
    [saveStudentSession, showWarning],
  );

  const applyRoomSettings = useCallback(
    (s: RoomSettings) => {
      if (!s) return;
      const normalized: RoomSettings = {
        timeOfDay: s.timeOfDay || 'pagi',
        weather: s.weather || 'cerah',
        quizDuration: s.quizDuration || 30,
        difficultyLevel: s.difficultyLevel || 3,
        respawnMode: s.respawnMode || 'last_cp',
        pgWeight: s.pgWeight || 75,
        essayWeight: s.essayWeight || 25,
        sessionDurationMinutes: s.sessionDurationMinutes || 20,
        explanationDurationSec: s.explanationDurationSec || 45,
      };
      setSettings(normalized);
      gameRef.current.quizDuration = normalized.quizDuration;
      gameRef.current.explanationDurationSec = normalized.explanationDurationSec;
      gameRef.current.respawnMode = normalized.respawnMode;
      const world = worldRef.current;
      if (world) {
        world.applyEnvironment(normalized.timeOfDay, normalized.weather);
        world.setDifficultyLevel(normalized.difficultyLevel);
      }
      syncHeadlampIntensity();
    },
    [syncHeadlampIntensity],
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
      const targetPos = new THREE.Vector3(p.pose?.x ?? 0, p.pose?.y ?? 4.0, p.pose?.z ?? 1080);
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
      g.paused = Boolean(roomState.paused);
      g.essayQuestions =
        essayQuestionsFromServer && essayQuestionsFromServer.length > 0
          ? essayQuestionsFromServer
          : DEFAULT_ESSAY_QUESTIONS;

      setInGame(true);
      setRoomCode(roomState.roomCode);
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
      }
      g.playerMesh = world.createAvatarMesh(g.avatar, g.name, g.role, g.currentCP, g.score, true);
      g.headLamp = new THREE.PointLight('#fef08a', 0, 26);
      g.headLamp.position.set(0, 2.3, -0.4);
      g.playerMesh.add(g.headLamp);
      world.scene.add(g.playerMesh);

      const spawnCP = CP_POINTS[Math.min(25, Math.max(0, g.currentCP))];
      g.pos.set(spawnCP.x, world.getGroundHeight(spawnCP.x, spawnCP.z), spawnCP.z);
      g.vel.set(0, 0, 0);
      resetCameraBehindPlayer();

      world.updateCpGatesForRole(g.role, g.currentCP, g.completedCPs);
      applyRoomSettings(roomState.settings);
    },
    [applyRoomSettings, resetCameraBehindPlayer, saveStudentSession],
  );

  const handleTeacherEvent = useCallback(
    (eventType: string) => {
      const g = gameRef.current;
      const world = worldRef.current;
      if (g.paused || !world) return;

      if (eventType === 'thunder') {
        triggerLightningFlash();
        if (g.role === 'student') {
          showWarning('AWAS BADAI PETIR MENYAMBAR JALUR DEPAN!', 3.2);
          world.spawnLightningStrikeAhead(g.pos.x, g.pos.z);
        }
        return;
      }
      if (g.role === 'teacher') {
        showWarning(`Bencana/Event "${eventType}" dipicu ke seluruh siswa!`, 2.2);
        return;
      }

      const lvl = DIFFICULTY_LEVELS[world.difficultyLevel] || DIFFICULTY_LEVELS[3];
      if (eventType === 'landslide') {
        showWarning(`AWAS TANAH LONGSOR BESAR! (${lvl.warnSec} dtk)`, lvl.warnSec);
        soundRef.current?.playLandslide();
        window.setTimeout(() => {
          if (!gameRef.current.paused && !gameRef.current.sessionEnded && worldRef.current) {
            worldRef.current.spawnLandslideAhead(gameRef.current.pos.x, gameRef.current.pos.z);
          }
        }, Math.min(2000, lvl.warnSec * 250));
      } else if (eventType === 'kuntilanak') {
        showWarning('Kuntilanak muncul tepat di jalur depan!', 3.2);
        soundRef.current?.playKuntilanakLaugh();
        const ahead = world.getTrailPointAhead(g.pos.x, g.pos.z, 17);
        world.spawnKuntilanak(ahead.x, ahead.z);
      } else if (eventType === 'pocong') {
        showWarning('Pocong melompat menghadang jalur di depan!', 3.0);
        const ahead = world.getTrailPointAhead(g.pos.x, g.pos.z, 16);
        world.spawnPocong(ahead.x, ahead.z, ahead.tx, ahead.tz);
      } else if (eventType === 'earthquake') {
        showWarning(`GEMPA BUMI GUNUNG WOWO! Jaga keseimbangan!`, lvl.quakeDuration);
        soundRef.current?.playEarthquake(lvl.quakeDuration);
        world.triggerEarthquake(g.pos.x, g.pos.z);
      } else if (eventType === 'wildfire') {
        showWarning('KEBAKARAN HUTAN DI JALUR PENDAKIAN! Lompati api!', 3.8);
        soundRef.current?.playWildfireCrackle();
        world.triggerWildfire(g.pos.x, g.pos.z);
      } else if (eventType === 'meteor') {
        showWarning('HUJAN METEOR API DARI LANGIT! Hindari lingkaran merah!', 3.2);
        world.spawnMeteorAhead(g.pos.x, g.pos.z);
      }
    },
    [showWarning, triggerLightningFlash],
  );

  const cleanupChannel = useCallback(() => {
    channelReadyRef.current = false;
    if (timeoutFallbackRef.current) {
      window.clearTimeout(timeoutFallbackRef.current);
      timeoutFallbackRef.current = null;
    }
    if (channelRef.current && supabase) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const applySessionEnded = useCallback(
    (
      reason: 'teacher' | 'timeout',
      nextLeaderboard?: ParticipantSummary[],
      nextExportRows?: ExportStudentRow[],
    ) => {
      const g = gameRef.current;
      if (g.sessionEnded) return;
      g.sessionEnded = true;
      g.paused = true;
      g.activeQuiz = null;
      g.essayActive = false;
      g.essayFeedbackOpen = false;
      g.essayExplainLeft = 0;
      g.essayIsLastPending = false;
      remainingSecRef.current = 0;

      const finalLeaderboard =
        nextLeaderboard && nextLeaderboard.length > 0
          ? nextLeaderboard
          : buildParticipantsSnapshot(studentRecordsRef.current);
      const finalExportRows =
        nextExportRows && nextExportRows.length > 0
          ? nextExportRows
          : buildExportRows(studentRecordsRef.current);

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

  const buildCurrentPresencePayload = useCallback((): RoomPresenceState => {
    const g = gameRef.current;
    return {
      id: g.clientId,
      role: g.role,
      name: g.name,
      avatar: g.avatar,
      currentCP: g.currentCP,
      completedCPs: [...g.completedCPs],
      score: g.score,
      correctCount: g.correctCount,
      wrongCount: g.wrongCount,
      essayCorrect: g.essayCorrect,
      essayWrong: g.essayWrong,
      essayDone: g.essayDone,
      fallCount: g.fallCount,
      pose: {
        x: Number(g.pos.x.toFixed(2)),
        y: Number(g.pos.y.toFixed(2)),
        z: Number(g.pos.z.toFixed(2)),
        yaw: Number(g.yaw.toFixed(2)),
        cp: g.currentCP,
        state: g.lastPoseState,
      },
    };
  }, []);

  const subscribeToRoomChannel = useCallback(
    (code: string) => {
      cleanupChannel();
      const g = gameRef.current;
      const channel = createRoomRealtimeChannel(code, g.clientId);
      channelRef.current = channel;

      const syncFromPresence = () => {
        const stateMap = channel.presenceState<RoomPresenceState>();
        const activeIds = new Set<string>();

        for (const rec of studentRecordsRef.current.values()) {
          rec.online = false;
        }

        Object.values(stateMap).forEach((entries) => {
          entries.forEach((p) => {
            if (!p || !p.id) return;
            activeIds.add(p.id);

            if (p.id !== gameRef.current.clientId) {
              upsertRemotePlayer({
                id: p.id,
                role: p.role,
                name: p.name,
                avatar: p.avatar,
                currentCP: p.currentCP || 0,
                score: p.score || 0,
                pose: p.pose || { x: 0, y: 4.0, z: 1080, yaw: 0, state: 'idle' },
              });
            }

            if (p.role === 'student') {
              const prev = studentRecordsRef.current.get(p.id);
              const nextRec: TrackedStudentRecord = {
                id: p.id,
                name: p.name || prev?.name || 'Pendaki',
                avatar: normalizeAvatarConfig(p.avatar || prev?.avatar, 'student'),
                currentCP: Math.max(prev?.currentCP ?? 0, p.currentCP ?? 0),
                completedCPs:
                  (p.completedCPs?.length || 0) >= (prev?.completedCPs?.length || 0)
                    ? p.completedCPs || []
                    : prev?.completedCPs || [],
                score: Math.max(prev?.score ?? 0, p.score ?? 0),
                correctCount: Math.max(prev?.correctCount ?? 0, p.correctCount ?? 0),
                wrongCount: Math.max(prev?.wrongCount ?? 0, p.wrongCount ?? 0),
                essayCorrect: Math.max(prev?.essayCorrect ?? 0, p.essayCorrect ?? 0),
                essayWrong: Math.max(prev?.essayWrong ?? 0, p.essayWrong ?? 0),
                essayDone: Boolean(prev?.essayDone || p.essayDone),
                fallCount: Math.max(prev?.fallCount ?? 0, p.fallCount ?? 0),
                answers: prev?.answers || [],
                essayAnswers: prev?.essayAnswers || [],
                online: true,
                pose: p.pose || prev?.pose || { x: 0, y: 4.0, z: 1080, yaw: 0, state: 'idle' },
              };
              studentRecordsRef.current.set(p.id, nextRec);
            }
          });
        });

        const world = worldRef.current;
        if (world) {
          for (const remoteId of Array.from(world.remotePlayers.keys())) {
            if (!activeIds.has(remoteId)) {
              removeRemotePlayer(remoteId);
            }
          }
        }

        setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));
      };

      channel.on('presence', { event: 'sync' }, syncFromPresence);

      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        const joinedTeacher = (newPresences as unknown as RoomPresenceState[]).some(
          (p) => p?.role === 'teacher',
        );
        const joinedStudent = (newPresences as unknown as RoomPresenceState[]).some(
          (p) => p?.role === 'student',
        );

        // When teacher joins/reconnects, students share full answer records so Excel export stays complete
        if (gameRef.current.role === 'student' && joinedTeacher) {
          const cur = gameRef.current;
          void broadcastChannelEvent<StudentProgressBroadcast>(channel, 'student_progress', {
            id: cur.clientId,
            name: cur.name,
            avatar: cur.avatar,
            currentCP: cur.currentCP,
            completedCPs: cur.completedCPs,
            score: cur.score,
            correctCount: cur.correctCount,
            wrongCount: cur.wrongCount,
            essayCorrect: cur.essayCorrect,
            essayWrong: cur.essayWrong,
            essayDone: cur.essayDone,
            fallCount: cur.fallCount,
            answers: cur.answers,
            essayAnswers: cur.essayAnswers,
          });
        }

        // When a student joins, teacher broadcasts authoritative timer & active room settings
        if (gameRef.current.role === 'teacher' && joinedStudent && roomConfigRef.current) {
          void broadcastChannelEvent<TimerSyncBroadcast>(channel, 'timer_sync', {
            remainingSec: Math.max(0, Math.round(remainingSecRef.current)),
            sessionDurationMinutes: roomConfigRef.current.settings.sessionDurationMinutes,
            paused: gameRef.current.paused,
          });
          void broadcastChannelEvent<RoomSettingsPayload>(channel, 'settings_updated', {
            settings: roomConfigRef.current.settings,
          });
        }
      });

      channel.on('broadcast', { event: 'player_pose' }, ({ payload }) => {
        const p = payload as PlayerPoseBroadcast;
        if (!p || !p.id || p.id === gameRef.current.clientId) return;

        const existingRecord = studentRecordsRef.current.get(p.id);
        const resolvedAvatar = p.avatar || existingRecord?.avatar;
        if (resolvedAvatar) {
          upsertRemotePlayer({
            id: p.id,
            role: p.role,
            name: p.name || existingRecord?.name || 'Pendaki',
            avatar: resolvedAvatar,
            currentCP: p.currentCP || 0,
            score: p.score || 0,
            pose: p.pose,
          });
        } else {
          const entry = worldRef.current?.remotePlayers.get(p.id);
          if (entry) {
            upsertRemotePlayer({
              id: p.id,
              role: p.role,
              name: entry.name,
              avatar: entry.avatar,
              currentCP: p.currentCP || 0,
              score: p.score || 0,
              pose: p.pose,
            });
          }
        }

        if (p.role === 'student' && existingRecord && p.pose) {
          existingRecord.pose = p.pose;
        }
      });

      channel.on('broadcast', { event: 'player_avatar' }, ({ payload }) => {
        const msg = payload as PlayerAvatarBroadcast;
        const world = worldRef.current;
        if (!world || !msg?.id || !msg?.avatar || msg.id === gameRef.current.clientId) return;

        const normalized = normalizeAvatarConfig(msg.avatar, msg.role);
        const rec = studentRecordsRef.current.get(msg.id);
        if (rec) {
          rec.avatar = normalized;
        }

        const entry = world.remotePlayers.get(msg.id);
        if (entry) {
          entry.avatar = normalized;
          const pos = entry.mesh.position.clone();
          const rotY = entry.mesh.rotation.y;
          world.scene.remove(entry.mesh);
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
      });

      channel.on('broadcast', { event: 'player_emote' }, ({ payload }) => {
        const msg = payload as PlayerEmoteBroadcast;
        const world = worldRef.current;
        if (!world || !msg?.id || !msg?.emote || msg.id === gameRef.current.clientId) return;
        const entry = world.remotePlayers.get(msg.id);
        if (entry) {
          entry.activeEmote = msg.emote;
          entry.emoteTimer = 3.2;
          world.showAvatarEmote(entry.mesh, entry.activeEmote);
        }
      });

      channel.on('broadcast', { event: 'student_progress' }, ({ payload }) => {
        const msg = payload as StudentProgressBroadcast;
        if (!msg || !msg.id) return;

        const prev = studentRecordsRef.current.get(msg.id);
        const mergedAnswers = Array.isArray(msg.answers)
          ? msg.answers
          : [...(prev?.answers || [])];
        if (msg.newAnswer && !mergedAnswers.some((a) => a.cp === msg.newAnswer!.cp)) {
          mergedAnswers.push(msg.newAnswer);
        }

        const mergedEssayAnswers = Array.isArray(msg.essayAnswers)
          ? msg.essayAnswers
          : [...(prev?.essayAnswers || [])];
        if (msg.newEssayAnswer) {
          const idx = mergedEssayAnswers.findIndex((e) => e.no === msg.newEssayAnswer!.no);
          if (idx >= 0) mergedEssayAnswers[idx] = msg.newEssayAnswer;
          else mergedEssayAnswers.push(msg.newEssayAnswer);
        }

        const nextRec: TrackedStudentRecord = {
          id: msg.id,
          name: msg.name || prev?.name || 'Pendaki',
          avatar: normalizeAvatarConfig(msg.avatar || prev?.avatar, 'student'),
          currentCP: Math.max(prev?.currentCP ?? 0, msg.currentCP ?? 0),
          completedCPs:
            (msg.completedCPs?.length || 0) >= (prev?.completedCPs?.length || 0)
              ? msg.completedCPs || []
              : prev?.completedCPs || [],
          score: Math.max(prev?.score ?? 0, msg.score ?? 0),
          correctCount: Math.max(prev?.correctCount ?? 0, msg.correctCount ?? 0),
          wrongCount: Math.max(prev?.wrongCount ?? 0, msg.wrongCount ?? 0),
          essayCorrect: Math.max(prev?.essayCorrect ?? 0, msg.essayCorrect ?? 0),
          essayWrong: Math.max(prev?.essayWrong ?? 0, msg.essayWrong ?? 0),
          essayDone: Boolean(prev?.essayDone || msg.essayDone),
          fallCount: Math.max(prev?.fallCount ?? 0, msg.fallCount ?? 0),
          answers: mergedAnswers,
          essayAnswers: mergedEssayAnswers,
          online: true,
          pose: prev?.pose || { x: 0, y: 4.0, z: 1080, yaw: 0, state: 'idle' },
        };
        studentRecordsRef.current.set(msg.id, nextRec);
        setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));

        if (msg.id !== gameRef.current.clientId) {
          const entry = worldRef.current?.remotePlayers.get(msg.id);
          if (entry && worldRef.current) {
            entry.cp = nextRec.currentCP;
            entry.score = nextRec.score;
            worldRef.current.updateNameSprite(
              entry.mesh.userData.tagSprite as THREE.Sprite,
              entry.name,
              entry.role,
              entry.cp,
              entry.score,
            );
          }
        }
      });

      channel.on('broadcast', { event: 'settings_updated' }, ({ payload }) => {
        const msg = payload as RoomSettingsPayload;
        if (msg?.settings) {
          applyRoomSettings(msg.settings);
        }
      });

      channel.on('broadcast', { event: 'questions_updated' }, ({ payload }) => {
        const msg = payload as QuestionsUpdatedPayload;
        const cur = gameRef.current;
        setQuestionCount(
          Array.isArray(msg?.questions) && msg.questions.length > 0 ? msg.questions.length : 25,
        );
        if (cur.role === 'student') {
          cur.studentDeck = buildStudentQuizDeck(msg?.questions ?? null, cur.roomCode, cur.clientId);
          showWarning('Bank soal PG diperbarui oleh Guru!', 2.5);
        }
      });

      channel.on('broadcast', { event: 'essay_questions_updated' }, ({ payload }) => {
        const msg = payload as EssayQuestionsUpdatedPayload;
        const list =
          Array.isArray(msg?.essayQuestions) && msg.essayQuestions.length > 0
            ? msg.essayQuestions
            : DEFAULT_ESSAY_QUESTIONS;
        gameRef.current.essayQuestions = list;
        setEssayQuestionCount(list.length);
        if (gameRef.current.role === 'student') {
          showWarning('Soal Isian Singkat Puncak diperbarui oleh Guru!', 2.5);
        }
      });

      channel.on('broadcast', { event: 'pause_updated' }, ({ payload }) => {
        const msg = payload as PauseUpdatedPayload;
        gameRef.current.paused = Boolean(msg?.paused);
        setPaused(gameRef.current.paused);
        if (typeof msg?.remainingSec === 'number') {
          const rem = Math.max(0, Math.round(msg.remainingSec));
          remainingSecRef.current = rem;
          setRemainingSec(rem);
        }
      });

      channel.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
        const msg = payload as TimerSyncBroadcast;
        if (typeof msg?.remainingSec === 'number') {
          const rem = Math.max(0, Math.round(msg.remainingSec));
          remainingSecRef.current = rem;
          setRemainingSec(rem);
          if (rem > 0 && timeoutFallbackRef.current) {
            window.clearTimeout(timeoutFallbackRef.current);
            timeoutFallbackRef.current = null;
          }
        }
        if (typeof msg?.paused === 'boolean') {
          gameRef.current.paused = msg.paused;
          setPaused(msg.paused);
        }
      });

      channel.on('broadcast', { event: 'teacher_event' }, ({ payload }) => {
        const msg = payload as TeacherEventBroadcast;
        if (msg?.eventType) {
          handleTeacherEvent(msg.eventType);
        }
      });

      channel.on('broadcast', { event: 'kick_student' }, ({ payload }) => {
        const msg = payload as KickStudentBroadcast;
        if (!msg?.studentId) return;

        if (gameRef.current.role === 'student' && msg.studentId === gameRef.current.clientId) {
          gameRef.current.sessionEnded = true;
          setSessionEnded(true);
          clearStudentSession(gameRef.current.roomCode);
          cleanupChannel();
          setKickedMessage(msg.message || 'Anda telah dikeluarkan dari kelas oleh Guru.');
        } else {
          removeRemotePlayer(msg.studentId);
          studentRecordsRef.current.delete(msg.studentId);
          setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));
        }
      });

      channel.on('broadcast', { event: 'session_ended' }, ({ payload }) => {
        const msg = payload as SessionEndedBroadcast;
        applySessionEnded(
          msg?.reason === 'timeout' ? 'timeout' : 'teacher',
          msg?.leaderboard,
          msg?.exportRows,
        );
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelReadyRef.current = true;
          const presencePayload = buildCurrentPresencePayload();
          void channel.track(presencePayload);

          if (gameRef.current.role === 'student') {
            const cur = gameRef.current;
            const selfRec: TrackedStudentRecord = {
              id: cur.clientId,
              name: cur.name,
              avatar: cur.avatar,
              currentCP: cur.currentCP,
              completedCPs: [...cur.completedCPs],
              score: cur.score,
              correctCount: cur.correctCount,
              wrongCount: cur.wrongCount,
              essayCorrect: cur.essayCorrect,
              essayWrong: cur.essayWrong,
              essayDone: cur.essayDone,
              fallCount: cur.fallCount,
              answers: [...cur.answers],
              essayAnswers: [...cur.essayAnswers],
              online: true,
              pose: presencePayload.pose,
            };
            studentRecordsRef.current.set(cur.clientId, selfRec);
            setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));

            void broadcastChannelEvent<StudentProgressBroadcast>(channel, 'student_progress', {
              id: cur.clientId,
              name: cur.name,
              avatar: cur.avatar,
              currentCP: cur.currentCP,
              completedCPs: cur.completedCPs,
              score: cur.score,
              correctCount: cur.correctCount,
              wrongCount: cur.wrongCount,
              essayCorrect: cur.essayCorrect,
              essayWrong: cur.essayWrong,
              essayDone: cur.essayDone,
              fallCount: cur.fallCount,
              answers: cur.answers,
              essayAnswers: cur.essayAnswers,
            });
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          channelReadyRef.current = false;
          if (gameRef.current.inGame && !gameRef.current.sessionEnded) {
            showWarning('Koneksi Realtime Supabase terganggu. Mencoba menyambung ulang...', 3.0);
          }
        }
      });
    },
    [
      applyRoomSettings,
      applySessionEnded,
      buildCurrentPresencePayload,
      cleanupChannel,
      clearStudentSession,
      handleTeacherEvent,
      removeRemotePlayer,
      showWarning,
      upsertRemotePlayer,
    ],
  );

  // Authoritative Session Countdown Timer (Teacher syncs over channel, Student ticks smoothly)
  useEffect(() => {
    if (!inGame || paused || sessionEnded) return;

    const intervalId = window.setInterval(() => {
      const next = Math.max(0, remainingSecRef.current - 1);
      remainingSecRef.current = next;
      setRemainingSec(next);

      if (gameRef.current.role === 'teacher') {
        if (roomConfigRef.current) {
          roomConfigRef.current.remainingSec = next;
          roomConfigRef.current.sessionEndsAt = Date.now() + next * 1000;
        }
        if (channelRef.current && channelReadyRef.current && (next % 5 === 0 || next <= 10)) {
          void broadcastChannelEvent<TimerSyncBroadcast>(channelRef.current, 'timer_sync', {
            remainingSec: next,
            sessionDurationMinutes:
              roomConfigRef.current?.settings.sessionDurationMinutes || settings.sessionDurationMinutes,
            paused: false,
          });
        }
        if (next <= 0) {
          const leaderboardSnap = buildParticipantsSnapshot(studentRecordsRef.current);
          const exportSnap = buildExportRows(studentRecordsRef.current);
          if (roomConfigRef.current) {
            roomConfigRef.current.sessionEnded = true;
            roomConfigRef.current.paused = true;
            roomConfigRef.current.remainingSec = 0;
            roomConfigRef.current.sessionEndsAt = null;
            roomConfigRef.current.endReason = 'timeout';
            void updateRoomConfigInSupabase(gameRef.current.roomCode, roomConfigRef.current);
          }
          if (channelRef.current && channelReadyRef.current) {
            void broadcastChannelEvent<SessionEndedBroadcast>(channelRef.current, 'session_ended', {
              reason: 'timeout',
              leaderboard: leaderboardSnap,
              exportRows: exportSnap,
            });
          }
          applySessionEnded('timeout', leaderboardSnap, exportSnap);
        }
      } else if (next <= 0 && !timeoutFallbackRef.current) {
        // Fallback timeout lock if Teacher client disconnected right at 00:00
        timeoutFallbackRef.current = window.setTimeout(() => {
          timeoutFallbackRef.current = null;
          if (!gameRef.current.sessionEnded) {
            applySessionEnded('timeout');
          }
        }, 1500);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [applySessionEnded, inGame, paused, sessionEnded, settings.sessionDurationMinutes]);

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

        let isMoving = false;
        if (!g.paused && !g.activeQuiz && !g.essayActive && !g.sessionEnded) {
          // Camera controls: Arrow keys + Q/E
          if (g.keys['ArrowLeft'] || g.keys['KeyQ']) g.camYaw += 2.0 * dt;
          if (g.keys['ArrowRight'] || g.keys['KeyE']) g.camYaw -= 2.0 * dt;
          if (g.keys['ArrowUp']) g.camPitch = Math.min(1.12, g.camPitch + 1.35 * dt);
          if (g.keys['ArrowDown']) g.camPitch = Math.max(0.06, g.camPitch - 1.35 * dt);

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
              g.yaw = slideRes.yaw + Math.PI;
              g.vel.y = 0;
              g.onGround = true;
            } else {
              g.locomotionMode = 'walk';
              const speed = g.role === 'teacher' ? 68.0 : 26.5;
              const sinY = Math.sin(g.camYaw);
              const cosY = Math.cos(g.camYaw);
              const dirX = -sinY * moveForward + cosY * moveRight;
              const dirZ = -cosY * moveForward - sinY * moveRight;

              g.pos.x = Math.max(-1420, Math.min(1420, g.pos.x + dirX * speed * dt));
              g.pos.z = Math.max(-1420, Math.min(1420, g.pos.z + dirZ * speed * dt));

              if (isMoving) {
                g.yaw = Math.atan2(dirX, dirZ) + Math.PI;
                g.walkAnimTime += dt * 11.2;
                const beat = Math.floor(g.walkAnimTime / Math.PI);
                if (g.onGround && beat !== g.lastStepBeat) {
                  g.lastStepBeat = beat;
                  sound.playFootstep(world.getSurfaceTypeAt(g.pos.x, g.pos.z));
                }
              }

              // Wind zone sideways push for Students
              if (g.role === 'student') {
                world.applyWindPush(g.pos, dt, g.paused);
              }
            }
          }

          // Student-only Anti-Cheat: invisible trail side walls, CP energy gates, & sequential CP guard
          if (g.role === 'student') {
            const antiCheat = world.enforceStudentTrailAndGates(
              g.pos,
              g.currentCP,
              g.completedCPs,
            );
            if (antiCheat.skippedAheadCp !== null) {
              const safeCP = CP_POINTS[Math.min(25, Math.max(0, g.currentCP))];
              g.pos.set(safeCP.x, world.getGroundHeight(safeCP.x, safeCP.z) + 0.4, safeCP.z);
              g.vel.set(0, 0, 0);
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

          if (g.locomotionMode === 'walk') {
            const wasOnGround = g.onGround;
            const prevVy = g.vel.y;
            g.vel.y -= 26 * dt;
            g.pos.y += g.vel.y * dt;
            const groundY = world.getGroundHeight(g.pos.x, g.pos.z);
            if (g.pos.y <= groundY) {
              g.pos.y = groundY;
              g.vel.y = 0;
              g.onGround = true;
              if (!wasOnGround && prevVy < -3.5) {
                sound.playLand(
                  world.getSurfaceTypeAt(g.pos.x, g.pos.z),
                  Math.min(1.4, Math.abs(prevVy) / 14),
                );
              }
            } else {
              g.onGround = false;
            }
          }

          if (g.role === 'student') {
            const tr = world.getNearestTrailInfo(g.pos.x, g.pos.z);
            const maxW = world.getEffectiveTrailHalfWidth() + 6.5;
            const onBridge = world.getBridgeHeightAt(g.pos.x, g.pos.z) !== null;
            if (!onBridge && tr.dist > maxW && g.pos.y < tr.y - 16.0) {
              triggerStudentFall('Terjatuh dari tebing gunung! Kembali ke titik aman.');
            } else {
              const nextCP = g.currentCP + 1;
              if (nextCP <= 25 && !g.completedCPs.includes(nextCP)) {
                const cp = CP_POINTS[nextCP];
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
                if (
                  Math.hypot(g.pos.x - SUMMIT_EXAM_POINT.x, g.pos.z - SUMMIT_EXAM_POINT.z) < 9.5 &&
                  Math.abs(g.pos.y - SUMMIT_EXAM_POINT.y) < 8.0
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
            g.nextLandslideIn -= dt * lvl.rockRate;
            if (g.nextLandslideIn <= 0) {
              g.nextLandslideIn = 14 + Math.random() * 6;
              showWarning(`WASPADA TANAH LONGSOR & KAYU GELONDONGAN! (${lvl.warnSec} dtk)`, lvl.warnSec);
              sound.playLandslide();
              window.setTimeout(() => {
                if (!gameRef.current.paused && !gameRef.current.sessionEnded && gameRef.current.inGame) {
                  world.spawnLandslideAhead(gameRef.current.pos.x, gameRef.current.pos.z);
                }
              }, Math.min(2000, lvl.warnSec * 250));
            }

            if (world.difficultyLevel >= 4) {
              g.nextQuakeIn -= dt * lvl.rockRate;
              if (g.nextQuakeIn <= 0) {
                g.nextQuakeIn = 34 + Math.random() * 14;
                showWarning('GEMPA BUMI GUNUNG WOWO!', lvl.quakeDuration);
                sound.playEarthquake(lvl.quakeDuration);
                world.triggerEarthquake(g.pos.x, g.pos.z);
              }

              g.nextWildfireIn -= dt * lvl.rockRate;
              if (g.nextWildfireIn <= 0) {
                g.nextWildfireIn = 36 + Math.random() * 16;
                showWarning('KEBAKARAN HUTAN DI JALUR! Lompati kobaran api!', 3.2);
                sound.playWildfireCrackle();
                world.triggerWildfire(g.pos.x, g.pos.z);
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
                world.spawnKuntilanak(ahead.x, ahead.z);
              } else {
                world.spawnPocong(ahead.x, ahead.z, ahead.tx, ahead.tz);
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
        const remoteAlpha = 1 - Math.exp(-12 * dt);
        for (const rp of world.remotePlayers.values()) {
          const prevDist = rp.mesh.position.distanceTo(rp.targetPos);
          rp.mesh.position.lerp(rp.targetPos, remoteAlpha);
          rp.mesh.rotation.y = rp.targetYaw;
          const movingRemote = prevDist > 0.04;
          if (movingRemote) rp.walkPhase += dt * 11.2;
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
        const { hitBy, shakeIntensity } = world.updateVisuals(dt, elapsed, g.pos, sound, g.paused);
        if (hitBy && g.role === 'student' && !g.paused && !g.activeQuiz && !g.essayActive && !g.sessionEnded) {
          g.hurtTimer = 0.55;
          const messages: Record<string, string> = {
            kuntilanak: 'Terkena Kuntilanak! Kembali ke titik aman.',
            pocong: 'Tertabrak Pocong dan terdorong jatuh dari tebing!',
            landslide: 'Tertimpa batu tanah longsor! Kembali ke titik aman.',
            log: 'Terhantam kayu gelondongan bergulir! Kembali ke titik aman.',
            tiger: 'Diterjang Harimau Sumatera! Kembali ke titik aman.',
            bear: 'Diseruduk Beruang Madu! Kembali ke titik aman.',
            boar: 'Ditabrak Babi Hutan di jalur setapak!',
            snake: 'Dipatuk Ular Piton di tikungan berbatu!',
            bridge_plank: 'Terpeleset papan jembatan goyang!',
            crumble_stone: 'Batu pijakan runtuh di bawah kaki!',
            geyser: 'Tersembur uap panas Geyser Vulkanik!',
            lightning: 'Tersambar petir badai di jalur pendakian!',
            wildfire: 'Terkena kobaran api Kebakaran Hutan!',
            meteor: 'Dihantam meteor api dari langit kiamat! Kembali ke titik aman.',
          };
          triggerStudentFall(messages[hitBy] || 'Terkena rintangan gunung! Kembali ke titik aman.');
        }

        // Smooth Third-Person Chase Camera (+ Earthquake/Landslide Shake)
        _camTarget.set(g.pos.x, g.pos.y + 2.1, g.pos.z);
        const horiz = Math.cos(g.camPitch) * g.camDist;
        const vert = Math.sin(g.camPitch) * g.camDist;
        const cx = _camTarget.x + Math.sin(g.camYaw) * horiz;
        const cz = _camTarget.z + Math.cos(g.camYaw) * horiz;
        const groundAtCam = world.getGroundHeight(cx, cz);
        const cy = Math.max(groundAtCam + 1.25, _camTarget.y + vert);
        _camDesired.set(cx, cy, cz);
        world.camera.position.lerp(_camDesired, 1 - Math.exp(-9.5 * dt));
        if (shakeIntensity > 0) {
          world.camera.position.x += (Math.random() - 0.5) * shakeIntensity * 1.15;
          world.camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.85;
        }
        world.camera.lookAt(_camTarget.x, _camTarget.y + 0.55, _camTarget.z);

        // Ambient Nature Audio (Wind, River/Waterfall, Birds, Crickets) & Throttled HUD Sync
        const minY = 4.0;
        const maxY = SUMMIT_EXAM_POINT.y;
        const altPct = Math.max(0, Math.min(100, Math.round(((g.pos.y - minY) / (maxY - minY)) * 100)));
        sound.updateAmbience(
          altPct,
          world.weather,
          world.timeOfDay,
          world.getRiverProximity(g.pos.x, g.pos.z),
        );

        if (now - g.lastHudSync > 100) {
          g.lastHudSync = now;
          const nextIdx = g.currentCP >= 25 && !g.essayDone ? 26 : Math.min(25, g.currentCP + 1);
          const target = nextIdx >= 26 ? SUMMIT_EXAM_POINT : CP_POINTS[nextIdx];
          const dx = target.x - g.pos.x;
          const dz = target.z - g.pos.z;
          const dist = Math.round(Math.hypot(dx, dz));
          const elev = Math.max(0, Math.round(target.y - g.pos.y));
          const worldAngle = Math.atan2(dx, dz);
          const camLookAngle = g.camYaw + Math.PI;
          const relAngleDeg = THREE.MathUtils.radToDeg(camLookAngle - worldAngle);
          const radarData = world.collectRadarData(g.pos, g.camYaw, nextIdx);

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

        // Broadcast Player Pose via Supabase Realtime (~12 Hz)
        if (channelRef.current && channelReadyRef.current && now - g.lastNetSend > 85) {
          g.lastNetSend = now;
          void broadcastChannelEvent<PlayerPoseBroadcast>(channelRef.current, 'player_pose', {
            id: g.clientId,
            role: g.role,
            name: g.name,
            avatar: g.avatar,
            currentCP: g.currentCP,
            score: g.score,
            pose: {
              x: Number(g.pos.x.toFixed(2)),
              y: Number(g.pos.y.toFixed(2)),
              z: Number(g.pos.z.toFixed(2)),
              yaw: Number(g.yaw.toFixed(2)),
              cp: g.currentCP,
              state: g.lastPoseState,
            },
          });
        }
      } else {
        // Sweeping scenic camera over giant Mount Rinjani WOWO while in Lobby
        world.camera.position.set(Math.sin(elapsed * 0.08) * 420, 380, 1180);
        world.camera.lookAt(0, 260, -100);
        world.updateVisuals(dt, elapsed, _camTarget.set(0, 260, -100), sound, true);
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
        e.code === 'Space' &&
        gameRef.current.inGame &&
        !gameRef.current.activeQuiz &&
        !gameRef.current.essayActive &&
        !gameRef.current.paused
      ) {
        e.preventDefault();
        tryJump();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.code] = false;
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (!gameRef.current.inGame) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      gameRef.current.camYaw -= dx * 0.0055;
      gameRef.current.camPitch = Math.max(0.08, Math.min(1.05, gameRef.current.camPitch + dy * 0.0045));
    };
    const onPointerUp = () => {
      dragging = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    mountEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      mountEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cleanupChannel();
      world.dispose();
    };
  }, [
    advanceSummitEssay,
    cleanupChannel,
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

    const cleanName = sanitizeName(teacherName) || 'Guru Pemantau';
    const dur = Math.min(45, Math.max(15, Number(initQuizDuration) || 30));
    const durSession = [10, 15, 20, 25, 30].includes(Number(initSessionDuration))
      ? Number(initSessionDuration)
      : Math.min(30, Math.max(10, Number(initSessionDuration) || 20));
    const durExplain = Math.min(60, Math.max(40, Number(initExplanationDuration) || 45));

    const teacherId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const roomSettings: RoomSettings = {
      timeOfDay: 'pagi',
      weather: 'cerah',
      quizDuration: dur,
      sessionDurationMinutes: durSession,
      explanationDurationSec: durExplain,
      difficultyLevel: 3,
      respawnMode: 'last_cp',
      pgWeight: settings.pgWeight,
      essayWeight: settings.essayWeight,
    };

    const initialSec = durSession * 60;
    const roomConfig: SupabaseRoomConfig = {
      teacherId,
      teacherName: cleanName,
      teacherAvatar: { ...avatar },
      settings: roomSettings,
      paused: false,
      sessionEnded: false,
      remainingSec: initialSec,
      sessionEndsAt: Date.now() + initialSec * 1000,
      kickedIds: [],
      questions: customQuestions && customQuestions.length > 0 ? customQuestions : null,
      essayQuestions:
        customEssayQuestions && customEssayQuestions.length > 0 ? customEssayQuestions : null,
      createdAt: Date.now(),
    };

    setIsConnecting(true);
    setLobbyError('');
    try {
      const generatedCode = await createRoomInSupabase(roomConfig);

      const g = gameRef.current;
      g.role = 'teacher';
      g.name = cleanName;
      g.roomCode = generatedCode;
      g.avatar = { ...avatar };
      g.quizDuration = dur;
      g.explanationDurationSec = durExplain;
      g.clientId = teacherId;
      g.sessionEnded = false;
      g.paused = false;

      studentRecordsRef.current.clear();
      roomConfigRef.current = roomConfig;
      remainingSecRef.current = initialSec;

      setClientIdState(teacherId);
      setRole('teacher');

      const publicState: PublicRoomState = {
        roomCode: generatedCode,
        settings: roomSettings,
        paused: false,
        sessionEnded: false,
        remainingSec: initialSec,
        questionCount: roomConfig.questions ? roomConfig.questions.length : 25,
        essayQuestionCount: roomConfig.essayQuestions ? roomConfig.essayQuestions.length : 5,
        participants: [],
      };

      enterGameWorld(publicState, roomConfig.questions, roomConfig.essayQuestions);
      subscribeToRoomChannel(generatedCode);
      showToastSuccess(`Ruangan ${generatedCode} tersimpan di Supabase & siap digunakan!`);
    } catch (err) {
      setLobbyError(
        err instanceof Error ? err.message : 'Gagal membuat ruangan di Supabase.',
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinStudent = async () => {
    if (isConnecting) return;
    soundRef.current?.init();

    const cleanName = sanitizeName(studentName);
    const code = roomCodeInput.trim();
    if (!cleanName) {
      setLobbyError('Masukkan nama siswa terlebih dahulu.');
      return;
    }
    if (!/^\d{5}$/.test(code)) {
      setLobbyError('Masukkan kode ruangan 5 digit yang valid.');
      return;
    }

    setStudentName(cleanName);
    setLobbyError('');
    setIsConnecting(true);

    try {
      const found = await fetchRoomFromSupabase(code);
      if (!found) {
        setLobbyError(`Ruangan "${code}" tidak ditemukan atau sudah ditutup.`);
        return;
      }

      const cfg = found.config;
      const savedRaw = localStorage.getItem(`wowo_peak_session_${code}`);
      let saved: StudentRestoreProgress | null = null;
      if (savedRaw) {
        try {
          saved = JSON.parse(savedRaw);
        } catch {
          saved = null;
        }
      }

      const studentId =
        saved && saved.studentId
          ? saved.studentId
          : `stu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      if (Array.isArray(cfg.kickedIds) && cfg.kickedIds.includes(studentId)) {
        clearStudentSession(code);
        setKickedMessage('Anda telah dikeluarkan dari ruangan ini oleh Guru.');
        return;
      }

      if (cfg.sessionEnded) {
        setLobbyError(`Sesi kelas pada ruangan "${code}" sudah diakhiri oleh Guru.`);
        return;
      }

      const g = gameRef.current;
      g.role = 'student';
      g.name = cleanName;
      g.roomCode = code;
      g.avatar = { ...avatar };
      g.clientId = studentId;
      g.sessionEnded = false;
      g.paused = Boolean(cfg.paused);

      if (saved && saved.roomCode === code) {
        g.currentCP = Math.min(25, Math.max(0, saved.currentCP || 0));
        g.completedCPs = Array.isArray(saved.completedCPs) ? saved.completedCPs : [];
        g.score = saved.score || 0;
        g.correctCount = saved.correctCount || 0;
        g.wrongCount = saved.wrongCount || 0;
        g.essayCorrect = saved.essayCorrect || 0;
        g.essayWrong = saved.essayWrong || 0;
        g.essayDone = Boolean(saved.essayDone);
        g.fallCount = saved.fallCount || 0;
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

      studentRecordsRef.current.clear();
      const computedRem = computeRemainingSeconds(cfg);
      remainingSecRef.current = computedRem;

      setClientIdState(studentId);
      setRole('student');

      const publicState: PublicRoomState = {
        roomCode: code,
        settings: cfg.settings,
        paused: Boolean(cfg.paused),
        sessionEnded: Boolean(cfg.sessionEnded),
        remainingSec: computedRem,
        questionCount: cfg.questions && cfg.questions.length > 0 ? cfg.questions.length : 25,
        essayQuestionCount:
          cfg.essayQuestions && cfg.essayQuestions.length > 0 ? cfg.essayQuestions.length : 5,
        participants: [],
      };

      enterGameWorld(publicState, cfg.questions || null, cfg.essayQuestions || null);
      subscribeToRoomChannel(code);
    } catch (err) {
      setLobbyError(
        err instanceof Error ? err.message : 'Gagal terhubung ke ruangan Supabase.',
      );
    } finally {
      setIsConnecting(false);
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

    if (
      typeof partial.sessionDurationMinutes === 'number' &&
      partial.sessionDurationMinutes !== settings.sessionDurationMinutes &&
      !gameRef.current.sessionEnded
    ) {
      const nextMin = Math.min(30, Math.max(10, Math.round(partial.sessionDurationMinutes)));
      merged.sessionDurationMinutes = nextMin;
      const elapsed = Math.max(0, prevTotal - remainingSecRef.current);
      const nextRem = Math.max(15, nextMin * 60 - elapsed);
      remainingSecRef.current = nextRem;
      setRemainingSec(nextRem);

      if (roomConfigRef.current) {
        roomConfigRef.current.remainingSec = nextRem;
        roomConfigRef.current.sessionEndsAt = gameRef.current.paused
          ? null
          : Date.now() + nextRem * 1000;
      }

      if (channelRef.current && channelReadyRef.current) {
        void broadcastChannelEvent<TimerSyncBroadcast>(channelRef.current, 'timer_sync', {
          remainingSec: Math.round(nextRem),
          sessionDurationMinutes: nextMin,
          paused: gameRef.current.paused,
        });
      }
    }

    applyRoomSettings(merged);

    if (roomConfigRef.current) {
      roomConfigRef.current.settings = merged;
      void updateRoomConfigInSupabase(gameRef.current.roomCode, roomConfigRef.current);
    }
    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<RoomSettingsPayload>(channelRef.current, 'settings_updated', {
        settings: merged,
      });
    }
  };

  const handleUpdateInGameAvatar = (next: AvatarConfig) => {
    setAvatar(next);
    gameRef.current.avatar = { ...next };
    saveAvatarToStorage(gameRef.current.role, next);
    rebuildLocalPlayerMesh();
    saveStudentSession();

    const rec = studentRecordsRef.current.get(gameRef.current.clientId);
    if (rec) {
      rec.avatar = next;
    }

    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<PlayerAvatarBroadcast>(channelRef.current, 'player_avatar', {
        id: gameRef.current.clientId,
        role: gameRef.current.role,
        avatar: next,
      });
      void channelRef.current.track(buildCurrentPresencePayload());
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
    if (roomConfigRef.current) {
      roomConfigRef.current.questions = nextQuestions;
      void updateRoomConfigInSupabase(gameRef.current.roomCode, roomConfigRef.current);
    }
    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<QuestionsUpdatedPayload>(
        channelRef.current,
        'questions_updated',
        { questions: nextQuestions },
      );
    }
  };

  const handleUpdateEssayQuestions = (
    essayQuestions: EssayQuestion[] | null,
    fileName = '',
  ) => {
    handleLobbyCustomEssayChange(essayQuestions, fileName);
    if (gameRef.current.role !== 'teacher') return;
    const nextEssay = essayQuestions && essayQuestions.length > 0 ? essayQuestions : null;
    if (roomConfigRef.current) {
      roomConfigRef.current.essayQuestions = nextEssay;
      void updateRoomConfigInSupabase(gameRef.current.roomCode, roomConfigRef.current);
    }
    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<EssayQuestionsUpdatedPayload>(
        channelRef.current,
        'essay_questions_updated',
        { essayQuestions: nextEssay },
      );
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
    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<PlayerEmoteBroadcast>(channelRef.current, 'player_emote', {
        id: g.clientId,
        emote,
      });
    }
  };

  const handleTeleport = (cpIndex: number) => {
    const g = gameRef.current;
    const world = worldRef.current;
    if (g.role !== 'teacher' || !world) return;
    const cp = cpIndex >= 26 ? SUMMIT_EXAM_POINT : CP_POINTS[Math.min(25, Math.max(0, cpIndex))];
    g.currentCP = cp.index;
    g.pos.set(cp.x, world.getGroundHeight(cp.x, cp.z), cp.z);
    g.vel.set(0, 0, 0);
    setCurrentCP(Math.min(25, cp.index));
    resetCameraBehindPlayer();
  };

  const handleTriggerEvent = (eventType: DisasterEventType) => {
    if (gameRef.current.role !== 'teacher') return;
    handleTeacherEvent(eventType);
    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<TeacherEventBroadcast>(channelRef.current, 'teacher_event', {
        eventType,
      });
    }
  };

  const handleTogglePause = () => {
    if (gameRef.current.role !== 'teacher') return;
    const nextPaused = !paused;
    gameRef.current.paused = nextPaused;
    setPaused(nextPaused);

    const rem = Math.max(0, Math.round(remainingSecRef.current));
    if (roomConfigRef.current) {
      roomConfigRef.current.paused = nextPaused;
      roomConfigRef.current.remainingSec = rem;
      roomConfigRef.current.sessionEndsAt = nextPaused ? null : Date.now() + rem * 1000;
      void updateRoomConfigInSupabase(gameRef.current.roomCode, roomConfigRef.current);
    }

    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<PauseUpdatedPayload>(channelRef.current, 'pause_updated', {
        paused: nextPaused,
        remainingSec: rem,
      });
      void broadcastChannelEvent<TimerSyncBroadcast>(channelRef.current, 'timer_sync', {
        remainingSec: rem,
        sessionDurationMinutes: settings.sessionDurationMinutes,
        paused: nextPaused,
      });
    }
  };

  const handleKickStudent = (studentId: string, name: string) => {
    if (gameRef.current.role !== 'teacher') return;

    if (roomConfigRef.current) {
      const prevKicked = roomConfigRef.current.kickedIds || [];
      if (!prevKicked.includes(studentId)) {
        roomConfigRef.current.kickedIds = [...prevKicked, studentId];
        void updateRoomConfigInSupabase(gameRef.current.roomCode, roomConfigRef.current);
      }
    }

    removeRemotePlayer(studentId);
    studentRecordsRef.current.delete(studentId);
    setParticipants(buildParticipantsSnapshot(studentRecordsRef.current));

    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<KickStudentBroadcast>(channelRef.current, 'kick_student', {
        studentId,
        message: 'Anda telah dikeluarkan dari kelas oleh Guru.',
      });
    }
    showWarning(`Siswa "${name}" dikeluarkan dari ruangan.`, 2.4);
  };

  const handleEndSession = () => {
    if (gameRef.current.role !== 'teacher') return;
    const leaderboardSnap = buildParticipantsSnapshot(studentRecordsRef.current);
    const exportSnap = buildExportRows(studentRecordsRef.current);

    if (roomConfigRef.current) {
      roomConfigRef.current.sessionEnded = true;
      roomConfigRef.current.paused = true;
      roomConfigRef.current.remainingSec = 0;
      roomConfigRef.current.sessionEndsAt = null;
      roomConfigRef.current.endReason = 'teacher';
      void updateRoomConfigInSupabase(gameRef.current.roomCode, roomConfigRef.current);
    }

    if (channelRef.current && channelReadyRef.current) {
      void broadcastChannelEvent<SessionEndedBroadcast>(channelRef.current, 'session_ended', {
        reason: 'teacher',
        leaderboard: leaderboardSnap,
        exportRows: exportSnap,
      });
    }

    applySessionEnded('teacher', leaderboardSnap, exportSnap);
  };

  const handleBackToLobby = () => {
    cleanupChannel();
    window.location.href = window.location.pathname;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Isolated Full-Viewport Three.js WebGL Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Lightning Flash Layer */}
      <div
        className="fixed inset-0 z-40 pointer-events-none bg-white transition-opacity duration-150"
        style={{ opacity: lightningOpacity }}
      />

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
        />
      )}

      {/* In-Game HUD */}
      {inGame && (
        <GameHud
          roomCode={roomCode}
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
          onKickStudent={handleKickStudent}
          onEndSession={handleEndSession}
          onJoystickChange={(x, y) => {
            gameRef.current.joyVec = { x, y };
          }}
          onMobileJump={tryJump}
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
        />
      )}
    </div>
  );
}

export default App;
