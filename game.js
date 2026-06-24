import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const gameRoot = document.querySelector("#game");
const menu = document.querySelector("#menu");
const hud = document.querySelector("#hud");
const gameOverScreen = document.querySelector("#game-over");
const interactionEl = document.querySelector("#interaction");
const messageEl = document.querySelector("#message");
const hotbarEl = document.querySelector("#hotbar");
const hurtEl = document.querySelector("#hurt");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7df);
scene.fog = new THREE.Fog(0x8fc7df, 55, 155);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 240);
camera.position.set(0, 4, 16);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
gameRoot.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(camera);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
raycaster.far = 3.4;

const worldObjects = [];
const zombies = [];
const pickups = [];
const colliders = [];
const keys = {};
const terrainSize = 160;
let gameStarted = false;
let gameEnded = false;
let currentTarget = null;
let messageTimer = 0;
let elapsed = 0;
let attackCooldown = 0;
let zombieSpawnTimer = 12;
let itemAction = 0;
let equippedView = null;

const state = {
  health: 100,
  hunger: 100,
  thirst: 100,
  stamina: 100,
  selected: 0,
  inventory: [
    { id: "axe", name: "Machado", icon: "AX", count: 1 },
    { id: "water", name: "Agua", icon: "H2O", count: 1 },
    { id: "food", name: "Enlatado", icon: "CAN", count: 1 },
    { id: "wood", name: "Madeira", icon: "LOG", count: 0 },
    { id: "stone", name: "Pedra", icon: "ROC", count: 0 }
  ]
};

const materials = {
  grass: new THREE.MeshLambertMaterial({ color: 0x668d3f }),
  road: new THREE.MeshLambertMaterial({ color: 0x505451 }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x68472f }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x3f6f35 }),
  rock: new THREE.MeshLambertMaterial({ color: 0x7b817c }),
  wall: new THREE.MeshLambertMaterial({ color: 0xc9b58c }),
  roof: new THREE.MeshLambertMaterial({ color: 0x713c35 }),
  glass: new THREE.MeshLambertMaterial({ color: 0x80bdd2 }),
  zombieSkin: new THREE.MeshLambertMaterial({ color: 0x78a55b }),
  zombieShirt: new THREE.MeshLambertMaterial({ color: 0x495f78 }),
  zombiePants: new THREE.MeshLambertMaterial({ color: 0x343b3e })
};

const viewMaterials = {
  skin: new THREE.MeshBasicMaterial({ color: 0xd6a071, depthTest: false }),
  sleeve: new THREE.MeshBasicMaterial({ color: 0x486945, depthTest: false }),
  wood: new THREE.MeshBasicMaterial({ color: 0x70472c, depthTest: false }),
  metal: new THREE.MeshBasicMaterial({ color: 0x9aa3a6, depthTest: false }),
  water: new THREE.MeshBasicMaterial({ color: 0x56b8df, transparent: true, opacity: 0.85, depthTest: false }),
  food: new THREE.MeshBasicMaterial({ color: 0xb94e3d, depthTest: false }),
  stone: new THREE.MeshBasicMaterial({ color: 0x747a76, depthTest: false })
};

const viewModel = new THREE.Group();
viewModel.position.set(0.64, -0.64, -1.05);
camera.add(viewModel);

function terrainHeight(x, z) {
  return Math.sin(x * 0.055) * 1.4 + Math.cos(z * 0.045) * 1.1 + Math.sin((x + z) * 0.025) * 0.8;
}

function viewMesh(geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 100;
  return mesh;
}

function createViewModel() {
  const arm = viewMesh(new THREE.BoxGeometry(0.22, 0.22, 0.78), viewMaterials.sleeve);
  arm.position.set(0.08, -0.08, 0.2);
  arm.rotation.x = -0.42;
  const hand = viewMesh(new THREE.BoxGeometry(0.24, 0.24, 0.3), viewMaterials.skin);
  hand.position.set(0.08, 0.08, -0.25);
  viewModel.add(arm, hand);
  updateEquippedView();
}

