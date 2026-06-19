import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const debugText = document.getElementById("debugText");
const scanText = document.getElementById("scanText");
const scanFrame = document.getElementById("scanFrame");
const captureButton = document.getElementById("captureButton");

const targetList = [
    { index: 0, image: "./assets/characters/character01.webp", characterId: 4 },
    { index: 1, image: "./assets/characters/character02.webp", characterId: 5 },
    { index: 2, image: "./assets/characters/character03.webp", characterId: 6 }
];

const scannedCharacters = new Set();

let rendererRef = null;
let sceneRef = null;
let cameraRef = null;

function log(message) {
    console.log(message);
    if (debugText) debugText.textContent = message;
}

function setScanningUI(isScanning) {
    if (scanText) scanText.style.display = isScanning ? "block" : "none";
    if (scanFrame) scanFrame.style.display = isScanning ? "block" : "none";
}

function showMessage(message) {
    log(message);
}

async function getCurrentUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session && session.user) {
        return session.user;
    }

    const { data, error } = await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error("Anonymous login error:", error);
        showMessage("ログインエラー");
        return null;
    }

    return data.user;
}

async function saveCharacterStamp(characterId) {
    const user = await getCurrentUser();

    if (!user) {
        showMessage("ログインエラー");
        return;
    }

    const userId = user.id;

    const { data: existing, error: checkError } = await supabaseClient
        .from("user_stamps")
        .select("id")
        .eq("user_id", userId)
        .eq("character_id", characterId)
        .maybeSingle();

    if (checkError) {
        console.error("Check stamp error:", checkError);
        showMessage("通信エラー");
        return;
    }

    if (existing) {
        showMessage("このスタンプはすでに取得済みです");
        return;
    }

    const { error: insertError } = await supabaseClient
        .from("user_stamps")
        .insert({
            user_id: userId,
            character_id: characterId
        });

    if (insertError) {
        console.error("Insert stamp error:", insertError);
        showMessage("スタンプ保存エラー");
        return;
    }

    showMessage("スタンプをゲットしました！");
}

function createCharacterPlane(imagePath) {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(imagePath);

    const geometry = new THREE.PlaneGeometry(1, 1.4);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(geometry, material);

    plane.position.set(0, 0, 0);
    plane.scale.set(1, 1, 1);

    return plane;
}

async function startAR() {
    const mindarThree = new MindARThree({
        container: document.body,
        imageTargetSrc: "./assets/targets/targets.mind"
    });

    const { renderer, scene, camera } = mindarThree;

    rendererRef = renderer;
    sceneRef = scene;
    cameraRef = camera;

    targetList.forEach((targetData) => {
        const anchor = mindarThree.addAnchor(targetData.index);

        const character = createCharacterPlane(targetData.image);
        anchor.group.add(character);

        anchor.onTargetFound = async () => {
            setScanningUI(false);

            const characterId = targetData.characterId;

            if (!scannedCharacters.has(characterId)) {
                scannedCharacters.add(characterId);
                await saveCharacterStamp(characterId);
            } else {
                showMessage("このスタンプはすでに取得済みです");
            }
        };

        anchor.onTargetLost = () => {
            setScanningUI(true);
        };
    });

    await mindarThree.start();

    setScanningUI(true);
    log("カメラをマーカーに向けてください");

    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
    });
}

if (captureButton) {
    captureButton.addEventListener("click", () => {
        showMessage("撮影機能は後で追加します");
    });
}

startAR();