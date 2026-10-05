// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// COMPLETE APP.JS
// 3D TANK SURVIVAL GAME
//
// FIXES:
// - Alle knoppen werken
// - Camera blijft achter de tank
// - Muis draait alleen het kanon
// - Kanon clitcht niet meer
// - Correct schieten
// - Muren blokkeren kogels
// - Vijanden kunnen niet door muren schieten
// - Tank collision
// - Save / Load
// - Achievements
// - Shop
// - Pause
// - New Run
// ============================================================


// ============================================================
// THREE.JS LADEN
// ============================================================

let THREE;

try {
    THREE = await import(
        "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
    );
} catch (error) {
    document.body.innerHTML = `
        <div style="
            color:white;
            background:#080b10;
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:Arial;
            text-align:center;
            padding:30px;
        ">
            <div>
                <h1>EchoBound kan Three.js niet laden</h1>
                <p>Controleer je internetverbinding en laad de pagina opnieuw.</p>
                <p>${error}</p>
            </div>
        </div>
    `;
    throw error;
}


// ============================================================
// BASIS ELEMENTEN
// ============================================================

const canvas = document.getElementById("game");

if (!canvas) {
    document.body.innerHTML = `
        <div style="
            color:white;
            background:#080b10;
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:Arial;
            text-align:center;
        ">
            <div>
                <h1>EchoBound</h1>
                <p>Canvas met id="game" ontbreekt in index.html.</p>
            </div>
        </div>
    `;

    throw new Error("Canvas #game ontbreekt.");
}

const ctx2d = canvas.getContext("2d");


// ============================================================
// DOM HELPERS
// ============================================================

function getElement(id) {
    return document.getElementById(id);
}

function findButtonByText(words) {
    const buttons = [...document.querySelectorAll("button")];

    return buttons.find(button => {
        const text = button.textContent
            .trim()
            .toLowerCase();

        return words.some(word =>
            text.includes(word.toLowerCase())
        );
    }) || null;
}

function getOrCreateButton(id, words, text, parent) {

    let button = getElement(id);

    if (button) {
        return button;
    }

    button = findButtonByText(words);

    if (button) {
        button.id = id;
        return button;
    }

    button = document.createElement("button");
    button.id = id;
    button.textContent = text;

    button.style.cursor = "pointer";

    if (parent) {
        parent.appendChild(button);
    } else {
        document.body.appendChild(button);
    }

    return button;
}


// ============================================================
// UI ELEMENTEN
// ============================================================

const menu =
    getElement("menu") ||
    document.querySelector(".menu");

const hud =
    getElement("hud") ||
    document.querySelector(".hud");

const pauseScreen =
    getElement("pause") ||
    document.querySelector(".pause");

const achievementScreen =
    getElement("achievement") ||
    document.querySelector(".achievement");

const mapScreen =
    getElement("map") ||
    document.querySelector(".map");


// ============================================================
// MENU KNOPPEN
// ============================================================

const newGameButton = getOrCreateButton(
    "newGame",
    ["new run", "new game", "start"],
    "NEW RUN",
    menu
);

const loadGameButton = getOrCreateButton(
    "loadGame",
    ["load game", "load", "laden"],
    "LOAD GAME",
    menu
);

const achievementsButton = getOrCreateButton(
    "achievementsButton",
    ["achievements", "achievement"],
    "ACHIEVEMENTS",
    menu
);

const controlsButton = getOrCreateButton(
    "controlsButton",
    ["controls", "besturing", "how to play"],
    "CONTROLS",
    menu
);


// ============================================================
// PAUSE KNOPPEN
// ============================================================

const resumeButton = getOrCreateButton(
    "resume",
    ["resume", "continue", "doorgaan"],
    "RESUME",
    pauseScreen
);

const saveButton = getOrCreateButton(
    "save",
    ["save", "opslaan"],
    "SAVE",
    pauseScreen
);

const quitButton = getOrCreateButton(
    "quit",
    ["quit", "menu", "quit to menu"],
    "QUIT TO MENU",
    pauseScreen
);


// ============================================================
// MAP
// ============================================================

const closeMapButton = getOrCreateButton(
    "closeMap",
    ["close map", "close", "sluiten"],
    "CLOSE MAP",
    mapScreen
);


// ============================================================
// HUD
// ============================================================

const healthBar = getElement("healthBar");
const energyBar = getElement("energyBar");
const ammoText = getElement("ammo");
const killsText = getElement("kills");
const creditsText = getElement("credits");
const zoneText = getElement("zone");
const objectiveText = getElement("objective");


// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;
let paused = false;
let gameOver = false;

let shopOpen = false;

let kills = 0;
let credits = 0;

let health = 100;
let maxHealth = 100;

let energy = 100;
let maxEnergy = 100;

let ammo = 12;
let maxAmmo = 12;

let weaponDamage = 20;

let tankSpeed = 9;

let elapsedTime = 0;

let achievementState = {
    firstEcho: false,
    signalDefender: false,
    explorer: false,
    lostSignal: false
};


// ============================================================
// SCENE
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x081017);

scene.fog = new THREE.Fog(
    0x081017,
    80,
    420
);


// ============================================================
// CAMERA
// ============================================================

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(
    0,
    10,
    18
);


// ============================================================
// RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;


// ============================================================
// LIGHTING
// ============================================================

const ambientLight =
    new THREE.HemisphereLight(
        0x8bb7d8,
        0x182019,
        1.7
    );

scene.add(ambientLight);


const sun =
    new THREE.DirectionalLight(
        0xffffff,
        2.1
    );

sun.position.set(
    80,
    140,
    50
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

sun.shadow.camera.left = -220;
sun.shadow.camera.right = 220;
sun.shadow.camera.top = 220;
sun.shadow.camera.bottom = -220;

scene.add(sun);


// ============================================================
// WORLD
// ============================================================

const WORLD_SIZE = 360;

const collisionObjects = [];
const buildings = [];
const enemies = [];
const bullets = [];


// ============================================================
// GROUND
// ============================================================

const groundGeometry =
    new THREE.PlaneGeometry(
        WORLD_SIZE,
        WORLD_SIZE,
        32,
        32
    );

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x27362e,
        roughness: 0.95,
        metalness: 0.02
    });

const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);


// ============================================================
// GROUND GRID / SIGNAL LINES
// ============================================================

const gridHelper =
    new THREE.GridHelper(
        WORLD_SIZE,
        36,
        0x354c4c,
        0x1d2c2b
    );

gridHelper.position.y = 0.03;

scene.add(gridHelper);


// ============================================================
// RANDOM GROUND DETAILS
// ============================================================

function createGroundDetails() {

    for (let i = 0; i < 180; i++) {

        const geometry =
            new THREE.CylinderGeometry(
                0.08,
                0.18,
                0.12,
                5
            );

        const material =
            new THREE.MeshStandardMaterial({
                color: 0x4b594e
            });

        const rock =
            new THREE.Mesh(
                geometry,
                material
            );

        rock.position.set(
            THREE.MathUtils.randFloatSpread(WORLD_SIZE - 10),
            0.08,
            THREE.MathUtils.randFloatSpread(WORLD_SIZE - 10)
        );

        rock.rotation.y =
            Math.random() * Math.PI;

        rock.castShadow = true;

        scene.add(rock);
    }


    for (let i = 0; i < 120; i++) {

        const geometry =
            new THREE.ConeGeometry(
                0.15,
                0.5,
                5
            );

        const material =
            new THREE.MeshStandardMaterial({
                color: 0x405e48
            });

        const plant =
            new THREE.Mesh(
                geometry,
                material
            );

        plant.position.set(
            THREE.MathUtils.randFloatSpread(WORLD_SIZE - 10),
            0.25,
            THREE.MathUtils.randFloatSpread(WORLD_SIZE - 10)
        );

        scene.add(plant);
    }
}

createGroundDetails();


// ============================================================
// BUILDING COLLISION
// ============================================================

