// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// COMPLETE APP.JS
// 3D TANK SURVIVAL + SHOP + ENEMIES + SAVE + MAP
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
            background:#080d12;
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:Arial;
            text-align:center;
            padding:30px;
        ">
            <div>
                <h1>EchoBound</h1>
                <p>De 3D-engine kon niet worden geladen.</p>
                <p>Controleer je internetverbinding en laad de pagina opnieuw.</p>
            </div>
        </div>
    `;
    throw error;
}

// ============================================================
// DOM
// ============================================================

const canvas = document.getElementById("game");

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const pause = document.getElementById("pause");
const achievement = document.getElementById("achievement");
const map = document.getElementById("map");

const newGame = document.getElementById("newGame");
const loadGame = document.getElementById("loadGame");
const achievementsButton = document.getElementById("achievementsButton");
const controlsButton = document.getElementById("controlsButton");

const resume = document.getElementById("resume");
const save = document.getElementById("save");
const quit = document.getElementById("quit");
const closeMap = document.getElementById("closeMap");

const healthBar = document.getElementById("healthBar");
const energyBar = document.getElementById("energyBar");
const ammoText = document.getElementById("ammo");
const killsText = document.getElementById("kills");
const creditsText = document.getElementById("credits");
const zoneText = document.getElementById("zone");
const objectiveText = document.getElementById("objective");
const achievementName = document.getElementById("achievementName");
const mapCanvas = document.getElementById("mapCanvas");

// ============================================================
// EXTRA SHOP UI
// ============================================================

const shopButton = document.createElement("button");
shopButton.id = "shopButton";
shopButton.textContent = "SHOP";

Object.assign(shopButton.style, {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    zIndex: "100",
    padding: "13px 22px",
    border: "1px solid rgba(80,220,255,.8)",
    borderRadius: "10px",
    background: "linear-gradient(135deg,#102b38,#07151c)",
    color: "#7eeaff",
    fontWeight: "800",
    letterSpacing: "2px",
    cursor: "pointer",
    boxShadow: "0 0 25px rgba(0,210,255,.25)",
    display: "none"
});

document.body.appendChild(shopButton);

// ============================================================
// SHOP SCREEN
// ============================================================

const shopScreen = document.createElement("div");
shopScreen.id = "shopScreen";

Object.assign(shopScreen.style, {
    position: "fixed",
    inset: "0",
    zIndex: "200",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2,7,12,.88)",
    backdropFilter: "blur(8px)",
    fontFamily: "Arial, sans-serif"
});

shopScreen.innerHTML = `
    <div style="
        width:min(900px,92vw);
        max-height:90vh;
        overflow:auto;
        background:
            linear-gradient(145deg,rgba(16,30,39,.98),rgba(5,12,17,.98));
        border:1px solid rgba(73,220,255,.55);
        border-radius:18px;
        box-shadow:
            0 0 50px rgba(0,200,255,.15),
            inset 0 0 40px rgba(0,0,0,.35);
        padding:30px;
        color:white;
    ">

        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            border-bottom:1px solid rgba(255,255,255,.1);
            padding-bottom:18px;
            margin-bottom:24px;
        ">
            <div>
                <div style="
                    color:#65e8ff;
                    font-size:12px;
                    letter-spacing:4px;
                    margin-bottom:6px;
                ">ECHObound // SUPPLY NETWORK</div>

                <h1 style="
                    margin:0;
                    font-size:38px;
                    letter-spacing:4px;
                ">SHOP</h1>
            </div>

            <div style="
                color:#ffd76a;
                font-size:20px;
                font-weight:bold;
            ">
                💰 <span id="shopCredits">0</span>
            </div>
        </div>

        <div id="shopItems" style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
            gap:16px;
        "></div>

        <button id="closeShop" style="
            margin-top:25px;
            width:100%;
            padding:14px;
            border-radius:10px;
            border:1px solid rgba(255,255,255,.2);
            background:#111b21;
            color:white;
            cursor:pointer;
            font-size:16px;
            font-weight:bold;
        ">
            CLOSE SHOP
        </button>
    </div>
