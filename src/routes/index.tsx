import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Brain, LineChart, Sparkles, Zap, Shield, Target } from "lucide-react";
import { Nav } from "@/components/nav";
import { LightningBg } from "@/components/lightning-bg";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="relative min-h-screen">
      <Nav />
      <section className="relative overflow-hidden">
        <LightningBg />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 text-center">
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.9 }}
            className="mt-8 text-5xl md:text-7xl lg:text-8xl font-display font-semibold leading-[1.05]">
            Illuminate every
            <br />
            <span className="text-shimmer italic">student's potential</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
            className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground">
            LUMEN fuses behavioural signals, engagement metrics and study patterns into a single luminous prediction — so no learner slips through the cracks.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/login" className="group relative overflow-hidden rounded-full bg-gold-gradient px-8 py-3.5 font-medium text-primary-foreground shadow-luxe">
              <span className="relative z-10">Enter the Suite</span>
              <span className="absolute inset-0 -translate-x-full bg-white/30 skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <Link to="/predict" className="rounded-full border border-gold/40 px-8 py-3.5 font-medium text-foreground hover:bg-gold/10 transition">
              Try Prediction →
            </Link>
          </motion.div>

          {/* Floating orbs */}
          <motion.div className="absolute left-10 top-40 h-16 w-16 rounded-full bg-gold-gradient opacity-20 blur-2xl animate-float-slow" />
          <motion.div className="absolute right-16 top-60 h-24 w-24 rounded-full bg-accent opacity-30 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
        </div>
      </section>

      {/* Metrics */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: "98.4%", l: "Prediction Accuracy" },
            { v: "12k+", l: "Students Analyzed" },
            { v: "6", l: "Behavioural Factors" },
            { v: "<50ms", l: "Inference Time" },
          ].map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 text-center">
              <div className="text-3xl md:text-4xl font-display font-semibold text-gold">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display">Crafted for <span className="text-shimmer">excellence</span></h2>
          <p className="mt-4 text-muted-foreground">Every detail engineered to reveal the future of academic success.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: "Neural Analysis", desc: "A weighted, multi-factor model translates behaviour into a lucid academic forecast." },
            { icon: LineChart, title: "Live Analytics", desc: "Radial factor breakdowns visualise strengths and reveal exactly where to intervene." },
            { icon: Target, title: "Personal Insights", desc: "Tailored recommendations for each learner — precise, actionable, human." },
            { icon: Zap, title: "Instant Predictions", desc: "Sub-second inference — the entire cohort scored in one graceful sweep." },
            { icon: Shield, title: "Private by Design", desc: "Data never leaves your device. Local-first, private and sovereign." },
            { icon: Sparkles, title: "Luxury UI", desc: "A gallery-grade interface that dignifies both educators and learners." },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="glass rounded-2xl p-8 group hover:border-gold/40 transition">
              <div className="inline-flex rounded-xl bg-gold/10 p-3 text-gold group-hover:bg-gold-gradient group-hover:text-primary-foreground transition">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-display">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © 2026 LUMEN · Illuminating academic futures
      </footer>
    </div>
  );
}
