import Alpine from 'alpinejs';
import { createCompositor } from './compositor.js';

const PRESETS_STORAGE_KEY = 'pairframe.presets';
const THEME_STORAGE_KEY = 'pairframe.theme';
const PANELS_STORAGE_KEY = 'pairframe.panels.v2';
const DEFAULT_PANELS = {
    layout: true,
    split: true,
    adjust: false,
    labels: false,
    background: true,
    overlay: false,
    export: true,
};

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
        splitStyle: 'straight',
        overlapVariant: 'cards',
        overlapOffset: 12,
        overlapShadow: true,
        splitPosition: 50,
        previewTool: 'position',
        swapSides: false,
        imagePadding: 0,
        imageRadius: 0,

        labelsEnabled: false,
        labelLeft: 'Left',
        labelRight: 'Right',
        labelBadge: '',
        labelLeftPosition: 'bottom',
        labelRightPosition: 'bottom',
        labelBadgePosition: 'top',
        labelSize: 100,

        labelPositions: [
            { id: 'top', label: 'Top', labelHorizontal: 'Left' },
            { id: 'middle', label: 'Middle', labelHorizontal: 'Center' },
            { id: 'bottom', label: 'Bottom', labelHorizontal: 'Right' },
        ],

        backgroundType: 'dots',
        backgroundBg: '#FAFAFA',
        backgroundFg: '#E5E5E5',
        backgroundDensity: 24,
        backgroundPerSide: false,
        backgroundEditSide: 'a',
        backgroundBType: 'dots',
        backgroundBBg: '#FAFAFA',
        backgroundBFg: '#E5E5E5',
        backgroundBDensity: 24,

        overlayType: 'none',
        overlayColor: '#171717',
        overlayOpacity: 25,
        overlayDensity: 24,
        overlayPerSide: false,
        overlayEditSide: 'a',
        overlayBType: 'none',
        overlayBColor: '#171717',
        overlayBOpacity: 25,
        overlayBDensity: 24,

        exportScale: '1',
        exportFormat: 'png',
        jpgQuality: 92,
        videoDuration: 2,
        videoFps: 30,
        videoReverse: false,
        videoContainer: 'auto',
        videoTransition: 'wipe',
        videoPreviewing: false,
        _videoPreviewToken: 0,
        exporting: false,
        statusMessage: '',
        theme: 'auto',

        videoFpsOptions: [
            { id: 24, label: '24' },
            { id: 30, label: '30' },
            { id: 60, label: '60' },
        ],

        videoContainerOptions: [
            { id: 'auto', label: 'Auto' },
            { id: 'mp4', label: 'MP4' },
            { id: 'webm', label: 'WebM' },
        ],

        videoTransitionOptions: [
            { id: 'wipe', label: 'Wipe' },
            { id: 'dissolve', label: 'Dissolve' },
            { id: 'push', label: 'Push' },
            { id: 'iris', label: 'Iris' },
            { id: 'reveal', label: 'Reveal' },
        ],

        panelOpen: { ...DEFAULT_PANELS },

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
        _renderRaf: 0,
        _videoExportModule: null,

        layouts: [
            { id: 'vertical', label: 'Vertical' },
            { id: 'horizontal', label: 'Horizontal' },
            { id: 'diagonal', label: 'Diagonal' },
            { id: 'overlap', label: 'Overlap' },
        ],

        splitStyles: [
            { id: 'straight', label: 'Straight' },
            { id: 'wavy', label: 'Wavy' },
            { id: 'zigzag', label: 'Zigzag' },
            { id: 'scallop', label: 'Scallop' },
            { id: 'soft', label: 'Soft' },
            { id: 'torn', label: 'Torn' },
            { id: 'pixel', label: 'Pixel' },
        ],

        overlapVariants: [
            { id: 'cards', label: 'Cards' },
            { id: 'side', label: 'Side' },
            { id: 'stack', label: 'Stack' },
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

        overlayOptions: [
            { id: 'none', label: 'None' },
            { id: 'dots', label: 'Dots' },
            { id: 'grid', label: 'Grid' },
            { id: 'stripes', label: 'Stripes' },
            { id: 'diagonal', label: 'Diagonal' },
            { id: 'chevron', label: 'Chevron' },
            { id: 'noise', label: 'Noise' },
        ],

        init() {
            this.compositor = createCompositor();
            const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            this.theme = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto' ? storedTheme : 'auto';
            this.applyTheme();
            this._themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
            this._onThemeMedia = () => {
                if (this.theme === 'auto') {
                    this.applyTheme();
                }
            };
            this._themeMedia.addEventListener('change', this._onThemeMedia);
            this.loadPanels();
            this.loadPresets();
            this.$watch(
                () => [
                    this.layout,
                    this.diagonalAngle,
                    this.splitStyle,
                    this.diagonalDensity,
                    this.overlapVariant,
                    this.overlapOffset,
                    this.overlapShadow,
                    this.splitPosition,
                    this.swapSides,
                    this.imagePadding,
                    this.imageRadius,
                    this.labelsEnabled,
                    this.labelLeft,
                    this.labelRight,
                    this.labelBadge,
                    this.labelLeftPosition,
                    this.labelRightPosition,
                    this.labelBadgePosition,
                    this.labelSize,
                    this.backgroundType,
                    this.backgroundBg,
                    this.backgroundFg,
                    this.backgroundDensity,
                    this.backgroundPerSide,
                    this.backgroundBType,
                    this.backgroundBBg,
                    this.backgroundBFg,
                    this.backgroundBDensity,
                    this.overlayType,
                    this.overlayColor,
                    this.overlayOpacity,
                    this.overlayDensity,
                    this.overlayPerSide,
                    this.overlayBType,
                    this.overlayBColor,
                    this.overlayBOpacity,
                    this.overlayBDensity,
                    this.baseWidth,
                    this.baseHeight,
                    this.imageA,
                    this.imageB,
                ],
                () => {
                    if (this.exporting || this.videoPreviewing) {
                        return;
                    }
                    this.scheduleRender();
                },
            );

            this.$nextTick(() => this.scheduleRender());
            this._onResize = () => this.updateHandle();
            window.addEventListener('resize', this._onResize);
        },

        scheduleRender() {
            if (this.exporting || this.videoPreviewing) {
                return;
            }
            if (this._renderRaf) {
                return;
            }
            this._renderRaf = requestAnimationFrame(() => {
                this._renderRaf = 0;
                if (this.exporting || this.videoPreviewing) {
                    return;
                }
                this.render();
            });
        },

        async loadVideoExport() {
            try {
                if (!this._videoExportModule) {
                    this._videoExportModule = import('./video-export.js');
                }
                return await this._videoExportModule;
            } catch (error) {
                this._videoExportModule = null;
                throw error;
            }
        },

        setTheme(theme) {
            this.theme = theme;
            localStorage.setItem(THEME_STORAGE_KEY, theme);
            this.applyTheme();
        },

        applyTheme() {
            const dark =
                this.theme === 'dark' ||
                (this.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.toggle('dark', dark);
        },

        get canExport() {
            if (!this.imageA || !this.imageB) {
                return false;
            }
            if (this.exportFormat === 'video') {
                return this.usesSplit;
            }
            return this.exportFormat === 'png' || this.exportFormat === 'jpg';
        },

        get canPreviewVideo() {
            return this.hasBothImages && this.usesSplit && this.exportFormat === 'video' && !this.exporting;
        },

        get exportSizeLabel() {
            const { width, height } =
                this.exportFormat === 'video' ? this.resolveVideoSize() : this.resolveExportSize();
            return `${width} × ${height}`;
        },

        get previewSizeLabel() {
            return `${this.baseWidth} × ${this.baseHeight}`;
        },

        get hasBothImages() {
            return Boolean(this.imageA && this.imageB);
        },

        get showsDragHandle() {
            return this.hasBothImages && !this.videoPreviewing && (this.previewHovered || this.dragging);
        },

        setPreviewHovered(hovered) {
            this.previewHovered = hovered;
            this.$nextTick(() => this.updateHandle());
        },

        get showsEdgeDensity() {
            return (
                this.usesSplit &&
                this.splitStyle !== 'straight' &&
                this.splitStyle !== 'soft'
            );
        },

        get usesSplit() {
            return this.layout !== 'overlap';
        },

        setSplitStyle(id) {
            this.splitStyle = id;
            this.diagonalStyle = id;
        },

        loadPanels() {
            try {
                const raw = localStorage.getItem(PANELS_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : null;
                if (!parsed || typeof parsed !== 'object') {
                    return;
                }
                for (const key of Object.keys(DEFAULT_PANELS)) {
                    if (typeof parsed[key] === 'boolean') {
                        this.panelOpen[key] = parsed[key];
                    }
                }
            } catch {
                // keep defaults
            }
        },

        togglePanel(id) {
            if (!Object.hasOwn(this.panelOpen, id)) {
                return;
            }
            this.panelOpen[id] = !this.panelOpen[id];
            localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(this.panelOpen));
        },

        get showsOverlapOffset() {
            return this.layout === 'overlap' && this.overlapVariant !== 'side';
        },

        segmentClass(active) {
            return active
                ? 'bg-lumis-ink text-lumis-canvas'
                : 'bg-lumis-segment-idle text-lumis-ink hover:bg-zinc-200 dark:hover:bg-zinc-800';
        },

        clampSlider(key, min, max) {
            const value = Number(this[key]);
            this[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
        },

        selectLayout(id) {
            this.stopVideoPreview();
            this.layout = id;
            this.previewTool = id === 'diagonal' ? 'angle' : 'position';
        },

        stopVideoPreview() {
            this._videoPreviewToken += 1;
            if (this.videoPreviewing) {
                this.videoPreviewing = false;
                this.render();
            }
        },

        async playVideoPreview() {
            if (!this.canPreviewVideo || this.videoPreviewing) {
                return;
            }

            this.videoPreviewing = true;
            const token = ++this._videoPreviewToken;
            const fps = this.videoFps;
            const frameCount = Math.max(2, Math.round(fps * this.videoDuration));
            const frameDelay = 1000 / fps;
            const preview = this.$refs.previewCanvas;

            try {
                for (let i = 0; i <= frameCount; i++) {
                    if (token !== this._videoPreviewToken || !this.canPreviewVideo) {
                        return;
                    }

                    const t = i / frameCount;
                    const progress = this.videoReverse ? 1 - t : t;
                    const options = this.buildOptions(this.baseWidth, this.baseHeight);
                    this.compositor.renderVideoFrame(options, this.videoTransition, clamp(progress, 0, 1));

                    if (preview) {
                        this.previewMetrics = this.compositor.drawPreview(preview);
                    }

                    this.statusMessage = `Preview… ${Math.round((i / frameCount) * 100)}%`;
                    await wait(frameDelay);
                }

                if (token === this._videoPreviewToken) {
                    this.statusMessage = 'Preview finished.';
                }
            } finally {
                if (token === this._videoPreviewToken) {
                    this.videoPreviewing = false;
                    this.render();
                }
            }
        },

        toggleVideoPreview() {
            if (this.videoPreviewing) {
                this.stopVideoPreview();
                return;
            }
            this.playVideoPreview();
        },

        setPreviewTool(tool) {
            this.previewTool = tool;
            this.$nextTick(() => this.updateHandle());
        },

        captureSettings() {
            return {
                layout: this.layout,
                diagonalAngle: this.diagonalAngle,
                diagonalStyle: this.splitStyle,
                diagonalDensity: this.diagonalDensity,
                splitStyle: this.splitStyle,
                overlapVariant: this.overlapVariant,
                overlapOffset: this.overlapOffset,
                overlapShadow: this.overlapShadow,
                splitPosition: this.splitPosition,
                swapSides: this.swapSides,
                imagePadding: this.imagePadding,
                imageRadius: this.imageRadius,
                labelsEnabled: this.labelsEnabled,
                labelLeft: this.labelLeft,
                labelRight: this.labelRight,
                labelBadge: this.labelBadge,
                labelLeftPosition: this.labelLeftPosition,
                labelRightPosition: this.labelRightPosition,
                labelBadgePosition: this.labelBadgePosition,
                labelSize: this.labelSize,
                backgroundType: this.backgroundType,
                backgroundBg: this.backgroundBg,
                backgroundFg: this.backgroundFg,
                backgroundDensity: this.backgroundDensity,
                backgroundPerSide: this.backgroundPerSide,
                backgroundBType: this.backgroundBType,
                backgroundBBg: this.backgroundBBg,
                backgroundBFg: this.backgroundBFg,
                backgroundBDensity: this.backgroundBDensity,
                overlayType: this.overlayType,
                overlayColor: this.overlayColor,
                overlayOpacity: this.overlayOpacity,
                overlayDensity: this.overlayDensity,
                overlayPerSide: this.overlayPerSide,
                overlayBType: this.overlayBType,
                overlayBColor: this.overlayBColor,
                overlayBOpacity: this.overlayBOpacity,
                overlayBDensity: this.overlayBDensity,
                exportScale: this.exportScale,
                exportFormat: this.exportFormat,
                jpgQuality: this.jpgQuality,
                videoDuration: this.videoDuration,
                videoFps: this.videoFps,
                videoReverse: this.videoReverse,
                videoContainer: this.videoContainer,
                videoTransition: this.videoTransition,
            };
        },

        applySettings(settings = {}) {
            if (!settings || typeof settings !== 'object') {
                return;
            }

            const layouts = new Set(this.layouts.map((item) => item.id));
            const styles = new Set(this.splitStyles.map((item) => item.id));
            const overlaps = new Set(this.overlapVariants.map((item) => item.id));
            const backgrounds = new Set(this.backgroundOptions.map((item) => item.id));
            const overlays = new Set(this.overlayOptions.map((item) => item.id));

            if (layouts.has(settings.layout)) {
                this.layout = settings.layout;
            }
            if (Number.isFinite(Number(settings.diagonalAngle))) {
                this.diagonalAngle = Number(settings.diagonalAngle);
            }
            if (Number.isFinite(Number(settings.diagonalDensity))) {
                this.diagonalDensity = Math.min(100, Math.max(0.1, Number(settings.diagonalDensity)));
            }
            const savedStyle =
                settings.splitStyle === 'fade'
                    ? 'soft'
                    : settings.splitStyle || settings.diagonalStyle;
            if (styles.has(savedStyle)) {
                this.setSplitStyle(savedStyle);
            }
            if (overlaps.has(settings.overlapVariant)) {
                this.overlapVariant = settings.overlapVariant;
            }
            if (Number.isFinite(Number(settings.overlapOffset))) {
                this.overlapOffset = Math.min(40, Math.max(0, Number(settings.overlapOffset)));
            }
            if (typeof settings.overlapShadow === 'boolean') {
                this.overlapShadow = settings.overlapShadow;
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
            if (typeof settings.labelsEnabled === 'boolean') {
                this.labelsEnabled = settings.labelsEnabled;
            }
            if (typeof settings.labelLeft === 'string') {
                this.labelLeft = settings.labelLeft;
            }
            if (typeof settings.labelRight === 'string') {
                this.labelRight = settings.labelRight;
            }
            if (typeof settings.labelBadge === 'string') {
                this.labelBadge = settings.labelBadge;
            }
            const positions = new Set(this.labelPositions.map((item) => item.id));
            if (positions.has(settings.labelLeftPosition)) {
                this.labelLeftPosition = settings.labelLeftPosition;
            }
            if (positions.has(settings.labelRightPosition)) {
                this.labelRightPosition = settings.labelRightPosition;
            }
            if (positions.has(settings.labelBadgePosition)) {
                this.labelBadgePosition = settings.labelBadgePosition;
            }
            if (Number.isFinite(Number(settings.labelSize))) {
                this.labelSize = Math.min(160, Math.max(50, Number(settings.labelSize)));
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
            this.backgroundPerSide = Boolean(settings.backgroundPerSide);
            if (backgrounds.has(settings.backgroundBType)) {
                this.backgroundBType = settings.backgroundBType;
            } else if (this.backgroundPerSide) {
                this.backgroundBType = this.backgroundType;
                this.backgroundBBg = this.backgroundBg;
                this.backgroundBFg = this.backgroundFg;
                this.backgroundBDensity = this.backgroundDensity;
            }
            if (typeof settings.backgroundBBg === 'string') {
                this.backgroundBBg = settings.backgroundBBg;
            }
            if (typeof settings.backgroundBFg === 'string') {
                this.backgroundBFg = settings.backgroundBFg;
            }
            if (Number.isFinite(Number(settings.backgroundBDensity))) {
                this.backgroundBDensity = Math.min(80, Math.max(8, Number(settings.backgroundBDensity)));
            }
            if (!this.backgroundPerSide) {
                this.backgroundEditSide = 'a';
            }
            if (settings.overlayType === 'solid') {
                this.overlayType = 'none';
            } else if (overlays.has(settings.overlayType)) {
                this.overlayType = settings.overlayType;
            }
            if (typeof settings.overlayColor === 'string') {
                this.overlayColor = settings.overlayColor;
            }
            if (Number.isFinite(Number(settings.overlayOpacity))) {
                this.overlayOpacity = Math.min(80, Math.max(5, Number(settings.overlayOpacity)));
            }
            if (Number.isFinite(Number(settings.overlayDensity))) {
                this.overlayDensity = Math.min(80, Math.max(8, Number(settings.overlayDensity)));
            }
            this.overlayPerSide = Boolean(settings.overlayPerSide);
            if (settings.overlayBType === 'solid') {
                this.overlayBType = 'none';
            } else if (overlays.has(settings.overlayBType)) {
                this.overlayBType = settings.overlayBType;
            } else if (this.overlayPerSide) {
                this.overlayBType = this.overlayType;
                this.overlayBColor = this.overlayColor;
                this.overlayBOpacity = this.overlayOpacity;
                this.overlayBDensity = this.overlayDensity;
            }
            if (typeof settings.overlayBColor === 'string') {
                this.overlayBColor = settings.overlayBColor;
            }
            if (Number.isFinite(Number(settings.overlayBOpacity))) {
                this.overlayBOpacity = Math.min(80, Math.max(5, Number(settings.overlayBOpacity)));
            }
            if (Number.isFinite(Number(settings.overlayBDensity))) {
                this.overlayBDensity = Math.min(80, Math.max(8, Number(settings.overlayBDensity)));
            }
            if (!this.overlayPerSide) {
                this.overlayEditSide = 'a';
            }
            if (['1', '1.5', '2'].includes(String(settings.exportScale))) {
                this.exportScale = String(settings.exportScale);
            }
            if (['png', 'jpg', 'video'].includes(settings.exportFormat)) {
                this.exportFormat = settings.exportFormat;
            } else if (settings.exportJpg && settings.exportPng !== true) {
                this.exportFormat = 'jpg';
            }
            if (Number.isFinite(Number(settings.jpgQuality))) {
                this.jpgQuality = Math.min(100, Math.max(50, Number(settings.jpgQuality)));
            }
            if (Number.isFinite(Number(settings.videoDuration))) {
                this.videoDuration = Math.min(6, Math.max(1, Number(settings.videoDuration)));
            }
            if ([24, 30, 60].includes(Number(settings.videoFps))) {
                this.videoFps = Number(settings.videoFps);
            }
            if (typeof settings.videoReverse === 'boolean') {
                this.videoReverse = settings.videoReverse;
            }
            if (['auto', 'mp4', 'webm'].includes(settings.videoContainer)) {
                this.videoContainer = settings.videoContainer;
            }
            const transitions = new Set(this.videoTransitionOptions.map((item) => item.id));
            if (transitions.has(settings.videoTransition)) {
                this.videoTransition = settings.videoTransition;
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
            const edgeStyle = settings.splitStyle || settings.diagonalStyle;
            if (settings.layout !== 'overlap' && edgeStyle && edgeStyle !== 'straight') {
                parts.push(String(edgeStyle));
            }
            if (settings.layout === 'overlap' && settings.overlapVariant) {
                parts.push(String(settings.overlapVariant));
            }
            if (settings.layout !== 'overlap' && Number.isFinite(Number(settings.splitPosition))) {
                parts.push(`${Math.round(Number(settings.splitPosition))}%`);
            }
            if (Number(settings.imagePadding) > 0) {
                parts.push(`pad ${Math.round(Number(settings.imagePadding))}%`);
            }
            if (Number(settings.imageRadius) > 0) {
                parts.push(`radius ${Math.round(Number(settings.imageRadius))}%`);
            }
            if (settings.labelsEnabled) {
                parts.push('labels');
            }
            if (settings.backgroundType) {
                parts.push(
                    settings.backgroundPerSide && settings.backgroundBType
                        ? `${settings.backgroundType}/${settings.backgroundBType}`
                        : String(settings.backgroundType),
                );
            }
            if (settings.overlayPerSide) {
                const a = settings.overlayType && settings.overlayType !== 'none' ? settings.overlayType : 'none';
                const b = settings.overlayBType && settings.overlayBType !== 'none' ? settings.overlayBType : 'none';
                if (a !== 'none' || b !== 'none') {
                    parts.push(`overlay ${a}/${b}`);
                }
            } else if (settings.overlayType && settings.overlayType !== 'none') {
                parts.push(`overlay ${settings.overlayType}`);
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

        resolveVideoSize() {
            const image = this.imageA || this.imageB;
            let width = image?.naturalWidth || this.baseWidth;
            let height = image?.naturalHeight || this.baseHeight;
            // Encoders are happier with even dimensions.
            width = Math.max(2, width - (width % 2));
            height = Math.max(2, height - (height % 2));
            return { width, height };
        },

        isVideoMimeSupported(type) {
            return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type);
        },

        firstSupportedMime(types) {
            return types.find((type) => this.isVideoMimeSupported(type)) || '';
        },

        get supportsMp4Video() {
            return Boolean(this.firstSupportedMime(['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']));
        },

        get supportsWebmVideo() {
            return Boolean(this.firstSupportedMime(['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']));
        },

        selectExportFormat(format) {
            this.exportFormat = format;
            if (format === 'video') {
                this.loadVideoExport();
            }
        },

        async recordTransitionVideo(width, height) {
            const { recordTransitionVideo } = await this.loadVideoExport();
            return recordTransitionVideo({
                width,
                height,
                videoContainer: this.videoContainer,
                videoFps: this.videoFps,
                videoDuration: this.videoDuration,
                videoReverse: this.videoReverse,
                videoTransition: this.videoTransition,
                compositor: this.compositor,
                buildOptions: (w, h) => this.buildOptions(w, h),
                onProgress: (message) => {
                    this.statusMessage = message;
                },
            });
        },

        buildOptions(width, height) {
            return {
                lightImage: this.imageA,
                darkImage: this.imageB,
                width,
                height,
                layoutFamily: this.layout,
                layoutVariant:
                    this.layout === 'overlap'
                        ? this.overlapVariant
                        : this.splitStyle === 'straight'
                          ? 'hard'
                          : this.splitStyle,
                splitPosition: this.splitPosition / 100,
                softEdge: 0,
                swapSides: this.swapSides,
                flipDirection: false,
                invertMask: false,
                maskDensity: this.diagonalDensity,
                fitMode: 'cover',
                diagonalAngle: this.diagonalAngle,
                overlapOffsetX: this.overlapOffset,
                overlapOffsetY: this.overlapOffset,
                overlapShadow: this.overlapShadow ? 28 : 0,
                imagePadding: this.imagePadding,
                imageRadius: this.imageRadius,
                labels: {
                    enabled: this.labelsEnabled,
                    left: this.labelLeft,
                    right: this.labelRight,
                    badge: this.labelBadge,
                    leftPosition: this.labelLeftPosition,
                    rightPosition: this.labelRightPosition,
                    badgePosition: this.labelBadgePosition,
                    size: this.labelSize,
                },
                background: {
                    type: this.backgroundType,
                    bg: this.backgroundBg,
                    fg: this.backgroundFg,
                    density: Number(this.backgroundDensity) || 24,
                },
                backgroundB: this.backgroundPerSide
                    ? {
                          type: this.backgroundBType,
                          bg: this.backgroundBBg,
                          fg: this.backgroundBFg,
                          density: Number(this.backgroundBDensity) || 24,
                      }
                    : null,
                overlay: {
                    type: this.overlayType,
                    color: this.overlayColor,
                    opacity: Number(this.overlayOpacity) || 25,
                    density: Number(this.overlayDensity) || 24,
                },
                overlayB: this.overlayPerSide
                    ? {
                          type: this.overlayBType,
                          color: this.overlayBColor,
                          opacity: Number(this.overlayBOpacity) || 25,
                          density: Number(this.overlayBDensity) || 24,
                      }
                    : null,
            };
        },

        get backgroundSummary() {
            if (this.backgroundPerSide) {
                return `${this.backgroundType} / ${this.backgroundBType}`;
            }
            return this.backgroundType;
        },

        get overlaySummary() {
            if (this.overlayPerSide) {
                return `${this.overlayType} / ${this.overlayBType}`;
            }
            return this.overlayType;
        },

        get editingBackgroundB() {
            return this.backgroundPerSide && this.backgroundEditSide === 'b';
        },

        get editingOverlayB() {
            return this.overlayPerSide && this.overlayEditSide === 'b';
        },

        get activeBackgroundType() {
            return this.editingBackgroundB ? this.backgroundBType : this.backgroundType;
        },

        set activeBackgroundType(value) {
            if (this.editingBackgroundB) {
                this.backgroundBType = value;
            } else {
                this.backgroundType = value;
            }
        },

        get activeBackgroundBg() {
            return this.editingBackgroundB ? this.backgroundBBg : this.backgroundBg;
        },

        set activeBackgroundBg(value) {
            if (this.editingBackgroundB) {
                this.backgroundBBg = value;
            } else {
                this.backgroundBg = value;
            }
        },

        get activeBackgroundFg() {
            return this.editingBackgroundB ? this.backgroundBFg : this.backgroundFg;
        },

        set activeBackgroundFg(value) {
            if (this.editingBackgroundB) {
                this.backgroundBFg = value;
            } else {
                this.backgroundFg = value;
            }
        },

        get activeBackgroundDensity() {
            return this.editingBackgroundB ? this.backgroundBDensity : this.backgroundDensity;
        },

        set activeBackgroundDensity(value) {
            if (this.editingBackgroundB) {
                this.backgroundBDensity = value;
            } else {
                this.backgroundDensity = value;
            }
        },

        get activeOverlayType() {
            return this.editingOverlayB ? this.overlayBType : this.overlayType;
        },

        set activeOverlayType(value) {
            if (this.editingOverlayB) {
                this.overlayBType = value;
            } else {
                this.overlayType = value;
            }
        },

        get activeOverlayColor() {
            return this.editingOverlayB ? this.overlayBColor : this.overlayColor;
        },

        set activeOverlayColor(value) {
            if (this.editingOverlayB) {
                this.overlayBColor = value;
            } else {
                this.overlayColor = value;
            }
        },

        get activeOverlayOpacity() {
            return this.editingOverlayB ? this.overlayBOpacity : this.overlayOpacity;
        },

        set activeOverlayOpacity(value) {
            if (this.editingOverlayB) {
                this.overlayBOpacity = value;
            } else {
                this.overlayOpacity = value;
            }
        },

        get activeOverlayDensity() {
            return this.editingOverlayB ? this.overlayBDensity : this.overlayDensity;
        },

        set activeOverlayDensity(value) {
            if (this.editingOverlayB) {
                this.overlayBDensity = value;
            } else {
                this.overlayDensity = value;
            }
        },

        setBackgroundPerSide(enabled) {
            const on = Boolean(enabled);
            if (on && !this.backgroundPerSide) {
                this.backgroundBType = this.backgroundType;
                this.backgroundBBg = this.backgroundBg;
                this.backgroundBFg = this.backgroundFg;
                this.backgroundBDensity = this.backgroundDensity;
            }
            this.backgroundPerSide = on;
            if (!on) {
                this.backgroundEditSide = 'a';
            }
        },

        setOverlayPerSide(enabled) {
            const on = Boolean(enabled);
            if (on && !this.overlayPerSide) {
                this.overlayBType = this.overlayType;
                this.overlayBColor = this.overlayColor;
                this.overlayBOpacity = this.overlayOpacity;
                this.overlayBDensity = this.overlayDensity;
            }
            this.overlayPerSide = on;
            if (!on) {
                this.overlayEditSide = 'a';
            }
        },

        clampActiveBackgroundDensity() {
            this.clampSlider(this.editingBackgroundB ? 'backgroundBDensity' : 'backgroundDensity', 8, 80);
        },

        clampActiveOverlayOpacity() {
            this.clampSlider(this.editingOverlayB ? 'overlayBOpacity' : 'overlayOpacity', 5, 80);
        },

        clampActiveOverlayDensity() {
            this.clampSlider(this.editingOverlayB ? 'overlayBDensity' : 'overlayDensity', 8, 80);
        },

        render() {
            if (!this.compositor) {
                return;
            }

            if (this._renderRaf) {
                cancelAnimationFrame(this._renderRaf);
                this._renderRaf = 0;
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

            this.stopVideoPreview();
            this.exporting = true;
            this.statusMessage = 'Exporting…';

            try {
                const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

                if (this.exportFormat === 'video') {
                    if (!this.usesSplit) {
                        this.statusMessage = 'Video export needs a split layout (not Overlap).';
                        return;
                    }

                    const { width, height } = this.resolveVideoSize();
                    this.statusMessage = 'Recording video…';
                    const { blob, extension, label } = await this.recordTransitionVideo(width, height);
                    this.downloadBlob(blob, `pairframe-${width}x${height}-${stamp}.${extension}`);
                    this.statusMessage = `Exported ${label} (${width} × ${height}).`;
                    return;
                }

                const { width, height } = this.resolveExportSize();
                this.compositor.render(this.buildOptions(width, height));
                const isJpg = this.exportFormat === 'jpg';
                const blob = await this.compositor.exportBlob(
                    isJpg ? 'image/jpeg' : 'image/png',
                    isJpg ? clamp(this.jpgQuality / 100, 0.1, 1) : undefined,
                );

                if (!blob) {
                    this.statusMessage = 'Nothing exported.';
                    return;
                }

                this.downloadBlob(blob, `pairframe-${width}x${height}-${stamp}.${isJpg ? 'jpg' : 'png'}`);
                this.statusMessage = `Exported ${isJpg ? 'JPG' : 'PNG'} (${width} × ${height}).`;
            } catch (error) {
                console.error(error);
                this.statusMessage = error?.message || 'Export failed. Try again.';
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
