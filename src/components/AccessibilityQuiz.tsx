"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, X, ArrowRight, RotateCcw } from "lucide-react";
import type { EngineKnowledge } from "@diegovelasquezweb/a11y-engine";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mc(question: string, correct: string, wrong: string[]): Question {
  const options = shuffle([correct, ...wrong]);
  return { question, options, correctIndex: options.indexOf(correct) };
}

function buildQuestions(knowledge: EngineKnowledge): Question[] {
  const pool: Question[] = [];
  const principles = knowledge.wcagPrinciples ?? [];
  const levels = knowledge.conformanceLevels ?? [];
  const personas = knowledge.personas ?? [];
  const severities = knowledge.severityLevels ?? [];
  const docs = knowledge.docs?.sections ?? [];

  
  for (const p of principles) {
    const wrong = shuffle(principles.filter((x) => x.id !== p.id)).slice(0, 3).map((x) => x.name);
    pool.push(mc(`Which WCAG principle states: "${p.description}"`, p.name, wrong));
  }

  
  for (const l of levels) {
    const wrong = shuffle(levels.filter((x) => x.id !== l.id)).map((x) => x.label);
    pool.push(mc(`Which conformance level is described as "${l.shortDescription}"?`, l.label, wrong));
  }

  
  for (const p of personas) {
    const wrong = shuffle(personas.filter((x) => x.id !== p.id)).slice(0, 3).map((x) => x.label);
    pool.push(mc(`"${p.description}" describes which user group?`, p.label, wrong));
  }

  
  for (const s of severities) {
    const wrong = shuffle(severities.filter((x) => x.id !== s.id)).slice(0, 3).map((x) => x.label);
    pool.push(mc(`Which severity level means "${s.shortDescription}"?`, s.label, wrong));
  }

  
  const glossary = knowledge.glossary ?? [];
  for (const g of glossary) {
    if (g.definition && severities.some((s) => s.id === g.term)) {
      const wrong = shuffle(glossary.filter((x) => x.term !== g.term).map((x) => x.term)).slice(0, 3);
      if (wrong.length >= 2) {
        pool.push(mc(`"${g.definition}" defines which term?`, g.term, wrong));
      }
    }
  }

  
  const allArticles = docs.flatMap((s) => [
    ...(s.articles ?? []),
    ...(s.groups ?? []).flatMap((g) => g.articles),
  ]);
  const taggedArticles = allArticles.filter((a) => a.tag && /^\d{4}$/.test(a.tag));
  for (const a of taggedArticles) {
    const wrongYears = shuffle(taggedArticles.filter((x) => x.id !== a.id).map((x) => x.tag!)).slice(0, 2);
    if (wrongYears.length >= 2) {
      pool.push(mc(`What year was ${a.title} published?`, a.tag!, wrongYears));
    }
  }

  
  if (principles.length >= 3) {
    const count = String(principles.length);
    const wrong = ["3", "5", "6"].filter((n) => n !== count);
    pool.push(mc("How many principles does WCAG define?", count, wrong));
  }

  
  const aaLevel = levels.find((l) => l.id === "AA");
  if (aaLevel && levels.length >= 2) {
    const wrong = levels.filter((l) => l.id !== "AA").map((l) => l.label);
    pool.push(mc("Which conformance level is recommended for most websites?", aaLevel.label, wrong));
  }

  return shuffle(pool).slice(0, 6);
}

interface AccessibilityQuizProps {
  knowledge: EngineKnowledge | null;
  visible: boolean;
}

export function AccessibilityQuiz({ knowledge, visible }: AccessibilityQuizProps) {
  const [round, setRound] = useState(0);
  const questions = useMemo(() => knowledge ? buildQuestions(knowledge) : [], [knowledge, round]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const isFinished = current >= questions.length;

  const handleSelect = useCallback((idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[current]?.correctIndex) {
      setScore((s) => s + 1);
    }
  }, [answered, current, questions]);

  const handleNext = useCallback(() => {
    setCurrent((c) => c + 1);
    setSelected(null);
    setAnswered(false);
  }, []);

  const handleRestart = useCallback(() => {
    setRound((r) => r + 1);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
  }, []);

  if (!visible || !knowledge || questions.length === 0) return null;

  if (isFinished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="w-full max-w-2xl mt-6">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-md px-5 py-5 shadow-sm text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quiz Complete</p>
          <p className="text-2xl font-extrabold text-slate-900 mb-1">
            {score}/{questions.length}
          </p>
          <p className="text-sm text-slate-500 mb-4">
            {pct >= 80 ? "Excellent knowledge!" : pct >= 50 ? "Good effort!" : "Keep learning!"}
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-md bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="w-full max-w-2xl mt-6">
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-md px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            While you wait...
          </p>
          <span className="text-xs font-bold text-slate-400 tabular-nums">
            {current + 1}/{questions.length}
          </span>
        </div>

        <p className="text-sm font-bold text-slate-900 mb-4 leading-relaxed">
          {q.question}
        </p>

        <div className="space-y-2">
          {q.options.map((option, idx) => {
            const isCorrect = idx === q.correctIndex;
            const isSelected = idx === selected;
            let style = "bg-white border-slate-200 hover:border-slate-300 text-slate-700";
            if (answered) {
              if (isCorrect) style = "bg-emerald-50 border-emerald-300 text-emerald-800";
              else if (isSelected) style = "bg-rose-50 border-rose-300 text-rose-800";
              else style = "bg-white border-slate-100 text-slate-400";
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={`w-full text-left px-4 py-3 rounded-md border text-sm font-medium transition-all ${style} disabled:cursor-default`}
              >
                <span className="flex items-center gap-2.5">
                  {answered && isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />}
                  {answered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />}
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors"
            >
              {current + 1 < questions.length ? "Next" : "See Results"}
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