function createBuilding(
    x,
    z,
    width,
    depth,
    height = 5
) {

    const group =
        new THREE.Group();

    group.position.set(
        x,
        0,
        z
    );


    const bodyGeometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );

    const bodyMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x34434a,
            roughness: 0.8,
            metalness: 0.2
        });

    const body =
        new THREE.Mesh(
            bodyGeometry,
            bodyMaterial
        );

    body.position.y =
        height / 2;

    body.castShadow = true;
    body.receiveShadow = true;

    group.add(body);


    const roofGeometry =
        new THREE.BoxGeometry(
            width + 0.4,
            0.5,
            depth + 0.4
        );

    const roofMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x1a2429,
            roughness: 0.7,
            metalness: 0.3
        });

    const roof =
        new THREE.Mesh(
            roofGeometry,
            roofMaterial
        );

    roof.position.y =
        height + 0.25;

    roof.castShadow = true;

    group.add(roof);


    // lichtpanelen
    for (
        let px = -width / 2 + 1;
        px < width / 2;
        px += 2
    ) {

        const windowGeometry =
            new THREE.BoxGeometry(
                0.8,
                0.8,
                0.08
            );

        const windowMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x4bc4d9,
                emissive: 0x176878,
                emissiveIntensity: 1.4
            });

        const window =
            new THREE.Mesh(
                windowGeometry,
                windowMaterial
            );

        window.position.set(
            px,
            2.3,
            -depth / 2 - 0.06
        );

        group.add(window);
    }


    scene.add(group);

    buildings.push({
        mesh: group,
        x,
        z,
        width,
        depth,
        height
    });

    collisionObjects.push({
        type: "box",
        x,
        z,
        width,
        depth
    });

    return group;
}


// ============================================================
// BUILDINGS
// ============================================================

createBuilding(-75, -65, 35, 28, 7);
createBuilding(45, -75, 42, 30, 8);
createBuilding(85, 15, 30, 42, 6);
createBuilding(-70, 55, 38, 34, 7);
createBuilding(10, 85, 52, 28, 9);
createBuilding(-105, 5, 26, 38, 6);
createBuilding(115, -105, 30, 30, 7);
createBuilding(-125, -110, 40, 26, 7);


// ============================================================
// WALLS
// ============================================================

function createWall(x, z, width, depth) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            3,
            depth
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x253239,
            roughness: 0.9,
            metalness: 0.15
        });

    const wall =
        new THREE.Mesh(
            geometry,
            material
        );

    wall.position.set(
        x,
        1.5,
        z
    );

    wall.castShadow = true;
    wall.receiveShadow = true;

    scene.add(wall);

    collisionObjects.push({
        type: "box",
        x,
        z,
        width,
        depth
    });
}


// perimeter
createWall(0, -170, 340, 4);
createWall(0, 170, 340, 4);
createWall(-170, 0, 4, 340);
createWall(170, 0, 4, 340);


// extra walls
createWall(-30, -20, 40, 3);
createWall(30, 25, 45, 3);
createWall(-25, 105, 3, 35);
createWall(65, 65, 3, 40);


// ============================================================
// SIGNAL TOWER
// ============================================================

const signalTower =
    new THREE.Group();

signalTower.position.set(
    0,
    0,
    -130
);


const towerBase =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            6,
            7,
            3,
            12
        ),
        new THREE.MeshStandardMaterial({
            color: 0x273940,
            metalness: 0.6,
            roughness: 0.45
        })
    );

towerBase.position.y = 1.5;

towerBase.castShadow = true;

signalTower.add(towerBase);


const towerPole =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            1.1,
            1.5,
            22,
            10
        ),
        new THREE.MeshStandardMaterial({
            color: 0x596b72,
            metalness: 0.8,
            roughness: 0.3
        })
    );

towerPole.position.y = 13;

towerPole.castShadow = true;

signalTower.add(towerPole);


const signalOrb =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            2.5,
            20,
            20
        ),
        new THREE.MeshStandardMaterial({
            color: 0x44e5ff,
            emissive: 0x16b6d1,
            emissiveIntensity: 4
        })
    );

signalOrb.position.y = 25;

signalTower.add(signalOrb);


const signalLight =
    new THREE.PointLight(
        0x31ddff,
        12,
        70
    );

signalLight.position.y = 25;

signalTower.add(signalLight);

scene.add(signalTower);


// ============================================================
// TANK
// ============================================================

const tank =
    new THREE.Group();

tank.position.set(
    0,
    0,
    45
);

scene.add(tank);


// ============================================================
// TANK BODY
// ============================================================

const tankBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            5.5,
            1.8,
            7.5
        ),
        new THREE.MeshStandardMaterial({
            color: 0x3d5961,
            roughness: 0.5,
            metalness: 0.7
        })
    );

tankBody.position.y = 1.5;

tankBody.castShadow = true;
tankBody.receiveShadow = true;

tank.add(tankBody);


// ============================================================
// TANK LOWER BODY
// ============================================================

const tankLower =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            6.2,
            1.2,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x182328,
            roughness: 0.8,
            metalness: 0.4
        })
    );

tankLower.position.y = 0.8;

tankLower.castShadow = true;

tank.add(tankLower);


// ============================================================
// TANK TRACKS
// ============================================================

function createTrack(x) {

    const track =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.25,
                1.45,
                7.5
            ),
            new THREE.MeshStandardMaterial({
                color: 0x11171a,
                roughness: 0.95,
                metalness: 0.25
            })
        );

    track.position.set(
        x,
        0.9,
        0
    );

    track.castShadow = true;

    tank.add(track);


    // wielen
    for (let i = -2.4; i <= 2.4; i += 1.2) {

        const wheel =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.45,
                    0.45,
                    1.4,
                    12
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x293337,
                    metalness: 0.6,
                    roughness: 0.5
                })
            );

        wheel.rotation.z =
            Math.PI / 2;

        wheel.position.set(
            x,
            0.9,
            i
        );

        wheel.castShadow = true;

        tank.add(wheel);
    }
}

createTrack(-3.1);
createTrack(3.1);


// ============================================================
// TURRET
// ============================================================

// Belangrijk:
// De turret is child van de tank.
// Daardoor draait de camera NIET mee met de turret.

const turret =
    new THREE.Group();

turret.position.set(
    0,
    2.9,
    -0.3
);

tank.add(turret);


// ============================================================
// TURRET BASE
// ============================================================

const turretBase =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            2.5,
            2.7,
            1,
            12
        ),
        new THREE.MeshStandardMaterial({
            color: 0x506a70,
            roughness: 0.45,
            metalness: 0.75
        })
    );

turretBase.position.y = 0;

turretBase.castShadow = true;

turret.add(turretBase);


// ============================================================
// TURRET BODY
// ============================================================

const turretBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4.2,
            1.5,
            4
        ),
        new THREE.MeshStandardMaterial({
            color: 0x466067,
            roughness: 0.45,
            metalness: 0.7
        })
    );

turretBody.position.y = 0.8;

turretBody.castShadow = true;

turret.add(turretBody);


// ============================================================
// CANNON MOUNT
// ============================================================

const cannonMount =
    new THREE.Group();

cannonMount.position.set(
    0,
    1.0,
    -1.5
);

turret.add(cannonMount);


// ============================================================
// CANNON
// ============================================================

const cannon =
    new THREE.Group();

cannon.position.set(
    0,
    0,
    0
);

cannonMount.add(cannon);


// ============================================================
// CANNON BARREL
// ============================================================

const barrel =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.42,
            0.55,
            6.5,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x1b272c,
            roughness: 0.35,
            metalness: 0.85
        })
    );

// Cylinder staat standaard verticaal.
// We draaien hem naar voren over de Z-as.
barrel.rotation.x =
    Math.PI / 2;

// Center ligt naar voren.
barrel.position.z =
    -3.0;

barrel.castShadow = true;

cannon.add(barrel);


// ============================================================
// CANNON TIP
// ============================================================

