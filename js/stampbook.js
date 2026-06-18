const USER_ID = "c35d54ae-18c7-4b2f-9338-b0b290f9943a";

const stampMap = {
    4: "stamp01",
    5: "stamp02",
    6: "stamp03"
};

async function loadStamps() {
    const { data, error } = await supabaseClient
        .from("user_stamps")
        .select("character_id")
        .eq("user_id", USER_ID);

    if (error) {
        console.error("Erro ao carregar stamps:", error);
        return;
    }

    console.log("DATA:", data);

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

    document.getElementById("progressText").innerText = `${count} / 3 stamps`;

        if (count >= 3) {
        document.getElementById("completeBox").style.display = "block";
        launchConfetti();
    } else {
        document.getElementById("completeBox").style.display = "none";
    }
}

async function resetStamps() {
    await supabaseClient
        .from("user_stamps")
        .delete()
        .eq("user_id", USER_ID);

    loadStamps();
}

loadStamps();

let confettiPlayed = false;

function launchConfetti(){

    if(confettiPlayed) return;

    confettiPlayed = true;

    confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
    });

    setTimeout(()=>{
        confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.7 }
        });
    },400);
}