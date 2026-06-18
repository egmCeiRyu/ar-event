const SUPABASE_URL = "https://btzheezlvxkyemkactvj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vOhFbevQUsseGs-oQgm0JQ_8t6Oi1Sh";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const USER_ID = "test_user";

async function processMarker(markerCode) {
    const { error } = await supabaseClient
        .from("user_stamps")
        .upsert({
            user_id: USER_ID,
            character_code: markerCode,
            unlocked_at: new Date().toISOString()
        }, {
            onConflict: "user_id,character_code"
        });

    if (error) {
        console.error("Erro ao salvar stamp:", error);
        alert("Erro ao salvar stamp");
        return;
    }

    alert("Stamp desbloqueado!");

    // opcional: ir direto para o Stamp Book
    window.location.href = "stampbook.html";
}