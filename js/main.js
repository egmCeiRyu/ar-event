const stampMap = {
    4: "stamp01",
    5: "stamp02",
    6: "stamp03",
    7: "stamp04",
    8: "stamp05",
    9: "stamp06",
    10: "stamp07",
    11: "stamp08"
};

const MAX_STAMPS = Object.keys(stampMap).length;

async function initHomeStamps() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        return;
    }

    const userId = session.user.id;

    const { data, error } = await supabaseClient
        .from("user_stamps")
        .select("character_id")
        .eq("user_id", userId);

    if (error) {
        console.error("Erro ao carregar stamps no index:", error);
        return;
    }

    document.querySelectorAll(".stamp").forEach(stamp => {
        stamp.classList.add("locked");
        stamp.classList.remove("unlocked");
    });

    const unlockedStampIds = new Set();

    data.forEach(item => {
        const stampId = stampMap[item.character_id];

        if (stampId) {
            const stamp = document.getElementById(stampId);

            if (stamp) {
                stamp.classList.remove("locked");
                stamp.classList.add("unlocked");
                unlockedStampIds.add(item.character_id);
            }
        }
    });

    const count = unlockedStampIds.size;

    document.getElementById("stampCount").textContent = count;

    const message = document.getElementById("stampMessage");

    if (message) {
        message.textContent =
            count >= MAX_STAMPS
                ? "コンプリート！"
                : "スタンプを集めよう！";
    }
}

initHomeStamps();