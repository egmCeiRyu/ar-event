const SUPABASE_URL = "https://btzheezlvxkyemkactvj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vOhFbevQUsseGs-oQgm0JQ_8t6Oi1Sh";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = "test_user";

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

    document.querySelectorAll(".stamp").forEach(stamp => {
        stamp.classList.add("locked");
        stamp.classList.remove("unlocked");
    });

    let unlockedCount = 0;

    data.forEach(item => {
        const stampId = stampMap[item.character_id];

        if (stampId) {
            const stamp = document.getElementById(stampId);
            stamp.classList.remove("locked");
            stamp.classList.add("unlocked");
            unlockedCount++;
        }
    });

    document.getElementById("progressText").innerText = `${unlockedCount} / 3 stamps`;

    if (unlockedCount >= 3) {
        alert("Complete! Prêmio desbloqueado!");
    }
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