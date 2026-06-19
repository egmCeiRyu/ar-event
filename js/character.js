import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

const debugText = document.getElementById("debugText");

const targets = [
    {
        index: 0,
        image: "./assets/characters/character01.webp",
        characterId: 4
    },
    {
        index: 1,
        image: "./assets/characters/character02.webp",
        characterId: 5
    },
    {
        index: 2,
        image: "./assets/characters/character03.webp",
        characterId: 6
    }
];

function setDebug(message) {
    if (debugText) {
        debugText.textContent = message;
    }
    console.log(message);
}

function createCharacterPlane(texture) {
    const aspect = texture.image.width / texture.image.height;

    const height = 1.0;
    const width = height * aspect;

    const geometry = new THREE.PlaneGeometry(width, height);

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, 0.45, 0);
    mesh.scale.set(0.001, 0.001, 0.001);

    return mesh;
}

async function loadTexture(path) {
    const loader = new THREE.TextureLoader();

    return new Promise((resolve, reject) => {
        loader.load(
            path,
            texture => {
                texture.colorSpace = THREE.SRGBColorSpace;
                resolve(texture);
            },
            undefined,
            error => reject(error)
        );
    });
}

async function startAR() {
    try {
        setDebug("MindAR読み込み中...");

        const mindarThree = new MindARThree({
            container: document.querySelector("#container"),
            imageTargetSrc: "./assets/targets/targets.mind",
            maxTrack: 1
        });

        const { renderer, scene, camera } = mindarThree;

        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const characterMeshes = [];

        for (const item of targets) {
            const anchor = mindarThree.addAnchor(item.index);
            const texture = await loadTexture(item.image);
            const mesh = createCharacterPlane(texture);

            anchor.group.add(mesh);

            characterMeshes.push({
                mesh,
                anchor,
                visible: false,
                time: 0
            });

            anchor.onTargetFound = () => {
                setDebug(`marker${item.index + 1} 検出`);
                characterMeshes[item.index].visible = true;
            };

            anchor.onTargetLost = () => {
                setDebug("マーカーをスキャンしてください");
                characterMeshes[item.index].visible = false;
                mesh.scale.set(0.001, 0.001, 0.001);
            };
        }

        setDebug("カメラ起動中...");

        await mindarThree.start();

        setDebug("マーカーをスキャンしてください");

        renderer.setAnimationLoop(() => {
        characterMeshes.forEach(item => {
            const mesh = item.mesh;

            if (item.visible) {
                const targetScale = 1;
                const currentScale = mesh.scale.x;
                const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.12);

                mesh.scale.set(nextScale, nextScale, nextScale);
                mesh.position.y = 0.45;
                }
            });

            renderer.render(scene, camera);
        });

    } catch (error) {
        console.error(error);
        setDebug("ERROR: " + error.message);
    }
}

startAR();