function createHeldItem(id) {
  const group = new THREE.Group();
  if (id === "axe") {
    const handle = viewMesh(new THREE.BoxGeometry(0.09, 0.09, 0.85), viewMaterials.wood);
    handle.rotation.x = -0.2;
    const blade = viewMesh(new THREE.BoxGeometry(0.42, 0.32, 0.1), viewMaterials.metal);
    blade.position.set(-0.14, 0.07, -0.4);
    group.add(handle, blade);
    group.rotation.set(-0.2, 0.1, 0.22);
  } else if (id === "water") {
    const bottle = viewMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.48, 8), viewMaterials.water);
    bottle.rotation.x = Math.PI / 2;
    const cap = viewMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8), viewMaterials.metal);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = -0.27;
    group.add(bottle, cap);
  } else if (id === "food") {
    const can = viewMesh(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 12), viewMaterials.food);
    can.rotation.x = Math.PI / 2;
    group.add(can);
  } else if (id === "wood") {
    const log = viewMesh(new THREE.BoxGeometry(0.26, 0.26, 0.65), viewMaterials.wood);
    log.rotation.x = -0.25;
    group.add(log);
  } else if (id === "stone") {
    const rock = viewMesh(new THREE.DodecahedronGeometry(0.23, 0), viewMaterials.stone);
    group.add(rock);
  }
  group.position.set(0.02, 0.15, -0.48);
  group.traverse((child) => {
    if (child.isMesh) child.frustumCulled = false;
  });
  return group;
}

function updateEquippedView() {
  if (equippedView) viewModel.remove(equippedView);
  const item = selectedItem();
  equippedView = item && item.count > 0 ? createHeldItem(item.id) : null;
  if (equippedView) viewModel.add(equippedView);
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xcde8f2, 0x354527, 2.1));
  const sun = new THREE.DirectionalLight(0xfff2ce, 2.4);
  sun.position.set(-45, 65, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -75;
  sun.shadow.camera.right = 75;
  sun.shadow.camera.top = 75;
  sun.shadow.camera.bottom = -75;
  scene.add(sun);
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 70, 70);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  }
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, materials.grass);
  terrain.receiveShadow = true;
  scene.add(terrain);

  const road = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, terrainSize), materials.road);
  road.position.set(-14, 0.2, 0);
  road.receiveShadow = true;
  scene.add(road);

  for (let z = -72; z < 72; z += 10) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.03, 4.5),
      new THREE.MeshBasicMaterial({ color: 0xd3c56e })
    );
    line.position.set(-14, 0.3, z);
    scene.add(line);
  }
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function randomWorldPosition(avoidRoad = true) {
  let x;
  let z;
  do {
    x = THREE.MathUtils.randFloatSpread(140);
    z = THREE.MathUtils.randFloatSpread(140);
  } while ((avoidRoad && Math.abs(x + 14) < 9) || Math.hypot(x, z - 16) < 12);
  return { x, z, y: terrainHeight(x, z) };
}

function createTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.2, 1.2), materials.trunk));
  trunk.position.y = 2.6;
  const crown = shadow(new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.6, 4.2), materials.leaves));
  crown.position.y = 6;
  crown.rotation.y = Math.random() * Math.PI;
  group.add(trunk, crown);
  group.position.set(x, terrainHeight(x, z), z);
  group.scale.setScalar(scale);
  group.userData = { type: "tree", health: 3, label: "Arvore", resource: "wood" };
  scene.add(group);
  worldObjects.push(group);
  colliders.push({ object: group, radius: 1.2 * scale });
}

function createRock(x, z, scale = 1) {
  const rock = shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), materials.rock));
  rock.position.set(x, terrainHeight(x, z) + 0.8 * scale, z);
  rock.scale.set(scale * 1.25, scale * 0.8, scale);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.userData = { type: "rock", health: 3, label: "Pedra", resource: "stone" };
  scene.add(rock);
  worldObjects.push(rock);
  colliders.push({ object: rock, radius: 1.25 * scale });
}

