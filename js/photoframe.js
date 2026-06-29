const cameraVideo = document.getElementById("cameraVideo");
const selectedPhotoFrame = document.getElementById("selectedPhotoFrame");
const captureCanvas = document.getElementById("captureCanvas");

const homeBtn = document.getElementById("homeBtn");
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
let facingMode = "user";
let selectedFrame = null;
let selectedFrameReady = false;

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1920;

const TOTAL_FRAMES = 40;
const ASSET_VERSION = "20260629_03";

const frames = Array.from({ length: TOTAL_FRAMES }, (_, index) => {
    const num = String(index + 1).padStart(2, "0");

    return {
        id: index + 1,
        full: `assets/photoframe/frame${num}.webp?v=${ASSET_VERSION}`,
        thumb: `assets/photoframe/thumbs/frame${num}.webp?v=${ASSET_VERSION}`
    };
});

initialize();

async function initialize() {
    createFrameCarousel();
    bindEvents();
    await startCamera();
}

function createFrameCarousel() {
    frameCarousel.innerHTML = "";

    frames.forEach((frame) => {
        const button = document.createElement("button");
        button.className = "frame-btn";
        button.type = "button";
        button.dataset.frame = String(frame.id);

        const img = document.createElement("img");
        img.src = frame.thumb;
        img.alt = `フレーム${frame.id}`;

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

function bindEvents() {
    homeBtn.addEventListener("click", () => {
        stopCamera();
    });

    if (switchCameraBtn) {
        switchCameraBtn.addEventListener("click", switchCamera);
    }

    openFramePanelBtn.addEventListener("click", openFramePanel);
    closeFramePanelBtn.addEventListener("click", closeFramePanel);

    captureBtn.addEventListener("click", capturePhoto);

    retakeBtn.addEventListener("click", retakePhoto);
    saveBtn.addEventListener("click", savePhoto);

    window.addEventListener("beforeunload", stopCamera);
    window.addEventListener("pagehide", stopCamera);
}

async function startCamera() {
    stopCamera();

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        cameraVideo.srcObject = currentStream;
        await cameraVideo.play();

    } catch (error) {
        console.error(error);
        alert("カメラを起動できませんでした");
        window.location.href = "index.html";
    }
}

function stopCamera() {
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
    facingMode =
        facingMode === "user"
            ? "environment"
            : "user";

    await startCamera();
}

function openFramePanel() {
    framePanel.classList.remove("hidden");
}

function closeFramePanel() {
    framePanel.classList.add("hidden");
}

function selectFrame(frame, button) {
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

function drawCover(ctx, img, canvasW, canvasH) {
    const imgW = img.videoWidth || img.naturalWidth;
    const imgH = img.videoHeight || img.naturalHeight;

    if (!imgW || !imgH) {
        return;
    }

    const scale = Math.max(canvasW / imgW, canvasH / imgH);

    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const x = (canvasW - drawW) / 2;
    const y = (canvasH - drawH) / 2;

    ctx.drawImage(img, x, y, drawW, drawH);
}

function capturePhoto() {
    if (!selectedFrame) {
        alert("フレームを選択してください");
        openFramePanel();
        return;
    }

    if (!selectedFrameReady || !selectedPhotoFrame.complete) {
        alert("フレームを読み込み中です");
        return;
    }

    captureCanvas.width = FRAME_WIDTH;
    captureCanvas.height = FRAME_HEIGHT;

    const ctx = captureCanvas.getContext("2d");

    ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

    drawCover(ctx, cameraVideo, FRAME_WIDTH, FRAME_HEIGHT);

    ctx.drawImage(
        selectedPhotoFrame,
        0,
        0,
        FRAME_WIDTH,
        FRAME_HEIGHT
    );

    previewImage.src = captureCanvas.toDataURL("image/png");
    previewArea.classList.remove("hidden");
}

function retakePhoto() {
    previewArea.classList.add("hidden");
}

async function savePhoto() {
    captureCanvas.toBlob(async (blob) => {
        if (!blob) {
            alert("画像を保存できませんでした");
            return;
        }

        const file = new File([blob], "photo-frame.png", {
            type: "image/png"
        });

        try {
            if (
                navigator.canShare &&
                navigator.canShare({ files: [file] })
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
            console.error(error);
            downloadImage(blob);
        }

    }, "image/png");
}

function downloadImage(blob) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "photo-frame.png";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}