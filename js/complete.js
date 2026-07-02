const completeVoice = document.getElementById("completeVoice");
const playVoiceButton = document.getElementById("playVoiceButton");
const rewardButton = document.getElementById("rewardButton");

let autoPlayed = false;

// Tenta tocar automaticamente ao abrir a página
window.addEventListener("load", async () => {

    try {

        completeVoice.currentTime = 0;

        await completeVoice.play();

        autoPlayed = true;

        if (playVoiceButton) {
            playVoiceButton.textContent = "▶ もう一度再生";
        }

    } catch (error) {

        console.log("Autoplay failed:", error);

    }

});

// Botão para tocar novamente
if (playVoiceButton) {

    playVoiceButton.addEventListener("click", async () => {

        try {

            completeVoice.pause();
            completeVoice.currentTime = 0;

            await completeVoice.play();

            if (!autoPlayed) {

                autoPlayed = true;

                playVoiceButton.textContent = "▶ もう一度再生";

            }

        } catch (error) {

            console.log("Complete voice error:", error);

        }

    });

}

// Botão da recompensa
if (rewardButton) {

    rewardButton.addEventListener("click", () => {

        location.href = "stamp-rally.html";

    });

}