const cannonTip =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.55,
            0.45,
            0.8,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x11191d,
            metalness: 0.9,
            roughness: 0.25
        })
    );

cannonTip.rotation.x =
    Math.PI / 2;

cannonTip.position.z =
    -6.25;

cannon.add(cannonTip);


// ============================================================
// MUZZLE LIGHT
// ============================================================

const muzzleLight =
    new THREE.PointLight(
        0x63eaff,
        0,
        15
    );

muzzleLight.position.z =
    -6.4;

cannon.add(muzzleLight);


// ============================================================
// TANK LICHTEN
// ============================================================

function createTankLight(x) {

    const light =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.65,
                0.35,
                0.15
            ),
            new THREE.MeshStandardMaterial({
                color: 0x66eaff,
                emissive: 0x38d9ff,
                emissiveIntensity: 2.5
            })
        );

    light.position.set(
        x,
        2.0,
        -3.75
    );

    tank.add(light);
}

createTankLight(-1.5);
createTankLight(1.5);


// ============================================================
// TANK STATE
// ============================================================

const tankState = {
    velocity: new THREE.Vector3(),
    targetYaw: 0
};


// ============================================================
// KEYBOARD
// ============================================================

const keys = {};

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "Space" &&
            !event.repeat
        ) {
            dash();
        }

        if (
            event.code === "KeyR" &&
            !event.repeat
        ) {
            reload();
        }

        if (
            event.code === "Escape"
        ) {
            if (shopOpen) {
                closeShop();
            } else if (gameRunning) {
                togglePause();
            }
        }

        if (
            event.code === "KeyM" &&
            !event.repeat
        ) {
            toggleMap();
        }

    }
);

window.addEventListener(
    "keyup",
    event => {
        keys[event.code] = false;
    }
);


// ============================================================
// MOUSE
// ============================================================

const mouse = new THREE.Vector2();

const raycaster =
    new THREE.Raycaster();

const aimPlane =
    new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        0
    );

const aimPoint =
    new THREE.Vector3();

let mouseDown = false;

window.addEventListener(
    "mousemove",
    event => {

        mouse.x =
            (event.clientX /
                window.innerWidth) * 2 - 1;

        mouse.y =
            -(event.clientY /
                window.innerHeight) * 2 + 1;

    }
);


window.addEventListener(
    "mousedown",
    event => {

        if (event.button === 0) {

            mouseDown = true;

            if (
                gameRunning &&
                !paused &&
                !gameOver &&
                !shopOpen
            ) {
                shoot();
            }
        }

    }
);


window.addEventListener(
    "mouseup",
    event => {

        if (event.button === 0) {
            mouseDown = false;
        }

    }
);


// ============================================================
// AANWIJZEN VAN HET KANON
// ============================================================

function aimCannon() {

    if (!gameRunning) return;
    if (paused) return;
    if (gameOver) return;
    if (shopOpen) return;


    // Muis -> camera ray
    raycaster.setFromCamera(
        mouse,
        camera
    );


    // Ray raakt de grond
    const hit =
        raycaster.ray.intersectPlane(
            aimPlane,
            aimPoint
        );

    if (!hit) return;


    // Richting vanaf tank naar muispunt
    const dx =
        aimPoint.x -
        tank.position.x;

    const dz =
        aimPoint.z -
        tank.position.z;


    if (
        Math.abs(dx) < 0.001 &&
        Math.abs(dz) < 0.001
    ) {
        return;
    }


    // Wereldrotatie
    const worldYaw =
        Math.atan2(
            -dx,
            -dz
        );


    // Tankrotatie aftrekken.
    // Hierdoor draait ALLEEN de turret.
    let localYaw =
        worldYaw -
        tank.rotation.y;


    // Hoek netjes tussen -PI en PI
    localYaw =
        Math.atan2(
            Math.sin(localYaw),
            Math.cos(localYaw)
        );


    // Turret draait rustig naar de target
    const current =
        turret.rotation.y;

    const difference =
        Math.atan2(
            Math.sin(localYaw - current),
            Math.cos(localYaw - current)
        );


    turret.rotation.y +=
        difference * 0.22;
}


// ============================================================
// CAMERA ACHTER DE TANK
// ============================================================

function updateCamera() {

    if (!tank) return;


    // Dit is een vaste offset achter de tank.
    // Omdat dit van tank.quaternion wordt afgeleid,
    // blijft de camera altijd achter de TANK.
    //
    // De turret zit NIET in deze berekening.
    const cameraOffset =
        new THREE.Vector3(
            0,
            10,
            19
        );


    cameraOffset.applyQuaternion(
        tank.quaternion
    );


    const targetPosition =
        tank.position.clone()
            .add(cameraOffset);


    camera.position.lerp(
        targetPosition,
        0.12
    );


    const lookTarget =
        tank.position.clone();

    lookTarget.y += 2.5;


    camera.lookAt(
        lookTarget
    );
}


// ============================================================
// TANK MOVEMENT
// ============================================================

function updateTank(delta) {

    if (!gameRunning) return;
    if (paused) return;
    if (gameOver) return;
    if (shopOpen) return;


    let forward = 0;
    let side = 0;


    if (
        keys["KeyW"] ||
        keys["ArrowUp"]
    ) {
        forward += 1;
    }

    if (
        keys["KeyS"] ||
        keys["ArrowDown"]
    ) {
        forward -= 1;
    }

    if (
        keys["KeyA"] ||
        keys["ArrowLeft"]
    ) {
        side += 1;
    }

    if (
        keys["KeyD"] ||
        keys["ArrowRight"]
    ) {
        side -= 1;
    }


    if (
        forward === 0 &&
        side === 0
    ) {
        tankState.velocity.multiplyScalar(
            Math.pow(0.05, delta)
        );

        return;
    }


    const direction =
        new THREE.Vector3(
            side,
            0,
            -forward
        );


    if (
        direction.lengthSq() > 0
    ) {
        direction.normalize();
    }


    // Richting naar wereld
    const worldDirection =
        direction.clone();


    // tank draait naar movement
    const targetRotation =
        Math.atan2(
            worldDirection.x,
            worldDirection.z
        );


    const currentRotation =
        tank.rotation.y;


    const angleDifference =
        Math.atan2(
            Math.sin(
                targetRotation -
                currentRotation
            ),
            Math.cos(
                targetRotation -
                currentRotation
            )
        );


    tank.rotation.y +=
        angleDifference *
        Math.min(
            1,
            delta * 8
        );


    const speed =
        keys["ShiftLeft"] ||
        keys["ShiftRight"]
            ? tankSpeed * 1.45
            : tankSpeed;


    const movement =
        worldDirection
            .multiplyScalar(
                speed * delta
            );


    moveTankWithCollision(
        movement
    );


    // energie
    if (
        keys["ShiftLeft"] ||
        keys["ShiftRight"]
    ) {

        energy -=
            12 * delta;

        if (energy < 0) {
            energy = 0;
        }

    } else {

        energy +=
            7 * delta;

        if (energy > maxEnergy) {
            energy = maxEnergy;
        }
    }
}


// ============================================================
// TANK COLLISION
// ============================================================

function isInsideBox(
    x,
    z,
    box,
    radius
) {

    const minX =
        box.x -
        box.width / 2 -
        radius;

    const maxX =
        box.x +
        box.width / 2 +
        radius;

    const minZ =
        box.z -
        box.depth / 2 -
        radius;

    const maxZ =
        box.z +
        box.depth / 2 +
        radius;


    return (
        x >= minX &&
        x <= maxX &&
        z >= minZ &&
        z <= maxZ
    );
}


function canTankMoveTo(
    x,
    z
) {

    const radius = 3.4;


    // wereldgrenzen
    if (
        x < -165 ||
        x > 165 ||
        z < -165 ||
        z > 165
    ) {
        return false;
    }


    for (
        const box of collisionObjects
    ) {

        if (
            isInsideBox(
                x,
                z,
                box,
                radius
            )
        ) {
            return false;
        }
    }


    return true;
}


