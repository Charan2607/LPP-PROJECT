import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { GraduationCap, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { isLoggedIn, logout } from "@/lib/students-store";

export function Nav() {
  const navigate = useNavigate();
  const loc = useRouterState({ select: s => s.location.pathname });
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(isLoggedIn()); }, [loc]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/predict", label: "Predict" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 glass border-b border-border/40"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div whileHover={{ rotate: 12, scale: 1.1 }} className="rounded-lg bg-gold-gradient p-2 shadow-luxe">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <span className="font-display text-2xl font-semibold text-shimmer">LUMEN</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="relative text-sm text-muted-foreground hover:text-gold transition-colors">
              {l.label}
              {loc === l.to && (
                <motion.span layoutId="navdot" className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold" />
              )}
            </Link>
          ))}
        </div>
        {authed ? (
          <button onClick={() => { logout(); setAuthed(false); navigate({ to: "/login" }); }} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-gold hover:text-gold transition">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        ) : (
          <Link to="/login" className="rounded-full bg-gold-gradient px-5 py-2 text-sm font-medium text-primary-foreground shadow-luxe hover:animate-pulse-glow">
            Sign in
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
