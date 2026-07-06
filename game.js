import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const VERSION = 'v0.5 ARQUIVO REAL - PISTOLA + LOOT';

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
  ammo: 36,
  selected: 0,
  inventory: {
    pistol: 1,
    ammo: 36,
    axe: 1,
    water: 1,
    food: 1,
    wood: 0,
    stone: 0,
    tool: 0,
  },
  attackAnim: 0,
  bob: 0,
  messageTimer: 0,
  zombieSpawnTimer: 0,
};

const slots = [
  { id: 'pistol', label: 'Pistolinha', use: 'shoot' },
  { id: 'ammo', label: 'Munição', use: 'none' },
  { id: 'axe', label: 'Machado', use: 'axe' },
  { id: 'water', label: 'Água', use: 'drink' },
  { id: 'food', label: 'Comida', use: 'eat' },
  { id: 'wood', label: 'Madeira', use: 'none' },
  { id: 'stone', label: 'Pedra', use: 'none' },
  { id: 'tool', label: 'Ferram.', use: 'none' },
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
};

function terrainHeight(x, z) {
  return Math.sin(x * 0.055) * 1.6 + Math.cos(z * 0.047) * 1.2 + Math.sin((x + z) * 0.027) * 0.8;
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
  const parts = createZombieMesh();
  parts.group.position.set(x, terrainHeight(x, z), z);
  scene.add(parts.group);
  zombies.push({
    ...parts,
    hp: 100,
    speed: 2.65 + Math.random() * 0.55,
    attackCooldown: 0,
    stun: 0,
    alive: true,
    phase: Math.random() * 10,
  });
}

function makePickupMesh(type) {
  const group = new THREE.Group();
  let mesh;
  if (type === 'ammo') {
    mesh = box(0.9, 0.35, 0.45, mats.metal);
    const cap = box(0.18, 0.38, 0.48, new THREE.MeshLambertMaterial({ color: 0xd6a437 }));
    cap.position.x = 0.5;
    group.add(cap);
  } else if (type === 'water') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 12), mats.water);
  } else if (type === 'food') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 12), mats.food);
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
  if (roll < 0.34) return 'ammo';
  if (roll < 0.52) return 'food';
  if (roll < 0.70) return 'water';
  if (roll < 0.82) return 'wood';
  if (roll < 0.92) return 'stone';
  if (rareTools && roll < 0.985) return 'tool';
  return 'axe';
}

function zombieDropLoot(z) {
  const base = z.group.position.clone();
  const count = 2 + Math.floor(Math.random() * 4);
  spawnPickup('ammo', 5 + Math.floor(Math.random() * 10), scatter(base));
  for (let i = 1; i < count; i++) {
    const type = randomLootType(true);
    let qty = 1;
    if (type === 'ammo') qty = 4 + Math.floor(Math.random() * 10);
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

  if (id === 'pistol') {
    const body = box(0.34, 0.28, 0.72, mats.pistol);
    body.position.set(0.33, 0.08, -0.18);
    const barrel = box(0.18, 0.16, 0.75, mats.metal);
    barrel.position.set(0.33, 0.16, -0.70);
    const grip = box(0.22, 0.48, 0.18, mats.pistol);
    grip.position.set(0.33, -0.22, 0.12);
    grip.rotation.x = -0.3;
    group.add(body, barrel, grip);
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
    } else if (slot.id === 'pistol') {
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

function createBulletTrail(target) {
  const start = new THREE.Vector3();
  camera.getWorldPosition(start);
  const end = target ? target.clone() : start.clone().add(getForward().multiplyScalar(45));
  const points = [start, end];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xfff2a3 }));
  scene.add(line);
  bullets.push({ line, ttl: 0.08 });
}

function getForward() {
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(camera.quaternion);
  return forward.normalize();
}

