import React, { useState } from 'react';
import { Clock, Download, FileText, RotateCcw, Trophy } from 'lucide-react';
import type { ExportStudentRow, ParticipantSummary, Role } from '../types/game';
import { computeFinalGrade, exportResultsToExcel } from '../game/questions';

interface LeaderboardModalProps {
  roomCode: string;
  role: Role;
  endReason: 'teacher' | 'timeout';
  currentStudentId: string;
  leaderboard: ParticipantSummary[];
  exportRows: ExportStudentRow[];
  pgWeight: number;
  essayWeight: number;
  onBackToLobby: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  roomCode,
  role,
  endReason,
  currentStudentId,
  leaderboard,
  exportRows,
  pgWeight,
  essayWeight,
  onBackToLobby,
}) => {
  const [viewTab, setViewTab] = useState<'summary' | 'essay'>('summary');

  const studentIdx =
    role === 'student' && currentStudentId
      ? leaderboard.findIndex((r) => r.id === currentStudentId)
      : -1;
  const studentRow = studentIdx >= 0 ? leaderboard[studentIdx] : null;
  const studentGrade = studentRow
    ? computeFinalGrade(
        studentRow.correctCount,
        studentRow.essayCorrect || 0,
        pgWeight,
        essayWeight,
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-slate-900 border border-amber-400/40 p-6 shadow-2xl space-y-4 my-auto">
        {endReason === 'timeout' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/85 border border-red-500/60 text-red-100">
            <Clock className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-display text-base sm:text-lg font-extrabold tracking-wide text-red-200">
                WAKTU HABIS — EKSPEDISI SELESAI!
              </div>
              <p className="text-xs text-red-200/90">
                Durasi ujian kelas telah mencapai 00:00. Seluruh pergerakan dan soal dikunci otomatis.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Trophy className="w-4 h-4" />
              <span>
                Rekap Akhir 30 Soal ({pgWeight}% PG · {essayWeight}% Isian Puncak) · Ruang {roomCode}
              </span>
            </div>
            <h2 className="font-display text-3xl font-extrabold text-white mt-0.5">
              PERINGKAT &amp; NILAI AKHIR MOUNT WOWO
            </h2>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/10">
            <button
              type="button"
              onClick={() => setViewTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewTab === 'summary' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Nilai Akhir (0–100)
            </button>
            <button
              type="button"
              onClick={() => setViewTab('essay')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewTab === 'essay' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Jawaban Ketikan Isian</span>
            </button>
          </div>
        </div>

        {/* Personal Student Final Score Card */}
        {role === 'student' && studentRow && studentGrade && (
          <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-400/40 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm font-bold text-emerald-300">
                Kartu Hasil &amp; Nilai Akhir Siswa — {studentRow.name}
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-xs font-mono-num font-bold text-amber-300">
                Peringkat Kelas #{studentIdx + 1} dari {leaderboard.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
                <div className="text-[11px] text-slate-400">PG Benar</div>
                <div className="text-base font-mono-num font-bold text-sky-300">
                  {studentRow.correctCount} / 25
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
                <div className="text-[11px] text-slate-400">Isian Benar</div>
                <div className="text-base font-mono-num font-bold text-amber-300">
                  {studentRow.essayCorrect || 0} / 5
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
                <div className="text-[11px] text-slate-400">Nilai PG ({pgWeight}%)</div>
                <div className="text-base font-mono-num font-bold text-slate-100">
                  {studentGrade.pgScore} / {pgWeight}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
                <div className="text-[11px] text-slate-400">Nilai Isian ({essayWeight}%)</div>
                <div className="text-base font-mono-num font-bold text-slate-100">
                  {studentGrade.essayScore} / {essayWeight}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50">
                <div className="text-[11px] text-emerald-300 font-semibold">Total Nilai Akhir</div>
                <div className="text-xl font-mono-num font-extrabold text-emerald-400">
                  {studentGrade.totalScore}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
                <div className="text-[11px] text-slate-400">CP Tercapai</div>
                <div className="text-base font-mono-num font-bold text-white">
                  {studentRow.currentCP} / 25
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
                <div className="text-[11px] text-slate-400">Skor Poin</div>
                <div className="text-base font-mono-num font-bold text-amber-200">
                  {studentRow.score}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewTab === 'summary' ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-white/10">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-slate-950 sticky top-0 text-[11px] sm:text-xs text-amber-300">
                <tr>
                  <th className="py-2.5 px-2.5 font-semibold">#</th>
                  <th className="py-2.5 px-2.5 font-semibold">Nama Siswa</th>
                  <th className="py-2.5 px-2.5 font-semibold">CP</th>
                  <th className="py-2.5 px-2.5 font-semibold">PG (0–25)</th>
                  <th className="py-2.5 px-2.5 font-semibold">Isian (0–5)</th>
                  <th className="py-2.5 px-2.5 font-semibold">Benar (0–30)</th>
                  <th className="py-2.5 px-2.5 font-semibold">Nilai PG</th>
                  <th className="py-2.5 px-2.5 font-semibold">Nilai Isian</th>
                  <th className="py-2.5 px-2.5 font-semibold text-emerald-300">Nilai Akhir</th>
                  <th className="py-2.5 px-2.5 font-semibold">Skor Poin</th>
                  <th className="py-2.5 px-2.5 font-semibold">Jatuh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-900/80">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-slate-400">
                      Belum ada data peserta pada sesi ini.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((row, i) => {
                    const g = computeFinalGrade(
                      row.correctCount,
                      row.essayCorrect || 0,
                      pgWeight,
                      essayWeight,
                    );
                    const isMe = Boolean(currentStudentId && row.id === currentStudentId);
                    return (
                      <tr
                        key={row.id}
                        className={
                          isMe
                            ? 'bg-emerald-500/15'
                            : i < 3
                              ? 'bg-amber-500/5'
                              : ''
                        }
                      >
                        <td className="py-2.5 px-2.5 font-mono-num font-bold text-amber-300">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-2.5 font-semibold text-white">
                          {row.name}
                          {isMe ? (
                            <span className="ml-1.5 text-[10px] font-semibold text-emerald-300">
                              (Anda)
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-slate-200">
                          {row.currentCP}/25
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-sky-300">
                          {row.correctCount}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-amber-300">
                          {row.essayCorrect || 0}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-white font-semibold">
                          {g.totalCorrect}/30
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-slate-300">
                          {g.pgScore}/{pgWeight}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-slate-300">
                          {g.essayScore}/{essayWeight}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num font-bold text-emerald-400 text-sm">
                          {g.totalScore}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-slate-300">
                          {row.score}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono-num text-red-300">{row.fallCount}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-white/10">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-slate-950 sticky top-0 text-xs text-sky-300">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Nama Siswa</th>
                  <th className="py-2.5 px-3 font-semibold">No</th>
                  <th className="py-2.5 px-3 font-semibold">Pertanyaan Puncak</th>
                  <th className="py-2.5 px-3 font-semibold">Jawaban Ketikan Siswa</th>
                  <th className="py-2.5 px-3 font-semibold">Kunci Diterima</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-900/80">
                {exportRows.every((r) => !r.essayAnswers || r.essayAnswers.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Belum ada jawaban Isian Singkat Puncak yang tercatat.
                    </td>
                  </tr>
                ) : (
                  exportRows.flatMap((stu) =>
                    (stu.essayAnswers || []).map((ans, idx) => (
                      <tr key={`${stu.id}_${ans.no}_${idx}`}>
                        <td className="py-2 px-3 font-semibold text-white">{stu.name}</td>
                        <td className="py-2 px-3 font-mono-num text-amber-300">#{ans.no}</td>
                        <td className="py-2 px-3 text-slate-300 max-w-xs">{ans.question}</td>
                        <td className="py-2 px-3 font-semibold text-white">"{ans.studentAnswer}"</td>
                        <td className="py-2 px-3 text-slate-400 font-mono-num text-xs">{ans.correctKey}</td>
                        <td className="py-2 px-3 font-bold">
                          <span className={ans.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                            {ans.isCorrect ? 'BENAR' : 'BELUM TEPAT'}
                          </span>
                        </td>
                      </tr>
                    )),
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 flex-wrap">
          {role === 'teacher' && (
            <button
              type="button"
              onClick={() =>
                exportResultsToExcel(roomCode, leaderboard, exportRows, pgWeight, essayWeight)
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rekap Nilai Lengkap (.xlsx)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToLobby}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-semibold text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Kembali ke Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
