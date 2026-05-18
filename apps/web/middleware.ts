import createMiddleware from "next-intl/middleware";
import { LOCALES } from "./i18n";

export default createMiddleware({
  locales: LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
});

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
};
