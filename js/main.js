const stampMap = {
    4: "stamp01",
    5: "stamp02",
    6: "stamp03"
};

async function getCurrentUser() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session?.user) {
        return session.user;
    }

    const { data, error } =
        await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error(error);
        return null;
    }

    return data.user;
}

async function loadHomeStamps() {

    const user = await getCurrentUser();

    if (!user) return;

    const { data, error } =
        await supabaseClient
        .from("user_stamps")
        .select("character_id")
        .eq("user_id", user.id);

    if (error) {
        console.error(error);
        return;
    }

    const collected =
        new Set(
            data.map(
                item => item.character_id
            )
        );

    let count = 0;

    Object.entries(stampMap)
        .forEach(([characterId, stampId]) => {

            if (
                collected.has(
                    Number(characterId)
                )
            ) {

                document
                    .getElementById(stampId)
                    .classList
                    .remove("locked");

                count++;
            }
        });

    document.getElementById(
        "stampCount"
    ).textContent = count;

    if (count === 3) {

        document.getElementById(
            "stampMessage"
        ).textContent =
        "コンプリート！";

    } else {

        document.getElementById(
            "stampMessage"
        ).textContent =
        `あと${3 - count}個でコンプリート！`;
    }
}

loadHomeStamps();