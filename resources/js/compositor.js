import { paintBackground, paintOverlay, paintSplitMask } from './patterns.js';

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function drawImageFitted(ctx, image, dx, dy, dw, dh, fitMode = 'cover') {
    if (!image) {
        return;
    }

    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih || !dw || !dh) {
        return;
    }

    const scaleCover = Math.max(dw / iw, dh / ih);
    const scaleContain = Math.min(dw / iw, dh / ih);
    const scale = fitMode === 'contain' ? scaleContain : scaleCover;

    const rw = iw * scale;
    const rh = ih * scale;

    if (fitMode === 'cover') {
        const sx = (iw - dw / scale) / 2;
        const sy = (ih - dh / scale) / 2;
        const sw = dw / scale;
        const sh = dh / scale;
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        return;
    }

    const ox = dx + (dw - rw) / 2;
    const oy = dy + (dh - rh) / 2;
    ctx.drawImage(image, 0, 0, iw, ih, ox, oy, rw, rh);
}

function roundRectPath(ctx, x, y, w, h, r = 0) {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function ensureCanvasSize(canvas, width, height) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        return true;
    }
    return false;
}

function clearCanvas(ctx, canvas, width, height) {
    if (!ensureCanvasSize(canvas, width, height)) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

export function createCompositor() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: false });
    const sideCanvas = document.createElement('canvas');
    const sideCtx = sideCanvas.getContext('2d', { willReadFrequently: false });
    const bgCanvas = document.createElement('canvas');
    const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: false });
    const sideACanvas = document.createElement('canvas');
    const sideACtx = sideACanvas.getContext('2d', { willReadFrequently: false });
    const sideBBaseCanvas = document.createElement('canvas');
    const sideBBaseCtx = sideBBaseCanvas.getContext('2d', { willReadFrequently: false });
    const frameACanvas = document.createElement('canvas');
    const frameACtx = frameACanvas.getContext('2d', { willReadFrequently: false });
    const frameBCanvas = document.createElement('canvas');
    const frameBCtx = frameBCanvas.getContext('2d', { willReadFrequently: false });
    const overlayCanvas = document.createElement('canvas');
    const overlayCtx = overlayCanvas.getContext('2d', { willReadFrequently: false });
    const bgBCanvas = document.createElement('canvas');
    const bgBCtx = bgBCanvas.getContext('2d', { willReadFrequently: false });

    let lastOptions = null;
    let bgKey = '';
    let sideAKey = '';
    let sideBKey = '';
    let maskKey = '';
    let overlayKey = '';
    let transitionFrameKey = '';

    function resolveSides(options) {
        const light = options.lightImage;
        const dark = options.darkImage;
        if (options.swapSides) {
            return { sideA: dark, sideB: light };
        }
        return { sideA: light, sideB: dark };
    }

    function backgroundLayerKey(layer) {
        const bg = layer || {};
        return [bg.type || 'none', bg.bg || '', bg.fg || '', Number(bg.density) || 0].join(':');
    }

    function overlayLayerKey(layer) {
        const ov = layer || {};
        return [
            ov.type || 'none',
            ov.color || '',
            Number(ov.opacity) || 0,
            Number(ov.density) || 0,
            ov.edge || '',
            Number(ov.coverage) || 0,
        ].join(':');
    }

    function splitMaskOptions(options) {
        return {
            layoutFamily: options.layoutFamily || options.layout,
            layoutVariant: options.layoutVariant,
            splitPosition: options.splitPosition,
            softEdge: options.softEdge,
            flipDirection: options.flipDirection,
            invertMask: options.invertMask,
            maskDensity: options.maskDensity,
            diagonalAngle: options.diagonalAngle,
        };
    }

    function ensureLayerSideBMask(width, height, options) {
        const family = options.layoutFamily || options.layout;
        if (family === 'overlap') {
            const flip = Boolean(options.flipDirection) || Boolean(options.swapSides);
            const key = `overlap-half|${width}|${height}|${flip ? 1 : 0}`;
            if (maskKey === key && maskCanvas.width === width && maskCanvas.height === height) {
                return maskCanvas;
            }
            ensureCanvasSize(maskCanvas, width, height);
            maskCtx.clearRect(0, 0, width, height);
            maskCtx.fillStyle = '#ffffff';
            if (flip) {
                maskCtx.fillRect(0, 0, Math.ceil(width / 2), height);
            } else {
                maskCtx.fillRect(Math.floor(width / 2), 0, Math.ceil(width / 2), height);
            }
            maskKey = key;
            return maskCanvas;
        }

        ensureMask(width, height, splitMaskOptions(options));
        return maskCanvas;
    }

    function blitBackground(targetCtx, width, height, background, backgroundB, options) {
        const bg = background || { type: 'none', bg: '#FAFAFA' };
        const hasB = Boolean(backgroundB && typeof backgroundB === 'object');
        const maskPart = hasB
            ? [
                  options?.layoutFamily || options?.layout || '',
                  options?.layoutVariant || '',
                  Number(options?.splitPosition) || 0,
                  Number(options?.softEdge) || 0,
                  Boolean(options?.flipDirection) ? 1 : 0,
                  Boolean(options?.invertMask) ? 1 : 0,
                  Boolean(options?.swapSides) ? 1 : 0,
                  Number(options?.maskDensity) || 0,
                  Number(options?.diagonalAngle) || 0,
              ].join('|')
            : '';
        const key = [width, height, backgroundLayerKey(bg), hasB ? backgroundLayerKey(backgroundB) : '', maskPart].join(
            '|',
        );

        if (bgKey !== key) {
            ensureCanvasSize(bgCanvas, width, height);
            paintBackground(bgCtx, width, height, bg);

            if (hasB) {
                ensureCanvasSize(bgBCanvas, width, height);
                paintBackground(bgBCtx, width, height, backgroundB);
                const mask = ensureLayerSideBMask(width, height, options || {});
                bgBCtx.globalCompositeOperation = 'destination-in';
                bgBCtx.drawImage(mask, 0, 0);
                bgBCtx.globalCompositeOperation = 'source-over';
                bgCtx.drawImage(bgBCanvas, 0, 0);
            }

            bgKey = key;
        }

        targetCtx.drawImage(bgCanvas, 0, 0);
    }

    function blitOverlay(targetCtx, width, height, overlay, overlayB, options) {
        const layerA = overlay || { type: 'none' };
        const layerB = overlayB && typeof overlayB === 'object' ? overlayB : null;
        const typeA = layerA.type || 'none';
        const typeB = layerB ? layerB.type || 'none' : 'none';
        const hasB = Boolean(layerB);
        const activeA = typeA && typeA !== 'none';
        const activeB = hasB && typeB && typeB !== 'none';

        if (!activeA && !activeB) {
            return;
        }

        if (!hasB) {
            const key = [width, height, overlayLayerKey(layerA)].join('|');
            if (overlayKey !== key) {
                clearCanvas(overlayCtx, overlayCanvas, width, height);
                paintOverlay(overlayCtx, width, height, layerA);
                overlayKey = key;
            }
            targetCtx.drawImage(overlayCanvas, 0, 0);
            return;
        }

        const maskPart = [
            options?.layoutFamily || options?.layout || '',
            options?.layoutVariant || '',
            Number(options?.splitPosition) || 0,
            Number(options?.softEdge) || 0,
            Boolean(options?.flipDirection) ? 1 : 0,
            Boolean(options?.invertMask) ? 1 : 0,
            Boolean(options?.swapSides) ? 1 : 0,
            Number(options?.maskDensity) || 0,
            Number(options?.diagonalAngle) || 0,
        ].join('|');
        const key = [width, height, overlayLayerKey(layerA), overlayLayerKey(layerB), maskPart].join('|');

        if (overlayKey !== key) {
            clearCanvas(overlayCtx, overlayCanvas, width, height);
            const mask = ensureLayerSideBMask(width, height, options || {});

            if (activeA) {
                clearCanvas(sideCtx, sideCanvas, width, height);
                paintOverlay(sideCtx, width, height, layerA);
                sideCtx.globalCompositeOperation = 'destination-out';
                sideCtx.drawImage(mask, 0, 0);
                sideCtx.globalCompositeOperation = 'source-over';
                overlayCtx.drawImage(sideCanvas, 0, 0);
            }

            if (activeB) {
                clearCanvas(sideCtx, sideCanvas, width, height);
                paintOverlay(sideCtx, width, height, layerB);
                sideCtx.globalCompositeOperation = 'destination-in';
                sideCtx.drawImage(mask, 0, 0);
                sideCtx.globalCompositeOperation = 'source-over';
                overlayCtx.drawImage(sideCanvas, 0, 0);
            }

            overlayKey = key;
        }

        targetCtx.drawImage(overlayCanvas, 0, 0);
    }

    function imageCacheKey(image, width, height, fitMode) {
        if (!image) {
            return `empty|${width}|${height}|${fitMode}`;
        }
        return [
            image.src || '',
            image.naturalWidth || image.width || 0,
            image.naturalHeight || image.height || 0,
            width,
            height,
            fitMode,
        ].join('|');
    }

    function ensureFittedSide(cacheCanvas, cacheCtx, currentKey, image, width, height, fitMode) {
        const key = imageCacheKey(image, width, height, fitMode);
        if (currentKey === key && cacheCanvas.width === width && cacheCanvas.height === height) {
            return currentKey;
        }

        clearCanvas(cacheCtx, cacheCanvas, width, height);
        drawImageFitted(cacheCtx, image, 0, 0, width, height, fitMode);
        return key;
    }

    function ensureMask(width, height, maskOptions) {
        const key = [
            width,
            height,
            maskOptions.layoutFamily || '',
            maskOptions.layoutVariant || '',
            Number(maskOptions.splitPosition) || 0,
            Number(maskOptions.softEdge) || 0,
            Boolean(maskOptions.flipDirection) ? 1 : 0,
            Boolean(maskOptions.invertMask) ? 1 : 0,
            Number(maskOptions.maskDensity) || 0,
            Number(maskOptions.diagonalAngle) || 0,
        ].join('|');

        if (maskKey === key && maskCanvas.width === width && maskCanvas.height === height) {
            return;
        }

        ensureCanvasSize(maskCanvas, width, height);
        paintSplitMask(maskCtx, width, height, maskOptions);
        maskKey = key;
    }

    function renderOverlap(options, width, height, sideA, sideB) {
        blitBackground(ctx, width, height, options.background, options.backgroundB, options);

        const variant = options.layoutVariant || 'cards';
        const offsetXRaw = Number(options.overlapOffsetX);
        const offsetYRaw = Number(options.overlapOffsetY);
        const offsetX = ((Number.isFinite(offsetXRaw) ? offsetXRaw : 12) / 100) * width * 0.25;
        const offsetY = ((Number.isFinite(offsetYRaw) ? offsetYRaw : 10) / 100) * height * 0.25;
        const shadowBlur = Number.isFinite(Number(options.overlapShadow))
            ? Math.max(0, Number(options.overlapShadow))
            : 28;
        const flip = Boolean(options.flipDirection);
        const radiusPct = clamp(Number(options.imageRadius) || 0, 0, 50) / 100;

        const sizeCard = (image, maxW, maxH) => {
            const iw = Math.max(1, image?.naturalWidth || image?.width || maxW);
            const ih = Math.max(1, image?.naturalHeight || image?.height || maxH);
            const scale = Math.min(maxW / iw, maxH / ih);
            return {
                w: Math.max(1, Math.round(iw * scale)),
                h: Math.max(1, Math.round(ih * scale)),
            };
        };

        const drawCard = (image, x, y, w, h) => {
            const radius = Math.min(w, h) * radiusPct;
            ctx.save();
            if (shadowBlur > 0) {
                ctx.shadowColor = 'rgba(23, 23, 23, 0.28)';
                ctx.shadowBlur = shadowBlur;
                ctx.shadowOffsetY = shadowBlur * 0.25;
            }

            if (radius > 0) {
                clearCanvas(sideCtx, sideCanvas, Math.ceil(w), Math.ceil(h));
                drawImageFitted(sideCtx, image, 0, 0, w, h, 'cover');
                sideCtx.globalCompositeOperation = 'destination-in';
                sideCtx.fillStyle = '#000000';
                roundRectPath(sideCtx, 0, 0, w, h, radius);
                sideCtx.fill();
                sideCtx.globalCompositeOperation = 'source-over';
                ctx.drawImage(sideCanvas, x, y);
            } else {
                drawImageFitted(ctx, image, x, y, w, h, 'cover');
            }

            ctx.restore();
        };

        if (variant === 'side') {
            const gap = Math.max(16, width * 0.02);
            const pad = Math.min(width, height) * 0.06;
            const maxW = (width - pad * 2 - gap) / 2;
            const maxH = height - pad * 2;
            const first = flip ? sideB : sideA;
            const second = flip ? sideA : sideB;
            const a = sizeCard(first, maxW, maxH);
            const b = sizeCard(second, maxW, maxH);
            drawCard(first, pad + (maxW - a.w) / 2, pad + (maxH - a.h) / 2, a.w, a.h);
            drawCard(second, pad + maxW + gap + (maxW - b.w) / 2, pad + (maxH - b.h) / 2, b.w, b.h);
            return;
        }

        if (variant === 'stack') {
            const pad = Math.min(width, height) * 0.08;
            const maxW = width - pad * 2 - Math.abs(offsetX);
            const maxH = height - pad * 2 - Math.abs(offsetY);
            const back = flip ? sideA : sideB;
            const front = flip ? sideB : sideA;
            const sized = sizeCard(front || back, maxW, maxH);
            const x = pad + (maxW - sized.w) / 2;
            const y = pad + (maxH - sized.h) / 2;
            drawCard(back, x + offsetX, y + offsetY, sized.w, sized.h);
            drawCard(front, x, y, sized.w, sized.h);
            return;
        }

        const pad = Math.min(width, height) * 0.06;
        const maxW = width * 0.62;
        const maxH = height * 0.72;
        const first = flip ? sideB : sideA;
        const second = flip ? sideA : sideB;
        const a = sizeCard(first, maxW, maxH);
        const b = sizeCard(second, maxW, maxH);
        drawCard(first, pad, pad + offsetY * 0.15, a.w, a.h);
        drawCard(second, width - pad - b.w, height - pad - b.h, b.w, b.h);
    }

    function contentPadding(width, height, options) {
        const padPct = clamp(Number(options.imagePadding) || 0, 0, 40) / 100;
        const pad = Math.round(Math.min(width, height) * padPct);
        return {
            pad,
            x: pad,
            y: pad,
            width: Math.max(1, width - pad * 2),
            height: Math.max(1, height - pad * 2),
            percent: padPct * 100,
        };
    }

    function renderSplit(options, width, height, sideA, sideB) {
        blitBackground(ctx, width, height, options.background, options.backgroundB, options);

        const content = contentPadding(width, height, options);
        const radiusPct = clamp(Number(options.imageRadius) || 0, 0, 50) / 100;
        const radius = Math.min(content.width, content.height) * radiusPct;
        const fitMode = options.fitMode || 'cover';

        sideAKey = ensureFittedSide(
            sideACanvas,
            sideACtx,
            sideAKey,
            sideA,
            content.width,
            content.height,
            fitMode,
        );
        sideBKey = ensureFittedSide(
            sideBBaseCanvas,
            sideBBaseCtx,
            sideBKey,
            sideB,
            content.width,
            content.height,
            fitMode,
        );

        ensureMask(content.width, content.height, splitMaskOptions(options));

        ctx.save();
        if (radius > 0) {
            roundRectPath(ctx, content.x, content.y, content.width, content.height, radius);
            ctx.clip();
        }

        ctx.drawImage(sideACanvas, content.x, content.y);

        clearCanvas(sideCtx, sideCanvas, content.width, content.height);
        sideCtx.drawImage(sideBBaseCanvas, 0, 0);
        sideCtx.globalCompositeOperation = 'destination-in';
        sideCtx.drawImage(maskCanvas, 0, 0);
        sideCtx.globalCompositeOperation = 'source-over';

        ctx.drawImage(sideCanvas, content.x, content.y);
        ctx.restore();
    }

    function render(options) {
        lastOptions = options;
        const width = Math.max(1, Math.round(options.width || 1280));
        const height = Math.max(1, Math.round(options.height || 720));

        if (!ensureCanvasSize(canvas, width, height)) {
            ctx.clearRect(0, 0, width, height);
        }

        const { sideA, sideB } = resolveSides(options);

        if (!sideA && !sideB) {
            blitBackground(
                ctx,
                width,
                height,
                options.background || { type: 'none', bg: '#FAFAFA' },
                options.backgroundB,
                options,
            );
            ctx.fillStyle = '#A3A3A3';
            ctx.font = '500 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Upload two screenshots', width / 2, height / 2);
            return canvas;
        }

        const family = options.layoutFamily || options.layout;
        if (family === 'overlap') {
            renderOverlap(options, width, height, sideA || sideB, sideB || sideA);
        } else {
            renderSplit(options, width, height, sideA || sideB, sideB || sideA);
        }

        blitOverlay(ctx, width, height, options.overlay, options.overlayB, options);
        paintLabels(ctx, width, height, options);

        return canvas;
    }

    function labelPlacementXY(placement) {
        const anchors = {
            'top-left': { x: 0, y: 0 },
            'top-center': { x: 50, y: 0 },
            'top-right': { x: 100, y: 0 },
            'middle-left': { x: 0, y: 50 },
            'middle-center': { x: 50, y: 50 },
            'middle-right': { x: 100, y: 50 },
            'bottom-left': { x: 0, y: 100 },
            'bottom-center': { x: 50, y: 100 },
            'bottom-right': { x: 100, y: 100 },
        };
        if (placement?.mode === 'custom') {
            return {
                x: clamp(Number(placement.x) || 0, 0, 100),
                y: clamp(Number(placement.y) || 0, 0, 100),
            };
        }
        return anchors[placement?.preset] || anchors['bottom-left'];
    }

    function labelAlignFromXY(x, y) {
        const alignX = x <= 25 ? 'left' : x >= 75 ? 'right' : 'center';
        const alignY = y <= 25 ? 'top' : y >= 75 ? 'bottom' : 'middle';
        return { alignX, alignY };
    }

    function paintLabels(labelCtx, width, height, options) {
        const labels = options.labels;
        if (!labels?.enabled) {
            return;
        }

        // Support legacy left/right shape during transition
        const placementA = labels.a || {
            text: labels.left,
            mode: 'preset',
            preset:
                labels.leftPosition === 'top'
                    ? 'top-left'
                    : labels.leftPosition === 'middle'
                      ? 'middle-left'
                      : 'bottom-left',
        };
        const placementB = labels.b || {
            text: labels.right,
            mode: 'preset',
            preset:
                labels.rightPosition === 'top'
                    ? 'top-right'
                    : labels.rightPosition === 'middle'
                      ? 'middle-right'
                      : 'bottom-right',
        };
        const placementBadge =
            labels.badge && typeof labels.badge === 'object'
                ? labels.badge
                : {
                      text: typeof labels.badge === 'string' ? labels.badge : '',
                      mode: 'preset',
                      preset:
                          labels.badgePosition === 'bottom'
                              ? 'bottom-center'
                              : labels.badgePosition === 'middle'
                                ? 'middle-center'
                                : 'top-center',
                  };

        const textA = String(placementA.text || '').trim();
        const textB = String(placementB.text || '').trim();
        const textBadge = String(placementBadge.text || '').trim();
        if (!textA && !textB && !textBadge) {
            return;
        }

        const scale = clamp(Number(labels.size) || 100, 50, 160) / 100;
        const fontSize = Math.max(11, Math.round(Math.min(width, height) * 0.032 * scale));
        const inset = Math.max(10, Math.round(Math.min(width, height) * 0.025));
        // Anchor to the full content box so split-position changes do not drag labels around.
        const content = contentPadding(width, height, options);

        const drawPill = (text, placement) => {
            if (!text) {
                return;
            }

            const { x: px, y: py } = labelPlacementXY(placement);
            const { alignX, alignY } = labelAlignFromXY(px, py);
            const innerW = Math.max(1, content.width - inset * 2);
            const innerH = Math.max(1, content.height - inset * 2);
            const x = content.x + inset + (innerW * px) / 100;
            const y = content.y + inset + (innerH * py) / 100;

            labelCtx.save();
            labelCtx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
            labelCtx.textAlign = 'center';
            labelCtx.textBaseline = 'middle';
            const textWidth = labelCtx.measureText(text).width;
            const padX = fontSize * 0.72;
            const padY = fontSize * 0.42;
            const pillW = textWidth + padX * 2;
            const pillH = fontSize + padY * 2;

            let left = x - pillW / 2;
            if (alignX === 'left') {
                left = x;
            } else if (alignX === 'right') {
                left = x - pillW;
            }

            let topY = y - pillH / 2;
            if (alignY === 'top') {
                topY = y;
            } else if (alignY === 'bottom') {
                topY = y - pillH;
            }

            labelCtx.fillStyle = 'rgba(23, 23, 23, 0.72)';
            roundRectPath(labelCtx, left, topY, pillW, pillH, pillH / 2);
            labelCtx.fill();
            labelCtx.fillStyle = '#ffffff';
            labelCtx.fillText(text, left + pillW / 2, topY + pillH / 2 + 0.5);
            labelCtx.restore();
        };

        drawPill(textA, placementA);
        drawPill(textB, placementB);
        drawPill(textBadge, placementBadge);
    }

    function drawPreview(previewCanvas) {
        if (!previewCanvas || !canvas.width) {
            return { scale: 1, offsetX: 0, offsetY: 0, drawWidth: 0, drawHeight: 0 };
        }

        // 1:1 full resolution preview (scroll the stage; do not downscale)
        const drawWidth = canvas.width;
        const drawHeight = canvas.height;
        const pctx = previewCanvas.getContext('2d');
        if (!ensureCanvasSize(previewCanvas, drawWidth, drawHeight)) {
            pctx.clearRect(0, 0, drawWidth, drawHeight);
        }
        pctx.imageSmoothingEnabled = false;
        pctx.drawImage(canvas, 0, 0);

        return { scale: 1, offsetX: 0, offsetY: 0, drawWidth, drawHeight };
    }

    function exportBlob(mimeType = 'image/png', quality = 0.92) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), mimeType, quality);
        });
    }

    function getCanvas() {
        return canvas;
    }

    function getSplitGuide(options = lastOptions) {
        const family = options?.layoutFamily || options?.layout;
        if (!options || ['overlap', 'checker', 'stripes'].includes(family)) {
            return null;
        }

        const split = clamp(Number(options.splitPosition) ?? 0.5, 0, 1);
        const variant = options.layoutVariant || 'hard';
        const padding = clamp(Number(options.imagePadding) || 0, 0, 40);

        if (family === 'horizontal' || (family === 'fade' && variant === 'tb')) {
            return { axis: 'y', position: split, padding };
        }

        if (family === 'diagonal') {
            const angle = Number.isFinite(Number(options.diagonalAngle))
                ? Number(options.diagonalAngle)
                : 45;
            return { axis: 'diagonal', position: split, angle, padding };
        }

        return { axis: 'x', position: split, padding };
    }

    function transitionFramesCacheKey(options, width, height) {
        const light = options.lightImage;
        const dark = options.darkImage;
        return [
            width,
            height,
            options.layoutFamily || options.layout || '',
            options.layoutVariant || '',
            Boolean(options.swapSides) ? 1 : 0,
            Boolean(options.flipDirection) ? 1 : 0,
            Boolean(options.invertMask) ? 1 : 0,
            Number(options.maskDensity) || 0,
            Number(options.diagonalAngle) || 0,
            Number(options.imagePadding) || 0,
            Number(options.imageRadius) || 0,
            options.fitMode || 'cover',
            backgroundLayerKey(options.background),
            options.backgroundB ? backgroundLayerKey(options.backgroundB) : '',
            overlayLayerKey(options.overlay),
            options.overlayB ? overlayLayerKey(options.overlayB) : '',
            light?.src || '',
            light?.naturalWidth || light?.width || 0,
            light?.naturalHeight || light?.height || 0,
            dark?.src || '',
            dark?.naturalWidth || dark?.width || 0,
            dark?.naturalHeight || dark?.height || 0,
        ].join('|');
    }

    function ensureTransitionFrames(options, width, height) {
        const key = transitionFramesCacheKey(options, width, height);
        if (
            key === transitionFrameKey &&
            frameACanvas.width === width &&
            frameACanvas.height === height &&
            frameBCanvas.width === width &&
            frameBCanvas.height === height
        ) {
            return;
        }

        const unlabeled = {
            ...options,
            width,
            height,
            labels: { ...(options.labels || {}), enabled: false },
        };

        render({ ...unlabeled, splitPosition: 0 });
        ensureCanvasSize(frameACanvas, width, height);
        frameACtx.drawImage(canvas, 0, 0);

        render({ ...unlabeled, splitPosition: 1 });
        ensureCanvasSize(frameBCanvas, width, height);
        frameBCtx.drawImage(canvas, 0, 0);

        transitionFrameKey = key;
    }

    function compositeTransition(transition, progress, width, height, layoutFamily) {
        const t = clamp(progress, 0, 1);

        if (!ensureCanvasSize(canvas, width, height)) {
            ctx.clearRect(0, 0, width, height);
        }

        if (transition === 'dissolve') {
            ctx.drawImage(frameACanvas, 0, 0);
            if (t > 0) {
                ctx.save();
                ctx.globalAlpha = t;
                ctx.drawImage(frameBCanvas, 0, 0);
                ctx.restore();
            }
            return;
        }

        if (transition === 'push') {
            const horizontal = layoutFamily === 'horizontal';
            if (horizontal) {
                const offset = Math.round(t * height);
                ctx.drawImage(frameACanvas, 0, -offset);
                ctx.drawImage(frameBCanvas, 0, height - offset);
            } else {
                const offset = Math.round(t * width);
                ctx.drawImage(frameACanvas, -offset, 0);
                ctx.drawImage(frameBCanvas, width - offset, 0);
            }
            return;
        }

        if (transition === 'iris') {
            ctx.drawImage(frameACanvas, 0, 0);
            if (t <= 0) {
                return;
            }
            const radius = (t * Math.hypot(width, height)) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(frameBCanvas, 0, 0);
            ctx.restore();
            return;
        }

        // reveal: expanding rectangle from center
        ctx.drawImage(frameACanvas, 0, 0);
        if (t <= 0) {
            return;
        }
        const rw = Math.max(1, Math.round(t * width));
        const rh = Math.max(1, Math.round(t * height));
        const rx = Math.round((width - rw) / 2);
        const ry = Math.round((height - rh) / 2);
        ctx.save();
        ctx.beginPath();
        ctx.rect(rx, ry, rw, rh);
        ctx.clip();
        ctx.drawImage(frameBCanvas, 0, 0);
        ctx.restore();
    }

    /**
     * Render one video transition frame. progress 0 = side A, 1 = side B.
     * wipe reuses the layout split mask; other modes composite full A/B frames.
     */
    function renderVideoFrame(options, transition = 'wipe', progress = 0) {
        const t = clamp(Number(progress) || 0, 0, 1);
        const mode = transition || 'wipe';

        if (mode === 'wipe') {
            return render({ ...options, splitPosition: t });
        }

        const width = Math.max(1, Math.round(options.width || 1280));
        const height = Math.max(1, Math.round(options.height || 720));
        const family = options.layoutFamily || options.layout || 'vertical';

        ensureTransitionFrames(options, width, height);
        compositeTransition(mode, t, width, height, family);
        paintLabels(ctx, width, height, options);
        lastOptions = options;

        return canvas;
    }

    return {
        render,
        renderVideoFrame,
        drawPreview,
        exportBlob,
        getCanvas,
        getSplitGuide,
    };
}
