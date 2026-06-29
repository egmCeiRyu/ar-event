const cameraVideo = document.getElementById("cameraVideo");
const selectedPhotoFrame = document.getElementById("selectedPhotoFrame");
const captureCanvas = document.getElementById("captureCanvas");

const frameCarousel = document.getElementById("frameCarousel");
const captureBtn = document.getElementById("captureBtn");
const closeFrameBtn = document.getElementById("closeFrameBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");

const previewArea = document.getElementById("previewArea");
const previewImage = document.getElementById("previewImage");
const retakeBtn = document.getElementById("retakeBtn");
const saveBtn = document.getElementById("saveBtn");

let currentStream = null;
let facingMode = "user";
let selectedFrame = null;

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1920;

const frameCount = 40;

const frames = Array.from({ length: frameCount }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
        full: `assets/photoframe/frame${number}.webp`,
        thumb: `assets/photoframe/thumbs/frame${number}.webp`
    };
});

initialize();

async function initialize() {
    createCarousel();
    bindEvents();
    await startCamera();
}

function createCarousel() {
    frames.forEach((frame, index) => {
        const btn = document.createElement("button");
        btn.className = "frame-btn";

        btn.innerHTML = `
            <img src="${frame.thumb}" alt="フレーム${index + 1}">
        `;

        btn.addEventListener("click", () => {
            selectFrame(frame.full);
        });

        frameCarousel.appendChild(btn);
    });
}

function bindEvents() {
    captureBtn.addEventListener("click", capturePhoto);
    closeFrameBtn.addEventListener("click", cancelFrameSelection);
    switchCameraBtn.addEventListener("click", switchCamera);
    retakeBtn.addEventListener("click", retakePhoto);
    saveBtn.addEventListener("click", savePhoto);

    window.addEventListener("beforeunload", stopCamera);
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
        alert("カメラを起動できませんでした");
        console.error(error);
        window.location.href = "index.html";
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

async function switchCamera() {
    facingMode = facingMode === "user" ? "environment" : "user";
    await startCamera();
}

function selectFrame(frameSrc) {
    selectedFrame = frameSrc;

    selectedPhotoFrame.src = selectedFrame;
    selectedPhotoFrame.style.display = "block";

    frameCarousel.classList.add("hidden");

    captureBtn.classList.add("visible");
    closeFrameBtn.classList.add("visible");
    switchCameraBtn.classList.add("visible");
}

function cancelFrameSelection() {
    selectedFrame = null;

    selectedPhotoFrame.removeAttribute("src");
    selectedPhotoFrame.style.display = "none";

    captureBtn.classList.remove("visible");
    closeFrameBtn.classList.remove("visible");
    switchCameraBtn.classList.remove("visible");

    frameCarousel.classList.remove("hidden");
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
        return;
    }

    const width = FRAME_WIDTH;
    const height = FRAME_HEIGHT;

    captureCanvas.width = width;
    captureCanvas.height = height;

    const ctx = captureCanvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    drawCover(ctx, cameraVideo, width, height);
    ctx.drawImage(selectedPhotoFrame, 0, 0, width, height);

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
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
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