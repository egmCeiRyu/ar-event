"use strict";

document.querySelectorAll(".home-menu-button").forEach(button => {
    button.addEventListener("click", () => {
        button.classList.add("is-tapped");

        window.setTimeout(() => {
            button.classList.remove("is-tapped");
        }, 180);
    });
});