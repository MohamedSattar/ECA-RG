# Internationalization (i18n) Setup

This project uses `react-i18next` for internationalization with support for English and Arabic.

## Installation

To complete the setup, run:

```bash
pnpm add i18next react-i18next i18next-browser-languagedetector
```

## Features

- **Supported Languages**: English (en) and Arabic (ar)
- **Language Detection**: Automatically detects user language from browser settings or localStorage
- **RTL Support**: Automatic right-to-left layout for Arabic
- **Language Switcher**: Dropdown in the header to switch between languages

## Usage in Components

Import the `useTranslation` hook:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('header.title')}</h1>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

## Adding New Translations

1. Edit `client/i18n/locales/en.json` for English translations
2. Edit `client/i18n/locales/ar.json` for Arabic translations

Example:
```json
{
  "mySection": {
    "title": "My Title",
    "description": "My Description"
  }
}
```

## Changing Language Programmatically

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { i18n } = useTranslation();
  
  const switchToArabic = () => {
    i18n.changeLanguage('ar');
    document.documentElement.dir = 'rtl';
  };
  
  const switchToEnglish = () => {
    i18n.changeLanguage('en');
    document.documentElement.dir = 'ltr';
  };
}
```

## File Structure

```
client/
  i18n/
    config.ts           # i18n configuration
    locales/
      en.json          # English translations
      ar.json          # Arabic translations
```

## Language Switcher

The language switcher is integrated into the SiteHeader component and allows users to switch between English and Arabic. The selected language is persisted in localStorage.
