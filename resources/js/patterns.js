/**
 * Background pattern painters and alpha split masks for the export canvas.
 */

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
    const normalized = String(hex || '').replace('#', '');
    if (normalized.length !== 3 && normalized.length !== 6) {
        return null;
    }
    const full = normalized.length === 3
        ? normalized.split('').map((c) => c + c).join('')
        : normalized;
    const value = Number.parseInt(full, 16);
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
}

export function paintBackground(ctx, width, height, options = {}) {
    const type = options.type || 'solid';
    const bg = options.bg || '#FAFAFA';
    const fg = options.fg || '#E5E5E5';
    const density = clamp(Number(options.density) || 24, 4, 120);

    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (type === 'solid') {
        ctx.restore();
        return;
    }

    ctx.fillStyle = fg;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;

    if (type === 'dots') {
        const step = density;
        const radius = Math.max(1, density * 0.12);
        for (let y = step / 2; y < height; y += step) {
            for (let x = step / 2; x < width; x += step) {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    } else if (type === 'grid') {
        const step = density;
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
        }
        for (let y = 0; y <= height; y += step) {
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
        }
        ctx.stroke();
    } else if (type === 'stripes') {
        const step = density;
        for (let x = -height; x < width; x += step) {
            ctx.fillRect(x, 0, Math.max(2, step * 0.45), height);
        }
    } else if (type === 'diagonal') {
        const step = density;
        ctx.lineWidth = Math.max(1, step * 0.2);
        ctx.beginPath();
        for (let i = -height; i < width + height; i += step) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i + height, height);
        }
        ctx.stroke();
    } else if (type === 'chevron') {
        const step = density;
        const amp = step * 0.45;
        ctx.lineWidth = Math.max(1.5, step * 0.12);
        ctx.beginPath();
        for (let y = 0; y < height + step; y += step) {
            let up = true;
            ctx.moveTo(0, y);
            for (let x = 0; x <= width; x += step) {
                ctx.lineTo(x, y + (up ? -amp : amp));
                up = !up;
            }
        }
        ctx.stroke();
    } else if (type === 'noise') {
        const image = ctx.createImageData(width, height);
        const data = image.data;
        const bgRgb = hexToRgb(bg) || { r: 250, g: 250, b: 250 };
        const fgRgb = hexToRgb(fg) || { r: 229, g: 229, b: 229 };
        const strength = clamp(density / 100, 0.08, 0.9);
        for (let i = 0; i < data.length; i += 4) {
            const t = Math.random() * strength;
            data[i] = Math.round(bgRgb.r * (1 - t) + fgRgb.r * t);
            data[i + 1] = Math.round(bgRgb.g * (1 - t) + fgRgb.g * t);
            data[i + 2] = Math.round(bgRgb.b * (1 - t) + fgRgb.b * t);
            data[i + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
    }

    ctx.restore();
}

function blurMask(maskCtx, width, height, softEdge) {
    if (softEdge <= 0) {
        return;
    }
    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    const tctx = temp.getContext('2d');
    tctx.drawImage(maskCtx.canvas, 0, 0);
    maskCtx.clearRect(0, 0, width, height);
    maskCtx.filter = `blur(${Math.min(softEdge / 2, 48)}px)`;
    maskCtx.drawImage(temp, 0, 0);
    maskCtx.filter = 'none';
}

/**
 * Build an alpha mask into maskCtx.
 * Opaque white = show side B. Transparent = keep side A.
 */
export function paintSplitMask(maskCtx, width, height, options = {}) {
    const family = options.layoutFamily || options.layout || 'vertical';
    const variant = options.layoutVariant || 'hard';
    const split = clamp(Number(options.splitPosition) ?? 0.5, 0, 1);
    const softEdge = Math.max(0, Number(options.softEdge) || 0);
    const flip = Boolean(options.flipDirection);
    const invert = Boolean(options.invertMask);
    const density = clamp(Number(options.maskDensity) || 28, 4, 160);

    maskCtx.clearRect(0, 0, width, height);
    maskCtx.save();
    maskCtx.fillStyle = 'rgba(255,255,255,1)';

    const softVertical = (x, edge, flipped) => {
        const half = edge / 2;
        if (flipped) {
            maskCtx.fillRect(0, 0, Math.max(0, x - half), height);
            const gradient = maskCtx.createLinearGradient(x - half, 0, x + half, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            maskCtx.fillStyle = gradient;
            maskCtx.fillRect(x - half, 0, edge, height);
            maskCtx.fillStyle = 'rgba(255,255,255,1)';
        } else {
            maskCtx.fillRect(x + half, 0, Math.max(0, width - x - half), height);
            const gradient = maskCtx.createLinearGradient(x - half, 0, x + half, 0);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(1, 'rgba(255,255,255,1)');
            maskCtx.fillStyle = gradient;
            maskCtx.fillRect(x - half, 0, edge, height);
            maskCtx.fillStyle = 'rgba(255,255,255,1)';
        }
    };

    const softHorizontal = (y, edge, flipped) => {
        const half = edge / 2;
        if (flipped) {
            maskCtx.fillRect(0, 0, width, Math.max(0, y - half));
            const gradient = maskCtx.createLinearGradient(0, y - half, 0, y + half);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            maskCtx.fillStyle = gradient;
            maskCtx.fillRect(0, y - half, width, edge);
            maskCtx.fillStyle = 'rgba(255,255,255,1)';
        } else {
            maskCtx.fillRect(0, y + half, width, Math.max(0, height - y - half));
            const gradient = maskCtx.createLinearGradient(0, y - half, 0, y + half);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(1, 'rgba(255,255,255,1)');
            maskCtx.fillStyle = gradient;
            maskCtx.fillRect(0, y - half, width, edge);
            maskCtx.fillStyle = 'rgba(255,255,255,1)';
        }
    };

    const paintDiagonal = (dir, soft) => {
        const px = split * width;
        maskCtx.beginPath();
        if (dir === 'tl') {
            if (flip) {
                maskCtx.moveTo(0, 0);
                maskCtx.lineTo(px + height, 0);
                maskCtx.lineTo(px - height, height);
                maskCtx.lineTo(0, height);
            } else {
                maskCtx.moveTo(width, 0);
                maskCtx.lineTo(width, height);
                maskCtx.lineTo(0, height);
                maskCtx.lineTo(px - height, height);
                maskCtx.lineTo(px + height, 0);
            }
        } else if (flip) {
            maskCtx.moveTo(width, 0);
            maskCtx.lineTo(width, height);
            maskCtx.lineTo(px - height, height);
            maskCtx.lineTo(px + height, 0);
        } else {
            maskCtx.moveTo(0, 0);
            maskCtx.lineTo(px + height, 0);
            maskCtx.lineTo(px - height, height);
            maskCtx.lineTo(0, height);
        }
        maskCtx.closePath();
        maskCtx.fill();
        if (soft) {
            blurMask(maskCtx, width, height, Math.max(softEdge, 36));
        } else if (softEdge > 0) {
            blurMask(maskCtx, width, height, softEdge);
        }
    };

    if (family === 'vertical') {
        const x = split * width;
        if (variant === 'soft') {
            softVertical(x, Math.max(softEdge, 48), flip);
        } else if (variant === 'blinds') {
            const strip = Math.max(8, density * 0.7);
            const start = flip ? 0 : x;
            const end = flip ? x : width;
            for (let sx = start; sx < end; sx += strip * 2) {
                maskCtx.fillRect(sx, 0, strip, height);
            }
            if (softEdge > 0) {
                blurMask(maskCtx, width, height, softEdge);
            }
        } else if (variant === 'band') {
            const band = Math.max(width * 0.12, density * 4);
            const left = x - band / 2;
            maskCtx.fillRect(left, 0, band, height);
            blurMask(maskCtx, width, height, Math.max(softEdge, 24));
        } else if (softEdge > 0) {
            softVertical(x, softEdge, flip);
        } else if (flip) {
            maskCtx.fillRect(0, 0, x, height);
        } else {
            maskCtx.fillRect(x, 0, width - x, height);
        }
    } else if (family === 'horizontal') {
        const y = split * height;
        if (variant === 'soft') {
            softHorizontal(y, Math.max(softEdge, 48), flip);
        } else if (variant === 'blinds') {
            const strip = Math.max(8, density * 0.7);
            const start = flip ? 0 : y;
            const end = flip ? y : height;
            for (let sy = start; sy < end; sy += strip * 2) {
                maskCtx.fillRect(0, sy, width, strip);
            }
            if (softEdge > 0) {
                blurMask(maskCtx, width, height, softEdge);
            }
        } else if (variant === 'band') {
            const band = Math.max(height * 0.12, density * 4);
            maskCtx.fillRect(0, y - band / 2, width, band);
            blurMask(maskCtx, width, height, Math.max(softEdge, 24));
        } else if (softEdge > 0) {
            softHorizontal(y, softEdge, flip);
        } else if (flip) {
            maskCtx.fillRect(0, 0, width, y);
        } else {
            maskCtx.fillRect(0, y, width, height - y);
        }
    } else if (family === 'diagonal') {
        if (variant === 'corner') {
            const size = split * Math.min(width, height) * 1.35;
            maskCtx.beginPath();
            if (flip) {
                maskCtx.moveTo(width, height);
                maskCtx.lineTo(width - size, height);
                maskCtx.lineTo(width, height - size);
            } else {
                maskCtx.moveTo(0, 0);
                maskCtx.lineTo(size, 0);
                maskCtx.lineTo(0, size);
            }
            maskCtx.closePath();
            maskCtx.fill();
            blurMask(maskCtx, width, height, Math.max(softEdge, 20));
        } else if (variant === 'tl-soft') {
            paintDiagonal('tl', true);
        } else if (variant === 'tr-soft') {
            paintDiagonal('tr', true);
        } else if (variant === 'tr') {
            paintDiagonal('tr', false);
        } else {
            paintDiagonal('tl', false);
        }
    } else if (family === 'fade') {
        if (variant === 'tb') {
            softHorizontal(split * height, Math.max(softEdge, width * 0.08, 64), flip);
        } else {
            softVertical(split * width, Math.max(softEdge, width * 0.08, 64), flip);
        }
    } else if (family === 'zigzag') {
        const deep = variant === 'deep';
        const amp = deep ? Math.max(density * 1.4, width * 0.06) : Math.max(density * 0.85, width * 0.035);
        const step = deep ? Math.max(10, density * 0.7) : Math.max(8, density * 0.55);
        const baseX = split * width;
        maskCtx.beginPath();
        maskCtx.moveTo(baseX, 0);
        let left = true;
        for (let y = 0; y <= height; y += step) {
            maskCtx.lineTo(baseX + (left ? -amp : amp), y);
            left = !left;
        }
        if (flip) {
            maskCtx.lineTo(0, height);
            maskCtx.lineTo(0, 0);
        } else {
            maskCtx.lineTo(width, height);
            maskCtx.lineTo(width, 0);
        }
        maskCtx.closePath();
        maskCtx.fill();
        if (variant === 'soft' || softEdge > 0) {
            blurMask(maskCtx, width, height, Math.max(softEdge, variant === 'soft' ? 18 : 0));
        }
    } else if (family === 'wave') {
        const wide = variant === 'wide';
        const amp = wide ? Math.max(density * 2.2, width * 0.1) : Math.max(density * 1.2, width * 0.05);
        const period = wide ? Math.max(80, density * 8) : Math.max(48, density * 5);
        const freq = (Math.PI * 2) / period;
        const baseX = split * width;
        maskCtx.beginPath();
        maskCtx.moveTo(baseX, 0);
        for (let y = 0; y <= height; y += 1) {
            maskCtx.lineTo(baseX + Math.sin(y * freq) * amp, y);
        }
        if (flip) {
            maskCtx.lineTo(0, height);
            maskCtx.lineTo(0, 0);
        } else {
            maskCtx.lineTo(width, height);
            maskCtx.lineTo(width, 0);
        }
        maskCtx.closePath();
        maskCtx.fill();
        if (variant === 'soft' || softEdge > 0) {
            blurMask(maskCtx, width, height, Math.max(softEdge, variant === 'soft' ? 22 : 0));
        }
    } else if (family === 'checker') {
        let size = density;
        if (variant === 'fine') {
            size = Math.max(6, density * 0.45);
        } else if (variant === 'large') {
            size = Math.max(24, density * 1.8);
        }
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const col = Math.floor(x / size);
                const row = Math.floor(y / size);
                const on = (col + row) % 2 === (flip ? 1 : 0);
                if (on) {
                    maskCtx.fillRect(x, y, size, size);
                }
            }
        }
    } else if (family === 'stripes') {
        const size = Math.max(6, density);
        if (variant === 'diagonal') {
            maskCtx.save();
            maskCtx.translate(width / 2, height / 2);
            maskCtx.rotate((-28 * Math.PI) / 180);
            const span = Math.hypot(width, height);
            for (let x = -span; x < span; x += size * 2) {
                maskCtx.fillRect(x + (flip ? size : 0), -span, size, span * 2);
            }
            maskCtx.restore();
        } else if (variant === 'horizontal') {
            for (let y = flip ? size : 0; y < height; y += size * 2) {
                maskCtx.fillRect(0, y, width, size);
            }
        } else {
            for (let x = flip ? size : 0; x < width; x += size * 2) {
                maskCtx.fillRect(x, 0, size, height);
            }
        }
    } else {
        const x = split * width;
        if (flip) {
            maskCtx.fillRect(0, 0, x, height);
        } else {
            maskCtx.fillRect(x, 0, width - x, height);
        }
    }

    if (invert) {
        const image = maskCtx.getImageData(0, 0, width, height);
        const pixels = image.data;
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = 255;
            pixels[i + 1] = 255;
            pixels[i + 2] = 255;
            pixels[i + 3] = 255 - pixels[i + 3];
        }
        maskCtx.putImageData(image, 0, 0);
    }

    maskCtx.restore();
}
