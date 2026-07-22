const cameraVideo = document.getElementById("cameraVideo");
const selectedPhotoFrame = document.getElementById("selectedPhotoFrame");
const captureCanvas = document.getElementById("captureCanvas");

const homeButton = document.getElementById("homeButton");
const captureBtn = document.getElementById("captureBtn");
const openFramePanelBtn = document.getElementById("openFramePanelBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");

const framePanel = document.getElementById("framePanel");
const closeFramePanelBtn = document.getElementById("closeFramePanelBtn");
const frameCarousel = document.getElementById("frameCarousel");

const previewArea = document.getElementById("previewArea");
const previewImage = document.getElementById("previewImage");
const retakeBtn = document.getElementById("retakeBtn");
const saveBtn = document.getElementById("saveBtn");

let currentStream = null;
let cameraStarting = false;
let cameraSwitching = false;
let captureInProgress = false;

let facingMode = "user";

let selectedFrame = null;
let selectedFrameReady = false;

let orientationTimer = null;
let previewObjectUrl = null;
let capturedPhotoBlob = null;

const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

const TOTAL_FRAMES = 40;
const ASSET_VERSION = "20260629_03";

const frames = Array.from(
    { length: TOTAL_FRAMES },
    (_, index) => {
        const num = String(index + 1).padStart(2, "0");

        return {
            id: index + 1,
            full: `assets/photoframe/frame${num}.webp?v=${ASSET_VERSION}`,
            thumb: `assets/photoframe/thumbs/frame${num}.webp?v=${ASSET_VERSION}`
        };
    }
);

initialize();

/* =========================
   Initialize
========================= */

async function initialize() {
    createFrameCarousel();
    bindEvents();

    updateDeviceOrientation();

    await startCamera();
}

/* =========================
   Frame Carousel
========================= */

function createFrameCarousel() {
    if (!frameCarousel) {
        return;
    }

    frameCarousel.innerHTML = "";

    frames.forEach((frame) => {
        const button = document.createElement("button");

        button.className = "frame-btn";
        button.type = "button";
        button.dataset.frame = String(frame.id);

        const img = document.createElement("img");

        img.src = frame.thumb;
        img.alt = `フレーム${frame.id}`;
        img.loading = "lazy";
        img.decoding = "async";

        img.onerror = () => {
            button.remove();
        };

        button.appendChild(img);

        button.addEventListener("click", () => {
            selectFrame(frame, button);
        });

        frameCarousel.appendChild(button);
    });
}

/* =========================
   Events
========================= */

function bindEvents() {
    if (homeButton) {
        homeButton.addEventListener("click", () => {
            stopCamera();
        });
    }

    if (switchCameraBtn) {
        switchCameraBtn.addEventListener(
            "click",
            switchCamera
        );
    }

    if (openFramePanelBtn) {
        openFramePanelBtn.addEventListener(
            "click",
            openFramePanel
        );
    }

    if (closeFramePanelBtn) {
        closeFramePanelBtn.addEventListener(
            "click",
            closeFramePanel
        );
    }

    if (captureBtn) {
        captureBtn.addEventListener(
            "click",
            capturePhoto
        );
    }

    if (retakeBtn) {
        retakeBtn.addEventListener(
            "click",
            retakePhoto
        );
    }

    if (saveBtn) {
        saveBtn.addEventListener(
            "click",
            savePhoto
        );
    }

    window.addEventListener(
        "resize",
        handleOrientationChange,
        { passive: true }
    );

    window.addEventListener(
        "orientationchange",
        handleOrientationChange,
        { passive: true }
    );

    if (
        screen.orientation &&
        typeof screen.orientation.addEventListener === "function"
    ) {
        screen.orientation.addEventListener(
            "change",
            handleOrientationChange
        );
    }

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    window.addEventListener(
        "pageshow",
        handlePageShow
    );

    window.addEventListener(
        "beforeunload",
        cleanup
    );

    window.addEventListener(
        "pagehide",
        cleanup
    );
}

