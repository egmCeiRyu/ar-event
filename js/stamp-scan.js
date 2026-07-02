import * as THREE from "three";
import { MindARThree } from "mindar-image-three";
import { characters } from "./data/characters.js";

const debugText = document.getElementById("debugText");
const scanText = document.getElementById("scanText");
const startARButton = document.getElementById("startARButton");
const stampMessage = document.getElementById("stampMessage");
const safetyMessage = document.getElementById("safetyMessage");

const characterModal = document.getElementById("characterModal");
const modalCharacterName = document.getElementById("modalCharacterName");
const modalCharacterImage = document.getElementById("modalCharacterImage");
const modalText = document.getElementById("modalText");
const modalCloseButton = document.getElementById("modalCloseButton");
const characterScanVoice = document.getElementById("characterScanVoice");

const characterVoiceButton = document.getElementById("characterVoiceButton");

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
    if (document.body.classList.contains("modal-open")) return;

    stampMessage.textContent = message;
    stampMessage.style.display = "block";

    setTimeout(() => {
        stampMessage.style.display = "none";
    }, 900);
}

function hideScanOverlays() {
    if (scanText) scanText.style.display = "none";
    if (safetyMessage) safetyMessage.style.display = "none";
    if (debugText) debugText.style.display = "none";
    if (stampMessage) stampMessage.style.display = "none";

    document
        .querySelectorAll(".mindar-ui-overlay, .mindar-ui-scanning, .mindar-ui-loading")
        .forEach(element => {
            element.style.display = "none";
            element.style.opacity = "0";
            element.style.pointerEvents = "none";
        });
}

function setScanningUI(isScanning) {
    if (document.body.classList.contains("modal-open")) {
        hideScanOverlays();
        return;
    }

    if (scanText) {
        scanText.style.display = isScanning ? "block" : "none";
    }

    if (safetyMessage) {
        safetyMessage.style.display = isScanning ? "block" : "none";
    }
}

function playCharacterVoice(character) {
    if (!characterScanVoice || !character?.voice) return;

    characterScanVoice.pause();
    characterScanVoice.currentTime = 0;

    characterScanVoice.src = character.voice;
    characterScanVoice.muted = false;
    characterScanVoice.volume = 1;

    return characterScanVoice.play().catch(error => {
        console.log("Voice play error:", error);
    });
}

function stopCharacterVoice() {
    if (!characterScanVoice) return;

    characterScanVoice.pause();
    characterScanVoice.currentTime = 0;
}

function openCharacterModal(character, alreadyOwned = false) {
    document.body.classList.add("modal-open");

    hideScanOverlays();

    if (modalCharacterName) {
        modalCharacterName.textContent = character.name;
    }

    if (modalCharacterImage) {
        modalCharacterImage.src = character.card;
        modalCharacterImage.alt = character.name;
    }

    if (modalText) {
        modalText.textContent = alreadyOwned
            ? "このキャラクターはすでに取得済みです。"
            : "キャラクターカードを獲得しました！";
    }

    if (characterModal) {
        characterModal.classList.remove("hidden");
    }

    setTimeout(async () => {
        try {
            await playCharacterVoice(character);
        } catch (e) {
            console.log(e);
        }
    }, 250);

    if (characterVoiceButton) {
        characterVoiceButton.onclick = async () => {
            characterVoiceButton.disabled = true;

            try {
                await playCharacterVoice(character);
            } finally {
                setTimeout(() => {
                    characterVoiceButton.disabled = false;
                }, 300);
            }
        };
    }
}

function closeCharacterModal() {
    document.body.classList.remove("modal-open");

    stopCharacterVoice();

    location.href = "stamp-rally.html";
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
        openCharacterModal(character, true);
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

    // const completed = await hasCompletedAllStamps(user.id);

    // if (completed) {

    //     location.href = "complete.html";

    // } else {

    //     openCharacterModal(character, false);

    // }

    openCharacterModal(character, false);

    return true;
}

async function hasCompletedAllStamps(userId) {

    const { count, error } = await supabaseClient
        .from("user_stamps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    if (error) {
        console.error(error);
        return false;
    }

    return count >= characters.length;

}

function fixMindARVideoLayer() {
    const container = document.querySelector("#arContainer");

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

            let foundTimer = null;
            let foundConfirmed = false;

            anchor.onTargetFound = () => {
                if (document.body.classList.contains("modal-open")) return;
                if (foundConfirmed) return;

                hideScanOverlays();

                clearTimeout(foundTimer);

                foundTimer = setTimeout(async () => {
                    if (document.body.classList.contains("modal-open")) return;
                    if (foundConfirmed) return;

                    foundConfirmed = true;

                    log(`${character.name} 検出`);

                    if (scannedCharacters.has(character.id)) return;

                    scannedCharacters.add(character.id);

                    await saveCharacterStamp(character);
                }, 400);
            };

            anchor.onTargetLost = () => {
                clearTimeout(foundTimer);
                foundConfirmed = false;

                if (document.body.classList.contains("modal-open")) {
                    hideScanOverlays();
                    return;
                }

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
        document.body.classList.remove("modal-open");

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

if (modalCloseButton) {
    modalCloseButton.addEventListener("click", closeCharacterModal);
}

window.addEventListener("pagehide", stopCharacterVoice);
