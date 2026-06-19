const frameGrid = document.getElementById("frameGrid");

let currentStream = null;
let facingMode = "user";
let selectedFrame = "assets/photoframe/frame01.webp";

const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 1600;

const frames = Array.from(
    { length: 14 },
    () => "assets/photoframe/frame01.webp"
);

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
    const oldCameraPage = document.getElementById("cameraPage");

    if (oldCameraPage) {
        oldCameraPage.remove();
    }

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
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = currentStream;
        await video.play();

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

function drawContain(ctx, img, canvasW, canvasH) {
    const imgW = img.videoWidth || img.naturalWidth;
    const imgH = img.videoHeight || img.naturalHeight;

    if (!imgW || !imgH) {
        return;
    }

    const scale = Math.min(canvasW / imgW, canvasH / imgH);

    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const x = (canvasW - drawW) / 2;
    const y = (canvasH - drawH) / 2;

    ctx.drawImage(img, x, y, drawW, drawH);
}

function capturePhoto() {
    const video = document.getElementById("cameraVideo");
    const frame = document.getElementById("selectedPhotoFrame");
    const canvas = document.getElementById("captureCanvas");
    const previewArea = document.getElementById("previewArea");
    const previewImage = document.getElementById("previewImage");

    const width = FRAME_WIDTH;
    const height = FRAME_HEIGHT;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    drawContain(ctx, video, width, height);

    ctx.drawImage(frame, 0, 0, width, height);

    previewImage.src = canvas.toDataURL("image/png");
    previewArea.classList.remove("hidden");
}

function retakePhoto() {
    const previewArea = document.getElementById("previewArea");
    previewArea.classList.add("hidden");
}

async function savePhoto() {
    const canvas = document.getElementById("captureCanvas");

    canvas.toBlob(async (blob) => {
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

function closeCamera() {
    stopCamera();

    const cameraPage = document.getElementById("cameraPage");

    if (cameraPage) {
        cameraPage.remove();
    }
}