async function handleVisibilityChange() {
    if (document.visibilityState !== "visible") {
        return;
    }

    updateDeviceOrientation();

    if (!currentStream && !cameraStarting) {
        await startCamera();
    }
}

async function handlePageShow() {
    updateDeviceOrientation();

    if (!currentStream && !cameraStarting) {
        await startCamera();
    }
}

/* =========================
   Camera
========================= */

function updateCameraMirror() {
    if (!cameraVideo) {
        return;
    }

    if (facingMode === "user") {
        cameraVideo.style.transform =
            "translate(-50%, -50%) scaleX(-1)";
    } else {
        cameraVideo.style.transform =
            "translate(-50%, -50%) scaleX(1)";
    }
}

async function startCamera() {
    if (!cameraVideo) {
        return;
    }

    if (cameraStarting) {
        return;
    }

    cameraStarting = true;

    stopCamera();

    try {
        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            throw new Error(
                "getUserMedia is not supported"
            );
        }

        const constraints = {
            video: {
                facingMode: {
                    ideal: facingMode
                },

                width: {
                    ideal: FRAME_WIDTH
                },

                height: {
                    ideal: FRAME_HEIGHT
                },

                aspectRatio: {
                    ideal: 16 / 9
                },

                frameRate: {
                    ideal: 30,
                    max: 30
                }
            },

            audio: false
        };

        const stream =
            await navigator.mediaDevices.getUserMedia(
                constraints
            );

        currentStream = stream;

        cameraVideo.srcObject = currentStream;
        cameraVideo.muted = true;
        cameraVideo.autoplay = true;

        cameraVideo.setAttribute(
            "playsinline",
            ""
        );

        cameraVideo.setAttribute(
            "webkit-playsinline",
            ""
        );

        await cameraVideo.play();

        await waitForVideoReady(cameraVideo);

        updateCameraMirror();
        updateDeviceOrientation();

        const track =
            currentStream.getVideoTracks()[0];

        if (track) {
            console.log(
                "Camera settings:",
                track.getSettings()
            );

            track.addEventListener("ended", () => {
                currentStream = null;

                if (
                    document.visibilityState === "visible" &&
                    !cameraStarting &&
                    !cameraSwitching
                ) {
                    startCamera();
                }
            });
        }
    } catch (error) {
        console.error(
            "Camera error:",
            error
        );

        currentStream = null;

        let message =
            "カメラを起動できませんでした";

        if (error.name === "NotAllowedError") {
            message =
                "カメラの使用を許可してください";
        } else if (error.name === "NotFoundError") {
            message =
                "カメラが見つかりませんでした";
        } else if (error.name === "NotReadableError") {
            message =
                "カメラを使用できませんでした";
        }

        alert(message);
    } finally {
        cameraStarting = false;
    }
}

function stopCamera() {
    if (cameraVideo) {
        cameraVideo.pause();
        cameraVideo.srcObject = null;
    }

    if (currentStream) {
        currentStream
            .getTracks()
            .forEach((track) => {
                track.stop();
            });
    }

    currentStream = null;
}

async function switchCamera() {
    if (
        cameraStarting ||
        cameraSwitching ||
        captureInProgress
    ) {
        return;
    }

    cameraSwitching = true;

    facingMode =
        facingMode === "user"
            ? "environment"
            : "user";

    try {
        stopCamera();

        await wait(200);

        await startCamera();
    } finally {
        cameraSwitching = false;
    }
}