`;

document.body.appendChild(shopScreen);

const shopCredits = document.getElementById("shopCredits");
const shopItems = document.getElementById("shopItems");
const closeShop = document.getElementById("closeShop");

// ============================================================
// SHOP ITEMS
// ============================================================

const SHOP_ITEMS = [
    {
        id: "ammo",
        name: "AMMO PACK",
        description: "Vult je munitie aan.",
        price: 20,
        icon: "🔫"
    },
    {
        id: "repair",
        name: "REPAIR KIT",
        description: "Herstelt 25 HP.",
        price: 30,
        icon: "🔧"
    },
    {
        id: "energy",
        name: "ENERGY CELL",
        description: "Herstelt 35 energy.",
        price: 20,
        icon: "⚡"
    },
    {
        id: "armor",
        name: "ARMOR PLATE",
        description: "Verhoogt maximale HP met 10.",
        price: 80,
        icon: "🛡️"
    },
    {
        id: "weapon",
        name: "WEAPON CORE",
        description: "Verhoogt je schotkracht.",
        price: 100,
        icon: "💠"
    },
    {
        id: "engine",
        name: "ENGINE BOOST",
        description: "Verhoogt je rijsnelheid.",
        price: 90,
        icon: "🚜"
    }
];

// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;
let paused = false;
let gameOver = false;
let mapOpen = false;
let shopOpen = false;

let health = 100;
let maxHealth = 100;

let energy = 100;
let maxEnergy = 100;

let ammo = 12;
let maxAmmo = 12;

let kills = 0;
let credits = 0;

let weaponDamage = 1;
let tankSpeed = 8;

let shotCooldown = 0;
let dashCooldown = 0;

let lastTime = performance.now();

let mouseX = 0;
let mouseY = 0;

let firing = false;

let objective = "Find the Lost Signal";

let firstEchoUnlocked = false;
let signalDefenderUnlocked = false;
let explorerUnlocked = false;
let lostSignalUnlocked = false;

// ============================================================
// THREE.JS
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x071015);

scene.fog = new THREE.Fog(
    0x071015,
    80,
    300
);

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
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

const ambientLight = new THREE.HemisphereLight(
    0x8bdcff,
    0x11151a,
    1.4
);

scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(
    0x9adfff,
    2.2
);

moonLight.position.set(
    80,
    120,
    50
);

moonLight.castShadow = true;

moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;

scene.add(moonLight);

const blueLight = new THREE.PointLight(
    0x00d9ff,
    30,
    70
);

blueLight.position.set(
    0,
    8,
    0
);

scene.add(blueLight);

// ============================================================
// WORLD
// ============================================================

const WORLD_SIZE = 420;

const worldGroup = new THREE.Group();

scene.add(worldGroup);

// ============================================================
// GROUND
// ============================================================

const groundGeometry =
    new THREE.PlaneGeometry(
        WORLD_SIZE,
        WORLD_SIZE
    );

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x172229,
        roughness: 1,
        metalness: 0
    });

const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

worldGroup.add(ground);

// ============================================================
// GROUND TILES
// ============================================================

const tileMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x1b2a30,
        roughness: 1
    });

for (
    let x = -WORLD_SIZE / 2;
    x < WORLD_SIZE / 2;
    x += 20
) {
    for (
        let z = -WORLD_SIZE / 2;
        z < WORLD_SIZE / 2;
        z += 20
    ) {

        if (
            Math.random() < 0.35
        ) continue;

        const tile =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    18,
                    18
                ),
                tileMaterial
            );

        tile.rotation.x = -Math.PI / 2;

        tile.position.set(
            x + 10,
            0.02,
            z + 10
        );

        tile.receiveShadow = true;

        worldGroup.add(tile);
    }
}

// ============================================================
// COLLISION OBJECTS
// ============================================================

const collisionObjects = [];

// ============================================================
// BUILDING CREATION
// ============================================================

function createBuilding(
    x,
    z,
    width,
    depth,
    height
) {

    const group =
        new THREE.Group();

    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x263943,
            roughness: 0.72,
            metalness: 0.35
        });

    const roofMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x111d24,
            roughness: 0.65,
            metalness: 0.5
        });

    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            wallMaterial
        );

    body.position.y =
        height / 2;

    body.castShadow = true;
    body.receiveShadow = true;

    group.add(body);

    const roof =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width + 1,
                0.7,
                depth + 1
            ),
            roofMaterial
        );

    roof.position.y =
        height + 0.35;

    roof.castShadow = true;

    group.add(roof);

    const light =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                Math.max(1, width * 0.08),
                0.12,
                Math.max(1, depth * 0.08)
            ),
            new THREE.MeshStandardMaterial({
                color: 0x1ecbff,
                emissive: 0x0088aa,
                emissiveIntensity: 4
            })
        );

    light.position.set(
        0,
        height + 0.8,
        0
    );

    group.add(light);

    group.position.set(
        x,
        0,
        z
    );

    worldGroup.add(group);

    collisionObjects.push({
        mesh: group,
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

createBuilding(-90, -80, 45, 35, 18);
createBuilding(70, -95, 55, 40, 22);
createBuilding(105, 45, 35, 50, 16);
createBuilding(-100, 80, 50, 40, 20);
createBuilding(0, -125, 38, 30, 15);
createBuilding(-10, 105, 45, 42, 19);
createBuilding(125, 125, 30, 30, 14);
createBuilding(-135, -5, 30, 55, 18);

// ============================================================
// WALL CREATION
// ============================================================

function createWall(
    x,
    z,
    width,
    depth,
    height = 3
) {

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x33464f,
            roughness: 0.85,
            metalness: 0.25
        });

    const wall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            material
        );

    wall.position.set(
        x,
        height / 2,
        z
    );

    wall.castShadow = true;
    wall.receiveShadow = true;

    worldGroup.add(wall);

    collisionObjects.push({
        mesh: wall,
        x,
        z,
        width,
        depth
    });

    return wall;
}

// perimeter / ruins

createWall(-170, -20, 70, 4, 5);
createWall(-170, 50, 4, 140, 5);

createWall(170, 0, 70, 4, 5);
createWall(170, 80, 4, 120, 5);

createWall(0, -170, 150, 4, 5);
createWall(0, 170, 150, 4, 5);

// ============================================================
// TREES
// ============================================================

function createTree(x, z) {

    const group =
        new THREE.Group();

    const trunk =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.8,
                1.2,
                5,
                8
            ),
            new THREE.MeshStandardMaterial({
                color: 0x4a3424
            })
        );

    trunk.position.y = 2.5;

    trunk.castShadow = true;

    group.add(trunk);

    const crown =
        new THREE.Mesh(
            new THREE.IcosahedronGeometry(
                4.2,
                1
            ),
            new THREE.MeshStandardMaterial({
                color: 0x203d35,
                roughness: 1
            })
        );

    crown.position.y = 7;

    crown.castShadow = true;

    group.add(crown);

    group.position.set(
        x,
        0,
        z
    );

    worldGroup.add(group);

    return group;
}

for (let i = 0; i < 80; i++) {

    const x =
        (Math.random() - 0.5) *
        WORLD_SIZE *
        0.88;

    const z =
        (Math.random() - 0.5) *
        WORLD_SIZE *
        0.88;

    if (
        Math.abs(x) < 25 &&
        Math.abs(z) < 25
    ) continue;

    createTree(x, z);
}

// ============================================================
// ROCKS
// ============================================================

function createRock(x, z) {

    const rock =
        new THREE.Mesh(
            new THREE.DodecahedronGeometry(
                1.5 + Math.random() * 2.2,
                0
            ),
            new THREE.MeshStandardMaterial({
                color: 0x46535a,
                roughness: 1
            })
        );

    rock.position.set(
        x,
        1,
        z
    );

    rock.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );

    rock.castShadow = true;

    worldGroup.add(rock);
}

for (let i = 0; i < 110; i++) {

    const x =
        (Math.random() - 0.5) *
        WORLD_SIZE *
        0.9;

    const z =
        (Math.random() - 0.5) *
        WORLD_SIZE *
        0.9;

    createRock(x, z);
}

// ============================================================
// SIGNAL TOWER
// ============================================================

function createSignalTower(x, z) {

    const group =
        new THREE.Group();

    const pole =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                1.2,
                1.8,
                18,
                10
            ),
            new THREE.MeshStandardMaterial({
                color: 0x384b53,
                metalness: 0.8,
                roughness: 0.35
            })
        );

    pole.position.y = 9;

    pole.castShadow = true;

    group.add(pole);

    const ring =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                4,
                0.4,
                12,
                32
            ),
            new THREE.MeshStandardMaterial({
                color: 0x00eaff,
                emissive: 0x00aacc,
                emissiveIntensity: 5
            })
        );

    ring.position.y = 16;

    ring.rotation.x =
        Math.PI / 2;

    group.add(ring);

    const beacon =
        new THREE.PointLight(
            0x00eaff,
            15,
            80
        );

    beacon.position.y = 17;

    group.add(beacon);

    group.position.set(
        x,
        0,
        z
    );

    worldGroup.add(group);

    return group;
}

createSignalTower(0, -145);

// ============================================================
// TANK
// ============================================================

const tank =
    new THREE.Group();

scene.add(tank);

tank.position.set(
    0,
    0,
    0
);

// ============================================================
// TANK BODY
// ============================================================

const tankBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            5.8,
            1.8,
            7
        ),
        new THREE.MeshStandardMaterial({
            color: 0x273940,
            roughness: 0.6,
            metalness: 0.65
        })
    );

tankBody.position.y = 2;

tankBody.castShadow = true;

tank.add(tankBody);

// ============================================================
// TANK ARMOR
// ============================================================

const armor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4.8,
            1.4,
            4.8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x3e555d,
            roughness: 0.45,
            metalness: 0.7
        })
    );

armor.position.y = 3;

armor.castShadow = true;

tank.add(armor);

// ============================================================
// TRACKS
// ============================================================

const trackMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x11191d,
        roughness: 0.9,
        metalness: 0.35
    });

const leftTrack =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            1.4,
            1.6,
            7.8
        ),
        trackMaterial
    );

leftTrack.position.set(
    -3.2,
    1.3,
    0
);

leftTrack.castShadow = true;

tank.add(leftTrack);

const rightTrack =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            1.4,
            1.6,
            7.8
        ),
        trackMaterial
    );

rightTrack.position.set(
    3.2,
    1.3,
    0
);

rightTrack.castShadow = true;

tank.add(rightTrack);

// ============================================================
// WHEELS
// ============================================================

for (let side of [-1, 1]) {

    for (let i = -2.6; i <= 2.6; i += 1.3) {

        const wheel =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.7,
                    0.7,
                    1.6,
                    16
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x263137,
                    metalness: 0.8,
                    roughness: 0.4
                })
            );

        wheel.rotation.z =
            Math.PI / 2;

        wheel.position.set(
            side * 3.35,
            1.25,
            i
        );

        wheel.castShadow = true;

        tank.add(wheel);
    }
}

// ============================================================
// TURRET
// ============================================================

const turret =
    new THREE.Group();

turret.position.y = 4;

tank.add(turret);

const turretBase =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            2.7,
            3.1,
            1.3,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x465b63,
            roughness: 0.4,
            metalness: 0.75
        })
    );

turretBase.castShadow = true;

turret.add(turretBase);

// ============================================================
// TURRET ARMOR
// ============================================================

const turretArmor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4.2,
            1.6,
            3.8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x30464f,
            roughness: 0.5,
            metalness: 0.75
        })
    );

turretArmor.position.y = 0.8;

turretArmor.castShadow = true;

turret.add(turretArmor);

// ============================================================
// CANNON
// ============================================================

const cannon =
    new THREE.Group();

cannon.position.set(
    0,
    0.9,
    -2
);

turret.add(cannon);

const cannonBarrel =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.35,
            0.48,
            6.5,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x1a2429,
            metalness: 0.9,
            roughness: 0.25
        })
    );

cannonBarrel.rotation.x =
    Math.PI / 2;

cannonBarrel.position.z =
    -3.1;

cannonBarrel.castShadow = true;

cannon.add(cannonBarrel);

// ============================================================
// CANNON GLOW
// ============================================================

const cannonGlow =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.52,
            0.52,
            0.25,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x22eaff,
            emissive: 0x00cfff,
            emissiveIntensity: 5
        })
    );

cannonGlow.rotation.x =
    Math.PI / 2;

cannonGlow.position.z =
    -6.25;

cannon.add(cannonGlow);

// ============================================================
// TANK LIGHTS
// ============================================================

const tankLight =
    new THREE.PointLight(
        0x00dfff,
        8,
        25
    );

tankLight.position.set(
    0,
    3,
    -4
);

tank.add(tankLight);

// ============================================================
// ENEMIES
// ============================================================

const enemies = [];

function createEnemy() {

    const enemy =
        new THREE.Group();

    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                3,
                2.5,
                3
            ),
            new THREE.MeshStandardMaterial({
                color: 0x6d2c46,
                roughness: 0.55,
                metalness: 0.3
            })
        );

    body.position.y = 1.8;

    body.castShadow = true;

    enemy.add(body);

    const head =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                1.2,
                12,
                12
            ),
            new THREE.MeshStandardMaterial({
                color: 0x922e51,
                emissive: 0x20040e,
                roughness: 0.5
            })
        );

    head.position.y = 3.5;

    head.castShadow = true;

    enemy.add(head);

    const eye =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.3,
                0.3,
                0.2
            ),
            new THREE.MeshStandardMaterial({
                color: 0xff416d,
                emissive: 0xff164c,
                emissiveIntensity: 5
            })
        );

    eye.position.set(
        0,
        3.5,
        -1.05
    );

    enemy.add(eye);

    const glow =
        new THREE.PointLight(
            0xff174f,
            4,
            16
        );

    glow.position.set(
        0,
        3.5,
        -1
    );

    enemy.add(glow);

    let x;
    let z;

    do {

        x =
            (Math.random() - 0.5) *
            WORLD_SIZE *
            0.8;

        z =
            (Math.random() - 0.5) *
            WORLD_SIZE *
            0.8;

    } while (
        Math.hypot(
            x - tank.position.x,
            z - tank.position.z
        ) < 45
    );

    enemy.position.set(
        x,
        0,
        z
    );

    enemy.userData = {
        health: 5,
        maxHealth: 5,
        speed: 2.2 + Math.random() * 1.3,
        attackCooldown: 0,
        dead: false
    };

    scene.add(enemy);

    enemies.push(enemy);
}

// Start enemies

for (let i = 0; i < 8; i++) {
    createEnemy();
}

// ============================================================
// BULLETS
// ============================================================

const bullets = [];

function shoot() {

    if (!gameRunning) return;
    if (paused) return;
    if (gameOver) return;
    if (shopOpen) return;

    if (shotCooldown > 0) return;

    if (ammo <= 0) {

        ammo = 0;

        updateHUD();

        return;
    }

    ammo--;

    shotCooldown = 0.22;

    const direction =
        new THREE.Vector3(
            0,
            0,
            -1
        );

    cannon.localToWorld(
        direction.multiplyScalar(6)
    );

    const start =
        cannon.localToWorld(
            new THREE.Vector3(
                0,
                0,
                -6.3
            )
        );

    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.28,
                10,
                10
            ),
            new THREE.MeshStandardMaterial({
                color: 0x66f6ff,
                emissive: 0x00d9ff,
                emissiveIntensity: 7
            })
        );

    bullet.position.copy(start);

    scene.add(bullet);

    const velocity =
        new THREE.Vector3(
            0,
            0,
            -1
        );

    cannon.getWorldDirection(
        velocity
    );

    velocity.normalize();

    bullets.push({
        mesh: bullet,
        velocity:
            velocity.multiplyScalar(45),
        life: 2.5,
        damage: weaponDamage
    });

    updateHUD();
}

// ============================================================
// COLLISION
// ============================================================

function collidesWithWorld(
    position,
    radius = 2.5
) {

    if (
        position.x < -WORLD_SIZE / 2 + radius ||
        position.x > WORLD_SIZE / 2 - radius ||
        position.z < -WORLD_SIZE / 2 + radius ||
        position.z > WORLD_SIZE / 2 - radius
    ) {
        return true;
    }

    for (const obj of collisionObjects) {

        if (
            Math.abs(position.x - obj.x) <
            obj.width / 2 + radius
            &&
            Math.abs(position.z - obj.z) <
            obj.depth / 2 + radius
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// LINE OF SIGHT
// ============================================================

function hasLineOfSight(
    from,
    to
) {

    const direction =
        new THREE.Vector3()
            .subVectors(to, from)
            .normalize();

    const distance =
        from.distanceTo(to);

    const raycaster =
        new THREE.Raycaster(
            from,
            direction,
            0,
            distance
        );

    const objects =
        collisionObjects.map(
            item => item.mesh
        );

    const hits =
        raycaster.intersectObjects(
            objects,
            true
        );

    return hits.length === 0;
}

// ============================================================
// ENEMY UPDATE
// ============================================================

function updateEnemies(delta) {

    for (const enemy of enemies) {

        if (enemy.userData.dead)
            continue;

        const direction =
            new THREE.Vector3()
                .subVectors(
                    tank.position,
                    enemy.position
                );

        const distance =
            direction.length();

        direction.normalize();

        if (distance > 8) {

            const movement =
                direction.clone()
                    .multiplyScalar(
                        enemy.userData.speed *
                        delta
                    );

            const next =
                enemy.position.clone()
                    .add(movement);

            if (
                !collidesWithWorld(
                    next,
                    2
                )
            ) {
                enemy.position.copy(next);
            }
        }

        enemy.lookAt(
            tank.position.x,
            enemy.position.y,
            tank.position.z
        );

        enemy.userData.attackCooldown -= delta;

        if (
            distance < 10 &&
            enemy.userData.attackCooldown <= 0
        ) {

            if (
                hasLineOfSight(
                    enemy.position.clone().setY(2),
                    tank.position.clone().setY(2)
                )
            ) {

                health -= 5;

                enemy.userData.attackCooldown =
                    1.2;

                if (health <= 0) {
                    health = 0;
                    triggerGameOver();
                }

                updateHUD();
            }
        }
    }
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

        const bullet = bullets[i];

        bullet.mesh.position.add(
            bullet.velocity
                .clone()
                .multiplyScalar(delta)
        );

        bullet.life -= delta;

        let removeBullet =
            bullet.life <= 0;

        // World collision

        if (
            collidesWithWorld(
                bullet.mesh.position,
                0.15
            )
        ) {
            removeBullet = true;
        }

        // Enemy collision

        for (const enemy of enemies) {

            if (enemy.userData.dead)
                continue;

            const distance =
                bullet.mesh.position.distanceTo(
                    enemy.position
                );

            if (distance < 3) {

                enemy.userData.health -=
                    bullet.damage;

                removeBullet = true;

                if (
                    enemy.userData.health <= 0
                ) {

                    killEnemy(enemy);
                }

                break;
            }
        }

        if (removeBullet) {

            scene.remove(
                bullet.mesh
            );

            bullets.splice(
                i,
                1
            );
        }
    }
}

// ============================================================
// KILL ENEMY
// ============================================================

function killEnemy(enemy) {

    enemy.userData.dead = true;

    scene.remove(enemy);

    kills++;

    credits += 10;

    if (kills >= 1) {
        unlockAchievement(
            "FIRST ECHO",
            "Je hebt je eerste vijand verslagen."
        );
    }

    if (kills >= 5) {
        unlockAchievement(
            "SIGNAL DEFENDER",
            "Je hebt 5 vijanden verslagen."
        );
    }

    updateHUD();

    setTimeout(() => {

        const index =
            enemies.indexOf(enemy);

        if (index !== -1) {
            enemies.splice(
                index,
                1
            );
        }

        if (
            gameRunning &&
            !gameOver &&
            enemies.length < 12
        ) {
            createEnemy();
        }

    }, 1000);
}

// ============================================================
// MOVEMENT
// ============================================================

const keys = {};

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "Escape" &&
            gameRunning
        ) {

            if (shopOpen) {
                closeShopMenu();
                return;
            }

            togglePause();
        }

        if (
            event.code === "KeyM" &&
            gameRunning
        ) {
            toggleMap();
        }

        if (
            event.code === "Space"
        ) {
            event.preventDefault();
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

window.addEventListener(
    "mousemove",
    event => {

        mouseX = event.clientX;
        mouseY = event.clientY;

        if (
            gameRunning &&
            !paused &&
            !shopOpen
        ) {
            aimTurret();
        }
    }
);

window.addEventListener(
    "mousedown",
    event => {

        if (event.button === 0) {

            firing = true;

            shoot();
        }
    }
);

window.addEventListener(
    "mouseup",
    event => {

        if (event.button === 0) {
            firing = false;
        }
    }
);

// ============================================================
// AIM TURRET
// ============================================================

const raycaster =
    new THREE.Raycaster();

const mouse =
    new THREE.Vector2();

const aimPlane =
    new THREE.Plane(
        new THREE.Vector3(
            0,
            1,
            0
        ),
        0
    );

function aimTurret() {

    if (!gameRunning) return;
    if (paused) return;
    if (shopOpen) return;

    mouse.x =
        (mouseX /
            window.innerWidth) *
            2 -
        1;

    mouse.y =
        -(mouseY /
            window.innerHeight) *
            2 +
        1;

    raycaster.setFromCamera(
        mouse,
        camera
    );

    const point =
        new THREE.Vector3();

    if (
        raycaster.ray.intersectPlane(
            aimPlane,
            point
        )
    ) {

        const local =
            turret.worldToLocal(
                point.clone()
            );

        const angle =
            Math.atan2(
                -local.x,
                -local.z
            );

        turret.rotation.y =
            angle;
    }
}

// ============================================================
// TANK MOVEMENT
// ============================================================

function updateTank(delta) {

    if (!gameRunning)
        return;

    if (paused)
        return;

    if (shopOpen)
        return;

    let forward = 0;
    let turn = 0;

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
        turn += 1;
    }

    if (
        keys["KeyD"] ||
        keys["ArrowRight"]
    ) {
        turn -= 1;
    }

    const sprint =
        keys["ShiftLeft"] ||
        keys["ShiftRight"];

    let speed =
        tankSpeed;

    if (sprint && energy > 0) {

        speed *= 1.45;

        energy -=
            18 * delta;

    } else {

        energy +=
            10 * delta;
    }

    energy =
        Math.max(
            0,
            Math.min(
                maxEnergy,
                energy
            )
        );

    if (turn !== 0) {

        tank.rotation.y +=
            turn *
            1.75 *
            delta;
    }

    if (forward !== 0) {

        const direction =
            new THREE.Vector3(
                0,
                0,
                -1
            );

        direction.applyQuaternion(
            tank.quaternion
        );

        const movement =
            direction
                .multiplyScalar(
                    forward *
                    speed *
                    delta
                );

        const next =
            tank.position
                .clone()
                .add(movement);

        if (
            !collidesWithWorld(
                next,
                4
            )
        ) {

            tank.position.copy(
                next
            );
        }
    }

    if (
        keys["Space"] &&
        dashCooldown <= 0 &&
        energy >= 25
    ) {

        const direction =
            new THREE.Vector3(
                0,
                0,
                -1
            );

        direction.applyQuaternion(
            tank.quaternion
        );

        const dashPosition =
            tank.position
                .clone()
                .add(
                    direction.multiplyScalar(
                        16
                    )
                );

        if (
            !collidesWithWorld(
                dashPosition,
                4
            )
        ) {

            tank.position.copy(
                dashPosition
            );

            energy -= 25;

            dashCooldown = 2;
        }
    }
}

// ============================================================
// CAMERA
// ============================================================

function updateCamera() {

    const offset =
        new THREE.Vector3(
            0,
            10,
            18
        );

    offset.applyQuaternion(
        tank.quaternion
    );

    const desired =
        tank.position
            .clone()
            .add(offset);

    camera.position.lerp(
        desired,
        0.12
    );

    const target =
        tank.position
            .clone();

    target.y += 2.8;

    camera.lookAt(
        target
    );
}

// ============================================================
// SHOP
// ============================================================

function renderShop() {

    shopCredits.textContent =
        credits;

    shopItems.innerHTML = "";

    for (const item of SHOP_ITEMS) {

        const card =
            document.createElement("div");

        Object.assign(card.style, {
            background:
                "linear-gradient(145deg,#14242c,#091116)",
            border:
                "1px solid rgba(100,220,255,.2)",
            borderRadius: "14px",
            padding: "20px",
            minHeight: "180px",
            boxSizing: "border-box"
        });

        card.innerHTML = `
            <div style="
                font-size:34px;
                margin-bottom:10px;
            ">${item.icon}</div>

            <div style="
                font-weight:800;
                font-size:18px;
                letter-spacing:1px;
                color:#dffaff;
            ">
                ${item.name}
            </div>

            <div style="
                color:#8fa6ae;
                font-size:13px;
                line-height:1.5;
                min-height:40px;
                margin-top:8px;
            ">
                ${item.description}
            </div>

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-top:15px;
            ">

                <span style="
                    color:#ffd76a;
                    font-weight:bold;
                ">
                    💰 ${item.price}
                </span>

                <button
                    data-shop-item="${item.id}"
                    style="
                        padding:9px 14px;
                        border-radius:8px;
                        border:1px solid #36cde8;
                        background:#0c222b;
                        color:#7eeaff;
                        cursor:pointer;
                        font-weight:bold;
                    "
                >
                    BUY
                </button>
            </div>
        `;

        shopItems.appendChild(card);
    }

    shopItems
        .querySelectorAll(
            "[data-shop-item]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    buyItem(
                        button.dataset.shopItem
                    );
                }
            );
        });
}

function buyItem(id) {

    const item =
        SHOP_ITEMS.find(
            item => item.id === id
        );

    if (!item) return;

    if (credits < item.price) {

        showAchievement(
            "NOT ENOUGH CREDITS",
            "Je hebt niet genoeg credits."
        );

        return;
    }

    credits -= item.price;

    if (id === "ammo") {

        ammo =
            Math.min(
                maxAmmo,
                ammo + 12
            );
    }

    if (id === "repair") {

        health =
            Math.min(
                maxHealth,
                health + 25
            );
    }

    if (id === "energy") {

        energy =
            Math.min(
                maxEnergy,
                energy + 35
            );
    }

    if (id === "armor") {

        maxHealth += 10;

        health =
            Math.min(
                maxHealth,
                health + 10
            );
    }

    if (id === "weapon") {

        weaponDamage += 1;
    }

    if (id === "engine") {

        tankSpeed += 0.7;
    }

    updateHUD();

    renderShop();

    showAchievement(
        "PURCHASE COMPLETE",
        `${item.name} gekocht.`
    );
}

function openShopMenu() {

    if (!gameRunning)
        return;

    paused = true;
    shopOpen = true;

    shopScreen.style.display =
        "flex";

    shopButton.style.display =
        "none";

    renderShop();
}

function closeShopMenu() {

    shopOpen = false;

    shopScreen.style.display =
        "none";

    if (gameRunning && !gameOver) {
        paused = false;
    }

    if (gameRunning) {
        shopButton.style.display =
            "block";
    }
}

shopButton.addEventListener(
    "click",
    openShopMenu
);

closeShop.addEventListener(
    "click",
    closeShopMenu
);

// ============================================================
// HUD
// ============================================================

function updateHUD() {

    if (healthBar) {

        healthBar.style.width =
            `${Math.max(
                0,
                health / maxHealth * 100
            )}%`;
    }

    if (energyBar) {

        energyBar.style.width =
            `${Math.max(
                0,
                energy / maxEnergy * 100
            )}%`;
    }

    if (ammoText) {

        ammoText.textContent =
            ammo;
    }

    if (killsText) {

        killsText.textContent =
            kills;
    }

    if (creditsText) {

        creditsText.textContent =
            credits;
    }

    if (zoneText) {

        zoneText.textContent =
            "SECTOR 07";
    }

    if (objectiveText) {

        objectiveText.textContent =
            objective;
    }

    if (shopCredits) {

        shopCredits.textContent =
            credits;
    }
}

// ============================================================
// ACHIEVEMENTS
// ============================================================

function showAchievement(
    title,
    description
) {

    if (!achievement)
        return;

    if (achievementName) {

        achievementName.innerHTML = `
            <strong>${title}</strong>
            <br>
            <span style="
                font-size:13px;
                opacity:.75;
            ">
                ${description}
            </span>
        `;
    }

    achievement.style.display =
        "block";

    clearTimeout(
        showAchievement.timeout
    );

    showAchievement.timeout =
        setTimeout(() => {

            achievement.style.display =
                "none";

        }, 3500);
}

function unlockAchievement(
    name,
    description
) {

    if (
        name === "FIRST ECHO" &&
        firstEchoUnlocked
    ) return;

    if (
        name === "SIGNAL DEFENDER" &&
        signalDefenderUnlocked
    ) return;

    if (
        name === "EXPLORER" &&
        explorerUnlocked
    ) return;

    if (
        name === "THE LOST SIGNAL" &&
        lostSignalUnlocked
    ) return;

    if (name === "FIRST ECHO") {
        firstEchoUnlocked = true;
    }

    if (name === "SIGNAL DEFENDER") {
        signalDefenderUnlocked = true;
    }

    if (name === "EXPLORER") {
        explorerUnlocked = true;
    }

    if (name === "THE LOST SIGNAL") {
        lostSignalUnlocked = true;
    }

    showAchievement(
        name,
        description
    );
}

// ============================================================
// ACHIEVEMENTS SCREEN
// ============================================================

function openAchievements() {

    const screen =
        document.createElement("div");

    screen.id =
        "achievementScreen";

    Object.assign(screen.style, {
        position: "fixed",
        inset: "0",
        zIndex: "210",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2,7,12,.9)",
        backdropFilter: "blur(8px)",
        fontFamily: "Arial,sans-serif"
    });

    const achievements =
        [
            {
                name: "FIRST ECHO",
                done: firstEchoUnlocked,
                text: "Versla je eerste vijand."
            },
            {
                name: "SIGNAL DEFENDER",
                done: signalDefenderUnlocked,
                text: "Versla 5 vijanden."
            },
            {
                name: "EXPLORER",
                done: explorerUnlocked,
                text: "Verken de wereld."
            },
            {
                name: "THE LOST SIGNAL",
                done: lostSignalUnlocked,
                text: "Vind het verloren signaal."
            }
        ];

    screen.innerHTML = `
        <div style="
            width:min(700px,90vw);
            background:#091218;
            border:1px solid rgba(70,220,255,.5);
            border-radius:18px;
            padding:30px;
            color:white;
            box-shadow:0 0 50px rgba(0,220,255,.12);
        ">

            <div style="
                color:#65e8ff;
                letter-spacing:4px;
                font-size:12px;
            ">
                ECHOBOUND // PROGRESS
            </div>

            <h1 style="
                margin:8px 0 25px;
                letter-spacing:4px;
            ">
                ACHIEVEMENTS
            </h1>

            <div>
                ${achievements.map(a => `
                    <div style="
                        display:flex;
                        align-items:center;
                        gap:15px;
                        padding:16px;
                        margin-bottom:10px;
                        border-radius:10px;
                        background:
                            ${a.done
                                ? "rgba(0,190,220,.12)"
                                : "rgba(255,255,255,.04)"};
                        border:
                            1px solid
                            ${a.done
                                ? "rgba(0,220,255,.35)"
                                : "rgba(255,255,255,.08)"};
                    ">

                        <div style="
                            font-size:25px;
                        ">
                            ${a.done ? "✓" : "○"}
                        </div>

                        <div>
                            <div style="
                                font-weight:bold;
                                letter-spacing:1px;
                            ">
                                ${a.name}
                            </div>

                            <div style="
                                color:#8ea4ac;
                                margin-top:4px;
                                font-size:13px;
                            ">
                                ${a.text}
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>

            <button id="closeAchievements" style="
                width:100%;
                margin-top:15px;
                padding:13px;
                background:#101d23;
                border:1px solid rgba(255,255,255,.15);
                border-radius:9px;
                color:white;
                cursor:pointer;
                font-weight:bold;
            ">
                CLOSE
            </button>
        </div>
    `;

    document.body.appendChild(
        screen
    );

    document
        .getElementById(
            "closeAchievements"
        )
        .addEventListener(
            "click",
            () => {
                screen.remove();
            }
        );
}

achievementsButton?.addEventListener(
    "click",
    openAchievements
);

// ============================================================
// CONTROLS
// ============================================================

controlsButton?.addEventListener(
    "click",
    () => {

        const screen =
            document.createElement("div");

        screen.id =
            "controlsScreen";

        Object.assign(screen.style, {
            position: "fixed",
            inset: "0",
            zIndex: "210",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2,7,12,.9)",
            backdropFilter: "blur(8px)",
            fontFamily: "Arial,sans-serif"
        });

        screen.innerHTML = `
            <div style="
                width:min(650px,90vw);
                background:#091218;
                border:1px solid rgba(70,220,255,.5);
                border-radius:18px;
                padding:30px;
                color:white;
            ">

                <div style="
                    color:#65e8ff;
                    letter-spacing:4px;
                    font-size:12px;
                ">
                    ECHOBOUND // CONTROL SYSTEM
                </div>

                <h1>
                    CONTROLS
                </h1>

                <p>W A S D / pijltjes — Tank bewegen</p>
                <p>Muis — Kanon richten</p>
                <p>Linkermuisknop — Schieten</p>
                <p>SHIFT — Sprint</p>
                <p>SPACE — Dash</p>
                <p>M — Map</p>
                <p>ESC — Pauze</p>
                <p>SHOP — Koop upgrades met credits</p>

                <button id="closeControls" style="
                    width:100%;
                    margin-top:15px;
                    padding:13px;
                    background:#101d23;
                    border:1px solid rgba(255,255,255,.15);
                    border-radius:9px;
                    color:white;
                    cursor:pointer;
                    font-weight:bold;
                ">
                    CLOSE
                </button>
            </div>
        `;

        document.body.appendChild(
            screen
        );

        document
            .getElementById(
                "closeControls"
            )
            .addEventListener(
                "click",
                () => {
                    screen.remove();
                }
            );
    }
);