function shoot() {
  if (state.inventory.pistol <= 0) return showMessage('Você não tem pistola.');
  if (state.ammo <= 0 || state.inventory.ammo <= 0) return showMessage('Sem munição! Mate zumbis ou procure drops.');
  state.ammo--;
  state.inventory.ammo = state.ammo;
  state.attackAnim = 1;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  let best = null;
  let bestDist = Infinity;
  for (const z of zombies) {
    if (!z.alive) continue;
    const dist = z.group.position.distanceTo(state.player);
    if (dist > 52) continue;
    const box3 = new THREE.Box3().setFromObject(z.group);
    const hit = raycaster.ray.intersectBox(box3, new THREE.Vector3());
    if (hit && dist < bestDist) {
      best = z;
      bestDist = dist;
    }
  }

  if (best) {
    damageZombie(best, 38, 1.0);
    createBulletTrail(best.group.position.clone().add(new THREE.Vector3(0, 2.3, 0)));
  } else {
    createBulletTrail(null);
  }
}

function axeUse() {
  if (state.inventory.axe <= 0) return showMessage('Você não tem machado.');
  state.attackAnim = 1;
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
  if (slot.use === 'shoot') shoot();
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
  showMessage('Bebeu água.');
}

function eatFood() {
  if (state.inventory.food <= 0) return showMessage('Você não tem comida.');
  state.inventory.food--;
  state.hunger = Math.min(100, state.hunger + 35);
  state.attackAnim = 1;
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
  if (p.type === 'ammo') state.ammo = state.inventory.ammo;
  scene.remove(p.mesh);
  const idx = pickups.indexOf(p);
  if (idx >= 0) pickups.splice(idx, 1);
  showMessage(`Coletou ${p.qty}x ${labelOf(p.type)}.`);
}

function labelOf(type) {
  const found = slots.find(s => s.id === type);
  return found ? found.label : type;
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
      const chase = dist < 62;
      if (chase) {
        zp.addScaledVector(dir, z.speed * dt);
        zp.y = terrainHeight(zp.x, zp.z);
        z.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
      const walk = Math.sin(z.phase) * 0.55;
      z.legL.rotation.x = walk;
      z.legR.rotation.x = -walk;
      z.armL.rotation.x = -0.55 - walk * 0.25;
      z.armR.rotation.x = -0.55 + walk * 0.25;
    }

    if (dist < 2.05 && z.stun <= 0 && z.attackCooldown <= 0) {
      state.health = Math.max(0, state.health - 8);
      z.attackCooldown = 0.85;
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
  state.hunger = Math.max(0, state.hunger - dt * 0.55);
  state.thirst = Math.max(0, state.thirst - dt * 0.75);
  if (state.hunger <= 0 || state.thirst <= 0) {
    state.health = Math.max(0, state.health - dt * 5);
    if (state.health <= 0) endGame();
  }
}

function endGame() {
  state.gameOver = true;
  showMessage('Você morreu. Aperte F5 para reiniciar.', 999);
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
  document.getElementById('ammoText').textContent = state.ammo;
  document.getElementById('zombieText').textContent = zombies.length;
  document.getElementById('equippedText').textContent = slots[state.selected].label;

  const hotbar = document.getElementById('hotbar');
  hotbar.innerHTML = '';
  slots.forEach((slot, i) => {
    const div = document.createElement('div');
    div.className = `slot ${i === state.selected ? 'active' : ''}`;
    const qty = slot.id === 'pistol' || slot.id === 'axe' ? (state.inventory[slot.id] > 0 ? 'OK' : '0') : (state.inventory[slot.id] ?? 0);
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
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code)) e.preventDefault();
  state.keys.add(code);

  if (code === 'Space' && state.grounded && !state.gameOver) {
    state.velocityY = 8.5;
    state.grounded = false;
  }
  if (code === 'KeyE') pickupNearest();
  if (code === 'KeyF') useCurrentItem();
  if (/^Digit[1-8]$/.test(code)) {
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
  if (!state.started || state.gameOver) return;
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
  document.getElementById('startScreen').style.display = 'none';
  renderer.domElement.requestPointerLock();
  showMessage('Pistolinha equipada. Mate zumbis para pegar loot!');
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
document.getElementById('startButton').addEventListener('click', startGame);
