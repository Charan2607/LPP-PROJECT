import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, Lock, Zap, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LightningBg } from "@/components/lightning-bg";
import { apiLogin, apiSignup } from "@/lib/students-store";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await apiLogin(email, password);
        toast.success("Welcome back.");
      } else {
        await apiSignup(email, password, name);
        toast.success("Account created successfully.");
      }
      nav({ to: "/dashboard" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <LightningBg />

      {/* Extra lightning flashes */}
      <motion.div
        className="pointer-events-none fixed inset-0 bg-gold/5 mix-blend-screen"
        animate={{ opacity: [0, 0, 0.6, 0, 0, 0.4, 0] }}
        transition={{ duration: 5, repeat: Infinity, times: [0, 0.2, 0.22, 0.24, 0.6, 0.62, 1] }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glow behind card */}
        <div className="absolute -inset-1 rounded-3xl bg-gold-gradient opacity-20 blur-2xl animate-pulse-glow" />

        <div className="relative glass rounded-3xl p-8 md:p-10">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="rounded-xl bg-gold-gradient p-2.5 shadow-luxe"
            >
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <span className="font-display text-3xl font-semibold text-shimmer">LUMEN</span>
          </Link>

          <div className="text-center">
            <h1 className="font-display text-4xl">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to access your dashboard"
                : "Begin illuminating potential"}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <Field
                label="Full Name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="John Doe"
                icon={GraduationCap}
              />
            )}
            <Field
              icon={Mail}
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@lumen.edu"
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl bg-gold-gradient py-3.5 font-semibold text-primary-foreground shadow-luxe disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
              </span>
              <span className="absolute inset-0 -translate-x-full bg-white/40 skew-x-12 transition-transform duration-700 hover:translate-x-full" />
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New here?" : "Already a member?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-gold hover:underline"
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  icon: LucideIcon;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-2 relative group">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-gold transition" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full rounded-xl border border-border bg-input/40 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </div>
    </label>
  );
}
