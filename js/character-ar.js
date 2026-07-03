AFRAME.registerComponent("character-ar-controller", {
    init: function () {
        this.targetBtn = document.getElementById("targetBtn");
        this.targetOverlay = document.getElementById("targetOverlay");
        this.captureBtn = document.getElementById("captureBtn");

        this.character = document.getElementById("mainCharacter");
        this.camera = document.getElementById("camera");

        this.isPlaced = false;

        if (this.targetBtn) {
            this.targetBtn.addEventListener("click", () => {
                this.placeCharacterInFrontOfCamera();
            });
        }

        if (this.captureBtn) {
            this.captureBtn.addEventListener("click", () => {
                this.capturePhoto();
            });
        }

        if (this.character) {
            this.character.addEventListener("model-loaded", () => {
                this.setupCharacterModel();
            });
        }

        this.el.addEventListener("realityready", () => {
            console.log("8th Wall ready");
        });
    },

    placeCharacterInFrontOfCamera: function () {
        if (!this.character || !this.camera) return;
        if (!this.character.object3D || !this.camera.object3D) return;
        if (!AFRAME || !AFRAME.THREE) return;

        const THREE = AFRAME.THREE;

        const cameraObject = this.camera.object3D;

        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(cameraObject.quaternion);

        const cameraPosition = new THREE.Vector3();
        cameraObject.getWorldPosition(cameraPosition);

        const distance = 2.0;
        const placePosition = cameraPosition.clone().addScaledVector(direction, distance);

        // Altura do personagem.
        // Se o personagem ficar baixo/alto demais, ajuste este valor.
        placePosition.y = 0;

        this.character.setAttribute("position", {
            x: placePosition.x,
            y: placePosition.y,
            z: placePosition.z
        });

        this.character.setAttribute("visible", "true");

        this.isPlaced = true;

        this.faceCharacterToCamera();

        if (this.targetOverlay) {
            this.targetOverlay.classList.add("hidden");
        }

        if (this.captureBtn) {
            this.captureBtn.style.display = "flex";
        }
    },

    faceCharacterToCamera: function () {
        if (!this.character || !this.camera) return;
        if (!this.character.object3D || !this.camera.object3D) return;
        if (!AFRAME || !AFRAME.THREE) return;

        const THREE = AFRAME.THREE;

        const characterPosition = new THREE.Vector3();
        const cameraPosition = new THREE.Vector3();

        this.character.object3D.getWorldPosition(characterPosition);
        this.camera.object3D.getWorldPosition(cameraPosition);

        const dx = cameraPosition.x - characterPosition.x;
        const dz = cameraPosition.z - characterPosition.z;

        const angle = Math.atan2(dx, dz);

        // Se o personagem aparecer de costas, troque por:
        // this.character.object3D.rotation.y = angle + Math.PI;
        this.character.object3D.rotation.y = angle;
    },

    setupCharacterModel: function () {
        if (!this.character || !this.character.object3D) return;

        this.character.object3D.traverse((node) => {
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

        console.log("Character model loaded");
    },

    capturePhoto: function () {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;

        const hiddenElements = [
            document.querySelector(".home-button"),
            document.getElementById("captureBtn"),
            document.getElementById("targetOverlay")
        ];

        hiddenElements.forEach((element) => {
            if (element) {
                element.style.visibility = "hidden";
            }
        });

        setTimeout(() => {
            canvas.toBlob(async (blob) => {
                hiddenElements.forEach((element) => {
                    if (element) {
                        element.style.visibility = "visible";
                    }
                });

                if (!blob) return;

                const file = new File(
                    [blob],
                    "character-ar-photo.jpg",
                    { type: "image/jpeg" }
                );

                try {
                    if (
                        navigator.canShare &&
                        navigator.canShare({ files: [file] })
                    ) {
                        await navigator.share({
                            files: [file],
                            title: "Character AR"
                        });
                        return;
                    }
                } catch (error) {
                    console.log("Share canceled or failed:", error);
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = url;
                link.download = "character-ar-photo.jpg";
                link.click();

                URL.revokeObjectURL(url);
            }, "image/jpeg", 0.95);
        }, 120);
    },

    tick: function () {
        if (!this.isPlaced) return;

        this.faceCharacterToCamera();
    }
});