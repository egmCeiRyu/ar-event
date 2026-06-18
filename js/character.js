const USER_ID = "c35d54ae-18c7-4b2f-9338-b0b290f9943a";

const characterMap = {
    marker01: 4,
    marker02: 5,
    marker03: 6
};

async function processMarker(markerCode) {
    const characterId = characterMap[markerCode];

    if (!characterId) {
        alert("Marker inválido");
        return;
    }

    const { error } = await supabaseClient
        .from("user_stamps")
        .upsert({
            user_id: USER_ID,
            character_id: characterId,
            acquired_at: new Date().toISOString()
        }, {
            onConflict: "user_id,character_id"
        });

    if (error) {
        console.error("Erro ao salvar stamp:", error);
        alert("Erro ao salvar stamp");
        return;
    }

    alert("スタンプをゲットしました！🎉");
    window.location.href = "stampbook.html";
}