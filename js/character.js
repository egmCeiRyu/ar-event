const {
  MindARThree
} = window.MINDAR.IMAGE;

async function start() {

  const mindarThree = new MindARThree({

    container: document.querySelector("#container"),

    imageTargetSrc: "./assets/targets/targets.mind"

  });

  const {

    renderer,
    scene,
    camera

  } = mindarThree;

  const loader = new THREE.TextureLoader();

  //--------------------------------------
  // Marker 01
  //--------------------------------------

  const anchor0 = mindarThree.addAnchor(0);

  const tex0 = loader.load("./assets/characters/character01.webp");

  const plane0 = new THREE.Mesh(

    new THREE.PlaneGeometry(0.6, 1.0),

    new THREE.MeshBasicMaterial({

      map: tex0,
      transparent: true

    })

  );

  plane0.position.y = 0.5;

  anchor0.group.add(plane0);

  //--------------------------------------
  // Marker 02
  //--------------------------------------

  const anchor1 = mindarThree.addAnchor(1);

  const tex1 = loader.load("./assets/characters/character02.webp");

  const plane1 = new THREE.Mesh(

    new THREE.PlaneGeometry(0.6, 1.0),

    new THREE.MeshBasicMaterial({

      map: tex1,
      transparent: true

    })

  );

  plane1.position.y = 0.5;

  anchor1.group.add(plane1);

  //--------------------------------------
  // Marker 03
  //--------------------------------------

  const anchor2 = mindarThree.addAnchor(2);

  const tex2 = loader.load("./assets/characters/character03.webp");

  const plane2 = new THREE.Mesh(

    new THREE.PlaneGeometry(0.6, 1.0),

    new THREE.MeshBasicMaterial({

      map: tex2,
      transparent: true

    })

  );

  plane2.position.y = 0.5;

  anchor2.group.add(plane2);

  //--------------------------------------

  await mindarThree.start();

  renderer.setAnimationLoop(() => {

    renderer.render(scene, camera);

  });

}

start();