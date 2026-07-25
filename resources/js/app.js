import Alpine from 'alpinejs';
import { createCompositor } from './compositor.js';

const PRESETS_STORAGE_KEY = 'pairframe.presets';

document.addEventListener('alpine:init', () => {
    Alpine.data('pairframe', () => ({
        imageA: null,
        imageB: null,
        nameA: '',
        nameB: '',
        metaA: '',
        metaB: '',
        sizeWarning: '',

        baseWidth: 1280,
        baseHeight: 720,

        layout: 'vertical',
        diagonalAngle: Math.round(((Math.atan2(9, 16) * 180) / Math.PI) * 10) / 10,
        diagonalStyle: 'straight',
        diagonalDensity: 1.5,
        splitPosition: 50,
        previewTool: 'position',
        swapSides: false,
        imagePadding: 0,
        imageRadius: 0,

        backgroundType: 'dots',
        backgroundBg: '#FAFAFA',
        backgroundFg: '#E5E5E5',
        backgroundDensity: 24,

        exportScale: '1',
        exportPng: true,
        exportJpg: false,
        jpgQuality: 92,
        exporting: false,
        statusMessage: '',

        presets: [],
        presetName: '',
        activePresetId: null,
        selectedLoadPresetId: null,
        presetModalOpen: false,
        loadPresetModalOpen: false,

        dragging: false,
        dragPivot: null,
        previewHovered: false,
        dropActive: false,
        previewMetrics: { scale: 1, drawWidth: 0, drawHeight: 0 },
        compositor: null,

        layouts: [
            { id: 'vertical', label: 'Vertical' },
            { id: 'horizontal', label: 'Horizontal' },
            { id: 'diagonal', label: 'Diagonal' },
        ],

        diagonalStyles: [
            { id: 'straight', label: 'Straight' },
            { id: 'wavy', label: 'Wavy' },
            { id: 'zigzag', label: 'Zigzag' },
            { id: 'scallop', label: 'Scallop' },
            { id: 'soft', label: 'Soft' },
        ],

        backgroundOptions: [
            { id: 'solid', label: 'Solid' },
            { id: 'dots', label: 'Dots' },
            { id: 'grid', label: 'Grid' },
            { id: 'stripes', label: 'Stripes' },
            { id: 'diagonal', label: 'Diagonal' },
            { id: 'chevron', label: 'Chevron' },
            { id: 'noise', label: 'Noise' },
        ],

        init() {
            this.compositor = createCompositor();
            this.loadPresets();
            this.$watch(
                () => [
                    this.layout,
                    this.diagonalAngle,
                    this.diagonalStyle,
                    this.diagonalDensity,
                    this.splitPosition,
                    this.swapSides,
                    this.imagePadding,
                    this.imageRadius,
                    this.backgroundType,
                    this.backgroundBg,
                    this.backgroundFg,
                    this.backgroundDensity,
                    this.baseWidth,
                    this.baseHeight,
                    this.imageA,
                    this.imageB,
                ],
                () => this.render(),
            );

            this.$nextTick(() => this.render());
            this._onResize = () => this.updateHandle();
            window.addEventListener('resize', this._onResize);
        },

        get canExport() {
            return Boolean(this.imageA && this.imageB) && (this.exportPng || this.exportJpg);
        },

        get exportSizeLabel() {
            const { width, height } = this.resolveExportSize();
            return `${width} × ${height}`;
        },

        get previewSizeLabel() {
            return `${this.baseWidth} × ${this.baseHeight}`;
        },

        get hasBothImages() {
            return Boolean(this.imageA && this.imageB);
        },

        get showsDragHandle() {
            return this.hasBothImages && (this.previewHovered || this.dragging);
        },

        setPreviewHovered(hovered) {
            this.previewHovered = hovered;
            this.$nextTick(() => this.updateHandle());
        },

        get showsDiagonalDensity() {
            return this.layout === 'diagonal' && this.diagonalStyle !== 'straight' && this.diagonalStyle !== 'soft';
        },

        segmentClass(active) {
            return active
                ? 'bg-lumis-ink text-white'
                : 'bg-lumis-segment-idle text-lumis-ink hover:bg-zinc-200';
        },

        clampSlider(key, min, max) {
            const value = Number(this[key]);
            this[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
        },

        selectLayout(id) {
            this.layout = id;
            this.previewTool = id === 'diagonal' ? 'angle' : 'position';
        },

        setPreviewTool(tool) {
            this.previewTool = tool;
            this.$nextTick(() => this.updateHandle());
        },

        captureSettings() {
            return {
                layout: this.layout,
                diagonalAngle: this.diagonalAngle,
                diagonalStyle: this.diagonalStyle,
                diagonalDensity: this.diagonalDensity,
                splitPosition: this.splitPosition,
                swapSides: this.swapSides,
                imagePadding: this.imagePadding,
                imageRadius: this.imageRadius,
                backgroundType: this.backgroundType,
                backgroundBg: this.backgroundBg,
                backgroundFg: this.backgroundFg,
                backgroundDensity: this.backgroundDensity,
                exportScale: this.exportScale,
                exportPng: this.exportPng,
                exportJpg: this.exportJpg,
                jpgQuality: this.jpgQuality,
            };
        },

        applySettings(settings = {}) {
            if (!settings || typeof settings !== 'object') {
                return;
            }

            const layouts = new Set(this.layouts.map((item) => item.id));
            const styles = new Set(this.diagonalStyles.map((item) => item.id));
            const backgrounds = new Set(this.backgroundOptions.map((item) => item.id));

            if (layouts.has(settings.layout)) {
                this.layout = settings.layout;
            }
            if (Number.isFinite(Number(settings.diagonalAngle))) {
                this.diagonalAngle = Number(settings.diagonalAngle);
            }
            if (styles.has(settings.diagonalStyle)) {
                this.diagonalStyle = settings.diagonalStyle;
            }
            if (Number.isFinite(Number(settings.diagonalDensity))) {
                this.diagonalDensity = Math.min(100, Math.max(0.1, Number(settings.diagonalDensity)));
            }
            if (Number.isFinite(Number(settings.splitPosition))) {
                this.splitPosition = Math.min(100, Math.max(0, Number(settings.splitPosition)));
            }
            this.swapSides = Boolean(settings.swapSides);
            if (Number.isFinite(Number(settings.imagePadding))) {
                this.imagePadding = Math.min(40, Math.max(0, Number(settings.imagePadding)));
            }
            if (Number.isFinite(Number(settings.imageRadius))) {
                this.imageRadius = Math.min(50, Math.max(0, Number(settings.imageRadius)));
            }
            if (backgrounds.has(settings.backgroundType)) {
                this.backgroundType = settings.backgroundType;
            }
            if (typeof settings.backgroundBg === 'string') {
                this.backgroundBg = settings.backgroundBg;
            }
            if (typeof settings.backgroundFg === 'string') {
                this.backgroundFg = settings.backgroundFg;
            }
            if (Number.isFinite(Number(settings.backgroundDensity))) {
                this.backgroundDensity = Math.min(80, Math.max(8, Number(settings.backgroundDensity)));
            }
            if (['1', '1.5', '2'].includes(String(settings.exportScale))) {
                this.exportScale = String(settings.exportScale);
            }
            if (typeof settings.exportPng === 'boolean') {
                this.exportPng = settings.exportPng;
            }
            if (typeof settings.exportJpg === 'boolean') {
                this.exportJpg = settings.exportJpg;
            }
            if (Number.isFinite(Number(settings.jpgQuality))) {
                this.jpgQuality = Math.min(100, Math.max(50, Number(settings.jpgQuality)));
            }

            this.previewTool = this.layout === 'diagonal' ? 'angle' : 'position';
        },

        loadPresets() {
            try {
                const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                this.presets = Array.isArray(parsed)
                    ? parsed.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
                    : [];
            } catch {
                this.presets = [];
            }
        },

        persistPresets() {
            localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(this.presets));
        },

        openPresetModal() {
            this.loadPresetModalOpen = false;
            this.presetName = '';
            this.presetModalOpen = true;
            this.$nextTick(() => {
                this.$refs.presetNameInput?.focus();
            });
        },

        closePresetModal() {
            this.presetModalOpen = false;
            this.presetName = '';
        },

        openLoadPresetModal() {
            this.presetModalOpen = false;
            this.selectedLoadPresetId = this.activePresetId || this.presets[0]?.id || null;
            this.loadPresetModalOpen = true;
        },

        closeLoadPresetModal() {
            this.loadPresetModalOpen = false;
            this.selectedLoadPresetId = null;
        },

        get selectedLoadPreset() {
            return this.presets.find((item) => item.id === this.selectedLoadPresetId) || null;
        },

        presetSummary(preset) {
            const settings = preset?.settings || {};
            const parts = [];
            if (settings.layout) {
                parts.push(String(settings.layout));
            }
            if (settings.layout === 'diagonal' && settings.diagonalStyle) {
                parts.push(String(settings.diagonalStyle));
            }
            if (Number.isFinite(Number(settings.splitPosition))) {
                parts.push(`${Math.round(Number(settings.splitPosition))}%`);
            }
            if (Number(settings.imagePadding) > 0) {
                parts.push(`pad ${Math.round(Number(settings.imagePadding))}%`);
            }
            if (Number(settings.imageRadius) > 0) {
                parts.push(`radius ${Math.round(Number(settings.imageRadius))}%`);
            }
            if (settings.backgroundType) {
                parts.push(String(settings.backgroundType));
            }
            return parts.join(' · ');
        },

        loadSelectedPreset() {
            if (this.selectedLoadPreset) {
                this.applyPreset(this.selectedLoadPreset);
            }
        },

        savePreset() {
            const name = this.presetName.trim();
            if (!name) {
                this.statusMessage = 'Enter a preset name.';
                return;
            }

            const settings = this.captureSettings();
            const existing = this.presets.find((item) => item.name.toLowerCase() === name.toLowerCase());

            if (existing) {
                existing.settings = settings;
                existing.updatedAt = Date.now();
                this.activePresetId = existing.id;
                this.statusMessage = `Preset “${existing.name}” updated.`;
            } else {
                const preset = {
                    id: crypto.randomUUID(),
                    name,
                    settings,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                this.presets.unshift(preset);
                this.activePresetId = preset.id;
                this.statusMessage = `Preset “${name}” saved.`;
            }

            this.persistPresets();
            this.closePresetModal();
        },

        applyPreset(preset) {
            if (!preset?.settings) {
                return;
            }
            this.applySettings(preset.settings);
            this.activePresetId = preset.id;
            this.statusMessage = `Preset “${preset.name}” applied.`;
            this.closeLoadPresetModal();
        },

        deletePreset(id) {
            const preset = this.presets.find((item) => item.id === id);
            if (!preset) {
                return;
            }
            if (!window.confirm(`Delete preset “${preset.name}”?`)) {
                return;
            }

            this.presets = this.presets.filter((item) => item.id !== id);
            if (this.activePresetId === id) {
                this.activePresetId = null;
            }
            if (this.selectedLoadPresetId === id) {
                this.selectedLoadPresetId = this.presets[0]?.id || null;
            }
            this.persistPresets();
            this.statusMessage = `Preset “${preset.name}” deleted.`;
        },

        async assignImage(file, slot) {
            if (!file || !file.type.startsWith('image/')) {
                this.statusMessage = 'Choose a PNG, JPG, or WebP image.';
                return;
            }

            const url = URL.createObjectURL(file);
            const image = await this.loadImage(url);
            const meta = `${image.naturalWidth} × ${image.naturalHeight}`;

            if (slot === 'a') {
                if (this.imageA?.src?.startsWith('blob:')) {
                    URL.revokeObjectURL(this.imageA.src);
                }
                this.imageA = image;
                this.nameA = file.name;
                this.metaA = meta;
            } else {
                if (this.imageB?.src?.startsWith('blob:')) {
                    URL.revokeObjectURL(this.imageB.src);
                }
                this.imageB = image;
                this.nameB = file.name;
                this.metaB = meta;
            }
        },

        async loadFiles(fileList) {
            const files = [...fileList].filter((file) => file.type.startsWith('image/')).slice(0, 2);
            if (!files.length) {
                this.statusMessage = 'Drop two PNG, JPG, or WebP images.';
                return;
            }

            if (files.length === 1) {
                this.statusMessage = 'Drop two images at once.';
                return;
            }

            await this.assignImage(files[0], 'a');
            await this.assignImage(files[1], 'b');
            this.statusMessage = '';
            this.syncBaseSize();
            this.render();
        },

        loadImage(src) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = src;
            });
        },

        onFileInput(event) {
            const files = event.target.files;
            if (files?.length) {
                this.loadFiles(files);
            }
            event.target.value = '';
        },

        onDragOver(event) {
            event.preventDefault();
            this.dropActive = true;
        },

        onDragLeave(event) {
            if (event.currentTarget.contains(event.relatedTarget)) {
                return;
            }
            this.dropActive = false;
        },

        onDrop(event) {
            event.preventDefault();
            this.dropActive = false;
            const files = event.dataTransfer?.files;
            if (files?.length) {
                this.loadFiles(files);
            }
        },

        clearImages() {
            if (this.imageA?.src?.startsWith('blob:')) {
                URL.revokeObjectURL(this.imageA.src);
            }
            if (this.imageB?.src?.startsWith('blob:')) {
                URL.revokeObjectURL(this.imageB.src);
            }
            this.imageA = null;
            this.imageB = null;
            this.nameA = '';
            this.nameB = '';
            this.metaA = '';
            this.metaB = '';
            this.sizeWarning = '';
            this.baseWidth = 1280;
            this.baseHeight = 720;
            this.render();
        },

        syncBaseSize() {
            this.sizeWarning = '';
            if (this.imageA && this.imageB) {
                if (
                    this.imageA.naturalWidth !== this.imageB.naturalWidth
                    || this.imageA.naturalHeight !== this.imageB.naturalHeight
                ) {
                    this.sizeWarning = 'Image sizes differ.';
                }
                this.baseWidth = this.imageA.naturalWidth;
                this.baseHeight = this.imageA.naturalHeight;
                return;
            }

            const image = this.imageA || this.imageB;
            if (image) {
                this.baseWidth = image.naturalWidth;
                this.baseHeight = image.naturalHeight;
            }
        },

        resolveExportSize() {
            let width = this.baseWidth;
            let height = this.baseHeight;
            const scale = Number(this.exportScale) || 1;
            width = Math.round(width * scale);
            height = Math.round(height * scale);

            return {
                width: Math.max(1, width),
                height: Math.max(1, height),
            };
        },

        buildOptions(width, height) {
            return {
                lightImage: this.imageA,
                darkImage: this.imageB,
                width,
                height,
                layoutFamily: this.layout,
                layoutVariant: this.layout === 'diagonal' ? this.diagonalStyle : 'hard',
                splitPosition: this.splitPosition / 100,
                softEdge: 0,
                swapSides: this.swapSides,
                flipDirection: false,
                invertMask: false,
                maskDensity: this.diagonalDensity,
                fitMode: 'cover',
                diagonalAngle: this.diagonalAngle,
                imagePadding: this.imagePadding,
                imageRadius: this.imageRadius,
                background: {
                    type: this.backgroundType,
                    bg: this.backgroundBg,
                    fg: this.backgroundFg,
                    density: Number(this.backgroundDensity) || 24,
                },
            };
        },

        render() {
            if (!this.compositor) {
                return;
            }

            this.compositor.render(this.buildOptions(this.baseWidth, this.baseHeight));

            const preview = this.$refs.previewCanvas;
            if (!preview) {
                return;
            }

            this.previewMetrics = this.compositor.drawPreview(preview);
            this.$nextTick(() => {
                requestAnimationFrame(() => this.updateHandle());
            });
        },

        displaySize() {
            const canvas = this.$refs.previewCanvas;
            if (!canvas) {
                return { width: 0, height: 0 };
            }
            const rect = canvas.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        },

        contentFrame(displayWidth, displayHeight, paddingPercent = this.imagePadding) {
            const pad = Math.min(displayWidth, displayHeight) * (clamp(Number(paddingPercent) || 0, 0, 40) / 100);
            return {
                pad,
                x: pad,
                y: pad,
                width: Math.max(1, displayWidth - pad * 2),
                height: Math.max(1, displayHeight - pad * 2),
            };
        },

        updateHandle() {
            const handle = this.$refs.splitHandle;
            const guide = this.compositor?.getSplitGuide(this.buildOptions(this.baseWidth, this.baseHeight));
            if (!handle || !guide || !this.showsDragHandle) {
                if (handle) {
                    handle.style.display = 'none';
                }
                return;
            }

            const { width: displayWidth, height: displayHeight } = this.displaySize();
            if (!displayWidth || !displayHeight) {
                return;
            }

            const content = this.contentFrame(displayWidth, displayHeight, guide.padding ?? this.imagePadding);

            handle.style.display = 'block';
            handle.style.border = 'none';
            handle.style.background = 'transparent';

            if (guide.axis === 'diagonal') {
                const span = Math.hypot(content.width, content.height);
                const radians = (guide.angle * Math.PI) / 180;
                const nx = -Math.sin(radians);
                const ny = Math.cos(radians);
                const offset = (guide.position - 0.5) * Math.hypot(content.width, content.height);
                const cx = content.x + content.width / 2 + nx * offset;
                const cy = content.y + content.height / 2 + ny * offset;

                handle.style.left = `${cx}px`;
                handle.style.top = `${cy}px`;
                handle.style.width = `${span}px`;
                handle.style.height = '16px';
                handle.style.transform = `translate(-50%, -50%) rotate(${guide.angle}deg)`;
                handle.style.cursor = this.previewTool === 'angle' ? 'grab' : 'move';
                handle.style.borderTop = '1px solid rgba(23,23,23,0.8)';
                return;
            }

            if (guide.axis === 'y') {
                handle.style.left = `${content.x}px`;
                handle.style.top = `${content.y + guide.position * content.height}px`;
                handle.style.width = `${content.width}px`;
                handle.style.height = '16px';
                handle.style.transform = 'translate(0, -50%)';
                handle.style.cursor = 'ns-resize';
                handle.style.borderTop = '1px solid rgba(23,23,23,0.75)';
            } else {
                handle.style.left = `${content.x + guide.position * content.width}px`;
                handle.style.top = `${content.y}px`;
                handle.style.width = '16px';
                handle.style.height = `${content.height}px`;
                handle.style.transform = 'translate(-50%, 0)';
                handle.style.cursor = 'ew-resize';
                handle.style.borderLeft = '1px solid rgba(23,23,23,0.75)';
            }
        },

        startDrag(event) {
            if (!this.showsDragHandle) {
                return;
            }
            event.preventDefault();
            this.dragging = true;
            this.dragPivot = null;

            const canvas = this.$refs.previewCanvas;
            const guide = this.compositor?.getSplitGuide(this.buildOptions(this.baseWidth, this.baseHeight));
            if (canvas && guide?.axis === 'diagonal' && this.previewTool === 'angle') {
                const rect = canvas.getBoundingClientRect();
                const content = this.contentFrame(rect.width, rect.height, guide.padding ?? this.imagePadding);
                const radians = (guide.angle * Math.PI) / 180;
                const nx = -Math.sin(radians);
                const ny = Math.cos(radians);
                const offset = (guide.position - 0.5) * Math.hypot(content.width, content.height);
                this.dragPivot = {
                    x: content.x + content.width / 2 + nx * offset,
                    y: content.y + content.height / 2 + ny * offset,
                };
            }

            this.onDrag(event);

            const move = (e) => this.onDrag(e);
            const up = () => {
                this.dragging = false;
                this.dragPivot = null;
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
            };

            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        },

        onDrag(event) {
            if (!this.dragging) {
                return;
            }

            const canvas = this.$refs.previewCanvas;
            if (!canvas) {
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const guide = this.compositor.getSplitGuide(this.buildOptions(this.baseWidth, this.baseHeight));
            if (!guide) {
                return;
            }

            const content = this.contentFrame(rect.width, rect.height, guide.padding ?? this.imagePadding);
            const cx = rect.left + content.x + content.width / 2;
            const cy = rect.top + content.y + content.height / 2;

            if (guide.axis === 'diagonal') {
                if (this.previewTool === 'angle') {
                    const angle = (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
                    this.diagonalAngle = Math.round(angle * 10) / 10;

                    // Keep the line through the grab point so rotation doesn't slide it.
                    if (this.dragPivot) {
                        const radians = (this.diagonalAngle * Math.PI) / 180;
                        const nx = -Math.sin(radians);
                        const ny = Math.cos(radians);
                        const offset =
                            (this.dragPivot.x - (content.x + content.width / 2)) * nx
                            + (this.dragPivot.y - (content.y + content.height / 2)) * ny;
                        const split = clamp(0.5 + offset / Math.hypot(content.width, content.height), 0, 1);
                        this.splitPosition = Math.round(split * 1000) / 10;
                    }
                    return;
                }

                const radians = (this.diagonalAngle * Math.PI) / 180;
                const nx = -Math.sin(radians);
                const ny = Math.cos(radians);
                const offset = (event.clientX - cx) * nx + (event.clientY - cy) * ny;
                const split = clamp(0.5 + offset / Math.hypot(content.width, content.height), 0, 1);
                this.splitPosition = Math.round(split * 1000) / 10;
                return;
            }

            if (guide.axis === 'y') {
                this.splitPosition = Math.round(
                    clamp((event.clientY - rect.top - content.y) / content.height, 0, 1) * 1000,
                ) / 10;
            } else {
                this.splitPosition = Math.round(
                    clamp((event.clientX - rect.left - content.x) / content.width, 0, 1) * 1000,
                ) / 10;
            }
        },

        async exportSelected() {
            if (!this.canExport || this.exporting) {
                return;
            }

            this.exporting = true;
            this.statusMessage = 'Exporting…';

            try {
                const { width, height } = this.resolveExportSize();
                this.compositor.render(this.buildOptions(width, height));
                const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const jobs = [];

                if (this.exportPng) {
                    jobs.push({
                        mime: 'image/png',
                        quality: undefined,
                        name: `pairframe-${width}x${height}-${stamp}.png`,
                    });
                }

                if (this.exportJpg) {
                    jobs.push({
                        mime: 'image/jpeg',
                        quality: clamp(this.jpgQuality / 100, 0.1, 1),
                        name: `pairframe-${width}x${height}-${stamp}.jpg`,
                    });
                }

                for (const job of jobs) {
                    const blob = await this.compositor.exportBlob(job.mime, job.quality);
                    if (!blob) {
                        continue;
                    }
                    this.downloadBlob(blob, job.name);
                    await wait(120);
                }

                this.statusMessage = `Exported ${jobs.length} file${jobs.length === 1 ? '' : 's'} (${width} × ${height}).`;
            } catch (error) {
                console.error(error);
                this.statusMessage = 'Export failed. Try again.';
            } finally {
                this.exporting = false;
                this.render();
            }
        },

        downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        },
    }));
});

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

window.Alpine = Alpine;
Alpine.start();
