async function getCharacterByCode(code) {
  const { data, error } = await supabaseClient
    .from("characters")
    .select("*")
    .eq("code", code)
    .single();

  if (error) {
    console.error("Character not found:", error);
    return null;
  }

  return data;
}

async function checkUserStamp(userId, characterId) {
  const { data, error } = await supabaseClient
    .from("user_stamps")
    .select("*")
    .eq("user_id", userId)
    .eq("character_id", characterId)
    .maybeSingle();

  if (error) {
    console.error("Check stamp error:", error);
    return null;
  }

  return data;
}

async function saveUserStamp(userId, characterId) {
  const { data, error } = await supabaseClient
    .from("user_stamps")
    .insert({
      user_id: userId,
      character_id: characterId,
    })
    .select()
    .single();

  if (error) {
    console.error("Save stamp error:", error);
    return null;
  }

  return data;
}

async function processMarker(markerCode) {
  const user = await initAnonymousUser();

  if (!user) {
    alert("ユーザー認証に失敗しました。");
    return;
  }

  const character = await getCharacterByCode(markerCode);

  if (!character) {
    alert("キャラクター情報が見つかりません。");
    return;
  }

  const existingStamp = await checkUserStamp(user.id, character.id);

  if (existingStamp) {
    console.log("すでに取得済み:", character.name);
    goToAR(character, false);
    return;
  }

  const savedStamp = await saveUserStamp(user.id, character.id);

  if (savedStamp) {
    showStampGet(character);
  }
}

function showStampGet(character) {
  const stampScreen = document.getElementById("stamp-get");
  const stampName = document.getElementById("stamp-name");

  stampName.textContent = character.name;
  stampScreen.classList.add("show");

  setTimeout(() => {
    stampScreen.classList.remove("show");
    goToAR(character, true);
  }, 2500);
}

function goToAR(character, isNewStamp) {
  console.log("AR START:", character, isNewStamp);

  document.getElementById("scan-screen").classList.add("hidden");
  document.getElementById("ar-screen").classList.remove("hidden");
  document.getElementById("ar-character-name").textContent = character.name;
}