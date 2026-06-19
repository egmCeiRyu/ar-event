import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const debugText = document.getElementById("debugText");
const scanText = document.getElementById("scanText");
const scanFrame = document.getElementById("scanFrame");
const captureButton = document.getElementById("captureButton");

const targetList = [
    {
        index: 0,
        image: "./assets/characters/character01.webp",
        characterId: 4
    },
    {
        index: 1,
        image: "./assets/characters/character02.webp",
        characterId: 5
    },
    {
        index: 2,
        image: "./assets/characters/character03.webp",
        characterId: 6
    }
];

function log(message) {
    console.log(message);
    if (debugText) debugText.textContent = message;
}

function setScanningUI(isScanning) {
    scanText.style.display = isScanning ? "block" : "none";
    scanFrame.style.display = isScanning ? "block" : "none";
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

    const height = 1.0;
    const width = height * aspect;

    const geometry = new THREE.PlaneGeometry(width, height);

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, 0.45, 0);
    mesh.scale.set(0.001, 0.001, 0.001);

    return mesh;
}

function fixMindARVideoLayer() {
    const container = document.querySelector("#arContainer");
    const videos = container.querySelectorAll("video");
    const canvases = container.querySelectorAll("canvas");

    videos.forEach(video => {
        video.style.position = "absolute";
        video.style.inset = "0";
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        video.style.zIndex = "1";
    });

    canvases.forEach(canvas => {
        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.background = "transparent";
        canvas.style.zIndex = "2";
    });
}

async function startAR() {
    try {
        log("MindAR読み込み中...");

        const mindarThree = new MindARThree({
            container: document.querySelector("#arContainer"),
            imageTargetSrc: "./assets/targets/targets.mind",
            maxTrack: 1
        });

        const { renderer, scene, camera } = mindarThree;

        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const meshes = [];

        for (const item of targetList) {
            const anchor = mindarThree.addAnchor(item.index);
            const texture = await loadTexture(item.image);
            const mesh = createCharacterMesh(texture);

            anchor.group.add(mesh);

            meshes[item.index] = {
                mesh,
                visible: false
            };

            anchor.onTargetFound = () => {
                log(`marker${item.index + 1} 検出`);
                meshes[item.index].visible = true;
                setScanningUI(false);
            };

            anchor.onTargetLost = () => {
                log("マーカーをスキャンしてください");
                meshes[item.index].visible = false;
                mesh.scale.set(0.001, 0.001, 0.001);
                setScanningUI(true);
            };
        }

        log("カメラ起動中...");

        await mindarThree.start();

        fixMindARVideoLayer();

        setTimeout(fixMindARVideoLayer, 500);
        setTimeout(fixMindARVideoLayer, 1500);

        log("マーカーをスキャンしてください");
        setScanningUI(true);

        renderer.setAnimationLoop(() => {
            meshes.forEach(item => {
                if (!item) return;

                const mesh = item.mesh;

                if (item.visible) {
                    const s = THREE.MathUtils.lerp(mesh.scale.x, 1, 0.12);
                    mesh.scale.set(s, s, s);
                    mesh.position.y = 0.45;
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

captureButton.addEventListener("click", () => {
    const canvas = document.querySelector("#arContainer canvas");

    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "ar-character.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});

startAR();