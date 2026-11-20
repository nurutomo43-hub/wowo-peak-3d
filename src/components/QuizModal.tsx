import React from 'react';
import { Clock } from 'lucide-react';
import type { ShuffledQuestion } from '../types/game';

interface QuizModalProps {
  cpIndex: number;
  question: ShuffledQuestion;
  timeLeft: number;
  totalDuration: number;
  answered: boolean;
  chosenLetter: string | null;
  explanationTimeLeft: number;
  onSelectOption: (letter: 'A' | 'B' | 'C' | 'D') => void;
  onContinueEarly: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  cpIndex,
  question,
  timeLeft,
  totalDuration,
  answered,
  chosenLetter,
  explanationTimeLeft,
  onSelectOption,
  onContinueEarly,
}) => {
  const pct = Math.max(0, Math.min(100, (timeLeft / Math.max(1, totalDuration)) * 100));
  const isCorrect = answered && chosenLetter === question.answer;
  const hasExp = Boolean(question.explanation && question.explanation.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-sky-400/40 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-mono-num font-bold text-sky-400 tracking-wider">
            CHECKPOINT {cpIndex} / 25 · ZONA AMAN
          </div>
          <div className="inline-flex items-center gap-1.5 font-mono-num text-sm font-bold text-amber-300">
            <Clock className="w-4 h-4" />
            <span>{Math.max(0, Math.ceil(timeLeft))} dtk</span>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-[width] duration-200 ${
              pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <h2 className="text-lg font-semibold text-white leading-relaxed">{question.question}</h2>

        <div className="grid gap-2.5">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
            let stateClasses =
              'bg-slate-800/90 hover:bg-slate-700 border-white/15 text-slate-100 cursor-pointer';
            if (answered) {
              if (letter === question.answer) {
                stateClasses = 'bg-emerald-900/90 border-emerald-400 text-emerald-50';
              } else if (letter === chosenLetter && !isCorrect) {
                stateClasses = 'bg-red-900/90 border-red-400 text-red-50';
              } else {
                stateClasses = 'bg-slate-900/60 border-white/5 text-slate-400';
              }
            }
            return (
              <button
                key={letter}
                type="button"
                disabled={answered}
                onClick={() => onSelectOption(letter)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-start gap-3 ${stateClasses}`}
              >
                <span className="font-mono-num font-bold text-sky-300 shrink-0">{letter}.</span>
                <span>{question.options[letter]}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-2.5">
            <div
              className={`text-sm font-bold ${
                isCorrect ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isCorrect
                ? 'Jawaban Benar — Poin ditambahkan!'
                : chosenLetter
                  ? `Jawaban Belum Tepat · Kunci Jawaban: ${question.answer}`
                  : `Waktu Habis · Kunci Jawaban: ${question.answer}`}
            </div>
            {hasExp && (
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-200">Pembahasan: </span>
                {question.explanation}
              </p>
            )}
            <div className="flex items-center justify-between gap-3 pt-1 flex-wrap border-t border-white/10">
              <div className="inline-flex items-center gap-1.5 text-xs text-sky-300 font-medium font-mono-num tabular-nums">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Lanjut otomatis dalam {Math.max(0, Math.ceil(explanationTimeLeft))} dtk
                </span>
              </div>
              <button
                type="button"
                onClick={onContinueEarly}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Lanjut Mendaki Sekarang
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
