const SUPABASE_URL = "https://btzheezlvxkyemkactvj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vOhFbevQUsseGs-oQgm0JQ_8t6Oi1Sh";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const USER_ID = "test_user";

async function loadStamps() {
  const { data, error } = await supabaseClient
    .from("user_stamps")
    .select("character_code")
    .eq("user_id", USER_ID);

  if (error) {
    console.error(error);
    return;
  }

  document.querySelectorAll(".stamp").forEach(stamp => {
    stamp.classList.add("locked");
    stamp.classList.remove("unlocked");
  });

  data.forEach(row => {
    if (row.character_code === "marker01") unlockStamp("stamp01");
    if (row.character_code === "marker02") unlockStamp("stamp02");
    if (row.character_code === "marker03") unlockStamp("stamp03");
  });

  if (data.length >= 3) {
    alert("Complete! Prêmio desbloqueado!");
  }
}

function unlockStamp(stampId) {
  const stamp = document.getElementById(stampId);
  stamp.classList.remove("locked");
  stamp.classList.add("unlocked");
}

async function resetStamps() {
  const { error } = await supabaseClient
    .from("user_stamps")
    .delete()
    .eq("user_id", USER_ID);

  if (error) {
    console.error(error);
    return;
  }

  loadStamps();
}

loadStamps();