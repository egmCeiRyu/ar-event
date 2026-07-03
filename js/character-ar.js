import { characters } from "./data/characters.js";

AFRAME.registerComponent("character-ar-controller", {
    init: function () {
        this.targetBtn = document.getElementById("targetBtn");
        this.targetOverlay = document.getElementById("targetOverlay");
        this.captureBtn = document.getElementById("captureBtn");

        this.character = document.getElementById("mainCharacter");
        this.camera = document.getElementById("camera");

        this.characterData = null;

        this.characterPlaced = false;

        this.baseScale = 1;
        this.modelYawOffsetRad = 0;

        this.fixedCharacterY = 0;
        this.placeDistance = 1.8;

        this.loadCharacterFromUrl();

        if (this.targetBtn) {
            this.targetBtn.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.placeCharacterInFrontOfCamera();
            });
        }

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

        this.el.addEventListener("realityready", () => {
            console.log("8th Wall ready");
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

        this.character.setAttribute(
            "gltf-model",
            `url(${characterData.model})`
        );

        const globalScaleMultiplier = 1.35;

        this.baseScale = Number(characterData.scale || 1) * globalScaleMultiplier;

        this.character.setAttribute("scale", {
            x: this.baseScale,
            y: this.baseScale,
            z: this.baseScale
        });

        this.character.object3D.scale.set(
            this.baseScale,
            this.baseScale,
            this.baseScale
        );

        const rotationDeg = Number(characterData.rotation || 0);

        this.modelYawOffsetRad =
            AFRAME.THREE.MathUtils.degToRad(rotationDeg);

        if (characterData.name) {
            document.title = characterData.name;
        }
    },

    placeCharacterInFrontOfCamera: function () {
        if (this.characterPlaced) return;

        if (!this.character || !this.camera) return;
        if (!this.character.object3D || !this.camera.object3D) return;
        if (!AFRAME || !AFRAME.THREE) return;

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

        placePosition.y = this.fixedCharacterY;

        this.character.object3D.position.set(
            placePosition.x,
            placePosition.y,
            placePosition.z
        );

        this.character.setAttribute("position", {
            x: placePosition.x,
            y: placePosition.y,
            z: placePosition.z
        });

        this.character.object3D.scale.set(
            this.baseScale,
            this.baseScale,
            this.baseScale
        );

        this.character.setAttribute("scale", {
            x: this.baseScale,
            y: this.baseScale,
            z: this.baseScale
        });

        this.character.object3D.visible = true;
        this.character.setAttribute("visible", "true");

        this.characterPlaced = true;

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

        this.character.object3D.scale.set(
            this.baseScale,
            this.baseScale,
            this.baseScale
        );

        console.log("Character model loaded");
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
        if (!this.characterPlaced) return;

        /*
            Mantém o personagem de frente para a câmera.
            Move e pinch ficam com o xrextras.
        */
        this.faceCharacterToCamera();
    }
});