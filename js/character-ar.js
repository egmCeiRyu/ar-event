const characterModels = {
    "1": "assets/models/character01.glb",
    "2": "assets/models/character02.glb",
    "3": "assets/models/character03.glb",
    "4": "assets/models/character04.glb",
    "5": "assets/models/character05.glb",
    "6": "assets/models/character06.glb",
    "7": "assets/models/character07.glb",
    "8": "assets/models/character08.glb"
};

AFRAME.registerComponent("character-ar-controller", {
    init: function () {
        this.targetBtn = document.getElementById("targetBtn");
        this.targetOverlay = document.getElementById("targetOverlay");
        this.captureBtn = document.getElementById("captureBtn");

        this.character = document.getElementById("mainCharacter");
        this.camera = document.getElementById("camera");

        this.isPlaced = false;
        this.isDragging = false;
        this.lastTouchX = 0;
        this.lastTouchY = 0;

        // Sensibilidade do movimento.
        // Menor = mais lento.
        this.dragSpeed = 0.0018;

        this.loadCharacterFromUrl();

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

        this.el.addEventListener("loaded", () => {
            this.setupSlowDrag();
        });

        this.el.addEventListener("renderstart", () => {
            this.setupSlowDrag();
        });

        this.el.addEventListener("realityready", () => {
            console.log("8th Wall ready");
        });
    },

    loadCharacterFromUrl: function () {
        if (!this.character) return;

        const params = new URLSearchParams(window.location.search);
        const characterId = params.get("id") || "1";

        const modelPath = characterModels[characterId] || characterModels["1"];

        console.log("Character ID:", characterId);
        console.log("Model path:", modelPath);

        this.character.setAttribute("gltf-model", `url(${modelPath})`);
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

        // Se algum GLB aparecer de costas, use:
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

    setupSlowDrag: function () {
        if (this.dragReady) return;

        const canvas = document.querySelector("canvas");

        if (!canvas || !this.character || !this.camera) {
            setTimeout(() => {
                this.setupSlowDrag();
            }, 300);
            return;
        }

        this.dragReady = true;

        canvas.addEventListener("touchstart", (event) => {
            if (!this.isPlaced) return;
            if (event.touches.length !== 1) return;

            this.isDragging = true;
            this.lastTouchX = event.touches[0].clientX;
            this.lastTouchY = event.touches[0].clientY;
        }, { passive: false });

        canvas.addEventListener("touchmove", (event) => {
            if (!this.isDragging) return;
            if (!this.isPlaced) return;
            if (event.touches.length !== 1) return;

            event.preventDefault();

            const touch = event.touches[0];

            const deltaX = touch.clientX - this.lastTouchX;
            const deltaY = touch.clientY - this.lastTouchY;

            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;

            this.moveCharacterSlowly(deltaX, deltaY);
        }, { passive: false });

        canvas.addEventListener("touchend", () => {
            this.isDragging = false;
        });

        canvas.addEventListener("touchcancel", () => {
            this.isDragging = false;
        });
    },

    moveCharacterSlowly: function (deltaX, deltaY) {
        if (!this.character || !this.camera) return;
        if (!this.character.object3D || !this.camera.object3D) return;
        if (!AFRAME || !AFRAME.THREE) return;

        const THREE = AFRAME.THREE;

        const cameraQuaternion = this.camera.object3D.quaternion;

        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(cameraQuaternion);
        right.y = 0;
        right.normalize();

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(cameraQuaternion);
        forward.y = 0;
        forward.normalize();

        const movement = new THREE.Vector3();

        movement.addScaledVector(right, deltaX * this.dragSpeed);
        movement.addScaledVector(forward, -deltaY * this.dragSpeed);

        this.character.object3D.position.add(movement);
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