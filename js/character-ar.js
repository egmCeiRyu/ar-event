import { characters } from "./data/characters.js";

const viewer = document.getElementById("characterViewer");
const portrait = document.getElementById("characterPortrait");
const nameLabel = document.getElementById("characterName");
const startButton = document.getElementById("startARButton");

function getCharacterId() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get("id"));
}

const characterId = getCharacterId();

const character = characters.find(c => c.id === characterId);

if (!character) {

    alert("キャラクターが見つかりません。");

    location.href = "character-list.html";

    throw new Error("Character not found");

}

portrait.src = character.portrait;
portrait.alt = character.name;

nameLabel.textContent = character.name;

viewer.src = character.model;

viewer.scale = `${character.scale} ${character.scale} ${character.scale}`;

viewer.setAttribute(
    "orientation",
    `0deg ${character.rotation}deg 0deg`
);

viewer.setAttribute(
    "shadow-intensity",
    character.shadow ? "1" : "0"
);

viewer.addEventListener("load", () => {

    console.log(`${character.name} loaded`);

});

viewer.addEventListener("error", (event) => {

    console.error(event);

    alert("モデルを読み込めませんでした。");

});

startButton.addEventListener("click", async () => {

    startButton.disabled = true;

    startButton.textContent = "AR起動中...";

    try {

        await viewer.activateAR();

    } catch (error) {

        console.error(error);

        alert("ARを開始できませんでした。");

    } finally {

        startButton.disabled = false;

        startButton.textContent = "ARスタート";

    }

});