function moveTankWithCollision(
    movement
) {

    const nextX =
        tank.position.x +
        movement.x;

    const nextZ =
        tank.position.z +
        movement.z;


    if (
        canTankMoveTo(
            nextX,
            tank.position.z
        )
    ) {
        tank.position.x =
            nextX;
    }


    if (
        canTankMoveTo(
            tank.position.x,
            nextZ
        )
    ) {
        tank.position.z =
            nextZ;
    }
}


// ============================================================
// DASH
// ============================================================

let dashCooldown = 0;

function dash() {

    if (!gameRunning) return;
    if (paused) return;
    if (gameOver) return;
    if (shopOpen) return;

    if (dashCooldown > 0) return;

    if (energy < 25) return;


    energy -= 25;

    dashCooldown = 1.2;


    const direction =
        new THREE.Vector3(
            0,
            0,
            -1
        );

    direction.applyQuaternion(
        tank.quaternion
    );

    direction.normalize();


    moveTankWithCollision(
        direction.multiplyScalar(12)
    );
}


// ============================================================
// RELOAD
// ============================================================

let reloadTimer = 0;

function reload() {

    if (!gameRunning) return;
    if (paused) return;
    if (gameOver) return;
    if (shopOpen) return;

    if (reloadTimer > 0) return;

    if (ammo >= maxAmmo) return;

    reloadTimer = 1.2;
}


// ============================================================
// SCHIETEN
// ============================================================

let shootCooldown = 0;

function shoot() {

    if (!gameRunning) return;
    if (paused) return;
    if (gameOver) return;
    if (shopOpen) return;

    if (reloadTimer > 0) return;

    if (shootCooldown > 0) return;

    if (ammo <= 0) {
        reload();
        return;
    }


    ammo--;

    shootCooldown = 0.35;


    // World quaternion van het kanon
    const cannonQuaternion =
        cannon.getWorldQuaternion(
            new THREE.Quaternion()
        );


    // -Z is de voorkant van het kanon
    const direction =
        new THREE.Vector3(
            0,
            0,
            -1
        );

    direction.applyQuaternion(
        cannonQuaternion
    );

    direction.normalize();


    // Beginpunt van de kogel
    const start =
        cannon.getWorldPosition(
            new THREE.Vector3()
        );


    start.add(
        direction
            .clone()
            .multiplyScalar(5.8)
    );


    createBullet(
        start,
        direction
    );


    // muzzle flash
    muzzleLight.intensity = 9;

    setTimeout(
        () => {
            muzzleLight.intensity = 0;
        },
        70
    );
}


// ============================================================
// BULLET
// ============================================================

function createBullet(
    position,
    direction
) {

    const geometry =
        new THREE.SphereGeometry(
            0.22,
            10,
            10
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x8cecff,
            emissive: 0x28d7ff,
            emissiveIntensity: 4
        });

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.copy(
        position
    );

    scene.add(mesh);


    bullets.push({
        mesh,
        velocity:
            direction
                .clone()
                .multiplyScalar(65),
        life: 2
    });
}


// ============================================================
// BULLET COLLISION
// ============================================================

function bulletHitsWall(
    position
) {

    for (
        const box of collisionObjects
    ) {

        const inside =
            position.x >=
                box.x -
                box.width / 2 &&
            position.x <=
                box.x +
                box.width / 2 &&
            position.z >=
                box.z -
                box.depth / 2 &&
            position.z <=
                box.z +
                box.depth / 2;


        if (inside) {
            return true;
        }
    }

    return false;
}


// ============================================================
// BULLET UPDATE
// ============================================================

function updateBullets(delta) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        bullet.mesh.position.add(
            bullet.velocity
                .clone()
                .multiplyScalar(delta)
        );


        bullet.life -= delta;


        // muur
        if (
            bulletHitsWall(
                bullet.mesh.position
            )
        ) {

            scene.remove(
                bullet.mesh
            );

            bullets.splice(i, 1);

            continue;
        }


        // wereldgrens
        if (
            Math.abs(
                bullet.mesh.position.x
            ) > 180 ||
            Math.abs(
                bullet.mesh.position.z
            ) > 180
        ) {

            scene.remove(
                bullet.mesh
            );

            bullets.splice(i, 1);

            continue;
        }


        // vijanden
        let hitEnemy = false;


        for (
            let e = enemies.length - 1;
            e >= 0;
            e--
        ) {

            const enemy =
                enemies[e];


            const distance =
                bullet.mesh.position
                    .distanceTo(
                        enemy.group.position
                    );


            if (distance < 2.8) {

                enemy.health -=
                    weaponDamage;

                hitEnemy = true;


                if (
                    enemy.health <= 0
                ) {
                    destroyEnemy(e);
                }

                break;
            }
        }


        if (
            hitEnemy ||
            bullet.life <= 0
        ) {

            scene.remove(
                bullet.mesh
            );

            bullets.splice(i, 1);
        }
    }
}


// ============================================================
// ENEMIES
// ============================================================

function createEnemy(
    x,
    z,
    type = "guardian"
) {

    const group =
        new THREE.Group();

    group.position.set(
        x,
        0,
        z
    );


    // lichaam
    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.6,
                2.8,
                2.6
            ),
            new THREE.MeshStandardMaterial({
                color:
                    type === "crawler"
                        ? 0x8c5a46
                        : 0x7a506f,
                roughness: 0.65,
                metalness: 0.35
            })
        );

    body.position.y = 1.5;

    body.castShadow = true;

    group.add(body);


    // hoofd
    const head =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                1.1,
                12,
                12
            ),
            new THREE.MeshStandardMaterial({
                color: 0x28383d,
                roughness: 0.6,
                metalness: 0.4
            })
        );

    head.position.y = 3.3;

    head.castShadow = true;

    group.add(head);


    // lichtogen
    const eye =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.1,
                0.18,
                0.18
            ),
            new THREE.MeshStandardMaterial({
                color: 0xff6bdb,
                emissive: 0xff249f,
                emissiveIntensity: 4
            })
        );

    eye.position.set(
        0,
        3.35,
        -1
    );

    group.add(eye);


    scene.add(group);


    const enemy = {

        group,

        type,

        health:
            type === "crawler"
                ? 35
                : 55,

        maxHealth:
            type === "crawler"
                ? 35
                : 55,

        speed:
            type === "crawler"
                ? 4.8
                : 2.8,

        attackCooldown: 0,

        attackRange:
            type === "crawler"
                ? 4
                : 14

    };


    enemies.push(enemy);

    return enemy;
}


// ============================================================
// ENEMIES SPAWNEN
// ============================================================

function spawnInitialEnemies() {

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        let x;
        let z;

        do {

            x =
                THREE.MathUtils.randFloat(
                    -145,
                    145
                );

            z =
                THREE.MathUtils.randFloat(
                    -145,
                    145
                );

        } while (
            Math.hypot(
                x - tank.position.x,
                z - tank.position.z
            ) < 55 ||
            !canEnemyMoveTo(x, z)
        );


        createEnemy(
            x,
            z,
            Math.random() > 0.7
                ? "crawler"
                : "guardian"
        );
    }
}


// ============================================================
// ENEMY COLLISION
// ============================================================

function canEnemyMoveTo(
    x,
    z
) {

    if (
        x < -160 ||
        x > 160 ||
        z < -160 ||
        z > 160
    ) {
        return false;
    }


    for (
        const box of collisionObjects
    ) {

        if (
            isInsideBox(
                x,
                z,
                box,
                1.8
            )
        ) {
            return false;
        }
    }


    return true;
}


// ============================================================
// LINE OF SIGHT
// ============================================================

