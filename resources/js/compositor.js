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

export function createCompositor() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: false });
    const sideCanvas = document.createElement('canvas');
    const sideCtx = sideCanvas.getContext('2d', { willReadFrequently: false });

    let lastOptions = null;

    function resolveSides(options) {
        const light = options.lightImage;
        const dark = options.darkImage;
        if (options.swapSides) {
            return { sideA: dark, sideB: light };
        }
        return { sideA: light, sideB: dark };
    }

    function renderOverlap(options, width, height, sideA, sideB) {
        paintBackground(ctx, width, height, options.background);

        const variant = options.layoutVariant || 'cards';
        const offsetX = ((Number(options.overlapOffsetX) || 12) / 100) * width * 0.25;
        const offsetY = ((Number(options.overlapOffsetY) || 10) / 100) * height * 0.25;
        const shadowBlur = Number(options.overlapShadow) || 28;
        const flip = Boolean(options.flipDirection);

        const drawCard = (image, x, y, w, h, withChrome = true) => {
            ctx.save();
            ctx.shadowColor = 'rgba(23, 23, 23, 0.28)';
            ctx.shadowBlur = shadowBlur;
            ctx.shadowOffsetY = shadowBlur * 0.25;
            ctx.fillStyle = '#ffffff';
            roundRectPath(ctx, x, y, w, h, 0);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            let contentY = y;
            let contentH = h;
            if (withChrome) {
                ctx.fillStyle = '#F5F5F5';
                ctx.fillRect(x, y, w, 22);
                ctx.fillStyle = '#EBEBEB';
                ctx.fillRect(x, y + 22, w, 1);
                ctx.fillStyle = '#D4D4D4';
                ctx.beginPath();
                ctx.arc(x + 12, y + 11, 4, 0, Math.PI * 2);
                ctx.arc(x + 24, y + 11, 4, 0, Math.PI * 2);
                ctx.arc(x + 36, y + 11, 4, 0, Math.PI * 2);
                ctx.fill();
                contentY = y + 23;
                contentH = h - 23;
            }

            const inset = 1;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x + inset, contentY, w - inset * 2, contentH - inset);
            ctx.clip();
            drawImageFitted(ctx, image, x + inset, contentY, w - inset * 2, contentH - inset, options.fitMode || 'cover');
            ctx.restore();

            ctx.strokeStyle = '#EBEBEB';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            ctx.restore();
        };

        if (variant === 'side') {
            const gap = Math.max(16, width * 0.02);
            const pad = Math.min(width, height) * 0.06;
            const cardW = (width - pad * 2 - gap) / 2;
            const cardH = height - pad * 2;
            const first = flip ? sideB : sideA;
            const second = flip ? sideA : sideB;
            drawCard(first, pad, pad, cardW, cardH);
            drawCard(second, pad + cardW + gap, pad, cardW, cardH);
            return;
        }

        if (variant === 'stack') {
            const pad = Math.min(width, height) * 0.1;
            const cardW = width - pad * 2;
            const cardH = height - pad * 2;
            const back = flip ? sideA : sideB;
            const front = flip ? sideB : sideA;
            drawCard(back, pad + offsetX, pad + offsetY, cardW * 0.92, cardH * 0.92, false);
            drawCard(front, pad, pad, cardW * 0.92, cardH * 0.92);
            return;
        }

        const pad = Math.min(width, height) * 0.08;
        const cardW = width * 0.58;
        const cardH = height * 0.7;
        const ax = pad;
        const ay = pad + offsetY * 0.3;
        const bx = width - pad - cardW;
        const by = height - pad - cardH;

        if (flip) {
            drawCard(sideB, ax + offsetX * 0.2, ay, cardW, cardH);
            drawCard(sideA, bx - offsetX, by - offsetY, cardW, cardH);
        } else {
            drawCard(sideA, ax, ay, cardW, cardH);
            drawCard(sideB, bx - offsetX * 0.15, by - offsetY * 0.15, cardW, cardH);
        }
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
        paintBackground(ctx, width, height, options.background);

        const content = contentPadding(width, height, options);
        const radiusPct = clamp(Number(options.imageRadius) || 0, 0, 50) / 100;
        const radius = Math.min(content.width, content.height) * radiusPct;

        ctx.save();
        if (radius > 0) {
            roundRectPath(ctx, content.x, content.y, content.width, content.height, radius);
            ctx.clip();
        }

        drawImageFitted(
            ctx,
            sideA,
            content.x,
            content.y,
            content.width,
            content.height,
            options.fitMode || 'cover',
        );

        sideCanvas.width = content.width;
        sideCanvas.height = content.height;
        sideCtx.clearRect(0, 0, content.width, content.height);
        drawImageFitted(sideCtx, sideB, 0, 0, content.width, content.height, options.fitMode || 'cover');

        maskCanvas.width = content.width;
        maskCanvas.height = content.height;
        paintSplitMask(maskCtx, content.width, content.height, {
            layoutFamily: options.layoutFamily || options.layout,
            layoutVariant: options.layoutVariant,
            splitPosition: options.splitPosition,
            softEdge: options.softEdge,
            flipDirection: options.flipDirection,
            invertMask: options.invertMask,
            maskDensity: options.maskDensity,
            diagonalAngle: options.diagonalAngle,
        });

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

        canvas.width = width;
        canvas.height = height;

        const { sideA, sideB } = resolveSides(options);

        if (!sideA && !sideB) {
            paintBackground(ctx, width, height, options.background || { type: 'solid', bg: '#FAFAFA' });
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

        return canvas;
    }

    function drawPreview(previewCanvas) {
        if (!previewCanvas || !canvas.width) {
            return { scale: 1, offsetX: 0, offsetY: 0, drawWidth: 0, drawHeight: 0 };
        }

        // 1:1 full resolution preview (scroll the stage; do not downscale)
        const drawWidth = canvas.width;
        const drawHeight = canvas.height;
        previewCanvas.width = drawWidth;
        previewCanvas.height = drawHeight;

        const pctx = previewCanvas.getContext('2d');
        pctx.clearRect(0, 0, drawWidth, drawHeight);
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
