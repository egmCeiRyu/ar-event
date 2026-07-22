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

let facingMode = "user";

let selectedFrame = null;
let selectedFrameReady = false;

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

    await handleOrientationChange();
}

/* =========================
   Orientation
========================= */

function isLandscape() {
    return window.matchMedia("(orientation: landscape)").matches;
}

async function handleOrientationChange() {
    if (!isLandscape()) {
        stopCamera();
        return;
    }

    /*
     * Aguarda o navegador finalizar a rotação e atualizar
     * corretamente as dimensões da tela.
     */
    await wait(250);

    if (!currentStream && !cameraStarting) {
        await startCamera();
    }
}

function wait(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
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
        "orientationchange",
        handleOrientationChange
    );

    window.addEventListener(
        "resize",
        handleOrientationChange
    );

    if (screen.orientation) {
        screen.orientation.addEventListener(
            "change",
            handleOrientationChange
        );
    }

    window.addEventListener(
        "beforeunload",
        stopCamera
    );

    window.addEventListener(
        "pagehide",
        stopCamera
    );
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

    if (!isLandscape()) {
        return;
    }

    if (cameraStarting) {
        return;
    }

    cameraStarting = true;

    stopCamera();

    try {
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

        currentStream =
            await navigator.mediaDevices.getUserMedia(
                constraints
            );

        /*
         * Pode acontecer de o usuário girar novamente para
         * portrait enquanto a permissão da câmera está abrindo.
         */
        if (!isLandscape()) {
            stopCamera();
            return;
        }

        cameraVideo.srcObject = currentStream;

        await cameraVideo.play();

        updateCameraMirror();

        const track =
            currentStream.getVideoTracks()[0];

        if (track) {
            console.log(
                "Camera settings:",
                track.getSettings()
            );
        }
    } catch (error) {
        console.error("Camera error:", error);

        /*
         * Não mostra erro caso a câmera tenha sido cancelada
         * somente porque o aparelho mudou de orientação.
         */
        if (!isLandscape()) {
            return;
        }

        alert("カメラを起動できませんでした");
        window.location.href = "index.html";
    } finally {
        cameraStarting = false;
    }
}

function stopCamera() {
    if (cameraVideo) {
        cameraVideo.pause();
        cameraVideo.srcObject = null;
    }

    if (!currentStream) {
        return;
    }

    currentStream
        .getTracks()
        .forEach((track) => {
            track.stop();
        });

    currentStream = null;
}

async function switchCamera() {
    if (cameraStarting) {
        return;
    }

    facingMode =
        facingMode === "user"
            ? "environment"
            : "user";

    await startCamera();
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
        return;
    }

    const scale = Math.max(
        canvasWidth / imageWidth,
        canvasHeight / imageHeight
    );

    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

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
            offsetX,
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

function capturePhoto() {
    if (!isLandscape()) {
        return;
    }

    if (!currentStream) {
        return;
    }

    if (!cameraVideo || cameraVideo.readyState < 2) {
        return;
    }

    if (!selectedFrame) {
        openFramePanel();
        return;
    }

    if (
        !selectedFrameReady ||
        !selectedPhotoFrame.complete
    ) {
        openFramePanel();
        return;
    }

    captureCanvas.width = FRAME_WIDTH;
    captureCanvas.height = FRAME_HEIGHT;

    const ctx = captureCanvas.getContext("2d");

    if (!ctx) {
        alert("画像を作成できませんでした");
        return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.clearRect(
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

    previewImage.src =
        captureCanvas.toDataURL("image/png");

    previewArea.classList.remove("hidden");
}

function retakePhoto() {
    if (!previewArea) {
        return;
    }

    previewArea.classList.add("hidden");
}

/* =========================
   Save
========================= */

async function savePhoto() {
    captureCanvas.toBlob(
        async (blob) => {
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
                /*
                 * AbortError significa que o usuário apenas
                 * fechou a tela de compartilhamento.
                 */
                if (error.name === "AbortError") {
                    return;
                }

                console.error(
                    "Share error:",
                    error
                );

                downloadImage(blob);
            }
        },
        "image/png"
    );
}

function downloadImage(blob) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "photo-frame.png";

    document.body.appendChild(link);

    link.click();
    link.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}