function createHouse(x, z, color) {
  const group = new THREE.Group();
  const wallMaterial = new THREE.MeshLambertMaterial({ color });
  const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(9, 5, 8), wallMaterial));
  body.position.y = 2.5;
  const roof = shadow(new THREE.Mesh(new THREE.ConeGeometry(7, 3, 4), materials.roof));
  roof.position.y = 6.4;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 0.15), materials.trunk);
  door.position.set(0, 1.6, 4.05);
  const windowA = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 0.16), materials.glass);
  windowA.position.set(-2.6, 3.1, 4.06);
  const windowB = windowA.clone();
  windowB.position.x = 2.6;
  group.add(body, roof, door, windowA, windowB);
  group.position.set(x, terrainHeight(x, z), z);
  scene.add(group);
  colliders.push({ object: group, radius: 5.6 });
}

function createPickup(type, x, z) {
  const colors = { water: 0x50a6d8, food: 0xb84b3e };
  const geometry = type === "water"
    ? new THREE.CylinderGeometry(0.28, 0.35, 1.1, 8)
    : new THREE.CylinderGeometry(0.42, 0.42, 0.65, 12);
  const mesh = shadow(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: colors[type] })));
  mesh.position.set(x, terrainHeight(x, z) + 0.7, z);
  mesh.userData = {
    type: "pickup",
    item: type,
    label: type === "water" ? "Garrafa de agua" : "Comida enlatada",
    baseY: mesh.position.y
  };
  scene.add(mesh);
  pickups.push(mesh);
  worldObjects.push(mesh);
}

function createZombie(x, z) {
  const group = new THREE.Group();
  const torso = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.65, 0.7), materials.zombieShirt));
  torso.position.y = 2.25;
  const head = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), materials.zombieSkin));
  head.position.y = 3.55;
  const legs = [];
  const arms = [];
  for (const side of [-1, 1]) {
    const leg = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.45, 0.5), materials.zombiePants));
    leg.position.set(side * 0.34, 0.75, 0);
    group.add(leg);
    legs.push(leg);
    const arm = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.5, 0.38), materials.zombieSkin));
    arm.position.set(side * 0.85, 2.25, -0.35);
    arm.rotation.x = -Math.PI / 2.8;
    group.add(arm);
    arms.push(arm);
  }
  group.add(torso, head);
  group.position.set(x, terrainHeight(x, z), z);
  group.userData = {
    type: "zombie",
    label: "Infectado",
    health: 3,
    speed: THREE.MathUtils.randFloat(1.25, 1.8),
    attackTimer: 0,
    legs,
    arms,
    phase: Math.random() * Math.PI * 2
  };
  scene.add(group);
  zombies.push(group);
  worldObjects.push(group);
}

function populateWorld() {
  createHouse(-27, 4, 0xd0b074);
  createHouse(-1, -18, 0x91a66b);
  createHouse(-27, -32, 0xa98272);
  for (let i = 0; i < 38; i += 1) {
    const p = randomWorldPosition();
    createTree(p.x, p.z, THREE.MathUtils.randFloat(0.8, 1.3));
  }
  for (let i = 0; i < 20; i += 1) {
    const p = randomWorldPosition();
    createRock(p.x, p.z, THREE.MathUtils.randFloat(0.55, 1.1));
  }
  for (let i = 0; i < 12; i += 1) {
    const p = randomWorldPosition(false);
    createPickup(i % 2 ? "water" : "food", p.x, p.z);
  }
  for (let i = 0; i < 7; i += 1) {
    const p = randomWorldPosition();
    createZombie(p.x, p.z);
  }
}

