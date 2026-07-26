import { paintBackground, paintSplitMask } from './patterns.js';

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

    let lastOptions = null;
    let bgKey = '';
    let sideAKey = '';
    let sideBKey = '';
    let maskKey = '';

    function resolveSides(options) {
        const light = options.lightImage;
        const dark = options.darkImage;
        if (options.swapSides) {
            return { sideA: dark, sideB: light };
        }
        return { sideA: light, sideB: dark };
    }

    function blitBackground(targetCtx, width, height, background) {
        const bg = background || { type: 'solid', bg: '#FAFAFA' };
        const key = [
            width,
            height,
            bg.type || 'solid',
            bg.bg || '',
            bg.fg || '',
            Number(bg.density) || 0,
        ].join('|');

        if (bgKey !== key) {
            ensureCanvasSize(bgCanvas, width, height);
            paintBackground(bgCtx, width, height, bg);
            bgKey = key;
        }

        targetCtx.drawImage(bgCanvas, 0, 0);
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
        blitBackground(ctx, width, height, options.background);

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
        blitBackground(ctx, width, height, options.background);

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

        const maskOptions = {
            layoutFamily: options.layoutFamily || options.layout,
            layoutVariant: options.layoutVariant,
            splitPosition: options.splitPosition,
            softEdge: options.softEdge,
            flipDirection: options.flipDirection,
            invertMask: options.invertMask,
            maskDensity: options.maskDensity,
            diagonalAngle: options.diagonalAngle,
        };
        ensureMask(content.width, content.height, maskOptions);

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
            blitBackground(ctx, width, height, options.background || { type: 'solid', bg: '#FAFAFA' });
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

        paintLabels(ctx, width, height, options);

        return canvas;
    }

    function paintLabels(labelCtx, width, height, options) {
        const labels = options.labels;
        if (!labels?.enabled) {
            return;
        }

        const leftText = String(labels.left || '').trim();
        const rightText = String(labels.right || '').trim();
        const badgeText = String(labels.badge || '').trim();
        if (!leftText && !rightText && !badgeText) {
            return;
        }

        const family = options.layoutFamily || options.layout || 'vertical';
        const leftPosition = labels.leftPosition || 'bottom';
        const rightPosition = labels.rightPosition || 'bottom';
        const badgePosition = labels.badgePosition || 'top';
        const scale = clamp(Number(labels.size) || 100, 50, 160) / 100;
        const fontSize = Math.max(11, Math.round(Math.min(width, height) * 0.032 * scale));
        const inset = Math.max(10, Math.round(Math.min(width, height) * 0.025));
        const content = contentPadding(width, height, options);
        const horizontal = family === 'horizontal' || (family === 'fade' && (options.layoutVariant || '') === 'tb');

        const axisPoint = (start, size, position) => {
            if (position === 'top') {
                return start + inset + fontSize * 0.9;
            }
            if (position === 'bottom') {
                return start + size - inset - fontSize * 0.9;
            }
            return start + size / 2;
        };

        const drawPill = (text, x, y, align = 'center') => {
            if (!text) {
                return;
            }

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
            if (align === 'left') {
                left = x;
            } else if (align === 'right') {
                left = x - pillW;
            }
            const topY = y - pillH / 2;

            labelCtx.fillStyle = 'rgba(23, 23, 23, 0.72)';
            roundRectPath(labelCtx, left, topY, pillW, pillH, pillH / 2);
            labelCtx.fill();
            labelCtx.fillStyle = '#ffffff';
            labelCtx.fillText(text, left + pillW / 2, y + 0.5);
            labelCtx.restore();
        };

        if (horizontal) {
            const topY = content.y + inset + fontSize * 0.9;
            const bottomY = content.y + content.height - inset - fontSize * 0.9;
            const leftAlign = leftPosition === 'top' ? 'left' : leftPosition === 'bottom' ? 'right' : 'center';
            const rightAlign = rightPosition === 'top' ? 'left' : rightPosition === 'bottom' ? 'right' : 'center';
            drawPill(leftText, axisPoint(content.x, content.width, leftPosition), topY, leftAlign);
            drawPill(rightText, axisPoint(content.x, content.width, rightPosition), bottomY, rightAlign);
        } else {
            drawPill(leftText, content.x + inset, axisPoint(content.y, content.height, leftPosition), 'left');
            drawPill(rightText, content.x + content.width - inset, axisPoint(content.y, content.height, rightPosition), 'right');
        }

        if (badgeText) {
            drawPill(badgeText, content.x + content.width / 2, axisPoint(content.y, content.height, badgePosition), 'center');
        }
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

    return {
        render,
        drawPreview,
        exportBlob,
        getCanvas,
        getSplitGuide,
    };
}
