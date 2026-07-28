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

/** Deterministic 0..1 noise so wipe frames and cached tiles do not flicker. */
function hashNoise(n) {
    let x = Math.imul(Number(n) ^ 0x9e3779b9, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x = (x ^ (x >>> 16)) >>> 0;
    return x / 4294967296;
}

/**
 * Draw pattern marks only (no opaque base). Used by background + overlay.
 * @param {'opaque'|'grain'} noiseMode opaque blends two colors; grain uses color alpha speckles
 */
function paintPatternMarks(ctx, width, height, type, color, density, noiseMode = 'opaque', noiseBg = null) {
    const step = density;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    if (type === 'dots') {
        const radius = Math.max(1, density * 0.12);
        for (let y = step / 2; y < height; y += step) {
            for (let x = step / 2; x < width; x += step) {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        return;
    }

    if (type === 'grid') {
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
        return;
    }

    if (type === 'stripes') {
        for (let x = -height; x < width; x += step) {
            ctx.fillRect(x, 0, Math.max(2, step * 0.45), height);
        }
        return;
    }

    if (type === 'diagonal') {
        ctx.lineWidth = Math.max(1, step * 0.2);
        ctx.beginPath();
        for (let i = -height; i < width + height; i += step) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i + height, height);
        }
        ctx.stroke();
        return;
    }

    if (type === 'chevron') {
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
        return;
    }

    if (type === 'noise') {
        const tileSize = 128;
        const tile = document.createElement('canvas');
        tile.width = tileSize;
        tile.height = tileSize;
        const tctx = tile.getContext('2d');
        const image = tctx.createImageData(tileSize, tileSize);
        const data = image.data;
        const fgRgb = hexToRgb(color) || { r: 229, g: 229, b: 229 };
        const strength = clamp(density / 100, 0.08, 0.9);

        if (noiseMode === 'grain') {
            for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
                data[i] = fgRgb.r;
                data[i + 1] = fgRgb.g;
                data[i + 2] = fgRgb.b;
                data[i + 3] = Math.round(hashNoise(p + 17) * strength * 255);
            }
        } else {
            const bgRgb = hexToRgb(noiseBg) || { r: 250, g: 250, b: 250 };
            for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
                const t = hashNoise(p + 3) * strength;
                data[i] = Math.round(bgRgb.r * (1 - t) + fgRgb.r * t);
                data[i + 1] = Math.round(bgRgb.g * (1 - t) + fgRgb.g * t);
                data[i + 2] = Math.round(bgRgb.b * (1 - t) + fgRgb.b * t);
                data[i + 3] = 255;
            }
        }

        tctx.putImageData(image, 0, 0);
        const pattern = ctx.createPattern(tile, 'repeat');
        if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, width, height);
        }
    }
}

export function paintBackground(ctx, width, height, options = {}) {
    const type = options.type || 'none';
    const bg = options.bg || '#FAFAFA';
    const fg = options.fg || '#E5E5E5';
    const density = clamp(Number(options.density) || 24, 4, 120);

    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (type && type !== 'none' && type !== 'solid') {
        paintPatternMarks(ctx, width, height, type, fg, density, 'opaque', bg);
    }

    ctx.restore();
}

/**
 * Translucent pattern marks on top of composed images (no base fill).
 * options: { type, color, opacity (0-100), density }
 */