function hasLineOfSight(
    enemyPosition,
    targetPosition
) {

    const direction =
        targetPosition
            .clone()
            .sub(enemyPosition);

    const distance =
        direction.length();

    direction.normalize();


    const ray =
        new THREE.Raycaster(
            enemyPosition.clone()
                .add(
                    new THREE.Vector3(
                        0,
                        2,
                        0
                    )
                ),
            direction,
            0,
            distance
        );


    const meshes = [];


    for (
        const building of buildings
    ) {

        building.mesh
            .traverse(
                object => {

                    if (
                        object.isMesh
                    ) {
                        meshes.push(
                            object
                        );
                    }
                }
            );
    }


    const hits =
        ray.intersectObjects(
            meshes,
            true
        );


    return hits.length === 0;
}


// ============================================================
// ENEMY UPDATE
// ============================================================

function updateEnemies(delta) {

    if (!gameRunning) return;
    if (paused) return;
    if (gameOver) return;
    if (shopOpen) return;


    for (
        const enemy of enemies
    ) {

        enemy.attackCooldown -=
            delta;


        const direction =
            tank.position
                .clone()
                .sub(enemy.group.position);

        const distance =
            direction.length();


        if (distance < 0.01) {
            continue;
        }


        direction.normalize();


        // enemy kijkt naar tank
        enemy.group.rotation.y =
            Math.atan2(
                direction.x,
                direction.z
            );


        if (
            distance >
            enemy.attackRange
        ) {

            const movement =
                direction
                    .clone()
                    .multiplyScalar(
                        enemy.speed *
                        delta
                    );


            const nextX =
                enemy.group.position.x +
                movement.x;

            const nextZ =
                enemy.group.position.z +
                movement.z;


            if (
                canEnemyMoveTo(
                    nextX,
                    enemy.group.position.z
                )
            ) {

                enemy.group.position.x =
                    nextX;
            }


            if (
                canEnemyMoveTo(
                    enemy.group.position.x,
                    nextZ
                )
            ) {

                enemy.group.position.z =
                    nextZ;
            }

        } else {

            // alleen aanvallen als er GEEN muur tussen zit
            if (
                hasLineOfSight(
                    enemy.group.position,
                    tank.position
                )
            ) {

                if (
                    enemy.attackCooldown <= 0
                ) {

                    health -=
                        enemy.type === "crawler"
                            ? 8
                            : 5;

                    enemy.attackCooldown =
                        1.3;

                    if (
                        health <= 0
                    ) {
                        health = 0;
                        triggerGameOver();
                    }
                }
            }
        }
    }
}


// ============================================================
// ENEMY DESTROY
// ============================================================

function destroyEnemy(index) {

    const enemy =
        enemies[index];


    scene.remove(
        enemy.group
    );


    enemies.splice(
        index,
        1
    );


    kills++;

    credits += 10;


    if (
        kills >= 1
    ) {
        unlockAchievement(
            "firstEcho"
        );
    }


    if (
        kills >= 10
    ) {
        unlockAchievement(
            "signalDefender"
        );
    }
}


// ============================================================
// ENEMY RESPAWN
// ============================================================

let enemySpawnTimer = 0;

function updateEnemySpawning(delta) {

    enemySpawnTimer -= delta;

    if (
        enemySpawnTimer > 0
    ) {
        return;
    }


    enemySpawnTimer = 4;


    if (
        enemies.length >= 12
    ) {
        return;
    }


    let x;
    let z;


    for (
        let attempt = 0;
        attempt < 30;
        attempt++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;

        const distance =
            THREE.MathUtils.randFloat(
                55,
                110
            );


        x =
            tank.position.x +
            Math.cos(angle) *
            distance;

        z =
            tank.position.z +
            Math.sin(angle) *
            distance;


        if (
            canEnemyMoveTo(
                x,
                z
            )
        ) {
            break;
        }
    }


    if (
        canEnemyMoveTo(
            x,
            z
        )
    ) {

        createEnemy(
            x,
            z,
            Math.random() > 0.75
                ? "crawler"
                : "guardian"
        );
    }
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

const achievementDefinitions = {

    firstEcho: {
        name: "FIRST ECHO",
        description: "Versla je eerste vijand."
    },

    signalDefender: {
        name: "SIGNAL DEFENDER",
        description: "Versla 10 vijanden."
    },

    explorer: {
        name: "EXPLORER",
        description: "Ga ver weg van je startgebied."
    },

    lostSignal: {
        name: "THE LOST SIGNAL",
        description: "Bereik de mysterieuze signaaltoren."
    }

};


function unlockAchievement(
    id
) {

    if (
        achievementState[id]
    ) {
        return;
    }


    achievementState[id] = true;

    showAchievementToast(
        achievementDefinitions[id].name
    );
}


function showAchievementToast(
    name
) {

    const toast =
        document.createElement("div");

    toast.textContent =
        "ACHIEVEMENT UNLOCKED: " +
        name;

    toast.style.position =
        "fixed";

    toast.style.top =
        "30px";

    toast.style.left =
        "50%";

    toast.style.transform =
        "translateX(-50%)";

    toast.style.zIndex =
        "99999";

    toast.style.padding =
        "16px 25px";

    toast.style.border =
        "1px solid #4fe7ff";

    toast.style.background =
        "rgba(5,15,20,0.95)";

    toast.style.color =
        "#7eefff";

    toast.style.fontFamily =
        "Arial, sans-serif";

    toast.style.fontWeight =
        "bold";

    toast.style.boxShadow =
        "0 0 25px rgba(50,220,255,0.35)";

    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {
            toast.remove();
        },
        2800
    );
}


// ============================================================
// ACHIEVEMENT SCREEN
// ============================================================

function openAchievements() {

    paused = true;

    if (
        !achievementScreen
    ) {

        createAchievementScreen();

    } else {

        achievementScreen.style.display =
            "flex";
    }


    renderAchievements();
}


function createAchievementScreen() {

    const screen =
        document.createElement("div");

    screen.id =
        "dynamicAchievements";

    screen.style.position =
        "fixed";

    screen.style.inset =
        "0";

    screen.style.zIndex =
        "9000";

    screen.style.background =
        "rgba(3,8,12,0.96)";

    screen.style.display =
        "flex";

    screen.style.alignItems =
        "center";

    screen.style.justifyContent =
        "center";

    screen.style.fontFamily =
        "Arial, sans-serif";


    screen.innerHTML = `
        <div style="
            width:min(700px,90vw);
            max-height:85vh;
            overflow:auto;
            background:#0d171d;
            border:1px solid #2f6b76;
            padding:30px;
            box-shadow:0 0 50px rgba(0,0,0,.7);
            color:white;
        ">
            <h1 style="
                margin-top:0;
                color:#6cecff;
                letter-spacing:3px;
            ">
                ACHIEVEMENTS
            </h1>

            <div id="achievementList"></div>

            <button
                id="dynamicAchievementClose"
                style="
                    margin-top:25px;
                    padding:12px 24px;
                    cursor:pointer;
                "
            >
                CLOSE
            </button>
        </div>
    `;


    document.body.appendChild(
        screen
    );


    document
        .getElementById(
            "dynamicAchievementClose"
        )
        .addEventListener(
            "click",
            () => {

                screen.style.display =
                    "none";

                if (
                    gameRunning
                ) {
                    paused = false;
                }
            }
        );
}


function renderAchievements() {

    const screen =
        getElement(
            "dynamicAchievements"
        );

    if (!screen) return;


    const list =
        getElement(
            "achievementList"
        );

    if (!list) return;


    list.innerHTML = "";


    for (
        const [id, data]
        of Object.entries(
            achievementDefinitions
        )
    ) {

        const unlocked =
            achievementState[id];


        const item =
            document.createElement("div");


        item.style.padding =
            "18px";

        item.style.marginBottom =
            "12px";

        item.style.border =
            unlocked
                ? "1px solid #39d8e9"
                : "1px solid #26343a";

        item.style.background =
            unlocked
                ? "rgba(24,92,105,.25)"
                : "rgba(20,25,28,.7)";

        item.style.opacity =
            unlocked
                ? "1"
                : "0.5";


        item.innerHTML = `
            <div style="
                font-weight:bold;
                font-size:18px;
                color:${
                    unlocked
                        ? "#6cecff"
                        : "#879298"
                };
            ">
                ${
                    unlocked
                        ? "✓ "
                        : "○ "
                }${data.name}
            </div>

            <div style="
                margin-top:6px;
                color:#b9c5ca;
            ">
                ${data.description}
            </div>
        `;


        list.appendChild(
            item
        );
    }
}


