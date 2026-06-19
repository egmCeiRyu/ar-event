// character.js

const characterMap = {
    marker01: 4,
    marker02: 5,
    marker03: 6
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

function showPopup(message) {
    const popup = document.getElementById("stampPopup");

    popup.innerHTML = message;
    popup.style.display = "block";

    setTimeout(() => {
        popup.style.display = "none";
    }, 1800);
}

async function processMarker(markerCode) {
    const characterId = characterMap[markerCode];

    if (!characterId) {
        console.log("Marker inválido");
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        showPopup("ログインエラー");
        return;
    }

    const userId = user.id;

    console.log("SAVE USER:", userId);
    console.log("SAVE CHARACTER:", characterId);

    const { error } = await supabaseClient
        .from("user_stamps")
        .upsert(
            {
                user_id: userId,
                character_id: characterId,
                acquired_at: new Date().toISOString()
            },
            {
                onConflict: "user_id,character_id"
            }
        );

    if (error) {
        console.error("Erro ao salvar stamp:", error);
        showPopup("エラーが発生しました");
        return;
    }

    const sound = new Audio("assets/sounds/stamp.mp3");
    sound.volume = 0.8;
    sound.play();

    showPopup("🎉 スタンプをゲットしました！");

    setTimeout(() => {
        window.location.href = "stampbook.html";
    }, 1800);
}