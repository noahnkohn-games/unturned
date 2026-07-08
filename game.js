import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const VERSION = 'v0.6 SAFE + CHAT + MAPA + KITS';

const state = {
  started: false,
  gameOver: false,
  yaw: 0,
  pitch: 0,
  player: new THREE.Vector3(0, 4, 12),
  velocityY: 0,
  grounded: false,
  keys: new Set(),
  health: 100,
  hunger: 100,
  thirst: 100,
  energy: 100,
  selected: 0,
  inventory: {
    pistol: 1,
    viper: 0,
    maplestrike: 0,
    sniper: 0,
    ammo: 48,
    ammoRifle: 60,
    ammoSniper: 8,
    axe: 1,
    water: 2,
    food: 2,
    wood: 0,
    stone: 0,
    tool: 0,
  },
  vault: loadVault(),
  group: { name: '', members: ['Você'], invites: [] },
  attackAnim: 0,
  bob: 0,
  messageTimer: 0,
  zombieSpawnTimer: 0,
  footstepTimer: 0,
  safe: false,
  chatOpen: false,
  mapOpen: false,
  kitsOpen: false,
  inventoryOpen: false,
  currentVaultMode: 'safe',
  audioReady: false,
  volume: Number(localStorage.getItem('blocklandVolume') || '0.45'),
  survivor: {
    name: localStorage.getItem('survivorName') || 'Survivor',
    shirt: localStorage.getItem('survivorShirt') || '#315c9a',
    skin: localStorage.getItem('survivorSkin') || '#f1b47d',
  },
};

const slots = [
  { id: 'pistol', label: 'Pistolinha', use: 'weapon' },
  { id: 'viper', label: 'Viper', use: 'weapon' },
  { id: 'maplestrike', label: 'MapleStrike', use: 'weapon' },
  { id: 'sniper', label: 'Sniper', use: 'weapon' },
  { id: 'axe', label: 'Machado', use: 'axe' },
  { id: 'water', label: 'Água', use: 'drink' },
  { id: 'food', label: 'Comida', use: 'eat' },
  { id: 'tool', label: 'Ferram.', use: 'none' },
  { id: 'hands', label: 'Mãos', use: 'none' },
];

const weaponDefs = {
  pistol: { label: 'Pistolinha', ammo: 'ammo', damage: 38, range: 52, stun: 1.0, spread: 0.006, color: 0xfff2a3, sound: 'pistol' },
  viper: { label: 'Viper', ammo: 'ammoRifle', damage: 24, range: 46, stun: 0.55, spread: 0.020, color: 0x9fffd3, sound: 'viper' },
  maplestrike: { label: 'MapleStrike', ammo: 'ammoRifle', damage: 34, range: 66, stun: 0.85, spread: 0.010, color: 0xc6ff8a, sound: 'rifle' },
  sniper: { label: 'Sniper', ammo: 'ammoSniper', damage: 115, range: 115, stun: 1.7, spread: 0.002, color: 0xffffff, sound: 'sniper' },
};

const serverPlayers = [
  { name: 'Noahn', role: 'Builder', color: 0x3498db, position: new THREE.Vector3(35, 0, 28), online: true },
  { name: 'Aimee', role: 'Medic', color: 0xff6fb1, position: new THREE.Vector3(-42, 0, 34), online: true },
  { name: 'Aylah', role: 'Scout', color: 0x9b59b6, position: new THREE.Vector3(54, 0, -35), online: true },
  { name: 'Chloe', role: 'Farmer', color: 0x2ecc71, position: new THREE.Vector3(-58, 0, -18), online: true },
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c9ff);
scene.fog = new THREE.Fog(0x87c9ff, 38, 145);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
document.getElementById('game').appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xcfefff, 0x274727, 1.2);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(28, 48, 18);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
scene.add(sun);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

const zombies = [];
const pickups = [];
const resources = [];
const houses = [];
const bullets = [];
const friendlyMeshes = [];
const safeZone = { x: -64, z: 64, radius: 18 };

const mats = {
  grass: new THREE.MeshLambertMaterial({ color: 0x51a546 }),
  road: new THREE.MeshLambertMaterial({ color: 0x343434 }),
  dirt: new THREE.MeshLambertMaterial({ color: 0x85623c }),
  wood: new THREE.MeshLambertMaterial({ color: 0x7a4b24 }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x1f7d35 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x777f84 }),
  zombie: new THREE.MeshLambertMaterial({ color: 0x4faa37 }),
  zombieStun: new THREE.MeshLambertMaterial({ color: 0xb4e65b }),
  zombieShirt: new THREE.MeshLambertMaterial({ color: 0x314b78 }),
  blood: new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  pistol: new THREE.MeshLambertMaterial({ color: 0x22252a }),
  metal: new THREE.MeshLambertMaterial({ color: 0xa8a8a8 }),
  water: new THREE.MeshLambertMaterial({ color: 0x2f9cff }),
  food: new THREE.MeshLambertMaterial({ color: 0xe0b24c }),
  hand: new THREE.MeshLambertMaterial({ color: 0xf1b47d }),
  yellow: new THREE.MeshBasicMaterial({ color: 0xffee33 }),
  white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  black: new THREE.MeshBasicMaterial({ color: 0x111111 }),
  mouth: new THREE.MeshBasicMaterial({ color: 0x4a1717 }),
  safe: new THREE.MeshBasicMaterial({ color: 0x42f5a7, transparent: true, opacity: 0.18 }),
  safeLine: new THREE.MeshBasicMaterial({ color: 0x42f5a7 }),
  survivorBlue: new THREE.MeshLambertMaterial({ color: 0x315c9a }),
};

function terrainHeight(x, z) {
  return Math.sin(x * 0.055) * 1.6 + Math.cos(z * 0.047) * 1.2 + Math.sin((x + z) * 0.027) * 0.8;
}

function isInSafeZone(pos) {
  const dx = pos.x - safeZone.x;
  const dz = pos.z - safeZone.z;
  return Math.sqrt(dx * dx + dz * dz) <= safeZone.radius;
}

function loadVault() {
  try {
    return JSON.parse(localStorage.getItem('blocklandVaultV06') || '{}');
  } catch (_) {
    return {};
  }
}

function saveVault() {
  localStorage.setItem('blocklandVaultV06', JSON.stringify(state.vault || {}));
}

function createTerrain() {
  const size = 180;
  const segments = 90;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let y = terrainHeight(x, z);
    if (Math.abs(x) < 4) y -= 0.8; // road flatten
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.grass);
  mesh.receiveShadow = true;
  scene.add(mesh);

  for (let z = -85; z < 85; z += 12) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.08, 12.5), mats.road);
    road.position.set(0, terrainHeight(0, z) + 0.04, z);
    road.receiveShadow = true;
    scene.add(road);
  }

  const hill = new THREE.Mesh(new THREE.ConeGeometry(22, 18, 5), new THREE.MeshLambertMaterial({ color: 0x487f38 }));
  hill.position.set(-55, terrainHeight(-55, -50) + 6.5, -50);
  hill.rotation.y = Math.PI / 5;
  hill.scale.set(1.4, 0.65, 1.1);
  hill.receiveShadow = true;
  scene.add(hill);
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addHouse(x, z, color = 0x9b6a43) {
  const group = new THREE.Group();
  const body = box(8, 5, 8, new THREE.MeshLambertMaterial({ color }));
  body.position.y = 2.5;
  group.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3, 4), new THREE.MeshLambertMaterial({ color: 0x6f2a1f }));
  roof.position.y = 6.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
  const door = box(1.8, 3, 0.12, new THREE.MeshLambertMaterial({ color: 0x3f2618 }));
  door.position.set(0, 1.5, 4.07);
  group.add(door);
  const y = terrainHeight(x, z);
  group.position.set(x, y, z);
  scene.add(group);
  houses.push({ group, x, z, radius: 5.5 });
}

function createSafeZone() {
  const y = terrainHeight(safeZone.x, safeZone.z) + 0.04;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(safeZone.radius, safeZone.radius, 0.08, 72), mats.safe);
  floor.position.set(safeZone.x, y, safeZone.z);
  scene.add(floor);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(safeZone.radius, 0.12, 8, 72), mats.safeLine);
  ring.position.set(safeZone.x, y + 0.08, safeZone.z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  const tower = box(3, 7, 3, new THREE.MeshLambertMaterial({ color: 0x496b5a }));
  tower.position.set(safeZone.x, y + 3.5, safeZone.z);
  scene.add(tower);
  const sign = box(8, 2.2, 0.3, new THREE.MeshLambertMaterial({ color: 0x16382a }));
  sign.position.set(safeZone.x, y + 7.2, safeZone.z - 3.2);
  scene.add(sign);

  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const px = safeZone.x + Math.cos(angle) * safeZone.radius;
    const pz = safeZone.z + Math.sin(angle) * safeZone.radius;
    const post = box(0.5, 2.2, 0.5, mats.safeLine);
    post.position.set(px, terrainHeight(px, pz) + 1.1, pz);
    scene.add(post);
  }
}

function createFriendlySurvivor(player) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: player.color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xf0b17a });
  const body = box(1.1, 1.7, 0.65, shirt);
  body.position.y = 1.65;
  const head = box(0.86, 0.86, 0.86, skin);
  head.position.y = 3.05;
  const eyeL = box(0.12, 0.12, 0.04, mats.black);
  const eyeR = box(0.12, 0.12, 0.04, mats.black);
  eyeL.position.set(-0.18, 3.12, -0.45);
  eyeR.position.set(0.18, 3.12, -0.45);
  const legs = box(0.9, 1.2, 0.5, new THREE.MeshLambertMaterial({ color: 0x263348 }));
  legs.position.y = 0.6;
  group.add(body, head, eyeL, eyeR, legs);
  group.position.copy(player.position);
  group.position.y = terrainHeight(group.position.x, group.position.z);
  scene.add(group);
  friendlyMeshes.push(group);
}

function createServerSurvivors() {
  for (const p of serverPlayers) createFriendlySurvivor(p);
}

function addTree(x, z) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 4, 7), mats.wood);
  trunk.position.y = 2;
  trunk.castShadow = true;
  group.add(trunk);
  const top1 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 8), mats.leaves);
  top1.position.y = 5;
  top1.castShadow = true;
  group.add(top1);
  const top2 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.2, 8), mats.leaves);
  top2.position.y = 6.7;
  top2.castShadow = true;
  group.add(top2);
  group.position.set(x, terrainHeight(x, z), z);
  scene.add(group);
  resources.push({ type: 'tree', group, position: group.position.clone(), hp: 60, radius: 2.4 });
}

function addRock(x, z) {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 0), mats.stone);
  mesh.scale.set(1.35, 0.85, 1.1);
  mesh.position.set(x, terrainHeight(x, z) + 0.85, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  resources.push({ type: 'rock', group: mesh, position: mesh.position.clone(), hp: 75, radius: 2.1 });
}

function createWorld() {
  createTerrain();
  createSafeZone();
  createServerSurvivors();
  addHouse(16, 18, 0x9c7648);
  addHouse(-20, 28, 0x8d8f7a);
  addHouse(28, -16, 0x875743);
  addHouse(-30, -22, 0x7b754e);
  addHouse(48, 25, 0xa87a44);

  const spots = [
    [-36, 16], [-48, 8], [-42, -14], [-22, -45], [18, -38], [38, -44], [56, -20],
    [62, 16], [44, 44], [18, 52], [-16, 54], [-54, 44], [-70, -34], [72, 52],
  ];
  for (const [x, z] of spots) addTree(x, z);
  for (let i = 0; i < 35; i++) {
    const x = THREE.MathUtils.randFloatSpread(150);
    const z = THREE.MathUtils.randFloatSpread(150);
    if (Math.abs(x) < 8 && Math.abs(z) < 80) continue;
    if (Math.random() < 0.7) addTree(x, z); else addRock(x, z);
  }
  for (let i = 0; i < 16; i++) {
    spawnPickup(randomLootType(false), 1 + Math.floor(Math.random() * 2), new THREE.Vector3(THREE.MathUtils.randFloatSpread(130), 0, THREE.MathUtils.randFloatSpread(130)));
  }
  for (let i = 0; i < 9; i++) spawnZombie(true);
}

function createZombieMesh() {
  const group = new THREE.Group();
  const body = box(1.2, 1.8, 0.7, mats.zombieShirt);
  body.position.y = 1.7;
  group.add(body);
  const head = box(0.9, 0.9, 0.9, mats.zombie);
  head.position.y = 3.1;
  group.add(head);
  const eyeL = box(0.13, 0.13, 0.04, mats.black);
  const eyeR = box(0.13, 0.13, 0.04, mats.black);
  eyeL.position.set(-0.20, 3.20, -0.47);
  eyeR.position.set(0.20, 3.20, -0.47);
  const mouth = box(0.42, 0.12, 0.045, mats.mouth);
  mouth.position.set(0, 2.93, -0.47);
  const tooth = box(0.10, 0.08, 0.05, mats.white);
  tooth.position.set(0.1, 2.98, -0.50);
  group.add(eyeL, eyeR, mouth, tooth);
  const armL = box(0.35, 1.5, 0.35, mats.zombie);
  armL.position.set(-0.88, 1.75, -0.1);
  armL.rotation.x = -0.5;
  group.add(armL);
  const armR = box(0.35, 1.5, 0.35, mats.zombie);
  armR.position.set(0.88, 1.75, -0.1);
  armR.rotation.x = -0.5;
  group.add(armR);
  const legL = box(0.42, 1.35, 0.42, mats.zombie);
  legL.position.set(-0.35, 0.65, 0);
  group.add(legL);
  const legR = box(0.42, 1.35, 0.42, mats.zombie);
  legR.position.set(0.35, 0.65, 0);
  group.add(legR);

  const stars = new THREE.Group();
  stars.visible = false;
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), mats.yellow);
    const a = (i / 5) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.9, 3.85 + Math.sin(i) * 0.15, Math.sin(a) * 0.9);
    stars.add(s);
  }
  group.add(stars);

  return { group, head, stars, armL, armR, legL, legR };
}

function spawnZombie(initial = false) {
  let x, z;
  if (initial) {
    x = THREE.MathUtils.randFloatSpread(120);
    z = THREE.MathUtils.randFloatSpread(120);
  } else {
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 35;
    x = state.player.x + Math.cos(angle) * distance;
    z = state.player.z + Math.sin(angle) * distance;
  }
  if (Math.abs(x - state.player.x) < 14 && Math.abs(z - state.player.z) < 14) x += 28;
  if (isInSafeZone(new THREE.Vector3(x, 0, z))) {
    x += Math.sign(x - safeZone.x || 1) * 34;
    z += Math.sign(z - safeZone.z || -1) * 34;
  }
  const parts = createZombieMesh();
  parts.group.position.set(x, terrainHeight(x, z), z);
  scene.add(parts.group);
  zombies.push({
    ...parts,
    hp: 100,
    speed: 3.35 + Math.random() * 0.85,
    attackCooldown: 0,
    stun: 0,
    alive: true,
    phase: Math.random() * 10,
  });
}

function makePickupMesh(type) {
  const group = new THREE.Group();
  let mesh;
  if (type === 'ammo' || type === 'ammoRifle' || type === 'ammoSniper') {
    mesh = box(0.9, 0.35, 0.45, type === 'ammoSniper' ? mats.white : mats.metal);
    const cap = box(0.18, 0.38, 0.48, new THREE.MeshLambertMaterial({ color: type === 'ammoRifle' ? 0x5fe0a7 : 0xd6a437 }));
    cap.position.x = 0.5;
    group.add(cap);
  } else if (type === 'water') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 12), mats.water);
  } else if (type === 'food') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 12), mats.food);
  } else if (type === 'viper' || type === 'maplestrike' || type === 'sniper') {
    mesh = new THREE.Group();
    const longness = type === 'sniper' ? 1.8 : type === 'maplestrike' ? 1.45 : 1.0;
    const body = box(0.28, 0.26, longness, type === 'viper' ? mats.pistol : mats.metal);
    const grip = box(0.20, 0.55, 0.18, mats.pistol);
    grip.position.set(0, -0.34, 0.22);
    const barrel = box(0.12, 0.12, 0.65, mats.black);
    barrel.position.set(0, 0.06, -longness * 0.62);
    mesh.add(body, grip, barrel);
  } else if (type === 'axe') {
    mesh = new THREE.Group();
    const handle = box(0.16, 1.3, 0.16, mats.wood);
    handle.rotation.z = -0.5;
    const blade = box(0.65, 0.45, 0.12, mats.metal);
    blade.position.set(0.3, 0.45, 0);
    mesh.add(handle, blade);
  } else if (type === 'wood') {
    mesh = box(1.1, 0.32, 0.32, mats.wood);
  } else if (type === 'stone') {
    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), mats.stone);
  } else if (type === 'tool') {
    mesh = box(0.7, 0.22, 0.22, mats.metal);
  } else {
    mesh = box(0.6, 0.6, 0.6, mats.white);
  }
  group.add(mesh);
  group.userData.type = type;
  return group;
}

function spawnPickup(type, qty, pos) {
  pos.y = terrainHeight(pos.x, pos.z) + 0.55;
  const mesh = makePickupMesh(type);
  mesh.position.copy(pos);
  mesh.rotation.y = Math.random() * Math.PI;
  scene.add(mesh);
  pickups.push({ type, qty, mesh, ttl: 240 });
}