// ============================================================
// CONTROLS SCREEN
// ============================================================

function openControls() {

    paused = true;


    const existing =
        getElement(
            "dynamicControls"
        );


    if (existing) {

        existing.style.display =
            "flex";

        return;
    }


    const screen =
        document.createElement("div");

    screen.id =
        "dynamicControls";

    screen.style.position =
        "fixed";

    screen.style.inset =
        "0";

    screen.style.zIndex =
        "9000";

    screen.style.background =
        "rgba(3,8,12,0.96)";

    screen.style.display =
        "flex";

    screen.style.alignItems =
        "center";

    screen.style.justifyContent =
        "center";

    screen.style.fontFamily =
        "Arial, sans-serif";


    screen.innerHTML = `
        <div style="
            width:min(600px,90vw);
            background:#0d171d;
            border:1px solid #2f6b76;
            padding:30px;
            color:white;
            box-shadow:0 0 50px rgba(0,0,0,.7);
        ">

            <h1 style="
                color:#6cecff;
                letter-spacing:3px;
            ">
                CONTROLS
            </h1>

            <div style="
                line-height:2;
                color:#c8d3d7;
            ">
                <b>W A S D</b> — Move tank<br>
                <b>SHIFT</b> — Sprint<br>
                <b>SPACE</b> — Dash<br>
                <b>MOUSE</b> — Aim cannon<br>
                <b>LEFT CLICK</b> — Shoot<br>
                <b>R</b> — Reload<br>
                <b>M</b> — Map<br>
                <b>ESC</b> — Pause
            </div>

            <button
                id="dynamicControlsClose"
                style="
                    margin-top:25px;
                    padding:12px 24px;
                    cursor:pointer;
                "
            >
                CLOSE
            </button>

        </div>
    `;


    document.body.appendChild(
        screen
    );


    getElement(
        "dynamicControlsClose"
    ).addEventListener(
        "click",
        () => {

            screen.style.display =
                "none";

            if (
                gameRunning
            ) {
                paused = false;
            }

        }
    );
}


// ============================================================
// SHOP
// ============================================================

function createShop() {

    if (
        getElement("shopScreen")
    ) {
        return;
    }


    const shopButton =
        document.createElement("button");

    shopButton.id =
        "shopButton";

    shopButton.textContent =
        "SHOP";

    shopButton.style.position =
        "fixed";

    shopButton.style.right =
        "25px";

    shopButton.style.bottom =
        "25px";

    shopButton.style.zIndex =
        "4000";

    shopButton.style.padding =
        "12px 22px";

    shopButton.style.cursor =
        "pointer";

    document.body.appendChild(
        shopButton
    );


    shopButton.addEventListener(
        "click",
        openShop
    );


    const screen =
        document.createElement("div");

    screen.id =
        "shopScreen";

    screen.style.position =
        "fixed";

    screen.style.inset =
        "0";

    screen.style.zIndex =
        "8000";

    screen.style.background =
        "rgba(2,7,10,.96)";

    screen.style.display =
        "none";

    screen.style.alignItems =
        "center";

    screen.style.justifyContent =
        "center";

    screen.style.fontFamily =
        "Arial, sans-serif";


    screen.innerHTML = `
        <div style="
            width:min(850px,92vw);
            max-height:85vh;
            overflow:auto;
            background:#0d171d;
            border:1px solid #2d6c76;
            padding:30px;
            color:white;
        ">

            <h1 style="
                color:#6cecff;
                margin-top:0;
            ">
                SHOP
            </h1>

            <div style="
                margin-bottom:20px;
                color:#a9c3ca;
            ">
                Credits:
                <span id="shopCredits">0</span>
            </div>

            <div
                id="shopItems"
                style="
                    display:grid;
                    grid-template-columns:
                    repeat(auto-fit,minmax(220px,1fr));
                    gap:12px;
                "
            ></div>

            <button
                id="closeShop"
                style="
                    margin-top:25px;
                    padding:12px 25px;
                    cursor:pointer;
                "
            >
                CLOSE
            </button>

        </div>
    `;


    document.body.appendChild(
        screen
    );


    getElement(
        "closeShop"
    ).addEventListener(
        "click",
        closeShop
    );


    renderShop();
}


const shopItems = [

    {
        name: "Ammo Pack",
        description: "+12 ammo",
        price: 20,
        buy() {

            ammo =
                Math.min(
                    maxAmmo,
                    ammo + 12
                );
        }
    },

    {
        name: "Repair Kit",
        description: "+30 health",
        price: 30,
        buy() {

            health =
                Math.min(
                    maxHealth,
                    health + 30
                );
        }
    },

    {
        name: "Energy Cell",
        description: "+40 energy",
        price: 20,
        buy() {

            energy =
                Math.min(
                    maxEnergy,
                    energy + 40
                );
        }
    },

    {
        name: "Armor Plate",
        description: "+25 maximum health",
        price: 80,
        buy() {

            maxHealth += 25;

            health += 25;
        }
    },

    {
        name: "Weapon Core",
        description: "+5 damage",
        price: 100,
        buy() {

            weaponDamage += 5;
        }
    },

    {
        name: "Engine Boost",
        description: "+1 tank speed",
        price: 90,
        buy() {

            tankSpeed += 1;
        }
    }

];


function renderShop() {

    const container =
        getElement(
            "shopItems"
        );

    if (!container) return;


    container.innerHTML = "";


    for (
        const item of shopItems
    ) {

        const card =
            document.createElement("div");


        card.style.padding =
            "18px";

        card.style.background =
            "#142229";

        card.style.border =
            "1px solid #29434b";


        card.innerHTML = `
            <h3 style="
                margin-top:0;
                color:#71eaff;
            ">
                ${item.name}
            </h3>

            <p style="
                color:#aab8bd;
            ">
                ${item.description}
            </p>

            <button
                style="
                    padding:9px 16px;
                    cursor:pointer;
                "
            >
                BUY — ${item.price}
            </button>
        `;


        card
            .querySelector("button")
            .addEventListener(
                "click",
                () => {

                    if (
                        credits <
                        item.price
                    ) {
                        return;
                    }


                    credits -=
                        item.price;


                    item.buy();


                    updateHUD();

                }
            );


        container.appendChild(
            card
        );
    }


    updateShopCredits();
}


function updateShopCredits() {

    const text =
        getElement(
            "shopCredits"
        );

    if (text) {
        text.textContent =
            credits;
    }
}


function openShop() {

    if (!gameRunning) return;
    if (gameOver) return;


    const screen =
        getElement(
            "shopScreen"
        );


    if (!screen) return;


    shopOpen = true;

    paused = true;


    screen.style.display =
        "flex";


    updateShopCredits();
}


function closeShop() {

    const screen =
        getElement(
            "shopScreen"
        );


    if (!screen) return;


    screen.style.display =
        "none";


    shopOpen = false;


    if (
        gameRunning &&
        !gameOver
    ) {
        paused = false;
    }
}


// ============================================================
// MAP
// ============================================================

function toggleMap() {

    if (!gameRunning) return;

    const existing =
        getElement(
            "dynamicMap"
        );


    if (existing) {

        if (
            existing.style.display ===
            "none"
        ) {

            existing.style.display =
                "flex";

            paused = true;

        } else {

            existing.style.display =
                "none";

            paused = false;
        }

        drawMap();

        return;
    }


    createMap();
}


