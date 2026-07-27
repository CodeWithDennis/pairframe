<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Pairframe') }}</title>
    <link rel="icon" type="image/png" href="/icon.png">
    <script>
        (function () {
            try {
                var stored = localStorage.getItem('pairframe.theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var dark = stored === 'dark' || ((stored === 'auto' || stored == null) && prefersDark);
                document.documentElement.classList.toggle('dark', dark);
            } catch (e) {}
        })();
    </script>
    @fonts
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        #boot-screen {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            background: #FAFAFA;
            color: #171717;
            transition: opacity 0.35s ease, visibility 0.35s ease;
        }
        .dark #boot-screen {
            background: #0c0c0b;
            color: #f3f2f0;
        }
        #boot-screen.is-done {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        #boot-screen .boot-mark {
            width: 44px;
            height: 44px;
            color: #171717;
        }
        .dark #boot-screen .boot-mark {
            color: #f3f2f0;
        }
        #boot-screen .boot-name {
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
            font-size: 1.15rem;
            font-weight: 600;
            letter-spacing: -0.03em;
            line-height: 1;
        }
        #boot-screen .boot-name span {
            color: #a3a3a3;
        }
        #boot-screen .boot-bar {
            width: 88px;
            height: 2px;
            margin-top: 0.35rem;
            overflow: hidden;
            background: #EBEBEB;
            border-radius: 999px;
        }
        .dark #boot-screen .boot-bar {
            background: #32302e;
        }
        #boot-screen .boot-bar > i {
            display: block;
            width: 40%;
            height: 100%;
            background: #171717;
            border-radius: 999px;
            animation: boot-slide 1s ease-in-out infinite;
        }
        .dark #boot-screen .boot-bar > i {
            background: #f3f2f0;
        }
        @keyframes boot-slide {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(280%); }
        }
    </style>
