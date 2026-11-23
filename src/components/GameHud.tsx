import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BatteryCharging,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudFog,
  CloudLightning,
  CloudRain,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Flame,
  Ghost,
  Link2,
  MapPin,
  Mountain,
  Pause,
  PawPrint,
  Play,
  RotateCcw,
  Smile,
  Snowflake,
  Sparkles,
  Trophy,
  Upload,
  UserCog,
  Users,
  UserX,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  DIFFICULTY_LEVELS,
  EMOTE_ITEMS,
  type AvatarConfig,
  type DisasterEventType,
  type EmoteType,
  type EssayQuestion,
  type HudSnapshot,
  type ParticipantSummary,
  type QuizQuestion,
  type RespawnMode,
  type Role,
  type RoomSettings,
  type RoomStatus,
  type TimeOfDay,
  type WeatherType,
} from '../types/game';
import { CP_POINTS } from '../game/MountainWorld';
import {
  downloadEssayTemplateExcel,
  downloadPgTemplateExcel,
  parseEssayExcelQuestions,
  parseExcelQuestions,
} from '../game/questions';
import { AvatarEditor } from './AvatarEditor';

interface GameHudProps {
  roomCode: string;
  roomStatus?: RoomStatus;
  showClassLobby?: boolean;
  role: Role;
  avatar: AvatarConfig;
  currentCP: number;
  essayDone: boolean;
  essayCorrect: number;
  score: number;
  fallCount: number;
  settings: RoomSettings;
  remainingSec: number;
  paused: boolean;
  hud: HudSnapshot;
  muted: boolean;
  lowGraphics: boolean;
  participants: ParticipantSummary[];
  questionCount: number;
  essayQuestionCount: number;
  pgFileName: string;
  essayFileName: string;
  warningText: string;
  isTouchDevice: boolean;
  onResetCamera: () => void;
  onToggleAudio: () => void;
  onToggleLowGraphics: () => void;
  onUpdateSettings: (partial: Partial<RoomSettings>) => void;
  onUpdateAvatar: (next: AvatarConfig) => void;
  onUpdateQuestions: (questions: QuizQuestion[] | null, fileName?: string) => void;
  onUpdateEssayQuestions: (questions: EssayQuestion[] | null, fileName?: string) => void;
  onToastSuccess: (msg: string) => void;
  onTriggerEmote: (emote: EmoteType) => void;
  onTeleport: (cpIndex: number) => void;
  onTriggerEvent: (eventType: DisasterEventType) => void;
  onTogglePause: () => void;
  onToggleClassLobby?: () => void;
  onStartExpedition?: () => void;
  onKickStudent: (studentId: string, name: string) => void;
  onEndSession: () => void;
  onJoystickChange: (x: number, y: number) => void;
  onMobileJump: () => void;
  isStandaloneMode?: boolean;
  onBuildStandaloneLink?: () => string;
  onFinishStandalone?: () => void;
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  pagi: 'Pagi',
  siang: 'Siang',
  sore: 'Sore',
  malam: 'Malam',
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  cerah: 'Cerah',
  berkabut: 'Berkabut',
  hujan: 'Hujan',
  badai: 'Badai',
  salju: 'Salju',
  kiamat: 'Kiamat',
};

const RESPAWN_LABELS: Record<RespawnMode, string> = {
  last_cp: 'CP Terakhir',
  prev_cp: 'Mundur 1 CP',
  base_camp: 'Base Camp',
};

