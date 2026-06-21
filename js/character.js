import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const debugText = document.getElementById("debugText");
const scanText = document.getElementById("scanText");
const scanFrame = document.getElementById("scanFrame");
const captureButton = document.getElementById("captureButton");
const startARButton = document.getElementById("startARButton");

const stampMessage = document.getElementById("stampMessage");
const stampGetSound = document.getElementById("stampGetSound");

const stampParticles = document.getElementById("stampParticles");

const stampGetOverlay = document.getElementById("stampGetOverlay");
const stampGetImage = document.getElementById("stampGetImage");

const safetyMessage = document.getElementById("safetyMessage");

const targetList = [
    { index: 0, image: "./assets/characters/character01.webp", characterId: 4 },
    { index: 1, image: "./assets/characters/character02.webp", characterId: 5 },
    { index: 2, image: "./assets/characters/character03.webp", characterId: 6 }
];

const stampImageMap = {
    4: "./assets/stamps/stamp01.png",
    5: "./assets/stamps/stamp02.png",
    6: "./assets/stamps/stamp03.png"
};

function showStampGetOverlay(characterId) {
    if (!stampGetOverlay || !stampGetImage) return;

    const imagePath = stampImageMap[characterId];
    if (!imagePath) return;

    stampGetImage.src = imagePath;

    stampGetOverlay.classList.remove("show");
    void stampGetOverlay.offsetWidth;
    stampGetOverlay.classList.add("show");

    setTimeout(() => {
        stampGetOverlay.classList.remove("show");
    }, 2400);
}

const scannedCharacters = new Set();

let rendererRef = null;
let sceneRef = null;
let cameraRef = null;
let arStarted = false;
let soundUnlocked = false;

const zeroPos = new THREE.Vector3(0, 0, 0);
const zeroQuat = new THREE.Quaternion();


function playStampParticles() {
    if (!stampParticles) return;

    stampParticles.innerHTML = "";

    for (let i = 0; i < 45; i++) {
        const particle = document.createElement("span");
        particle.className = "stamp-particle";

        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 140;

        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        particle.style.setProperty("--x", `${x}px`);
        particle.style.setProperty("--y", `${y}px`);

        stampParticles.appendChild(particle);
    }

    setTimeout(() => {
        stampParticles.innerHTML = "";
    }, 900);
}


function log(message) {
    console.log(message);
    if (debugText) debugText.textContent = message;
}

function showStampMessage(message) {
    if (!stampMessage) return;

    stampMessage.textContent = message;
    stampMessage.style.display = "block";

    setTimeout(() => {
        stampMessage.style.display = "none";
    }, 1800);
}

function unlockStampSound() {
    if (!stampGetSound || soundUnlocked) return;

    stampGetSound.pause();
    stampGetSound.currentTime = 0;
    stampGetSound.volume = 1;
    stampGetSound.muted = false;
    stampGetSound.load();

    soundUnlocked = true;
    console.log("Stamp sound prepared");
}

function playStampSound() {
    if (!stampGetSound) return;

    stampGetSound.muted = false;
    stampGetSound.volume = 1;
    stampGetSound.pause();
    stampGetSound.currentTime = 0;

    stampGetSound.play().catch(error => {
        console.log("Sound play failed:", error);
    });
}

function setScanningUI(isScanning) {

    if (scanText) {
        scanText.style.display = isScanning ? "block" : "none";
    }

    if (scanFrame) {
        scanFrame.style.display = isScanning ? "block" : "none";
    }

    if (safetyMessage) {
        safetyMessage.style.display = isScanning ? "block" : "none";
    }

}

async function getCurrentUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session?.user) return session.user;

    const { data, error } = await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error("Anonymous login error:", error);
        showStampMessage("ログインエラー");
        return null;
    }

    return data.user;
}

async function saveCharacterStamp(characterId) {
    const user = await getCurrentUser();

    if (!user) {
        showStampMessage("ログインエラー");
        return false;
    }

    const { data: existing, error: checkError } = await supabaseClient
        .from("user_stamps")
        .select("id")
        .eq("user_id", user.id)
        .eq("character_id", characterId)
        .maybeSingle();

    if (checkError) {
        console.error("Check stamp error:", checkError);
        showStampMessage("通信エラー");
        return false;
    }

    if (existing) {
        showStampMessage("このスタンプはすでに取得済みです");
        return true;
    }

    const { error: insertError } = await supabaseClient
        .from("user_stamps")
        .insert({
            user_id: user.id,
            character_id: characterId
        });

    if (insertError) {
        console.error("Insert stamp error:", insertError);
        showStampMessage("スタンプ保存エラー");
        return false;
    }

    playStampSound();
    showStampGetOverlay(characterId);
    showStampMessage("スタンプをゲットしました！");
    return true;
}

function loadTexture(path) {
    const loader = new THREE.TextureLoader();

    return new Promise((resolve, reject) => {
        loader.load(
            path,
            texture => {
                texture.colorSpace = THREE.SRGBColorSpace;
                resolve(texture);
            },
            undefined,
            error => reject(error)
        );
    });
}