function waitForVideoReady(video) {
    return new Promise((resolve, reject) => {
        if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
        ) {
            resolve();
            return;
        }

        const timeout = window.setTimeout(() => {
            cleanupListeners();

            reject(
                new Error("Camera video did not become ready")
            );
        }, 5000);

        function handleReady() {
            if (
                video.videoWidth > 0 &&
                video.videoHeight > 0
            ) {
                cleanupListeners();
                resolve();
            }
        }

        function handleError() {
            cleanupListeners();

            reject(
                new Error("Camera video failed")
            );
        }

        function cleanupListeners() {
            window.clearTimeout(timeout);

            video.removeEventListener(
                "loadedmetadata",
                handleReady
            );

            video.removeEventListener(
                "canplay",
                handleReady
            );

            video.removeEventListener(
                "error",
                handleError
            );
        }

        video.addEventListener(
            "loadedmetadata",
            handleReady
        );

        video.addEventListener(
            "canplay",
            handleReady
        );

        video.addEventListener(
            "error",
            handleError
        );
    });
}

/* =========================
   Frame Panel
========================= */

function openFramePanel() {
    if (!framePanel) {
        return;
    }

    framePanel.classList.remove("hidden");
}

function closeFramePanel() {
    if (!framePanel) {
        return;
    }

    framePanel.classList.add("hidden");
}

function selectFrame(frame, button) {
    if (!selectedPhotoFrame) {
        return;
    }

    selectedFrame = frame.full;
    selectedFrameReady = false;

    selectedPhotoFrame.style.display = "block";

    selectedPhotoFrame.onload = () => {
        selectedFrameReady = true;
    };

    selectedPhotoFrame.onerror = () => {
        selectedFrame = null;
        selectedFrameReady = false;

        selectedPhotoFrame.removeAttribute("src");
        selectedPhotoFrame.style.display = "none";

        alert("フレームを読み込めませんでした");
    };

    selectedPhotoFrame.src = frame.full;

    document
        .querySelectorAll(".frame-btn")
        .forEach((btn) => {
            btn.classList.remove("selected");
        });

    button.classList.add("selected");
}

/* =========================
   Canvas Drawing
========================= */

function drawCover(
    ctx,
    image,
    canvasWidth,
    canvasHeight,
    mirror = false
) {
    const imageWidth =
        image.videoWidth ||
        image.naturalWidth ||
        image.width;

    const imageHeight =
        image.videoHeight ||
        image.naturalHeight ||
        image.height;

    if (!imageWidth || !imageHeight) {
        throw new Error(
            "Invalid image dimensions"
        );
    }

    const scale = Math.max(
        canvasWidth / imageWidth,
        canvasHeight / imageHeight
    );

    const drawWidth =
        imageWidth * scale;

    const drawHeight =
        imageHeight * scale;

    const offsetX =
        (canvasWidth - drawWidth) / 2;

    const offsetY =
        (canvasHeight - drawHeight) / 2;

    ctx.save();

    if (mirror) {
        ctx.translate(canvasWidth, 0);
        ctx.scale(-1, 1);

        ctx.drawImage(
            image,
            -offsetX - drawWidth,
            offsetY,
            drawWidth,
            drawHeight
        );
    } else {
        ctx.drawImage(
            image,
            offsetX,
            offsetY,
            drawWidth,
            drawHeight
        );
    }

    ctx.restore();
}

/* =========================
   Capture
========================= */

