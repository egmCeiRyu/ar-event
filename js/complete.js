const completeVoice = document.getElementById("completeVoice");
const playVoiceButton = document.getElementById("playVoiceButton");
const rewardButton = document.getElementById("rewardButton");

if (playVoiceButton) {

    playVoiceButton.addEventListener("click", async () => {

        try {

            completeVoice.pause();
            completeVoice.currentTime = 0;

            await completeVoice.play();

        } catch (error) {

            console.log("Complete voice error:", error);

        }

    });

}

if (rewardButton) {

    rewardButton.addEventListener("click", () => {

        location.href = "stamp-rally.html";

    });

}