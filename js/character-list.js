import { characters } from "./data/characters.js";

const characterGrid = document.getElementById("characterGrid");

let USER_ID = null;
let unlockedCharacterIds = new Set();

async function initCharacterList() {
    await loginUser();
    await loadUnlockedCharacters();
    renderCharacterGrid();
}

async function loginUser() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session?.user) {
        USER_ID = session.user.id;
        return;
    }

    const { data, error } =
        await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error(error);
        return;
    }

    USER_ID = data.user.id;
}

async function loadUnlockedCharacters() {
    if (!USER_ID) return;

    const { data, error } =
        await supabaseClient
            .from("user_stamps")
            .select("character_id")
            .eq("user_id", USER_ID);

    if (error) {
        console.error(error);
        return;
    }

    unlockedCharacterIds = new Set(
        data.map(item => item.character_id)
    );
}

function renderCharacterGrid() {
    if (!characterGrid) return;

    characterGrid.innerHTML = "";

    characters.forEach(character => {
        const isUnlocked =
            unlockedCharacterIds.has(character.id);

        const card = document.createElement("button");

        card.type = "button";

        card.className = isUnlocked
            ? "character-card unlocked"
            : "character-card locked";

        card.disabled = !isUnlocked;

        card.dataset.characterId = character.id;

        card.innerHTML = `
            <div class="character-image-wrap">
                <img src="${character.portrait}" alt="${character.name}">
                ${isUnlocked ? "" : `<div class="lock-icon">🔒</div>`}
            </div>

            <div class="character-name">
                ${character.name}
            </div>

            <div class="character-status">
                ${isUnlocked ? "ARで見る" : "未取得"}
            </div>
        `;

        if (isUnlocked) {
            card.addEventListener("click", () => {
                location.href =
                    `character-ar.html?id=${character.id}`;
            });
        }

        characterGrid.appendChild(card);
    });
}

initCharacterList();