async function capturePhoto() {
    if (captureInProgress) {
        return;
    }

    if (!currentStream) {
        await startCamera();
        return;
    }

    if (
        !cameraVideo ||
        cameraVideo.readyState <
            HTMLMediaElement.HAVE_CURRENT_DATA ||
        !cameraVideo.videoWidth ||
        !cameraVideo.videoHeight
    ) {
        alert("カメラの準備ができていません");
        return;
    }

    if (!selectedFrame) {
        openFramePanel();
        return;
    }

    if (
        !selectedFrameReady ||
        !selectedPhotoFrame ||
        !selectedPhotoFrame.complete ||
        !selectedPhotoFrame.naturalWidth
    ) {
        openFramePanel();
        return;
    }

    if (
        !captureCanvas ||
        !previewImage ||
        !previewArea
    ) {
        return;
    }

    captureInProgress = true;

    if (captureBtn) {
        captureBtn.disabled = true;
    }

    try {
        await waitForAnimationFrame();
        await waitForAnimationFrame();

        captureCanvas.width =
            FRAME_WIDTH;

        captureCanvas.height =
            FRAME_HEIGHT;

        const ctx =
            captureCanvas.getContext(
                "2d",
                {
                    alpha: false
                }
            );

        if (!ctx) {
            throw new Error(
                "Canvas context unavailable"
            );
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.fillStyle = "#000";

        ctx.fillRect(
            0,
            0,
            FRAME_WIDTH,
            FRAME_HEIGHT
        );

        drawCover(
            ctx,
            cameraVideo,
            FRAME_WIDTH,
            FRAME_HEIGHT,
            facingMode === "user"
        );

        ctx.drawImage(
            selectedPhotoFrame,
            0,
            0,
            FRAME_WIDTH,
            FRAME_HEIGHT
        );

        const blob = await canvasToBlob(
            captureCanvas,
            "image/png"
        );

        if (!blob) {
            throw new Error(
                "Could not create preview image"
            );
        }

        capturedPhotoBlob = blob;

        revokePreviewObjectUrl();

        previewObjectUrl =
            URL.createObjectURL(blob);

        await loadPreviewImage(
            previewImage,
            previewObjectUrl
        );

        previewArea.classList.remove(
            "hidden"
        );
    } catch (error) {
        console.error(
            "Capture error:",
            error
        );

        alert("画像を作成できませんでした");
    } finally {
        captureInProgress = false;

        if (captureBtn) {
            captureBtn.disabled = false;
        }
    }
}

function retakePhoto() {
    if (!previewArea) {
        return;
    }

    previewArea.classList.add(
        "hidden"
    );

    if (previewImage) {
        previewImage.removeAttribute(
            "src"
        );
    }

    capturedPhotoBlob = null;

    revokePreviewObjectUrl();
}

/* =========================
   Save
========================= */

async function savePhoto() {
    let blob = capturedPhotoBlob;

    if (!blob && captureCanvas) {
        blob = await canvasToBlob(
            captureCanvas,
            "image/png"
        );
    }

    if (!blob) {
        alert("画像を保存できませんでした");
        return;
    }

    const file = new File(
        [blob],
        "photo-frame.png",
        {
            type: "image/png"
        }
    );

    try {
        if (
            navigator.canShare &&
            navigator.canShare({
                files: [file]
            })
        ) {
            await navigator.share({
                files: [file],
                title: "フォトフレーム",
                text: "フォトフレーム写真"
            });
        } else {
            downloadImage(blob);
        }
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error(
            "Share error:",
            error
        );

        downloadImage(blob);
    }
}

function downloadImage(blob) {
    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download =
        "photo-frame.png";

    document.body.appendChild(link);

    link.click();
    link.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

/* =========================
   Utilities
========================= */

function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(
            resolve,
            milliseconds
        );
    });
}

function waitForAnimationFrame() {
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
            resolve();
        });
    });
}

function canvasToBlob(
    canvas,
    type = "image/png",
    quality
) {
    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                resolve(blob);
            },
            type,
            quality
        );
    });
}

function loadPreviewImage(
    imageElement,
    source
) {
    return new Promise((resolve, reject) => {
        imageElement.onload = () => {
            imageElement.onload = null;
            imageElement.onerror = null;

            resolve();
        };

        imageElement.onerror = () => {
            imageElement.onload = null;
            imageElement.onerror = null;

            reject(
                new Error(
                    "Preview image failed to load"
                )
            );
        };

        imageElement.src = source;
    });
}

function revokePreviewObjectUrl() {
    if (!previewObjectUrl) {
        return;
    }

    URL.revokeObjectURL(
        previewObjectUrl
    );

    previewObjectUrl = null;
}

function cleanup() {
    stopCamera();
    revokePreviewObjectUrl();

    capturedPhotoBlob = null;
}