AFRAME.registerComponent("character-ar-controller", {
    init: function () {
        const scene = this.el;

        const targetBtn = document.getElementById("targetBtn");
        const targetOverlay = document.getElementById("targetOverlay");
        const captureBtn = document.getElementById("captureBtn");
        const scaleValue = document.getElementById("scaleValue");

        const character = document.getElementById("mainCharacter");
        const camera = document.getElementById("camera");

        let placed = false;

        function placeCharacterInFrontOfCamera() {
            if (!character || !camera || !AFRAME || !AFRAME.THREE) return;

            const THREE = AFRAME.THREE;
            const cameraObject = camera.object3D;

            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(cameraObject.quaternion);

            const cameraPosition = new THREE.Vector3();
            cameraObject.getWorldPosition(cameraPosition);

            const distance = 2.0;
            const placePosition = cameraPosition.clone().addScaledVector(direction, distance);

            // Para personagem em pé no chão.
            // Se o personagem ficar muito baixo ou alto, ajuste este valor.
            placePosition.y = 0;

            character.setAttribute("position", {
                x: placePosition.x,
                y: placePosition.y,
                z: placePosition.z
            });

            character.setAttribute("visible", "true");

            // Faz o personagem olhar para a câmera no momento da colocação.
            faceCharacterToCamera();

            placed = true;

            if (targetOverlay) {
                targetOverlay.classList.add("hidden");
            }

            if (captureBtn) {
                captureBtn.style.display = "flex";
            }
        }

        function faceCharacterToCamera() {
            if (!character || !camera || !AFRAME || !AFRAME.THREE) return;

            const THREE = AFRAME.THREE;

            const characterObject = character.object3D;
            const cameraObject = camera.object3D;

            const characterPosition = new THREE.Vector3();
            const cameraPosition = new THREE.Vector3();

            characterObject.getWorldPosition(characterPosition);
            cameraObject.getWorldPosition(cameraPosition);

            const dx = cameraPosition.x - characterPosition.x;
            const dz = cameraPosition.z - characterPosition.z;

            const angle = Math.atan2(dx, dz);

            characterObject.rotation.set(0, angle, 0);
        }

        function updateScaleLabel() {
            if (!scaleValue || !character || !character.object3D) return;

            const scale = character.object3D.scale.x || 1;
            const percent = Math.round(scale * 100);

            scaleValue.textContent = `${percent}%`;
        }

        async function capturePhoto() {
            const canvas = document.querySelector("canvas");
            if (!canvas) return;

            const hiddenElements = [
                document.querySelector(".home-button"),
                document.getElementById("scaleLabel"),
                document.getElementById("captureBtn")
            ];

            hiddenElements.forEach((el) => {
                if (el) el.style.visibility = "hidden";
            });

            setTimeout(() => {
                canvas.toBlob(async (blob) => {
                    hiddenElements.forEach((el) => {
                        if (el) el.style.visibility = "visible";
                    });

                    if (!blob) return;

                    const file = new File(
                        [blob],
                        "character-ar-photo.jpg",
                        { type: "image/jpeg" }
                    );

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: "Character AR"
                        });
                        return;
                    }

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");

                    link.href = url;
                    link.download = "character-ar-photo.jpg";
                    link.click();

                    URL.revokeObjectURL(url);
                }, "image/jpeg", 0.95);
            }, 120);
        }

        if (targetBtn) {
            targetBtn.addEventListener("click", placeCharacterInFrontOfCamera);
        }

        if (captureBtn) {
            captureBtn.addEventListener("click", capturePhoto);
        }

        character.addEventListener("model-loaded", () => {
            character.object3D.traverse((node) => {
                if (!node.isMesh || !node.material) return;

                node.frustumCulled = false;

                const materials = Array.isArray(node.material)
                    ? node.material
                    : [node.material];

                materials.forEach((material) => {
                    material.transparent = true;
                    material.depthWrite = true;
                    material.needsUpdate = true;
                });
            });
        });

        setInterval(() => {
            if (placed) {
                updateScaleLabel();
            }
        }, 120);

        scene.addEventListener("realityready", () => {
            console.log("8th Wall ready");
        });
    }
});