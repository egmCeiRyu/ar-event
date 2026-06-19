const frameGrid = document.getElementById("frameGrid");

let currentStream = null;
let facingMode = "user";
let selectedFrame = "assets/photoframe/frame01.webp";

const frames = Array.from({ length: 14 }, () => "assets/photoframe/frame01.webp");

frames.forEach((src, index) => {
    const btn = document.createElement("button");
    btn.className = "frame-btn";

    btn.innerHTML = `
        <img src="${src}" alt="フレーム${index + 1}">
    `;

    btn.addEventListener("click", () => {
        selectedFrame = src;
        openCamera();
    });

    frameGrid.appendChild(btn);
});

function createCameraPage() {
    const cameraPage = document.createElement("div");
    cameraPage.id = "cameraPage";

    cameraPage.innerHTML = `
        <video id="cameraVideo" autoplay playsinline muted></video>

        <img id="selectedPhotoFrame" src="${selectedFrame}" alt="フォトフレーム">

        <canvas id="captureCanvas"></canvas>

        <div class="camera-bottom">
            <button id="backToFramesBtn" class="round-btn">戻る</button>
            <button id="captureBtn" class="capture-btn">撮影</button>
            <button id="switchCameraBtn" class="round-btn">切替</button>
        </div>

        <div id="previewArea" class="preview-area hidden">
            <img id="previewImage" alt="プレビュー">

            <div class="preview-bottom">
                <button id="retakeBtn">撮り直す</button>
                <button id="saveBtn">保存</button>
            </div>
        </div>
    `;

    document.body.appendChild(cameraPage);
}

async function openCamera() {
    createCameraPage();

    await startCamera();

    document.getElementById("backToFramesBtn").addEventListener("click", closeCamera);
    document.getElementById("captureBtn").addEventListener("click", capturePhoto);
    document.getElementById("switchCameraBtn").addEventListener("click", switchCamera);
    document.getElementById("retakeBtn").addEventListener("click", retakePhoto);
    document.getElementById("saveBtn").addEventListener("click", savePhoto);
}

async function startCamera() {
    stopCamera();

    const video = document.getElementById("cameraVideo");

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1080 },
                height: { ideal: 1920 }
            },
            audio: false
        });

        video.srcObject = currentStream;
    } catch (error) {
        alert("カメラを起動できませんでした");
        console.error(error);
        closeCamera();
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

function capturePhoto() {
    const video = document.getElementById("cameraVideo");
    const frame = document.getElementById("selectedPhotoFrame");
    const canvas = document.getElementById("captureCanvas");
    const previewArea = document.getElementById("previewArea");
    const previewImage = document.getElementById("previewImage");

    const width = 1080;
    const height = 1920;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, width, height);
    ctx.drawImage(frame, 0, 0, width, height);

    previewImage.src = canvas.toDataURL("image/png");
    previewArea.classList.remove("hidden");
}

function retakePhoto() {
    document.getElementById("previewArea").classList.add("hidden");
}

function savePhoto() {
    const canvas = document.getElementById("captureCanvas");

    const link = document.createElement("a");
    link.download = "photo-frame.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function closeCamera() {
    stopCamera();

    const cameraPage = document.getElementById("cameraPage");

    if (cameraPage) {
        cameraPage.remove();
    }
}