</head>
<body class="h-dvh overflow-hidden bg-lumis-canvas font-sans font-normal text-lumis-ink" x-data="pairframe">
    {{-- Shown before Vite/Alpine are ready --}}
    <div id="boot-screen" aria-live="polite" aria-busy="true">
        <svg class="boot-mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <defs>
                <clipPath id="boot-pf-mark">
                    <rect x="3" y="7" width="22" height="14" rx="2.25"/>
                </clipPath>
            </defs>
            <rect x="3" y="7" width="22" height="14" rx="2.25" stroke="currentColor" stroke-width="1.75"/>
            <g clip-path="url(#boot-pf-mark)">
                <path d="M3 21 15 7H3v14Z" fill="currentColor"/>
                <path d="M9 21 19 7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </g>
        </svg>
        <div class="boot-name">Pair<span>frame</span></div>
        <div class="boot-bar" aria-hidden="true"><i></i></div>
    </div>

    <div class="flex h-dvh flex-col">
        {{-- Header --}}
        <header class="flex h-14 shrink-0 items-center justify-between border-b border-lumis-panel-line bg-lumis-panel-surface px-5">
            <a href="/" class="group flex items-center gap-2.5 text-lumis-ink" aria-label="Pairframe">
                <svg class="size-7 shrink-0" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <defs>
                        <clipPath id="pf-mark">
                            <rect x="3" y="7" width="22" height="14" rx="2.25"/>
                        </clipPath>
                    </defs>
                    <rect x="3" y="7" width="22" height="14" rx="2.25" stroke="currentColor" stroke-width="1.75"/>
                    <g clip-path="url(#pf-mark)">
                        <path d="M3 21 15 7H3v14Z" fill="currentColor"/>
                        <path d="M9 21 19 7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                    </g>
                </svg>
                <span class="text-[1.05rem] font-semibold tracking-[-0.03em] text-lumis-display">
                    Pair<span class="text-zinc-400 transition-colors group-hover:text-lumis-ink">frame</span>
                </span>
            </a>

            <div class="flex items-center gap-3">
                <p class="text-xs font-normal text-zinc-400" x-text="statusMessage || exportSizeLabel"></p>
                <div class="inline-flex gap-1" role="group" aria-label="Theme">
                    <button
                        type="button"
                        class="inline-flex size-8 items-center justify-center"
                        :class="segmentClass(theme === 'light')"
                        aria-label="Light mode"
                        title="Light"
                        @click="setTheme('light')"
                    >
                        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <circle cx="12" cy="12" r="4" />
                            <path stroke-linecap="round" d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M18 18l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M18 6l1.06-1.06" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="inline-flex size-8 items-center justify-center"
                        :class="segmentClass(theme === 'dark')"
                        aria-label="Dark mode"
                        title="Dark"
                        @click="setTheme('dark')"
                    >
                        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="inline-flex size-8 items-center justify-center"
                        :class="segmentClass(theme === 'auto')"
                        aria-label="System theme"
                        title="Auto"
                        @click="setTheme('auto')"
                    >
                        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="12" rx="1.5" />
                            <path stroke-linecap="round" d="M8 20h8M12 16v4" />
                        </svg>
                    </button>
                </div>
                <button
                    type="button"
                    class="inline-flex h-8 items-center border border-lumis-panel-line bg-lumis-panel-surface px-4 text-[13px] font-medium text-lumis-ink hover:bg-lumis-segment-idle"
                    @click="openLoadPresetModal()"
                >
                    Load preset
                </button>
                <button
                    type="button"
                    class="inline-flex h-8 items-center border border-lumis-panel-line bg-lumis-panel-surface px-4 text-[13px] font-medium text-lumis-ink hover:bg-lumis-segment-idle"
                    @click="openPresetModal()"
                >
                    Save preset
                </button>
                <button
                    type="button"
                    class="inline-flex h-8 items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium text-lumis-canvas hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="!canExport || exporting"
                    @click="exportSelected()"
                >
                    <span x-text="exporting ? 'Exporting…' : 'Export selected'"></span>
                </button>
            </div>
        </header>

        {{-- Workspace: left tools | preview | right tools --}}
        <div class="flex min-h-0 flex-1">
            {{-- Left: layout + split + switches --}}
            <aside class="flex w-[240px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-lumis-panel-line bg-lumis-panel-surface px-4 py-4">
                <section>
                    <h2 class="mb-2 text-sm font-semibold tracking-tight text-lumis-display">Layout</h2>
                    <div class="flex flex-wrap gap-1.5">
                        <template x-for="option in layouts" :key="option.id">
                            <button
                                type="button"
                                class="px-2.5 py-1.5 text-xs font-medium"
                                :class="segmentClass(layout === option.id)"
                                @click="selectLayout(option.id)"
                                x-text="option.label"
                            ></button>
                        </template>
                    </div>

                    <div class="mt-3" x-show="usesSplit" x-cloak>
                        <p class="mb-2 text-xs font-medium text-lumis-ink">Style</p>
                        <div class="mb-3 flex flex-wrap gap-1.5">
                            <template x-for="option in splitStyles" :key="option.id">
                                <button
                                    type="button"
                                    class="px-2.5 py-1.5 text-xs font-medium"
                                    :class="segmentClass(splitStyle === option.id)"
                                    @click="setSplitStyle(option.id)"
                                    x-text="option.label"
                                ></button>
                            </template>
                        </div>
                        <div class="mb-3" x-show="showsEdgeDensity" x-cloak>
                            <div class="mb-1 flex items-center justify-between gap-2">
                                <label class="text-xs font-medium text-lumis-ink">Density</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="100"
                                    step="0.1"
                                    class="slider-value"
                                    x-model.number="diagonalDensity"
                                    @blur="clampSlider('diagonalDensity', 0.1, 100)"
                                    @keydown.enter="$event.target.blur()"
                                >
                            </div>
                            <input type="range" min="0.1" max="100" step="0.1" class="w-full" x-model.number="diagonalDensity">
                        </div>
                        <div x-show="layout === 'diagonal'" x-cloak>
                            <div class="mb-1 flex items-center justify-between gap-2">
                                <label class="text-xs font-medium text-lumis-ink">Angle</label>
                                <div class="flex items-center text-xs text-zinc-400">
                                    <input
                                        type="number"
                                        min="-180"
                                        max="180"
                                        step="0.5"
                                        class="slider-value"
                                        x-model.number="diagonalAngle"
                                        @blur="clampSlider('diagonalAngle', -180, 180)"
                                        @keydown.enter="$event.target.blur()"
                                    >
                                    <span>°</span>
                                </div>
                            </div>
                            <input type="range" min="-180" max="180" step="0.5" class="w-full" x-model.number="diagonalAngle">
                        </div>
                    </div>

                    <div class="mt-3" x-show="layout === 'overlap'" x-cloak>
                        <p class="mb-2 text-xs font-medium text-lumis-ink">Style</p>
                        <div class="mb-3 flex flex-wrap gap-1.5">
                            <template x-for="option in overlapVariants" :key="option.id">
                                <button
                                    type="button"
                                    class="px-2.5 py-1.5 text-xs font-medium"
                                    :class="segmentClass(overlapVariant === option.id)"
                                    @click="overlapVariant = option.id"
                                    x-text="option.label"
                                ></button>
                            </template>
                        </div>
                        <div class="mb-3 flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                class="px-2.5 py-1.5 text-xs font-medium"
                                :class="segmentClass(overlapShadow)"
                                @click="overlapShadow = !overlapShadow"
                            >Shadow</button>
                        </div>
                        <div x-show="showsOverlapOffset" x-cloak>
                            <div class="mb-1 flex items-center justify-between gap-2">
                                <label class="text-xs font-medium text-lumis-ink">Offset</label>
                                <div class="flex items-center text-xs text-zinc-400">
                                    <input
                                        type="number"
                                        min="0"
                                        max="40"
                                        step="1"
                                        class="slider-value"
                                        x-model.number="overlapOffset"
                                        @blur="clampSlider('overlapOffset', 0, 40)"
                                        @keydown.enter="$event.target.blur()"
                                    >
                                    <span>%</span>
                                </div>
                            </div>
                            <input type="range" min="0" max="40" step="1" class="w-full" x-model.number="overlapOffset">
                        </div>
                    </div>
                </section>

                <section x-show="usesSplit" x-cloak>
                    <h2 class="mb-2 text-sm font-semibold tracking-tight text-lumis-display">Split</h2>
                    <div class="mb-1 flex items-center justify-between gap-2">
                        <label class="text-xs font-medium text-lumis-ink">Position</label>
                        <div class="flex items-center text-xs text-zinc-400">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                class="slider-value"
                                x-model.number="splitPosition"
                                @blur="clampSlider('splitPosition', 0, 100)"
                                @keydown.enter="$event.target.blur()"
                            >
                            <span>%</span>
                        </div>
                    </div>
                    <input type="range" min="0" max="100" step="0.1" class="w-full" x-model.number="splitPosition">
                </section>

                <section>
                    <h2 class="mb-2 text-sm font-semibold tracking-tight text-lumis-display">Adjust</h2>
                    <div class="mb-3 flex flex-wrap gap-1.5">
                        <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(swapSides)" @click="swapSides = !swapSides">Swap sides</button>
                    </div>
                    <div class="mb-3" x-show="usesSplit" x-cloak>
                        <div class="mb-1 flex items-center justify-between gap-2">
                            <label class="text-xs font-medium text-lumis-ink">Padding</label>
                            <div class="flex items-center text-xs text-zinc-400">
                                <input
                                    type="number"
                                    min="0"
                                    max="40"
                                    step="0.5"
                                    class="slider-value"
                                    x-model.number="imagePadding"
                                    @blur="clampSlider('imagePadding', 0, 40)"
                                    @keydown.enter="$event.target.blur()"
                                >
                                <span>%</span>
                            </div>
                        </div>
                        <input type="range" min="0" max="40" step="0.5" class="w-full" x-model.number="imagePadding">
                    </div>
                    <div>
                        <div class="mb-1 flex items-center justify-between gap-2">
                            <label class="text-xs font-medium text-lumis-ink">Radius</label>
                            <div class="flex items-center text-xs text-zinc-400">
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="0.5"
                                    class="slider-value"
                                    x-model.number="imageRadius"
                                    @blur="clampSlider('imageRadius', 0, 50)"
                                    @keydown.enter="$event.target.blur()"
                                >
                                <span>%</span>
                            </div>
                        </div>
                        <input type="range" min="0" max="50" step="0.5" class="w-full" x-model.number="imageRadius">
                    </div>
                </section>

                <section>
                    <h2 class="mb-2 text-sm font-semibold tracking-tight text-lumis-display">Labels</h2>
                    <div class="mb-3 flex flex-wrap gap-1.5">
                        <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(!labelsEnabled)" @click="labelsEnabled = false">Off</button>
                        <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(labelsEnabled)" @click="labelsEnabled = true">On</button>
                    </div>
                    <div class="space-y-3" x-show="labelsEnabled" x-cloak>
                        <div>
                            <span class="mb-1.5 block text-xs font-medium text-lumis-ink" x-text="layout === 'horizontal' ? 'Top' : 'Left'"></span>
                            <input type="text" maxlength="40" class="label-text-input mb-1.5 w-full" x-model="labelLeft" :placeholder="layout === 'horizontal' ? 'Top' : 'Left'">
                            <div class="flex flex-wrap gap-1.5">
                                <template x-for="option in labelPositions" :key="'left-' + option.id">
                                    <button
                                        type="button"
                                        class="px-2.5 py-1.5 text-xs font-medium"
                                        :class="segmentClass(labelLeftPosition === option.id)"
                                        @click="labelLeftPosition = option.id"
                                        x-text="layout === 'horizontal' ? option.labelHorizontal : option.label"
                                    ></button>
                                </template>
                            </div>
                        </div>
                        <div>
                            <span class="mb-1.5 block text-xs font-medium text-lumis-ink" x-text="layout === 'horizontal' ? 'Bottom' : 'Right'"></span>
                            <input type="text" maxlength="40" class="label-text-input mb-1.5 w-full" x-model="labelRight" :placeholder="layout === 'horizontal' ? 'Bottom' : 'Right'">
                            <div class="flex flex-wrap gap-1.5">
                                <template x-for="option in labelPositions" :key="'right-' + option.id">
                                    <button
                                        type="button"
                                        class="px-2.5 py-1.5 text-xs font-medium"
                                        :class="segmentClass(labelRightPosition === option.id)"
                                        @click="labelRightPosition = option.id"
                                        x-text="layout === 'horizontal' ? option.labelHorizontal : option.label"
                                    ></button>
                                </template>
                            </div>
                        </div>
                        <div>
                            <span class="mb-1.5 block text-xs font-medium text-lumis-ink">Badge</span>
                            <input type="text" maxlength="40" class="label-text-input mb-1.5 w-full" x-model="labelBadge" placeholder="v1.0">
                            <div class="flex flex-wrap gap-1.5">
                                <template x-for="option in labelPositions" :key="'badge-' + option.id">
                                    <button
                                        type="button"
                                        class="px-2.5 py-1.5 text-xs font-medium"
                                        :class="segmentClass(labelBadgePosition === option.id)"
                                        @click="labelBadgePosition = option.id"
                                        x-text="option.label"
                                    ></button>
                                </template>
                            </div>
                        </div>
                        <div>
                            <div class="mb-1 flex items-center justify-between gap-2">
                                <label class="text-xs font-medium text-lumis-ink">Size</label>
                                <div class="flex items-center text-xs text-zinc-400">
                                    <input
                                        type="number"
                                        min="50"
                                        max="160"
                                        step="1"
                                        class="slider-value"
                                        x-model.number="labelSize"
                                        @blur="clampSlider('labelSize', 50, 160)"
                                        @keydown.enter="$event.target.blur()"
                                    >
                                    <span>%</span>
                                </div>
                            </div>
                            <input type="range" min="50" max="160" step="1" class="w-full" x-model.number="labelSize">
                        </div>
                    </div>
                </section>
            </aside>

            {{-- Center preview / upload --}}
            <main
                class="flex min-h-0 min-w-0 flex-1 flex-col bg-lumis-canvas"
                x-ref="previewStage"
                @dragover.prevent="onDragOver($event)"
                @dragleave.prevent="onDragLeave($event)"
                @drop.prevent="onDrop($event)"
            >
                <div class="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-lumis-panel-line px-4">
                    <div class="flex min-w-0 items-center gap-3">
                        <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Preview</h2>
                        <div class="flex gap-1" x-show="hasBothImages && layout === 'diagonal'" x-cloak>
                            <button
                                type="button"
                                class="px-2 py-1 text-xs font-medium"
                                :class="segmentClass(previewTool === 'position')"
                                @click="setPreviewTool('position')"
                            >Position</button>
                            <button
                                type="button"
                                class="px-2 py-1 text-xs font-medium"
                                :class="segmentClass(previewTool === 'angle')"
                                @click="setPreviewTool('angle')"
                            >Angle</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span
                            class="text-xs text-zinc-400"
                            x-show="hasBothImages && !videoPreviewing"
                            x-cloak
                            x-text="previewSizeLabel + (layout === 'overlap' ? '' : (layout === 'diagonal' ? (previewTool === 'angle' ? ' · drag to rotate' : ' · drag to move') : ' · drag to fine-tune'))"
                        ></span>
                        <span class="text-xs text-zinc-400" x-show="videoPreviewing" x-cloak x-text="'Playing ' + (videoTransitionOptions.find((item) => item.id === videoTransition)?.label || 'video').toLowerCase() + ' preview'"></span>
                        <span class="text-xs text-lumis-status-uploading" x-show="sizeWarning" x-text="sizeWarning" x-cloak></span>
                        <button
                            type="button"
                            class="text-xs font-medium text-zinc-400 hover:text-lumis-ink"
                            x-show="canPreviewVideo"
                            x-cloak
                            @click="toggleVideoPreview()"
                            x-text="videoPreviewing ? 'Stop preview' : 'Play preview'"
                        ></button>
                        <button
                            type="button"
                            class="text-xs font-medium text-zinc-400 hover:text-lumis-ink"
                            x-show="hasBothImages"
                            x-cloak
                            @click="stopVideoPreview(); clearImages()"
                        >
                            Replace images
                        </button>
                    </div>
                </div>

                <div class="relative flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
                    {{-- Upload dropzone --}}
                    <div
                        class="flex h-full min-h-0 w-full flex-col items-center justify-center border border-lumis-panel-line bg-lumis-segment-idle px-6"
                        :class="dropActive ? 'border-lumis-ink bg-lumis-status-uploading-bg' : ''"
                        x-show="!hasBothImages"
                        x-cloak
                    >
                        <svg class="mb-3 size-4 text-lumis-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
                        </svg>
                        <p class="text-[13px] font-normal tracking-tight text-zinc-600 dark:text-zinc-400">Drop 2 screenshots here</p>
                        <p class="mt-1 text-xs font-normal text-zinc-400">PNG, JPG, or WebP — order does not matter</p>
                        <label class="mt-4 inline-flex h-8 cursor-pointer items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium text-lumis-canvas hover:opacity-90">
                            Browse files
                            <input type="file" accept="image/png,image/jpeg,image/webp" multiple class="sr-only" @change="onFileInput($event)">
                        </label>
                    </div>

                    {{-- Composed preview — frame hugs the canvas --}}
                    <div
                        class="relative h-fit w-fit max-h-full max-w-full border border-lumis-panel-line bg-lumis-panel-surface"
                        x-show="hasBothImages"
                        x-cloak
                        @mouseenter="setPreviewHovered(true)"
                        @mouseleave="setPreviewHovered(false)"
                    >
                        <canvas x-ref="previewCanvas" class="block h-auto max-h-full w-auto max-w-full"></canvas>
                        <div
                            x-ref="splitHandle"
                            class="absolute z-10"
                            style="display: none;"
                            @pointerdown="startDrag($event)"
                        >
                            <div class="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 border border-white bg-lumis-ink"></div>
                        </div>
                    </div>
                </div>
            </main>

            {{-- Right: background + export --}}
            <aside class="flex w-[240px] shrink-0 flex-col gap-5 overflow-hidden border-l border-lumis-panel-line bg-lumis-panel-surface px-4 py-4">
                <section>
                    <div class="mb-2 flex items-baseline justify-between">
                        <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Background</h2>
                        <span class="text-xs text-zinc-400">Export</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                        <template x-for="option in backgroundOptions" :key="option.id">
                            <button
                                type="button"
                                class="px-2.5 py-1.5 text-xs font-medium"
                                :class="segmentClass(backgroundType === option.id)"
                                @click="backgroundType = option.id"
                                x-text="option.label"
                            ></button>
                        </template>
                    </div>
                    <div class="mt-3 flex items-center gap-3">
                        <label class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <input type="color" x-model="backgroundBg">
                            Base
                        </label>
                        <label class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400" x-show="backgroundType !== 'solid'" x-cloak>
                            <input type="color" x-model="backgroundFg">
                            Pattern
                        </label>
                    </div>
                    <div class="mt-3" x-show="backgroundType !== 'solid'" x-cloak>
                        <div class="mb-1 flex items-center justify-between gap-2">
                            <label class="text-xs font-medium text-lumis-ink">Density</label>
                            <input
                                type="number"
                                min="8"
                                max="80"
                                step="1"
                                class="slider-value"
                                x-model.number="backgroundDensity"
                                @blur="clampSlider('backgroundDensity', 8, 80)"
                                @keydown.enter="$event.target.blur()"
                            >
                        </div>
                        <input type="range" min="8" max="80" step="1" class="w-full" x-model.number="backgroundDensity">
                    </div>
                </section>

                <section>
                    <div class="mb-2 flex items-baseline justify-between">
                        <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Export</h2>
                        <span class="text-xs text-zinc-400" x-text="exportSizeLabel"></span>
                    </div>

                    <div class="mb-3" x-show="exportFormat !== 'video'" x-cloak>
                        <p class="mb-2 text-xs font-medium text-lumis-ink">Scale</p>
                        <div class="flex flex-wrap gap-1.5">
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportScale === '1')" @click="exportScale = '1'">1×</button>
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportScale === '1.5')" @click="exportScale = '1.5'">1.5×</button>
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportScale === '2')" @click="exportScale = '2'">2×</button>
                        </div>
                    </div>

                    <p class="mb-2 text-xs font-medium text-lumis-ink">Format</p>
                    <div class="mb-3 flex flex-wrap gap-1.5">
                        <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportFormat === 'png')" @click="stopVideoPreview(); exportFormat = 'png'">PNG</button>
                        <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportFormat === 'jpg')" @click="stopVideoPreview(); exportFormat = 'jpg'">JPG</button>
                        <button
                            type="button"
                            class="px-2.5 py-1.5 text-xs font-medium"
                            :class="segmentClass(exportFormat === 'video')"
                            :title="usesSplit ? 'Transition video at source resolution' : 'Video needs a split layout'"
                            @click="selectExportFormat('video')"
                        >Video</button>
                    </div>

                    <div x-show="exportFormat === 'jpg'" x-cloak>
                        <div class="mb-1 flex items-center justify-between gap-2">
                            <label class="text-xs font-medium text-lumis-ink">JPG quality</label>
                            <div class="flex items-center text-xs text-zinc-400">
                                <input
                                    type="number"
                                    min="50"
                                    max="100"
                                    step="1"
                                    class="slider-value"
                                    x-model.number="jpgQuality"
                                    @blur="clampSlider('jpgQuality', 50, 100)"
                                    @keydown.enter="$event.target.blur()"
                                >
                                <span>%</span>
                            </div>
                        </div>
                        <input type="range" min="50" max="100" step="1" class="w-full" x-model.number="jpgQuality">
                    </div>

                    <div class="mt-3 space-y-3" x-show="exportFormat === 'video'" x-cloak>
                        <p class="text-xs text-zinc-400" x-show="usesSplit" x-cloak>Transition · source resolution</p>
                        <p class="text-xs text-lumis-status-uploading" x-show="!usesSplit" x-cloak>Switch to Vertical, Horizontal, or Diagonal for video.</p>
                        <div x-show="usesSplit" x-cloak>
                            <p class="mb-1.5 text-xs font-medium text-lumis-ink">Transition</p>
                            <div class="flex flex-wrap gap-1.5">
                                <template x-for="option in videoTransitionOptions" :key="option.id">
                                    <button
                                        type="button"
                                        class="px-2.5 py-1.5 text-xs font-medium"
                                        :class="segmentClass(videoTransition === option.id)"
                                        @click="stopVideoPreview(); videoTransition = option.id"
                                        x-text="option.label"
                                    ></button>
                                </template>
                            </div>
                        </div>
                        <div x-show="usesSplit" x-cloak>
                            <p class="mb-1.5 text-xs font-medium text-lumis-ink">Container</p>
                            <div class="flex flex-wrap gap-1.5">
                                <template x-for="option in videoContainerOptions" :key="option.id">
                                    <button
                                        type="button"
                                        class="px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                                        :class="segmentClass(videoContainer === option.id)"
                                        :disabled="(option.id === 'mp4' && !supportsMp4Video) || (option.id === 'webm' && !supportsWebmVideo)"
                                        :title="option.id === 'mp4' && !supportsMp4Video ? 'MP4 not supported here' : (option.id === 'webm' && !supportsWebmVideo ? 'WebM not supported here' : '')"
                                        @click="videoContainer = option.id"
                                        x-text="option.label"
                                    ></button>
                                </template>
                            </div>
                        </div>
                        <div x-show="usesSplit" x-cloak>
                            <div class="mb-1 flex items-center justify-between gap-2">
                                <label class="text-xs font-medium text-lumis-ink">Duration</label>
                                <div class="flex items-center text-xs text-zinc-400">
                                    <input
                                        type="number"
                                        min="1"
                                        max="6"
                                        step="0.5"
                                        class="slider-value"
                                        x-model.number="videoDuration"
                                        @blur="clampSlider('videoDuration', 1, 6)"
                                        @keydown.enter="$event.target.blur()"
                                    >
                                    <span>s</span>
                                </div>
                            </div>
                            <input type="range" min="1" max="6" step="0.5" class="w-full" x-model.number="videoDuration">
                        </div>
                        <div x-show="usesSplit" x-cloak>
                            <p class="mb-1.5 text-xs font-medium text-lumis-ink">FPS</p>
                            <div class="flex flex-wrap gap-1.5">
                                <template x-for="option in videoFpsOptions" :key="option.id">
                                    <button
                                        type="button"
                                        class="px-2.5 py-1.5 text-xs font-medium"
                                        :class="segmentClass(videoFps === option.id)"
                                        @click="videoFps = option.id"
                                        x-text="option.label"
                                    ></button>
                                </template>
                            </div>
                        </div>
                        <div x-show="usesSplit" x-cloak>
                            <p class="mb-1.5 text-xs font-medium text-lumis-ink">Direction</p>
                            <div class="flex flex-wrap gap-1.5">
                                <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(!videoReverse)" @click="stopVideoPreview(); videoReverse = false">A → B</button>
                                <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(videoReverse)" @click="stopVideoPreview(); videoReverse = true">B → A</button>
                            </div>
                        </div>
                        <div x-show="canPreviewVideo || videoPreviewing" x-cloak>
                            <button
                                type="button"
                                class="inline-flex h-8 w-full items-center justify-center border border-lumis-panel-line bg-lumis-panel-surface text-[13px] font-medium text-lumis-ink hover:bg-lumis-segment-idle"
                                @click="toggleVideoPreview()"
                                x-text="videoPreviewing ? 'Stop preview' : 'Play preview'"
                            ></button>
                        </div>
                    </div>
                </section>
            </aside>
        </div>
    </div>

    {{-- Load preset modal --}}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        x-show="loadPresetModalOpen"
        x-cloak
        x-transition.opacity
        @keydown.escape.window="if (loadPresetModalOpen) closeLoadPresetModal()"
        @click.self="closeLoadPresetModal()"
    >
        <div
            class="w-full max-w-md border border-lumis-panel-line bg-lumis-panel-surface p-5 shadow-lg"
            @click.stop
            role="dialog"
            aria-modal="true"
            aria-labelledby="load-preset-modal-title"
        >
            <div class="flex items-start justify-between gap-3">
                <div>
                    <h2 id="load-preset-modal-title" class="text-sm font-semibold tracking-tight text-lumis-display">Load preset</h2>
                    <p class="mt-1 text-xs text-zinc-400">Choose a saved settings preset to apply.</p>
                </div>
                <button
                    type="button"
                    class="text-xs font-medium text-zinc-400 hover:text-lumis-ink"
                    @click="closeLoadPresetModal()"
                    aria-label="Close"
                >Esc</button>
            </div>

            <div class="mt-4 max-h-72 space-y-2 overflow-y-auto" x-show="presets.length" x-cloak>
                <template x-for="preset in presets" :key="preset.id">
                    <div
                        class="flex items-stretch gap-2 border border-lumis-panel-line px-3 py-2.5 transition-colors"
                        :class="selectedLoadPresetId === preset.id
                            ? 'bg-lumis-segment-idle'
                            : 'bg-lumis-panel-surface hover:bg-lumis-segment-idle'"
                    >
                        <button
                            type="button"
                            class="min-w-0 flex-1 text-left outline-none focus:outline-none focus-visible:outline-none"
                            @click="selectedLoadPresetId = preset.id"
                            @dblclick="applyPreset(preset)"
                        >
                            <div class="flex items-center gap-2">
                                <span class="truncate text-[13px] font-medium text-lumis-ink" x-text="preset.name"></span>
                                <span
                                    class="shrink-0 text-[10px] font-medium uppercase tracking-wide text-zinc-400"
                                    x-show="activePresetId === preset.id"
                                    x-cloak
                                >Active</span>
                            </div>
                            <p class="mt-0.5 truncate text-xs text-zinc-400" x-text="presetSummary(preset)"></p>
                        </button>
                        <button
                            type="button"
                            class="shrink-0 self-center px-1 text-xs font-medium text-zinc-400 outline-none hover:text-lumis-ink focus:outline-none"
                            title="Delete preset"
                            @click.stop="deletePreset(preset.id)"
                        >Delete</button>
                    </div>
                </template>
            </div>

            <div
                class="mt-4 border border-dashed border-lumis-panel-line px-4 py-8 text-center"
                x-show="!presets.length"
                x-cloak
            >
                <p class="text-[13px] font-medium text-lumis-ink">No presets yet</p>
                <p class="mt-1 text-xs text-zinc-400">Save your current settings to reuse them later.</p>
                <button
                    type="button"
                    class="mt-4 inline-flex h-8 items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium text-lumis-canvas hover:opacity-90"
                    @click="closeLoadPresetModal(); openPresetModal()"
                >Save preset</button>
            </div>

            <div class="mt-5 flex items-center justify-between gap-3" x-show="presets.length" x-cloak>
                <p class="min-w-0 truncate text-xs text-zinc-400" x-text="selectedLoadPreset ? ('Selected: ' + selectedLoadPreset.name) : 'Select a preset'"></p>
                <div class="flex shrink-0 gap-2">
                    <button
                        type="button"
                        class="inline-flex h-8 items-center border border-lumis-panel-line px-4 text-[13px] font-medium text-lumis-ink hover:bg-lumis-segment-idle"
                        @click="closeLoadPresetModal()"
                    >Cancel</button>
                    <button
                        type="button"
                        class="inline-flex h-8 items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium text-lumis-canvas hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        :disabled="!selectedLoadPreset"
                        @click="loadSelectedPreset()"
                    >Load</button>
                </div>
            </div>
        </div>
    </div>

    {{-- Save preset modal --}}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        x-show="presetModalOpen"
        x-cloak
        x-transition.opacity
        @keydown.escape.window="if (presetModalOpen) closePresetModal()"
        @click.self="closePresetModal()"
    >
        <div
            class="w-full max-w-sm border border-lumis-panel-line bg-lumis-panel-surface p-5 shadow-lg"
            @click.stop
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-modal-title"
        >
            <h2 id="preset-modal-title" class="text-sm font-semibold tracking-tight text-lumis-display">Save preset</h2>
            <p class="mt-1 text-xs text-zinc-400">Stores layout, split, labels, background, and export settings — not images.</p>
            <label class="mt-4 block">
                <span class="mb-1.5 block text-xs font-medium text-lumis-ink">Name</span>
                <input
                    type="text"
                    maxlength="40"
                    placeholder="e.g. Diagonal wavy"
                    class="preset-name-input w-full px-3 py-2 text-sm"
                    x-ref="presetNameInput"
                    x-model="presetName"
                    @keydown.enter.prevent="savePreset()"
                >
            </label>
            <div class="mt-5 flex justify-end gap-2">
                <button
                    type="button"
                    class="inline-flex h-8 items-center border border-lumis-panel-line px-4 text-[13px] font-medium text-lumis-ink hover:bg-lumis-segment-idle"
                    @click="closePresetModal()"
                >Cancel</button>
                <button
                    type="button"
                    class="inline-flex h-8 items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium text-lumis-canvas hover:opacity-90"
                    @click="savePreset()"
                >Save</button>
            </div>
        </div>
    </div>

    <style>
        [x-cloak] { display: none !important; }
    </style>
    <script>
        (() => {
            const dismiss = () => {
                const screen = document.getElementById('boot-screen');
                if (!screen || screen.classList.contains('is-done')) {
                    return;
                }
                screen.classList.add('is-done');
                screen.setAttribute('aria-busy', 'false');
                window.setTimeout(() => screen.remove(), 400);
            };

            document.addEventListener('alpine:initialized', () => {
                requestAnimationFrame(() => requestAnimationFrame(dismiss));
            });
            window.addEventListener('load', () => window.setTimeout(dismiss, 1200));
        })();
    </script>
</body>
</html>
