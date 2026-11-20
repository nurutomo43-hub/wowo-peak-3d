import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Loader2,
  Lock,
  Mountain,
  RotateCcw,
  ShieldCheck,
  Upload,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import type {
  AvatarConfig,
  EssayQuestion,
  QuizQuestion,
  Role,
  StudentRestoreProgress,
} from '../types/game';
import {
  downloadEssayTemplateExcel,
  downloadPgTemplateExcel,
  parseEssayExcelQuestions,
  parseExcelQuestions,
} from '../game/questions';
import { AvatarEditor } from './AvatarEditor';

interface LobbyModalProps {
  role: Role;
  lockedStudentMode: boolean;
  onChangeRole: (role: Role) => void;
  avatar: AvatarConfig;
  onChangeAvatar: (avatar: AvatarConfig) => void;
  studentName: string;
  onChangeStudentName: (val: string) => void;
  roomCodeInput: string;
  onChangeRoomCodeInput: (val: string) => void;
  teacherName: string;
  onChangeTeacherName: (val: string) => void;
  initQuizDuration: number;
  onChangeInitQuizDuration: (val: number) => void;
  initSessionDuration: number;
  onChangeInitSessionDuration: (val: number) => void;
  initExplanationDuration: number;
  onChangeInitExplanationDuration: (val: number) => void;
  customQuestions: QuizQuestion[] | null;
  pgFileName: string;
  onChangeCustomQuestions: (q: QuizQuestion[] | null, fileName?: string) => void;
  customEssayQuestions: EssayQuestion[] | null;
  essayFileName: string;
  onChangeCustomEssayQuestions: (q: EssayQuestion[] | null, fileName?: string) => void;
  pgWeight: number;
  essayWeight: number;
  onChangeWeights: (pgWeight: number, essayWeight: number) => void;
  reconnectInfo: StudentRestoreProgress | null;
  errorMsg: string;
  onError: (msg: string) => void;
  onToastSuccess: (msg: string) => void;
  onJoinStudent: () => void;
  onCreateRoom: () => void;
  isConnecting?: boolean;
  connectionStatus?: string;
  supabaseConfigError?: string | null;
  standalonePacketInfo?: {
    roomCode: string;
    teacherName: string;
    questionCount: number;
    essayQuestionCount: number;
  } | null;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  role,
  lockedStudentMode,
  onChangeRole,
  avatar,
  onChangeAvatar,
  studentName,
  onChangeStudentName,
  roomCodeInput,
  onChangeRoomCodeInput,
  teacherName,
  onChangeTeacherName,
  initQuizDuration,
  onChangeInitQuizDuration,
  initSessionDuration,
  onChangeInitSessionDuration,
  initExplanationDuration,
  onChangeInitExplanationDuration,
  customQuestions,
  pgFileName,
  onChangeCustomQuestions,
  customEssayQuestions,
  essayFileName,
  onChangeCustomEssayQuestions,
  pgWeight,
  essayWeight,
  onChangeWeights,
  reconnectInfo,
  errorMsg,
  onError,
  onToastSuccess,
  onJoinStudent,
  onCreateRoom,
  isConnecting = false,
  connectionStatus = '',
  supabaseConfigError = null,
  standalonePacketInfo = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const essayFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editorExpanded, setEditorExpanded] = useState(true);
  const [pgImportAlert, setPgImportAlert] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [essayImportAlert, setEssayImportAlert] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const res = await parseExcelQuestions(file);
      onChangeCustomQuestions(res.questions, file.name);
      onError('');
      const toastText = `Berhasil mengimpor ${res.questions.length} Soal PG dari ${file.name}!`;
      const warnNote = res.warnings.length > 0 ? ` (${res.warnings[0]})` : '';
      setPgImportAlert({ type: 'ok', text: `${toastText}${warnNote}` });
      onToastSuccess(toastText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel Soal PG.';
      setPgImportAlert({ type: 'err', text: msg });
      onError(msg);
    } finally {
      input.value = '';
    }
  };

  const handleEssayFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const res = await parseEssayExcelQuestions(file);
      onChangeCustomEssayQuestions(res.questions, file.name);
      onError('');
      const toastText = `Berhasil mengimpor ${res.questions.length} Soal Isian dari ${file.name}!`;
      const warnNote = res.warnings.length > 0 ? ` (${res.warnings[0]})` : '';
      setEssayImportAlert({ type: 'ok', text: `${toastText}${warnNote}` });
      onToastSuccess(toastText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel Soal Isian Singkat.';
      setEssayImportAlert({ type: 'err', text: msg });
      onError(msg);
    } finally {
      input.value = '';
    }
  };

  const handleResetQuestions = () => {
    onChangeCustomQuestions(null, '');
    setPgImportAlert(null);
    onError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetEssayQuestions = () => {
    onChangeCustomEssayQuestions(null, '');
    setEssayImportAlert(null);
    onError('');
    if (essayFileInputRef.current) essayFileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header Banner */}
        <div className="px-6 pt-5 pb-4 border-b border-white/10 bg-slate-950/65">
          <p className="text-xs font-medium text-amber-400 tracking-wide">
            Ekspedisi Pendakian 3D Multiplayer Kelas
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-0.5">
            WOWO PEAK: 3D EXPEDITION
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Climbing Mount WOWO · 25 Kuis PG + 5 Isian Singkat Puncak · Satwa Liar, Hantu &amp; Bencana Alam
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Supabase Env Validation Red Warning */}
          {supabaseConfigError && !standalonePacketInfo && (
            <div
              role="alert"
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-950/90 border border-red-500 text-sm text-red-100 shadow-lg"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-red-200">Peringatan Konfigurasi Supabase</div>
                <div>{supabaseConfigError}</div>
              </div>
            </div>
          )}

          {/* Role Switcher */}
          {!lockedStudentMode ? (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-white/10">
              <button
                type="button"
                onClick={() => onChangeRole('student')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  role === 'student'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Masuk sebagai Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeRole('teacher')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  role === 'teacher'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Buat Ruangan (Guru)</span>
              </button>
            </div>
          ) : standalonePacketInfo ? (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-950/65 border border-emerald-500/45 text-sm text-emerald-100">
              <ShieldCheck className="w-5 h-5 mt-0.5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold">
                  Link Paket Soal Mandiri Aktif (Guru: {standalonePacketInfo.teacherName}).
                </span>{' '}
                Berisi{' '}
                <strong className="font-mono-num">
                  {standalonePacketInfo.questionCount} PG &amp; {standalonePacketInfo.essayQuestionCount} Isian
                </strong>{' '}
                yang terkemas di tautan — siswa bisa langsung mendaki tanpa terhalang firewall P2P sekolah.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sky-950/60 border border-sky-500/40 text-sm text-sky-100">
              <Lock className="w-4 h-4 mt-0.5 text-sky-400 shrink-0" />
              <div>
                <span className="font-semibold">Tautan Khusus Siswa Aktif.</span> Peran dikunci
                sebagai Siswa — isi nama dan kustomisasi avatar untuk langsung bergabung ke kelas.
              </div>
            </div>
          )}

          {/* Auto-Reconnect Banner */}
          {reconnectInfo && role === 'student' && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-sm text-emerald-100">
              <div>
                <span className="font-semibold">Sesi Terpulihkan Otomatis:</span> Ruang{' '}
                <span className="font-mono-num font-bold">{reconnectInfo.roomCode}</span> · CP{' '}
                <span className="font-mono-num font-bold">{reconnectInfo.currentCP}/25</span> · Skor{' '}
                <span className="font-mono-num font-bold">{reconnectInfo.score}</span>
              </div>
            </div>
          )}

          {/* Full 3D Avatar Editor (Student & Teacher) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-sky-400" />
                <span>
                  Kustomisasi Avatar 3D {role === 'teacher' ? 'Guru Pemantau' : 'Pendaki Siswa'}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setEditorExpanded((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-sky-300 cursor-pointer whitespace-nowrap"
              >
                <span>{editorExpanded ? 'Tutup Edit Avatar' : 'Edit Avatar'}</span>
                {editorExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            {editorExpanded && (
              <AvatarEditor avatar={avatar} role={role} onChange={onChangeAvatar} />
            )}
          </div>

          <hr className="border-white/10" />

          {/* Student Join Form */}
          {role === 'student' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="student-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nama Siswa (Maks. 18 karakter)
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    maxLength={18}
                    value={studentName}
                    onChange={(e) => onChangeStudentName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 select-text"
                  />
                </div>
                <div>
                  <label htmlFor="join-room-code" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Kode Ruangan (5 Digit)
                  </label>
                  <input
                    id="join-room-code"
                    type="text"
                    maxLength={5}
                    value={roomCodeInput}
                    readOnly={lockedStudentMode && roomCodeInput.length === 5}
                    onChange={(e) =>
                      onChangeRoomCodeInput(
                        e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5),
                      )
                    }
                    placeholder="Contoh: 48291"
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm font-mono-num tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 select-text ${
                      lockedStudentMode && roomCodeInput.length === 5
                        ? 'opacity-70 cursor-not-allowed'
                        : ''
                    }`}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isConnecting}
                onClick={onJoinStudent}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-75 disabled:cursor-wait text-white font-semibold text-base transition-colors cursor-pointer"
              >
                {isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                ) : (
                  <Mountain className="w-5 h-5 shrink-0" />
                )}
                <span>
                  {isConnecting
                    ? connectionStatus || 'Menghubungkan ke ruang Guru...'
                    : standalonePacketInfo
                      ? 'Mulai Pendakian (Mode Mandiri)'
                      : 'Mulai Pendakian'}
                </span>
              </button>

              {isConnecting && (
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-950/80 border border-sky-500/45 text-xs sm:text-sm text-sky-100 text-center">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
                  <span>{connectionStatus || 'Menghubungkan ke ruang Guru...'}</span>
                </div>
              )}
            </div>
          ) : (
            /* Teacher Create Room Form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="teacher-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nama Guru (Maks. 18 karakter)
                  </label>
                  <input
                    id="teacher-name"
                    type="text"
                    maxLength={18}
                    value={teacherName}
                    onChange={(e) => onChangeTeacherName(e.target.value)}
                    placeholder="Pak/Bu Guru"
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400 select-text"
                  />
                </div>
                <div>
                  <label htmlFor="init-session-duration" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Durasi Sesi / Ujian (10–30 mnt)
                  </label>
                  <select
                    id="init-session-duration"
                    value={initSessionDuration}
                    onChange={(e) => onChangeInitSessionDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm font-mono-num text-amber-300 focus:outline-none focus:border-amber-400"
                  >
                    {[10, 15, 20, 25, 30].map((m) => (
                      <option key={m} value={m}>
                        {m} Menit
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="init-quiz-duration" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Durasi Kuis per CP (15–45 dtk)
                  </label>
                  <input
                    id="init-quiz-duration"
                    type="number"
                    min={15}
                    max={45}
                    value={initQuizDuration}
                    onChange={(e) =>
                      onChangeInitQuizDuration(Math.min(45, Math.max(15, Number(e.target.value) || 30)))
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm font-mono-num text-white focus:outline-none focus:border-amber-400 select-text"
                  />
                </div>
                <div>
                  <label htmlFor="init-explain-duration" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Durasi Pembahasan (40–60 dtk)
                  </label>
                  <select
                    id="init-explain-duration"
                    value={initExplanationDuration}
                    onChange={(e) => onChangeInitExplanationDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm font-mono-num text-sky-300 focus:outline-none focus:border-amber-400"
                  >
                    {[40, 50, 60].map((s) => (
                      <option key={s} value={s}>
                        {s} Detik
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Separate Excel Question Banks: 25 PG & 5 Short-Answer + Final Score Weight */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 1. Bank Soal PG (25 Soal CP 1-25) */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white">
                      <FileSpreadsheet className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Bank Soal PG (25 Soal CP 1–25)</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono-num ${
                        customQuestions ? 'text-emerald-300 font-semibold' : 'text-sky-300'
                      }`}
                    >
                      {customQuestions
                        ? `${customQuestions.length} PG Kustom (${pgFileName || 'Excel'})`
                        : '25 PG bawaan'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={downloadPgTemplateExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Template PG (.xlsx)</span>
                    </button>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Impor Soal PG (.xlsx)</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        hidden
                      />
                    </label>

                    {customQuestions && (
                      <button
                        type="button"
                        onClick={handleResetQuestions}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/50 text-red-300 hover:bg-red-950/60 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset ke Bawaan</span>
                      </button>
                    )}
                  </div>

                  {pgImportAlert && (
                    <div
                      className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-[11px] ${
                        pgImportAlert.type === 'err'
                          ? 'bg-red-950/85 border-red-500/50 text-red-200'
                          : 'bg-emerald-950/80 border-emerald-500/45 text-emerald-200'
                      }`}
                    >
                      {pgImportAlert.type === 'err' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <span>{pgImportAlert.text}</span>
                    </div>
                  )}

                  {customQuestions && customQuestions.length > 0 && (
                    <div className="max-h-24 overflow-y-auto rounded-lg bg-slate-900 border border-white/10 p-2 space-y-1 text-[11px] text-slate-300">
                      {customQuestions.slice(0, 3).map((q, i) => (
                        <div key={i} className="pb-1 border-b border-white/5 last:border-0 last:pb-0 truncate">
                          <span className="font-mono-num text-amber-400 mr-1">{i + 1}.</span>
                          <span>{q.question}</span>
                          <span className="text-emerald-400 ml-1 font-mono-num">({q.answer})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Bank Soal Isian Singkat / Essay (5 Soal Puncak) */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white">
                      <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Isian Singkat Puncak (5 Soal)</span>
                    </div>
                    <span
                      className={`text-[11px] font-mono-num ${
                        customEssayQuestions ? 'text-emerald-300 font-semibold' : 'text-amber-300'
                      }`}
                    >
                      {customEssayQuestions
                        ? `${customEssayQuestions.length} Isian Kustom (${essayFileName || 'Excel'})`
                        : '5 isian bawaan'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={downloadEssayTemplateExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Template Isian (.xlsx)</span>
                    </button>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Impor Soal Isian (.xlsx)</span>
                      <input
                        ref={essayFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleEssayFileChange}
                        hidden
                      />
                    </label>

                    {customEssayQuestions && (
                      <button
                        type="button"
                        onClick={handleResetEssayQuestions}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/50 text-red-300 hover:bg-red-950/60 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset ke Bawaan</span>
                      </button>
                    )}
                  </div>

                  {essayImportAlert && (
                    <div
                      className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-[11px] ${
                        essayImportAlert.type === 'err'
                          ? 'bg-red-950/85 border-red-500/50 text-red-200'
                          : 'bg-emerald-950/80 border-emerald-500/45 text-emerald-200'
                      }`}
                    >
                      {essayImportAlert.type === 'err' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <span>{essayImportAlert.text}</span>
                    </div>
                  )}

                  {customEssayQuestions && customEssayQuestions.length > 0 && (
                    <div className="max-h-24 overflow-y-auto rounded-lg bg-slate-900 border border-white/10 p-2 space-y-1 text-[11px] text-slate-300">
                      {customEssayQuestions.slice(0, 3).map((q, i) => (
                        <div key={i} className="pb-1 border-b border-white/5 last:border-0 last:pb-0 truncate">
                          <span className="font-mono-num text-amber-400 mr-1">{i + 1}.</span>
                          <span>{q.question}</span>
                          <span className="text-emerald-400 ml-1 font-mono-num">[{q.rawKey}]</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Weight Preset Selector (0-100 Final Grade) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-white/10">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Bobot Nilai Akhir (Skala 0–100)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Gabungan otomatis 25 Soal Pilihan Ganda + 5 Soal Isian Singkat Puncak
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 shrink-0">
                  {[
                    { pg: 75, es: 25, label: '75% PG · 25% Isian' },
                    { pg: 70, es: 30, label: '70% PG · 30% Isian' },
                    { pg: 80, es: 20, label: '80% PG · 20% Isian' },
                  ].map((w) => (
                    <button
                      key={w.label}
                      type="button"
                      onClick={() => onChangeWeights(w.pg, w.es)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                        pgWeight === w.pg && essayWeight === w.es
                          ? 'bg-emerald-700/80 border-emerald-400 text-white'
                          : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={isConnecting}
                onClick={onCreateRoom}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-75 disabled:cursor-wait text-white font-semibold text-base transition-colors cursor-pointer"
              >
                {isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                ) : (
                  <Mountain className="w-5 h-5 shrink-0" />
                )}
                <span>
                  {isConnecting
                    ? connectionStatus || 'Menyimpan ruangan ke Supabase...'
                    : 'Buat Ruangan Kelas (Mode Pemantau Kebal)'}
                </span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-950/85 border border-red-500/55 text-sm text-red-200 text-center">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
