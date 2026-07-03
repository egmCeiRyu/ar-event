const characterModels = {
    "4": "assets/models/character01.glb",
    "5": "assets/models/character02.glb",
    "6": "assets/models/character03.glb",
    "7": "assets/models/character04.glb",
    "8": "assets/models/character05.glb",
    "9": "assets/models/character06.glb",
    "10": "assets/models/character07.glb",
    "11": "assets/models/character08.glb"
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
        this.isPinching = false;
        this.touchReady = false;

        this.lastTouchX = 0;
        this.lastTouchY = 0;

        this.initialPinchDistance = 0;
        this.initialScale = 1;

        /*
            Sensibilidade do arraste.
            Antes estava 0.00045 e ficou lento.
            0.0009 = mais confortável.
            Se ainda ficar lento, use 0.0012.
            Se ficar rápido, use 0.0007.
        */
        this.dragSpeed = 0.0009;

        /*
            Sensibilidade do pinch.
            Mantido igual porque você disse que está ótimo.
        */
        this.pinchSensitivity = 0.35;

        this.minScale = 0.3;
        this.maxScale = 3;

        /*
            Altura fixa depois que o personagem for colocado.
            Começa como null porque será calculada pela altura da câmera.
        */
        this.fixedCharacterY = null;

        /*
            Ajuste vertical em relação à câmera.
            -0.25 = mais alto
            -0.45 = médio
            -0.65 = mais baixo
        */
        this.characterCameraYOffset = -0.45;

        /*
            Evita micro movimento acidental.
        */
        this.dragDeadZone = 2;

        /*
            Limita movimento brusco do toque.
            Aumentei um pouco para o personagem responder melhor.
        */
        this.maxTouchDelta = 24;

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
            this.setupTouchControl();
        });

        this.el.addEventListener("renderstart", () => {
            this.setupTouchControl();
        });

        this.el.addEventListener("realityready", () => {
            console.log("8th Wall ready");
        });
    },

    loadCharacterFromUrl: function () {
        if (!this.character) return;

        const params = new URLSearchParams(window.location.search);
        const characterId = params.get("id") || "4";

        const modelPath = characterModels[characterId] || characterModels["4"];

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
        direction.normalize();

        const cameraPosition = new THREE.Vector3();
        cameraObject.getWorldPosition(cameraPosition);

        this.fixedCharacterY = cameraPosition.y + this.characterCameraYOffset;

        const distance = 1.6;
        const placePosition = cameraPosition.clone().addScaledVector(direction, distance);

        this.character.object3D.position.set(
            placePosition.x,
            this.fixedCharacterY,
            placePosition.z
        );

        this.character.object3D.visible = true;
        this.character.setAttribute("visible", "true");

        this.isPlaced = true;

        this.faceCharacterToCamera();

        if (this.targetOverlay) {
            this.targetOverlay.classList.add("hidden");
        }

        if (this.captureBtn) {
            this.captureBtn.style.display = "flex";
        }

        console.log("Character placed:", this.character.object3D.position);
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

        if (this.fixedCharacterY !== null) {
            this.character.object3D.position.y = this.fixedCharacterY;
        }

        console.log("Character model loaded");
    },

    setupTouchControl: function () {
        if (this.touchReady) return;

        const canvas = document.querySelector("canvas");

        if (!canvas) {
            setTimeout(() => {
                this.setupTouchControl();
            }, 300);
            return;
        }

        this.touchReady = true;

        canvas.style.touchAction = "none";

        canvas.addEventListener("touchstart", (event) => {
            if (!this.isPlaced) return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (event.touches.length === 1) {
                this.isDragging = true;
                this.isPinching = false;

                this.lastTouchX = event.touches[0].clientX;
                this.lastTouchY = event.touches[0].clientY;
            }

            if (event.touches.length === 2) {
                this.isDragging = false;
                this.isPinching = true;

                this.initialPinchDistance = this.getPinchDistance(event);
                this.initialScale = this.character.object3D.scale.x;
            }
        }, { passive: false, capture: true });

        canvas.addEventListener("touchmove", (event) => {
            if (!this.isPlaced) return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (event.touches.length === 1 && this.isDragging) {
                const touch = event.touches[0];

                let deltaX = touch.clientX - this.lastTouchX;
                let deltaY = touch.clientY - this.lastTouchY;

                this.lastTouchX = touch.clientX;
                this.lastTouchY = touch.clientY;

                const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                if (totalDelta < this.dragDeadZone) {
                    return;
                }

                deltaX = this.clamp(deltaX, -this.maxTouchDelta, this.maxTouchDelta);
                deltaY = this.clamp(deltaY, -this.maxTouchDelta, this.maxTouchDelta);

                this.moveCharacterSlowly(deltaX, deltaY);
            }

            if (event.touches.length === 2 && this.isPinching) {
                this.scaleCharacterByPinch(event);
            }
        }, { passive: false, capture: true });

        canvas.addEventListener("touchend", (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (event.touches.length === 0) {
                this.isDragging = false;
                this.isPinching = false;
            }

            if (event.touches.length === 1) {
                this.isDragging = true;
                this.isPinching = false;

                this.lastTouchX = event.touches[0].clientX;
                this.lastTouchY = event.touches[0].clientY;
            }
        }, { passive: false, capture: true });

        canvas.addEventListener("touchcancel", (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            this.isDragging = false;
            this.isPinching = false;
        }, { passive: false, capture: true });
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

        if (this.fixedCharacterY !== null) {
            this.character.object3D.position.y = this.fixedCharacterY;
        }
    },

    getPinchDistance: function (event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];

        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;

        return Math.sqrt(dx * dx + dy * dy);
    },

    scaleCharacterByPinch: function (event) {
        if (!this.character || !this.character.object3D) return;
        if (this.initialPinchDistance <= 0) return;

        const currentDistance = this.getPinchDistance(event);
        const rawScaleRatio = currentDistance / this.initialPinchDistance;

        const softenedRatio =
            1 + ((rawScaleRatio - 1) * this.pinchSensitivity);

        let newScale = this.initialScale * softenedRatio;

        newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

        this.character.object3D.scale.set(newScale, newScale, newScale);

        if (this.fixedCharacterY !== null) {
            this.character.object3D.position.y = this.fixedCharacterY;
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

        /*
            Se algum GLB aparecer de costas, troque por:
            this.character.object3D.rotation.y = angle + Math.PI;
        */
        this.character.object3D.rotation.y = angle;
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
        if (!this.character || !this.character.object3D) return;

        if (this.fixedCharacterY !== null) {
            this.character.object3D.position.y = this.fixedCharacterY;
        }

        this.faceCharacterToCamera();
    },

    clamp: function (value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
});