function randomLootType(rareTools = true) {
  const roll = Math.random();
  if (roll < 0.22) return 'ammo';
  if (roll < 0.36) return 'ammoRifle';
  if (roll < 0.42) return 'ammoSniper';
  if (roll < 0.56) return 'food';
  if (roll < 0.70) return 'water';
  if (roll < 0.80) return 'wood';
  if (roll < 0.89) return 'stone';
  if (rareTools && roll < 0.955) return 'tool';
  if (rareTools && roll < 0.975) return 'viper';
  if (rareTools && roll < 0.992) return 'maplestrike';
  if (rareTools && roll < 0.998) return 'sniper';
  return 'axe';
}

function zombieDropLoot(z) {
  const base = z.group.position.clone();
  const count = 2 + Math.floor(Math.random() * 4);
  spawnPickup(Math.random() < 0.55 ? 'ammo' : 'ammoRifle', 6 + Math.floor(Math.random() * 14), scatter(base));
  for (let i = 1; i < count; i++) {
    const type = randomLootType(true);
    let qty = 1;
    if (type === 'ammo') qty = 4 + Math.floor(Math.random() * 10);
    if (type === 'ammoRifle') qty = 8 + Math.floor(Math.random() * 14);
    if (type === 'ammoSniper') qty = 1 + Math.floor(Math.random() * 4);
    if (type === 'wood' || type === 'stone') qty = 1 + Math.floor(Math.random() * 3);
    spawnPickup(type, qty, scatter(base));
  }
}

function scatter(base) {
  return new THREE.Vector3(base.x + THREE.MathUtils.randFloatSpread(3.5), 0, base.z + THREE.MathUtils.randFloatSpread(3.5));
}

const handRoot = new THREE.Group();
camera.add(handRoot);
scene.add(camera);
let heldItem = null;

function clearHeld() {
  while (handRoot.children.length) handRoot.remove(handRoot.children[0]);
}

function createHeldModel(id) {
  const group = new THREE.Group();
  const arm = box(0.28, 0.28, 0.95, mats.hand);
  arm.position.set(0.22, -0.05, 0.27);
  arm.rotation.x = -0.25;
  group.add(arm);

  if (weaponDefs[id]) {
    const longness = id === 'sniper' ? 1.45 : id === 'maplestrike' ? 1.15 : id === 'viper' ? 0.86 : 0.72;
    const mainMat = id === 'viper' || id === 'pistol' ? mats.pistol : mats.metal;
    const body = box(0.34, 0.28, longness, mainMat);
    body.position.set(0.33, 0.08, -0.20 - longness * 0.08);
    const barrel = box(0.16, 0.14, longness * 0.85, id === 'sniper' ? mats.black : mats.metal);
    barrel.position.set(0.33, 0.16, -0.48 - longness * 0.34);
    const grip = box(0.22, 0.50, 0.18, mats.pistol);
    grip.position.set(0.33, -0.22, 0.12);
    grip.rotation.x = -0.3;
    group.add(body, barrel, grip);
    if (id === 'sniper') {
      const scope = box(0.20, 0.20, 0.55, mats.black);
      scope.position.set(0.33, 0.35, -0.35);
      group.add(scope);
    }
  } else if (id === 'axe') {
    const handle = box(0.14, 0.14, 1.35, mats.wood);
    handle.position.set(0.33, 0.14, -0.35);
    handle.rotation.x = 0.95;
    const blade = box(0.75, 0.45, 0.12, mats.metal);
    blade.position.set(0.48, 0.62, -0.78);
    blade.rotation.z = 0.2;
    group.add(handle, blade);
  } else if (id === 'water') {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.65, 12), mats.water);
    bottle.position.set(0.35, 0.05, -0.28);
    bottle.rotation.x = 0.25;
    const cap = box(0.18, 0.08, 0.18, mats.white);
    cap.position.set(0.35, 0.42, -0.28);
    group.add(bottle, cap);
  } else if (id === 'food') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12), mats.food);
    can.position.set(0.34, 0.05, -0.25);
    can.rotation.x = Math.PI / 2;
    group.add(can);
  } else if (id === 'ammo') {
    const pack = box(0.52, 0.32, 0.35, mats.metal);
    pack.position.set(0.34, 0.06, -0.25);
    group.add(pack);
  } else if (id === 'wood') {
    const log = box(0.72, 0.22, 0.22, mats.wood);
    log.position.set(0.34, 0.04, -0.25);
    log.rotation.z = 0.5;
    group.add(log);
  } else if (id === 'stone') {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), mats.stone);
    rock.position.set(0.35, 0.06, -0.25);
    group.add(rock);
  } else if (id === 'tool') {
    const wrench = box(0.55, 0.12, 0.12, mats.metal);
    wrench.position.set(0.34, 0.08, -0.25);
    wrench.rotation.z = 0.4;
    group.add(wrench);
  }
  return group;
}

function updateHeldModel() {
  clearHeld();
  const id = slots[state.selected].id;
  heldItem = createHeldModel(id);
  handRoot.add(heldItem);
}

function updateHand(dt) {
  if (!heldItem) return;
  const moving = state.keys.has('KeyW') || state.keys.has('ArrowUp') || state.keys.has('KeyS') || state.keys.has('ArrowDown') || state.keys.has('KeyA') || state.keys.has('ArrowLeft') || state.keys.has('KeyD') || state.keys.has('ArrowRight');
  if (moving && state.grounded) state.bob += dt * 10; else state.bob *= 0.9;
  if (state.attackAnim > 0) state.attackAnim = Math.max(0, state.attackAnim - dt * 5);
  const bobY = Math.sin(state.bob) * 0.018;
  const bobX = Math.cos(state.bob * 0.5) * 0.012;
  handRoot.position.set(0.26 + bobX, -0.30 + bobY, -0.55);
  handRoot.rotation.set(0, 0, 0);

  const slot = slots[state.selected];
  if (state.attackAnim > 0) {
    const a = Math.sin(state.attackAnim * Math.PI);
    if (slot.id === 'axe') {
      handRoot.rotation.x = -0.95 * a;
      handRoot.rotation.z = -0.25 * a;
    } else if (weaponDefs[slot.id]) {
      handRoot.position.z += 0.10 * a;
      handRoot.rotation.x = 0.12 * a;
    } else {
      handRoot.position.y += 0.11 * a;
      handRoot.rotation.x = -0.25 * a;
    }
  }
}

function showMessage(text, time = 1.7) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.classList.add('show');
  state.messageTimer = time;
}

function createBulletTrail(target, color = 0xfff2a3) {
  const start = new THREE.Vector3();
  camera.getWorldPosition(start);
  const end = target ? target.clone() : start.clone().add(getForward().multiplyScalar(45));
  const points = [start, end];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
  scene.add(line);
  bullets.push({ line, ttl: 0.08 });
}

function getForward() {
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(camera.quaternion);
  return forward.normalize();
}

function currentWeaponDef() {
  const id = slots[state.selected].id;
  return weaponDefs[id] ? { id, ...weaponDefs[id] } : null;
}

function getSelectedAmmoCount() {
  const def = currentWeaponDef();
  if (!def) return '-';
  return state.inventory[def.ammo] || 0;
}

function shoot() {
  const def = currentWeaponDef();
  if (!def) return showMessage('Equipe uma arma primeiro.');
  if ((state.inventory[def.id] || 0) <= 0) return showMessage(`Você ainda não tem ${def.label}.`);
  if ((state.inventory[def.ammo] || 0) <= 0) return showMessage('Sem munição para essa arma!');
  state.inventory[def.ammo]--;
  state.attackAnim = 1;
  playSound(def.sound);

  raycaster.setFromCamera(new THREE.Vector2(THREE.MathUtils.randFloatSpread(def.spread), THREE.MathUtils.randFloatSpread(def.spread)), camera);
  let best = null;
  let bestDist = Infinity;
  for (const z of zombies) {
    if (!z.alive) continue;
    const dist = z.group.position.distanceTo(state.player);
    if (dist > def.range) continue;
    const box3 = new THREE.Box3().setFromObject(z.group);
    const hit = raycaster.ray.intersectBox(box3, new THREE.Vector3());
    if (hit && dist < bestDist) {
      best = z;
      bestDist = dist;
    }
  }

  if (best) {
    damageZombie(best, def.damage, def.stun);
    createBulletTrail(best.group.position.clone().add(new THREE.Vector3(0, 2.3, 0)), def.color);
  } else {
    createBulletTrail(null, def.color);
  }
}

function axeUse() {
  if (state.inventory.axe <= 0) return showMessage('Você não tem machado.');
  state.attackAnim = 1;
  playSound('axe');
  const forward = getForward();
  let hitSomething = false;

  for (const z of zombies) {
    if (!z.alive) continue;
    const to = z.group.position.clone().sub(state.player);
    const dist = to.length();
    if (dist < 3.2 && forward.dot(to.normalize()) > 0.25) {
      damageZombie(z, 28, 1.25);
      hitSomething = true;
      break;
    }
  }

  if (!hitSomething) {
    for (let i = resources.length - 1; i >= 0; i--) {
      const r = resources[i];
      const to = r.position.clone().sub(state.player);
      const dist = to.length();
      if (dist < 4.0 && forward.dot(to.normalize()) > 0.1) {
        r.hp -= 25;
        r.group.scale.multiplyScalar(0.96);
        hitSomething = true;
        showMessage(r.type === 'tree' ? 'Cortando árvore...' : 'Quebrando pedra...');
        if (r.hp <= 0) {
          scene.remove(r.group);
          resources.splice(i, 1);
          const loot = r.type === 'tree' ? 'wood' : 'stone';
          const qty = r.type === 'tree' ? 4 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 3);
          spawnPickup(loot, qty, r.position.clone());
          showMessage(r.type === 'tree' ? `Árvore derrubada: +${qty} madeira` : `Pedra quebrada: +${qty} pedra`);
        }
        break;
      }
    }
  }

  if (!hitSomething) showMessage('Golpe no ar.');
}

function damageZombie(z, amount, stunTime) {
  z.hp -= amount;
  z.stun = Math.max(z.stun, stunTime);
  z.stars.visible = true;
  z.head.material = mats.zombieStun;
  if (z.hp <= 0) killZombie(z);
}

function killZombie(z) {
  if (!z.alive) return;
  z.alive = false;
  scene.remove(z.group);
  zombieDropLoot(z);
  const idx = zombies.indexOf(z);
  if (idx >= 0) zombies.splice(idx, 1);
  showMessage('Zumbi eliminado! Loot no chão.');
}

function useCurrentItem() {
  const slot = slots[state.selected];
  if (slot.use === 'weapon') shoot();
  else if (slot.use === 'axe') axeUse();
  else if (slot.use === 'drink') drinkWater();
  else if (slot.use === 'eat') eatFood();
  else showMessage('Esse item não é usável agora.');
}

function drinkWater() {
  if (state.inventory.water <= 0) return showMessage('Você não tem água.');
  state.inventory.water--;
  state.thirst = Math.min(100, state.thirst + 38);
  state.attackAnim = 1;
  playSound('drink');
  showMessage('Bebeu água.');
}

function eatFood() {
  if (state.inventory.food <= 0) return showMessage('Você não tem comida.');
  state.inventory.food--;
  state.hunger = Math.min(100, state.hunger + 35);
  state.attackAnim = 1;
  playSound('eat');
  showMessage('Comeu enlatado.');
}

function pickupNearest() {
  let nearest = null;
  let dist = Infinity;
  for (const p of pickups) {
    const d = p.mesh.position.distanceTo(state.player);
    if (d < dist) { dist = d; nearest = p; }
  }
  if (!nearest || dist > 3) return false;
  collectPickup(nearest);
  return true;
}

function collectPickup(p) {
  if (!state.inventory[p.type]) state.inventory[p.type] = 0;
  state.inventory[p.type] += p.qty;
  playSound('pickup');
  scene.remove(p.mesh);
  const idx = pickups.indexOf(p);
  if (idx >= 0) pickups.splice(idx, 1);
  showMessage(`Coletou ${p.qty}x ${labelOf(p.type)}.`);
}

function labelOf(type) {
  const labels = {
    ammo: 'Munição pistola', ammoRifle: 'Munição rifle', ammoSniper: 'Munição sniper',
    viper: 'Viper', maplestrike: 'MapleStrike', sniper: 'Sniper', hands: 'Mãos',
    pistol: 'Pistolinha', axe: 'Machado', water: 'Água', food: 'Comida', wood: 'Madeira', stone: 'Pedra', tool: 'Ferramenta'
  };
  const found = slots.find(s => s.id === type);
  return labels[type] || (found ? found.label : type);
}

function updateMovement(dt) {
  const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw) * -1);
  // Corrige direção: câmera olha para -Z quando yaw=0.
  forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw)).normalize();
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw)).normalize();
  const move = new THREE.Vector3();
  if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) move.add(forward);
  if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) move.sub(forward);
  if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) move.add(right);
  if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) move.sub(right);

  const running = state.keys.has('ShiftLeft') || state.keys.has('ShiftRight');
  let speed = running && state.energy > 5 ? 8.0 : 5.0;
  if (running && move.lengthSq() > 0 && state.grounded) state.energy = Math.max(0, state.energy - dt * 13);
  else state.energy = Math.min(100, state.energy + dt * 6);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    const nextX = state.player.clone();
    nextX.x += move.x;
    if (!collides(nextX)) state.player.x = THREE.MathUtils.clamp(nextX.x, -86, 86);
    const nextZ = state.player.clone();
    nextZ.z += move.z;
    if (!collides(nextZ)) state.player.z = THREE.MathUtils.clamp(nextZ.z, -86, 86);
  }

  state.velocityY -= 22 * dt;
  state.player.y += state.velocityY * dt;
  const ground = terrainHeight(state.player.x, state.player.z) + 2.0;
  if (state.player.y <= ground) {
    state.player.y = ground;
    state.velocityY = 0;
    state.grounded = true;
  } else {
    state.grounded = false;
  }

  state.safe = isInSafeZone(state.player);
  if (move.lengthSq() > 0 && state.grounded) {
    state.footstepTimer -= dt;
    if (state.footstepTimer <= 0) {
      playSound(state.safe ? 'stepSafe' : 'step');
      state.footstepTimer = running ? 0.28 : 0.43;
    }
  }

  camera.position.copy(state.player);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
}

function collides(pos) {
  for (const h of houses) {
    const dx = Math.abs(pos.x - h.x);
    const dz = Math.abs(pos.z - h.z);
    if (dx < 5.6 && dz < 5.6) return true;
  }
  return false;
}

function updateZombies(dt) {
  for (const z of zombies) {
    if (!z.alive) continue;
    z.phase += dt * 6;
    z.attackCooldown = Math.max(0, z.attackCooldown - dt);
    const zp = z.group.position;

    if (isInSafeZone(zp)) {
      const away = zp.clone().sub(new THREE.Vector3(safeZone.x, zp.y, safeZone.z));
      away.y = 0;
      if (away.lengthSq() < 0.01) away.set(1, 0, 0);
      away.normalize();
      zp.x = safeZone.x + away.x * (safeZone.radius + 1.8);
      zp.z = safeZone.z + away.z * (safeZone.radius + 1.8);
      zp.y = terrainHeight(zp.x, zp.z);
    }

    const dir = state.player.clone().sub(zp);
    dir.y = 0;
    const dist = dir.length();

    if (z.stun > 0) {
      z.stun -= dt;
      z.stars.visible = true;
      z.stars.rotation.y += dt * 7;
      z.armL.rotation.x = -0.9;
      z.armR.rotation.x = -0.9;
      if (z.stun <= 0) {
        z.stars.visible = false;
        z.head.material = mats.zombie;
      }
    } else if (dist > 0.01) {
      dir.normalize();
      const chase = dist < 68 && !state.safe;
      if (chase) {
        zp.addScaledVector(dir, z.speed * dt);
        zp.y = terrainHeight(zp.x, zp.z);
        z.group.rotation.y = Math.atan2(dir.x, dir.z);
        if (Math.random() < dt * 0.18) playSound('zombie');
      }
      const walk = Math.sin(z.phase) * 0.55;
      z.legL.rotation.x = walk;
      z.legR.rotation.x = -walk;
      z.armL.rotation.x = -0.55 - walk * 0.25;
      z.armR.rotation.x = -0.55 + walk * 0.25;
    }

    if (!state.safe && dist < 2.05 && z.stun <= 0 && z.attackCooldown <= 0) {
      state.health = Math.max(0, state.health - 8);
      z.attackCooldown = 0.85;
      playSound('hurt');
      showMessage('Zumbi te atacou!');
      if (state.health <= 0) endGame();
    }
  }
}

function updatePickups(dt) {
  for (const p of pickups) {
    p.mesh.rotation.y += dt * 1.5;
    p.mesh.position.y = terrainHeight(p.mesh.position.x, p.mesh.position.z) + 0.55 + Math.sin(clock.elapsedTime * 2 + p.mesh.position.x) * 0.12;
    if (p.mesh.position.distanceTo(state.player) < 1.7) collectPickup(p);
  }
}

function updateSurvival(dt) {
  // v0.9: balanceamento para PVP/raid.
  // Na SAFE a fome e a sede não descem; fora dela descem muito devagar.
  if (state.safe) return;

  const HUNGER_DRAIN_PER_SECOND = 0.012; // 100 -> 0 em ~2h18min
  const THIRST_DRAIN_PER_SECOND = 0.016; // 100 -> 0 em ~1h44min

  state.hunger = Math.max(0, state.hunger - dt * HUNGER_DRAIN_PER_SECOND);
  state.thirst = Math.max(0, state.thirst - dt * THIRST_DRAIN_PER_SECOND);

  if (state.hunger <= 0 || state.thirst <= 0) {
    state.health = Math.max(0, state.health - dt * 2);
    if (state.health <= 0) endGame();
  }
}

