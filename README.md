# Pairframe

NativePHP desktop app to compose light and dark screenshots into split, fade, and patterned thumbnails.

## Requirements

- PHP 8.3+
- Composer
- Node.js 22+
- npm

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
npm install
npm run build
php artisan native:install --no-interaction
```

## Develop in the browser

```bash
composer run dev
```

Open the app URL and upload a light + dark screenshot pair.

## Run as desktop app

```bash
npm run build
php artisan native:run
```

For a live Vite + NativePHP loop:

```bash
composer native:dev
```

## Features

- Upload light / dark screenshots (PNG, JPG, WebP)
- Layout families with variants: vertical, horizontal, diagonal, soft fade, zigzag, wave, checker, stripes, overlap
- Swap light/dark, flip direction, invert mask
- Background patterns with custom colors and density
- Drag the split handle in the live preview
- Export PNG and/or JPG at upload resolution (optional scale / max width)
