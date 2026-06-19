const grid = document.querySelector(".grid");

for (let i = 1; i <= 14; i++) {
    const item = document.createElement("div");
    item.className = "frame-item";

    item.innerHTML = `
        <img src="assets/photoframe/frame01.webp" alt="Frame ${i}">
    `;

    item.onclick = () => {
        window.location.href = "photoframe_camera.html";
        // ou abrir a câmera, dependendo da implementação futura
    };

    grid.appendChild(item);
}