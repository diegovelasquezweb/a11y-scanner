"use client";

interface ScoreGaugeProps {
  score: number;
  label: string;
  wcagStatus: "Pass" | "Conditional Pass" | "Fail";
}

export function ScoreGauge({ score, label, wcagStatus }: ScoreGaugeProps) {
  const scoreHue = wcagStatus === "Fail" ? 0 : score >= 75 ? 142 : score >= 55 ? 38 : 0;

  return (
    <div className="premium-card rounded-md p-6 flex flex-col items-center justify-center text-center relative overflow-hidden w-full">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <svg
          className="w-32 h-32 text-slate-900"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
      <div className="relative w-32 h-32 mb-4" role="img" aria-label={`Compliance score: ${score} out of 100`}>
        <svg className="w-full h-full score-gauge" viewBox="0 0 36 36">
          <circle className="score-gauge-bg" cx="18" cy="18" r="16" />
          <circle
            className="score-gauge-val"
            cx="18"
            cy="18"
            r="16"
            stroke={`hsl(${scoreHue}, 70%, 50%)`}
            strokeDasharray={`${score}, 100`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-slate-900">{score}</span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
            Score
          </span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">{label} Compliance</h3>
      <p className="text-xs font-medium text-slate-500 max-w-50 leading-snug">
        Based on automated accessibility technical checks.
      </p>
    </div>
  );
}
