import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  EyeOff,
  Loader2,
  Mountain,
  Play,
  Sparkles,
  UserX,
  Users,
} from 'lucide-react';
import type {
  AvatarConfig,
  ParticipantSummary,
  Role,
  RoomSettings,
  RoomStatus,
} from '../types/game';

interface ClassLobbyModalProps {
  role: Role;
  roomCode: string;
  roomStatus: RoomStatus;
  teacherName: string;
  currentStudentId: string;
  localStudentName: string;
  localAvatar: AvatarConfig;
  participants: ParticipantSummary[];
  settings: RoomSettings;
  questionCount: number;
  essayQuestionCount: number;
  onStartExpedition: () => void;
  onHideLobby: () => void;
  onKickStudent: (studentId: string, name: string) => void;
}

const MiniAvatarPortrait: React.FC<{ avatar: AvatarConfig; name: string }> = ({
  avatar,
  name,
}) => {
  const skin = avatar.skinColor || '#f1c27d';
  const hair = avatar.hairColor || '#1c1917';
  const jacket = avatar.jacket || '#ef4444';
  const hat = avatar.headAccessory || 'none';
  const isHijab = avatar.hairStyle === 'hijab';
  const hasSuit = avatar.superheroSuit && avatar.superheroSuit !== 'none';

  return (
    <div className="relative w-14 h-14 rounded-2xl bg-slate-900/90 border border-white/15 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
      <svg viewBox="0 0 64 64" className="w-12 h-12" aria-label={`Avatar ${name}`}>
        {/* Shoulders / Jacket */}
        <path
          d="M12 62 C12 46, 20 42, 32 42 C44 42, 52 46, 52 62 Z"
          fill={jacket}
          stroke="#0f172a"
          strokeWidth="2"
        />
        {/* Hijab drape if active */}
        {isHijab && (
          <path
            d="M17 28 C17 14, 47 14, 47 28 L49 47 C43 50, 21 50, 15 47 Z"
            fill={hair}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        )}
        {/* Back Hair */}
        {!isHijab && avatar.hairStyle !== 'bald' && (
          <circle cx="32" cy="24" r="14" fill={hair} />
        )}
        {/* Head / Face */}
        <circle
          cx="32"
          cy="26"
          r="11.5"
          fill={skin}
          stroke="#0f172a"
          strokeWidth="1.4"
        />
        {/* Top Hair */}
        {!isHijab && avatar.hairStyle !== 'bald' && (
          <path
            d="M20 24 C20 14, 44 14, 44 24 C40 19, 24 19, 20 24 Z"
            fill={hair}
          />
        )}
        {/* Eyes */}
        <circle cx="27.5" cy="26" r="1.5" fill="#0f172a" />
        <circle cx="36.5" cy="26" r="1.5" fill="#0f172a" />
        {/* Smile */}
        <path
          d="M28 31 Q32 34 36 31"
          fill="none"
          stroke="#0f172a"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Glasses */}
        {avatar.glasses && (
          <g stroke="#0f172a" strokeWidth="1.5" fill="rgba(56,189,248,0.22)">
            <rect x="23" y="23" width="8" height="5.5" rx="1.5" />
            <rect x="33" y="23" width="8" height="5.5" rx="1.5" />
            <line x1="31" y1="25.5" x2="33" y2="25.5" />
          </g>
        )}
        {/* Head Accessory */}
        {hat === 'rimba' && (
          <g>
            <ellipse cx="32" cy="17" rx="16" ry="3.5" fill="#78350f" />
            <path d="M22 17 L24 10 L40 10 L42 17 Z" fill="#92400e" />
          </g>
        )}
        {hat === 'baseball' && (
          <g>
            <path d="M21 18 C21 10, 43 10, 43 18 Z" fill="#2563eb" />
            <rect x="30" y="16" width="16" height="3" rx="1.5" fill="#1d4ed8" />
          </g>
        )}
        {hat === 'beanie' && (
          <path d="M20 19 C20 9, 44 9, 44 19 Z" fill="#dc2626" />
        )}
        {hat === 'peci' && (
          <rect x="21" y="10" width="22" height="8" rx="2" fill="#111827" />
        )}
        {hat === 'blangkon' && (
          <path d="M20 19 C20 11, 44 11, 44 19 Z" fill="#92400e" />
        )}
        {hat === 'headlamp' && (
          <g>
            <rect x="20" y="17" width="24" height="3.5" rx="1" fill="#334155" />
            <circle cx="32" cy="18.7" r="3" fill="#fef08a" />
          </g>
        )}
        {hat === 'bando' && (
          <path
            d="M21 20 C23 12, 41 12, 43 20"
            fill="none"
            stroke="#ec4899"
            strokeWidth="3"
          />
        )}
      </svg>

      {hasSuit && (
        <span
          title={`Kostum: ${avatar.superheroSuit}`}
          className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow"
        >
          <Sparkles className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
};

export const ClassLobbyModal: React.FC<ClassLobbyModalProps> = ({
  role,
  roomCode,
  roomStatus,
  teacherName,
  currentStudentId,
  localStudentName,
  localAvatar,
  participants,
  settings,
  questionCount,
  essayQuestionCount,
  onStartExpedition,
  onHideLobby,
  onKickStudent,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyText = async (text: string) => {
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

  const handleCopyCode = async () => {
    await copyText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?role=student&room=${roomCode}`;
    await copyText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Ensure local student is always visible in their own lobby even if broadcast echo takes a moment
  const displayParticipants: ParticipantSummary[] = (() => {
    if (role !== 'student') return participants;
    const exists = participants.some((p) => p.id === currentStudentId);
    if (exists) return participants;
    return [
      {
        id: currentStudentId,
        name: localStudentName || 'Pendaki',
        avatar: localAvatar,
        currentCP: 0,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        essayCorrect: 0,
        essayWrong: 0,
        essayDone: false,
        fallCount: 0,
        online: true,
        finished: false,
      },
      ...participants,
    ];
  })();

  const onlineStudents = displayParticipants.filter((p) => p.online);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/78 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900/95 border border-white/15 shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-sky-950/80 to-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-extrabold tracking-wide text-white">
                  LOBI TUNGGU KELAS
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                    roomStatus === 'waiting'
                      ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                      : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                  }`}
                >
                  {roomStatus === 'waiting' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>MENUNGGU MULAI</span>
                    </>
                  ) : (
                    <span>EKSPEDISI BERLANGSUNG</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Guru Pemantau: <strong className="text-white">{teacherName}</strong> ·{' '}
                {questionCount} PG + {essayQuestionCount} Isian Puncak · Durasi{' '}
                <strong className="font-mono-num text-amber-300">
                  {settings.sessionDurationMinutes} Menit
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-400/40 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Kode Ruangan
              </div>
              <div className="font-mono-num text-xl font-extrabold text-amber-300 tracking-widest">
                {roomCode}
              </div>
            </div>

            {role === 'teacher' && (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-white cursor-pointer"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{copiedCode ? 'Kode Tersalin' : 'Salin Kode'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-xs font-semibold text-white cursor-pointer"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Siswa'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {role === 'student' ? (
          <div className="px-6 py-4 bg-sky-950/60 border-b border-sky-400/25 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-white">
                  Menunggu Pak/Bu Guru memulai pendakian...
                </div>
                <div className="text-xs text-sky-200/80">
                  Pendakian &amp; timer otomatis dimulai serentak begitu Guru menekan tombol mulai.
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-xs font-semibold text-emerald-300">
              <Users className="w-4 h-4" />
              <span className="font-mono-num">{onlineStudents.length} Siswa di Lobi</span>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 bg-slate-950/60 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 text-sm text-slate-200">
              <Users className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong className="font-mono-num text-white">{onlineStudents.length}</strong> siswa
                siap di Base Camp
                {displayParticipants.length > onlineStudents.length && (
                  <span className="text-slate-400 text-xs ml-1">
                    ({displayParticipants.length} total tercatat)
                  </span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onHideLobby}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                <EyeOff className="w-4 h-4" />
                <span>Sembunyikan Lobi</span>
              </button>

              {roomStatus === 'waiting' && (
                <button
                  type="button"
                  onClick={onStartExpedition}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Mulai Ekspedisi Sekarang</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Student Roster with Avatars */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">
              Daftar Pendaki yang Sudah Bergabung (Real-Time)
            </span>
            <span className="font-mono-num">Base Camp Mount WOWO</span>
          </div>

          {displayParticipants.length === 0 ? (
            <div className="py-12 rounded-2xl bg-slate-950/70 border border-dashed border-white/15 text-center space-y-2">
              <Users className="w-9 h-9 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">
                Belum ada siswa yang masuk ke lobi ruangan{' '}
                <span className="font-mono-num text-amber-300">{roomCode}</span>
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Bagikan kode ruangan atau klik <strong>Salin Link Siswa</strong> di kanan atas agar
                siswa langsung masuk ke lobi tunggu ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[46vh] overflow-y-auto pr-1">
              {displayParticipants.map((stu) => {
                const isSelf = role === 'student' && stu.id === currentStudentId;
                return (
                  <div
                    key={stu.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors ${
                      isSelf
                        ? 'bg-sky-950/65 border-sky-400/50'
                        : 'bg-slate-950/80 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MiniAvatarPortrait avatar={stu.avatar} name={stu.name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white truncate">
                            {stu.name}
                          </span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/25 border border-sky-400/40 text-[10px] font-bold text-sky-200 shrink-0">
                              Kamu
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              stu.online ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          />
                          <span className={stu.online ? 'text-emerald-300' : 'text-slate-400'}>
                            {stu.online ? 'Siap di Base Camp' : 'Terputus'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {role === 'teacher' && (
                      <button
                        type="button"
                        onClick={() => onKickStudent(stu.id, stu.name)}
                        title={`Keluarkan ${stu.name}`}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-red-700 text-slate-400 hover:text-white border border-white/10 cursor-pointer shrink-0 transition-colors"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