function createMap() {

    const screen =
        document.createElement("div");

    screen.id =
        "dynamicMap";

    screen.style.position =
        "fixed";

    screen.style.inset =
        "0";

    screen.style.zIndex =
        "8500";

    screen.style.background =
        "rgba(3,8,12,.96)";

    screen.style.display =
        "flex";

    screen.style.alignItems =
        "center";

    screen.style.justifyContent =
        "center";


    screen.innerHTML = `
        <div style="
            width:min(700px,90vw);
            background:#0d171d;
            padding:25px;
            border:1px solid #31545c;
        ">

            <h1 style="
                color:#6cecff;
            ">
                MAP
            </h1>

            <canvas
                id="dynamicMapCanvas"
                width="600"
                height="600"
                style="
                    width:100%;
                    background:#17251e;
                    border:1px solid #31545c;
                "
            ></canvas>

            <button
                id="dynamicMapClose"
                style="
                    margin-top:20px;
                    padding:12px 24px;
                    cursor:pointer;
                "
            >
                CLOSE MAP
            </button>

        </div>
    `;


    document.body.appendChild(
        screen
    );


    getElement(
        "dynamicMapClose"
    ).addEventListener(
        "click",
        () => {

            screen.style.display =
                "none";

            paused = false;
        }
    );


    paused = true;

    drawMap();
}


function drawMap() {

    const mapCanvas =
        getElement(
            "dynamicMapCanvas"
        );

    if (!mapCanvas) return;


    const mapCtx =
        mapCanvas.getContext("2d");


    const size =
        mapCanvas.width;


    mapCtx.clearRect(
        0,
        0,
        size,
        size
    );


    mapCtx.fillStyle =
        "#18261e";

    mapCtx.fillRect(
        0,
        0,
        size,
        size
    );


    const scale =
        size / 360;


    // gebouwen
    mapCtx.fillStyle =
        "#405159";


    for (
        const building of buildings
    ) {

        mapCtx.fillRect(
            (building.x -
                building.width / 2 +
                180) *
                scale,

            (building.z -
                building.depth / 2 +
                180) *
                scale,

            building.width *
                scale,

            building.depth *
                scale
        );
    }


    // signaal
    mapCtx.fillStyle =
        "#43e5ff";


    mapCtx.beginPath();

    mapCtx.arc(
        (0 + 180) * scale,
        (-130 + 180) * scale,
        5,
        0,
        Math.PI * 2
    );

    mapCtx.fill();


    // tank
    mapCtx.fillStyle =
        "#ffffff";


    mapCtx.beginPath();

    mapCtx.arc(
        (tank.position.x + 180) *
            scale,

        (tank.position.z + 180) *
            scale,

        6,

        0,

        Math.PI * 2
    );

    mapCtx.fill();


    // vijanden
    mapCtx.fillStyle =
        "#e879b8";


    for (
        const enemy of enemies
    ) {

        mapCtx.beginPath();

        mapCtx.arc(
            (enemy.group.position.x +
                180) *
                scale,

            (enemy.group.position.z +
                180) *
                scale,

            3,

            0,
            Math.PI * 2
        );

        mapCtx.fill();
    }
}


// ============================================================
// SAVE
// ============================================================

const SAVE_KEY =
    "echobound-save";


function saveGame() {

    const data = {

        health,
        maxHealth,

        energy,
        maxEnergy,

        ammo,
        maxAmmo,

        kills,
        credits,

        weaponDamage,
        tankSpeed,

        tankX:
            tank.position.x,

        tankY:
            tank.position.y,

        tankZ:
            tank.position.z,

        tankRotation:
            tank.rotation.y,

        achievements:
            achievementState
    };


    localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(data)
    );


    showTemporaryMessage(
        "GAME SAVED"
    );
}


// ============================================================
// LOAD
// ============================================================

function loadGameData() {

    const raw =
        localStorage.getItem(
            SAVE_KEY
        );


    if (!raw) {

        showTemporaryMessage(
            "NO SAVE FOUND"
        );

        return false;
    }


    try {

        const data =
            JSON.parse(raw);


        health =
            data.health ??
            100;

        maxHealth =
            data.maxHealth ??
            100;

        energy =
            data.energy ??
            100;

        maxEnergy =
            data.maxEnergy ??
            100;

        ammo =
            data.ammo ??
            12;

        maxAmmo =
            data.maxAmmo ??
            12;

        kills =
            data.kills ??
            0;

        credits =
            data.credits ??
            0;

        weaponDamage =
            data.weaponDamage ??
            20;

        tankSpeed =
            data.tankSpeed ??
            9;


        tank.position.set(
            data.tankX ??
                0,

            data.tankY ??
                0,

            data.tankZ ??
                45
        );


        tank.rotation.y =
            data.tankRotation ??
            0;


        if (
            data.achievements
        ) {

            achievementState =
                {
                    ...achievementState,
                    ...data.achievements
                };
        }


        updateHUD();

        showTemporaryMessage(
            "GAME LOADED"
        );

        return true;

    } catch (error) {

        console.error(
            error
        );

        showTemporaryMessage(
            "SAVE IS CORRUPTED"
        );

        return false;
    }
}


// ============================================================
// TEMP MESSAGE
// ============================================================

function showTemporaryMessage(
    message
) {

    const element =
        document.createElement("div");

    element.textContent =
        message;

    element.style.position =
        "fixed";

    element.style.left =
        "50%";

    element.style.top =
        "80px";

    element.style.transform =
        "translateX(-50%)";

    element.style.zIndex =
        "99999";

    element.style.padding =
        "12px 22px";

    element.style.background =
        "rgba(5,15,20,.95)";

    element.style.border =
        "1px solid #3ed7ed";

    element.style.color =
        "#8befff";

    element.style.fontFamily =
        "Arial";

    element.style.fontWeight =
        "bold";


    document.body.appendChild(
        element
    );


    setTimeout(
        () => {
            element.remove();
        },
        1800
    );
}


// ============================================================
// PAUSE
// ============================================================

function togglePause() {

    if (!gameRunning) return;
    if (gameOver) return;
    if (shopOpen) return;


    paused =
        !paused;


    if (pauseScreen) {

        pauseScreen.style.display =
            paused
                ? "flex"
                : "none";
    }
}


function showPause() {

    paused = true;


    if (pauseScreen) {

        pauseScreen.style.display =
            "flex";
    }
}


function hidePause() {

    paused = false;


    if (pauseScreen) {

        pauseScreen.style.display =
            "none";
    }
}


// ============================================================
// GAME OVER
// ============================================================