// ============================================================
// SAVE GAME
// ============================================================

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
        tankX: tank.position.x,
        tankZ: tank.position.z,
        tankRotation: tank.rotation.y,
        firstEchoUnlocked,
        signalDefenderUnlocked,
        explorerUnlocked,
        lostSignalUnlocked
    };

    localStorage.setItem(
        "echobound-save",
        JSON.stringify(data)
    );

    showAchievement(
        "GAME SAVED",
        "Je voortgang is opgeslagen."
    );
}

function loadGameData() {

    const raw =
        localStorage.getItem(
            "echobound-save"
        );

    if (!raw) {

        showAchievement(
            "NO SAVE FOUND",
            "Er is nog geen opgeslagen game."
        );

        return false;
    }

    try {

        const data =
            JSON.parse(raw);

        health =
            data.health ?? 100;

        maxHealth =
            data.maxHealth ?? 100;

        energy =
            data.energy ?? 100;

        maxEnergy =
            data.maxEnergy ?? 100;

        ammo =
            data.ammo ?? 12;

        maxAmmo =
            data.maxAmmo ?? 12;

        kills =
            data.kills ?? 0;

        credits =
            data.credits ?? 0;

        weaponDamage =
            data.weaponDamage ?? 1;

        tankSpeed =
            data.tankSpeed ?? 8;

        tank.position.x =
            data.tankX ?? 0;

        tank.position.z =
            data.tankZ ?? 0;

        tank.rotation.y =
            data.tankRotation ?? 0;

        firstEchoUnlocked =
            data.firstEchoUnlocked ?? false;

        signalDefenderUnlocked =
            data.signalDefenderUnlocked ?? false;

        explorerUnlocked =
            data.explorerUnlocked ?? false;

        lostSignalUnlocked =
            data.lostSignalUnlocked ?? false;

        updateHUD();

        return true;

    } catch (error) {

        console.error(
            "Save load error:",
            error
        );

        return false;
    }
}

