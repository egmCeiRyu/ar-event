const frameGrid = document.getElementById("frameGrid");
const cameraPage = document.getElementById("cameraPage");
const video = document.getElementById("camera");
const photoFrame = document.getElementById("photoFrame");
const canvas = document.getElementById("captureCanvas");
const switchBtn = document.getElementById("switchBtn");
const captureBtn = document.getElementById("captureBtn");
const saveBtn = document.getElementById("saveBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
const previewArea = document.getElementById("previewArea");
const previewImage = document.getElementById("previewImage");
const retakeBtn = document.getElementById("retakeBtn");

let currentStream = null;
let facingMode = "user";
let capturedBlob = null;

const frames = Array.from({ length: 14 }, () => "assets/photoframe/frame01.webp");

frames.forEach((src, index) => {
    const btn = document.createElement("button");
    btn.className = "frame-btn";

    btn.innerHTML = `<img src="${src}" alt="frame ${index + 1}">`;

    btn.addEventListener("click", () => {
        photoFrame.src = src;
        openCamera();
    });

    frameGrid.appendChild(btn);
});

async function openCamera() {
    cameraPage.classList.remove("hidden");
    await startCamera();
}

async function startCamera() {
    stopCamera();

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 }
        },
        audio: false
    });

    video.srcObject = currentStream;
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

switchBtn.addEventListener("click", async () => {
    facingMode = facingMode === "user" ? "environment" : "user";
    await startCamera();
});

captureBtn.addEventListener("click", async () => {
    const w = 1080;
    const h = 1920;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, w, h);
    ctx.drawImage(photoFrame, 0, 0, w, h);

    canvas.toBlob(blob => {
        capturedBlob = blob;
        previewImage.src = URL.createObjectURL(blob);
        previewArea.classList.remove("hidden");
        saveBtn.classList.remove("hidden");
    }, "image/png");
});

saveBtn.addEventListener("click", () => {
    if (!capturedBlob) return;

    const url = URL.createObjectURL(capturedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "photo-frame.png";
    a.click();
    URL.revokeObjectURL(url);
});

retakeBtn.addEventListener("click", () => {
    previewArea.classList.add("hidden");
    saveBtn.classList.add("hidden");
    capturedBlob = null;
});

closeCameraBtn.addEventListener("click", () => {
    stopCamera();
    cameraPage.classList.add("hidden");
    previewArea.classList.add("hidden");
    saveBtn.classList.add("hidden");
});