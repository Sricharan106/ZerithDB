"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Database, RefreshCcw, Network, Lock, Zap, FileCode } from "lucide-react";
import { motion } from "framer-motion";
import TerminalShowcase from "@/components/TerminalShowcase";
import AnimatedDiagram from "@/components/AnimatedDiagram";
import FrameworkSection from "@/components/FrameworkSection";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LocalizedLandingPage() {
  const t = useTranslations();

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    initial: {},
    whileInView: {
      transition: {
        staggerChildren: 0.1,
      },
    },
    viewport: { once: true },
  };

  const features = [
    {
      icon: Database,
      title: t("features.localFirst.title"),
      desc: t("features.localFirst.description"),
    },
    {
      icon: Network,
      title: t("features.peerToPeer.title"),
      desc: t("features.peerToPeer.description"),
    },
    {
      icon: RefreshCcw,
      title: t("features.crdt.title"),
      desc: t("features.crdt.description"),
    },
    {
      icon: Lock,
      title: t("features.secure.title"),
      desc: t("features.secure.description"),
    },
    {
      icon: Zap,
      title: t("features.performance.title"),
      desc: t("features.performance.description"),
    },
    {
      icon: FileCode,
      title: t("features.sync.title"),
      desc: t("features.sync.description"),
    },
  ];

  return (
    <main className="flex flex-col min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              className="w-10 h-10 flex items-center justify-center overflow-hidden"
            >
              <img src="/logo.svg" alt="ZerithDB Logo" className="w-full h-full" />
            </motion.div>
            <span className="font-semibold text-xl tracking-tight">ZerithDB</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="/docs" className="hover:text-black transition-colors font-medium">
              {t("nav.docs")}
            </Link>
            <Link href="#features" className="hover:text-black transition-colors">
              {t("nav.docs")}
            </Link>
            <Link
              href="/playground"
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" /> {t("nav.playground")}
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <a
              href="https://github.com/Zerith-Labs/ZerithDB"
              target="_blank"
              rel="noreferrer noopener"
              className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              {t("nav.github")}
            </a>
            <Link
              href="#get-started"
              className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {t("hero.cta")}
            </Link>
          </div>
        </div>
      </header>

      {/* ── 1. HERO SECTION ── */}
      <section className="relative pt-32 pb-20 px-6 max-w-6xl mx-auto text-center">
        {/* Background Decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none overflow-visible">
          <motion.div
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 -left-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, 20, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-40 -right-20 w-80 h-80 bg-indigo-100 rounded-full blur-3xl"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-tight text-gray-900">
            {t("hero.title")}
            <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {t("hero.description")}
            </span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="#get-started"
            className="group flex items-center gap-2 bg-black text-white px-6 py-3.5 rounded-xl font-medium text-base hover:bg-gray-800 transition-all shadow-sm w-full sm:w-auto justify-center"
          >
            {t("hero.cta")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/playground"
            className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 px-6 py-3.5 rounded-xl font-medium text-base hover:bg-blue-100 transition-all w-full sm:w-auto justify-center shadow-sm"
          >
            <Zap className="w-4 h-4 animate-pulse" />
            {t("nav.playground")}
          </Link>
          <a
            href="https://github.com/Zerith-Labs/ZerithDB"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 bg-white text-gray-900 border border-gray-200 px-6 py-3.5 rounded-xl font-medium text-base hover:bg-gray-50 transition-all w-full sm:w-auto justify-center shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            {t("nav.github")}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <FrameworkSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-16 mx-auto max-w-4xl text-left"
        >
          <TerminalShowcase />
        </motion.div>
      </section>

      {/* ── 3. CORE FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="mb-16 md:text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              {t("docs.title")}
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12"
          >
            {features.map((feature, i) => (
              <motion.div key={i} variants={fadeInUp} className="flex gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-900 group-hover:border-blue-200 group-hover:shadow-md transition-all">
                  <feature.icon className="w-6 h-6 stroke-[1.5] group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS / DIAGRAM ── */}
      <section id="how-it-works" className="py-24 px-6 bg-white border-y border-gray-200/50">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {t("docs.gettingStarted")}
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <AnimatedDiagram />
          </motion.div>
        </div>
      </section>
    </main>
  );
}
