import * as THREE from 'three';

// ============================================
// SETUP SCENE
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 100, 400);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ============================================
// LIGHTING
// ============================================
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(50, 100, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;
scene.add(sun);

// ============================================
// GROUND + TRACK
// ============================================
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshStandardMaterial({ color: 0x3a7d44 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const track = new THREE.Mesh(
  new THREE.RingGeometry(80, 110, 64),
  new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide })
);
track.rotation.x = -Math.PI / 2;
track.position.y = 0.01;
track.receiveShadow = true;
scene.add(track);

const centerLine = new THREE.Mesh(
  new THREE.RingGeometry(94.5, 95.5, 64),
  new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide })
);
centerLine.rotation.x = -Math.PI / 2;
centerLine.position.y = 0.02;
scene.add(centerLine);

// ============================================
// CAR
// ============================================
const car = new THREE.Group();

const body = new THREE.Mesh(
  new THREE.BoxGeometry(2, 0.8, 4),
  new THREE.MeshStandardMaterial({ color: 0xff2d55, metalness: 0.6, roughness: 0.3 })
);
body.position.y = 0.8;
body.castShadow = true;
car.add(body);

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 0.6, 2),
  new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })
);
cabin.position.set(0, 1.4, -0.2);
cabin.castShadow = true;
car.add(cabin);

const spoiler = new THREE.Mesh(
  new THREE.BoxGeometry(2, 0.1, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
);
spoiler.position.set(0, 1.5, -1.8);
car.add(spoiler);

const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const wheels = [];
[[-1.1, 0.5, 1.3], [1.1, 0.5, 1.3], [-1.1, 0.5, -1.3], [1.1, 0.5, -1.3]].forEach(p => {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.rotation.z = Math.PI / 2;
  w.position.set(...p);
  w.castShadow = true;
  car.add(w);
  wheels.push(w);
});

const headlight = new THREE.PointLight(0xffffaa, 2, 30);
headlight.position.set(0, 1, 2.5);
car.add(headlight);

car.position.set(95, 0, 0);
scene.add(car);

// ============================================
// TREES
// ============================================
function makeTree(x, z) {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c3a21 })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  g.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x2d5a1e })
  );
  leaves.position.y = 5;
  leaves.castShadow = true;
  g.add(leaves);

  g.position.set(x, 0, z);
  return g;
}

for (let i = 0; i < 60; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 120 + Math.random() * 200;
  scene.add(makeTree(Math.cos(a) * r, Math.sin(a) * r));
}
for (let i = 0; i < 20; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * 65;
  scene.add(makeTree(Math.cos(a) * r, Math.sin(a) * r));
}

// ============================================
// CHECKPOINTS
// ============================================
const CHECKPOINTS = 8;
const checkpoints = [];
for (let i = 0; i < CHECKPOINTS; i++) {
  const a = (i / CHECKPOINTS) * Math.PI * 2;
  checkpoints.push({ x: Math.cos(a) * 95, z: Math.sin(a) * 95 });
}

// ============================================
// INPUT
// ============================================
const keys = {};
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);

// ============================================
// GAME STATE
// ============================================
const physics = {
  speed: 0,
  maxSpeed: 60,
  accel: 25,
  brake: 50,
  friction: 8,
  angle: 0,
  turnSpeed: 2.5,
  nitro: 100,
  nitroActive: false
};

let lap = 1;
let lapStartTime = 0;
let gameStarted = false;
let nextCheckpoint = 0;

// DOM
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const hudLap = document.getElementById('lap');
const hudTime = document.getElementById('time');
const hudNitro = document.getElementById('nitro');
const hudKmh = document.getElementById('kmh');

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  gameStarted = true;
  lapStartTime = performance.now();
});

// ============================================
// CAMERA
// ============================================
function updateCamera() {
  const back = 10;
  const height = 5;
  const rad = physics.angle;
  const targetX = car.position.x - Math.sin(rad) * back;
  const targetZ = car.position.z - Math.cos(rad) * back;

  camera.position.lerp(new THREE.Vector3(targetX, height, targetZ), 0.1);
  camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
}

// ============================================
// MAIN LOOP
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (gameStarted) {
    const gas   = keys['KeyW'] || keys['ArrowUp'];
    const brake = keys['KeyS'] || keys['ArrowDown'] || keys['Space'];
    const left  = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];
    const nitro = keys['ShiftLeft'] || keys['ShiftRight'];

    physics.nitroActive = nitro && physics.nitro > 0 && gas;
    if (physics.nitroActive) {
      physics.nitro = Math.max(0, physics.nitro - 40 * dt);
      physics.speed += 60 * dt;
    } else {
      physics.nitro = Math.min(100, physics.nitro + 10 * dt);
    }

    const currentMax = physics.maxSpeed + (physics.nitroActive ? 30 : 0);

    if (gas)        physics.speed += physics.accel * dt;
    else if (brake) physics.speed -= physics.brake * dt;
    else {
      if (physics.speed > 0) physics.speed = Math.max(0, physics.speed - physics.friction * dt);
      else physics.speed = Math.min(0, physics.speed + physics.friction * dt);
    }
    physics.speed = THREE.MathUtils.clamp(physics.speed, -20, currentMax);

    if (Math.abs(physics.speed) > 1) {
      const dir = physics.speed > 0 ? 1 : -1;
      if (left)  physics.angle += physics.turnSpeed * dt * dir;
      if (right) physics.angle -= physics.turnSpeed * dt * dir;
    }

    car.position.x += Math.sin(physics.angle) * physics.speed * dt;
    car.position.z += Math.cos(physics.angle) * physics.speed * dt;
    car.rotation.y = physics.angle;

    const spin = physics.speed * dt * 2;
    wheels.forEach(w => w.rotation.x += spin);

    const tiltTarget = (left ? 0.05 : 0) - (right ? 0.05 : 0);
    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, tiltTarget, 0.1);

    // Checkpoint
    const cp = checkpoints[nextCheckpoint];
    const dx = car.position.x - cp.x;
    const dz = car.position.z - cp.z;
    if (dx * dx + dz * dz < 400) {
      nextCheckpoint++;
      if (nextCheckpoint >= CHECKPOINTS) {
        nextCheckpoint = 0;
        lap++;
        if (lap > 3) {
          alert(`FINISH! Total: ${((performance.now() - lapStartTime) / 1000).toFixed(2)}s`);
          lap = 1;
        }
        lapStartTime = performance.now();
      }
    }

    // Update HUD
    hudKmh.textContent = Math.round(Math.abs(physics.speed) * 3.6);
    hudLap.textContent = lap;
    hudTime.textContent = ((performance.now() - lapStartTime) / 1000).toFixed(2);
    hudNitro.textContent = Math.round(physics.nitro);
  }

  updateCamera();
  renderer.render(scene, camera);
}

animate();

// ============================================
// RESIZE
// ============================================
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});