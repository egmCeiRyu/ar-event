const SUPABASE_URL = "https://btzheezlvxkyemkactvj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vOhFbevQUsseGs-oQgm0JQ_8t6Oi1Sh";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = "test_user";

const stampMap = {
    marker01: "stamp01",
    marker02: "stamp02",
    marker03: "stamp03"
};

async function loadStamps() {
    const { data, error } = await supabaseClient
        .from("user_stamps")
        .select("character_code")
        .eq("user_id", USER_ID);

    if (error) {
        console.error("Erro ao carregar stamps:", error);
        return;
    }

    // Primeiro trava todos os stamps
    document.querySelectorAll(".stamp").forEach(stamp => {
        stamp.classList.add("locked");
        stamp.classList.remove("unlocked");
    });

    let unlockedCount = 0;

    // Depois desbloqueia somente os stamps encontrados no banco
    data.forEach(item => {
        const stampId = stampMap[item.character_code];

        if (stampId) {
            unlockStamp(stampId);
            unlockedCount++;
        }
    });

    console.log("Stamps desbloqueados:", unlockedCount);

    if (unlockedCount >= 3) {
        alert("Complete! Prêmio desbloqueado!");
    }
}

function unlockStamp(stampId) {
    const stamp = document.getElementById(stampId);

    if (!stamp) return;

    stamp.classList.remove("locked");
    stamp.classList.add("unlocked");
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