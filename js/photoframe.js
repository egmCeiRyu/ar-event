const cameraVideo = document.getElementById("cameraVideo");
const selectedPhotoFrame = document.getElementById("selectedPhotoFrame");
const captureCanvas = document.getElementById("captureCanvas");

const livePreviewCanvas =
    document.getElementById("livePreviewCanvas");

const livePreviewContext =
    livePreviewCanvas
        ? livePreviewCanvas.getContext("2d", {
            alpha: true
        })
        : null;

let livePreviewRunning = false;
let livePreviewProcessing = false;

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

let previewObjectUrl = null;
let capturedPhotoBlob = null;

let selfieSegmentation = null;
let segmentationReady = false;

let segmentationResolve = null;
let segmentationReject = null;
let segmentationTimeout = null;

let selectedBackgroundImage = null;

const personCanvas = document.createElement("canvas");

const personContext = personCanvas.getContext(
    "2d",
    {
        alpha: true
    }
);

let currentStream = null;
let cameraStarting = false;
let cameraSwitching = false;
let captureInProgress = false;

let facingMode = "user";

let selectedFrame = null;
let selectedFrameReady = false;

let orientationTimer = null;

const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

const TOTAL_FRAMES = 3;
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

    initializeSelfieSegmentation();

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

    if (!currentStream && !cameraStarting) {
        await startCamera();
    }
}

async function handlePageShow() {
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

        startLivePreview();

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

async function selectFrame(frame, button) {
    selectedFrame = frame.full;
    selectedFrameReady = false;
    selectedBackgroundImage = null;

    document
        .querySelectorAll(".frame-btn")
        .forEach((btn) => {
            btn.classList.remove("selected");
        });

    button.classList.add("selected");
    button.disabled = true;

    try {
        selectedBackgroundImage =
            await loadImage(frame.full);

        selectedFrameReady = true;

        /*
         * Não existe foreground.
         * Por isso, escondemos a imagem sobre a câmera.
         */
        if (selectedPhotoFrame) {
            selectedPhotoFrame.src = frame.full;
            selectedPhotoFrame.style.display = "block";
        }
    } catch (error) {
        console.error(
            "Background load error:",
            error
        );

        selectedFrame = null;
        selectedFrameReady = false;
        selectedBackgroundImage = null;

        button.classList.remove("selected");

        alert("フレームを読み込めませんでした");
    } finally {
        button.disabled = false;
    }
}

/* =========================
   MediaPipe
========================= */

function initializeSelfieSegmentation() {
    if (typeof SelfieSegmentation === "undefined") {
        console.error(
            "MediaPipe SelfieSegmentation not loaded"
        );

        return;
    }

    selfieSegmentation =
        new SelfieSegmentation({
            locateFile: (file) => {
                return (
                    "https://cdn.jsdelivr.net/npm/" +
                    "@mediapipe/selfie_segmentation/" +
                    file
                );
            }
        });

    selfieSegmentation.setOptions({
        modelSelection: 1,
        selfieMode: false
    });

    selfieSegmentation.onResults(
        handleSegmentationResults
    );

    segmentationReady = true;
}

function handleSegmentationResults(results) {
    if (segmentationTimeout) {
        window.clearTimeout(
            segmentationTimeout
        );

        segmentationTimeout = null;
    }

    if (!segmentationResolve) {
        return;
    }

    const resolve =
        segmentationResolve;

    segmentationResolve = null;
    segmentationReject = null;

    resolve(results);
}

function segmentCurrentCameraFrame() {
    return new Promise((resolve, reject) => {
        if (
            !selfieSegmentation ||
            !segmentationReady
        ) {
            reject(
                new Error(
                    "Segmentation unavailable"
                )
            );

            return;
        }

        segmentationResolve = resolve;
        segmentationReject = reject;

        segmentationTimeout =
            window.setTimeout(() => {
                segmentationResolve = null;
                segmentationReject = null;
                segmentationTimeout = null;

                reject(
                    new Error(
                        "Segmentation timeout"
                    )
                );
            }, 12000);

        selfieSegmentation
            .send({
                image: cameraVideo
            })
            .catch((error) => {
                if (segmentationTimeout) {
                    window.clearTimeout(
                        segmentationTimeout
                    );

                    segmentationTimeout = null;
                }

                segmentationResolve = null;
                segmentationReject = null;

                reject(error);
            });
    });
}

function createPersonCutout(results) {
    if (
        !personContext ||
        !results ||
        !results.segmentationMask
    ) {
        throw new Error(
            "Invalid segmentation result"
        );
    }

    personCanvas.width =
        FRAME_WIDTH;

    personCanvas.height =
        FRAME_HEIGHT;

    personContext.clearRect(
        0,
        0,
        FRAME_WIDTH,
        FRAME_HEIGHT
    );

    personContext.save();

    /*
     * Desenha a máscara da pessoa.
     */
    drawCover(
        personContext,
        results.segmentationMask,
        FRAME_WIDTH,
        FRAME_HEIGHT,
        facingMode === "user"
    );

    /*
     * Mantém a câmera somente dentro da máscara.
     */
    personContext.globalCompositeOperation =
        "source-in";

    drawCover(
        personContext,
        results.image || cameraVideo,
        FRAME_WIDTH,
        FRAME_HEIGHT,
        facingMode === "user"
    );

    /*
     * Volta ao modo normal.
     */
    personContext.globalCompositeOperation =
        "source-over";

    personContext.restore();
}


function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            resolve(image);
        };

        image.onerror = () => {
            reject(
                new Error(
                    `Could not load: ${source}`
                )
            );
        };

        image.src = source;
    });
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
    !selectedBackgroundImage
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

        ctx.clearRect(
            0,
            0,
            FRAME_WIDTH,
            FRAME_HEIGHT
        );

        const segmentationResults =
        await segmentCurrentCameraFrame();

        createPersonCutout(
            segmentationResults
        );

                /*
        * 1. Imagem completa da câmera.
        */
        drawCover(
            ctx,
            cameraVideo,
            FRAME_WIDTH,
            FRAME_HEIGHT,
            facingMode === "user"
        );

        /*
        * 2. Frame transparente por cima.
        */
        drawCover(
            ctx,
            selectedBackgroundImage,
            FRAME_WIDTH,
            FRAME_HEIGHT,
            false
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

    previewArea.classList.add("hidden");

    if (previewImage) {
        if (
            previewImage.src &&
            previewImage.src.startsWith("blob:")
        ) {
            URL.revokeObjectURL(
                previewImage.src
            );
        }

        previewImage.removeAttribute("src");
    }

    capturedPhotoBlob = null;
}
/* =========================
   Save
========================= */

