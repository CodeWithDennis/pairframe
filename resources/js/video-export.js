import { GIFEncoder, applyPalette, quantize } from 'gifenc';

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isVideoMimeSupported(type) {
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type);
}

export function firstSupportedMime(types) {
    return types.find((type) => isVideoMimeSupported(type)) || '';
}

export function pickVideoMimeType(videoContainer) {
    const mp4Types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'];
    const webmTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

    if (videoContainer === 'mp4') {
        const mimeType = firstSupportedMime(mp4Types);
        return mimeType ? { mimeType, extension: 'mp4', label: 'MP4' } : null;
    }

    if (videoContainer === 'webm') {
        const mimeType = firstSupportedMime(webmTypes);
        return mimeType ? { mimeType, extension: 'webm', label: 'WebM' } : null;
    }

    const mp4 = firstSupportedMime(mp4Types);
    if (mp4) {
        return { mimeType: mp4, extension: 'mp4', label: 'MP4' };
    }

    const webm = firstSupportedMime(webmTypes);
    return webm ? { mimeType: webm, extension: 'webm', label: 'WebM' } : null;
}

export function easeInOutCubic(t) {
    const x = clamp(t, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Map linear timeline 0..1 across hold-start → eased transition → hold-end.
 * Holds are seconds within total durationSec; remainder is the transition.
 */
export function transitionProgressAt(timelineT, {
    durationSec,
    holdStartSec = 0,
    holdEndSec = 0,
    easing = 'linear',
    reverse = false,
} = {}) {
    const duration = Math.max(0.5, Number(durationSec) || 2);
    let holdStart = clamp(Number(holdStartSec) || 0, 0, duration);
    let holdEnd = clamp(Number(holdEndSec) || 0, 0, duration);
    if (holdStart + holdEnd > duration - 0.25) {
        const scale = (duration - 0.25) / (holdStart + holdEnd || 1);
        holdStart *= scale;
        holdEnd *= scale;
    }

    const t = clamp(timelineT, 0, 1);
    const startRatio = holdStart / duration;
    const endRatio = 1 - holdEnd / duration;

    let progress = 0;
    if (t <= startRatio) {
        progress = 0;
    } else if (t >= endRatio) {
        progress = 1;
    } else {
        const u = (t - startRatio) / Math.max(0.0001, endRatio - startRatio);
        progress = easing === 'ease-in-out' ? easeInOutCubic(u) : u;
    }

    return reverse ? 1 - progress : progress;
}

export function buildTransitionFrames({
    videoFps,
    videoDuration,
    videoHoldStart = 0,
    videoHoldEnd = 0,
    videoEasing = 'linear',
    videoReverse = false,
}) {
    const fps = Math.max(1, Number(videoFps) || 30);
    const durationSec = Math.max(0.5, Number(videoDuration) || 2);
    const frameCount = Math.max(2, Math.round(fps * durationSec));
    const frameDelay = 1000 / fps;
    const frames = [];

    for (let i = 0; i <= frameCount; i++) {
        const timelineT = i / frameCount;
        frames.push({
            timelineT,
            progress: transitionProgressAt(timelineT, {
                durationSec,
                holdStartSec: videoHoldStart,
                holdEndSec: videoHoldEnd,
                easing: videoEasing,
                reverse: videoReverse,
            }),
        });
    }

    return { fps, durationSec, frameCount, frameDelay, frames };
}

/**
 * Record an A→B (or reverse) transition from the compositor canvas.
 */
export async function recordTransitionVideo({
    width,
    height,
    videoContainer,
    videoFps,
    videoDuration,
    videoReverse,
    videoTransition = 'wipe',
    videoHoldStart = 0,
    videoHoldEnd = 0,
    videoEasing = 'linear',
    compositor,
    buildOptions,
    onProgress,
}) {
    if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not supported in this environment.');
    }

    const picked = pickVideoMimeType(videoContainer);
    if (!picked) {
        const wanted = videoContainer === 'auto' ? 'MP4/WebM' : String(videoContainer).toUpperCase();
        throw new Error(`${wanted} video export is not supported in this environment.`);
    }

    const { mimeType, extension, label } = picked;
    const transition = videoTransition || 'wipe';
    const { frameDelay, frames } = buildTransitionFrames({
        videoFps,
        videoDuration,
        videoHoldStart,
        videoHoldEnd,
        videoEasing,
        videoReverse,
    });

    const renderFrame = (progress) => {
        const options = buildOptions(width, height);
        compositor.renderVideoFrame(options, transition, clamp(progress, 0, 1));
    };

    renderFrame(frames[0]?.progress ?? (videoReverse ? 1 : 0));

    const canvas = compositor.getCanvas();
    const stream = canvas.captureStream(videoFps);
    const track = stream.getVideoTracks()[0];
    if (!track) {
        throw new Error('Could not capture a video track from the canvas.');
    }

    const bits = Math.round(Math.min(25_000_000, Math.max(6_000_000, width * height * 6)));
    const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bits,
    });
    const chunks = [];
    recorder.ondataavailable = (event) => {
        if (event.data?.size) {
            chunks.push(event.data);
        }
    };

    const stopped = new Promise((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(recorder.error || new Error('Recording failed.'));
    });

    recorder.start(100);

    for (let i = 0; i < frames.length; i++) {
        renderFrame(frames[i].progress);
        if (typeof track.requestFrame === 'function') {
            track.requestFrame();
        }
        onProgress?.(`Recording ${label}… ${Math.round((i / Math.max(1, frames.length - 1)) * 100)}%`);
        await wait(frameDelay);
    }

    await wait(Math.max(frameDelay * 2, 250));
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((item) => item.stop());

    const blob = new Blob(chunks, { type: extension === 'mp4' ? 'video/mp4' : 'video/webm' });
    if (!blob.size) {
        throw new Error('Recording produced an empty file.');
    }

    return { blob, extension, label };
}