// ============================================================
// NEW GAME
// ============================================================

function startNewGame() {

    health = 100;
    maxHealth = 100;

    energy = 100;
    maxEnergy = 100;

    ammo = 12;
    maxAmmo = 12;

    kills = 0;
    credits = 0;

    weaponDamage = 1;
    tankSpeed = 8;

    firstEchoUnlocked = false;
    signalDefenderUnlocked = false;
    explorerUnlocked = false;
    lostSignalUnlocked = false;

    objective =
        "Find the Lost Signal";

    tank.position.set(
        0,
        0,
        0
    );

    tank.rotation.set(
        0,
        0,
        0
    );

    for (
        const enemy of enemies
    ) {

        scene.remove(enemy);
    }

    enemies.length = 0;

    for (let i = 0; i < 8; i++) {
        createEnemy();
    }

    gameOver = false;
    paused = false;
    shopOpen = false;

    menu.style.display =
        "none";

    pause.style.display =
        "none";

    if (achievement) {
        achievement.style.display =
            "none";
    }

    hud.style.display =
        "block";

    shopButton.style.display =
        "block";

    gameRunning = true;

    updateHUD();

    showAchievement(
        "SYSTEM ONLINE",
        "EchoBound is klaar."
    );
}

// ============================================================
// GAME OVER
// ============================================================

