let camera, scene, renderer;
let controls, water, sun;
let boat, trashes = [];

const loader = new THREE.GLTFLoader();
const TRASH_COUNT = 10;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Boat {
  constructor(){
    this.boat = null;
    this.speed = { vel: 0, rot: 0 };

    loader.load("assets/boat/scene.gltf", (gltf) => {
      this.boat = gltf.scene;
      this.boat.scale.set(3, 3, 3);
      this.boat.position.set(5, 13, 50);
      this.boat.rotation.y = 1.5;
      scene.add(this.boat);
    });
  }

  stop(){
    this.speed.vel = 0;
    this.speed.rot = 0;
  }

  update(){
    if (this.boat) {
      this.boat.rotation.y += this.speed.rot;
      this.boat.translateX(this.speed.vel);
    }
  }
}

class Trash {
  constructor(_scene){
    this.trash = _scene;
    scene.add(this.trash);
    this.trash.scale.set(1.5, 1.5, 1.5);
    this.trash.position.set(
      Math.random() > 0.6 ? random(-100, 100) : random(-500, 500),
      -0.5,
      Math.random() > 0.6 ? random(-100, 100) : random(-1000, 1000)
    );
  }
}

async function loadModel(url){
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene);
    }, undefined, reject);
  });
}

async function createTrash(){
  const trashModel = await loadModel("assets/trash/scene.gltf");
  return new Trash(trashModel.clone());
}

init();
animate();

async function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(30, 30, 100);

  sun = new THREE.Vector3();

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  water = new THREE.Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined
  });

  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  const sky = new THREE.Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = 10;
  skyUniforms.rayleigh.value = 2;
  skyUniforms.mieCoefficient.value = 0.005;
  skyUniforms.mieDirectionalG.value = 0.8;

  const parameters = { elevation: 2, azimuth: 180 };
  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms.sunPosition.value.copy(sun);
    water.material.uniforms.sunDirection.value.copy(sun).normalize();
    scene.environment = pmremGenerator.fromScene(sky).texture;
  }

  updateSun();

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  boat = new Boat();

  for (let i = 0; i < TRASH_COUNT; i++) {
    const trash = await createTrash();
    trashes.push(trash);
  }

  window.addEventListener('resize', onWindowResize);

  window.addEventListener('keydown', (e) => {
    if (e.key === "ArrowUp") boat.speed.vel = 1;
    if (e.key === "ArrowDown") boat.speed.vel = -1;
    if (e.key === "ArrowRight") boat.speed.rot = -0.1;
    if (e.key === "ArrowLeft") boat.speed.rot = 0.1;
  });

  window.addEventListener('keyup', (e) => {
    boat.stop();
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function isColliding(obj1, obj2){
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 15 &&
    Math.abs(obj1.position.z - obj2.position.z) < 15
  );
}

function checkCollisions(){
  if (boat && boat.boat) {
    trashes.forEach(trash => {
      if (trash.trash && isColliding(boat.boat, trash.trash)) {
        scene.remove(trash.trash);
      }
    });
  }
}

function animate() {
  requestAnimationFrame(animate);
  render();
  boat.update();
  checkCollisions();
}

function render() {
  water.material.uniforms.time.value += 1.0 / 60.0;
  renderer.render(scene, camera);
}
