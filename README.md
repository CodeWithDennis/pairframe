# Pairframe

NativePHP desktop app to compose two screenshots into split thumbnails with background patterns.

![Pairframe composing a diagonal wavy split thumbnail](docs/pairframe.png)

## Downloads

Prebuilt macOS and Windows installers are available on the [GitHub Releases](https://github.com/CodeWithDennis/pairframe/releases) page.

**These builds are unsigned.** macOS Gatekeeper will block them until you allow the app:

1. Try to open Pairframe (you may see “cannot be opened” / “damaged” / “unidentified developer”).
2. Open **System Settings → Privacy & Security**.
3. Scroll to the blocked-app message and choose **Open Anyway** / **Allow**.
4. Confirm again if macOS asks.

Alternatively, skip the release binaries and [build the app yourself locally](#build-locally) — that does not require changing privacy settings for a downloaded installer.

### Auto-updates

Production builds ship with the NativePHP / electron-updater client pointed at GitHub Releases.

- **Windows:** updates can work without code signing (SmartScreen may still warn).
- **macOS:** automatic updates only work for **signed and notarized** builds. Unsigned CI builds still need a manual download from Releases.
- Existing installs from before the updater was enabled need **one manual update**; later versions update themselves.
- Public GitHub Releases need no client token. If the repo were private again, set `GITHUB_PRIVATE=true` and a read-only `GITHUB_AUTOUPDATE_TOKEN` secret.

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

## Build locally

After [Setup](#setup), create an installer for your machine:

```bash
npm run build
php artisan native:build
```

Build for a specific OS / architecture (when supported on your host):

```bash
php artisan native:build mac arm64
php artisan native:build mac x64
php artisan native:build win x64
```

Installers land in `nativephp/electron/dist/` (for example `.dmg` / `.zip` on macOS, `.exe` on Windows).

Local builds are also unsigned unless you configure Apple / Windows code signing. Prefer `php artisan native:run` for day-to-day development.

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
