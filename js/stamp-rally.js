import { characters } from "./data/characters.js";

const MAX_STAMPS = characters.length;

let USER_ID = null;
let confettiPlayed = false;

async function initStampRally() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session?.user) {
        USER_ID = session.user.id;
    } else {
        const { data, error } =
            await supabaseClient.auth.signInAnonymously();

        if (error) {
            console.error(error);
            return;
        }

        USER_ID = data.user.id;
    }

    await loadStamps();
}

async function loadStamps() {
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

    document.querySelectorAll(".stamp-card").forEach(card => {
        card.classList.add("locked");
        card.classList.remove("unlocked");

        card.disabled = true;
        card.onclick = null;
    });

    const unlocked = new Set();

    data.forEach(item => {
        const character =
            characters.find(c => c.id === item.character_id);

        if (!character) return;

        const card =
            document.querySelector(
                `.stamp-card[data-character-id="${character.id}"]`
            );

        if (!card) return;

        card.classList.remove("locked");
        card.classList.add("unlocked");

        card.disabled = false;

        card.onclick = () => {
            location.href =
                `character-card.html?id=${character.id}&from=rally`;
        };

        unlocked.add(character.id);
    });

    updateStampLevel(unlocked.size);

    if (unlocked.size >= MAX_STAMPS) {
        launchConfetti();
    }
}

function updateStampLevel(total) {
    const percent =
        Math.min((total / MAX_STAMPS) * 100, 100);

    const progressText =
        document.getElementById("progressText");

    const progressFill =
        document.getElementById("progressFill");

    const rewardBox =
        document.getElementById("rewardBox");

    const completeBox =
        document.getElementById("completeBox");

    if (progressText) {
        progressText.textContent =
            `${total} / ${MAX_STAMPS}`;
    }

    if (progressFill) {
        progressFill.style.width =
            `${percent}%`;
    }

    if (rewardBox && completeBox) {
        if (total >= MAX_STAMPS) {
            rewardBox.classList.add("completed");
            completeBox.style.display = "block";
        } else {
            rewardBox.classList.remove("completed");
            completeBox.style.display = "none";
        }
    }
}

async function resetStamps() {
    if (!USER_ID) return;

    await supabaseClient
        .from("user_stamps")
        .delete()
        .eq("user_id", USER_ID);

    confettiPlayed = false;

    await loadStamps();
}

function launchConfetti() {
    if (confettiPlayed) return;
    if (typeof confetti !== "function") return;

    confettiPlayed = true;

    confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
    });

    setTimeout(() => {
        confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.7 }
        });
    }, 400);
}

window.resetStamps = resetStamps;

initStampRally();