import * as THREE from "three";
import { MindARThree } from "mindar-image-three";
import { characters } from "./data/characters.js";

const debugText = document.getElementById("debugText");
const scanText = document.getElementById("scanText");
const startARButton = document.getElementById("startARButton");
const stampMessage = document.getElementById("stampMessage");
const safetyMessage = document.getElementById("safetyMessage");

const scannedCharacters = new Set();

let arStarted = false;

function log(message) {
    console.log(message);

    if (debugText) {
        debugText.textContent = message;
    }
}

function showStampMessage(message) {
    if (!stampMessage) return;

    stampMessage.textContent = message;
    stampMessage.style.display = "block";

    setTimeout(() => {
        stampMessage.style.display = "none";
    }, 1200);
}

function setScanningUI(isScanning) {
    if (scanText) {
        scanText.style.display = isScanning ? "block" : "none";
    }

    if (safetyMessage) {
        safetyMessage.style.display = isScanning ? "block" : "none";
    }
}

async function getCurrentUser() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session?.user) {
        return session.user;
    }

    const { data, error } =
        await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error(error);
        showStampMessage("ログインエラー");
        return null;
    }

    return data.user;
}

async function saveCharacterStamp(character) {
    const user = await getCurrentUser();

    if (!user) return false;

    const {
        data: existing,
        error: checkError
    } = await supabaseClient
        .from("user_stamps")
        .select("character_id")
        .eq("user_id", user.id)
        .eq("character_id", character.id)
        .maybeSingle();

    if (checkError) {
        console.error(checkError);
        showStampMessage("通信エラー");
        return false;
    }

    if (existing) {
        showStampMessage("取得済みです");

        setTimeout(() => {
            location.href =
                `character-card.html?id=${character.id}&from=scan&autoplay=1`;
        }, 700);

        return true;
    }

    const { error } =
        await supabaseClient
            .from("user_stamps")
            .insert({
                user_id: user.id,
                character_id: character.id
            });

    if (error) {
        console.error(error);
        showStampMessage("保存エラー");
        return false;
    }

    showStampMessage("スタンプをゲットしました！");

    setTimeout(() => {
        location.href =
            `character-card.html?id=${character.id}&from=scan&autoplay=1`;
    }, 700);

    return true;
}

function fixMindARVideoLayer() {
    const container =
        document.querySelector("#arContainer");

    if (!container) return;

    container.querySelectorAll("video").forEach(video => {
        video.style.position = "absolute";
        video.style.inset = "0";
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        video.style.zIndex = "1";
    });

    container.querySelectorAll("canvas").forEach(canvas => {
        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.background = "transparent";
        canvas.style.zIndex = "2";
    });
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

        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        characters.forEach(character => {
            const anchor =
                mindarThree.addAnchor(character.markerIndex);

            anchor.onTargetFound = async () => {
                log(`${character.name} 検出`);

                setScanningUI(false);

                if (scannedCharacters.has(character.id)) return;

                scannedCharacters.add(character.id);

                await saveCharacterStamp(character);
            };

            anchor.onTargetLost = () => {
                log("マーカーをスキャンしてください");
                setScanningUI(true);
            };
        });

        log("カメラ起動中...");

        await mindarThree.start();

        fixMindARVideoLayer();

        setTimeout(fixMindARVideoLayer, 300);
        setTimeout(fixMindARVideoLayer, 800);
        setTimeout(fixMindARVideoLayer, 1500);

        log("マーカーをスキャンしてください");

        setScanningUI(true);

        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
        });

    } catch (error) {
        console.error(error);

        arStarted = false;
        document.body.classList.remove("is-ar-started");

        log("ERROR: " + error.message);

        alert("ARを開始できませんでした。");
    }
}

if (startARButton) {
    startARButton.addEventListener("click", async () => {
        document.body.classList.add("is-ar-started");

        await startAR();
    });
}