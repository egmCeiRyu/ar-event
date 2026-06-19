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

    console.log("CHECK USER:", userId);
    console.log("CHECK CHARACTER:", characterId);

    // 1. Primeiro verifica se já existe
    const { data: existingStamp, error: checkError } = await supabaseClient
        .from("user_stamps")
        .select("id")
        .eq("user_id", userId)
        .eq("character_id", characterId)
        .maybeSingle();

    if (checkError) {
        console.error("Erro ao verificar stamp:", checkError);
        showPopup("エラーが発生しました");
        return;
    }

    // 2. Se já existe, NÃO toca som e NÃO mostra Stamp Get
    if (existingStamp) {
        showPopup("このスタンプはすでにアルバムに保存されています。");

        setTimeout(() => {
            window.location.href = "stampbook.html";
        }, 1800);

        return;
    }

    // 3. Se não existe, salva novo stamp
    const { error: insertError } = await supabaseClient
        .from("user_stamps")
        .insert({
            user_id: userId,
            character_id: characterId,
            acquired_at: new Date().toISOString()
        });

    if (insertError) {
        console.error("Erro ao salvar stamp:", insertError);
        showPopup("エラーが発生しました");
        return;
    }

    // 4. Somente nova estampa toca som
    const sound = new Audio("assets/sounds/stamp.mp3");
    sound.volume = 0.8;
    sound.play();

    showPopup("🎉 スタンプをゲットしました！");

    setTimeout(() => {
        window.location.href = "stampbook.html";
    }, 1800);
}