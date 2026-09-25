import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Plus, Trash2, Search, TrendingUp, Users, Award, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import {
  addStudent,
  deleteStudent,
  getPrediction,
  isLoggedIn,
  loadStudents,
  type Student,
} from "@/lib/students-store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const nav = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<
    Record<string, Awaited<ReturnType<typeof getPrediction>>>
  >({});

  useEffect(() => {
    if (!isLoggedIn()) {
      nav({ to: "/login" });
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const data = await loadStudents();
        if (isMounted) {
          setStudents(data);
          const results = await Promise.all(
            data.map(async (student) => [student.id, await getPrediction(student)] as const),
          );
          if (isMounted) {
            setPredictions(Object.fromEntries(results));
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [nav]);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase()),
  );
  const scoredStudents = students.flatMap((s) =>
    predictions[s.id] ? [{ s, p: predictions[s.id] }] : [],
  );
  const avg = scoredStudents.length
    ? Math.round(scoredStudents.reduce((a, b) => a + b.p.score, 0) / scoredStudents.length)
    : 0;
  const atRisk = scoredStudents.filter((x) => x.p.risk === "High").length;
  const top = scoredStudents.filter((x) => x.p.risk === "Low").length;

  async function handleAdd(s: Omit<Student, "id" | "createdAt">) {
    try {
      const student = await addStudent(s);
      setStudents((prev) => [student, ...prev]);
      const prediction = await getPrediction(student);
      setPredictions((prev) => ({ ...prev, [student.id]: prediction }));
      setOpen(false);
      toast.success(`${s.name} added.`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to add student.");
    }
  }
  async function handleDelete(id: string, name: string) {
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((student) => student.id !== id));
      toast.success(`${name} removed.`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to remove student.");
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl md:text-5xl">
            Student <span className="text-shimmer">Dashboard</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage, monitor and predict outcomes across your cohort.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Students" value={students.length} accent="gold" />
          <StatCard icon={TrendingUp} label="Avg. Predicted" value={`${avg}%`} accent="gold" />
          <StatCard icon={Award} label="High Performers" value={top} accent="green" />
          <StatCard icon={AlertTriangle} label="At Risk" value={atRisk} accent="red" />
        </div>

        {/* Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full rounded-full border border-border bg-input/40 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gold"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-luxe"
          >
            <Plus className="h-4 w-4" /> Add Student
          </motion.button>
        </div>

        {/* Cards grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((s, i) => {
              const p = predictions[s.id];
              if (!p) return null;
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ y: -4 }}
                  className="glass rounded-2xl p-5 group relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 h-1 w-full ${p.risk === "Low" ? "bg-emerald-400" : p.risk === "Medium" ? "bg-yellow-400" : "bg-red-400"}`}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-gold-gradient font-semibold text-primary-foreground">
                          {s.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Grade {s.grade} · {s.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Predicted
                      </div>
                      <div className="font-display text-4xl text-shimmer">{p.score}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl text-gold">{p.grade}</div>
                      <div
                        className={`text-xs ${p.risk === "Low" ? "text-emerald-400" : p.risk === "Medium" ? "text-yellow-400" : "text-red-400"}`}
                      >
                        {p.risk} Risk
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <MiniBar label="Attendance" v={s.attendance} />
                    <MiniBar label="Study Hours" v={(s.studyHours / 40) * 100} />
                    <MiniBar label="Assignments" v={s.assignments} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">
            No students match your search.
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && <AddModal onClose={() => setOpen(false)} onAdd={handleAdd} />}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  accent: string;
}) {
  const color =
    accent === "green" ? "text-emerald-400" : accent === "red" ? "text-red-400" : "text-gold";
  return (
    <motion.div whileHover={{ y: -3 }} className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-2 font-display text-3xl ${color}`}>{value}</div>
    </motion.div>
  );
}

function MiniBar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(v)}%</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full bg-gold-gradient"
        />
      </div>
    </div>
  );
}

function AddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (s: Omit<Student, "id" | "createdAt">) => void;
}) {
  const [f, setF] = useState<Omit<Student, "id" | "createdAt">>({
    name: "",
    email: "",
    grade: "10",
    attendance: 85,
    studyHours: 15,
    previousScore: 75,
    assignments: 80,
    participation: 7,
    sleepHours: 7,
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name || !f.email) {
      toast.error("Name and email required.");
      return;
    }
    onAdd(f);
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-md p-4"
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", damping: 22 }}
        className="glass relative w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="absolute -inset-1 -z-10 rounded-3xl bg-gold-gradient opacity-20 blur-2xl" />
        <h2 className="font-display text-3xl">
          Add <span className="text-shimmer">Student</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter behavioural signals to include this learner.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Text
            label="Full name"
            value={f.name}
            onChange={(v: string) => setF({ ...f, name: v })}
          />
          <Text
            label="Email"
            value={f.email}
            onChange={(v: string) => setF({ ...f, email: v })}
            type="email"
          />
          <Text label="Grade" value={f.grade} onChange={(v: string) => setF({ ...f, grade: v })} />
          <Num
            label="Previous score (%)"
            value={f.previousScore}
            onChange={(v: number) => setF({ ...f, previousScore: v })}
            max={100}
          />
          <Slider
            label="Attendance"
            v={f.attendance}
            onChange={(v: number) => setF({ ...f, attendance: v })}
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
            label="Assignments complete"
            v={f.assignments}
            onChange={(v: number) => setF({ ...f, assignments: v })}
            max={100}
            suffix="%"
          />
          <Slider
            label="Participation"
            v={f.participation}
            onChange={(v: number) => setF({ ...f, participation: v })}
            max={10}
            suffix="/10"
          />
          <Slider
            label="Sleep (hrs/night)"
            v={f.sleepHours}
            onChange={(v: number) => setF({ ...f, sleepHours: v })}
            max={12}
            suffix="h"
            step={0.5}
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-sm"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-luxe"
          >
            Add Student
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function Text({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border bg-input/40 px-4 py-2.5 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}
function Num({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        min={0}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full rounded-xl border border-border bg-input/40 px-4 py-2.5 text-sm outline-none focus:border-gold"
      />
    </label>
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