function createCharacterMesh(texture) {
    const aspect = texture.image.width / texture.image.height;
    const height = 3.0;
    const width = height * aspect;

    const geometry = new THREE.PlaneGeometry(width, height);

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, 0.05, 0);
    mesh.scale.set(0.001, 0.001, 0.001);

    return mesh;
}

function fixMindARVideoLayer() {
    const container = document.querySelector("#arContainer");
    if (!container) return;

    const videos = container.querySelectorAll("video");
    const canvases = container.querySelectorAll("canvas");

    videos.forEach(video => {
        video.style.position = "absolute";
        video.style.inset = "0";
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        video.style.zIndex = "1";
        video.style.pointerEvents = "none";
    });

    canvases.forEach(canvas => {
        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.background = "transparent";
        canvas.style.zIndex = "2";
        canvas.style.pointerEvents = "none";
    });
}

function getCompositedCanvas() {
    const container = document.querySelector("#arContainer");
    const video = container?.querySelector("video");
    const webglCanvas = container?.querySelector("canvas");

    if (!video || !webglCanvas) return null;

    const width = webglCanvas.width;
    const height = webglCanvas.height;

    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;

    const ctx = output.getContext("2d");

    ctx.drawImage(video, 0, 0, width, height);
    ctx.drawImage(webglCanvas, 0, 0, width, height);

    return output;
}

async function capturePhoto() {
    try {
        if (rendererRef && sceneRef && cameraRef) {
            rendererRef.render(sceneRef, cameraRef);
        }

        const canvas = getCompositedCanvas();

        if (!canvas) {
            alert("写真を撮れませんでした。");
            return;
        }

        canvas.toBlob(async blob => {
            if (!blob) return;

            const file = new File([blob], "ARCharacter.png", {
                type: "image/png"
            });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: "AR Character",
                        text: "AR Event"
                    });
                } catch (error) {
                    console.log("Share canceled:", error);
                }
            } else {
                const link = document.createElement("a");
                link.download = "ARCharacter.png";
                link.href = URL.createObjectURL(blob);
                link.click();
            }
        }, "image/png");

    } catch (error) {
        console.error(error);
        alert("Capture error: " + error.message);
    }
}

async function startAR() {
    if (arStarted) return;
    arStarted = true;

    try {
        log("MindAR読み込み中...");

        const mindarThree = new MindARThree({
            container: document.querySelector("#arContainer"),
            imageTargetSrc: "./assets/targets/targets.mind",
            maxTrack: 1,
            filterMinCF: 0.001,
            filterBeta: 0.01
        });

        const { renderer, scene, camera } = mindarThree;

        rendererRef = renderer;
        sceneRef = scene;
        cameraRef = camera;

        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const meshes = [];

        for (const item of targetList) {
            const anchor = mindarThree.addAnchor(item.index);

            const smoothGroup = new THREE.Group();
            anchor.group.add(smoothGroup);

            const texture = await loadTexture(item.image);
            const mesh = createCharacterMesh(texture);

            smoothGroup.add(mesh);

            meshes[item.index] = {
                mesh,
                smoothGroup,
                visible: false
            };

            anchor.onTargetFound = async () => {
                log(`marker${item.index + 1} 検出`);

                    meshes.forEach(m => {
                        if (!m) return;
                        m.visible = false;
                        m.mesh.scale.set(0.001, 0.001, 0.001);
                    });

                meshes[item.index].visible = true;
                setScanningUI(false);

                const characterId = item.characterId;

                if (!scannedCharacters.has(characterId)) {
                    const saved = await saveCharacterStamp(characterId);

                    if (saved) {
                        scannedCharacters.add(characterId);
                    }
                } else {
                    showStampMessage("このスタンプはすでに取得済みです");
                }

                if (captureButton) {
                    captureButton.classList.add("show");
                }
            };

            anchor.onTargetLost = () => {
                log("マーカーをスキャンしてください");

                meshes[item.index].visible = false;
                mesh.scale.set(0.001, 0.001, 0.001);

                setScanningUI(true);

                if (captureButton) {
                    captureButton.classList.remove("show");
                }
            };
        }

        log("カメラ起動中...");

        await mindarThree.start();

        fixMindARVideoLayer();
        setTimeout(fixMindARVideoLayer, 300);
        setTimeout(fixMindARVideoLayer, 800);
        setTimeout(fixMindARVideoLayer, 1500);

        log("マーカーをスキャンしてください");
        setScanningUI(true);

        renderer.setAnimationLoop(() => {
            meshes.forEach(item => {
                if (!item) return;

                const mesh = item.mesh;

                if (item.visible) {
                    const s = THREE.MathUtils.lerp(mesh.scale.x, 1, 0.25);
                    mesh.scale.set(s, s, s);

                    mesh.position.set(0, 0.05, 0);

                    mesh.quaternion.copy(camera.quaternion);

                    item.smoothGroup.position.lerp(zeroPos, 0.12);
                }
            });

            renderer.render(scene, camera);
        });

    } catch (error) {
        console.error(error);
        log("ERROR: " + error.message);
        alert("AR Error: " + error.message);
    }
}

if (captureButton) {
    captureButton.addEventListener("click", capturePhoto);
}

if (startARButton) {
    startARButton.addEventListener("click", async () => {
        unlockStampSound();

        startARButton.style.display = "none";

        await startAR();
    });
}