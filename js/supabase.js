const SUPABASE_URL = "https://btzheezlvxkyemkactvj.supabase.co/";
const SUPABASE_ANON_KEY = "btzheezlvxkyemkactvj";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function anonymousLogin() {
  const { data: sessionData } = await supabaseClient.auth.getSession();

  if (sessionData.session) {
    console.log("Already logged in:", sessionData.session.user.id);
    return sessionData.session.user;
  }

  const { data, error } = await supabaseClient.auth.signInAnonymously();

  if (error) {
    console.error("Anonymous login error:", error);
    return null;
  }

  console.log("Anonymous user:", data.user.id);
  return data.user;
}