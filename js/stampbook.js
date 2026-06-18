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
            console.log("Desbloqueando:", stampId, stamp);

            if (stamp) {
                stamp.classList.remove("locked");
                stamp.classList.add("unlocked");
                count++;
            }
        }
    });

    document.getElementById("progressText").innerText = `${count} / 3 stamps`;
}

async function resetStamps() {
    const { error } = await supabaseClient
        .from("user_stamps")
        .delete()
        .eq("user_id", USER_ID);

    if (error) {
        console.error("Erro ao resetar stamps:", error);
        return;
    }

    loadStamps();
}

loadStamps();