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

const stars = document.querySelector(".stars");

function createStar(){

    const star = document.createElement("div");

    star.className = "star";

    star.textContent = Math.random() > .5 ? "✨" : "⭐";

    star.style.left = Math.random()*100 + "%";

    star.style.animationDuration =
        (4 + Math.random()*3) + "s";

    star.style.fontSize =
        (14 + Math.random()*18) + "px";

    stars.appendChild(star);

    setTimeout(()=>{
        star.remove();
    },7000);

}

setInterval(createStar,350);