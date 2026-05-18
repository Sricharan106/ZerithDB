import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("header");

  return {
    title: `${t("title")} — ${t("tagline")}`,
    description: t("subtitle"),
  };
}

interface RootLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params;

  return (
    <html lang={locale} className={inter.variable}>
      <body className="bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
