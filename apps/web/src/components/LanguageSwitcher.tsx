"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { useState } from "react";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const getHref = (newLocale: string) => {
    // Remove the current locale from the pathname
    const segments = pathname.split("/");
    segments[1] = newLocale; // Replace locale segment
    return segments.join("/");
  };

  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <Globe className="w-4 h-4" />
        {currentLanguage?.flag}
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-50"
        >
          <div className="p-2">
            {languages.map((lang) => (
              <Link
                key={lang.code}
                href={getHref(lang.code)}
                onClick={() => setIsOpen(false)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  locale === lang.code
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