function endGame() {
  state.gameOver = true;
  saveVault();
  showMessage('Você morreu. O vault ficou salvo. Aperte F5 para reiniciar.', 999);
  document.exitPointerLock?.();
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].ttl -= dt;
    if (bullets[i].ttl <= 0) {
      scene.remove(bullets[i].line);
      bullets.splice(i, 1);
    }
  }
}

function updateSpawns(dt) {
  state.zombieSpawnTimer -= dt;
  if (state.zombieSpawnTimer <= 0 && zombies.length < 18) {
    spawnZombie(false);
    state.zombieSpawnTimer = 6 + Math.random() * 6;
  }
}

function updateHUD(dt) {
  const pct = (v) => `${Math.max(0, Math.min(100, v)).toFixed(0)}%`;
  document.getElementById('healthBar').style.width = pct(state.health);
  document.getElementById('hungerBar').style.width = pct(state.hunger);
  document.getElementById('thirstBar').style.width = pct(state.thirst);
  document.getElementById('energyBar').style.width = pct(state.energy);
  document.getElementById('healthText').textContent = Math.round(state.health);
  document.getElementById('hungerText').textContent = Math.round(state.hunger);
  document.getElementById('thirstText').textContent = Math.round(state.thirst);
  document.getElementById('energyText').textContent = Math.round(state.energy);
  const balanceLine = document.getElementById('survivalBalanceLine');
  if (balanceLine) balanceLine.textContent = state.safe ? 'Fome/Sede: pausadas na SAFE' : 'Fome/Sede: modo PVP lento';
  document.getElementById('ammoText').textContent = getSelectedAmmoCount();
  document.getElementById('zombieText').textContent = zombies.length;
  document.getElementById('equippedText').textContent = slots[state.selected].label;
  document.getElementById('safeText').textContent = state.safe ? 'SAFE ZONE' : 'WILD';
  document.getElementById('safeText').className = state.safe ? 'safe-on' : 'safe-off';

  const hotbar = document.getElementById('hotbar');
  hotbar.innerHTML = '';
  slots.forEach((slot, i) => {
    const div = document.createElement('div');
    div.className = `slot ${i === state.selected ? 'active' : ''}`;
    let qty;
    if (weaponDefs[slot.id] || slot.id === 'axe') qty = (state.inventory[slot.id] > 0 ? 'OK' : '0');
    else if (slot.id === 'hands') qty = '-';
    else qty = state.inventory[slot.id] ?? 0;
    div.innerHTML = `<div class="key">${i + 1}</div><div class="name">${slot.label}</div><div class="qty">${qty}</div>`;
    hotbar.appendChild(div);
  });

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) document.getElementById('message').classList.remove('show');
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.started && !state.gameOver) {
    updateMovement(dt);
    updateZombies(dt);
    updatePickups(dt);
    updateSurvival(dt);
    updateBullets(dt);
    updateSpawns(dt);
    updateHand(dt);
  }
  updateHUD(dt);
  renderer.render(scene, camera);
}

function onKeyDown(e) {
  const code = e.code || e.key;
  const key = e.key || '';

  if (state.chatOpen) {
    if (code === 'Escape') closeAllOverlays();
    if (code === 'Enter') sendChatFromInput();
    return;
  }

  if (code === 'Escape') {
    if (state.mapOpen || state.kitsOpen || state.inventoryOpen) closeAllOverlays();
    return;
  }
  if (code === 'KeyJ') { toggleChat(true); return; }
  if (code === 'KeyM') { toggleMap(); return; }
  if (code === 'Comma') { toggleKits(); return; }
  if (code === 'Tab') { e.preventDefault(); toggleInventory(state.safe ? 'safe' : 'backpack'); return; }

  if (state.mapOpen || state.kitsOpen || state.inventoryOpen) return;

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code)) e.preventDefault();
  state.keys.add(code);

  if (code === 'Space' && state.grounded && !state.gameOver) {
    state.velocityY = 8.5;
    state.grounded = false;
    playSound('jump');
  }
  if (code === 'KeyE') pickupNearest();
  if (code === 'KeyF') useCurrentItem();
  if (/^Digit[1-9]$/.test(code)) {
    state.selected = Number(code.replace('Digit', '')) - 1;
    updateHeldModel();
  }
}

function onKeyUp(e) {
  state.keys.delete(e.code || e.key);
}

function onMouseMove(e) {
  if (document.pointerLockElement !== renderer.domElement || state.gameOver) return;
  state.yaw -= e.movementX * 0.0022;
  state.pitch -= e.movementY * 0.0022;
  state.pitch = THREE.MathUtils.clamp(state.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
}

function onMouseDown(e) {
  if (!state.started || state.gameOver || state.chatOpen || state.mapOpen || state.kitsOpen || state.inventoryOpen) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
    return;
  }
  if (e.button === 0) useCurrentItem();
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function startGame() {
  state.started = true;
  initAudio();
  playSound('serverLoad');
  document.getElementById('startScreen').style.display = 'none';
  renderer.domElement.requestPointerLock();
  teleportToSafe(false);
  showMessage('Servidor carregado. Você começou na SAFE. Use J para chat, M para mapa, , para kits.');
}


function initAudio() {
  if (state.audioReady) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  state.audioCtx = new AudioCtx();
  state.audioReady = true;
}

function beep(freq = 220, duration = 0.12, type = 'square', gain = 0.08, slide = 0) {
  if (!state.audioReady || !state.audioCtx) return;
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + duration);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * state.volume), ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function playSound(name) {
  if (!state.audioReady) return;
  const v = state.volume;
  if (v <= 0) return;
  if (name === 'pistol') { beep(520, 0.07, 'square', 0.10, -180); beep(110, 0.04, 'sawtooth', 0.05, -50); }
  else if (name === 'viper') { beep(720, 0.045, 'square', 0.08, -160); }
  else if (name === 'rifle') { beep(610, 0.08, 'sawtooth', 0.11, -240); beep(130, 0.05, 'square', 0.04, -50); }
  else if (name === 'sniper') { beep(360, 0.16, 'sawtooth', 0.14, -220); beep(80, 0.11, 'square', 0.09, -20); }
  else if (name === 'zombie') { beep(95 + Math.random()*40, 0.25, 'sawtooth', 0.045, -30); }
  else if (name === 'step' || name === 'stepSafe') { beep(name === 'stepSafe' ? 170 : 130, 0.055, 'triangle', 0.035, -20); }
  else if (name === 'pickup') { beep(660, 0.06, 'triangle', 0.06, 220); }
  else if (name === 'hurt') { beep(80, 0.18, 'sawtooth', 0.12, -30); }
  else if (name === 'axe') { beep(210, 0.09, 'triangle', 0.07, -60); }
  else if (name === 'drink') { beep(420, 0.12, 'sine', 0.045, 60); }
  else if (name === 'eat') { beep(180, 0.08, 'triangle', 0.05, -20); }
  else if (name === 'jump') { beep(240, 0.07, 'sine', 0.04, 60); }
  else if (name === 'serverLoad') { beep(220, 0.12, 'triangle', 0.05, 80); setTimeout(()=>beep(330,0.12,'triangle',0.05,120),130); setTimeout(()=>beep(440,0.18,'triangle',0.06,160),280); }
}

function teleportToSafe(announce = true) {
  state.player.set(safeZone.x, terrainHeight(safeZone.x, safeZone.z) + 2.0, safeZone.z + 3);
  state.velocityY = 0;
  state.safe = true;
  if (announce) showMessage('Teleportado para a SAFE. Zumbis e PVP desativados aqui.');
}

function closeAllOverlays() {
  state.chatOpen = state.mapOpen = state.kitsOpen = state.inventoryOpen = false;
  document.getElementById('chatPanel').classList.remove('open');
  document.getElementById('mapPanel').classList.remove('open');
  document.getElementById('kitsPanel').classList.remove('open');
  document.getElementById('inventoryPanel').classList.remove('open');
  if (state.started && !state.gameOver) renderer.domElement.requestPointerLock();
}

function toggleChat(forceOpen = null) {
  closeNonChatOverlays();
  state.chatOpen = forceOpen === null ? !state.chatOpen : forceOpen;
  const panel = document.getElementById('chatPanel');
  panel.classList.toggle('open', state.chatOpen);
  if (state.chatOpen) {
    document.exitPointerLock?.();
    const input = document.getElementById('chatInput');
    input.focus();
  }
}

function closeNonChatOverlays() {
  state.mapOpen = state.kitsOpen = state.inventoryOpen = false;
  document.getElementById('mapPanel').classList.remove('open');
  document.getElementById('kitsPanel').classList.remove('open');
  document.getElementById('inventoryPanel').classList.remove('open');
}