function triggerGameOver() {

    if (gameOver) return;


    gameOver = true;

    paused = true;


    const overlay =
        document.createElement("div");

    overlay.id =
        "gameOverScreen";

    overlay.style.position =
        "fixed";

    overlay.style.inset =
        "0";

    overlay.style.zIndex =
        "10000";

    overlay.style.display =
        "flex";

    overlay.style.alignItems =
        "center";

    overlay.style.justifyContent =
        "center";

    overlay.style.background =
        "rgba(3,8,12,.92)";

    overlay.style.fontFamily =
        "Arial";


    overlay.innerHTML = `
        <div style="
            width:min(550px,90vw);
            text-align:center;
            padding:35px;
            background:#0d171d;
            border:1px solid #6b4e65;
            color:white;
        ">

            <h1 style="
                color:#e978b6;
                letter-spacing:4px;
            ">
                RUN ENDED
            </h1>

            <p style="
                color:#b7c4c9;
            ">
                The signal is still waiting.
            </p>

            <p>
                KILLS: ${kills}
            </p>

            <p>
                CREDITS: ${credits}
            </p>

            <button
                id="gameOverNewRun"
                style="
                    padding:12px 25px;
                    margin:8px;
                    cursor:pointer;
                "
            >
                NEW RUN
            </button>

            <button
                id="gameOverMenu"
                style="
                    padding:12px 25px;
                    margin:8px;
                    cursor:pointer;
                "
            >
                MAIN MENU
            </button>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    getElement(
        "gameOverNewRun"
    ).addEventListener(
        "click",
        () => {

            overlay.remove();

            startNewGame();
        }
    );


    getElement(
        "gameOverMenu"
    ).addEventListener(
        "click",
        () => {

            overlay.remove();

            returnToMenu();
        }
    );
}


// ============================================================
// RESET GAME
// ============================================================

function clearEnemies() {

    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.group
        );
    }


    enemies.length = 0;
}


function clearBullets() {

    for (
        const bullet of bullets
    ) {

        scene.remove(
            bullet.mesh
        );
    }


    bullets.length = 0;
}


// ============================================================
// NEW RUN
// ============================================================

function startNewGame() {

    // sluit game over
    const gameOverScreen =
        getElement(
            "gameOverScreen"
        );

    if (gameOverScreen) {
        gameOverScreen.remove();
    }


    // sluit schermen
    const dynamicAchievements =
        getElement(
            "dynamicAchievements"
        );

    if (dynamicAchievements) {
        dynamicAchievements.style.display =
            "none";
    }


    const dynamicControls =
        getElement(
            "dynamicControls"
        );

    if (dynamicControls) {
        dynamicControls.style.display =
            "none";
    }


    const dynamicMap =
        getElement(
            "dynamicMap"
        );

    if (dynamicMap) {
        dynamicMap.style.display =
            "none";
    }


    closeShop();


    clearEnemies();

    clearBullets();


    // reset stats
    health = 100;
    maxHealth = 100;

    energy = 100;
    maxEnergy = 100;

    ammo = 12;
    maxAmmo = 12;

    kills = 0;
    credits = 0;

    weaponDamage = 20;
    tankSpeed = 9;


    achievementState = {

        firstEcho: false,

        signalDefender: false,

        explorer: false,

        lostSignal: false
    };


    // reset tank
    tank.position.set(
        0,
        0,
        45
    );

    tank.rotation.y = 0;

    turret.rotation.y = 0;


    // timers
    shootCooldown = 0;
    reloadTimer = 0;
    dashCooldown = 0;
    enemySpawnTimer = 0;


    gameOver = false;

    paused = false;

    gameRunning = true;


    // menu verbergen
    if (menu) {

        menu.style.display =
            "none";
    }


    // HUD zichtbaar
    if (hud) {

        hud.style.display =
            "block";
    }


    if (pauseScreen) {

        pauseScreen.style.display =
            "none";
    }


    // enemies
    spawnInitialEnemies();


    updateHUD();


    showTemporaryMessage(
        "NEW RUN STARTED"
    );
}


// ============================================================
// RETURN TO MENU
// ============================================================

function returnToMenu() {

    gameRunning = false;

    paused = true;

    gameOver = false;

    shopOpen = false;


    closeShop();


    clearEnemies();

    clearBullets();


    const gameOverScreen =
        getElement(
            "gameOverScreen"
        );

    if (gameOverScreen) {
        gameOverScreen.remove();
    }


    if (menu) {

        menu.style.display =
            "flex";
    }


    if (hud) {

        hud.style.display =
            "none";
    }


    if (pauseScreen) {

        pauseScreen.style.display =
            "none";
    }
}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    if (healthBar) {

        healthBar.style.width =
            `${Math.max(
                0,
                (health / maxHealth) * 100
            )}%`;
    }


    if (energyBar) {

        energyBar.style.width =
            `${Math.max(
                0,
                (energy / maxEnergy) * 100
            )}%`;
    }


    if (ammoText) {

        ammoText.textContent =
            `AMMO ${ammo}/${maxAmmo}`;
    }


    if (killsText) {

        killsText.textContent =
            `KILLS ${kills}`;
    }


    if (creditsText) {

        creditsText.textContent =
            `CREDITS ${credits}`;
    }


    if (zoneText) {

        zoneText.textContent =
            "ZONE: LOST FRONTIER";
    }


    if (objectiveText) {

        if (
            !achievementState.lostSignal
        ) {

            objectiveText.textContent =
                "OBJECTIVE: FIND THE LOST SIGNAL";

        } else {

            objectiveText.textContent =
                "OBJECTIVE: DEFEND THE SIGNAL";
        }
    }


    updateShopCredits();
}


// ============================================================
// OBJECTIVE / ACHIEVEMENTS UPDATE
// ============================================================

function updateProgress() {

    const distance =
        Math.hypot(
            tank.position.x,
            tank.position.z - 45
        );


    if (
        distance > 150
    ) {

        unlockAchievement(
            "explorer"
        );
    }


    const signalDistance =
        Math.hypot(
            tank.position.x,
            tank.position.z + 130
        );


    if (
        signalDistance < 12
    ) {

        unlockAchievement(
            "lostSignal"
        );
    }
}


// ============================================================
// BUTTON BINDING
// ============================================================

function bindButton(
    button,
    callback
) {

    if (!button) return;


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            callback();
        }
    );
}


// ============================================================
// MENU BUTTONS
// ============================================================

bindButton(
    newGameButton,
    () => {

        startNewGame();
    }
);


bindButton(
    loadGameButton,
    () => {

        const loaded =
            loadGameData();

        if (loaded) {

            gameRunning = true;
            paused = false;
            gameOver = false;


            if (menu) {
                menu.style.display =
                    "none";
            }

            if (hud) {
                hud.style.display =
                    "block";
            }

            clearEnemies();
            clearBullets();

            spawnInitialEnemies();

            updateHUD();
        }
    }
);


bindButton(
    achievementsButton,
    () => {

        openAchievements();
    }
);


bindButton(
    controlsButton,
    () => {

        openControls();
    }
);


// ============================================================
// PAUSE BUTTONS
// ============================================================

bindButton(
    resumeButton,
    () => {

        hidePause();
    }
);


bindButton(
    saveButton,
    () => {

        saveGame();
    }
);


bindButton(
    quitButton,
    () => {

        returnToMenu();
    }
);


bindButton(
    closeMapButton,
    () => {

        if (mapScreen) {

            mapScreen.style.display =
                "none";
        }

        paused = false;
    }
);


// ============================================================
// FALLBACK MENU BUTTON STYLING
// ============================================================

function styleButton(
    button
) {

    if (!button) return;


    button.style.cursor =
        "pointer";
}


styleButton(
    newGameButton
);

styleButton(
    loadGameButton
);

styleButton(
    achievementsButton
);

styleButton(
    controlsButton
);

styleButton(
    resumeButton
);

styleButton(
    saveButton
);

styleButton(
    quitButton
);


// ============================================================
// SHOP
// ============================================================

createShop();


// ============================================================
// WINDOW RESIZE
// ============================================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );
    }
);


// ============================================================
// ANIMATION
// ============================================================

const clock =
    new THREE.Clock();


function gameLoop() {

    requestAnimationFrame(
        gameLoop
    );


    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    if (gameRunning) {

        elapsedTime +=
            delta;


        if (
            shootCooldown > 0
        ) {

            shootCooldown -=
                delta;
        }


        if (
            reloadTimer > 0
        ) {

            reloadTimer -=
                delta;


            if (
                reloadTimer <= 0
            ) {

                ammo = maxAmmo;
            }
        }


        if (
            dashCooldown > 0
        ) {

            dashCooldown -=
                delta;
        }


        updateTank(
            delta
        );


        aimCannon();


        updateBullets(
            delta
        );


        updateEnemies(
            delta
        );


        updateEnemySpawning(
            delta
        );


        updateProgress();


        updateHUD();


        updateCamera();
    }


    renderer.render(
        scene,
        camera
    );
}


// ============================================================
// START
// ============================================================

gameRunning = false;
paused = true;
gameOver = false;


if (hud) {

    hud.style.display =
        "none";
}


if (pauseScreen) {

    pauseScreen.style.display =
        "none";
}


if (menu) {

    menu.style.display =
        "flex";
}


// camera eerste positie
updateCamera();


// Start game loop
gameLoop();


// ============================================================
// KLAAR
// ============================================================

console.log(
    "ECHOBOUND geladen — alle systemen actief."
);
