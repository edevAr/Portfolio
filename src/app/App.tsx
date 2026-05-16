import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useAnimationFrame,
} from "motion/react";
import { useState, useEffect, useRef } from "react";
import type { ComponentType, MutableRefObject } from "react";
import {
  Code2,
  Briefcase,
  Award,
  Mail,
  Linkedin,
  Github,
  Server,
  Monitor,
  Database,
  Users,
  Target,
  Rocket,
  Moon,
  Sun,
  Languages,
  ChevronRight,
  Hexagon,
  Sparkle,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import {
  SiReact,
  SiAngular,
  SiNodedotjs,
  SiTypescript,
  SiSharp,
  SiGit,
  SiJira,
  SiDocker,
  SiKubernetes,
  SiGooglecloud,
  SiSpringboot,
  SiPostgresql,
} from "react-icons/si";
import { FaAws, FaMicrosoft, FaJava } from "react-icons/fa";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import {
  detectBrowserLocale,
  getLabels,
  getNextLocale,
} from "./i18n";
import type { Locale, SkillLevelKey } from "./types/labels";

type FloatingIconCfg = {
  Icon: ComponentType<{ size?: number; className?: string }>;
  leftPct: number;
  top: number;
  size: number;
  delay: number;
  rotateSeconds: number;
};

const FLOATING_ICONS_CFG: FloatingIconCfg[] = [
  { Icon: SiReact, leftPct: 4, top: 130, size: 44, delay: 0, rotateSeconds: 14 },
  { Icon: FaJava, leftPct: 10, top: 360, size: 40, delay: 1.2, rotateSeconds: 16 },
  { Icon: SiAngular, leftPct: 15, top: 600, size: 42, delay: 0.4, rotateSeconds: 14 },
  { Icon: SiNodedotjs, leftPct: 22, top: 200, size: 40, delay: 0.8, rotateSeconds: 17 },
  { Icon: SiTypescript, leftPct: 6, top: 520, size: 38, delay: 2.0, rotateSeconds: 19 },
  { Icon: SiSpringboot, leftPct: 25, top: 460, size: 40, delay: 1.6, rotateSeconds: 20 },
  { Icon: FaAws, leftPct: 88, top: 160, size: 48, delay: 0.2, rotateSeconds: 15 },
  { Icon: SiSharp, leftPct: 80, top: 360, size: 42, delay: 1.0, rotateSeconds: 17 },
  { Icon: FaMicrosoft, leftPct: 92, top: 540, size: 38, delay: 0.6, rotateSeconds: 18 },
  { Icon: SiGooglecloud, leftPct: 76, top: 580, size: 42, delay: 1.4, rotateSeconds: 16 },
  { Icon: SiDocker, leftPct: 86, top: 280, size: 42, delay: 2.2, rotateSeconds: 19 },
  { Icon: SiKubernetes, leftPct: 94, top: 420, size: 38, delay: 0.5, rotateSeconds: 14 },
  { Icon: SiGit, leftPct: 18, top: 720, size: 38, delay: 1.8, rotateSeconds: 16 },
  { Icon: SiJira, leftPct: 82, top: 720, size: 38, delay: 1.1, rotateSeconds: 17 },
  { Icon: SiPostgresql, leftPct: 12, top: 80, size: 36, delay: 0.9, rotateSeconds: 15 },
];

const COLLISION_RADIUS = 110;
const PUSH_STRENGTH = 0.7;
const FRICTION = 0.965;
const BOUNCE_DAMP = 0.6;
const NAV_HEIGHT = 72;
const ICON_RESTITUTION = 0.8;

type IconRuntime = {
  id: number;
  size: number;
  x: ReturnType<typeof useMotionValue<number>>;
  y: ReturnType<typeof useMotionValue<number>>;
  vRef: MutableRefObject<{ vx: number; vy: number }>;
};

// Shared registry of all live floating icons. Used so that each icon
// can detect and resolve collisions against every other icon.
const iconRegistry = new Set<IconRuntime>();
let nextIconId = 0;

function FloatingTechIcon({
  cfg,
  cursorRef,
  isDark,
}: {
  cfg: FloatingIconCfg;
  cursorRef: MutableRefObject<{ x: number; y: number }>;
  isDark: boolean;
}) {
  const [initial] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    return {
      x: (cfg.leftPct / 100) * w,
      y: cfg.top,
    };
  });

  const x = useMotionValue(initial.x);
  const y = useMotionValue(initial.y);
  const vRef = useRef({ vx: 0, vy: 0 });
  const [id] = useState(() => ++nextIconId);

  // Register/unregister this icon in the shared registry so other icons
  // can collide with it.
  useEffect(() => {
    const me: IconRuntime = { id, size: cfg.size, x, y, vRef };
    iconRegistry.add(me);
    return () => {
      iconRegistry.delete(me);
    };
  }, [id, cfg.size, x, y]);

  useAnimationFrame(() => {
    // 1) Cursor push.
    const c = cursorRef.current;
    const myR = cfg.size / 2;
    const myCx = x.get() + myR;
    const myCy = y.get() + myR;
    const dx = myCx - c.x;
    const dy = myCy - c.y;
    const d = Math.hypot(dx, dy);

    if (d < COLLISION_RADIUS && d > 0.01) {
      const intensity = (1 - d / COLLISION_RADIUS) * PUSH_STRENGTH;
      vRef.current.vx += (dx / d) * intensity;
      vRef.current.vy += (dy / d) * intensity;
    }

    // 2) Icon ↔ icon collisions. Each unique pair is resolved by the
    //    icon with the lower id, which mutates BOTH icons' state.
    for (const other of iconRegistry) {
      if (other.id <= id) continue;

      const oR = other.size / 2;
      const oCx = other.x.get() + oR;
      const oCy = other.y.get() + oR;

      const ddx = oCx - myCx;
      const ddy = oCy - myCy;
      const dist = Math.hypot(ddx, ddy);
      const minDist = myR + oR;

      if (dist < minDist && dist > 0.01) {
        const nx = ddx / dist;
        const ny = ddy / dist;

        // Position correction: split the overlap evenly so they no
        // longer interpenetrate.
        const overlap = (minDist - dist) / 2;
        x.set(x.get() - nx * overlap);
        y.set(y.get() - ny * overlap);
        other.x.set(other.x.get() + nx * overlap);
        other.y.set(other.y.get() + ny * overlap);

        // Elastic-ish impulse exchange (equal mass).
        const dvx = other.vRef.current.vx - vRef.current.vx;
        const dvy = other.vRef.current.vy - vRef.current.vy;
        const vRel = dvx * nx + dvy * ny;
        if (vRel < 0) {
          const j = -(1 + ICON_RESTITUTION) * vRel * 0.5;
          vRef.current.vx -= j * nx;
          vRef.current.vy -= j * ny;
          other.vRef.current.vx += j * nx;
          other.vRef.current.vy += j * ny;
        } else {
          // Even when not approaching (already pushed apart), give a
          // tiny separation impulse so resting overlaps don't stick.
          const sep = 0.05;
          vRef.current.vx -= nx * sep;
          vRef.current.vy -= ny * sep;
          other.vRef.current.vx += nx * sep;
          other.vRef.current.vy += ny * sep;
        }
      }
    }

    // 3) Friction.
    vRef.current.vx *= FRICTION;
    vRef.current.vy *= FRICTION;

    // 4) Apply velocity to position.
    let nx = x.get() + vRef.current.vx;
    let ny = y.get() + vRef.current.vy;

    // 5) Bounce off viewport edges.
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxX = w - cfg.size;
    const maxY = h - cfg.size;

    if (nx < 0) {
      nx = 0;
      vRef.current.vx = Math.abs(vRef.current.vx) * BOUNCE_DAMP;
    } else if (nx > maxX) {
      nx = maxX;
      vRef.current.vx = -Math.abs(vRef.current.vx) * BOUNCE_DAMP;
    }
    if (ny < NAV_HEIGHT) {
      ny = NAV_HEIGHT;
      vRef.current.vy = Math.abs(vRef.current.vy) * BOUNCE_DAMP;
    } else if (ny > maxY) {
      ny = maxY;
      vRef.current.vy = -Math.abs(vRef.current.vy) * BOUNCE_DAMP;
    }

    // 6) Stop residual jitter.
    if (Math.abs(vRef.current.vx) < 0.01) vRef.current.vx = 0;
    if (Math.abs(vRef.current.vy) < 0.01) vRef.current.vy = 0;

    x.set(nx);
    y.set(ny);
  });

  return (
    <motion.div
      className={`fixed top-0 left-0 pointer-events-none ${
        isDark ? "text-blue-300/40" : "text-blue-600/35"
      }`}
      style={{ x, y, willChange: "transform" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.5, 0.95, 0.5] }}
      transition={{
        duration: 5,
        repeat: Infinity,
        delay: cfg.delay,
        ease: "easeInOut",
      }}
    >
      <motion.div
        animate={{ rotate: [-6, 6, -6] }}
        transition={{
          duration: cfg.rotateSeconds,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <cfg.Icon size={cfg.size} />
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const { scrollYProgress } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<Locale>(detectBrowserLocale);

  // Mutable ref read by the floating-icons physics loop.
  // Avoids React re-renders on each mouse move.
  const cursorRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleLanguage = () => {
    setLanguage((prev) => getNextLocale(prev));
  };

  const t = getLabels(language);

  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.92]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  // Theme tokens — sober, professional palette (slate / zinc / blue / amber accent).
  const isDark = theme === "dark";

  const bgClass = isDark
    ? "bg-[#05070d]"
    : "bg-gradient-to-br from-slate-50 via-white to-slate-100";

  const textClass = isDark ? "text-slate-100" : "text-slate-900";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-600";
  const cardBgClass = isDark
    ? "from-slate-900/70 to-slate-950/70"
    : "from-white/90 to-slate-50/90";
  const cardBorderClass = isDark ? "border-white/[0.06]" : "border-slate-200";
  const subtleSurface = isDark
    ? "bg-white/[0.04] hover:bg-white/[0.08]"
    : "bg-slate-900/[0.04] hover:bg-slate-900/[0.08]";

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} overflow-x-hidden relative transition-colors duration-500`}
    >
      {/* Animated Background — calm blue / indigo blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-gradient-to-br from-blue-950/30 via-slate-950 to-black"
              : "bg-gradient-to-br from-blue-100/40 via-white to-slate-100"
          }`}
        />
        <motion.div
          className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-1/3 h-1/3 bg-sky-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Subtle grid texture (dark mode only) */}
        {isDark && (
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            }}
          />
        )}
      </div>

      {/* Cursor Glow Effect — single sober blue */}
      <motion.div
        className={`fixed w-96 h-96 ${
          isDark ? "bg-blue-500/20" : "bg-blue-400/10"
        } rounded-full blur-3xl pointer-events-none z-0`}
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
      />

      {/* Floating tech brand icons — interactive physics: cursor pushes, walls bounce */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity }}
      >
        {FLOATING_ICONS_CFG.map((cfg, i) => (
          <FloatingTechIcon
            key={i}
            cfg={cfg}
            cursorRef={cursorRef}
            isDark={isDark}
          />
        ))}
      </motion.div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 w-full ${
          isDark ? "bg-black/50" : "bg-white/60"
        } backdrop-blur-xl border-b ${
          isDark ? "border-white/[0.06]" : "border-slate-200"
        } z-50`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            >
              <Hexagon className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
            </motion.div>
            <span className="text-xl tracking-tight">
              <span className={isDark ? "text-white" : "text-slate-900"}>
                {t.nav.brandPrefix}
              </span>
              <span className="text-blue-400">{t.nav.brandSuffix}</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-6 items-center"
          >
            {(
              [
                { href: "#about", label: t.nav.about },
                { href: "#experience", label: t.nav.experience },
                { href: "#skills", label: t.nav.skills },
                { href: "#contact", label: t.nav.contact },
              ] as const
            ).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`hidden md:inline-block ${
                  isDark
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                } transition-colors text-sm tracking-wide`}
              >
                {item.label}
              </a>
            ))}

            {/* Language Toggle */}
            <motion.button
              onClick={toggleLanguage}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={`p-2 rounded-lg ${subtleSurface} transition-colors`}
              aria-label="Toggle language"
            >
              <Languages className="w-5 h-5 text-blue-400" />
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={`p-2 rounded-lg ${subtleSurface} transition-colors`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </motion.button>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="about" className="pt-36 pb-24 px-6 relative">
        <motion.div
          style={{ opacity, scale }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center relative z-10">
            {/* Profile Photo — clean circular avatar with rotating conic ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 22,
                delay: 0.2,
              }}
              className="inline-block mb-10 relative"
            >
              {/* Single-color circular soft glow (no rainbow blob) */}
              <motion.div
                className="absolute -inset-6 rounded-full bg-blue-500/25 blur-3xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.45, 0.7, 0.45],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Outer rotating conic ring */}
              <div className="relative w-48 h-48 md:w-56 md:h-56">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(96,165,250,0) 0deg, rgba(96,165,250,0.9) 60deg, rgba(56,189,248,0) 140deg, rgba(245,158,11,0.7) 240deg, rgba(96,165,250,0) 360deg)",
                  }}
                />

                {/* Inner ring spacer (dark mask covering the ring inside) */}
                <div
                  className={`absolute inset-[3px] rounded-full ${
                    isDark ? "bg-[#05070d]" : "bg-white"
                  }`}
                />

                {/* Photo */}
                <div
                  className={`absolute inset-[6px] rounded-full overflow-hidden border ${
                    isDark ? "border-white/10" : "border-slate-200"
                  }`}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
                    alt="Professional Photo"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Status badge */}
                <motion.div
                  className={`absolute bottom-1 right-1 bg-emerald-500 rounded-full px-3 py-1 text-[11px] tracking-wide text-white border-2 flex items-center gap-1.5 shadow-lg ${
                    isDark ? "border-[#05070d]" : "border-white"
                  }`}
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  {t.hero.available}
                </motion.div>
              </div>
            </motion.div>

            {/* Eyebrow / role label */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mb-6 flex justify-center"
            >
              <span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs tracking-[0.2em] uppercase ${
                  isDark
                    ? "border-white/10 bg-white/[0.03] text-slate-300"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <Sparkle className="w-3.5 h-3.5 text-blue-400" />
                {t.hero.role}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.8 }}
              className="text-4xl md:text-6xl tracking-tight mb-8 max-w-4xl mx-auto leading-[1.2]"
            >
              <span
                className={`inline-block pb-2 ${
                  isDark
                    ? "bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent"
                    : "bg-gradient-to-b from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent"
                }`}
              >
                {t.hero.title}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className={`text-lg md:text-xl ${textMutedClass} max-w-3xl mx-auto mb-12 leading-relaxed`}
            >
              {t.hero.description.before}
              <span className={isDark ? "text-blue-300" : "text-blue-600"}>
                {t.hero.description.highlightExperience}
              </span>
              {t.hero.description.middle}
              <span
                className={isDark ? "text-amber-300" : "text-amber-600"}
              >
                {t.hero.description.highlightArchitecture}
              </span>
              {t.hero.description.after}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.8 }}
              className="flex gap-4 justify-center flex-wrap"
            >
              <motion.a
                href="#contact"
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg inline-flex items-center gap-2 relative overflow-hidden group tracking-wide"
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 18px 40px rgba(37, 99, 235, 0.35)",
                }}
                whileTap={{ scale: 0.96 }}
              >
                <Mail className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{t.hero.contactMe}</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </motion.a>
              <motion.a
                href="#experience"
                className={`px-8 py-3.5 ${
                  isDark
                    ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-white"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
                } backdrop-blur-sm rounded-lg border inline-flex items-center gap-2 transition-colors tracking-wide`}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <Rocket className="w-4 h-4" />
                {t.hero.viewExperience}
              </motion.a>
            </motion.div>
          </div>
        </motion.div>

      </section>

      {/* Key Highlights */}
      <section className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Award,
                index: "01",
                title: t.highlights.years,
                desc: t.highlights.yearsDesc,
                animation: { rotate: 360 },
                anim: {
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear" as const,
                },
              },
              {
                icon: Users,
                index: "02",
                title: t.highlights.leadership,
                desc: t.highlights.leadershipDesc,
                animation: { scale: [1, 1.12, 1] },
                anim: { duration: 2.5, repeat: Infinity },
              },
              {
                icon: Target,
                index: "03",
                title: t.highlights.enterprise,
                desc: t.highlights.enterpriseDesc,
                animation: { y: [0, -8, 0] },
                anim: { duration: 2.5, repeat: Infinity },
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{
                  scale: 1.02,
                  y: -4,
                }}
                className="relative group"
              >
                <div className="absolute -inset-px bg-gradient-to-br from-blue-500/30 via-transparent to-indigo-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity" />
                <div
                  className={`relative bg-gradient-to-br ${cardBgClass} backdrop-blur-xl p-8 rounded-2xl border ${cardBorderClass} overflow-hidden h-full`}
                >
                  <motion.div
                    className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.08] rounded-full blur-3xl"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                  />

                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <motion.div
                      animate={card.animation}
                      transition={card.anim}
                      className={`p-3 rounded-xl ${
                        isDark
                          ? "bg-white/[0.04] border border-white/10"
                          : "bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <card.icon
                        className="w-7 h-7 text-blue-400"
                        strokeWidth={1.5}
                      />
                    </motion.div>
                    <span
                      className={`text-xs tracking-[0.2em] ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {card.index}
                    </span>
                  </div>

                  <h3
                    className={`text-2xl mb-3 tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p className={`${textMutedClass} leading-relaxed`}>
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.div
              animate={{
                rotate: [0, 6, -6, 0],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className={`inline-flex p-4 rounded-2xl mb-6 ${
                isDark
                  ? "bg-white/[0.04] border border-white/10"
                  : "bg-slate-100 border border-slate-200"
              }`}
            >
              <Briefcase
                className="w-10 h-10 text-blue-400"
                strokeWidth={1.5}
              />
            </motion.div>

            <h2 className="text-4xl md:text-5xl tracking-tight mb-4 leading-[1.2]">
              <span
                className={`inline-block pb-1.5 ${
                  isDark
                    ? "bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent"
                    : "bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-transparent"
                }`}
              >
                {t.experience.title}
              </span>
            </h2>
            <motion.div
              className="w-20 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            />
            <p className={`${textMutedClass} text-lg mt-6`}>
              {t.experience.subtitle}
            </p>
          </motion.div>

          <div className="space-y-6 relative">
            {/* Timeline Line */}
            <div
              className={`absolute left-[27px] top-0 bottom-0 w-px hidden md:block ${
                isDark
                  ? "bg-gradient-to-b from-blue-500/0 via-blue-500/40 to-blue-500/0"
                  : "bg-gradient-to-b from-blue-500/0 via-blue-500/60 to-blue-500/0"
              }`}
            />

            {t.experience.jobs.map((exp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: index * 0.15,
                  type: "spring",
                  stiffness: 90,
                }}
                className="relative"
              >
                {/* Timeline Dot */}
                <motion.div
                  className={`absolute left-[19px] top-9 w-5 h-5 rounded-full border-2 hidden md:flex items-center justify-center z-10 ${
                    isDark
                      ? "bg-[#05070d] border-blue-400"
                      : "bg-white border-blue-500"
                  }`}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 + 0.3 }}
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(59, 130, 246, 0)",
                      "0 0 18px rgba(59, 130, 246, 0.55)",
                      "0 0 0px rgba(59, 130, 246, 0)",
                    ],
                  }}
                  style={{ transition: "box-shadow 2s infinite" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.01, x: 6 }}
                  className="md:ml-20 relative group"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-transparent to-indigo-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div
                    className={`relative bg-gradient-to-br ${cardBgClass} backdrop-blur-xl p-8 rounded-2xl border ${cardBorderClass} ${
                      isDark
                        ? "group-hover:border-blue-500/40"
                        : "group-hover:border-blue-400/60"
                    } transition-all overflow-hidden`}
                  >
                    <motion.div
                      className="absolute top-0 right-0 w-40 h-40 bg-blue-500/[0.06] rounded-full blur-3xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                      }}
                      transition={{ duration: 12, repeat: Infinity }}
                    />
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 relative z-10 gap-4">
                      <div>
                        <h3
                          className={`text-2xl tracking-tight mb-1 ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {exp.title}
                        </h3>
                        <p
                          className={`text-base ${
                            isDark ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {exp.company}
                        </p>
                      </div>
                      <span
                        className={`text-xs tracking-[0.2em] uppercase px-3 py-1.5 rounded-md border h-fit ${
                          isDark
                            ? "text-slate-400 bg-white/[0.04] border-white/10"
                            : "text-slate-600 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {exp.period}
                      </span>
                    </div>
                    <p className={`${textMutedClass} leading-relaxed relative z-10`}>
                      {exp.description}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              className={`inline-flex p-4 rounded-2xl mb-6 ${
                isDark
                  ? "bg-white/[0.04] border border-white/10"
                  : "bg-slate-100 border border-slate-200"
              }`}
            >
              <Code2 className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
            </motion.div>

            <h2 className="text-4xl md:text-5xl tracking-tight mb-4 leading-[1.2]">
              <span
                className={`inline-block pb-1.5 ${
                  isDark
                    ? "bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent"
                    : "bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-transparent"
                }`}
              >
                {t.skills.title}
              </span>
            </h2>
            <motion.div
              className="w-20 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            />
            <p className={`${textMutedClass} text-lg mt-6`}>
              {t.skills.subtitle}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                title: t.skills.serverSide,
                icon: Server,
                items: t.skills.technologies.server,
                anim: { rotate: [0, 360] },
                animOpts: {
                  duration: 16,
                  repeat: Infinity,
                  ease: "linear" as const,
                },
              },
              {
                title: t.skills.clientSide,
                icon: Monitor,
                items: t.skills.technologies.client,
                anim: { scale: [1, 1.12, 1] },
                animOpts: { duration: 2.4, repeat: Infinity },
              },
              {
                title: t.skills.infrastructure,
                icon: Database,
                items: t.skills.technologies.infrastructure,
                anim: { y: [0, -6, 0] },
                animOpts: { duration: 2.4, repeat: Infinity },
              },
            ].map((group, gi) => (
              <motion.div
                key={gi}
                variants={itemVariants}
                whileHover={{ scale: 1.015, y: -4 }}
                className="relative group"
              >
                <div className="absolute -inset-px bg-gradient-to-br from-blue-500/30 via-transparent to-indigo-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className={`relative bg-gradient-to-br ${cardBgClass} backdrop-blur-xl p-8 rounded-2xl border ${cardBorderClass} overflow-hidden h-full`}
                >
                  <motion.div
                    className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/[0.07] rounded-full blur-3xl"
                    animate={{
                      scale: [1, 1.3, 1],
                      rotate: [0, gi % 2 === 0 ? 90 : -90, 0],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      delay: gi * 0.4,
                    }}
                  />

                  <div className="flex items-center gap-3 mb-8 relative z-10">
                    <motion.div
                      animate={group.anim}
                      transition={group.animOpts}
                      className={`p-2.5 rounded-lg ${
                        isDark
                          ? "bg-white/[0.04] border border-white/10"
                          : "bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <group.icon
                        className="w-6 h-6 text-blue-400"
                        strokeWidth={1.5}
                      />
                    </motion.div>
                    <h3
                      className={`text-xl tracking-tight ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {group.title}
                    </h3>
                  </div>

                  <div className="space-y-2 relative z-10">
                    {group.items.map((tech, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.06 }}
                        whileHover={{ x: 6 }}
                        className={`flex justify-between items-center px-3 py-2.5 rounded-lg transition-colors ${
                          isDark
                            ? "hover:bg-white/[0.04]"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        <span
                          className={`flex items-center gap-2 text-sm ${
                            isDark ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                          {tech.name}
                        </span>
                        <span
                          className={`text-[11px] tracking-[0.15em] uppercase px-2.5 py-1 rounded ${
                            tech.levelKey === "expert"
                              ? isDark
                                ? "text-blue-300 bg-blue-500/10 border border-blue-500/20"
                                : "text-blue-700 bg-blue-50 border border-blue-200"
                              : isDark
                                ? "text-slate-400 bg-white/[0.04] border border-white/10"
                                : "text-slate-600 bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {t.skills.levels[tech.levelKey as SkillLevelKey]}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Tech-mood strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl border ${cardBorderClass} ${
              isDark ? "bg-white/[0.02]" : "bg-white/60"
            } backdrop-blur-xl`}
          >
            {[
              { icon: Cpu, label: t.skills.techStrip.performance },
              { icon: ShieldCheck, label: t.skills.techStrip.security },
              { icon: Database, label: t.skills.techStrip.data },
              { icon: Server, label: t.skills.techStrip.cloud },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isDark
                      ? "bg-white/[0.04] border border-white/10"
                      : "bg-slate-100 border border-slate-200"
                  }`}
                >
                  <item.icon
                    className="w-5 h-5 text-blue-400"
                    strokeWidth={1.5}
                  />
                </div>
                <span className={`text-sm ${textMutedClass}`}>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 1 }}
          >
            <motion.div
              className="relative inline-block mb-8"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.div
                className="absolute inset-0 bg-blue-500/30 rounded-full blur-3xl"
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <div
                className={`relative inline-flex p-5 rounded-2xl ${
                  isDark
                    ? "bg-white/[0.04] border border-white/10"
                    : "bg-white border border-slate-200"
                }`}
              >
                <Mail
                  className="w-12 h-12 text-blue-400 relative z-10"
                  strokeWidth={1.5}
                />
              </div>
            </motion.div>

            <h2 className="text-4xl md:text-6xl tracking-tight mb-6 leading-[1.2]">
              <span
                className={`inline-block pb-2 ${
                  isDark
                    ? "bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent"
                    : "bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-transparent"
                }`}
              >
                {t.contact.title}
              </span>
            </h2>
            <motion.div
              className="w-20 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto mb-8"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            />
            <p
              className={`${textMutedClass} text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed`}
            >
              {t.contact.subtitle}
            </p>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
              className="flex gap-4 justify-center flex-wrap"
            >
              <motion.a
                variants={itemVariants}
                href="mailto:contact@example.com"
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg inline-flex items-center gap-3 relative overflow-hidden group tracking-wide"
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 22px 45px rgba(37, 99, 235, 0.4)",
                }}
                whileTap={{ scale: 0.96 }}
              >
                <Mail className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{t.contact.emailMe}</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </motion.a>

              <motion.a
                variants={itemVariants}
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-8 py-3.5 ${
                  isDark
                    ? "bg-white/[0.04] text-white border-white/10 hover:border-blue-500/50"
                    : "bg-white text-slate-900 border-slate-200 hover:border-blue-400"
                } backdrop-blur-xl rounded-lg border inline-flex items-center gap-3 transition-colors tracking-wide`}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 22px 45px rgba(59, 130, 246, 0.25)",
                }}
                whileTap={{ scale: 0.96 }}
              >
                <Linkedin className="w-5 h-5" />
                <span>{t.contact.linkedin}</span>
              </motion.a>

              <motion.a
                variants={itemVariants}
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-8 py-3.5 ${
                  isDark
                    ? "bg-white/[0.04] text-white border-white/10 hover:border-white/30"
                    : "bg-white text-slate-900 border-slate-200 hover:border-slate-400"
                } backdrop-blur-xl rounded-lg border inline-flex items-center gap-3 transition-colors tracking-wide`}
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 22px 45px rgba(255, 255, 255, 0.08)",
                }}
                whileTap={{ scale: 0.96 }}
              >
                <Github className="w-5 h-5" />
                <span>{t.contact.github}</span>
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`py-10 px-6 border-t ${
          isDark ? "border-white/[0.06]" : "border-slate-200"
        } relative`}
      >
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            >
              <Hexagon className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
            </motion.div>
            <span className={`text-sm ${textMutedClass}`}>
              {t.footer.copyright}
            </span>
          </div>
          <div className="flex gap-3">
            {[Linkedin, Github, Mail].map((Icon, i) => (
              <motion.a
                key={i}
                href="#contact"
                whileHover={{ y: -3, scale: 1.1 }}
                className={`p-2 rounded-lg ${subtleSurface} transition-colors`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </footer>
    </div>
  );
}
