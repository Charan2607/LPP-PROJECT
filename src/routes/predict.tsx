import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Nav } from "@/components/nav";
import { getPrediction } from "@/lib/students-store";
import { LightningBg } from "@/components/lightning-bg";
import { toast } from "sonner";

export const Route = createFileRoute("/predict")({ component: Predict });

function Predict() {
  const [f, setF] = useState({
    attendance: 85,
    studyHours: 15,
    previousScore: 75,
    assignments: 80,
    participation: 7,
    sleepHours: 7,
  });
  const [computed, setComputed] = useState<Awaited<ReturnType<typeof getPrediction>> | null>(null);
  const [running, setRunning] = useState(false);
  const [modelName, setModelName] = useState<string | null>(null);
  async function run() {
    setRunning(true);
    try {
      const res = await getPrediction(f);
      setComputed(res);
      setModelName(res.model);
    } catch (e) {
      console.error(e);
      toast.error("Prediction service unavailable or failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <Nav />
      <div className="relative">
        <LightningBg />
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-3 w-3" />{" "}
              {modelName ? `${modelName} Prediction` : "Live Prediction"}
            </div>
            <h1 className="mt-4 font-display text-5xl md:text-6xl">
              Predict a <span className="text-shimmer">Score</span>
            </h1>
            <p className="mt-2 text-muted-foreground max-w-xl">
              Adjust the signals — watch the forecast reshape in real time.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
            {/* Inputs */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-3xl p-8"
            >
              <h2 className="font-display text-2xl">Behavioural Inputs</h2>
              <div className="mt-6 space-y-5">
                <Slider
                  label="Previous score"
                  v={f.previousScore}
                  onChange={(v: number) => setF({ ...f, previousScore: v })}
                  max={100}
                  suffix="%"
                />
                <Slider
                  label="Attendance"
                  v={f.attendance}
                  onChange={(v: number) => setF({ ...f, attendance: v })}
                  max={100}
                  suffix="%"
                />
                <Slider
                  label="Assignments complete"
                  v={f.assignments}
                  onChange={(v: number) => setF({ ...f, assignments: v })}
                  max={100}
                  suffix="%"
                />
                <Slider
                  label="Study hours / week"
                  v={f.studyHours}
                  onChange={(v: number) => setF({ ...f, studyHours: v })}
                  max={40}
                  suffix="h"
                />
                <Slider
                  label="Participation"
                  v={f.participation}
                  onChange={(v: number) => setF({ ...f, participation: v })}
                  max={10}
                  suffix="/10"
                />
                <Slider
                  label="Sleep per night"
                  v={f.sleepHours}
                  onChange={(v: number) => setF({ ...f, sleepHours: v })}
                  max={12}
                  suffix="h"
                  step={0.5}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={run}
                className="mt-8 relative w-full overflow-hidden rounded-xl bg-gold-gradient py-3.5 font-semibold text-primary-foreground shadow-luxe"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <motion.span
                    animate={running ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="h-5 w-5" />
                  </motion.span>
                  {running ? "Computing..." : "Run Prediction"}
                </span>
              </motion.button>
            </motion.div>

            {/* Result */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-3xl p-8 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold-gradient opacity-20 blur-3xl animate-pulse-glow" />
              <h2 className="font-display text-2xl">Predicted Outcome</h2>

              {computed ? (
                <>
                  <div className="mt-6 flex items-center gap-6">
                    <RadialScore value={computed.score} />
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Grade
                      </div>
                      <div className="font-display text-6xl text-shimmer">{computed.grade}</div>
                      <div
                        className={`mt-1 text-sm ${computed.risk === "Low" ? "text-emerald-400" : computed.risk === "Medium" ? "text-yellow-400" : "text-red-400"}`}
                      >
                        {computed.risk} risk
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                      Factor Breakdown
                    </div>
                    <div className="space-y-2.5">
                      {computed.factors.map((fac, i) => (
                        <motion.div
                          key={fac.label}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div className="flex justify-between text-xs">
                            <span>
                              {fac.label}{" "}
                              <span className="text-muted-foreground">· {fac.weight}%</span>
                            </span>
                            <span className="text-gold">{fac.value}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fac.value}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gold-gradient"
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 rounded-xl border border-gold/20 bg-gold/5 p-4">
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      Recommendations
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {computed.suggestions.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="text-gold">◆</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="mt-8 text-muted-foreground">
                  Run a prediction to score these inputs with the trained model.
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  v,
  onChange,
  max,
  suffix,
  step = 1,
}: {
  label: string;
  v: number;
  onChange: (value: number) => void;
  max: number;
  suffix: string;
  step?: number;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="text-gold">
          {v}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[oklch(0.82_0.14_85)]"
      />
    </label>
  );
}

function RadialScore({ value }: { value: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} stroke="oklch(0.24 0.04 285)" strokeWidth="10" fill="none" />
        <motion.circle
          cx="64"
          cy="64"
          r={r}
          stroke="url(#g)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 8px oklch(0.82 0.14 85 / 0.6))" }}
        />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.14 85)" />
            <stop offset="100%" stopColor="oklch(0.9 0.09 90)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-3xl text-shimmer">{value}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
        </div>
      </div>
    </div>
  );
}
