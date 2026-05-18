# Internationalization (i18n) Setup Guide

## Overview

ZerithDB documentation site now supports multiple languages with full internationalization (i18n)
support using `next-intl`. Currently supported languages:

- **English** (en) - Default
- **Spanish** (es) - Español
- **Mandarin Chinese** (zh) - 中文

## Project Structure

```
apps/web/
├── i18n.ts                          # i18n configuration
├── middleware.ts                    # Locale routing middleware
├── messages/
│   ├── en.json                      # English translations
│   ├── es.json                      # Spanish translations
│   └── zh.json                      # Mandarin Chinese translations
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (redirects to default locale)
│   │   └── [locale]/
│   │       ├── layout.tsx          # Locale-specific layout
│   │       ├── page.tsx            # Home page with translations
│   │       └── docs/
│   │           └── page.tsx        # Documentation page with translations
│   └── components/
│       └── LanguageSwitcher.tsx    # Language switcher component
└── next.config.ts                   # Next.js config with i18n plugin
```

## How It Works

### URL Structure

URLs are structured with locale prefix:

- `https://example.com/en` - English
- `https://example.com/es` - Spanish
- `https://example.com/zh` - Mandarin Chinese

The middleware automatically handles redirects from `/` to `/en` (default locale).

### File Organization

Translations are organized in `/messages` directory as JSON files, one per language:

```json
// messages/en.json
{
  "nav": {
    "docs": "Documentation",
    "playground": "Playground"
  },
  "features": {
    "localFirst": {
      "title": "Local-First",
      "description": "Data lives in your browser..."
    }
  }
}
```

### Using Translations in Components

#### Client Components

Use the `useTranslations` hook:

```typescript
"use client";

import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations();

  return (
    <h1>{t("nav.docs")}</h1>
    <p>{t("features.localFirst.description")}</p>
  );
}
```

#### Server Components

Use `getTranslations` from server:

```typescript
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("header");

  return {
    title: `${t("title")} — ${t("tagline")}`,
    description: t("subtitle"),
  };
}
```

#### Getting Current Locale

```typescript
import { useLocale } from "next-intl";

export default function MyComponent() {
  const locale = useLocale();
  console.log(`Current locale: ${locale}`); // "en", "es", or "zh"
}
```

## Adding a New Language

1. **Create translation file** in `apps/web/messages/`:

   ```bash
   # Example: Adding French (fr)
   cp messages/en.json messages/fr.json
   # Edit messages/fr.json with French translations
   ```

2. **Update locale list** in `apps/web/i18n.ts`:

   ```typescript
   export const LOCALES = ["en", "es", "zh", "fr"] as const;
   ```

3. **Update LanguageSwitcher** in `src/components/LanguageSwitcher.tsx`:

   ```typescript
   const languages = [
     { code: "en", name: "English", flag: "🇺🇸" },
     { code: "es", name: "Español", flag: "🇪🇸" },
     { code: "zh", name: "中文", flag: "🇨🇳" },
     { code: "fr", name: "Français", flag: "🇫🇷" }, // Add this
   ];
   ```

4. **Update middleware** (already configured to auto-detect):
   - No changes needed! The middleware configuration is dynamic.

## Translation Structure

Keep translation files organized hierarchically:

```json
{
  "nav": { ... },           // Navigation items
  "header": { ... },        // Header/meta content
  "hero": { ... },          // Hero section
  "features": { ... },      // Feature descriptions
  "docs": { ... },          // Documentation sections
  "footer": { ... },        // Footer content
  "common": { ... }         // Common/reusable strings
}
```

## Best Practices

### 1. **Consistent Namespacing**

- Group related translations together
- Use dot notation for nested access: `t("nav.docs")`

### 2. **Reusable Strings**

- Put common strings in `common` namespace
- Avoid duplication across files

### 3. **Translation Completeness**

- Ensure all languages have the same keys
- Keep translation structure synchronized

### 4. **Dynamic Content**

- For complex formatting, use `next-intl`'s rich text support
- Avoid hardcoding strings in components

### 5. **Performance**

- Translations are loaded per locale
- Language switching uses Next.js routing (fast)
- No client-side language detection needed

## Language Switcher Component

The `LanguageSwitcher` component provides a dropdown menu for users to switch languages:

```typescript
<LanguageSwitcher />
```

Features:

- Shows flag emoji for visual recognition
- Current language highlighted in blue
- Smooth animations
- Responsive dropdown positioning

## Testing Translations

1. **Development**: Navigate to different locale paths:
   - `http://localhost:3000/en`
   - `http://localhost:3000/es`
   - `http://localhost:3000/zh`

2. **Language Switcher**: Use the dropdown in the header to switch languages

3. **Console**: Check that correct translations are loaded
   ```typescript
   const t = useTranslations();
   console.log(t("nav.docs"));
   ```

## Building for Production

Build command remains the same:

```bash
pnpm build
```

The build process automatically includes all locale routes and translations.

## Future Enhancements

- [ ] RTL (Right-to-Left) language support for Arabic/Hebrew
- [ ] Browser language detection and auto-redirect
- [ ] Translation management dashboard
- [ ] Crowdsourced translation updates
- [ ] Regional variants (en-GB, en-AU, etc.)
- [ ] Language-specific fonts loading
- [ ] Fallback language support

## Troubleshooting

### Translations not showing

- Check that the JSON file exists in `messages/`
- Verify the locale is added to `LOCALES` in `i18n.ts`
- Ensure key path is correct: `t("section.key")`

### URL not changing language

- Verify middleware.ts is properly configured
- Check that `[locale]` directory exists in app router
- Clear browser cache and restart dev server

### Build errors

- Run `pnpm install` to ensure dependencies are installed
- Clear `.next` folder and rebuild
- Check TypeScript errors with `pnpm build`

## Related Documentation

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Internationalization](https://nextjs.org/docs/advanced-features/i18n-routing)

## Support

For questions or issues with the i18n setup, please check:

1. The translation files structure
2. The middleware configuration
3. Component usage examples in existing pages
