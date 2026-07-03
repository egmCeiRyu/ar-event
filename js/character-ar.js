import { characters } from "./data/characters.js";

AFRAME.registerComponent("character-ar-controller", {
    init: function () {
        this.targetBtn = document.getElementById("targetBtn");
        this.targetOverlay = document.getElementById("targetOverlay");
        this.captureBtn = document.getElementById("captureBtn");

        this.character = document.getElementById("mainCharacter");
        this.camera = document.getElementById("camera");

        this.characterData = null;

        this.isPlaced = false;
        this.isDragging = false;
        this.isPinching = false;
        this.touchReady = false;
        this.placeEventReady = false;

        this.lastTouchX = 0;
        this.lastTouchY = 0;

        this.initialPinchDistance = 0;
        this.initialScale = 1;

        /*
            Movimento do personagem.
            Pinch mantido igual.
        */
        this.dragSpeed = 0.0015;
        this.pinchSensitivity = 0.35;

        this.minScale = 0.3;
        this.maxScale = 3;

        /*
            Mesmo comportamento antigo:
            o personagem fica 2m na frente da câmera,
            mas o Y fica travado no chão.
        */
        this.fixedCharacterY = 0;
        this.placeDistance = 2;

        this.dragDeadZone = 2;
        this.maxTouchDelta = 26;

        this.modelYawOffsetRad = 0;

        this.loadCharacterFromUrl();
        this.setupPlaceEvents();

        if (this.captureBtn) {
            this.captureBtn.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.capturePhoto();
            });
        }

        if (this.character) {
            this.character.addEventListener("model-loaded", () => {
                this.setupCharacterModel();
            });

            this.character.addEventListener("model-error", (event) => {
                console.error("Model load error:", event);
                alert("モデルを読み込めませんでした。");
            });
        }

        this.el.addEventListener("loaded", () => {
            this.setupTouchControl();
            this.setupPlaceEvents();
        });

        this.el.addEventListener("renderstart", () => {
            this.setupTouchControl();
            this.setupPlaceEvents();
        });

        this.el.addEventListener("realityready", () => {
            console.log("8th Wall ready");
            this.setupTouchControl();
            this.setupPlaceEvents();
        });
    },

    getCharacterId: function () {
        const params = new URLSearchParams(window.location.search);
        return Number(params.get("id"));
    },

    loadCharacterFromUrl: function () {
        if (!this.character) return;

        const characterId = this.getCharacterId();

        const characterData = characters.find((item) => {
            return item.id === characterId;
        });

        if (!characterData) {
            alert("キャラクターが見つかりません。");
            location.href = "character-list.html";
            throw new Error("Character not found");
        }

        this.characterData = characterData;

        console.log("Character ID:", characterId);
        console.log("Character data:", characterData);
        console.log("Model path:", characterData.model);

        this.character.setAttribute("gltf-model", `url(${characterData.model})`);

        const baseScale = Number(characterData.scale || 1);

        this.initialScale = baseScale;
        this.minScale = baseScale * 0.3;
        this.maxScale = baseScale * 3;

        this.character.object3D.scale.set(
            baseScale,
            baseScale,
            baseScale
        );

        const rotationDeg = Number(characterData.rotation || 0);
        this.modelYawOffsetRad = AFRAME.THREE.MathUtils.degToRad(rotationDeg);

        if (characterData.name) {
            document.title = characterData.name;
        }
    },

    setupPlaceEvents: function () {
        if (this.placeEventReady) return;

        const placeHandler = (event) => {
            if (this.isPlaced) return;

            if (event) {
                event.preventDefault();
                event.stopPropagation();

                if (event.stopImmediatePropagation) {
                    event.stopImmediatePropagation();
                }
            }

            this.placeCharacterInFrontOfCamera();
        };

        /*
            Botão central.
        */
        if (this.targetBtn) {
            this.targetBtn.addEventListener("click", placeHandler, {
                passive: false
            });

            this.targetBtn.addEventListener("pointerdown", placeHandler, {
                passive: false
            });

            this.targetBtn.addEventListener("touchend", placeHandler, {
                passive: false
            });
        }

        /*
            Overlay inteiro.
            Assim não precisa tocar exatamente no ícone.
        */
        if (this.targetOverlay) {
            this.targetOverlay.addEventListener("click", placeHandler, {
                passive: false
            });

            this.targetOverlay.addEventListener("pointerdown", placeHandler, {
                passive: false
            });

            this.targetOverlay.addEventListener("touchend", placeHandler, {
                passive: false
            });
        }

        /*
            Fallback para quando o canvas do 8th Wall engole o clique do botão.
            Antes de colocar o personagem, qualquer toque na tela coloca o modelo.
        */
        document.addEventListener("pointerdown", (event) => {
            if (this.isPlaced) return;

            const target = event.target;

            if (
                target &&
                (
                    target.closest(".home-button") ||
                    target.closest("#homeButton") ||
                    target.closest("#captureBtn")
                )
            ) {
                return;
            }

            placeHandler(event);
        }, {
            passive: false,
            capture: true
        });

        document.addEventListener("touchend", (event) => {
            if (this.isPlaced) return;

            const target = event.target;

            if (
                target &&
                (
                    target.closest(".home-button") ||
                    target.closest("#homeButton") ||
                    target.closest("#captureBtn")
                )
            ) {
                return;
            }

            placeHandler(event);
        }, {
            passive: false,
            capture: true
        });

        this.placeEventReady = true;
    },

    placeCharacterInFrontOfCamera: function () {
        if (!this.character || !this.camera) {
            console.warn("Character or camera not found");
            return;
        }

        if (!this.character.object3D || !this.camera.object3D) {
            console.warn("Character object3D or camera object3D not ready");
            return;
        }

        if (!AFRAME || !AFRAME.THREE) {
            console.warn("AFRAME.THREE not ready");
            return;
        }

        const THREE = AFRAME.THREE;
        const cameraObject = this.camera.object3D;

        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(cameraObject.quaternion);

        const cameraPosition = new THREE.Vector3();
        cameraObject.getWorldPosition(cameraPosition);

        const placePosition = cameraPosition.clone().addScaledVector(
            direction,
            this.placeDistance
        );

        /*
            Igual ao antigo:
            calcula X/Z na frente da câmera,
            mas força Y no chão.
        */
        placePosition.y = this.fixedCharacterY;

        this.character.setAttribute("position", {
            x: placePosition.x,
            y: placePosition.y,
            z: placePosition.z
        });

        this.character.object3D.position.set(
            placePosition.x,
            placePosition.y,
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

        console.log("Character placed:", placePosition);
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

        if (this.characterData) {
            const baseScale = Number(this.characterData.scale || 1);

            this.character.object3D.scale.set(
                baseScale,
                baseScale,
                baseScale
            );
        }

        this.character.object3D.position.y = this.fixedCharacterY;

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

                deltaX = this.clamp(
                    deltaX,
                    -this.maxTouchDelta,
                    this.maxTouchDelta
                );

                deltaY = this.clamp(
                    deltaY,
                    -this.maxTouchDelta,
                    this.maxTouchDelta
                );

                this.moveCharacterSlowly(deltaX, deltaY);
            }

            if (event.touches.length === 2 && this.isPinching) {
                this.scaleCharacterByPinch(event);
            }
        }, { passive: false, capture: true });

        canvas.addEventListener("touchend", (event) => {
            if (!this.isPlaced) return;

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
            if (!this.isPlaced) return;

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
        this.character.object3D.position.y = this.fixedCharacterY;
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
        this.character.object3D.position.y = this.fixedCharacterY;
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

        this.character.object3D.rotation.y =
            angle + this.modelYawOffsetRad;
    },

    capturePhoto: function () {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;

        const hiddenElements = [
            document.querySelector(".home-button"),
            document.getElementById("homeButton"),
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

        this.character.object3D.position.y = this.fixedCharacterY;

        this.faceCharacterToCamera();
    },

    clamp: function (value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
});