# Pairframe

NativePHP desktop app to compose two screenshots into split thumbnails with background patterns.

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

Open the app URL and upload two screenshots.

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

- Upload two screenshots (PNG, JPG, WebP) — order does not matter
- Layouts: vertical, horizontal, diagonal
- Diagonal styles: straight, wavy, zigzag, scallop, soft (with density)
- Split position, angle tools, padding, and border radius
- Swap sides
- Background patterns with custom colors and density
- Save / load settings presets (images are not stored)
- Hover-only drag handle on the live preview
- Export PNG and/or JPG at upload resolution (optional scale)
