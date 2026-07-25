<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Pairframe') }}</title>
    @fonts
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-dvh bg-lumis-canvas font-sans font-normal text-lumis-ink" x-data="pairframe">
    <div class="flex min-h-dvh flex-col">
        {{-- Header --}}
        <header class="flex items-center justify-between border-b border-lumis-panel-line bg-lumis-panel-surface px-5 py-4 sm:px-6">
            <div class="flex items-center gap-2.5">
                <svg class="size-6 text-lumis-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h10M4 18h16" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 9.5 19 12l-4 2.5" />
                </svg>
                <div class="text-lg font-semibold tracking-tight text-lumis-display">
                    Pairframe
                </div>
            </div>

            <div class="flex items-center gap-3">
                <p class="hidden text-xs font-normal text-zinc-400 sm:block" x-text="statusMessage || exportSizeLabel"></p>
                <button
                    type="button"
                    class="inline-flex h-8 items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium tracking-normal text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumis-ink/30 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="!canExport || exporting"
                    @click="exportSelected()"
                >
                    <span x-text="exporting ? 'Exporting…' : 'Export selected'"></span>
                </button>
            </div>
        </header>

        <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
            {{-- Tools --}}
            <aside class="w-full shrink-0 overflow-y-auto border-b border-lumis-panel-line bg-lumis-panel-surface lg:w-[360px] lg:border-b-0 lg:border-r">
                <div class="flex flex-col gap-8 px-5 py-5 sm:px-6">
                    {{-- Uploads --}}
                    <section>
                        <div class="mb-2.5 flex items-baseline justify-between">
                            <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Screenshots</h2>
                            <span class="text-xs font-normal text-zinc-400">Light + dark</span>
                        </div>
                        <p class="mb-4 text-sm font-normal text-zinc-500">Identical shots, only theme differs.</p>

                        <div class="flex flex-col gap-2">
                            {{-- Light dropzone --}}
                            <div
                                class="flex h-[54px] items-center gap-3 border border-lumis-panel-line bg-lumis-segment-idle px-3"
                                @dragover.prevent
                                @drop.prevent="onDrop($event, 'light')"
                            >
                                <svg class="size-4 shrink-0 text-lumis-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
                                </svg>
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-[13px] font-normal tracking-tight text-zinc-600" x-text="lightName || 'Light mode'"></p>
                                    <p class="truncate text-xs font-normal text-zinc-400" x-text="lightMeta || 'PNG, JPG, or WebP'"></p>
                                </div>
                                <template x-if="lightImage">
                                    <button type="button" class="text-xs font-medium text-zinc-400 hover:text-lumis-ink" @click="clearSide('light')">Clear</button>
                                </template>
                                <label class="inline-flex h-8 cursor-pointer items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium text-white hover:bg-black">
                                    Browse
                                    <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="onFileInput($event, 'light')">
                                </label>
                            </div>

                            {{-- Dark dropzone --}}
                            <div
                                class="flex h-[54px] items-center gap-3 border border-lumis-panel-line bg-lumis-segment-idle px-3"
                                @dragover.prevent
                                @drop.prevent="onDrop($event, 'dark')"
                            >
                                <svg class="size-4 shrink-0 text-lumis-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
                                </svg>
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-[13px] font-normal tracking-tight text-zinc-600" x-text="darkName || 'Dark mode'"></p>
                                    <p class="truncate text-xs font-normal text-zinc-400" x-text="darkMeta || 'PNG, JPG, or WebP'"></p>
                                </div>
                                <template x-if="darkImage">
                                    <button type="button" class="text-xs font-medium text-zinc-400 hover:text-lumis-ink" @click="clearSide('dark')">Clear</button>
                                </template>
                                <label class="inline-flex h-8 cursor-pointer items-center border border-lumis-ink bg-lumis-ink px-4 text-[13px] font-medium text-white hover:bg-black">
                                    Browse
                                    <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="onFileInput($event, 'dark')">
                                </label>
                            </div>
                        </div>

                        <p class="mt-2 text-xs font-normal text-lumis-status-uploading" x-show="sizeWarning" x-text="sizeWarning" x-cloak></p>
                    </section>

                    {{-- Layout --}}
                    <section>
                        <div class="mb-2.5 flex items-baseline justify-between">
                            <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Layout</h2>
                            <span class="text-xs font-normal text-zinc-400" x-text="layoutFamilies.length + ' families'"></span>
                        </div>

                        <div class="flex flex-wrap gap-1.5">
                            <template x-for="family in layoutFamilies" :key="family.id">
                                <button
                                    type="button"
                                    class="px-2.5 py-1.5 text-xs font-medium tracking-normal"
                                    :class="segmentClass(layoutFamily === family.id)"
                                    @click="selectFamily(family.id)"
                                    x-text="family.label"
                                ></button>
                            </template>
                        </div>

                        <div class="mt-4" x-show="currentVariants.length > 1" x-cloak>
                            <p class="mb-2 text-xs font-medium text-lumis-ink">Variant</p>
                            <div class="flex flex-wrap gap-1.5">
                                <template x-for="variant in currentVariants" :key="variant.id">
                                    <button
                                        type="button"
                                        class="px-2.5 py-1.5 text-xs font-medium tracking-normal"
                                        :class="segmentClass(layoutVariant === variant.id)"
                                        @click="layoutVariant = variant.id"
                                        x-text="variant.label"
                                    ></button>
                                </template>
                            </div>
                        </div>

                        <div class="mt-4 flex flex-wrap gap-1.5" x-show="showsSplitControls" x-cloak>
                            <template x-for="preset in ratioPresets" :key="preset.id">
                                <button
                                    type="button"
                                    class="px-2.5 py-1.5 text-xs font-medium tracking-normal"
                                    :class="segmentClass(splitPosition === preset.value)"
                                    @click="setRatio(preset.value)"
                                    x-text="preset.label"
                                ></button>
                            </template>
                        </div>

                        <div class="mt-4 space-y-4" x-show="showsSplitControls" x-cloak>
                            <div>
                                <div class="mb-2 flex items-center justify-between">
                                    <label class="text-xs font-medium text-lumis-ink">Split position</label>
                                    <span class="text-xs text-zinc-400" x-text="splitPosition + '%'"></span>
                                </div>
                                <input type="range" min="0" max="100" step="1" class="w-full" x-model.number="splitPosition">
                            </div>
                        </div>

                        <div class="mt-4" x-show="showsSoftEdge" x-cloak>
                            <div class="mb-2 flex items-center justify-between">
                                <label class="text-xs font-medium text-lumis-ink">Soft edge</label>
                                <span class="text-xs text-zinc-400" x-text="softEdge + 'px'"></span>
                            </div>
                            <input type="range" min="0" max="160" step="1" class="w-full" x-model.number="softEdge">
                        </div>

                        <div class="mt-4" x-show="showsMaskDensity" x-cloak>
                            <div class="mb-2 flex items-center justify-between">
                                <label class="text-xs font-medium text-lumis-ink">Pattern density</label>
                                <span class="text-xs text-zinc-400" x-text="maskDensity"></span>
                            </div>
                            <input type="range" min="8" max="80" step="1" class="w-full" x-model.number="maskDensity">
                        </div>

                        <div class="mt-4 space-y-4" x-show="showsOverlapControls" x-cloak>
                            <div>
                                <div class="mb-2 flex items-center justify-between">
                                    <label class="text-xs font-medium text-lumis-ink">Overlap X</label>
                                    <span class="text-xs text-zinc-400" x-text="overlapOffsetX"></span>
                                </div>
                                <input type="range" min="0" max="40" step="1" class="w-full" x-model.number="overlapOffsetX">
                            </div>
                            <div>
                                <div class="mb-2 flex items-center justify-between">
                                    <label class="text-xs font-medium text-lumis-ink">Overlap Y</label>
                                    <span class="text-xs text-zinc-400" x-text="overlapOffsetY"></span>
                                </div>
                                <input type="range" min="0" max="40" step="1" class="w-full" x-model.number="overlapOffsetY">
                            </div>
                            <div>
                                <div class="mb-2 flex items-center justify-between">
                                    <label class="text-xs font-medium text-lumis-ink">Shadow</label>
                                    <span class="text-xs text-zinc-400" x-text="overlapShadow"></span>
                                </div>
                                <input type="range" min="0" max="60" step="1" class="w-full" x-model.number="overlapShadow">
                            </div>
                        </div>
                    </section>

                    {{-- Switches --}}
                    <section>
                        <h2 class="mb-2.5 text-sm font-semibold tracking-tight text-lumis-display">Switches</h2>
                        <div class="flex flex-wrap gap-1.5">
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(swapSides)" @click="swapSides = !swapSides">Swap light / dark</button>
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(flipDirection)" @click="flipDirection = !flipDirection">Flip direction</button>
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(invertMask)" @click="invertMask = !invertMask">Invert mask</button>
                        </div>

                        <div class="mt-4">
                            <p class="mb-2 text-xs font-medium text-lumis-ink">Image fit</p>
                            <div class="flex flex-wrap gap-1.5">
                                <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(fitMode === 'cover')" @click="fitMode = 'cover'">Cover</button>
                                <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(fitMode === 'contain')" @click="fitMode = 'contain'">Contain</button>
                            </div>
                        </div>
                    </section>

                    {{-- Background --}}
                    <section>
                        <div class="mb-2.5 flex items-baseline justify-between">
                            <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Background</h2>
                            <span class="text-xs font-normal text-zinc-400">Export only</span>
                        </div>

                        <div class="flex flex-wrap gap-1.5">
                            <template x-for="option in backgroundOptions" :key="option.id">
                                <button
                                    type="button"
                                    class="px-2.5 py-1.5 text-xs font-medium tracking-normal"
                                    :class="segmentClass(backgroundType === option.id)"
                                    @click="backgroundType = option.id"
                                    x-text="option.label"
                                ></button>
                            </template>
                        </div>

                        <div class="mt-4 flex items-center gap-4">
                            <label class="flex items-center gap-2.5 text-xs font-normal text-zinc-600">
                                <input type="color" x-model="backgroundBg">
                                Base
                            </label>
                            <label class="flex items-center gap-2.5 text-xs font-normal text-zinc-600" x-show="backgroundType !== 'solid'" x-cloak>
                                <input type="color" x-model="backgroundFg">
                                Pattern
                            </label>
                        </div>

                        <div class="mt-4" x-show="backgroundType !== 'solid'" x-cloak>
                            <div class="mb-2 flex items-center justify-between">
                                <label class="text-xs font-medium text-lumis-ink">Density</label>
                                <span class="text-xs text-zinc-400" x-text="backgroundDensity"></span>
                            </div>
                            <input type="range" min="8" max="80" step="1" class="w-full" x-model.number="backgroundDensity">
                        </div>
                    </section>

                    {{-- Export --}}
                    <section class="pb-4">
                        <div class="mb-2.5 flex items-baseline justify-between">
                            <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Export</h2>
                            <span class="text-xs font-normal text-zinc-400" x-text="exportSizeLabel"></span>
                        </div>

                        <p class="mb-4 text-sm font-normal text-zinc-500">Default size matches your upload.</p>

                        <p class="mb-2 text-xs font-medium text-lumis-ink">Scale</p>
                        <div class="mb-4 flex flex-wrap gap-1.5">
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportScale === '1')" @click="exportScale = '1'">1×</button>
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportScale === '1.5')" @click="exportScale = '1.5'">1.5×</button>
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportScale === '2')" @click="exportScale = '2'">2×</button>
                        </div>

                        <label class="mb-4 block">
                            <span class="mb-2 block text-xs font-medium text-lumis-ink">Max width (optional)</span>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 1920"
                                class="h-10 w-full border border-lumis-panel-line bg-lumis-control-bg px-3 text-sm text-lumis-control-fg placeholder:text-zinc-400 focus-visible:border-lumis-ink/30 focus-visible:outline-none"
                                x-model="customMaxWidth"
                            >
                        </label>

                        <p class="mb-2 text-xs font-medium text-lumis-ink">Formats</p>
                        <div class="mb-4 flex flex-wrap gap-1.5">
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportPng)" @click="exportPng = !exportPng">PNG</button>
                            <button type="button" class="px-2.5 py-1.5 text-xs font-medium" :class="segmentClass(exportJpg)" @click="exportJpg = !exportJpg">JPG</button>
                        </div>

                        <div x-show="exportJpg" x-cloak>
                            <div class="mb-2 flex items-center justify-between">
                                <label class="text-xs font-medium text-lumis-ink">JPG quality</label>
                                <span class="text-xs text-zinc-400" x-text="jpgQuality + '%'"></span>
                            </div>
                            <input type="range" min="50" max="100" step="1" class="w-full" x-model.number="jpgQuality">
                        </div>

                        <p class="mt-4 text-xs font-normal leading-4 tracking-tight text-zinc-400">
                            Exports download as separate files for each selected format.
                        </p>
                    </section>
                </div>
            </aside>

            {{-- Preview --}}
            <main class="flex min-h-[420px] min-w-0 flex-1 flex-col bg-lumis-canvas" x-ref="previewStage">
                <div class="flex items-center justify-between border-b border-lumis-panel-line px-5 py-3 sm:px-6">
                    <h2 class="text-sm font-semibold tracking-tight text-lumis-display">Live preview</h2>
                    <div class="flex items-center gap-4">
                        <span class="text-xs font-normal text-zinc-400" x-text="previewSizeLabel + ' · fit'"></span>
                        <span class="text-xs font-normal text-zinc-400" x-show="showsDragHandle">Drag the split line</span>
                    </div>
                </div>

                <div class="relative flex min-h-0 flex-1 items-start justify-start overflow-hidden p-4 sm:p-5">
                    <div class="relative max-h-full max-w-full border border-lumis-panel-line bg-lumis-panel-surface">
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
        </div>
    </div>

    <style>
        [x-cloak] { display: none !important; }
    </style>
</body>
</html>