export function paintOverlay(ctx, width, height, options = {}) {
    const type = options.type || 'none';
    if (!type || type === 'none' || type === 'solid') {
        return;
    }

    const color = options.color || '#171717';
    const opacity = clamp((Number(options.opacity) ?? 25) / 100, 0.05, 0.8);
    const density = clamp(Number(options.density) || 24, 4, 120);

    ctx.save();
    ctx.globalAlpha = opacity;
    paintPatternMarks(ctx, width, height, type, color, density, 'grain');
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
    const density = clamp(Number(options.maskDensity) || 28, 0.1, 160);
    const diagonalAngle = Number.isFinite(Number(options.diagonalAngle))
        ? Number(options.diagonalAngle)
        : (Math.atan2(height, width) * 180) / Math.PI;

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

    const paintAngledSplit = (angleDeg, style = 'straight') => {
        const span = Math.hypot(width, height) * 2;
        const radians = (angleDeg * Math.PI) / 180;
        const nx = -Math.sin(radians);
        const ny = Math.cos(radians);
        const offset = (split - 0.5) * Math.hypot(width, height);
        const px = width / 2 + nx * offset;
        const py = height / 2 + ny * offset;
        const dens = clamp(density, 0.1, 100);
        // Higher density → shorter interval → more waves (0.1 sparse … 100 tight)
        const interval = Math.max(12, 500 / dens + 8);
        const amp = Math.min(width, height) * (0.008 + Math.min(dens, 100) * 0.00018);

        const fillAngledSide = () => {
            if (flip) {
                maskCtx.lineTo(span, -span);
                maskCtx.lineTo(-span, -span);
            } else {
                maskCtx.lineTo(span, span);
                maskCtx.lineTo(-span, span);
            }
            maskCtx.closePath();
            maskCtx.fill();
        };

        maskCtx.save();
        maskCtx.translate(px, py);
        maskCtx.rotate(radians);

        if (style === 'wavy') {
            const freq = (Math.PI * 2) / interval;
            maskCtx.beginPath();
            maskCtx.moveTo(-span, Math.sin(-span * freq) * amp);
            for (let x = -span; x <= span; x += 2) {
                maskCtx.lineTo(x, Math.sin(x * freq) * amp);
            }
            fillAngledSide();
        } else if (style === 'zigzag') {
            const step = Math.max(10, interval / 2);
            let up = true;
            maskCtx.beginPath();
            maskCtx.moveTo(-span, 0);
            for (let x = -span; x <= span; x += step) {
                maskCtx.lineTo(x, up ? -amp : amp);
                up = !up;
            }
            fillAngledSide();
        } else if (style === 'scallop') {
            const freq = (Math.PI * 2) / interval;
            maskCtx.beginPath();
            maskCtx.moveTo(-span, 0);
            for (let x = -span; x <= span; x += 2) {
                maskCtx.lineTo(x, Math.abs(Math.sin(x * freq)) * amp * 1.35);
            }
            fillAngledSide();
        } else if (style === 'torn') {
            const segment = Math.max(4, Math.round(interval / 2));
            const tornAmp = amp * 2.4;
            maskCtx.beginPath();
            maskCtx.moveTo(-span, (hashNoise(0) - 0.5) * 2 * tornAmp);
            for (let x = -span; x <= span; x += segment) {
                const offset = (hashNoise(Math.round(x * 0.5) + 91) - 0.5) * 2 * tornAmp;
                maskCtx.lineTo(x, offset);
            }
            fillAngledSide();
        } else if (style === 'pixel') {
            const step = Math.max(6, Math.round(interval / 2));
            maskCtx.beginPath();
            maskCtx.moveTo(-span, 0);
            for (let x = -span; x <= span; x += step) {
                const offset = Math.round((hashNoise(Math.floor(x / step) * 13 + 7) - 0.5) * 2 * step * 0.85);
                maskCtx.lineTo(x, offset);
                maskCtx.lineTo(x + step, offset);
            }
            fillAngledSide();
        } else if (flip) {
            maskCtx.fillRect(-span, -span, span * 2, span);
        } else {
            // Local +Y is one side of the angled line
            maskCtx.fillRect(-span, 0, span * 2, span);
        }
        maskCtx.restore();

        if (style === 'soft') {
            blurMask(maskCtx, width, height, Math.max(softEdge, Math.min(width, height) * 0.035, 18));
        } else if (softEdge > 0) {
            blurMask(maskCtx, width, height, softEdge);
        }
    };

    const closeAxisMask = (axis) => {
        if (axis === 'x') {
            if (flip) {
                maskCtx.lineTo(0, height);
                maskCtx.lineTo(0, 0);
            } else {
                maskCtx.lineTo(width, height);
                maskCtx.lineTo(width, 0);
            }
        } else if (flip) {
            maskCtx.lineTo(width, 0);
            maskCtx.lineTo(0, 0);
        } else {
            maskCtx.lineTo(width, height);
            maskCtx.lineTo(0, height);
        }
        maskCtx.closePath();
        maskCtx.fill();
    };

    const axisEdgeMetrics = () => {
        const dens = clamp(density, 0.1, 100);
        const interval = Math.max(12, 500 / dens + 8);
        const amp = Math.min(width, height) * (0.008 + Math.min(dens, 100) * 0.00018);
        return { dens, interval, amp };
    };

    const paintAxisWavy = (axis, base) => {
        const { interval, amp } = axisEdgeMetrics();
        const freq = (Math.PI * 2) / interval;
        const length = axis === 'x' ? height : width;
        maskCtx.beginPath();
        if (axis === 'x') {
            maskCtx.moveTo(base + Math.sin(0) * amp, 0);
            for (let y = 0; y <= length; y += 2) {
                maskCtx.lineTo(base + Math.sin(y * freq) * amp, y);
            }
        } else {
            maskCtx.moveTo(0, base + Math.sin(0) * amp);
            for (let x = 0; x <= length; x += 2) {
                maskCtx.lineTo(x, base + Math.sin(x * freq) * amp);
            }
        }
        closeAxisMask(axis);
    };

    const paintAxisZigzag = (axis, base) => {
        const { interval, amp } = axisEdgeMetrics();
        const step = Math.max(10, interval / 2);
        const length = axis === 'x' ? height : width;
        let up = true;
        maskCtx.beginPath();
        if (axis === 'x') {
            maskCtx.moveTo(base, 0);
            for (let y = 0; y <= length; y += step) {
                maskCtx.lineTo(base + (up ? -amp : amp), Math.min(y, length));
                up = !up;
            }
        } else {
            maskCtx.moveTo(0, base);
            for (let x = 0; x <= length; x += step) {
                maskCtx.lineTo(Math.min(x, length), base + (up ? -amp : amp));
                up = !up;
            }
        }
        closeAxisMask(axis);
    };

    const paintAxisScallop = (axis, base) => {
        const { interval, amp } = axisEdgeMetrics();
        const freq = (Math.PI * 2) / interval;
        const length = axis === 'x' ? height : width;
        maskCtx.beginPath();
        if (axis === 'x') {
            maskCtx.moveTo(base, 0);
            for (let y = 0; y <= length; y += 2) {
                maskCtx.lineTo(base + Math.abs(Math.sin(y * freq)) * amp * 1.35, y);
            }
        } else {
            maskCtx.moveTo(0, base);
            for (let x = 0; x <= length; x += 2) {
                maskCtx.lineTo(x, base + Math.abs(Math.sin(x * freq)) * amp * 1.35);
            }
        }
        closeAxisMask(axis);
    };

    const paintAxisTorn = (axis, base) => {
        const { dens } = axisEdgeMetrics();
        const segment = Math.max(4, Math.round(36 / Math.sqrt(dens) + 3));
        const amp = Math.min(width, height) * (0.018 + Math.min(dens, 50) * 0.001);
        const length = axis === 'x' ? height : width;
        maskCtx.beginPath();
        if (axis === 'x') {
            maskCtx.moveTo(base + (hashNoise(0) - 0.5) * 2 * amp, 0);
            for (let y = segment; y <= length + segment; y += segment) {
                const ny = Math.min(y, length);
                const offset = (hashNoise(Math.round(ny * 12.9898) + 3) - 0.5) * 2 * amp;
                maskCtx.lineTo(base + offset, ny);
            }
        } else {
            maskCtx.moveTo(0, base + (hashNoise(0) - 0.5) * 2 * amp);
            for (let x = segment; x <= length + segment; x += segment) {
                const nx = Math.min(x, length);
                const offset = (hashNoise(Math.round(nx * 12.9898) + 11) - 0.5) * 2 * amp;
                maskCtx.lineTo(nx, base + offset);
            }
        }
        closeAxisMask(axis);
    };

    const paintAxisPixel = (axis, base) => {
        const { dens } = axisEdgeMetrics();
        const block = Math.max(4, Math.round(42 / Math.sqrt(dens) + 4));
        const length = axis === 'x' ? height : width;
        maskCtx.beginPath();
        if (axis === 'x') {
            maskCtx.moveTo(base, 0);
            for (let y = 0; y < length; y += block) {
                const seed = Math.floor(y / block);
                const offset = Math.round((hashNoise(seed * 17 + 3) - 0.5) * 2 * block);
                const y2 = Math.min(length, y + block);
                maskCtx.lineTo(base + offset, y);
                maskCtx.lineTo(base + offset, y2);
            }
        } else {
            maskCtx.moveTo(0, base);
            for (let x = 0; x < length; x += block) {
                const seed = Math.floor(x / block);
                const offset = Math.round((hashNoise(seed * 19 + 5) - 0.5) * 2 * block);
                const x2 = Math.min(length, x + block);
                maskCtx.lineTo(x, base + offset);
                maskCtx.lineTo(x2, base + offset);
            }
        }
        closeAxisMask(axis);
    };

    const paintAxisStyled = (axis, base, style) => {
        if (style === 'soft' || style === 'fade') {
            if (axis === 'x') {
                softVertical(base, Math.max(softEdge, 48), flip);
            } else {
                softHorizontal(base, Math.max(softEdge, 48), flip);
            }
            return true;
        }
        if (style === 'wavy') {
            paintAxisWavy(axis, base);
            return true;
        }
        if (style === 'zigzag') {
            paintAxisZigzag(axis, base);
            return true;
        }
        if (style === 'scallop') {
            paintAxisScallop(axis, base);
            return true;
        }
        if (style === 'torn') {
            paintAxisTorn(axis, base);
            return true;
        }
        if (style === 'pixel') {
            paintAxisPixel(axis, base);
            return true;
        }
        return false;
    };

    if (family === 'vertical') {
        const x = split * width;
        if (!paintAxisStyled('x', x, variant)) {
            if (variant === 'blinds') {
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
        }
    } else if (family === 'horizontal') {
        const y = split * height;
        if (!paintAxisStyled('y', y, variant)) {
            if (variant === 'blinds') {
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
        }
    } else if (family === 'diagonal') {
        paintAngledSplit(diagonalAngle, variant || 'straight');
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
