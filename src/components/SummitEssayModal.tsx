import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock, Send, XCircle } from 'lucide-react';
import type { EssayQuestion } from '../types/game';

interface SummitEssayModalProps {
  questions: EssayQuestion[];
  currentIndex: number;
  feedback: {
    studentAnswer: string;
    isCorrect: boolean;
    correctKey: string;
    explanation?: string;
  } | null;
  explanationTimeLeft: number;
  onSubmitAnswer: (rawAnswer: string) => void;
  onContinueEarly: () => void;
}

export const SummitEssayModal: React.FC<SummitEssayModalProps> = ({
  questions,
  currentIndex,
  feedback,
  explanationTimeLeft,
  onSubmitAnswer,
  onContinueEarly,
}) => {
  const [inputVal, setInputVal] = useState('');
  const question = questions[currentIndex];

  useEffect(() => {
    setInputVal('');
  }, [currentIndex]);

  if (!question) return null;

  const total = questions.length;
  const pct = Math.round(((currentIndex + (feedback ? 1 : 0)) / Math.max(1, total)) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return;
    if (!inputVal.trim()) return;
    onSubmitAnswer(inputVal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/82">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-amber-400/50 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-mono-num font-bold text-amber-300 tracking-wider">
            <Award className="w-4 h-4 text-amber-400" />
            <span>GAPURA PUNCAK · POS UJIAN AKHIR</span>
          </div>
          <div className="text-xs font-mono-num font-bold text-sky-300">
            ISIAN SINGKAT {currentIndex + 1} / {total}
          </div>
        </div>

        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <h2 className="text-lg font-semibold text-white leading-relaxed">{question.question}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="summit-essay-input" className="block text-xs text-slate-400 mb-1.5">
              Ketik jawaban singkat Anda di bawah ini (mendukung kata kunci inti, sinonim/terjemahan, & toleransi kemiripan penulisan):
            </label>
            <input
              id="summit-essay-input"
              type="text"
              autoFocus
              autoComplete="off"
              disabled={Boolean(feedback)}
              value={feedback ? feedback.studentAnswer : inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ketik jawaban singkat di sini..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/20 text-base text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 select-text disabled:opacity-75"
            />
          </div>

          {!feedback && (
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-sm font-bold text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Jawaban</span>
            </button>
          )}
        </form>

        {feedback && (
          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              feedback.isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/50'
                : 'bg-red-950/60 border-red-500/50'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              {feedback.isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Jawaban Tepat — Nilai Puncak Ditambahkan!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-red-300">
                    Jawaban Belum Cocok · Kunci: {feedback.correctKey}
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-300">
              Ketikan tersimpan: <strong className="text-white">"{feedback.studentAnswer}"</strong>
            </div>
            {feedback.explanation && (
              <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                <span className="font-semibold text-slate-200">Pembahasan: </span>
                {feedback.explanation}
              </p>
            )}
            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap border-t border-white/10">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 font-medium font-mono-num tabular-nums">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Lanjut otomatis dalam {Math.max(0, Math.ceil(explanationTimeLeft))} dtk
                </span>
              </div>
              <button
                type="button"
                onClick={onContinueEarly}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {currentIndex + 1 < total
                  ? 'Lanjut ke Soal Berikutnya'
                  : 'Selesaikan Ujian Puncak'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
