// character.js

const USER_ID = "c35d54ae-18c7-4b2f-9338-b0b290f9943a";

const characterMap = {
    marker01: 4,
    marker02: 5,
    marker03: 6
};

// ----------------------------
// Popup
// ----------------------------
function showPopup(message) {

    const popup = document.getElementById("stampPopup");

    popup.innerHTML = message;
    popup.style.display = "block";

    setTimeout(() => {
        popup.style.display = "none";
    }, 1800);

}

// ----------------------------
// Process Marker
// ----------------------------
async function processMarker(markerCode) {

    const characterId = characterMap[markerCode];

    if (!characterId) {
        console.log("Marker inválido");
        return;
    }

    // Verifica se já possui o stamp
    const { data: exists, error: checkError } = await supabaseClient
        .from("user_stamps")
        .select("character_id")
        .eq("user_id", USER_ID)
        .eq("character_id", characterId);

    if (checkError) {
        console.error(checkError);
        return;
    }

    // Já possui
    if (exists.length > 0) {

        showPopup("😊 このスタンプはもう持っています！");

        return;
    }

    // Salva novo stamp
    const { error } = await supabaseClient
        .from("user_stamps")
        .insert({
            user_id: USER_ID,
            character_id: characterId,
            acquired_at: new Date().toISOString()
        });

    if (error) {
        console.error(error);
        showPopup("エラーが発生しました");
        return;
    }

    // Toca som somente quando ganha um novo stamp
    const sound = new Audio("assets/sounds/stamp.mp3");
    sound.volume = 0.8;
    sound.play();

    // Popup
    showPopup("🎉 スタンプをゲットしました！");

    // Vai para o Stamp Book
    setTimeout(() => {

        window.location.href = "stampbook.html";

    }, 1800);

}