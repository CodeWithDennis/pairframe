import Alpine from 'alpinejs';
import { createCompositor } from './compositor.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('pairframe', () => ({
        lightImage: null,
        darkImage: null,
        lightName: '',
        darkName: '',
        lightMeta: '',
        darkMeta: '',
        sizeWarning: '',

        baseWidth: 1280,
        baseHeight: 720,

        layoutFamily: 'vertical',
        layoutVariant: 'hard',
        splitPosition: 50,
        softEdge: 0,
        swapSides: false,
        flipDirection: false,
        invertMask: false,
        maskDensity: 28,
        fitMode: 'cover',

        overlapOffsetX: 14,
        overlapOffsetY: 12,
        overlapShadow: 28,

        backgroundType: 'solid',
        backgroundBg: '#FAFAFA',
        backgroundFg: '#E5E5E5',
        backgroundDensity: 24,

        exportScale: '1',
        customMaxWidth: '',
        exportPng: true,
        exportJpg: true,
        jpgQuality: 92,
        exporting: false,
        statusMessage: '',

        dragging: false,
        previewMetrics: { scale: 1, drawWidth: 0, drawHeight: 0 },

        compositor: null,

        layoutFamilies: [
            {
                id: 'vertical',
                label: 'Vertical',
                variants: [
                    { id: 'hard', label: 'Hard' },
                    { id: 'soft', label: 'Soft' },
                    { id: 'blinds', label: 'Blinds' },
                    { id: 'band', label: 'Center band' },
                ],
            },
            {
                id: 'horizontal',
                label: 'Horizontal',
                variants: [
                    { id: 'hard', label: 'Hard' },
                    { id: 'soft', label: 'Soft' },
                    { id: 'blinds', label: 'Blinds' },
                    { id: 'band', label: 'Center band' },
                ],
            },
            {
                id: 'diagonal',
                label: 'Diagonal',
                variants: [
                    { id: 'tl', label: 'Top left' },
                    { id: 'tr', label: 'Top right' },
                    { id: 'tl-soft', label: 'Soft TL' },
                    { id: 'tr-soft', label: 'Soft TR' },
                    { id: 'corner', label: 'Corner peel' },
                ],
            },
            {
                id: 'fade',
                label: 'Soft fade',
                variants: [
                    { id: 'lr', label: 'Left / right' },
                    { id: 'tb', label: 'Top / bottom' },
                ],
            },
            {
                id: 'zigzag',
                label: 'Zigzag',
                variants: [
                    { id: 'sharp', label: 'Sharp' },
                    { id: 'soft', label: 'Soft' },
                    { id: 'deep', label: 'Deep' },
                ],
            },
            {
                id: 'wave',
                label: 'Wave',
                variants: [
                    { id: 'sine', label: 'Sine' },
                    { id: 'soft', label: 'Soft' },
                    { id: 'wide', label: 'Wide' },
                ],
            },
            {
                id: 'checker',
                label: 'Checker',
                variants: [
                    { id: 'even', label: 'Even' },
                    { id: 'fine', label: 'Fine' },
                    { id: 'large', label: 'Large' },
                ],
            },
            {
                id: 'stripes',
                label: 'Stripes',
                variants: [
                    { id: 'vertical', label: 'Vertical' },
                    { id: 'horizontal', label: 'Horizontal' },
                    { id: 'diagonal', label: 'Diagonal' },
                ],
            },
            {
                id: 'overlap',
                label: 'Overlap',
                variants: [
                    { id: 'cards', label: 'Cards' },
                    { id: 'stack', label: 'Stack' },
                    { id: 'side', label: 'Side by side' },
                ],
            },
        ],

        ratioPresets: [
            { id: '30', label: '30 / 70', value: 30 },
            { id: '50', label: '50 / 50', value: 50 },
            { id: '70', label: '70 / 30', value: 70 },
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
            this.$watch(
                () => [
                    this.layoutFamily,
                    this.layoutVariant,
                    this.splitPosition,
                    this.softEdge,
                    this.swapSides,
                    this.flipDirection,
                    this.invertMask,
                    this.maskDensity,
                    this.fitMode,
                    this.overlapOffsetX,
                    this.overlapOffsetY,
                    this.overlapShadow,
                    this.backgroundType,
                    this.backgroundBg,
                    this.backgroundFg,
                    this.backgroundDensity,
                    this.baseWidth,
                    this.baseHeight,
                    this.lightImage,
                    this.darkImage,
                ],
                () => this.render(),
            );

            this.$nextTick(() => this.render());

            this._onResize = () => {
                this.updateHandle();
            };
            window.addEventListener('resize', this._onResize);
        },

        get canExport() {
            return Boolean(this.lightImage && this.darkImage) && (this.exportPng || this.exportJpg);
        },

        get exportSizeLabel() {
            const { width, height } = this.resolveExportSize();
            return `${width} × ${height}`;
        },

        get previewSizeLabel() {
            return `${this.baseWidth} × ${this.baseHeight}`;
        },

        get currentVariants() {
            const family = this.layoutFamilies.find((item) => item.id === this.layoutFamily);
            return family?.variants || [];
        },

        get showsSplitControls() {
            return !['overlap', 'checker', 'stripes'].includes(this.layoutFamily);
        },

        get showsSoftEdge() {
            return ['vertical', 'horizontal', 'diagonal', 'fade', 'zigzag', 'wave'].includes(this.layoutFamily);
        },

        get showsMaskDensity() {
            if (['zigzag', 'wave', 'checker', 'stripes'].includes(this.layoutFamily)) {
                return true;
            }
            return ['vertical', 'horizontal'].includes(this.layoutFamily)
                && ['blinds', 'band'].includes(this.layoutVariant);
        },

        get showsOverlapControls() {
            return this.layoutFamily === 'overlap';
        },

        get showsDragHandle() {
            return this.showsSplitControls && this.lightImage && this.darkImage;
        },

        segmentClass(active) {
            return active
                ? 'bg-lumis-ink text-white'
                : 'bg-lumis-segment-idle text-lumis-ink hover:bg-zinc-200';
        },

        selectFamily(familyId) {
            this.layoutFamily = familyId;
            const family = this.layoutFamilies.find((item) => item.id === familyId);
            this.layoutVariant = family?.variants?.[0]?.id || 'hard';
        },

        async loadFile(file, side) {
            if (!file || !file.type.startsWith('image/')) {
                this.statusMessage = 'Choose a PNG, JPG, or WebP image.';
                return;
            }

            const url = URL.createObjectURL(file);
            const image = await this.loadImage(url);
            const meta = `${image.naturalWidth} × ${image.naturalHeight}`;

            if (side === 'light') {
                if (this.lightImage?.src?.startsWith('blob:')) {
                    URL.revokeObjectURL(this.lightImage.src);
                }
                this.lightImage = image;
                this.lightName = file.name;
                this.lightMeta = meta;
            } else {
                if (this.darkImage?.src?.startsWith('blob:')) {
                    URL.revokeObjectURL(this.darkImage.src);
                }
                this.darkImage = image;
                this.darkName = file.name;
                this.darkMeta = meta;
            }

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

        onFileInput(event, side) {
            const file = event.target.files?.[0];
            if (file) {
                this.loadFile(file, side);
            }
            event.target.value = '';
        },

        onDrop(event, side) {
            event.preventDefault();
            const file = event.dataTransfer?.files?.[0];
            if (file) {
                this.loadFile(file, side);
            }
        },

        clearSide(side) {
            if (side === 'light') {
                if (this.lightImage?.src?.startsWith('blob:')) {
                    URL.revokeObjectURL(this.lightImage.src);
                }
                this.lightImage = null;
                this.lightName = '';
                this.lightMeta = '';
            } else {
                if (this.darkImage?.src?.startsWith('blob:')) {
                    URL.revokeObjectURL(this.darkImage.src);
                }
                this.darkImage = null;
                this.darkName = '';
                this.darkMeta = '';
            }
            this.syncBaseSize();
            this.render();
        },

        syncBaseSize() {
            this.sizeWarning = '';
            if (this.lightImage && this.darkImage) {
                if (
                    this.lightImage.naturalWidth !== this.darkImage.naturalWidth
                    || this.lightImage.naturalHeight !== this.darkImage.naturalHeight
                ) {
                    this.sizeWarning = 'Screenshots differ in size. Use cover or contain to fit.';
                }
                this.baseWidth = this.lightImage.naturalWidth;
                this.baseHeight = this.lightImage.naturalHeight;
                return;
            }

            const image = this.lightImage || this.darkImage;
            if (image) {
                this.baseWidth = image.naturalWidth;
                this.baseHeight = image.naturalHeight;
            }
        },

        setRatio(value) {
            this.splitPosition = value;
        },

        resolveExportSize() {
            let width = this.baseWidth;
            let height = this.baseHeight;
            const scale = Number(this.exportScale) || 1;
            width = Math.round(width * scale);
            height = Math.round(height * scale);

            const maxWidth = Number(this.customMaxWidth);
            if (maxWidth > 0 && width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = Math.round(height * ratio);
            }

            return {
                width: Math.max(1, width),
                height: Math.max(1, height),
            };
        },

        buildOptions(width, height) {
            return {
                lightImage: this.lightImage,
                darkImage: this.darkImage,
                width,
                height,
                layoutFamily: this.layoutFamily,
                layoutVariant: this.layoutVariant,
                splitPosition: this.splitPosition / 100,
                softEdge: Number(this.softEdge) || 0,
                swapSides: this.swapSides,
                flipDirection: this.flipDirection,
                invertMask: this.invertMask,
                maskDensity: Number(this.maskDensity) || 28,
                fitMode: this.fitMode,
                overlapOffsetX: Number(this.overlapOffsetX) || 0,
                overlapOffsetY: Number(this.overlapOffsetY) || 0,
                overlapShadow: Number(this.overlapShadow) || 0,
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

            // Render at full upload resolution, display scaled to fit the app pane
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

            handle.style.display = 'block';

            if (guide.axis === 'y') {
                const y = guide.position * displayHeight;
                handle.style.left = '0';
                handle.style.top = `${y}px`;
                handle.style.width = `${displayWidth}px`;
                handle.style.height = '16px';
                handle.style.transform = 'translate(0, -50%)';
                handle.style.cursor = 'ns-resize';
                handle.style.background = 'transparent';
                handle.style.borderTop = '1px solid rgba(23,23,23,0.75)';
                handle.style.borderBottom = 'none';
                handle.style.borderLeft = 'none';
                handle.style.borderRight = 'none';
            } else {
                const x = guide.position * displayWidth;
                handle.style.left = `${x}px`;
                handle.style.top = '0';
                handle.style.width = '16px';
                handle.style.height = `${displayHeight}px`;
                handle.style.transform = 'translate(-50%, 0)';
                handle.style.cursor = 'ew-resize';
                handle.style.background = 'transparent';
                handle.style.borderLeft = '1px solid rgba(23,23,23,0.75)';
                handle.style.borderRight = 'none';
                handle.style.borderTop = 'none';
                handle.style.borderBottom = 'none';
            }
        },

        startDrag(event) {
            if (!this.showsDragHandle) {
                return;
            }
            event.preventDefault();
            this.dragging = true;
            this.onDrag(event);

            const move = (e) => this.onDrag(e);
            const up = () => {
                this.dragging = false;
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

            if (guide.axis === 'y') {
                const y = (event.clientY - rect.top) / rect.height;
                this.splitPosition = Math.round(clamp(y, 0, 1) * 100);
            } else {
                const x = (event.clientX - rect.left) / rect.width;
                this.splitPosition = Math.round(clamp(x, 0, 1) * 100);
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
                        name: `thumbnail-${width}x${height}-${stamp}.png`,
                    });
                }

                if (this.exportJpg) {
                    jobs.push({
                        mime: 'image/jpeg',
                        quality: clamp(this.jpgQuality / 100, 0.1, 1),
                        name: `thumbnail-${width}x${height}-${stamp}.jpg`,
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
