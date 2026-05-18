import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  // Disable the Next.js dev toolbar badge
  devIndicators: false,
};

export default withNextIntl(nextConfig);