function renderHotbar() {
  hotbarEl.innerHTML = state.inventory.map((item, index) => `
    <div class="slot ${index === state.selected ? "active" : ""}">
      <span class="slot-key">${index + 1}</span>
      <span class="slot-count">${item.count || ""}</span>
      <span class="slot-icon">${item.icon}</span>
      <div class="slot-name">${item.name}</div>
    </div>
  `).join("");
  updateEquippedView();
}

function updateHud() {
  for (const key of ["health", "hunger", "thirst", "stamina"]) {
    const value = Math.max(0, Math.round(state[key]));
    document.querySelector(`#${key}-bar`).style.width = `${value}%`;
    document.querySelector(`#${key}-value`).textContent = value;
  }
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.style.opacity = 1;
  messageTimer = 2;
}

function selectedItem() {
  return state.inventory[state.selected];
}

function removeObject(object) {
  scene.remove(object);
  const worldIndex = worldObjects.indexOf(object);
  if (worldIndex >= 0) worldObjects.splice(worldIndex, 1);
  const colliderIndex = colliders.findIndex((item) => item.object === object);
  if (colliderIndex >= 0) colliders.splice(colliderIndex, 1);
}

function collectPickup(target) {
  const item = state.inventory.find((entry) => entry.id === target.userData.item);
  item.count += 1;
  removeObject(target);
  const index = pickups.indexOf(target);
  if (index >= 0) pickups.splice(index, 1);
  showMessage(`${target.userData.label} coletada`);
  renderHotbar();
}

function attack() {
  if (!controls.isLocked || gameEnded || attackCooldown > 0) return;
  const item = selectedItem();
  attackCooldown = 0.48;
  itemAction = 1;
  if (item.id !== "axe") {
    showMessage("Equipe o machado para atacar");
    return;
  }
  if (!currentTarget || currentTarget.distance > 3.4) return;
  const target = currentTarget.object;
  if (!["tree", "rock", "zombie"].includes(target.userData.type)) return;
  target.userData.health -= 1;
  target.position.x += (target.position.x - camera.position.x) * 0.035;
  target.position.z += (target.position.z - camera.position.z) * 0.035;
  if (target.userData.health > 0) {
    showMessage(`${target.userData.label}: ${target.userData.health} golpes restantes`);
    return;
  }
  if (target.userData.type === "zombie") {
    const index = zombies.indexOf(target);
    if (index >= 0) zombies.splice(index, 1);
    showMessage("Infectado eliminado");
    if (Math.random() < 0.45) createPickup(Math.random() < 0.5 ? "water" : "food", target.position.x, target.position.z);
  } else {
    const resource = state.inventory.find((entry) => entry.id === target.userData.resource);
    resource.count += target.userData.type === "tree" ? 3 : 2;
    showMessage(`+${target.userData.type === "tree" ? 3 : 2} ${resource.name}`);
  }
  removeObject(target);
  renderHotbar();
}

function useSelected() {
  if (!controls.isLocked || gameEnded) return;
  const item = selectedItem();
  if (item.id === "water" && item.count > 0) {
    itemAction = 1;
    item.count -= 1;
    state.thirst = Math.min(100, state.thirst + 38);
    showMessage("Voce bebeu agua");
  } else if (item.id === "food" && item.count > 0) {
    itemAction = 1;
    item.count -= 1;
    state.hunger = Math.min(100, state.hunger + 34);
    state.health = Math.min(100, state.health + 5);
    showMessage("Voce comeu o enlatado");
  } else if (item.id === "axe") {
    attack();
  } else {
    showMessage(item.count ? "Este recurso sera usado no crafting" : "Item vazio");
  }
  renderHotbar();
  updateHud();
}

function updateTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(worldObjects, true);
  currentTarget = null;
  for (const hit of hits) {
    let object = hit.object;
    while (object.parent && !object.userData.type) object = object.parent;
    if (object.userData.type) {
      currentTarget = { object, distance: hit.distance };
      break;
    }
  }
  if (!currentTarget || currentTarget.distance > 3.4) {
    interactionEl.textContent = "";
    return;
  }
  const target = currentTarget.object;
  interactionEl.textContent = target.userData.type === "pickup"
    ? `[E] Coletar ${target.userData.label}`
    : `[Clique] ${target.userData.type === "zombie" ? "Atacar" : "Usar machado em"} ${target.userData.label}`;
}