function addChatLine(author, msg, system = false) {
  const log = document.getElementById('chatLog');
  const line = document.createElement('div');
  line.className = system ? 'system' : '';
  line.innerHTML = system ? `<b>Sistema:</b> ${msg}` : `<b>${author}:</b> ${msg}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function sendChatFromInput() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  if (text.startsWith('/')) handleCommand(text);
  else {
    addChatLine(state.survivor.name, text);
    setTimeout(() => addChatLine('Noahn', 'Recebido! Bora sobreviver.'), 500);
  }
}

function handleCommand(text) {
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ');
  addChatLine(state.survivor.name, text);
  if (cmd === '/warp' && arg.toLowerCase() === 'safe') {
    teleportToSafe(true);
    addChatLine('Sistema', 'Warp usado: SAFE.', true);
  } else if (cmd === '/vault') {
    toggleInventory(state.safe ? 'safe' : 'small');
    addChatLine('Sistema', state.safe ? 'Vault da SAFE aberto.' : 'Vault remoto aberto em modo menor.', true);
  } else if (cmd === '/tpa') {
    const target = serverPlayers.find(p => p.name.toLowerCase() === arg.toLowerCase());
    if (!target) return addChatLine('Sistema', 'Use /tpa nome. Exemplo: /tpa Noahn', true);
    if (state.group.members.includes(target.name)) {
      state.player.copy(target.position).add(new THREE.Vector3(1.5, terrainHeight(target.position.x, target.position.z) + 2.0, 1.5));
      addChatLine('Sistema', `TPA para ${target.name} liberado pelo grupo.`, true);
      showMessage(`TPA para ${target.name}.`);
    } else {
      addChatLine('Sistema', `Pedido de TPA enviado para ${target.name}. Aguardando aceitar...`, true);
      setTimeout(() => {
        state.player.copy(target.position).add(new THREE.Vector3(1.5, terrainHeight(target.position.x, target.position.z) + 2.0, 1.5));
        addChatLine('Sistema', `${target.name} aceitou seu /tpa.`, true);
        showMessage(`${target.name} aceitou seu /tpa.`);
      }, 1800);
    }
  } else {
    addChatLine('Sistema', 'Comandos: /warp safe, /vault, /tpa Nome', true);
  }
}

function toggleMap() {
  closeAllOverlays();
  state.mapOpen = true;
  document.exitPointerLock?.();
  renderMap();
  document.getElementById('mapPanel').classList.add('open');
}

function renderMap() {
  const list = document.getElementById('playerList');
  list.innerHTML = '';
  const players = [{ name: state.survivor.name, role: 'Você', position: state.player, online: true }, ...serverPlayers];
  players.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'player-card';
    const inGroup = state.group.members.includes(p.name);
    row.innerHTML = `<div><b>${p.name}</b><span>${p.role} · ${p.online ? 'online' : 'offline'} · X:${Math.round(p.position.x)} Z:${Math.round(p.position.z)}</span></div>`;
    if (p.name !== state.survivor.name) {
      const btn = document.createElement('button');
      btn.textContent = inGroup ? 'No grupo' : 'Convidar';
      btn.disabled = inGroup;
      btn.addEventListener('click', () => inviteToGroup(p.name));
      row.appendChild(btn);
    }
    list.appendChild(row);
  });
  document.getElementById('groupNameDisplay').textContent = state.group.name || 'Sem grupo';
  document.getElementById('groupMembers').textContent = state.group.members.join(', ');
  drawServerMap(players);
}

function drawServerMap(players) {
  const canvas = document.getElementById('serverMapCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#244b2a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#303030'; ctx.fillRect(canvas.width/2 - 8, 0, 16, canvas.height);
  ctx.strokeStyle = '#42f5a7'; ctx.lineWidth = 3;
  const sx = (safeZone.x + 90) / 180 * canvas.width;
  const sz = (safeZone.z + 90) / 180 * canvas.height;
  ctx.beginPath(); ctx.arc(sx, sz, safeZone.radius / 180 * canvas.width, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#42f5a7'; ctx.fillText('SAFE', sx - 14, sz + 4);
  for (const p of players) {
    const x = (p.position.x + 90) / 180 * canvas.width;
    const z = (p.position.z + 90) / 180 * canvas.height;
    ctx.fillStyle = p.name === state.survivor.name ? '#ffd86a' : '#ffffff';
    ctx.beginPath(); ctx.arc(x, z, p.name === state.survivor.name ? 5 : 4, 0, Math.PI*2); ctx.fill();
    ctx.fillText(p.name, x + 7, z + 4);
  }
}

function createGroup() {
  const input = document.getElementById('groupNameInput');
  state.group.name = input.value.trim() || `${state.survivor.name} Squad`;
  renderMap();
  addChatLine('Sistema', `Grupo criado: ${state.group.name}`, true);
}

function inviteToGroup(name) {
  if (!state.group.name) state.group.name = `${state.survivor.name} Squad`;
  if (!state.group.invites.includes(name)) state.group.invites.push(name);
  addChatLine('Sistema', `Convite enviado para ${name}.`, true);
  setTimeout(() => {
    if (!state.group.members.includes(name)) state.group.members.push(name);
    addChatLine('Sistema', `${name} apertou Join e entrou no grupo ${state.group.name}.`, true);
    if (state.mapOpen) renderMap();
  }, 1200);
  renderMap();
}

function toggleKits() {
  closeAllOverlays();
  state.kitsOpen = true;
  document.exitPointerLock?.();
  document.getElementById('kitsPanel').classList.add('open');
}

function giveKit(kind) {
  if (kind === 'starter') {
    addItem('pistol', 1); addItem('ammo', 36); addItem('water', 1); addItem('food', 1);
  } else if (kind === 'viper') {
    addItem('viper', 1); addItem('ammoRifle', 80); addItem('food', 2);
  } else if (kind === 'maple') {
    addItem('maplestrike', 1); addItem('ammoRifle', 120); addItem('tool', 1);
  } else if (kind === 'sniper') {
    addItem('sniper', 1); addItem('ammoSniper', 18); addItem('water', 2);
  }
  updateHeldModel();
  showMessage('Kit recebido!');
  playSound('pickup');
}

function addItem(type, qty) {
  if (!state.inventory[type]) state.inventory[type] = 0;
  state.inventory[type] += qty;
}

function toggleInventory(mode = 'backpack') {
  closeAllOverlays();
  state.inventoryOpen = true;
  state.currentVaultMode = mode;
  document.exitPointerLock?.();
  renderInventory();
  document.getElementById('inventoryPanel').classList.add('open');
}

function renderInventory() {
  const mode = state.currentVaultMode;
  const title = mode === 'safe' ? 'Vault da SAFE — persiste após morrer' : mode === 'small' ? 'Vault remoto menor — /vault' : 'Inventário atual';
  document.getElementById('inventoryTitle').textContent = title;
  const inv = document.getElementById('inventoryList');
  const vault = document.getElementById('vaultList');
  inv.innerHTML = '';
  vault.innerHTML = '';
  Object.keys(state.inventory).forEach(type => {
    const qty = state.inventory[type] || 0;
    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `<span>${labelOf(type)}: <b>${qty}</b></span>`;
    const btn = document.createElement('button');
    btn.textContent = mode === 'backpack' ? 'Só na SAFE' : 'Guardar';
    btn.disabled = qty <= 0 || mode === 'backpack';
    btn.addEventListener('click', () => moveToVault(type, 1));
    row.appendChild(btn);
    inv.appendChild(row);
  });
  Object.keys(state.vault).sort().forEach(type => {
    const qty = state.vault[type] || 0;
    const row = document.createElement('div');
    row.className = 'inv-row';
    row.innerHTML = `<span>${labelOf(type)}: <b>${qty}</b></span>`;
    const btn = document.createElement('button');
    btn.textContent = 'Pegar';
    btn.disabled = qty <= 0;
    btn.addEventListener('click', () => moveFromVault(type, 1));
    row.appendChild(btn);
    vault.appendChild(row);
  });
  document.getElementById('vaultHint').textContent = mode === 'safe'
    ? 'Na SAFE o vault é completo e seguro.'
    : mode === 'small'
      ? 'Fora da SAFE, /vault abre versão menor. Use para emergências.'
      : 'Para guardar itens, vá para a SAFE ou use /vault.';
}

function moveToVault(type, qty) {
  if (state.currentVaultMode === 'backpack') return;
  const maxStacks = state.currentVaultMode === 'small' ? 6 : 999;
  if (!state.vault[type] && Object.keys(state.vault).length >= maxStacks) return showMessage('Vault remoto cheio. Vá para a SAFE.');
  if ((state.inventory[type] || 0) < qty) return;
  state.inventory[type] -= qty;
  if (!state.vault[type]) state.vault[type] = 0;
  state.vault[type] += qty;
  saveVault();
  renderInventory();
}

function moveFromVault(type, qty) {
  if ((state.vault[type] || 0) < qty) return;
  state.vault[type] -= qty;
  if (state.vault[type] <= 0) delete state.vault[type];
  addItem(type, qty);
  saveVault();
  renderInventory();
}

function applyMenuSettings() {
  const name = document.getElementById('survivorName').value.trim() || 'Survivor';
  const shirt = document.getElementById('shirtColor').value;
  const skin = document.getElementById('skinColor').value;
  state.survivor.name = name;
  state.survivor.shirt = shirt;
  state.survivor.skin = skin;
  localStorage.setItem('survivorName', name);
  localStorage.setItem('survivorShirt', shirt);
  localStorage.setItem('survivorSkin', skin);
  showMenuNotice('Survivor salvo!');
}

function showMenuNotice(text) {
  const el = document.getElementById('menuNotice');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

function wireUI() {
  document.getElementById('startButton').addEventListener('click', startGame);
  document.querySelectorAll('.menu-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.menu-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });
  document.getElementById('survivorName').value = state.survivor.name;
  document.getElementById('shirtColor').value = state.survivor.shirt;
  document.getElementById('skinColor').value = state.survivor.skin;
  document.getElementById('saveSurvivor').addEventListener('click', applyMenuSettings);
  document.getElementById('volumeSlider').value = state.volume;
  document.getElementById('volumeSlider').addEventListener('input', (e) => {
    state.volume = Number(e.target.value);
    localStorage.setItem('blocklandVolume', String(state.volume));
  });
  document.getElementById('createGroupBtn').addEventListener('click', createGroup);
  document.getElementById('chatSend').addEventListener('click', sendChatFromInput);
  document.querySelectorAll('[data-kit]').forEach(btn => btn.addEventListener('click', () => giveKit(btn.dataset.kit)));
  document.querySelectorAll('.closeOverlay').forEach(btn => btn.addEventListener('click', closeAllOverlays));
}

createWorld();
updateHeldModel();
updateHUD(0);
animate();

window.addEventListener('resize', resize);
window.addEventListener('keydown', onKeyDown, { passive: false });
window.addEventListener('keyup', onKeyUp);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseDown);
wireUI();


// ==============================
// v0.7 BASES + AIRDROP + RAID PATCH
// ==============================
(() => {
  const V07 = 'v0.9 PVP BALANCE EXTREMO - FOME/SEDE QUASE PARADAS';
  document.title = 'Blockland Survival v0.9';
  const versionEl = document.getElementById('version');
  if (versionEl) versionEl.textContent = V07;
  document.querySelectorAll('.brand h2').forEach(el => el.textContent = V07);

  const hud = document.getElementById('hud');
  if (hud && !document.getElementById('xpLine')) {
    const xp = document.createElement('div'); xp.id = 'xpLine'; xp.textContent = 'XP: 0'; hud.appendChild(xp);
    const veh = document.createElement('div'); veh.id = 'vehicleLine'; veh.textContent = 'CARRO'; hud.appendChild(veh);
    const raid = document.createElement('div'); raid.id = 'raidLine'; raid.textContent = 'Base: sem base · Airdrop: nenhum'; hud.appendChild(raid);
  }

  if (!document.getElementById('npcPanel')) {
    const npc = document.createElement('div');
    npc.id = 'npcPanel';
    npc.className = 'overlay small-overlay';
    npc.innerHTML = `
      <div class="overlay-head"><b id="npcTitle">NPC</b><button class="closeOverlay">ESC</button></div>
      <p id="npcText" class="note"></p>
      <div id="npcShop" class="npc-shop-grid"></div>
    `;
    document.body.appendChild(npc);
  }

  const kitsGrid = document.querySelector('#kitsPanel .kit-grid');
  if (kitsGrid) {
    kitsGrid.insertAdjacentHTML('beforeend', `
      <button data-kit="base"><b>Base Kit</b><span>3 paredes, porta, teto, cofre, gerador, cama, 2 torretas</span></button>
      <button data-kit="airdrop"><b>Airdrop Kit</b><span>Lançador de airdrop + sinalizador do mapa</span></button>
      <button data-kit="cali"><b>California Pack</b><span>Armas extras inspiradas em servidores survival</span></button>
    `);
  }

  // Estado novo
  Object.assign(state, {
    xp: Number(localStorage.getItem('blocklandXPV07') || '0'),
    respawn: null,
    vehicle: null,
    vehicles: [],
    bases: [],
    npcOpen: false,
    kitCooldowns: loadJSON('blocklandKitCooldownsV07', {}),
    airdrops: [],
    activeC4: [],
    armedC4: null,
    lastInteractAt: 0,
  });

  Object.assign(state.inventory, {
    minigun: state.inventory.minigun || 0,
    pdw: state.inventory.pdw || 0,
    caliRifle: state.inventory.caliRifle || 0,
    shotgun: state.inventory.shotgun || 0,
    ammoMini: state.inventory.ammoMini || 0,
    ammoShotgun: state.inventory.ammoShotgun || 0,
    airdropLauncher: state.inventory.airdropLauncher || 0,
    c4Throwable: state.inventory.c4Throwable || 0,
    c4Charge: state.inventory.c4Charge || 0,
    detonator: state.inventory.detonator || 0,
    baseKit: state.inventory.baseKit || 0,
    claimFlag: state.inventory.claimFlag || 0,
    gasoline: state.inventory.gasoline || 0,
    turretAmmo: state.inventory.turretAmmo || 0,
  });

  slots.splice(0, slots.length,
    { id: 'pistol', label: 'Pistolinha', use: 'weapon' },
    { id: 'viper', label: 'Viper', use: 'weapon' },
    { id: 'maplestrike', label: 'MapleStrike', use: 'weapon' },
    { id: 'sniper', label: 'Sniper', use: 'weapon' },
    { id: 'minigun', label: 'Minigun', use: 'weapon' },
    { id: 'pdw', label: 'Cali PDW', use: 'weapon' },
    { id: 'axe', label: 'Machado', use: 'axe' },
    { id: 'airdropLauncher', label: 'Airdrop', use: 'airdrop' },
    { id: 'c4Charge', label: 'C4 Porta', use: 'c4' },
    { id: 'detonator', label: 'Detonador', use: 'detonator' }
  );
  if (state.selected >= slots.length) state.selected = 0;

  Object.assign(weaponDefs, {
    minigun: { label: 'Minigun', ammo: 'ammoMini', damage: 18, range: 70, stun: 0.28, spread: 0.035, color: 0xffe477, sound: 'minigun' },
    pdw: { label: 'Cali PDW', ammo: 'ammoRifle', damage: 28, range: 54, stun: 0.45, spread: 0.018, color: 0x79f0ff, sound: 'viper' },
    caliRifle: { label: 'Cali Ranger', ammo: 'ammoRifle', damage: 42, range: 74, stun: 0.9, spread: 0.009, color: 0x98ff70, sound: 'rifle' },
    shotgun: { label: 'Cali Shotgun', ammo: 'ammoShotgun', damage: 75, range: 24, stun: 1.1, spread: 0.06, color: 0xffa95e, sound: 'shotgun' },
  });

  const itemSizes = {
    pistol:[2,1], viper:[3,1], maplestrike:[4,1], sniper:[5,1], minigun:[5,2], pdw:[3,1], caliRifle:[4,1], shotgun:[4,1],
    axe:[2,2], ammo:[1,1], ammoRifle:[1,1], ammoSniper:[1,1], ammoMini:[2,1], ammoShotgun:[1,1],
    water:[1,2], food:[1,1], wood:[2,1], stone:[1,1], tool:[1,1], gasoline:[1,2], turretAmmo:[2,1],
    airdropLauncher:[3,2], c4Throwable:[1,1], c4Charge:[1,1], detonator:[2,1], baseKit:[3,3], claimFlag:[2,2], hands:[1,1]
  };

  const V07_LABELS = {
    ammo: 'Munição pistola', ammoRifle: 'Munição rifle', ammoSniper: 'Munição sniper', ammoMini: 'Munição minigun', ammoShotgun: 'Cartuchos',
    viper: 'Viper', maplestrike: 'MapleStrike', sniper: 'Sniper', minigun: 'Minigun', pdw: 'Cali PDW', caliRifle: 'Cali Ranger', shotgun: 'Cali Shotgun',
    pistol: 'Pistolinha', axe: 'Machado', water: 'Água', food: 'Comida', wood: 'Madeira', stone: 'Pedra', tool: 'Ferramenta',
    airdropLauncher: 'Lançador Airdrop', c4Throwable: 'C4 lançável', c4Charge: 'C4 de porta', detonator: 'Detonador', baseKit: 'Kit Base', claimFlag: 'Bandeira Claim', gasoline: 'Gasolina', turretAmmo: 'Munição torreta', hands: 'Mãos'
  };

  // Materiais extras
  Object.assign(mats, {
    red: new THREE.MeshLambertMaterial({ color: 0xb93232 }),
    orange: new THREE.MeshLambertMaterial({ color: 0xff8c2e }),
    darkMetal: new THREE.MeshLambertMaterial({ color: 0x24282e }),
    glass: new THREE.MeshLambertMaterial({ color: 0x7ddcff, transparent: true, opacity: 0.55 }),
    blueGlow: new THREE.MeshBasicMaterial({ color: 0x58d7ff }),
    claim: new THREE.MeshLambertMaterial({ color: 0xffd86a }),
    car: new THREE.MeshLambertMaterial({ color: 0x4f73a8 }),
    npc: new THREE.MeshLambertMaterial({ color: 0x7954d8 }),
    turret: new THREE.MeshLambertMaterial({ color: 0x2f3439 }),
    c4: new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
  });

  function loadJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
  function saveKitCooldowns() { localStorage.setItem('blocklandKitCooldownsV07', JSON.stringify(state.kitCooldowns)); }
  function saveXP() { localStorage.setItem('blocklandXPV07', String(Math.max(0, Math.floor(state.xp)))); }
  function addXP(amount, reason) { state.xp += amount; saveXP(); showMessage(`+${amount} XP ${reason || ''}`.trim()); }

  labelOf = function(type) { return V07_LABELS[type] || type; };

  function near(a, b, radius) {
    const dx = a.x - b.x, dz = a.z - b.z;
    return Math.sqrt(dx*dx + dz*dz) <= radius;
  }
  function flatDist(a,b) { const dx=a.x-b.x, dz=a.z-b.z; return Math.sqrt(dx*dx+dz*dz); }

  const oldMakePickupMesh = makePickupMesh;
  makePickupMesh = function(type) {
    const group = new THREE.Group();
    let mesh;
    if (['minigun','pdw','caliRifle','shotgun'].includes(type)) {
      mesh = new THREE.Group();
      const length = type === 'minigun' ? 1.75 : type === 'shotgun' ? 1.45 : type === 'caliRifle' ? 1.55 : 1.05;
      const body = box(0.32, 0.28, length, type === 'minigun' ? mats.darkMetal : mats.metal);
      const grip = box(0.20, 0.55, 0.18, mats.pistol); grip.position.set(0, -0.34, 0.22);
      const barrel = box(0.12, 0.12, length * 0.55, mats.black); barrel.position.set(0, 0.06, -length * 0.62);
      mesh.add(body, grip, barrel);
      if (type === 'minigun') {
        for (let i=0;i<4;i++) { const b=box(0.08,0.08,0.72,mats.black); b.position.set(Math.cos(i*Math.PI/2)*0.11, Math.sin(i*Math.PI/2)*0.11 + .06, -1.1); mesh.add(b); }
      }
    } else if (['airdropLauncher'].includes(type)) {
      mesh = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,1.45,12), mats.darkMetal); tube.rotation.x = Math.PI/2; tube.position.z = -0.1;
      const sight = box(0.16,0.12,0.34,mats.blueGlow); sight.position.set(0,.24,-.28);
      mesh.add(tube, sight);
    } else if (['c4Throwable','c4Charge'].includes(type)) {
      mesh = new THREE.Group();
      const pack = box(0.62,0.34,0.48,mats.c4);
      const tape = box(0.68,0.08,0.52,mats.red); tape.position.y=.02;
      const light = box(0.12,0.12,0.06,mats.blueGlow); light.position.set(.22,.21,-.25);
      mesh.add(pack,tape,light);
    } else if (type === 'detonator') {
      mesh = new THREE.Group();
      const base = box(0.45,0.62,0.25,mats.darkMetal);
      const btn = box(0.22,0.10,0.12,mats.red); btn.position.y=.36;
      const ant = box(0.05,0.62,0.05,mats.black); ant.position.set(.22,.46,0);
      mesh.add(base,btn,ant);
    } else if (['baseKit','claimFlag','gasoline','turretAmmo','ammoMini','ammoShotgun'].includes(type)) {
      if (type === 'gasoline') {
        mesh = new THREE.Group();
        const can = box(.55,.75,.35,mats.red); const cap=box(.18,.12,.18,mats.black); cap.position.set(.18,.45,0); mesh.add(can,cap);
      } else if (type === 'claimFlag') {
        mesh = new THREE.Group(); const pole=box(.08,1.2,.08,mats.metal); const flag=box(.62,.38,.06,mats.claim); flag.position.set(.35,.35,0); mesh.add(pole,flag);
      } else {
        mesh = box(type==='baseKit'?0.9:0.65, type==='baseKit'?0.75:0.35, type==='baseKit'?0.9:0.45, type==='turretAmmo'?mats.darkMetal:mats.metal);
      }
    } else {
      return oldMakePickupMesh(type);
    }
    group.add(mesh);
    group.userData.type = type;
    return group;
  };

  randomLootType = function(rareTools = true) {
    const table = [
      ['ammo',14], ['ammoRifle',15], ['ammoSniper',6], ['ammoMini',4], ['ammoShotgun',5],
      ['food',10], ['water',10], ['wood',6], ['stone',6], ['tool',4], ['gasoline',3], ['turretAmmo',2],
      ['pistol',3], ['viper',3], ['maplestrike',2.4], ['sniper',1.5], ['pdw',2.2], ['caliRifle',1.7], ['shotgun',1.5], ['minigun',0.6],
      ['airdropLauncher',0.45], ['c4Throwable',0.75], ['c4Charge',0.65], ['detonator',0.35], ['axe',1.2], ['claimFlag',0.35]
    ];
    let total = table.reduce((s, r) => s + r[1], 0), roll = Math.random() * total;
    for (const [type, weight] of table) { roll -= weight; if (roll <= 0) return type; }
    return 'ammo';
  };

  zombieDropLoot = function(z) {
    const base = z.group.position.clone();
    const guaranteed = ['ammo','ammoRifle','food','water'];
    guaranteed.forEach((type, i) => spawnPickup(type, type.includes('ammo') ? 6 + Math.floor(Math.random()*12) : 1, scatterV07(base, i)));
    const count = 3 + Math.floor(Math.random()*5);
    for (let i=0; i<count; i++) {
      const type = randomLootType(true);
      let qty = 1;
      if (type === 'ammo') qty = 5 + Math.floor(Math.random()*12);
      if (type === 'ammoRifle') qty = 8 + Math.floor(Math.random()*18);
      if (type === 'ammoSniper') qty = 1 + Math.floor(Math.random()*5);
      if (type === 'ammoMini') qty = 20 + Math.floor(Math.random()*45);
      if (type === 'ammoShotgun') qty = 4 + Math.floor(Math.random()*10);
      if (type === 'wood' || type === 'stone') qty = 2 + Math.floor(Math.random()*4);
      if (type === 'turretAmmo') qty = 25 + Math.floor(Math.random()*40);
      if (type === 'gasoline') qty = 1 + Math.floor(Math.random()*2);
      spawnPickup(type, qty, scatterV07(base, i+4));
    }
  };
  function scatterV07(base, i=0) { const a = i*1.7 + Math.random(); const r = 1.2 + Math.random()*3; return new THREE.Vector3(base.x + Math.cos(a)*r, 0, base.z + Math.sin(a)*r); }

  // Reinicia zumbis e restringe perto das casas.
  function pickZombieHome() {
    const h = houses[Math.floor(Math.random() * houses.length)];
    const a = Math.random() * Math.PI * 2;
    const r = 7 + Math.random() * 14;
    return { house: h, x: h.x + Math.cos(a) * r, z: h.z + Math.sin(a) * r };
  }
  spawnZombie = function(initial = false) {
    const home = pickZombieHome();
    let x = home.x, z = home.z;
    if (isInSafeZone(new THREE.Vector3(x, 0, z))) return spawnZombie(initial);
    const parts = createZombieMesh();
    parts.group.position.set(x, terrainHeight(x, z), z);
    scene.add(parts.group);
    zombies.push({ ...parts, hp: 100, speed: 3.9 + Math.random()*1.15, attackCooldown: 0, stun: 0, alive: true, phase: Math.random()*10, homeX: home.house.x, homeZ: home.house.z, roamRadius: 24 + Math.random()*8 });
  };
  for (let i = zombies.length - 1; i >= 0; i--) { scene.remove(zombies[i].group); zombies.splice(i,1); }
  for (let i=0;i<14;i++) spawnZombie(true);

  const oldUpdateZombies = updateZombies;
  updateZombies = function(dt) {
    // Versão parecida com a original, mas zumbi não abandona a área das casas.
    for (const z of zombies) {
      if (!z.alive) continue;
      z.phase += dt * 6;
      z.attackCooldown = Math.max(0, z.attackCooldown - dt);
      const zp = z.group.position;
      if (isInSafeZone(zp)) {
        const away = zp.clone().sub(new THREE.Vector3(safeZone.x, zp.y, safeZone.z)); away.y = 0; if (away.lengthSq()<.01) away.set(1,0,0); away.normalize();
        zp.x = safeZone.x + away.x * (safeZone.radius + 1.8); zp.z = safeZone.z + away.z * (safeZone.radius + 1.8); zp.y = terrainHeight(zp.x,zp.z);
      }
      const home = new THREE.Vector3(z.homeX || 0, 0, z.homeZ || 0);
      const distHome = flatDist(zp, home);
      const dirToPlayer = state.player.clone().sub(zp); dirToPlayer.y = 0;
      const dist = dirToPlayer.length();
      const canChase = !state.safe && dist < 42 && distHome < (z.roamRadius || 28);
      if (z.stun > 0) {
        z.stun -= dt; z.stars.visible = true; z.stars.rotation.y += dt * 7; z.armL.rotation.x = -0.9; z.armR.rotation.x = -0.9;
        if (z.stun <= 0) { z.stars.visible = false; z.head.material = mats.zombie; }
      } else {
        let dir = new THREE.Vector3();
        if (canChase && dirToPlayer.lengthSq() > .01) dir.copy(dirToPlayer).normalize();
        else if (distHome > 5) dir.copy(home.sub(zp)).setY(0).normalize();
        else if (Math.random() < dt * .25) { const a=Math.random()*Math.PI*2; dir.set(Math.cos(a),0,Math.sin(a)); }
        if (dir.lengthSq() > 0) {
          zp.addScaledVector(dir, z.speed * (canChase ? 1 : .35) * dt); zp.y = terrainHeight(zp.x,zp.z); z.group.rotation.y = Math.atan2(dir.x,dir.z);
          if (canChase && Math.random() < dt * 0.22) playSound('zombie');
        }
        const walk = Math.sin(z.phase) * 0.55; z.legL.rotation.x = walk; z.legR.rotation.x = -walk; z.armL.rotation.x = -0.55 - walk*.25; z.armR.rotation.x = -0.55 + walk*.25;
      }
      if (!state.safe && dist < 2.05 && z.stun <= 0 && z.attackCooldown <= 0) {
        state.health = Math.max(0, state.health - 8); z.attackCooldown = 0.85; playSound('hurt'); showMessage('Zumbi te atacou!'); if (state.health <= 0) endGame();
      }
    }
  };

  const oldKillZombie = killZombie;
  killZombie = function(z) {
    if (!z.alive) return;
    z.alive = false;
    scene.remove(z.group);
    zombieDropLoot(z);
    const idx = zombies.indexOf(z); if (idx >= 0) zombies.splice(idx, 1);
    addXP(10, 'PVE');
    showMessage('Zumbi eliminado! Dropou loot completo.');
  };

  // NPCs e casas da SAFE
  const npcs = [];
  function addNpcHouse(name, role, x, z, color) {
    addHouse(x, z, color);
    const npc = createNpcMesh(role);
    npc.position.set(x + 2.4, terrainHeight(x+2.4,z-2.4), z - 2.4);
    scene.add(npc);
    npcs.push({ name, role, mesh: npc, position: npc.position.clone() });
  }
  function createNpcMesh(role) {
    const g = new THREE.Group();
    const body = box(1.0,1.65,.65, role==='Mecânico'?mats.orange:role==='Armeiro'?mats.darkMetal:mats.npc); body.position.y=1.45;
    const head = box(.82,.82,.82,mats.hand); head.position.y=2.85;
    const eye1=box(.12,.12,.04,mats.black); eye1.position.set(-.18,2.92,-.43); const eye2=eye1.clone(); eye2.position.x=.18;
    const cap=box(.92,.18,.92, role==='Mecânico'?mats.red:mats.claim); cap.position.y=3.35;
    g.add(body,head,eye1,eye2,cap); return g;
  }
  addNpcHouse('Tina', 'Trader', safeZone.x - 13, safeZone.z - 8, 0x5a745f);
  addNpcHouse('Mauro', 'Mecânico', safeZone.x + 13, safeZone.z - 7, 0x6b6554);
  addNpcHouse('Bruno', 'Armeiro', safeZone.x + 3, safeZone.z + 13, 0x596271);

  function openNpc(npc) {
    closeAllOverlays();
    state.npcOpen = true;
    document.exitPointerLock?.();
    const panel = document.getElementById('npcPanel');
    const title = document.getElementById('npcTitle');
    const text = document.getElementById('npcText');
    const shop = document.getElementById('npcShop');
    title.textContent = `${npc.name} — ${npc.role}`;
    text.textContent = `Troca XP por itens. Seu XP: ${Math.floor(state.xp)}. XP vem de PVE e PVP.`;
    shop.innerHTML = '';
    const offers = npc.role === 'Mecânico'
      ? [['gasoline', 5, 18], ['tool', 1, 14], ['turretAmmo', 60, 26]]
      : npc.role === 'Armeiro'
        ? [['ammoRifle', 80, 22], ['ammoMini', 120, 34], ['c4Charge', 1, 45], ['detonator', 1, 40]]
        : [['water', 3, 8], ['food', 3, 8], ['wood', 8, 12], ['claimFlag', 1, 28]];
    offers.forEach(([type, qty, xp]) => {
      const b = document.createElement('button');
      b.innerHTML = `<b>${qty}x ${labelOf(type)}</b><span>Custa ${xp} XP</span>`;
      b.addEventListener('click', () => {
        if (state.xp < xp) return showMessage('XP insuficiente. Faça PVE/PVP.');
        state.xp -= xp; saveXP(); addItem(type, qty); playSound('pickup'); openNpc(npc); showMessage(`Comprou ${labelOf(type)}.`);
      });
      shop.appendChild(b);
    });
    panel.classList.add('open');
  }

  function nearestNpc() {
    let best=null, d=Infinity;
    for (const n of npcs) { const dd = n.position.distanceTo(state.player); if (dd < d) { d=dd; best=n; } }
    return d < 4 ? best : null;
  }

  // Veículos dirigíveis
  function createVehicle(name, x, z, color=0x4f73a8) {
    const g = new THREE.Group();
    const body = box(3.2,1.0,5.0,new THREE.MeshLambertMaterial({color})); body.position.y=1.0;
    const cab = box(2.4,1.1,2.1,mats.glass); cab.position.set(0,1.75,-.6);
    const wheels=[]; for (const sx of [-1.45,1.45]) for (const sz of [-1.65,1.65]) { const w=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.36,12),mats.black); w.rotation.z=Math.PI/2; w.position.set(sx,.45,sz); wheels.push(w); }
    g.add(body,cab,...wheels); g.position.set(x, terrainHeight(x,z), z); scene.add(g);
    const v = { name, mesh:g, position:g.position, fuel: 65 + Math.random()*35, speed:0, yaw:0, driver:false };
    state.vehicles.push(v); return v;
  }
  createVehicle('Hatchback Azul', -50, 46, 0x377dc9);
  createVehicle('Pickup Verde', 52, 42, 0x3a8f5c);
  createVehicle('Van Bege', -16, -54, 0xb89d71);

  function nearestVehicle() {
    let best=null, d=Infinity;
    for (const v of state.vehicles) { const dd = v.mesh.position.distanceTo(state.player); if (dd < d) { d=dd; best=v; } }
    return d < 4.2 ? best : null;
  }
  function enterExitVehicle(forceExit=false) {
    if (state.vehicle) {
      const v=state.vehicle; v.driver=false; state.vehicle=null;
      const out = v.mesh.position.clone().add(new THREE.Vector3(2.5,2,0)); out.y=terrainHeight(out.x,out.z)+2;
      state.player.copy(out); showMessage('Saiu do carro.'); return true;
    }
    if (forceExit) return false;
    const v=nearestVehicle();
    if (!v) return false;
    state.vehicle=v; v.driver=true; state.player.copy(v.mesh.position.clone().add(new THREE.Vector3(0,2.2,0))); showMessage('Entrou no carro. X para sair. Gasolina gasta ao dirigir.'); return true;
  }

  const oldUpdateMovement = updateMovement;
  updateMovement = function(dt) {
    if (!state.vehicle) return oldUpdateMovement(dt);
    const v = state.vehicle;
    const turnL = state.keys.has('KeyA') || state.keys.has('ArrowLeft');
    const turnR = state.keys.has('KeyD') || state.keys.has('ArrowRight');
    const accel = state.keys.has('KeyW') || state.keys.has('ArrowUp');
    const brake = state.keys.has('KeyS') || state.keys.has('ArrowDown');
    if (turnL) v.yaw += dt * 1.8;
    if (turnR) v.yaw -= dt * 1.8;
    if (accel && v.fuel > 0) { v.speed = Math.min(15, v.speed + dt * 9); v.fuel = Math.max(0, v.fuel - dt * 1.6); }
    else if (brake && v.fuel > 0) { v.speed = Math.max(-6, v.speed - dt * 8); v.fuel = Math.max(0, v.fuel - dt * .8); }
    else v.speed *= Math.pow(.90, dt * 8);
    if (v.fuel <= 0 && Math.abs(v.speed) > .1) { v.speed *= .92; if (Math.random()<dt*2) showMessage('Carro sem gasolina!'); }
    const dir = new THREE.Vector3(-Math.sin(v.yaw),0,-Math.cos(v.yaw));
    v.mesh.position.addScaledVector(dir, v.speed * dt);
    v.mesh.position.x = THREE.MathUtils.clamp(v.mesh.position.x, -86, 86); v.mesh.position.z = THREE.MathUtils.clamp(v.mesh.position.z, -86, 86);
    v.mesh.position.y = terrainHeight(v.mesh.position.x,v.mesh.position.z); v.mesh.rotation.y = v.yaw;
    state.player.copy(v.mesh.position.clone().add(new THREE.Vector3(0,2.3,0)));
    camera.position.copy(state.player); camera.rotation.order='YXZ'; camera.rotation.y=state.yaw; camera.rotation.x=state.pitch;
    state.safe = isInSafeZone(state.player);
  };

  // Bases: kit base gera uma base pronta, flag impede construção em volta.
  function canBuildAt(pos) {
    if (isInSafeZone(pos)) return { ok:false, reason:'Não pode construir dentro da SAFE.' };
    for (const b of state.bases) if (b.flag && flatDist(pos,b.flag.position) < 24) return { ok:false, reason:'Bandeira claim bloqueia construção aqui.' };
    return { ok:true };
  }
  function buildBaseAt(pos, owner='Você') {
    const check = canBuildAt(pos); if (!check.ok) { showMessage(check.reason); return false; }
    const y = terrainHeight(pos.x,pos.z);
    const g = new THREE.Group(); g.position.set(pos.x,y,pos.z);
    const wallMat = new THREE.MeshLambertMaterial({ color: owner==='Você'?0x7d5735:0x654232 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x3b3028 });
    const floor = box(8.4,.22,8.4,mats.wood); floor.position.y=.11;
    const wall1=box(8.4,3,.35,wallMat); wall1.position.set(0,1.7,-4.2);
    const wall2=box(.35,3,8.4,wallMat); wall2.position.set(-4.2,1.7,0);
    const wall3=box(.35,3,8.4,wallMat); wall3.position.set(4.2,1.7,0);
    const doorWall=box(3.1,3,.35,wallMat); doorWall.position.set(-2.65,1.7,4.2);
    const doorWall2=box(3.1,3,.35,wallMat); doorWall2.position.set(2.65,1.7,4.2);
    const roof=box(8.8,.35,8.8,roofMat); roof.position.y=3.35;
    const door=box(2.0,2.7,.28,new THREE.MeshLambertMaterial({color:0x2f241c})); door.position.set(0,1.45,4.35);
    const vaultMesh=box(1.3,1.25,1.3,mats.darkMetal); vaultMesh.position.set(-2.7,.75,-2.7);
    const generator=box(1.3,1.1,1.3,mats.orange); generator.position.set(2.5,.65,-2.6);
    const bed=box(2.2,.45,1.0,new THREE.MeshLambertMaterial({color:0x5e79c9})); bed.position.set(-2.5,.45,2.1);
    const flagPole=box(.1,4,.1,mats.metal); flagPole.position.set(0,2.2,-6.1);
    const flagCloth=box(1.4,.7,.08,mats.claim); flagCloth.position.set(.75,3.3,-6.1);
    const turrets = [];
    for (const [tx,tz] of [[-3.3,-4.9],[3.3,-4.9]]) {
      const t = new THREE.Group(); const baseT=box(.8,.45,.8,mats.turret); const gun=box(.35,.28,1.2,mats.black); gun.position.set(0,.2,-.65); t.add(baseT,gun); t.position.set(tx,3.85,tz); g.add(t); turrets.push({ mesh:t, ammo:90, cooldown:0 });
    }
    g.add(floor,wall1,wall2,wall3,doorWall,doorWall2,roof,door,vaultMesh,generator,bed,flagPole,flagCloth);
    scene.add(g);
    const base = { owner, group:g, position:g.position, radius:8, door, doorHp:120, destroyed:false, fuel: owner==='Você'?120:60, turrets, bed, generator, vaultMesh, storage: enemyStorage(owner), flag:{ position: new THREE.Vector3(pos.x, y, pos.z-6.1) } };
    state.bases.push(base);
    showMessage(owner==='Você' ? 'Base construída com cama, cofre, gerador, flag e 2 torretas.' : 'Base de jogador criada.');
    return base;
  }
  function enemyStorage(owner) { return owner==='Você' ? { wood:8, food:2, water:2, ammoRifle:30 } : { ammoRifle:80, food:3, water:3, c4Charge:1, gasoline:2, maplestrike:1 }; }
  buildBaseAt(new THREE.Vector3(66,0,-66), 'Rival BR');
  buildBaseAt(new THREE.Vector3(-66,0,-58), 'California Squad');

  function useBaseKit() {
    if ((state.inventory.baseKit || 0) <= 0) return showMessage('Você não tem Kit Base. Pegue em Kits com vírgula.');
    const target = state.player.clone().add(getForward().setY(0).normalize().multiplyScalar(9)); target.y=0;
    if (buildBaseAt(target, 'Você')) { state.inventory.baseKit--; state.inventory.claimFlag = Math.max(0, (state.inventory.claimFlag||0)-1); playSound('pickup'); }
  }

  function nearestBasePart() {
    let best=null, kind=null, d=Infinity;
    for (const b of state.bases) {
      const parts = [ ['bed', b.bed], ['generator', b.generator], ['vault', b.vaultMesh], ['door', b.door] ];
      for (const [k,obj] of parts) {
        const world = new THREE.Vector3(); obj.getWorldPosition(world);
        const dd = world.distanceTo(state.player); if (dd < d) { d=dd; best=b; kind=k; }
      }
    }
    return d < 4 ? { base:best, kind, dist:d } : null;
  }

  function interactBasePart(part) {
    if (!part) return false;
    const b=part.base;
    if (part.kind === 'bed') { state.respawn = b.bed.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,2,0)); showMessage('Cama definida como seu respawn.'); return true; }
    if (part.kind === 'generator') {
      if ((state.inventory.gasoline || 0) > 0) { const use = Math.min(state.inventory.gasoline, 5); state.inventory.gasoline -= use; b.fuel += use * 22; showMessage(`Gerador abastecido: +${use} gasolina.`); }
      else showMessage(`Gerador ${b.fuel>0?'ativo':'sem combustível'}. Compre gasolina no mecânico.`); return true;
    }
    if (part.kind === 'vault') { showMessage(b.owner==='Você' ? 'Cofre da base: se a porta cair, os itens podem dropar.' : 'Cofre inimigo protegido: exploda a porta com C4.'); return true; }
    if (part.kind === 'door') { showMessage(`${b.owner}: porta HP ${Math.max(0,Math.round(b.doorHp))}.`); return true; }
    return false;
  }

  function updateBases(dt) {
    for (const b of state.bases) {
      if (b.destroyed) continue;
      b.fuel = Math.max(0, b.fuel - dt * 0.018);
      for (const t of b.turrets) {
        t.cooldown = Math.max(0, t.cooldown - dt);
        if (b.fuel <= 0 || t.ammo <= 0 || t.cooldown > 0) continue;
        const tw = t.mesh.getWorldPosition(new THREE.Vector3());
        let target = null, dist = Infinity, isPlayer=false;
        for (const z of zombies) { const d = z.group.position.distanceTo(tw); if (z.alive && d < 24 && d < dist) { target=z; dist=d; isPlayer=false; } }
        for (const p of serverPlayers) {
          if (b.owner === 'Você' && state.group.members.includes(p.name)) continue;
          const d = p.position.distanceTo(tw); if (p.hp > 0 && d < 22 && d < dist && !isInSafeZone(p.position)) { target=p; dist=d; isPlayer=true; }
        }
        if (target) {
          t.cooldown = 0.35; t.ammo--; playSound('viper');
          createBulletTrail(isPlayer ? target.position.clone().add(new THREE.Vector3(0,2,0)) : target.group.position.clone().add(new THREE.Vector3(0,2.1,0)), 0x58d7ff);
          if (isPlayer) damageServerPlayer(target, 14, 'torreta'); else damageZombie(target, 18, .25);
        }
      }
    }
  }

  function placeC4OnDoor() {
    if ((state.inventory.c4Charge||0) <= 0) return showMessage('Sem C4 de porta.');
    const hit = nearestBasePart();
    if (!hit || hit.kind !== 'door') return showMessage('Chegue perto de uma porta inimiga para colocar C4.');
    if (hit.base.owner === 'Você') return showMessage('Não coloque C4 na sua própria porta.');
    const c4 = makePickupMesh('c4Charge');
    const wp = hit.base.door.getWorldPosition(new THREE.Vector3());
    c4.position.copy(wp).add(new THREE.Vector3(0,.15,.35));
    scene.add(c4);
    const record = { mesh:c4, base:hit.base, armed:false };
    state.activeC4.push(record);
    state.inventory.c4Charge--;
    showMessage('C4 colocada na porta. Equipe detonador, mire e botão direito para armar.');
    return true;
  }

  function throwC4() {
    if ((state.inventory.c4Throwable||0) <= 0) return showMessage('Sem C4 lançável.');
    const start = state.player.clone().add(getForward().multiplyScalar(2));
    const c4 = makePickupMesh('c4Throwable'); c4.position.copy(start); scene.add(c4);
    const record = { mesh:c4, velocity:getForward().multiplyScalar(11).add(new THREE.Vector3(0,4,0)), fuse:2.8, throwable:true, armed:true, base:null };
    state.activeC4.push(record); state.inventory.c4Throwable--; showMessage('C4 lançável arremessada!');
  }

  function armDetonator() {
    if ((state.inventory.detonator||0) <= 0 || slots[state.selected].id !== 'detonator') return false;
    let best=null, d=Infinity;
    for (const c of state.activeC4) { const dd = c.mesh.position.distanceTo(state.player); if (dd < d && dd < 45) { d=dd; best=c; } }
    if (!best) { showMessage('Nenhuma C4 no alcance do detonador.'); return true; }
    best.armed = true; state.armedC4 = best; showMessage('C4 armada. Vá para longe e clique esquerdo para detonar.'); playSound('pickup'); return true;
  }

  function detonateC4() {
    if ((state.inventory.detonator||0) <= 0) return showMessage('Você não tem detonador.');
    const targets = state.activeC4.filter(c => c.armed);
    if (!targets.length) return showMessage('Nenhuma C4 armada. Botão direito mirando nela para armar.');
    targets.forEach(explodeC4);
  }

  function explodeC4(c) {
    const pos = c.mesh.position.clone(); scene.remove(c.mesh);
    const idx=state.activeC4.indexOf(c); if (idx>=0) state.activeC4.splice(idx,1);
    playSound('explode'); createExplosion(pos);
    if (c.base && !c.base.destroyed) raidBase(c.base, pos);
    for (const z of [...zombies]) if (z.group.position.distanceTo(pos) < 7) damageZombie(z, 140, 2);
    if (state.player.distanceTo(pos) < 9 && !state.safe) { state.health = Math.max(0,state.health-70); if (state.health<=0) endGame(); }
  }
  function createExplosion(pos) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.4,16,10), new THREE.MeshBasicMaterial({ color:0xff7b33, transparent:true, opacity:.65 }));
    sphere.position.copy(pos); scene.add(sphere); bullets.push({ line:sphere, ttl:.45 });
  }
  function raidBase(b, pos) {
    b.doorHp -= 140;
    if (b.doorHp <= 0 && !b.destroyed) {
      b.destroyed = true;
      b.group.remove(b.door); scene.remove(b.door);
      const vaultPos = b.vaultMesh.getWorldPosition(new THREE.Vector3());
      Object.entries(b.storage || {}).forEach(([type,qty],i) => spawnPickup(type, qty, scatterV07(vaultPos, i)));
      const bedPos = b.bed.getWorldPosition(new THREE.Vector3()); spawnPickup('wood', 4, bedPos);
      b.turrets.forEach(t => { const p=t.mesh.getWorldPosition(new THREE.Vector3()); spawnPickup('turretAmmo', Math.max(10,t.ammo), p); });
      showMessage('RAID! Porta destruída, cama quebrada e itens do cofre caíram no chão.');
      addXP(25, 'raid');
    }
  }

  function updateC4(dt) {
    for (const c of [...state.activeC4]) {
      if (c.throwable) {
        c.velocity.y -= 12*dt; c.mesh.position.addScaledVector(c.velocity,dt);
        const ground = terrainHeight(c.mesh.position.x,c.mesh.position.z)+.35;
        if (c.mesh.position.y <= ground) { c.mesh.position.y=ground; c.velocity.multiplyScalar(.35); }
        c.fuse -= dt; if (c.fuse <= 0) explodeC4(c);
      }
    }
  }

  // Airdrop: chama perto, cai em outro ponto e aparece no mapa.
  function callAirdrop() {
    if ((state.inventory.airdropLauncher||0) <= 0) return showMessage('Sem lançador de airdrop. Pegue o kit airdrop.');
    state.inventory.airdropLauncher--;
    const call = state.player.clone();
    const a = Math.random()*Math.PI*2, r = 30 + Math.random()*38;
    const drop = new THREE.Vector3(THREE.MathUtils.clamp(call.x + Math.cos(a)*r, -78, 78), 45, THREE.MathUtils.clamp(call.z + Math.sin(a)*r, -78, 78));
    const crate = new THREE.Group();
    const boxDrop=box(2.1,1.5,2.1,new THREE.MeshLambertMaterial({ color:0x516e42 }));
    const chute=new THREE.Mesh(new THREE.ConeGeometry(3.6,1.2,18), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.72 })); chute.position.y=2.2; chute.rotation.x=Math.PI;
    crate.add(boxDrop,chute); crate.position.copy(drop); scene.add(crate);
    const ad = { callPoint: call.clone(), dropPoint: drop.clone(), mesh: crate, landed:false, ttl:120 };
    state.airdrops.push(ad); playSound('serverLoad'); showMessage('Airdrop chamado! Abra M para ver a seta do chamado até a queda.');
  }
  function updateAirdrops(dt) {
    for (const ad of [...state.airdrops]) {
      if (!ad.landed) {
        ad.mesh.position.y -= dt * 6;
        const ground=terrainHeight(ad.mesh.position.x, ad.mesh.position.z)+1.0;
        if (ad.mesh.position.y <= ground) { ad.mesh.position.y=ground; ad.landed=true; spawnAirdropLoot(ad.mesh.position.clone()); showMessage('Airdrop caiu! Loot raro no chão.'); playSound('pickup'); }
      } else { ad.ttl -= dt; if (ad.ttl <= 0) { scene.remove(ad.mesh); state.airdrops.splice(state.airdrops.indexOf(ad),1); } }
    }
  }
  function spawnAirdropLoot(pos) {
    const loot = [ ['minigun',1], ['ammoMini',180], ['c4Throwable',2], ['c4Charge',2], ['detonator',1], ['ammoRifle',120], ['gasoline',3], ['turretAmmo',120] ];
    loot.forEach(([type,qty],i)=>spawnPickup(type,qty,scatterV07(pos,i)));
  }

  // Jogadores simulados visíveis e PVP/grupo
  serverPlayers.forEach((p, i) => {
    p.hp = p.hp || 100; p.cooldown = 0; p.target = p.target || randomWaypoint();
    p.inventory = p.inventory || { ammoRifle:60, food:2, water:2, viper:1, c4Charge: Math.random()<.25?1:0 };
    p.mesh = friendlyMeshes[i];
    if (p.mesh) {
      p.mesh.userData.player = p;
      const label = makeNameSprite(p.name); label.position.y = 3.95; p.mesh.add(label); p.label = label;
    }
  });
  function makeNameSprite(text) {
    const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=64;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,256,64); ctx.fillStyle='white'; ctx.font='bold 28px Arial'; ctx.textAlign='center'; ctx.fillText(text,128,40);
    const tex=new THREE.CanvasTexture(canvas); const spr=new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true })); spr.scale.set(3.4,.85,1); return spr;
  }
  function randomWaypoint() { return new THREE.Vector3(THREE.MathUtils.randFloat(-74,74),0,THREE.MathUtils.randFloat(-74,74)); }
  function updateServerPlayers(dt) {
    for (const p of serverPlayers) {
      if (p.hp <= 0) continue;
      if (!p.mesh) continue;
      p.cooldown = Math.max(0, p.cooldown-dt);
      const inGroup = state.group.members.includes(p.name);
      const dir = p.target.clone().sub(p.position); dir.y=0;
      if (dir.length() < 2 || isInSafeZone(p.target)) p.target = randomWaypoint();
      else { dir.normalize(); p.position.addScaledVector(dir, (inGroup?3.2:2.4)*dt); p.position.y=terrainHeight(p.position.x,p.position.z); p.mesh.position.copy(p.position); p.mesh.rotation.y=Math.atan2(dir.x,dir.z); }
      const d = p.position.distanceTo(state.player);
      if (!inGroup && !state.safe && !isInSafeZone(p.position) && d < 24 && p.cooldown <= 0 && !state.vehicle) {
        p.cooldown = 1.4 + Math.random(); playSound('rifle'); createBulletTrail(state.player.clone(),0xff5555); state.health = Math.max(0,state.health-7); showMessage(`${p.name} fez PVP em você!`); if (state.health<=0) endGame();
      }
    }
  }
  function damageServerPlayer(p, amount, source='tiro') {
    if (state.group.members.includes(p.name)) { showMessage('Fogo amigo desativado para membros do grupo.'); return; }
    p.hp = Math.max(0, (p.hp||100)-amount); p.cooldown = .6;
    if (p.mesh) { p.mesh.scale.setScalar(.92); setTimeout(()=>p.mesh && p.mesh.scale.setScalar(1),120); }
    if (p.hp <= 0) killServerPlayer(p, source);
  }
  function killServerPlayer(p, source) {
    if (p.mesh) { p.mesh.visible=false; }
    Object.entries(p.inventory || {}).forEach(([type,qty],i)=>spawnPickup(type, qty, scatterV07(p.position, i)));
    addXP(50, 'PVP');
    showMessage(`${p.name} morreu em PVP e dropou a mochila.`);
    setTimeout(()=>{ p.hp=100; p.position.copy(randomWaypoint()); p.position.y=terrainHeight(p.position.x,p.position.z); if(p.mesh){p.mesh.position.copy(p.position); p.mesh.visible=true;} }, 6500);
  }

  const oldShoot = shoot;
  shoot = function() {
    const def = currentWeaponDef();
    if (!def) return showMessage('Equipe uma arma primeiro.');
    if ((state.inventory[def.id] || 0) <= 0) return showMessage(`Você ainda não tem ${def.label}.`);
    if ((state.inventory[def.ammo] || 0) <= 0) return showMessage('Sem munição para essa arma!');
    state.inventory[def.ammo]--; state.attackAnim = 1; playSound(def.sound);
    raycaster.setFromCamera(new THREE.Vector2(THREE.MathUtils.randFloatSpread(def.spread), THREE.MathUtils.randFloatSpread(def.spread)), camera);
    let best = null, bestDist = Infinity, kind = 'zombie';
    for (const z of zombies) {
      if (!z.alive) continue; const dist=z.group.position.distanceTo(state.player); if (dist>def.range) continue;
      const box3=new THREE.Box3().setFromObject(z.group); const hit=raycaster.ray.intersectBox(box3,new THREE.Vector3()); if(hit && dist<bestDist){best=z; bestDist=dist; kind='zombie';}
    }
    for (const p of serverPlayers) {
      if ((p.hp||0)<=0 || isInSafeZone(p.position)) continue; const dist=p.position.distanceTo(state.player); if (dist>def.range) continue;
      const box3=p.mesh ? new THREE.Box3().setFromObject(p.mesh) : new THREE.Box3().setFromCenterAndSize(p.position.clone().add(new THREE.Vector3(0,1.5,0)), new THREE.Vector3(1.4,3.2,1.4));
      const hit=raycaster.ray.intersectBox(box3,new THREE.Vector3()); if(hit && dist<bestDist){best=p; bestDist=dist; kind='player';}
    }
    if (best) {
      const targetPos = kind==='zombie' ? best.group.position.clone().add(new THREE.Vector3(0,2.3,0)) : best.position.clone().add(new THREE.Vector3(0,2.3,0));
      createBulletTrail(targetPos, def.color);
      if (kind==='zombie') damageZombie(best, def.damage, def.stun); else damageServerPlayer(best, def.damage, def.label);
    } else createBulletTrail(null, def.color);
  };

  const oldCreateHeldModel = createHeldModel;
  createHeldModel = function(id) {
    const group = new THREE.Group();
    const arm = box(0.28, 0.28, 0.95, mats.hand); arm.position.set(0.22,-0.05,0.27); arm.rotation.x=-0.25; group.add(arm);
    if (weaponDefs[id]) {
      const length = id==='minigun'?1.55:id==='sniper'?1.45:id==='maplestrike'||id==='caliRifle'?1.18:id==='shotgun'?1.25:id==='viper'||id==='pdw'?0.9:0.72;
      const mainMat = id==='minigun'?mats.darkMetal:(id==='pistol'||id==='viper'||id==='pdw'?mats.pistol:mats.metal);
      const body=box(.34,.28,length,mainMat); body.position.set(.33,.08,-.20-length*.08);
      const barrel=box(.16,.14,length*.85,id==='sniper'||id==='minigun'?mats.black:mats.metal); barrel.position.set(.33,.16,-.48-length*.34);
      const grip=box(.22,.50,.18,mats.pistol); grip.position.set(.33,-.22,.12); grip.rotation.x=-.3; group.add(body,barrel,grip);
      if (id==='minigun') for(let i=0;i<4;i++){const b=box(.07,.07,.9,mats.black);b.position.set(.33+Math.cos(i*Math.PI/2)*.1,.16+Math.sin(i*Math.PI/2)*.1,-1.05);group.add(b);}
      if (id==='sniper') { const scope=box(.20,.20,.55,mats.black); scope.position.set(.33,.35,-.35); group.add(scope); }
    } else if (id==='airdropLauncher') {
      const tube=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,1.35,12),mats.darkMetal); tube.rotation.x=Math.PI/2; tube.position.set(.35,.1,-.34); group.add(tube);
      const sight=box(.16,.12,.28,mats.blueGlow); sight.position.set(.35,.32,-.45); group.add(sight);
    } else if (id==='c4Charge' || id==='c4Throwable') {
      const pack=box(.48,.32,.38,mats.c4); pack.position.set(.35,.08,-.22); const tape=box(.54,.07,.42,mats.red); tape.position.set(.35,.10,-.22); group.add(pack,tape);
    } else if (id==='detonator') {
      const d=box(.36,.52,.18,mats.darkMetal); d.position.set(.35,.06,-.22); const btn=box(.18,.08,.08,mats.red); btn.position.set(.35,.37,-.28); group.add(d,btn);
    } else return oldCreateHeldModel(id);
    return group;
  };

  const oldUseCurrentItem = useCurrentItem;
  useCurrentItem = function() {
    const slot = slots[state.selected];
    if (slot.id === 'airdropLauncher') return callAirdrop();
    if (slot.id === 'c4Charge') return placeC4OnDoor();
    if (slot.id === 'detonator') return detonateC4();
    return oldUseCurrentItem();
  };

  function useInventoryItem(type) {
    if ((state.inventory[type]||0) <= 0) return;
    if (type === 'food') return eatFood();
    if (type === 'water') return drinkWater();
    if (type === 'c4Throwable') return throwC4();
    if (type === 'baseKit') return useBaseKit();
    const idx = slots.findIndex(s => s.id === type);
    if (idx >= 0) { state.selected = idx; updateHeldModel(); showMessage(`${labelOf(type)} equipado.`); }
    else if (weaponDefs[type]) { slots[state.selected] = { id: type, label: labelOf(type), use: 'weapon' }; updateHeldModel(); showMessage(`${labelOf(type)} equipado no slot atual.`); }
    else showMessage(`${labelOf(type)} está na mochila.`);
  }

  const oldGiveKit = giveKit;
  giveKit = function(kind) {
    const now = Date.now(); const cd = state.kitCooldowns[kind] || 0;
    if (cd > now) { const left = Math.ceil((cd-now)/1000); return showMessage(`Aguarde ${left}s para pegar esse kit de novo.`); }
    state.kitCooldowns[kind] = now + 5 * 60 * 1000; saveKitCooldowns();
    if (kind === 'base') {
      addItem('baseKit',1); addItem('wood',12); addItem('stone',6); addItem('claimFlag',1); addItem('gasoline',3); addItem('turretAmmo',120);
      showMessage('Kit Base recebido. Aperte B para construir perto de você.');
    } else if (kind === 'airdrop') {
      addItem('airdropLauncher',1); showMessage('Kit Airdrop recebido. Equipe e use para chamar.');
    } else if (kind === 'cali') {
      addItem('pdw',1); addItem('caliRifle',1); addItem('shotgun',1); addItem('ammoRifle',120); addItem('ammoShotgun',24); showMessage('California Pack recebido.');
    } else {
      oldGiveKit(kind);
    }
    updateHeldModel(); updateKitButtons(); playSound('pickup');
  };
  function updateKitButtons() {
    const now = Date.now();
    document.querySelectorAll('[data-kit]').forEach(btn => {
      const kind=btn.dataset.kit, cd=state.kitCooldowns[kind]||0;
      if (cd>now) { btn.classList.add('cooldown'); const sec=Math.ceil((cd-now)/1000); const span=btn.querySelector('span'); if(span) span.textContent = `Cooldown ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`; }
      else btn.classList.remove('cooldown');
    });
  }
  setInterval(updateKitButtons, 1000);
  // Clona os botões para remover listeners antigos da v0.6 e evitar pegar kit duas vezes.
  document.querySelectorAll('[data-kit]').forEach(btn => {
    const clean = btn.cloneNode(true);
    btn.replaceWith(clean);
    clean.addEventListener('click', () => giveKit(clean.dataset.kit));
  });

  // Inventário em bloquinhos. Itens dropados no chão aumentam quantidade ao coletar.
  const oldRenderInventory = renderInventory;
  renderInventory = function() {
    const mode = state.currentVaultMode;
    document.getElementById('inventoryTitle').textContent = mode === 'safe' ? 'Vault da SAFE — persiste após morrer' : mode === 'small' ? 'Vault remoto menor — /vault' : 'Mochila em bloquinhos';
    const inv = document.getElementById('inventoryList'); const vault = document.getElementById('vaultList'); inv.innerHTML=''; vault.innerHTML='';
    inv.className = 'grid-inventory'; vault.className = 'grid-inventory';
    Object.keys(state.inventory).sort().forEach(type => {
      const qty = state.inventory[type] || 0; if (qty <= 0) return;
      inv.appendChild(makeInvCard(type, qty, false, mode));
    });
    Object.keys(state.vault).sort().forEach(type => {
      const qty = state.vault[type] || 0; if (qty <= 0) return;
      vault.appendChild(makeInvCard(type, qty, true, mode));
    });
    document.getElementById('vaultHint').textContent = mode === 'safe' ? 'Vault completo na SAFE. Itens aqui não caem quando você morre.' : mode === 'small' ? 'Vault remoto menor pelo /vault. Itens aqui não caem quando você morre.' : 'A mochila usa bloquinhos por tamanho. Use, guarde ou drope itens no chão.';
  };
  function makeInvCard(type, qty, isVault, mode) {
    const [w,h] = itemSizes[type] || [1,1];
    const div=document.createElement('div'); div.className='inv-cell-card'; div.style.gridColumn=`span ${Math.min(w,8)}`; div.style.gridRow=`span ${Math.min(h,5)}`;
    div.innerHTML = `<b>${labelOf(type)}</b><small>${qty}x · ${w}x${h}</small><div class="inv-actions"></div>`;
    const actions=div.querySelector('.inv-actions');
    if (!isVault) {
      const use=document.createElement('button'); use.textContent='Usar'; use.addEventListener('click',()=>{useInventoryItem(type); renderInventory();}); actions.appendChild(use);
      const drop=document.createElement('button'); drop.textContent='Dropar'; drop.addEventListener('click',()=>{dropItem(type,1); renderInventory();}); actions.appendChild(drop);
      const store=document.createElement('button'); store.textContent='Guardar'; store.disabled = mode === 'backpack'; store.addEventListener('click',()=>moveToVault(type,1)); actions.appendChild(store);
    } else {
      const take=document.createElement('button'); take.textContent='Pegar'; take.addEventListener('click',()=>moveFromVault(type,1)); actions.appendChild(take);
    }
    return div;
  }
  function dropItem(type, qty=1) {
    if ((state.inventory[type]||0) < qty) return;
    state.inventory[type]-=qty; spawnPickup(type, qty, state.player.clone().add(getForward().multiplyScalar(2))); showMessage(`${labelOf(type)} dropado no chão.`);
  }

  const oldDrawServerMap = drawServerMap;
  drawServerMap = function(players) {
    oldDrawServerMap(players);
    const canvas=document.getElementById('serverMapCanvas'), ctx=canvas.getContext('2d');
    ctx.font='12px Arial';
    for (const b of state.bases) {
      const x=(b.position.x+90)/180*canvas.width, z=(b.position.z+90)/180*canvas.height;
      ctx.fillStyle = b.owner==='Você' ? '#ffd86a' : '#ff6969'; ctx.fillRect(x-5,z-5,10,10); ctx.fillText(b.owner, x+8,z+4);
      ctx.strokeStyle='#ffd86a'; ctx.beginPath(); ctx.arc(x,z,24/180*canvas.width,0,Math.PI*2); ctx.stroke();
    }
    for (const ad of state.airdrops) {
      const cx=(ad.callPoint.x+90)/180*canvas.width, cz=(ad.callPoint.z+90)/180*canvas.height;
      const dx=(ad.dropPoint.x+90)/180*canvas.width, dz=(ad.dropPoint.z+90)/180*canvas.height;
      ctx.strokeStyle='#ffd86a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cx,cz); ctx.lineTo(dx,dz); ctx.stroke();
      drawArrowHead(ctx,cx,cz,dx,dz); ctx.fillStyle='#ffd86a'; ctx.fillText('CALL',cx+5,cz-5); ctx.fillText(ad.landed?'CAIU':'DROP',dx+5,dz-5);
    }
    const legend = document.querySelector('.map-legend') || document.createElement('div'); legend.className='map-legend'; legend.innerHTML = '<span class="airdrop-tag">Amarelo</span>: airdrop/chamada · Quadrado vermelho: base rival · Círculo: claim flag';
    const mapGrid=document.querySelector('.map-grid > div:last-child'); if(mapGrid && !legend.parentNode) mapGrid.appendChild(legend);
  };
  function drawArrowHead(ctx,x1,y1,x2,y2){ const a=Math.atan2(y2-y1,x2-x1); ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-Math.cos(a-.5)*12,y2-Math.sin(a-.5)*12); ctx.lineTo(x2-Math.cos(a+.5)*12,y2-Math.sin(a+.5)*12); ctx.closePath(); ctx.fillStyle='#ffd86a'; ctx.fill(); }

  const oldRenderMap = renderMap;
  renderMap = function() {
    const list = document.getElementById('playerList'); list.innerHTML='';
    const players = [{ name: state.survivor.name, role:'Você', position:state.player, online:true, hp:Math.round(state.health) }, ...serverPlayers];
    players.forEach((p)=>{
      const row=document.createElement('div'); const inGroup=state.group.members.includes(p.name);
      row.className = `player-card ${p.name!==state.survivor.name ? (inGroup?'groupmate':'hostile') : ''}`;
      row.innerHTML = `<div><b>${p.name}</b><span>${p.role} · ${p.online?'online':'offline'} · HP:${p.hp ?? 100} · X:${Math.round(p.position.x)} Z:${Math.round(p.position.z)}</span></div>`;
      if (p.name !== state.survivor.name) { const btn=document.createElement('button'); btn.textContent=inGroup?'No grupo':'Convidar'; btn.disabled=inGroup; btn.addEventListener('click',()=>inviteToGroup(p.name)); row.appendChild(btn); }
      list.appendChild(row);
    });
    document.getElementById('groupNameDisplay').textContent = state.group.name || 'Sem grupo';
    document.getElementById('groupMembers').textContent = state.group.members.join(', ');
    drawServerMap(players);
  };

  const oldHandleCommand = handleCommand;
  handleCommand = function(text) {
    if (text.trim().toLowerCase() === '/kit base') { addChatLine(state.survivor.name, text); giveKit('base'); return; }
    oldHandleCommand(text);
  };

  const oldCloseAllOverlays = closeAllOverlays;
  closeAllOverlays = function() {
    state.npcOpen = false;
    const npc=document.getElementById('npcPanel'); if(npc) npc.classList.remove('open');
    oldCloseAllOverlays();
  };
  document.querySelectorAll('.closeOverlay').forEach(btn => btn.addEventListener('click', closeAllOverlays));

  const oldUpdateSpawns = updateSpawns;
  updateSpawns = function(dt) {
    state.zombieSpawnTimer -= dt;
    if (state.zombieSpawnTimer <= 0 && zombies.length < 24) { spawnZombie(false); state.zombieSpawnTimer = 4 + Math.random()*4; }
    updateServerPlayers(dt);
    updateBases(dt);
    updateAirdrops(dt);
    updateC4(dt);
  };

  const oldUpdateHUD = updateHUD;
  updateHUD = function(dt) {
    oldUpdateHUD(dt);
    const xp = document.getElementById('xpLine'); if (xp) xp.textContent = `XP: ${Math.floor(state.xp)}`;
    const veh = document.getElementById('vehicleLine'); if (veh) { veh.style.display = state.vehicle ? 'block' : 'none'; if(state.vehicle) veh.textContent = `${state.vehicle.name} · gasolina ${Math.round(state.vehicle.fuel)}%`; }
    const raid = document.getElementById('raidLine'); if (raid) {
      const own = state.bases.find(b=>b.owner==='Você'); const active = state.airdrops.find(a=>!a.landed); const c4 = state.activeC4.filter(c=>c.armed).length;
      raid.textContent = `${own ? `Base fuel ${Math.round(own.fuel)} · porta ${Math.max(0,Math.round(own.doorHp))}` : 'Base: sem base'} · Airdrop: ${active ? 'caindo' : 'nenhum'} · C4 armada: ${c4}`;
    }
  };

  endGame = function() {
    const death = state.player.clone();
    Object.entries({...state.inventory}).forEach(([type,qty],i)=>{ if(qty>0) spawnPickup(type,qty,scatterV07(death,i)); state.inventory[type]=0; });
    Object.assign(state.inventory,{ pistol:1, ammo:24, axe:1, food:1, water:1 });
    state.health=100; state.hunger=85; state.thirst=85; state.energy=100; state.velocityY=0; state.vehicle=null;
    const spawn = state.respawn ? state.respawn.clone() : new THREE.Vector3(safeZone.x, terrainHeight(safeZone.x,safeZone.z)+2, safeZone.z+3);
    state.player.copy(spawn); state.gameOver=false; playSound('hurt'); showMessage('Você morreu: mochila caiu no chão. Vault permaneceu salvo.', 4.2);
  };

  window.addEventListener('keydown', (e)=>{
    const code=e.code || e.key;
    if (state.chatOpen || state.mapOpen || state.kitsOpen || state.inventoryOpen || state.npcOpen) {
      if (code === 'Escape') closeAllOverlays();
      return;
    }
    if (code === 'Digit0') { state.selected=9; updateHeldModel(); e.preventDefault(); }
    if (code === 'KeyB') { useBaseKit(); e.preventDefault(); }
    if (code === 'KeyX') { enterExitVehicle(true); e.preventDefault(); }
    if (code === 'KeyE') {
      const now=performance.now(); if(now-state.lastInteractAt<250) return; state.lastInteractAt=now;
      const npc=nearestNpc(); if(npc) { openNpc(npc); e.preventDefault(); return; }
      const part=nearestBasePart(); if(interactBasePart(part)) { e.preventDefault(); return; }
      if (enterExitVehicle(false)) { e.preventDefault(); return; }
    }
  }, { passive:false });

  window.addEventListener('mousedown', (e)=>{
    if (!state.started || state.gameOver || state.chatOpen || state.mapOpen || state.kitsOpen || state.inventoryOpen || state.npcOpen) return;
    if (e.button === 2) { e.preventDefault(); armDetonator(); }
  }, { passive:false });
  window.addEventListener('contextmenu', e=>e.preventDefault());

  const oldPlaySound = playSound;
  playSound = function(name) {
    if (name === 'minigun') { beep(820,0.035,'square',0.07,-120); return; }
    if (name === 'shotgun') { beep(240,0.16,'sawtooth',0.13,-150); beep(80,0.08,'square',0.08,-20); return; }
    if (name === 'explode') { beep(70,0.24,'sawtooth',0.18,-20); setTimeout(()=>beep(45,0.28,'square',0.12,-5),80); return; }
    oldPlaySound(name);
  };

  updateHeldModel(); updateKitButtons();
  showMessage('v0.7 carregada: zumbis perto das casas, base kit, airdrop, C4, carros, NPCs e PVP local.');
})();


// ==============================
// v1.0 INVENTÁRIO ESTILO GRID (inspirado em survival grid UI)
// ==============================
(() => {
  const V10 = 'v1.0 INVENTÁRIO EM GRADE';
  document.title = 'Blockland Survival v1.0';
  const versionEl = document.getElementById('version');
  if (versionEl) versionEl.textContent = V10;
  document.querySelectorAll('.brand h2').forEach(el => el.textContent = V10);

  const panel = document.getElementById('inventoryPanel');
  if (!panel) return;
  panel.classList.add('ut-ready');
  panel.innerHTML = `
    <div class="overlay-head ut-head">
      <div class="ut-tabs">
        <div class="ut-tab active">Inventory [TAB]</div>
        <div class="ut-tab">Craft [Y]</div>
        <div class="ut-tab">Skills [U]</div>
        <div class="ut-tab">Information [M]</div>
      </div>
      <button id="utCloseBtn" class="closeOverlay ut-close">ESC</button>
    </div>
    <p id="vaultHint" class="note ut-vault-hint"></p>
    <div class="ut-body">
      <div class="ut-panel ut-left">
        <div class="ut-survivor-card">
          <div class="ut-doll-name" id="utDollName">Survivor</div>
          <div class="ut-paperdoll" id="utPaperdoll"></div>
          <div class="ut-statline">
            <span id="utStatHealth">HP 100</span>
            <span id="utStatStamina">STM 100</span>
            <span id="utStatFood">FOOD 100</span>
            <span id="utStatWater">WATER 100</span>
          </div>
          <div class="ut-help">Arraste itens para organizar. Duplo clique equipa/usa. Clique direito dropa 1 item.</div>
        </div>
      </div>
      <div class="ut-panel ut-center">
        <div class="ut-section">
          <div class="ut-section-title"><span>Hands</span><span id="utHandsCount"></span></div>
          <div id="utHandsGrid" class="ut-grid compact"></div>
        </div>
        <div class="ut-section">
          <div class="ut-section-title"><span>Backpack</span><span id="utBackpackCount"></span></div>
          <div id="utBackpackGrid" class="ut-grid"></div>
        </div>
        <div class="ut-section">
          <div class="ut-section-title"><span>Vault</span><span id="utVaultCount"></span></div>
          <div id="utVaultGrid" class="ut-grid"></div>
        </div>
      </div>
      <div class="ut-panel ut-right">
        <div class="ut-section">
          <div class="ut-section-title"><span>Nearby</span><span id="utNearbyCount"></span></div>
          <div id="utNearbyGrid" class="ut-grid compact"></div>
        </div>
      </div>
    </div>
    <div id="inventoryTitle" style="display:none">Inventário</div>
    <div id="inventoryList" style="display:none"></div>
    <div id="vaultList" style="display:none"></div>
  `;
  document.getElementById('utCloseBtn').addEventListener('click', closeAllOverlays);

  let tip = document.getElementById('utTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'utTooltip';
    document.body.appendChild(tip);
  }

  const SECTION_CFG = {
    hands: { cols: 5, rows: 2, el: 'utHandsGrid', source: 'inventory' },
    backpack: { cols: 8, rows: 7, el: 'utBackpackGrid', source: 'inventory' },
    vault: { cols: 8, rows: 6, el: 'utVaultGrid', source: 'vault' },
    nearby: { cols: 7, rows: 4, el: 'utNearbyGrid', source: 'nearby' },
  };

  const ITEM_SIZES = {
    pistol:[2,1], viper:[3,1], maplestrike:[4,1], sniper:[5,1], minigun:[5,2], pdw:[3,1], caliRifle:[4,1], shotgun:[4,1],
    axe:[1,2], ammo:[1,1], ammoRifle:[1,1], ammoSniper:[1,1], ammoMini:[2,1], ammoShotgun:[1,1],
    water:[1,2], food:[1,1], wood:[2,1], stone:[1,1], tool:[1,1], gasoline:[1,2], turretAmmo:[2,1],
    airdropLauncher:[3,2], c4Throwable:[1,1], c4Charge:[1,1], detonator:[2,1], baseKit:[3,3], claimFlag:[2,2],
    generator:[3,2], bed:[2,2], safeBox:[2,2], wall:[2,1], door:[1,2], roof:[2,1], turret:[2,2]
  };

  const ITEM_ICON = {
    pistol:'🔫', viper:'🔫', maplestrike:'🔫', sniper:'🎯', minigun:'💥', pdw:'🔫', caliRifle:'🔫', shotgun:'🔫', axe:'🪓',
    ammo:'•', ammoRifle:'•', ammoSniper:'•', ammoMini:'•', ammoShotgun:'◼', water:'💧', food:'🥫', wood:'🪵', stone:'🪨', tool:'🧰',
    airdropLauncher:'🚀', c4Throwable:'💣', c4Charge:'💣', detonator:'📟', baseKit:'🏗️', claimFlag:'🚩', gasoline:'⛽', turretAmmo:'📦',
    generator:'⚡', bed:'🛏️', safeBox:'🗄️', wall:'🧱', door:'🚪', roof:'⬜', turret:'🔰'
  };
  const ITEM_KIND = {
    pistol:'weapon', viper:'weapon', maplestrike:'weapon', sniper:'weapon', minigun:'weapon', pdw:'weapon', caliRifle:'weapon', shotgun:'weapon', axe:'weapon',
    ammo:'ammo', ammoRifle:'ammo', ammoSniper:'ammo', ammoMini:'ammo', ammoShotgun:'ammo',
    water:'supply', food:'supply', gasoline:'supply',
    wood:'material', stone:'material', tool:'material', turretAmmo:'material',
    airdropLauncher:'special',
    c4Throwable:'explosive', c4Charge:'explosive', detonator:'explosive',
    baseKit:'build', claimFlag:'build', generator:'build', bed:'build', safeBox:'build', wall:'build', door:'build', roof:'build', turret:'build'
  };

  state.invUi = loadJSON('blocklandInvUiV10', { placements:{}, vaultPlacements:{}, handsOrder:['pistol','axe'] });

  function saveInvUi() {
    localStorage.setItem('blocklandInvUiV10', JSON.stringify(state.invUi));
  }

  function inventoryEntries() {
    return Object.entries(state.inventory).filter(([,qty]) => qty > 0);
  }
  function vaultEntries() {
    return Object.entries(state.vault).filter(([,qty]) => qty > 0);
  }
  function getItemSize(type) {
    return ITEM_SIZES[type] || [1,1];
  }
  function ensureStateUi() {
    if (!state.invUi || typeof state.invUi !== 'object') state.invUi = { placements:{}, vaultPlacements:{} };
    state.invUi.placements ||= {};
    state.invUi.vaultPlacements ||= {};
  }
  function occupiedPlacements(source, section, ignoreType=null) {
    const pool = source === 'vault' ? state.invUi.vaultPlacements : state.invUi.placements;
    const data = source === 'vault' ? Object.fromEntries(vaultEntries()) : Object.fromEntries(inventoryEntries());
    const out = [];
    for (const [type, pl] of Object.entries(pool)) {
      if (type === ignoreType) continue;
      if (!data[type] || !pl || pl.section !== section) continue;
      const [w,h] = getItemSize(type);
      out.push({ type, x: pl.x, y: pl.y, w, h });
    }
    return out;
  }
  function canPlace(source, section, type, x, y, ignoreType=null) {
    const cfg = SECTION_CFG[section];
    if (!cfg) return false;
    const [w,h] = getItemSize(type);
    if (x < 0 || y < 0 || x + w > cfg.cols || y + h > cfg.rows) return false;
    const occ = occupiedPlacements(source, section, ignoreType);
    return !occ.some(o => !(x + w <= o.x || o.x + o.w <= x || y + h <= o.y || o.y + o.h <= y));
  }
  function findFreeSpot(source, section, type, ignoreType=null) {
    const cfg = SECTION_CFG[section];
    if (!cfg) return null;
    const [w,h] = getItemSize(type);
    for (let y = 0; y <= cfg.rows - h; y++) {
      for (let x = 0; x <= cfg.cols - w; x++) {
        if (canPlace(source, section, type, x, y, ignoreType)) return { section, x, y };
      }
    }
    return null;
  }
  function syncLayouts() {
    ensureStateUi();
    const invSet = new Set(inventoryEntries().map(([t]) => t));
    const vaultSet = new Set(vaultEntries().map(([t]) => t));
    for (const k of Object.keys(state.invUi.placements)) if (!invSet.has(k)) delete state.invUi.placements[k];
    for (const k of Object.keys(state.invUi.vaultPlacements)) if (!vaultSet.has(k)) delete state.invUi.vaultPlacements[k];

    for (const [type] of inventoryEntries()) {
      let pl = state.invUi.placements[type];
      if (pl && canPlace('inventory', pl.section, type, pl.x, pl.y, type)) continue;
      const preferred = ['pistol','viper','maplestrike','sniper','minigun','pdw','caliRifle','shotgun','axe','detonator','airdropLauncher','c4Charge'].includes(type) ? 'hands' : 'backpack';
      pl = findFreeSpot('inventory', preferred, type, type) || findFreeSpot('inventory', preferred === 'hands' ? 'backpack' : 'hands', type, type);
      if (pl) state.invUi.placements[type] = pl;
    }
    for (const [type] of vaultEntries()) {
      let pl = state.invUi.vaultPlacements[type];
      if (pl && canPlace('vault', 'vault', type, pl.x, pl.y, type)) continue;
      pl = findFreeSpot('vault', 'vault', type, type);
      if (pl) state.invUi.vaultPlacements[type] = pl;
    }
    saveInvUi();
  }

  function currentNearby() {
    const out = [];
    const buckets = new Map();
    pickups.forEach((p, idx) => {
      if (!p?.mesh) return;
      if (p.mesh.position.distanceTo(state.player) > 4.6) return;
      const key = p.type;
      if (!buckets.has(key)) buckets.set(key, { type:p.type, qty:0, indices:[] });
      const b = buckets.get(key);
      b.qty += p.qty || 1;
      b.indices.push(idx);
    });
    buckets.forEach(v => out.push(v));
    return out;
  }

  function buildDoll() {
    const doll = document.getElementById('utPaperdoll');
    if (!doll) return;
    const skin = state.survivor.skin || '#d5b185';
    const shirt = state.survivor.shirt || '#4f9cff';
    doll.innerHTML = `
      <div style="position:absolute;left:53px;top:22px;width:54px;height:54px;background:${skin};border-radius:10px 10px 12px 12px;border:2px solid rgba(0,0,0,.22)"></div>
      <div style="position:absolute;left:50px;top:82px;width:60px;height:78px;background:${shirt};border-radius:12px;border:2px solid rgba(0,0,0,.22)"></div>
      <div style="position:absolute;left:34px;top:87px;width:16px;height:80px;background:${skin};border-radius:10px;border:2px solid rgba(0,0,0,.22)"></div>
      <div style="position:absolute;right:34px;top:87px;width:16px;height:80px;background:${skin};border-radius:10px;border:2px solid rgba(0,0,0,.22)"></div>
      <div style="position:absolute;left:50px;top:160px;width:26px;height:74px;background:#55606e;border-radius:10px;border:2px solid rgba(0,0,0,.22)"></div>
      <div style="position:absolute;left:84px;top:160px;width:26px;height:74px;background:#55606e;border-radius:10px;border:2px solid rgba(0,0,0,.22)"></div>
      <div style="position:absolute;left:50px;top:228px;width:28px;height:12px;background:#242931;border-radius:8px"></div>
      <div style="position:absolute;left:82px;top:228px;width:28px;height:12px;background:#242931;border-radius:8px"></div>
      <div style="position:absolute;left:60px;top:41px;width:8px;height:8px;background:#111;border-radius:50%"></div>
      <div style="position:absolute;left:91px;top:41px;width:8px;height:8px;background:#111;border-radius:50%"></div>
      <div style="position:absolute;left:63px;top:58px;width:32px;height:4px;background:#111;border-radius:4px"></div>
    `;
    document.getElementById('utDollName').textContent = state.survivor.name || 'Survivor';
    document.getElementById('utStatHealth').textContent = `HP ${Math.round(state.health)}`;
    document.getElementById('utStatStamina').textContent = `STM ${Math.round(state.energy)}`;
    document.getElementById('utStatFood').textContent = `FOOD ${Math.round(state.hunger)}`;
    document.getElementById('utStatWater').textContent = `WATER ${Math.round(state.thirst)}`;
  }

  function makeGrid(el, cols, rows, compact=false, locked=false) {
    el.innerHTML = '';
    el.style.setProperty('--cols', cols);
    el.style.setProperty('--rows', rows);
    el.classList.toggle('compact', compact);
    el.classList.toggle('locked', locked);
    for (let i=0;i<cols*rows;i++) {
      const c = document.createElement('div');
      c.className = 'ut-cell';
      el.appendChild(c);
    }
  }
  function cellMetrics(el) {
    const styles = getComputedStyle(el);
    const cell = parseFloat(styles.getPropertyValue('--cell')) || 42;
    const gap = parseFloat(styles.getPropertyValue('--gap')) || 4;
    return { cell, gap };
  }
  function placePixels(el, x, y, w, h) {
    const {cell, gap} = cellMetrics(el);
    return {
      left: 10 + x * (cell + gap),
      top: 10 + y * (cell + gap),
      width: w * cell + (w-1) * gap,
      height: h * cell + (h-1) * gap,
    };
  }
  function tooltipHtml(type, qty, where='') {
    const name = labelOf(type);
    const [w,h] = getItemSize(type);
    return `<b>${name}</b><span>${qty}x · ${w}x${h}</span>${where ? `<span>${where}</span>` : ''}`;
  }
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.style.display = 'block';
    tip.style.left = (x + 14) + 'px';
    tip.style.top = (y + 14) + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }

  function renderSection(section) {
    const cfg = SECTION_CFG[section];
    const el = document.getElementById(cfg.el);
    if (!el) return;
    const locked = section === 'vault' && state.currentVaultMode === 'backpack';
    makeGrid(el, cfg.cols, cfg.rows, section !== 'backpack' && section !== 'vault', locked);
    const items = [];
    if (section === 'vault') {
      for (const [type, qty] of vaultEntries()) {
        const pl = state.invUi.vaultPlacements[type];
        if (!pl || pl.section !== 'vault') continue;
        items.push({ owner:'vault', type, qty, x:pl.x, y:pl.y });
      }
    } else if (section === 'nearby') {
      let x = 0, y = 0;
      currentNearby().forEach((entry) => {
        const [w,h] = getItemSize(entry.type);
        items.push({ owner:'nearby', type:entry.type, qty:entry.qty, x, y, nearby:true });
        x += Math.max(1, Math.min(w,2));
        if (x >= cfg.cols-1) { x = 0; y += 2; }
      });
    } else {
      for (const [type, qty] of inventoryEntries()) {
        const pl = state.invUi.placements[type];
        if (!pl || pl.section !== section) continue;
        items.push({ owner:'inventory', type, qty, x:pl.x, y:pl.y });
      }
    }

    items.forEach(item => {
      const [w,h] = getItemSize(item.type);
      const d = document.createElement('div');
      d.className = 'ut-item';
      d.dataset.type = item.type;
      d.dataset.owner = item.owner;
      d.dataset.section = section;
      d.dataset.kind = ITEM_KIND[item.type] || 'material';
      d.draggable = true;
      const p = placePixels(el, item.x, item.y, Math.min(w,cfg.cols), Math.min(h,cfg.rows));
      d.style.left = p.left + 'px';
      d.style.top = p.top + 'px';
      d.style.width = p.width + 'px';
      d.style.height = p.height + 'px';
      const cond = item.owner === 'nearby' ? '' : `<div class="cond"><i style="width:${Math.max(22, Math.min(100, (item.qty>0? (70 + (item.qty % 31)) : 70)))}%"></i></div>`;
      d.innerHTML = `<span class="icon">${ITEM_ICON[item.type] || '⬛'}</span><span class="qty">${item.qty}</span>${cond}`;
      d.addEventListener('mouseenter', e => showTip(tooltipHtml(item.type, item.qty, item.owner === 'vault' ? 'Vault' : item.owner === 'nearby' ? 'Perto de você' : section === 'hands' ? 'Na mão' : 'Na mochila'), e.clientX, e.clientY));
      d.addEventListener('mousemove', e => showTip(tooltipHtml(item.type, item.qty, item.owner === 'vault' ? 'Vault' : item.owner === 'nearby' ? 'Perto de você' : section === 'hands' ? 'Na mão' : 'Na mochila'), e.clientX, e.clientY));
      d.addEventListener('mouseleave', hideTip);
      d.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ type:item.type, owner:item.owner, section }));
      });
      d.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (item.owner === 'nearby') collectNearbyType(item.type);
        else useInventoryItem(item.type);
        if (state.inventoryOpen) renderInventory();
      });
      d.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (item.owner === 'inventory') { dropItem(item.type, 1); renderInventory(); }
      });
      d.addEventListener('click', () => { if (item.owner === 'nearby') { collectNearbyType(item.type); renderInventory(); } });
      el.appendChild(d);
    });

    el.ondragover = handleDragOver;
    el.ondragleave = () => { el.classList.remove('drop-ok','drop-bad'); };
    el.ondrop = handleDropOnGrid;
  }

  function getGridCellFromEvent(el, e) {
    const rect = el.getBoundingClientRect();
    const {cell, gap} = cellMetrics(el);
    const relX = e.clientX - rect.left - 10;
    const relY = e.clientY - rect.top - 10;
    const x = Math.max(0, Math.floor(relX / (cell + gap)));
    const y = Math.max(0, Math.floor(relY / (cell + gap)));
    return { x, y };
  }

  function handleDragOver(e) {
    e.preventDefault();
    const el = e.currentTarget;
    const section = Object.keys(SECTION_CFG).find(k => SECTION_CFG[k].el === el.id);
    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}'); } catch { payload = null; }
    if (!payload?.type) return;
    const {x,y} = getGridCellFromEvent(el, e);
    let ok = true;
    if (section === 'vault') {
      if (state.currentVaultMode === 'backpack') ok = false;
      else ok = canPlace('vault','vault',payload.type,x,y,payload.owner === 'vault' ? payload.type : null);
    } else if (section === 'nearby') ok = false;
    else ok = canPlace('inventory', section, payload.type, x, y, payload.owner === 'inventory' ? payload.type : null);
    el.classList.toggle('drop-ok', !!ok);
    el.classList.toggle('drop-bad', !ok);
  }

  function handleDropOnGrid(e) {
    e.preventDefault();
    const el = e.currentTarget;
    el.classList.remove('drop-ok','drop-bad');
    const section = Object.keys(SECTION_CFG).find(k => SECTION_CFG[k].el === el.id);
    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}'); } catch { payload = null; }
    if (!payload?.type) return;
    if (section === 'nearby') return;
    const {x,y} = getGridCellFromEvent(el, e);

    if (payload.owner === 'nearby') {
      collectNearbyType(payload.type);
      syncLayouts();
      const target = section === 'vault' ? 'backpack' : section;
      if (state.inventory[payload.type] > 0 && canPlace('inventory', target, payload.type, x, y, payload.type)) state.invUi.placements[payload.type] = { section:target, x, y };
      saveInvUi();
      renderInventory();
      return;
    }

    if (payload.owner === 'inventory') {
      const qty = state.inventory[payload.type] || 0;
      if (qty <= 0) return;
      if (section === 'vault') {
        if (state.currentVaultMode === 'backpack') return showMessage('Vault só na SAFE ou com /vault.');
        moveToVault(payload.type, qty);
        syncLayouts();
        if (state.vault[payload.type] && canPlace('vault','vault', payload.type, x, y, payload.type)) state.invUi.vaultPlacements[payload.type] = { section:'vault', x, y };
      } else if (canPlace('inventory', section, payload.type, x, y, payload.type)) {
        state.invUi.placements[payload.type] = { section, x, y };
        if (section === 'hands') {
          const idx = slots.findIndex(s => s.id === payload.type);
          if (idx >= 0) { state.selected = idx; updateHeldModel(); }
        }
      } else return;
    } else if (payload.owner === 'vault') {
      const qty = state.vault[payload.type] || 0;
      if (qty <= 0) return;
      if (section === 'vault') {
        if (canPlace('vault','vault', payload.type, x, y, payload.type)) state.invUi.vaultPlacements[payload.type] = { section:'vault', x, y };
        else return;
      } else {
        moveFromVault(payload.type, qty);
        syncLayouts();
        if (canPlace('inventory', section, payload.type, x, y, payload.type)) state.invUi.placements[payload.type] = { section, x, y };
      }
    }
    saveInvUi();
    renderInventory();
  }

  function collectNearbyType(type) {
    const targets = pickups.filter(p => p?.mesh && p.type === type && p.mesh.position.distanceTo(state.player) <= 4.6);
    targets.forEach(p => collectPickup(p));
  }

  const _oldRenderInventoryV10 = renderInventory;
  renderInventory = function() {
    syncLayouts();
    document.getElementById('inventoryTitle').textContent = 'Inventário em grade';
    const mode = state.currentVaultMode;
    const hint = mode === 'safe'
      ? 'Na SAFE você pode organizar a mochila e o vault grande. O vault persiste após morrer.'
      : mode === 'small'
        ? 'Fora da SAFE, /vault abre um vault remoto menor. Arraste itens para organizar.'
        : 'Mochila aberta. O vault fica bloqueado fora da SAFE; arraste itens para reorganizar.';
    document.getElementById('vaultHint').textContent = hint;
    buildDoll();
    renderSection('hands');
    renderSection('backpack');
    renderSection('vault');
    renderSection('nearby');
    const invCount = inventoryEntries().reduce((a,[,q])=>a+q,0);
    const vaultCount = vaultEntries().reduce((a,[,q])=>a+q,0);
    const nearbyCount = currentNearby().reduce((a,x)=>a+x.qty,0);
    const handsCount = inventoryEntries().filter(([t]) => state.invUi.placements[t]?.section === 'hands').reduce((a,[,q])=>a+q,0);
    document.getElementById('utHandsCount').textContent = `${handsCount} itens`;
    document.getElementById('utBackpackCount').textContent = `${invCount} total`;
    document.getElementById('utVaultCount').textContent = `${vaultCount} total`;
    document.getElementById('utNearbyCount').textContent = `${nearbyCount} total`;
  };

  const _oldAddItemV10 = addItem;
  addItem = function(type, qty) { _oldAddItemV10(type, qty); syncLayouts(); saveInvUi(); };
  const _oldMoveToVaultV10 = moveToVault;
  moveToVault = function(type, qty) { _oldMoveToVaultV10(type, qty); syncLayouts(); saveInvUi(); };
  const _oldMoveFromVaultV10 = moveFromVault;
  moveFromVault = function(type, qty) { _oldMoveFromVaultV10(type, qty); syncLayouts(); saveInvUi(); };
  const _oldDropItemV10 = dropItem;
  dropItem = function(type, qty=1) { _oldDropItemV10(type, qty); syncLayouts(); saveInvUi(); };
  const _oldCollectPickupV10 = collectPickup;
  collectPickup = function(p) { _oldCollectPickupV10(p); syncLayouts(); saveInvUi(); };

  showMessage('v1.0: inventário agora usa grade estilo survival, com ícones, hover e arrastar/soltar.');
})();
