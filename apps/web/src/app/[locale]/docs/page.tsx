"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DocsPage() {
  const t = useTranslations();

  const docSections = [
    {
      key: "gettingStarted",
      icon: "🚀",
    },
    {
      key: "installation",
      icon: "📦",
    },
    {
      key: "quickStart",
      icon: "⚡",
    },
    {
      key: "api",
      icon: "🔌",
    },
    {
      key: "guides",
      icon: "📚",
    },
    {
      key: "examples",
      icon: "💡",
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-semibold">ZerithDB</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{t("docs.title")}</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t("docs.title")}</h2>
          <p className="text-lg text-gray-500">{t("common.documentation")}</p>
        </div>

        {/* Documentation Sections Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {docSections.map((section) => (
            <Link
              key={section.key}
              href="#"
              className="group p-6 border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-lg transition-all"
            >
              <div className="text-3xl mb-3">{section.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                {t(`docs.${section.key}`)}
              </h3>
              <p className="text-sm text-gray-500">
                Coming soon - comprehensive documentation and guides
              </p>
            </Link>
          ))}
        </div>

        {/* Featured Section */}
        <div className="mt-16 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Started Today</h3>
          <p className="text-gray-600 mb-6">{t("common.learn")}</p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
              {t("hero.cta")}
            </button>
            <button className="px-6 py-3 bg-white text-black border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              {t("common.learn")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
