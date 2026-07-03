AFRAME.registerComponent("character-ar-controller", {
    init: function () {
        this.targetOverlay = document.getElementById("targetOverlay");
        this.captureBtn = document.getElementById("captureBtn");

        this.character = document.getElementById("mainCharacter");
        this.camera = document.getElementById("camera");
        this.ground = document.getElementById("ground");

        this.characters = [];
        this.characterData = null;

        this.characterPlaced = false;
        this.charactersLoaded = false;

        this.baseScale = 1;
        this.modelYawOffsetRad = 0;

        this.loadCharactersData();

        if (this.ground) {
            this.ground.addEventListener("click", (event) => {
                this.placeCharacterByGroundTap(event);
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

    loadCharactersData: async function () {
        try {
            const modulePath = new URL(
                "js/data/characters.js",
                document.baseURI
            ).href;

            const module = await import(modulePath);

            this.characters = module.characters || [];
            this.charactersLoaded = true;

            this.loadCharacterFromUrl();

            console.log("Characters data loaded:", this.characters);
        } catch (error) {
            console.error("Characters data load error:", error);
            alert("キャラクターデータを読み込めませんでした。");
        }
    },

    getCharacterId: function () {
        const params = new URLSearchParams(window.location.search);
        return Number(params.get("id"));
    },

    loadCharacterFromUrl: function () {
        if (!this.character) return;
        if (!this.charactersLoaded) return;

        const characterId = this.getCharacterId();

        const characterData = this.characters.find((item) => {
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

        this.baseScale = Number(characterData.scale || 1);

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

    placeCharacterByGroundTap: function (event) {
        if (!this.character) return;
        if (!this.charactersLoaded) return;
        if (this.characterPlaced) return;

        if (!event.detail || !event.detail.intersection) {
            console.warn("No tap intersection found");
            return;
        }

        const point = event.detail.intersection.point;

        this.character.setAttribute("position", {
            x: point.x,
            y: 0,
            z: point.z
        });

        this.character.object3D.position.set(
            point.x,
            0,
            point.z
        );

        this.character.setAttribute("visible", "true");
        this.character.object3D.visible = true;

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

        this.characterPlaced = true;

        this.faceCharacterToCamera();

        if (this.targetOverlay) {
            this.targetOverlay.classList.add("hidden");
        }

        if (this.captureBtn) {
            this.captureBtn.style.display = "flex";
        }

        console.log("Character placed by ground tap:", point);
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

        this.faceCharacterToCamera();
    }
});