function resolveCollision(nextPosition) {
  const margin = 0.65;
  for (const collider of colliders) {
    const objectPosition = collider.object.position;
    if (Math.hypot(nextPosition.x - objectPosition.x, nextPosition.z - objectPosition.z) < collider.radius + margin) {
      return false;
    }
  }
  return true;
}

function updatePlayer(delta) {
  if (!controls.isLocked || gameEnded) return;
  let forward = Number(keys.KeyW || keys.ArrowUp) - Number(keys.KeyS || keys.ArrowDown);
  let sideways = Number(keys.KeyD || keys.ArrowRight) - Number(keys.KeyA || keys.ArrowLeft);
  const inputLength = Math.hypot(forward, sideways);
  if (inputLength > 1) {
    forward /= inputLength;
    sideways /= inputLength;
  }
  const running = (keys.ShiftLeft || keys.ShiftRight) && state.stamina > 1 && forward > 0;
  const moving = forward !== 0 || sideways !== 0;
  const speed = running ? 10.5 : 6.2;

  const oldPosition = camera.position.clone();
  if (forward) controls.moveForward(forward * speed * delta);
  if (sideways) controls.moveRight(sideways * speed * delta);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -76, 76);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -76, 76);
  if (!resolveCollision(camera.position)) {
    camera.position.x = oldPosition.x;
    camera.position.z = oldPosition.z;
  }

  const ground = terrainHeight(camera.position.x, camera.position.z) + 1.72;
  const bob = moving ? Math.sin(elapsed * (running ? 14 : 10)) * 0.045 : 0;
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, ground + bob, 0.22);

  if (running && moving) state.stamina = Math.max(0, state.stamina - delta * 19);
  else state.stamina = Math.min(100, state.stamina + delta * 12);

  state.hunger = Math.max(0, state.hunger - delta * 0.11);
  state.thirst = Math.max(0, state.thirst - delta * (running ? 0.26 : 0.17));
  if (state.hunger <= 0 || state.thirst <= 0) state.health -= delta * 3;
}

function damagePlayer(amount) {
  state.health = Math.max(0, state.health - amount);
  hurtEl.style.opacity = 1;
  setTimeout(() => {
    hurtEl.style.opacity = 0;
  }, 130);
  if (state.health <= 0) endGame();
}

function updateZombies(delta) {
  if (!gameStarted || gameEnded) return;
  for (const zombie of zombies) {
    const dx = camera.position.x - zombie.position.x;
    const dz = camera.position.z - zombie.position.z;
    const distance = Math.hypot(dx, dz);
    zombie.userData.attackTimer -= delta;
    if (distance < 24 && distance > 1.45) {
      zombie.position.x += (dx / distance) * zombie.userData.speed * delta;
      zombie.position.z += (dz / distance) * zombie.userData.speed * delta;
      zombie.position.y = terrainHeight(zombie.position.x, zombie.position.z);
      zombie.lookAt(camera.position.x, zombie.position.y + 2, camera.position.z);
      const walk = Math.sin(elapsed * 8 + zombie.userData.phase) * 0.6;
      zombie.userData.legs[0].rotation.x = walk;
      zombie.userData.legs[1].rotation.x = -walk;
    } else {
      zombie.userData.legs.forEach((leg) => {
        leg.rotation.x *= 0.85;
      });
    }
    if (distance < 1.65 && zombie.userData.attackTimer <= 0) {
      zombie.userData.attackTimer = 1.15;
      damagePlayer(9);
    }
  }

  zombieSpawnTimer -= delta;
  if (zombieSpawnTimer <= 0 && zombies.length < 14) {
    const angle = Math.random() * Math.PI * 2;
    const distance = THREE.MathUtils.randFloat(32, 52);
    const x = THREE.MathUtils.clamp(camera.position.x + Math.cos(angle) * distance, -70, 70);
    const z = THREE.MathUtils.clamp(camera.position.z + Math.sin(angle) * distance, -70, 70);
    createZombie(x, z);
    zombieSpawnTimer = THREE.MathUtils.randFloat(14, 22);
  }
}