function triggerGameOver() {

    if (gameOver)
        return;

    gameOver = true;
    paused = true;

    shopButton.style.display =
        "none";

    const screen =
        document.createElement("div");

    screen.id =
        "gameOverScreen";

    Object.assign(screen.style, {
        position: "fixed",
        inset: "0",
        zIndex: "250",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(3,7,10,.92)",
        fontFamily: "Arial,sans-serif",
        color: "white"
    });

    screen.innerHTML = `
        <div style="
            width:min(600px,90vw);
            text-align:center;
            padding:40px;
            background:#0a141a;
            border:1px solid rgba(255,70,100,.45);
            border-radius:18px;
        ">

            <div style="
                color:#ff5878;
                letter-spacing:5px;
                font-size:13px;
            ">
                SIGNAL LOST
            </div>

            <h1 style="
                font-size:50px;
                margin:10px 0;
            ">
                TANK OFFLINE
            </h1>

            <p style="
                color:#8fa3aa;
            ">
                Kills: ${kills}
                &nbsp; • &nbsp;
                Credits: ${credits}
            </p>

            <button id="restartGame" style="
                margin-top:20px;
                padding:14px 30px;
                border-radius:10px;
                border:1px solid #4ce7ff;
                background:#102831;
                color:#8cefff;
                cursor:pointer;
                font-weight:bold;
            ">
                NEW RUN
            </button>
        </div>
    `;

    document.body.appendChild(
        screen
    );

    document
        .getElementById(
            "restartGame"
        )
        .addEventListener(
            "click",
            () => {

                screen.remove();

                startNewGame();
            }
        );
}