export const GameHud: React.FC<GameHudProps> = ({
  roomCode,
  roomStatus = 'started',
  showClassLobby = false,
  role,
  avatar,
  currentCP,
  essayDone,
  essayCorrect,
  score,
  fallCount,
  settings,
  remainingSec,
  paused,
  hud,
  muted,
  lowGraphics,
  participants,
  questionCount,
  essayQuestionCount,
  pgFileName,
  essayFileName,
  warningText,
  isTouchDevice,
  onResetCamera,
  onToggleAudio,
  onToggleLowGraphics,
  onUpdateSettings,
  onUpdateAvatar,
  onUpdateQuestions,
  onUpdateEssayQuestions,
  onToastSuccess,
  onTriggerEmote,
  onTeleport,
  onTriggerEvent,
  onTogglePause,
  onToggleClassLobby,
  onStartExpedition,
  onKickStudent,
  onEndSession,
  onJoystickChange,
  onMobileJump,
  isStandaloneMode = false,
  onBuildStandaloneLink,
  onFinishStandalone,
}) => {
  const [isCompactMobile, setIsCompactMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 || window.innerHeight < 500 : false,
  );
  const [controlsOpen, setControlsOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !(window.innerWidth < 900 || window.innerHeight < 500) : true,
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedStandalone, setCopiedStandalone] = useState(false);
  const [teleportTarget, setTeleportTarget] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterSort, setRosterSort] = useState<'score' | 'cp' | 'name'>('score');
  const [rosterPage, setRosterPage] = useState(1);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelStatus, setExcelStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [draftAvatar, setDraftAvatar] = useState<AvatarConfig>(avatar);

  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const essayExcelInputRef = useRef<HTMLInputElement | null>(null);
  const joyZoneRef = useRef<HTMLDivElement | null>(null);
  const activeJoyTouchIdRef = useRef<number | null>(null);
  const lastTouchJumpAtRef = useRef<number>(0);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateViewport = () => {
      setIsCompactMobile(window.innerWidth < 900 || window.innerHeight < 500);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  const levelInfo = DIFFICULTY_LEVELS[settings.difficultyLevel] || DIFFICULTY_LEVELS[3];
  const safeRem = Math.max(0, Math.floor(remainingSec));
  const remMM = Math.floor(safeRem / 60)
    .toString()
    .padStart(2, '0');
  const remSS = (safeRem % 60).toString().padStart(2, '0');
  const timerUrgent = safeRem <= 60;

  const copyTextWithFallback = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const inp = document.createElement('input');
      inp.value = text;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      document.body.removeChild(inp);
    }
  };

  const handleCopyStudentLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?role=student&room=${roomCode}`;
    await copyTextWithFallback(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyStandaloneLink = () => {
    if (!onBuildStandaloneLink) return;
    const link = onBuildStandaloneLink();
    void copyTextWithFallback(link);
    setCopiedStandalone(true);
    setTimeout(() => setCopiedStandalone(false), 2600);
    onToastSuccess(
      'Link Paket Soal (Mode Mandiri) tersalin! Siswa dapat langsung mengerjakan 25 PG + 5 Isian meski P2P diblokir.',
    );
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const res = await parseExcelQuestions(file);
      onUpdateQuestions(res.questions, file.name);
      const toastText = `Berhasil mengimpor ${res.questions.length} Soal PG dari ${file.name}!`;
      const warnNote = res.warnings.length > 0 ? ` (${res.warnings[0]})` : '';
      setExcelStatus({
        type: 'ok',
        text: `${toastText} Langsung disinkronkan ke seluruh siswa.${warnNote}`,
      });
      onToastSuccess(toastText);
    } catch (err) {
      setExcelStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal membaca file Excel PG.',
      });
    } finally {
      input.value = '';
    }
  };

  const handleEssayExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const res = await parseEssayExcelQuestions(file);
      onUpdateEssayQuestions(res.questions, file.name);
      const toastText = `Berhasil mengimpor ${res.questions.length} Soal Isian dari ${file.name}!`;
      const warnNote = res.warnings.length > 0 ? ` (${res.warnings[0]})` : '';
      setExcelStatus({
        type: 'ok',
        text: `${toastText} Langsung disinkronkan ke Pos Ujian Puncak.${warnNote}`,
      });
      onToastSuccess(toastText);
    } catch (err) {
      setExcelStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal membaca file Excel Isian Singkat.',
      });
    } finally {
      input.value = '';
    }
  };

  const updateJoyFromPoint = (clientX: number, clientY: number) => {
    const rect = joyZoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const maxR = Math.max(24, rect.width * 0.4);
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    onJoystickChange(dx / maxR, dy / maxR);
  };

  const handleJoyStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (activeJoyTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    activeJoyTouchIdRef.current = touch.identifier;
    updateJoyFromPoint(touch.clientX, touch.clientY);
  };

  const handleJoyMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const activeId = activeJoyTouchIdRef.current;
    const touch =
      activeId !== null
        ? Array.from(e.touches).find((t) => t.identifier === activeId) ||
          Array.from(e.changedTouches).find((t) => t.identifier === activeId)
        : e.touches[0];
    if (!touch) return;
    updateJoyFromPoint(touch.clientX, touch.clientY);
  };

  const handleJoyEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const activeId = activeJoyTouchIdRef.current;
    if (activeId !== null) {
      const endedThisFinger = Array.from(e.changedTouches).some((t) => t.identifier === activeId);
      if (!endedThisFinger) return;
    }
    activeJoyTouchIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickChange(0, 0);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* TOP HEADER BAR */}
      {isCompactMobile ? (
        <header
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-white/15 shadow-lg pointer-events-auto touch-none text-xs overflow-hidden"
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Mountain className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-display text-xs font-extrabold tracking-wide text-white whitespace-nowrap">
              WOWO PEAK
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-mono-num text-xs font-semibold text-slate-200 whitespace-nowrap">
              #{roomCode}
            </span>
            <span className="text-slate-500">·</span>
            <span
              className={`font-mono-num tabular-nums text-xs font-bold whitespace-nowrap ${
                timerUrgent ? 'text-red-300' : 'text-amber-300'
              }`}
            >
              {remMM}:{remSS}
            </span>
            <span className="text-slate-500">·</span>
            {role === 'student' ? (
              <span className="font-mono-num text-xs font-bold text-emerald-300 whitespace-nowrap">
                {score} pts
              </span>
            ) : (
              <span className="font-mono-num text-xs font-semibold text-amber-200 whitespace-nowrap">
                Guru ({participants.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleAudio}
              className="inline-flex items-center justify-center p-1 rounded-md bg-slate-900 border border-white/10 text-slate-100 cursor-pointer"
              title="Aktifkan/Matikan Suara"
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleLowGraphics}
              className="inline-flex items-center justify-center p-1 rounded-md bg-slate-900 border border-white/10 text-slate-100 cursor-pointer"
              title="Mode Grafis Ringan / Normal"
            >
              {lowGraphics ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          </div>
        </header>
      ) : (
        <header
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="fixed top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-950/88 border border-white/15 shadow-lg pointer-events-auto touch-none"
        >
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <Mountain className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-display text-base sm:text-lg font-extrabold tracking-wide text-white whitespace-nowrap">
                WOWO PEAK
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">|</span>

            <div className="flex items-center gap-2 text-xs text-slate-300 truncate">
              <span>
                Ruang <strong className="font-mono-num text-white">{roomCode}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className={role === 'teacher' ? 'text-amber-400 font-semibold' : 'text-sky-400 font-semibold'}>
                {role === 'teacher'
                  ? 'Guru Pemantau Kebal'
                  : isStandaloneMode
                    ? 'Siswa · Mode Mandiri'
                    : 'Siswa Pendaki'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200">
                Lv.{settings.difficultyLevel} {levelInfo.name}
              </span>
              <span aria-hidden="true" className="hidden md:inline">·</span>
              <span className="hidden md:inline font-mono-num text-sky-300">
                {currentCP >= 25
                  ? essayDone
                    ? `Puncak Selesai 100% (Isian ${essayCorrect}/${essayQuestionCount || 5})`
                    : `Menuju Gapura Puncak — Pos Ujian ${essayQuestionCount || 5} Isian (${hud.distToNextCp} m)`
                  : `Menuju CP ${hud.nextCpIndex} (${hud.distToNextCp} m · ↑ ${hud.elevToNextCp} m)`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {roomStatus === 'waiting' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-[11px] font-bold text-amber-300">
                LOBI TUNGGU
              </span>
            )}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono-num tabular-nums text-xs sm:text-sm font-bold whitespace-nowrap ${
                timerUrgent
                  ? 'bg-red-950/90 border-red-400 text-red-200'
                  : 'bg-slate-900 border-amber-400/40 text-amber-300'
              }`}
              title="Sisa Waktu Ujian / Sesi Kelas"
            >
              <Clock className={`w-3.5 h-3.5 shrink-0 ${timerUrgent ? 'text-red-400' : 'text-amber-400'}`} />
              <span>
                {remMM}:{remSS}
              </span>
            </div>

            {hud.locomotionMode !== 'walk' && (
              <span className="hidden sm:inline px-2 py-0.5 rounded bg-sky-700/80 border border-sky-400/50 text-[11px] font-semibold text-white">
                {hud.locomotionMode === 'climb' ? 'Memanjat Tangga' : 'Berseluncur'}
              </span>
            )}
            {role === 'student' && (
              <div className="hidden sm:flex items-center gap-2.5 text-xs font-mono-num pr-2 border-r border-white/10">
                <span className="text-amber-300 font-bold">{score} pts</span>
                <span className="text-red-300">Jatuh {fallCount}</span>
              </div>
            )}

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 pr-2 border-r border-white/10 whitespace-nowrap">
              <span>{TIME_LABELS[settings.timeOfDay]}</span>
              <span aria-hidden="true">·</span>
              <span>{WEATHER_LABELS[settings.weather] || settings.weather}</span>
            </div>

            <button
              type="button"
              onClick={onToggleAudio}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-100 cursor-pointer whitespace-nowrap"
              title="Aktifkan/Matikan Suara"
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">{muted ? 'OFF' : 'ON'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLowGraphics}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-100 cursor-pointer whitespace-nowrap"
              title="Mode Grafis Ringan / Normal"
            >
              {lowGraphics ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden lg:inline">{lowGraphics ? 'Ringan' : 'Normal'}</span>
            </button>
          </div>
        </header>
      )}

      {/* TOP-LEFT CIRCULAR RADAR MAP & VERTICAL PEAK ALTITUDE BAR (DESKTOP ONLY) */}
      {!isCompactMobile && (
        <div className="fixed top-16 left-3 flex flex-col items-center gap-2.5">
          {/* Circular Radar Map */}
          <div
            className="relative w-24 h-24 rounded-full bg-slate-950/88 border-2 border-sky-400/55 shadow-lg overflow-hidden"
            title="Radar Arah Checkpoint & Pendaki Sekitar"
          >
            {/* Concentric rings & crosshairs */}
            <div className="absolute inset-3 rounded-full border border-sky-400/20" />
            <div className="absolute inset-7 rounded-full border border-sky-400/15" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-sky-400/15" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-sky-400/15" />

            {/* Nearby teammate/teacher blips */}
            {hud.nearbyBlips.map((b) => (
              <div
                key={b.id}
                title={b.name}
                className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                  b.role === 'teacher' ? 'bg-amber-400 ring-1 ring-white' : 'bg-sky-400'
                }`}
                style={{
                  left: `${50 + b.relX * 44}%`,
                  top: `${50 + b.relY * 44}%`,
                }}
              />
            ))}

            {/* Target CP dot */}
            <div
              className="absolute w-3 h-3 rounded-full bg-amber-300 border border-slate-950 -translate-x-1/2 -translate-y-1/2 shadow"
              style={{
                left: `${50 + hud.targetBlip.relX * 44}%`,
                top: `${50 + hud.targetBlip.relY * 44}%`,
              }}
            />

            {/* Center Player Heading Chevron */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-xs font-bold drop-shadow">▲</div>
            </div>

            <div className="absolute bottom-1 inset-x-0 text-center text-[9px] font-mono-num font-bold text-sky-200">
              {hud.nextCpIndex >= 26 ? 'GAPURA' : `CP ${hud.nextCpIndex}`}
            </div>
          </div>

          {/* Vertical Peak Progress Bar (0% - 100%) */}
          <div className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-950/88 border border-white/15 shadow-lg">
            <Mountain className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono-num font-bold text-white">{hud.altitudePct}%</span>
            <div className="relative w-3 h-28 rounded-full bg-slate-800 border border-white/10">
              <div
                className="absolute bottom-0 inset-x-0 rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-orange-500 transition-[height] duration-150"
                style={{ height: `${hud.altitudePct}%` }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-yellow-300 border-2 border-slate-950 shadow transition-[bottom] duration-150"
                style={{ bottom: `${hud.altitudePct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono-num text-slate-300">
              CP {currentCP}/25
            </span>
          </div>
        </div>
      )}

      {/* Warning Toast Banner */}
      {warningText && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-40 rounded-xl bg-red-700/95 border border-red-300/60 text-white font-semibold shadow-xl text-center max-w-[90vw] ${
            isCompactMobile ? 'top-11 px-3 py-1.5 text-xs' : 'top-16 px-5 py-2.5 text-sm'
          }`}
        >
          {warningText}
        </div>
      )}

      {/* Teacher-visible Pause Indicator */}
      {paused && role === 'teacher' && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-lg bg-amber-600/95 text-white text-xs font-semibold border border-amber-300/50 ${
            isCompactMobile ? 'top-11' : 'top-16'
          }`}
        >
          Kelas dijeda — siswa dibekukan sementara
        </div>
      )}

      {/* COLLAPSIBLE BOTTOM CONTROL DOCK */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`fixed left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto touch-none ${
          isCompactMobile || isTouchDevice
            ? `bottom-2 ${controlsOpen ? 'z-40' : 'z-30 max-w-[calc(100vw-13.5rem)]'}`
            : 'bottom-2.5 z-30 max-w-[97vw]'
        }`}
      >
        {/* Collapse / Expand Tab */}
        <button
          type="button"
          onClick={() => {
            setControlsOpen((v) => !v);
            setEmoteMenuOpen(false);
          }}
          className={`inline-flex items-center gap-1 rounded-t-lg bg-slate-950/92 border border-b-0 border-white/15 font-semibold text-amber-300 hover:text-white cursor-pointer whitespace-nowrap ${
            isCompactMobile ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1 text-[11px] gap-1.5'
          }`}
        >
          {controlsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          <span>{controlsOpen ? 'Sembunyikan Kontrol' : 'Tampilkan Kontrol'}</span>
        </button>

        {controlsOpen && (
          <div
            className={`relative rounded-xl bg-slate-950/92 border border-white/15 shadow-2xl space-y-2 ${
              isCompactMobile || isTouchDevice
                ? role === 'teacher'
                  ? 'px-2.5 py-2 max-w-[94vw] max-h-[50vh] overflow-y-auto'
                  : 'px-2 py-1.5 max-w-[calc(100vw-13.5rem)] max-h-[44vh] overflow-y-auto'
                : 'px-3 py-2.5 max-w-[97vw]'
            }`}
          >
            {/* Emote Picker Popover */}
            {emoteMenuOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-xl bg-slate-900 border border-amber-400/50 shadow-2xl flex flex-wrap justify-center gap-1.5 w-[340px] max-w-[92vw]">
                {EMOTE_ITEMS.map((em) => (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => {
                      onTriggerEmote(em.id);
                      setEmoteMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 text-xs font-semibold text-white cursor-pointer transition-colors"
                  >
                    <span>{em.emoji}</span>
                    <span>{em.label}</span>
                  </button>
                ))}
              </div>
            )}

            {role === 'teacher' ? (
              <>
                {/* ROW 1: Room, Lobby Toggle, Start, Link Siswa, Mode Respawn, Timer Soal, Excel Bank, Pause & End Session */}
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {onToggleClassLobby && (
                    <button
                      type="button"
                      onClick={onToggleClassLobby}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        showClassLobby
                          ? 'bg-amber-600 border-amber-400 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 border-amber-400/35 text-amber-200'
                      }`}
                    >
                      {showClassLobby ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {showClassLobby ? 'Sembunyikan Lobi' : `Tampilkan Lobi (${participants.length})`}
                      </span>
                    </button>
                  )}

                  {roomStatus === 'waiting' && onStartExpedition && (
                    <button
                      type="button"
                      onClick={onStartExpedition}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer whitespace-nowrap shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Mulai Ekspedisi Sekarang</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyStudentLink}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                    title="Salin Link Khusus Siswa (Multiplayer Supabase)"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>
                      {copiedLink ? 'Tersalin!' : `Link Siswa (${roomCode})`}
                    </span>
                  </button>

                  {onBuildStandaloneLink && (
                    <button
                      type="button"
                      onClick={handleCopyStandaloneLink}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 border border-teal-400/35 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                      title="Cadangan tanpa internet/database: seluruh soal & pengaturan kelas dikemas langsung ke URL"
                    >
                      {copiedStandalone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-200" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedStandalone
                          ? 'Link Paket Tersalin!'
                          : 'Salin Link Paket Soal (Mode Mandiri)'}
                      </span>
                    </button>
                  )}

                  <select
                    aria-label="Mode Respawn"
                    value={settings.respawnMode}
                    onChange={(e) => onUpdateSettings({ respawnMode: e.target.value as RespawnMode })}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="last_cp">Respawn: CP Terakhir</option>
                    <option value="prev_cp">Respawn: Mundur 1 CP</option>
                    <option value="base_camp">Respawn: Base Camp</option>
                  </select>

                  <select
                    aria-label="Durasi Sesi"
                    value={settings.sessionDurationMinutes}
                    onChange={(e) =>
                      onUpdateSettings({ sessionDurationMinutes: Number(e.target.value) })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-400/35 text-xs font-mono-num text-amber-200 focus:outline-none focus:border-amber-400"
                  >
                    {[10, 15, 20, 25, 30].map((m) => (
                      <option key={m} value={m}>
                        Sesi: {m} Menit
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Timer Soal"
                    value={settings.quizDuration}
                    onChange={(e) => onUpdateSettings({ quizDuration: Number(e.target.value) })}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((sec) => (
                      <option key={sec} value={sec}>
                        Kuis: {sec} Detik
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Durasi Pembahasan"
                    value={settings.explanationDurationSec}
                    onChange={(e) =>
                      onUpdateSettings({ explanationDurationSec: Number(e.target.value) })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-sky-200 focus:outline-none focus:border-amber-400"
                  >
                    {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((sec) => (
                      <option key={sec} value={sec}>
                        Bahasan: {sec} Detik
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setExcelStatus(null);
                      setExcelModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-emerald-300 cursor-pointer whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Bank Soal ({questionCount || 25} PG · {essayQuestionCount || 5} Isian)</span>
                  </button>

                  <button
                    type="button"
                    onClick={onTogglePause}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer whitespace-nowrap ${
                      paused ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-700 hover:bg-amber-600'
                    }`}
                  >
                    {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{paused ? 'Lanjutkan Mendaki' : 'Jeda Kelas'}</span>
                  </button>

                  {!confirmEnd ? (
                    <button
                      type="button"
                      onClick={() => setConfirmEnd(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Akhiri Sesi</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmEnd(false);
                        onEndSession();
                      }}
                      onMouseLeave={() => setConfirmEnd(false)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                    >
                      <span>Yakin Akhiri &amp; Rekap?</span>
                    </button>
                  )}
                </div>

                {/* ROW 2: Level Tantangan (1-10), Teleport CP, Waktu Gunung, Cuaca Gunung */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1.5 border-t border-white/10">
                  <select
                    aria-label="Level Tantangan"
                    value={settings.difficultyLevel}
                    onChange={(e) => onUpdateSettings({ difficultyLevel: Number(e.target.value) })}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {Object.values(DIFFICULTY_LEVELS).map((d) => (
                      <option key={d.level} value={d.level}>
                        Lv {d.level}: {d.name} ({d.speedMult}x)
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex items-center gap-1">
                    <select
                      aria-label="Pilih Teleport CP"
                      value={teleportTarget}
                      onChange={(e) => setTeleportTarget(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {CP_POINTS.map((cp) => (
                        <option key={cp.index} value={cp.index}>
                          {cp.index === 0
                            ? 'Base Camp (CP 0)'
                            : cp.index === 25
                              ? 'Puncak (CP 25)'
                              : `CP ${cp.index}`}
                        </option>
                      ))}
                      <option value={26}>Gapura Puncak (Pos Ujian Akhir)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onTeleport(teleportTarget)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-sky-300 cursor-pointer whitespace-nowrap"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Teleport</span>
                    </button>
                  </div>

                  <select
                    aria-label="Waktu Gunung"
                    value={settings.timeOfDay}
                    onChange={(e) => onUpdateSettings({ timeOfDay: e.target.value as TimeOfDay })}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="pagi">Waktu: Pagi</option>
                    <option value="siang">Waktu: Siang</option>
                    <option value="sore">Waktu: Sore</option>
                    <option value="malam">Waktu: Malam</option>
                  </select>

                  <select
                    aria-label="Cuaca Gunung"
                    value={settings.weather}
                    onChange={(e) => onUpdateSettings({ weather: e.target.value as WeatherType })}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cerah">Cuaca: Cerah</option>
                    <option value="berkabut">Cuaca: Berkabut</option>
                    <option value="hujan">Cuaca: Hujan</option>
                    <option value="badai">Cuaca: Badai</option>
                    <option value="salju">Cuaca: Salju</option>
                    <option value="kiamat">Cuaca: Kiamat</option>
                  </select>
                </div>

                {/* ROW 3: Mode Avatar, Reset Kamera, Emote, Peserta (Roster+Kick), Quick Hazards */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1.5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftAvatar({ ...avatar });
                      setAvatarModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                  >
                    <UserCog className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mode Avatar</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetCamera}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>Reset Kamera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmoteMenuOpen((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      emoteMenuOpen
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 border-white/15 text-white'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5 text-amber-300" />
                    <span>Emote</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRosterModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Peserta ({participants.length})</span>
                  </button>

                  <span className="text-slate-600 hidden sm:inline">|</span>

                  <button
                    type="button"
                    onClick={() => onTriggerEvent('hail')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-900/85 hover:bg-cyan-800 border border-cyan-400/50 text-xs font-semibold text-cyan-100 cursor-pointer whitespace-nowrap"
                    title="Turunkan hujan kristal es tajam yang memperlambat gerak siswa"
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>Hujan Es</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('thunder')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-500/40 text-xs font-semibold text-red-100 cursor-pointer whitespace-nowrap"
                  >
                    <CloudLightning className="w-3.5 h-3.5" />
                    <span>Badai Petir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('heavy_rain')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-xs font-semibold text-sky-100 cursor-pointer whitespace-nowrap"
                    title="Turunkan Hujan Lebat selama 5 detik (maks 50 partikel)"
                  >
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Hujan Lebat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('thick_fog')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-500/40 text-xs font-semibold text-slate-100 cursor-pointer whitespace-nowrap"
                    title="Turunkan Kabut Tebal menyelimuti gunung selama 5 detik"
                  >
                    <CloudFog className="w-3.5 h-3.5" />
                    <span>Kabut Tebal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('wildlife')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-900/85 hover:bg-amber-800 border border-amber-500/40 text-xs font-semibold text-amber-100 cursor-pointer whitespace-nowrap"
                    title="Munculkan satwa liar di jalur pendakian selama 5 detik"
                  >
                    <PawPrint className="w-3.5 h-3.5" />
                    <span>Satwa Liar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('kuntilanak')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-500/40 text-xs font-semibold text-red-100 cursor-pointer whitespace-nowrap"
                    title="Munculkan 3 Kuntilanak realistis di jalur pendakian selama 5 detik"
                  >
                    <Ghost className="w-3.5 h-3.5" />
                    <span>Kuntilanak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('pocong')}
                    className="px-2.5 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-500/40 text-xs font-semibold text-red-100 cursor-pointer whitespace-nowrap"
                    title="Munculkan 3 Pocong realistis di jalur pendakian selama 5 detik"
                  >
                    Pocong
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('earthquake')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-900/85 hover:bg-amber-800 border border-amber-500/40 text-xs font-semibold text-amber-100 cursor-pointer whitespace-nowrap"
                    title="Guncangan Gempa Bumi gunung selama 5 detik"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Gempa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('fire_rain')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-900/85 hover:bg-orange-800 border border-orange-500/40 text-xs font-semibold text-orange-100 cursor-pointer whitespace-nowrap"
                    title="Turunkan Hujan Api selama 5 detik (maks 50 partikel)"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Hujan Api</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTriggerEvent('meteor')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-900/85 hover:bg-rose-800 border border-rose-500/40 text-xs font-semibold text-rose-100 cursor-pointer whitespace-nowrap"
                    title="Turunkan Hujan Meteor Api selama 5 detik"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Hujan Meteor</span>
                  </button>
                </div>
              </>
            ) : (
              /* STUDENT COMPACT BOTTOM DOCK */
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftAvatar({ ...avatar });
                    setAvatarModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                >
                  <UserCog className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mode Avatar</span>
                </button>

                <button
                  type="button"
                  onClick={onResetCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reset Kamera</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEmoteMenuOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    emoteMenuOpen
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 border-white/15 text-white'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5 text-amber-300" />
                  <span>Emote</span>
                </button>

                {isStandaloneMode && essayDone && onFinishStandalone && (
                  <button
                    type="button"
                    onClick={onFinishStandalone}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Selesai &amp; Lihat Nilai</span>
                  </button>
                )}

                <span className="text-xs text-slate-300 px-2">
                  Respawn: <strong className="text-white">{RESPAWN_LABELS[settings.respawnMode]}</strong>
                </span>

                {!isTouchDevice && (
                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    WASD: Gerak · Spasi: Lompat · Panah / Seret Mouse: Kamera
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE / TOUCH MULTI-TOUCH CONTROLS: JOYSTICK (BOTTOM-LEFT) + LOMPAT (BOTTOM-RIGHT) + CP BAR (ABOVE JUMP) */}
      {isTouchDevice && (
        <div
          ref={joyZoneRef}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={handleJoyStart}
          onTouchMove={handleJoyMove}
          onTouchEnd={handleJoyEnd}
          onTouchCancel={handleJoyEnd}
          className={`fixed bottom-6 left-6 z-20 rounded-full bg-slate-950/65 border-2 border-white/25 pointer-events-auto touch-none ${
            isCompactMobile ? 'w-20 h-20' : 'w-24 h-24'
          }`}
          aria-label="Analog Joystick"
        >
          <div
            className={`rounded-full bg-sky-500/85 border border-white/50 absolute ${
              isCompactMobile ? 'w-9 h-9 left-[22px] top-[22px]' : 'w-10 h-10 left-7 top-7'
            }`}
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
          />
        </div>
      )}

      {isCompactMobile && (
        <div
          className={`fixed right-6 z-20 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl bg-slate-950/88 border border-white/15 shadow-lg pointer-events-none ${
            isTouchDevice ? 'bottom-28' : 'bottom-6'
          }`}
        >
          <div className="flex items-center gap-1">
            <Mountain className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-mono-num font-bold text-white">{hud.altitudePct}%</span>
          </div>
          <div className="relative w-2.5 h-16 rounded-full bg-slate-800 border border-white/10">
            <div
              className="absolute bottom-0 inset-x-0 rounded-full bg-gradient-to-t from-emerald-500 via-amber-400 to-orange-500 transition-[height] duration-150"
              style={{ height: `${hud.altitudePct}%` }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-yellow-300 border-2 border-slate-950 shadow transition-[bottom] duration-150"
              style={{ bottom: `${hud.altitudePct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono-num font-semibold text-slate-200 whitespace-nowrap">
            CP {currentCP}/25
          </span>
        </div>
      )}

      {isTouchDevice && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            lastTouchJumpAtRef.current = performance.now();
            onMobileJump();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (performance.now() - lastTouchJumpAtRef.current < 400) return;
            onMobileJump();
          }}
          className="fixed bottom-6 right-6 z-20 w-16 h-16 rounded-full bg-amber-600/90 active:bg-amber-500 border-2 border-amber-200/70 text-white font-bold text-xs tracking-wide pointer-events-auto touch-none shadow-lg"
        >
          LOMPAT
        </button>
      )}

      {/* IN-GAME AVATAR EDITOR MODAL */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 pointer-events-auto overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-white/15 p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Kustomisasi Avatar Pendaki</h3>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <AvatarEditor avatar={draftAvatar} role={role} onChange={setDraftAvatar} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateAvatar(draftAvatar);
                  setAvatarModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
              >
                Terapkan Avatar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARTICIPANTS ROSTER MODAL (TEACHER) */}
      {rosterModalOpen && role === 'teacher' && (() => {
        const q = rosterSearch.trim().toLowerCase();
        const filtered = participants
          .filter((stu) => !q || stu.name.toLowerCase().includes(q))
          .slice()
          .sort((a, b) => {
            if (rosterSort === 'cp') return b.currentCP - a.currentCP || b.score - a.score;
            if (rosterSort === 'name') return a.name.localeCompare(b.name);
            return b.score - a.score || b.currentCP - a.currentCP;
          });
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const safePage = Math.min(rosterPage, totalPages);
        const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
        const onlineCount = participants.filter((p) => p.online).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 pointer-events-auto">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/40 p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Daftar Peserta Ekspedisi</h3>
                  <p className="text-xs text-slate-400">
                    Ruang {roomCode} · {participants.length} siswa ({onlineCount} aktif)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRosterModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => {
                      setRosterSearch(e.target.value);
                      setRosterPage(1);
                    }}
                    placeholder="Cari nama siswa..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <select
                    value={rosterSort}
                    onChange={(e) => {
                      setRosterSort(e.target.value as 'score' | 'cp' | 'name');
                      setRosterPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="score">Skor Tertinggi</option>
                    <option value="cp">CP Terdepan</option>
                    <option value="name">Nama A–Z</option>
                  </select>
                </div>
              )}

              {participants.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Belum ada siswa bergabung. Bagikan kode ruangan{' '}
                  <strong className="font-mono-num text-white">{roomCode}</strong> atau klik{' '}
                  <strong>Link Siswa</strong>.
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Tidak ada siswa dengan nama &quot;{rosterSearch}&quot;.
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {paged.map((stu, idx) => (
                      <div
                        key={stu.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            <span className="text-amber-400 font-mono-num mr-1.5">
                              #{(safePage - 1) * pageSize + idx + 1}
                            </span>
                            {stu.name}{' '}
                            <span
                              className={`text-[11px] font-normal ${stu.online ? 'text-emerald-400' : 'text-slate-500'}`}
                            >
                              ({stu.online ? 'Aktif' : 'Offline'})
                            </span>
                          </div>
                          <div className="text-[11px] font-mono-num text-slate-400 mt-0.5">
                            CP {stu.currentCP}/25 · PG {stu.correctCount} · Isian {stu.essayCorrect || 0}/5 · {stu.score} pts · Jatuh {stu.fallCount}
                          </div>
                        </div>

                        {confirmKickId === stu.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmKickId(null);
                              onKickStudent(stu.id, stu.name);
                            }}
                            onMouseLeave={() => setConfirmKickId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer shrink-0"
                          >
                            Yakin Kick?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmKickId(stu.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-700 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer shrink-0 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Keluarkan</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-300">
                      <span>
                        Halaman {safePage} / {totalPages} ({filtered.length} siswa)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => setRosterPage(Math.max(1, safePage - 1))}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => setRosterPage(Math.min(totalPages, safePage + 1))}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                        >
                          Berikutnya
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* LIVE EXCEL QUESTION BANK MODAL (TEACHER) */}
      {excelModalOpen && role === 'teacher' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 pointer-events-auto overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-emerald-500/40 p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Bank Soal Excel (.xlsx)</h3>
              </div>
              <button
                type="button"
                onClick={() => setExcelModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Section 1: 25 PG */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-semibold">
                <span className="text-sky-300">1. Bank Soal Pilihan Ganda (CP 1–25)</span>
                <span className={`font-mono-num ${pgFileName ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {pgFileName ? `${questionCount || 25} PG Kustom (${pgFileName})` : '25 PG bawaan'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadPgTemplateExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template PG (.xlsx)</span>
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-xs font-semibold text-white cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor Soal PG (.xlsx)</span>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    hidden
                  />
                </label>
                {pgFileName && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateQuestions(null, '');
                      if (excelInputRef.current) excelInputRef.current.value = '';
                      setExcelStatus({
                        type: 'ok',
                        text: 'Bank soal PG dikembalikan ke 25 soal bawaan.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-950/60 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Bawaan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 2: 5 Essay Summit */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/25 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-semibold">
                <span className="text-amber-300">2. Bank Soal Isian Singkat Puncak (5 Soal)</span>
                <span className={`font-mono-num ${essayFileName ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {essayFileName
                    ? `${essayQuestionCount || 5} Isian Kustom (${essayFileName})`
                    : '5 isian bawaan'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadEssayTemplateExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template Isian (.xlsx)</span>
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-xs font-semibold text-white cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor Soal Isian (.xlsx)</span>
                  <input
                    ref={essayExcelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleEssayExcelUpload}
                    hidden
                  />
                </label>
                {essayFileName && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateEssayQuestions(null, '');
                      if (essayExcelInputRef.current) essayExcelInputRef.current.value = '';
                      setExcelStatus({
                        type: 'ok',
                        text: 'Bank soal Isian Singkat dikembalikan ke 5 soal bawaan.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-950/60 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Bawaan</span>
                  </button>
                )}
              </div>
            </div>

            {excelStatus && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
                  excelStatus.type === 'err'
                    ? 'bg-red-950/85 border-red-500/50 text-red-200'
                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                }`}
              >
                {excelStatus.type === 'err' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <span>{excelStatus.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