async function savePhoto() {
    if (!capturedPhotoBlob) {
        alert("保存する画像がありません");
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
    }

    const file = new File(
        [capturedPhotoBlob],
        "photo-frame.png",
        {
            type: "image/png",
            lastModified: Date.now()
        }
    );

    try {
        if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({
                files: [file]
            })
        ) {
            await navigator.share({
                files: [file],
                title: "フォトフレーム"
            });

            return;
        }

        downloadImage(capturedPhotoBlob);
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error(
            "Save/share error:",
            error
        );

        downloadImage(capturedPhotoBlob);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
        }
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

    if (segmentationTimeout) {
        clearTimeout(segmentationTimeout);
        segmentationTimeout = null;
    }

    segmentationResolve = null;
    segmentationReject = null;

    if (
        selfieSegmentation &&
        typeof selfieSegmentation.close === "function"
    ) {
        selfieSegmentation.close();
    }

    selfieSegmentation = null;
    segmentationReady = false;

    capturedPhotoBlob = null;
}

const livePreviewCanvas =
    document.getElementById("livePreviewCanvas");

const livePreviewContext =
    livePreviewCanvas.getContext("2d", {
        alpha: false
    });

let livePreviewRunning = false;
let livePreviewProcessing = false;

    function startLivePreview() {
        if (
            livePreviewRunning ||
            !livePreviewCanvas ||
            !livePreviewContext
        ) {
            return;
        }

        livePreviewCanvas.width = FRAME_WIDTH;
        livePreviewCanvas.height = FRAME_HEIGHT;

        livePreviewRunning = true;

        renderLivePreview();
    }

    livePreviewRunning = true;

    async function render() {
        if (!livePreviewRunning) {
            return;
        }

        if (
            cameraVideo.readyState >=
                HTMLMediaElement.HAVE_CURRENT_DATA &&
            cameraVideo.videoWidth > 0 &&
            cameraVideo.videoHeight > 0 &&
            !livePreviewProcessing
        ) {
            livePreviewProcessing = true;

            try {
                livePreviewCanvas.width = FRAME_WIDTH;
                livePreviewCanvas.height = FRAME_HEIGHT;

                livePreviewContext.clearRect(
                    0,
                    0,
                    FRAME_WIDTH,
                    FRAME_HEIGHT
                );

                /*
                 * 1. Mundo real.
                 */
                drawCover(
                    livePreviewContext,
                    cameraVideo,
                    FRAME_WIDTH,
                    FRAME_HEIGHT,
                    facingMode === "user"
                );

                /*
                 * 2. Personagens.
                 */
                if (
                    selectedFrameReady &&
                    selectedBackgroundImage
                ) {
                    drawCover(
                        livePreviewContext,
                        selectedBackgroundImage,
                        FRAME_WIDTH,
                        FRAME_HEIGHT,
                        false
                    );

                    /*
                     * 3. Pessoa recortada na frente.
                     */
                    const results =
                        await segmentCurrentCameraFrame();

                    createPersonCutout(results);

                    livePreviewContext.drawImage(
                        personCanvas,
                        0,
                        0,
                        FRAME_WIDTH,
                        FRAME_HEIGHT
                    );
                }
            } catch (error) {
                console.warn(
                    "Live preview error:",
                    error
                );
            } finally {
                livePreviewProcessing = false;
            }
        }

        window.requestAnimationFrame(render);
    }

    window.requestAnimationFrame(render);
}