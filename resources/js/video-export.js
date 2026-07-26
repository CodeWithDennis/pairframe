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

/**
 * Record a wipe transition A→B (or reverse) from the compositor canvas.
 *
 * @param {object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {string} params.videoContainer
 * @param {number} params.videoFps
 * @param {number} params.videoDuration
 * @param {boolean} params.videoReverse
 * @param {{ render: Function, getCanvas: Function }} params.compositor
 * @param {(width: number, height: number) => object} params.buildOptions
 * @param {(message: string) => void} [params.onProgress]
 */
export async function recordWipeVideo({
    width,
    height,
    videoContainer,
    videoFps,
    videoDuration,
    videoReverse,
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
    const fps = videoFps;
    const durationSec = videoDuration;
    const frameCount = Math.max(2, Math.round(fps * durationSec));
    const frameDelay = 1000 / fps;

    const renderFrame = (split01) => {
        const options = buildOptions(width, height);
        options.splitPosition = clamp(split01, 0, 1);
        compositor.render(options);
    };

    renderFrame(videoReverse ? 1 : 0);

    const canvas = compositor.getCanvas();
    const stream = canvas.captureStream(fps);
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

    for (let i = 0; i <= frameCount; i++) {
        const t = i / frameCount;
        const split = videoReverse ? 1 - t : t;
        renderFrame(split);
        if (typeof track.requestFrame === 'function') {
            track.requestFrame();
        }
        onProgress?.(`Recording ${label}… ${Math.round((i / frameCount) * 100)}%`);
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
