import React, { useState } from 'react';
import { Award, Clock, Crown, Download, FileText, Medal, RotateCcw, Sparkles, Trophy, UserPlus } from 'lucide-react';
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
  onNextStudentShift?: () => void;
}

function getStudentEncouragement(
  totalScore: number,
  finished: boolean,
  rank: number,
  totalParticipants: number,
): string {
  if (finished && totalScore >= 85) {
    return 'Luar biasa! Kamu berhasil menaklukkan seluruh jalur Mount WOWO dan Pos Puncak dengan hasil gemilang!';
  }
  if (finished) {
    return 'Hebat! Kamu pantang menyerah hingga menyelesaikan Pos Ujian Puncak. Setiap langkah pendakianmu sangat berarti!';
  }
  if (rank > 0 && rank <= Math.max(3, Math.ceil(totalParticipants * 0.3))) {
    return 'Usaha yang sangat bagus! Terus pertahankan semangat belajarmu untuk menaklukkan puncak berikutnya.';
  }
  return 'Terima kasih sudah berjuang mendaki Mount WOWO! Setiap soal yang kamu kerjakan melatih ketelitian dan keberanianmu.';
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
  onNextStudentShift,
}) => {
  const [viewTab, setViewTab] = useState<'summary' | 'essay'>('summary');
  const [confirmNextShift, setConfirmNextShift] = useState(false);

  const studentIdx =
    role === 'student' && currentStudentId
      ? leaderboard.findIndex((r) => r.id === currentStudentId)
      : -1;
  const studentRow = studentIdx >= 0 ? leaderboard[studentIdx] : leaderboard[0] || null;
  const studentRank = studentIdx >= 0 ? studentIdx + 1 : 1;
  const totalClimbers = Math.max(1, leaderboard.length);
  const studentGrade = studentRow
    ? computeFinalGrade(
        studentRow.correctCount,
        studentRow.essayCorrect || 0,
        pgWeight,
        essayWeight,
      )
    : null;

  // STUDENT VIEW: Private Personal Report Card Only (No full class comparison table)
  if (role === 'student') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/88 overflow-y-auto">
        <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-emerald-400/40 p-5 sm:p-6 shadow-2xl space-y-5 my-auto">
          {endReason === 'timeout' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/85 border border-red-500/60 text-red-100">
              <Clock className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <div className="font-display text-sm sm:text-base font-extrabold tracking-wide text-red-200">
                  WAKTU HABIS — EKSPEDISI SELESAI!
                </div>
                <p className="text-xs text-red-200/90">
                  Durasi ujian kelas telah berakhir. Nilai akhirmu otomatis direkap.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                <Award className="w-4 h-4" />
                <span>Kartu Rapor Ekspedisi · Ruang {roomCode}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
                RAPOR PRIBADI PENDAKI
              </h2>
            </div>
          </div>

          {studentRow && studentGrade ? (
            <div className="space-y-4">
              {/* Personal Rank Celebration Hero */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-amber-400/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Nama Pendaki</div>
                  <div className="text-xl font-bold text-white">{studentRow.name}</div>
                  <div className="text-sm font-semibold text-amber-300 font-mono-num">
                    Peringkat #{studentRank} dari {totalClimbers} Pendaki
                  </div>
                </div>
                <div className="px-5 py-3 rounded-xl bg-emerald-950/75 border border-emerald-400/45 text-center shrink-0">
                  <div className="text-[11px] font-semibold text-emerald-300">
                    Nilai Akhir (0–100)
                  </div>
                  <div className="text-4xl font-mono-num font-extrabold text-emerald-400 tabular-nums">
                    {studentGrade.totalScore}
                  </div>
                </div>
              </div>

              {/* Personal Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <div className="text-xs text-slate-400">PG Benar</div>
                  <div className="text-lg font-mono-num font-bold text-sky-300 tabular-nums">
                    {studentRow.correctCount} / 25
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-num mt-0.5">
                    Bobot {pgWeight}%: {studentGrade.pgScore}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <div className="text-xs text-slate-400">Isian Benar</div>
                  <div className="text-lg font-mono-num font-bold text-amber-300 tabular-nums">
                    {studentRow.essayCorrect || 0} / 5
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-num mt-0.5">
                    Bobot {essayWeight}%: {studentGrade.essayScore}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <div className="text-xs text-slate-400">Pos Tercapai</div>
                  <div className="text-lg font-mono-num font-bold text-white tabular-nums">
                    CP {studentRow.currentCP} / 25
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {studentRow.finished ? 'Tuntas Puncak' : 'Ekspedisi Selesai'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <div className="text-xs text-slate-400">Skor Poin</div>
                  <div className="text-lg font-mono-num font-bold text-amber-200 tabular-nums">
                    {studentRow.score} pts
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-num mt-0.5">
                    Jumlah Jatuh: {studentRow.fallCount}x
                  </div>
                </div>
              </div>

              {/* Positive Motivation Message */}
              <div className="p-4 rounded-xl bg-sky-950/45 border border-sky-400/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-200 leading-relaxed">
                  {getStudentEncouragement(
                    studentGrade.totalScore,
                    studentRow.finished,
                    studentRank,
                    totalClimbers,
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              Data rapor pendakian belum tersedia.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            {onNextStudentShift && (
              <button
                type="button"
                onClick={() => setConfirmNextShift(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Ganti Siswa (Giliran Berikutnya)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackToLobby}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Kembali ke Halaman Utama</span>
            </button>
          </div>

          {confirmNextShift && onNextStudentShift && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-400/50 p-5 shadow-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Ganti ke Siswa Berikutnya?</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Yakin ingin mengganti ke siswa berikutnya? Nilai kamu sudah tersimpan aman di Guru.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmNextShift(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmNextShift(false);
                      onNextStudentShift();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer"
                  >
                    Ya, Ganti Siswa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // TEACHER VIEW: Festive Top 3 / Top 5 Podium + Full Table + Styled Excel Export
  const topThree = leaderboard.slice(0, 3);
  const rankFourFive = leaderboard.slice(3, 5);
  const podiumOrder = [
    topThree[1] ? { row: topThree[1], rank: 2 } : null,
    topThree[0] ? { row: topThree[0], rank: 1 } : null,
    topThree[2] ? { row: topThree[2], rank: 3 } : null,
  ].filter(Boolean) as Array<{ row: ParticipantSummary; rank: 1 | 2 | 3 }>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/88 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-slate-900 border border-amber-400/40 p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
        {endReason === 'timeout' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/85 border border-red-500/60 text-red-100">
            <Clock className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-display text-base sm:text-lg font-extrabold tracking-wide text-red-200">
                WAKTU HABIS — EKSPEDISI SELESAI!
              </div>
              <p className="text-xs text-red-200/90">
                Durasi ujian kelas telah mencapai 00:00. Seluruh pergerakan dan soal siswa dikunci otomatis.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Trophy className="w-4 h-4" />
              <span>
                Rekap Kelas 30 Soal ({pgWeight}% PG · {essayWeight}% Isian Puncak) · Ruang {roomCode}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              PODIUM JUARA &amp; NILAI AKHIR MOUNT WOWO
            </h2>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/10">
            <button
              type="button"
              onClick={() => setViewTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                viewTab === 'summary' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Nilai Akhir (0–100)
            </button>
            <button
              type="button"
              onClick={() => setViewTab('essay')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                viewTab === 'essay' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Jawaban Ketikan Isian</span>
            </button>
          </div>
        </div>

        {/* Festive Top 3 / Top 5 Projector Podium */}
        {leaderboard.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-400/25 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {podiumOrder.map(({ row, rank }) => {
                const g = computeFinalGrade(
                  row.correctCount,
                  row.essayCorrect || 0,
                  pgWeight,
                  essayWeight,
                );
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const cardClasses = isFirst
                  ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400/70 sm:order-2 sm:pb-6'
                  : isSecond
                    ? 'bg-gradient-to-b from-slate-400/20 to-slate-900 border-slate-300/45 sm:order-1'
                    : 'bg-gradient-to-b from-orange-700/25 to-slate-900 border-orange-500/45 sm:order-3';

                return (
                  <div
                    key={row.id}
                    className={`rounded-xl border p-3.5 text-center space-y-1.5 ${cardClasses}`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {isFirst ? (
                        <Crown className="w-5 h-5 text-amber-300" />
                      ) : (
                        <Medal className={`w-4 h-4 ${isSecond ? 'text-slate-200' : 'text-orange-300'}`} />
                      )}
                      <span
                        className={`text-xs font-mono-num font-extrabold ${
                          isFirst ? 'text-amber-300' : isSecond ? 'text-slate-200' : 'text-orange-300'
                        }`}
                      >
                        JUARA #{rank}
                      </span>
                    </div>
                    <div className="text-base font-bold text-white truncate">{row.name}</div>
                    <div className="text-2xl font-mono-num font-extrabold text-emerald-400 tabular-nums">
                      {g.totalScore}
                    </div>
                    <div className="text-[11px] font-mono-num text-slate-300">
                      PG {row.correctCount}/25 · Isian {row.essayCorrect || 0}/5 · {row.score} pts
                    </div>
                  </div>
                );
              })}
            </div>

            {rankFourFive.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/10">
                {rankFourFive.map((row, idx) => {
                  const g = computeFinalGrade(
                    row.correctCount,
                    row.essayCorrect || 0,
                    pgWeight,
                    essayWeight,
                  );
                  return (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/90 border border-white/10 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono-num font-bold text-sky-300">#{idx + 4}</span>
                        <span className="font-semibold text-white truncate">{row.name}</span>
                      </div>
                      <div className="font-mono-num text-slate-300 shrink-0">
                        Nilai <strong className="text-emerald-400">{g.totalScore}</strong> · {row.score} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {viewTab === 'summary' ? (
          <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-white/10">
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
                    return (
                      <tr key={row.id} className={i < 3 ? 'bg-amber-500/5' : ''}>
                        <td className="py-2.5 px-2.5 font-mono-num font-bold text-amber-300">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-2.5 font-semibold text-white">{row.name}</td>
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
          <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-white/10">
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
          <button
            type="button"
            onClick={() =>
              exportResultsToExcel(roomCode, leaderboard, exportRows, pgWeight, essayWeight)
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Rekap Excel (.xlsx)</span>
          </button>
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