/**
 * Encode the same transition timeline as an animated GIF.
 */
export async function recordTransitionGif({
    width,
    height,
    videoFps,
    videoDuration,
    videoReverse,
    videoTransition = 'wipe',
    videoHoldStart = 0,
    videoHoldEnd = 0,
    videoEasing = 'linear',
    compositor,
    buildOptions,
    onProgress,
}) {
    const transition = videoTransition || 'wipe';
    const { frameDelay, frames } = buildTransitionFrames({
        videoFps,
        videoDuration,
        videoHoldStart,
        videoHoldEnd,
        videoEasing,
        videoReverse,
    });

    const gif = GIFEncoder();
    const delayCentis = Math.max(2, Math.round(frameDelay / 10));

    for (let i = 0; i < frames.length; i++) {
        const options = buildOptions(width, height);
        compositor.renderVideoFrame(options, transition, clamp(frames[i].progress, 0, 1));
        const canvas = compositor.getCanvas();
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const image = ctx.getImageData(0, 0, width, height);
        const palette = quantize(image.data, 256);
        const index = applyPalette(image.data, palette);
        gif.writeFrame(index, width, height, {
            palette,
            delay: delayCentis,
            dispose: 1,
        });
        onProgress?.(`Encoding GIF… ${Math.round((i / Math.max(1, frames.length - 1)) * 100)}%`);
        // Yield so the UI can update status on long encodes
        if (i % 3 === 0) {
            await wait(0);
        }
    }

    gif.finish();
    const bytes = gif.bytes();
    const blob = new Blob([bytes], { type: 'image/gif' });
    if (!blob.size) {
        throw new Error('GIF encoding produced an empty file.');
    }

    return { blob, extension: 'gif', label: 'GIF' };
}

/** @deprecated Use recordTransitionVideo */
export async function recordWipeVideo(params) {
    return recordTransitionVideo({ ...params, videoTransition: params.videoTransition || 'wipe' });
}
