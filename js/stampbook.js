const stampMap = {
    4: "stamp01",
    5: "stamp02",
    6: "stamp03"
};

let USER_ID = null;
let confettiPlayed = false;

async function initStampBook() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        const { data, error } = await supabaseClient.auth.signInAnonymously();

        if (error) {
            console.error("Erro no anonymous login:", error);
            return;
        }

        USER_ID = data.user.id;
    } else {
        USER_ID = session.user.id;
    }

    console.log("USER_ID:", USER_ID);

    await loadStamps();
}

async function loadStamps() {
    if (!USER_ID) return;

    const { data, error } = await supabaseClient
        .from("user_stamps")
        .select("character_id")
        .eq("user_id", USER_ID);

    if (error) {
        console.error("Erro ao carregar stamps:", error);
        return;
    }

    document.querySelectorAll(".stamp").forEach(stamp => {
        stamp.classList.add("locked");
        stamp.classList.remove("unlocked");
    });

    let count = 0;

    data.forEach(item => {
        const stampId = stampMap[item.character_id];

        if (stampId) {
            const stamp = document.getElementById(stampId);

            if (stamp) {
                stamp.classList.remove("locked");
                stamp.classList.add("unlocked");
                count++;
            }
        }
    });

    updateStampLevel(count);

    if (count >= 3) {
        launchConfetti();
    }
}

function updateStampLevel(total) {
    const max = 3;
    const percent = Math.min((total / max) * 100, 100);

    document.getElementById("progressText").textContent = `${total} / ${max}`;
    document.getElementById("progressFill").style.width = `${percent}%`;

    const rewardBox = document.getElementById("rewardBox");
    const completeBox = document.getElementById("completeBox");

    if (total >= max) {
        rewardBox.classList.add("completed");
        completeBox.style.display = "block";
    } else {
        rewardBox.classList.remove("completed");
        completeBox.style.display = "none";
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

initStampBook();