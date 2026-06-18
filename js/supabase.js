const SUPABASE_URL = "https://btzheezlvxkyemkactvj.supabase.co/";
const SUPABASE_ANON_KEY = "btzheezlvxkyemkactvj";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function initAnonymousUser() {
  const { data: sessionData } = await supabaseClient.auth.getSession();

  if (sessionData.session) {
    console.log("Usuário já logado:", sessionData.session.user.id);
    return sessionData.session.user;
  }

  const { data, error } = await supabaseClient.auth.signInAnonymously();

  if (error) {
    console.error("Erro no login anônimo:", error);
    return null;
  }

  console.log("Novo usuário anônimo:", data.user.id);
  return data.user;
}

initAnonymousUser();