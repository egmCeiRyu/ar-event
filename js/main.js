const stampMap = {
    4: "stamp01",
    5: "stamp02",
    6: "stamp03"
};

async function getCurrentUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session && session.user) {
        return session.user;
    }

    const { data, error } = await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error("Anonymous login error:", error);
        return null;
    }

    return data.user;
}

async function loadHomeStamps() {
    const user = await getCurrentUser();

    if (!user) return;

    const { data, error } = await supabaseClient
        .from("user_stamps")
        .select("character_id")
        .eq("user_id", user.id);

    if (error) {
        console.error("Erro ao carregar stamps:", error);
        return;
    }

    let count = 0;

    data.forEach(item => {
        const stampId = stampMap[item.character_id];

        if (!stampId) return;

        const stampElement = document.getElementById(stampId);

        if (stampElement) {
            stampElement.classList.remove("locked");
            count++;
        }
    });

    document.getElementById("stampCount").textContent = count;

    const message = document.getElementById("stampMessage");

    if (count >= 3) {
        message.textContent = "コンプリート！";
    } else {
        message.textContent = `あと${3 - count}個でコンプリート！`;
    }
}

document.addEventListener("DOMContentLoaded", loadHomeStamps);