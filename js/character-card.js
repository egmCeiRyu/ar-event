import { characters } from "./data/characters.js";

const characterName = document.getElementById("characterName");
const characterCardImage = document.getElementById("characterCardImage");
const voiceButton = document.getElementById("voiceButton");
const closeButton = document.getElementById("closeButton");
const characterVoice = document.getElementById("characterVoice");

function getUrlParams() {
    const params = new URLSearchParams(location.search);

    return {
        id: Number(params.get("id")),
        from: params.get("from") || "rally"
    };
}

const { id } = getUrlParams();

const character = characters.find(item => item.id === id);

function initCharacterCard() {
    if (!character) {
        alert("キャラクターが見つかりませんでした。");
        location.href = "stamp-rally.html";
        return;
    }

    characterName.textContent = character.name;

    characterCardImage.src = character.card;
    characterCardImage.alt = character.name;

    characterVoice.src = character.voice;
}

function playVoice() {
    if (!characterVoice) return;

    characterVoice.pause();
    characterVoice.currentTime = 0;

    characterVoice.play().catch(error => {
        console.log("Voice play error:", error);
    });
}

function closeCard() {
    if (characterVoice) {
        characterVoice.pause();
        characterVoice.currentTime = 0;
    }

    location.href = "stamp-rally.html";
}

voiceButton.addEventListener("click", playVoice);
closeButton.addEventListener("click", closeCard);

initCharacterCard();