function animateObjects(delta) {
  pickups.forEach((item, index) => {
    item.rotation.y += delta * 1.4;
    item.position.y = item.userData.baseY + Math.sin(elapsed * 2.5 + index) * 0.12;
  });
  const moving = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD
    || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
  const walkX = controls.isLocked && moving ? Math.sin(elapsed * 9) * 0.018 : 0;
  const walkY = controls.isLocked && moving ? Math.abs(Math.cos(elapsed * 9)) * 0.016 : 0;
  if (itemAction > 0) {
    const progress = 1 - itemAction;
    const swing = Math.sin(progress * Math.PI);
    viewModel.rotation.set(-swing * 0.65, swing * 0.2, -swing * 0.5);
    viewModel.position.set(0.64 - swing * 0.18, -0.64 + swing * 0.12, -1.05 + swing * 0.18);
    itemAction = Math.max(0, itemAction - delta * 3.6);
  } else {
    viewModel.rotation.x *= 0.78;
    viewModel.rotation.y *= 0.78;
    viewModel.rotation.z *= 0.78;
    viewModel.position.x = THREE.MathUtils.lerp(viewModel.position.x, 0.64 + walkX, 0.18);
    viewModel.position.y = THREE.MathUtils.lerp(viewModel.position.y, -0.64 + walkY, 0.18);
    viewModel.position.z = THREE.MathUtils.lerp(viewModel.position.z, -1.05, 0.18);
  }
}

function endGame() {
  gameEnded = true;
  controls.unlock();
  hud.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
  document.querySelector("#final-score").textContent = `Voce sobreviveu por ${Math.floor(elapsed)} segundos.`;
}

function startGame() {
  gameStarted = true;
  menu.classList.add("hidden");
  hud.classList.remove("hidden");
  controls.lock();
}

function resetGame() {
  location.reload();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (gameStarted && !gameEnded && controls.isLocked) elapsed += delta;
  attackCooldown = Math.max(0, attackCooldown - delta);
  messageTimer -= delta;
  if (messageTimer <= 0) messageEl.style.opacity = 0;
  updatePlayer(delta);
  updateZombies(delta);
  animateObjects(delta);
  updateTarget();
  updateHud();
  renderer.render(scene, camera);
}

document.querySelector("#play-button").addEventListener("click", startGame);
document.querySelector("#restart-button").addEventListener("click", resetGame);
renderer.domElement.addEventListener("click", () => {
  if (gameStarted && !gameEnded && !controls.isLocked) controls.lock();
  else attack();
});

document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys[event.code] = true;
  if (/^Digit[1-5]$/.test(event.code)) {
    state.selected = Number(event.code.slice(-1)) - 1;
    renderHotbar();
  }
  if (event.code === "KeyE" && currentTarget?.object.userData.type === "pickup" && currentTarget.distance <= 3.4) {
    collectPickup(currentTarget.object);
  }
  if (event.code === "KeyF") useSelected();
});

document.addEventListener("keyup", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys[event.code] = false;
});

controls.addEventListener("unlock", () => {
  if (gameStarted && !gameEnded) {
    menu.classList.remove("hidden");
    menu.querySelector(".eyebrow").textContent = "JOGO PAUSADO";
    document.querySelector("#play-button").textContent = "CONTINUAR";
  }
});

controls.addEventListener("lock", () => {
  if (gameStarted) menu.classList.add("hidden");
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

addLights();
createTerrain();
populateWorld();
createViewModel();
renderHotbar();
updateHud();
animate();