// ============================================================
// PAUSE
// ============================================================

function togglePause() {

    if (!gameRunning)
        return;

    if (shopOpen)
        return;

    paused =
        !paused;

    pause.style.display =
        paused
            ? "flex"
            : "none";
}

resume?.addEventListener(
    "click",
    () => {

        paused = false;

        pause.style.display =
            "none";
    }
);

save?.addEventListener(
    "click",
    saveGame
);

quit?.addEventListener(
    "click",
    () => {

        gameRunning = false;
        paused = false;

        pause.style.display =
            "none";

        hud.style.display =
            "none";

        shopButton.style.display =
            "none";

        menu.style.display =
            "flex";
    }
);

// ============================================================
// MAP
// ============================================================

function drawMap() {

    if (!mapCanvas)
        return;

    const ctx =
        mapCanvas.getContext("2d");

    const width =
        mapCanvas.width;

    const height =
        mapCanvas.height;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    ctx.fillStyle =
        "#081217";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    const scale =
        width / WORLD_SIZE;

    // buildings

    ctx.fillStyle =
        "#334852";

    for (
        const obj of collisionObjects
    ) {

        const x =
            (obj.x +
                WORLD_SIZE / 2) *
            scale;

        const y =
            (obj.z +
                WORLD_SIZE / 2) *
            scale;

        ctx.fillRect(
            x -
                obj.width *
                    scale /
                    2,
            y -
                obj.depth *
                    scale /
                    2,
            obj.width * scale,
            obj.depth * scale
        );
    }

    // enemies

    ctx.fillStyle =
        "#ff416d";

    for (
        const enemy of enemies
    ) {

        if (enemy.userData.dead)
            continue;

        const x =
            (enemy.position.x +
                WORLD_SIZE / 2) *
            scale;

        const y =
            (enemy.position.z +
                WORLD_SIZE / 2) *
            scale;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // player

    const playerX =
        (tank.position.x +
            WORLD_SIZE / 2) *
        scale;

    const playerY =
        (tank.position.z +
            WORLD_SIZE / 2) *
        scale;

    ctx.fillStyle =
        "#5feaff";

    ctx.beginPath();

    ctx.arc(
        playerX,
        playerY,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

function toggleMap() {

    if (!gameRunning)
        return;

    mapOpen =
        !mapOpen;

    map.style.display =
        mapOpen
            ? "flex"
            : "none";

    if (mapOpen) {
        paused = true;
        drawMap();
    } else {
        paused = false;
    }
}

closeMap?.addEventListener(
    "click",
    () => {

        mapOpen = false;

        map.style.display =
            "none";

        paused = false;
    }
);

// ============================================================
// BUTTONS
// ============================================================

newGame?.addEventListener(
    "click",
    startNewGame
);

loadGame?.addEventListener(
    "click",
    () => {

        if (
            loadGameData()
        ) {

            menu.style.display =
                "none";

            hud.style.display =
                "block";

            shopButton.style.display =
                "block";

            gameRunning = true;
            paused = false;
            gameOver = false;

            showAchievement(
                "SAVE LOADED",
                "Je voortgang is teruggezet."
            );
        }
    }
);

// ============================================================
// RESIZE
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
    }
);

// ============================================================
// FIRE LOOP
// ============================================================

function gameLoop(time) {

    requestAnimationFrame(
        gameLoop
    );

    let delta =
        (time - lastTime) /
        1000;

    lastTime = time;

    delta =
        Math.min(
            delta,
            0.05
        );

    if (
        gameRunning &&
        !paused &&
        !gameOver
    ) {

        shotCooldown =
            Math.max(
                0,
                shotCooldown - delta
            );

        dashCooldown =
            Math.max(
                0,
                dashCooldown - delta
            );

        updateTank(delta);

        updateEnemies(delta);

        updateBullets(delta);

        if (firing) {
            shoot();
        }

        aimTurret();

        updateCamera();

        if (
            tank.position.length() >
            150
        ) {

            unlockAchievement(
                "EXPLORER",
                "Je bent ver van het startgebied gekomen."
            );
        }

        if (
            tank.position.distanceTo(
                new THREE.Vector3(
                    0,
                    0,
                    -145
                )
            ) < 25
        ) {

            objective =
                "Signal tower reached";

            unlockAchievement(
                "THE LOST SIGNAL",
                "Je hebt de bron van het signaal gevonden."
            );
        }

        updateHUD();
    }

    renderer.render(
        scene,
        camera
    );
}

// ============================================================
// INITIAL STATE
// ============================================================

menu.style.display =
    "flex";

hud.style.display =
    "none";

pause.style.display =
    "none";

if (achievement) {
    achievement.style.display =
        "none";
}

if (map) {
    map.style.display =
        "none";
}

shopButton.style.display =
    "none";

updateHUD();

updateCamera();

requestAnimationFrame(
    gameLoop
);

// ============================================================
// END
// ============================================================
