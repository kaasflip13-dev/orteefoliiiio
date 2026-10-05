```javascript
// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// COMPLETE 3D APP.JS
//
// BESTURING
// W / S       = vooruit / achteruit
// A / D       = tank draaien
// MUIS        = turret/wapen richten
// LINKER MUISKLIK = schieten
// SHIFT       = sprint
// SPACE       = dash
// M           = kaart
// ESC         = pauze
//
// CAMERA:
// - altijd achter de tank
// - camera draait NIET zelfstandig rond de tank
// - muis draait alleen het wapen
// ============================================================

let THREE;

try {
    THREE = await import(
        "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
    );
} catch (error) {
    document.body.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            background:#02070a;
            color:#58e9ff;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:Arial,sans-serif;
            text-align:center;
            padding:30px;
        ">
            <div>
                <h1 style="letter-spacing:4px;">ECHOBOUND</h1>
                <p>De 3D-engine kon niet worden geladen.</p>
                <p style="color:#a8bdc5;">
                    Controleer je internetverbinding en laad de pagina opnieuw.
                </p>
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
const pauseScreen = document.getElementById("pause");
const achievementBox = document.getElementById("achievement");
const mapScreen = document.getElementById("map");

const newGameButton = document.getElementById("newGame");
const loadGameButton = document.getElementById("loadGame");
const achievementsButton = document.getElementById("achievementsButton");
const controlsButton = document.getElementById("controlsButton");

const resumeButton = document.getElementById("resume");
const saveButton = document.getElementById("save");
const quitButton = document.getElementById("quit");

const closeMapButton = document.getElementById("closeMap");

const healthBar = document.getElementById("healthBar");
const energyBar = document.getElementById("energyBar");
const ammoText = document.getElementById("ammo");
const killsText = document.getElementById("kills");
const creditsText = document.getElementById("credits");
const zoneText = document.getElementById("zone");
const objectiveText = document.getElementById("objective");
const achievementName = document.getElementById("achievementName");

const mapCanvas = document.getElementById("mapCanvas");
const mapCtx = mapCanvas ? mapCanvas.getContext("2d") : null;


// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;
let paused = false;
let gameOver = false;
let mapOpen = false;

let health = 100;
let energy = 100;
let ammo = 12;

let kills = 0;
let credits = 0;

let shotCooldown = 0;
let dashCooldown = 0;

let lastTime = performance.now();

let mouseX = 0;
let mouseY = 0;

let firing = false;

let objective = "LOCATE THE SIGNAL";


// ============================================================
// THREE.JS
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x071116);

scene.fog = new THREE.Fog(
    0x071116,
    100,
    420
);


const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);


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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;


// ============================================================
// LIGHTING
// ============================================================

const ambientLight = new THREE.HemisphereLight(
    0x9bdcff,
    0x101b15,
    2.0
);

scene.add(ambientLight);


const sun = new THREE.DirectionalLight(
    0xffffff,
    2.8
);

sun.position.set(
    70,
    110,
    40
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;

scene.add(sun);


// ============================================================
// WORLD
// ============================================================

const WORLD_SIZE = 420;

const groundGroup = new THREE.Group();
const buildingGroup = new THREE.Group();
const decorationGroup = new THREE.Group();
const enemyGroup = new THREE.Group();
const bulletGroup = new THREE.Group();

scene.add(groundGroup);
scene.add(buildingGroup);
scene.add(decorationGroup);
scene.add(enemyGroup);
scene.add(bulletGroup);


// ============================================================
// GROUND
// ============================================================

const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x263a31,
    roughness: 1
});

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(
        WORLD_SIZE,
        WORLD_SIZE,
        40,
        40
    ),
    groundMaterial
);

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

groundGroup.add(ground);


// ============================================================
// GROUND TILES
// ============================================================

const tileMaterial = new THREE.MeshStandardMaterial({
    color: 0x31463b,
    roughness: 1
});

for (let x = -WORLD_SIZE / 2; x < WORLD_SIZE / 2; x += 10) {

    for (
        let z = -WORLD_SIZE / 2;
        z < WORLD_SIZE / 2;
        z += 10
    ) {

        if (Math.random() < 0.35) {

            const tile = new THREE.Mesh(
                new THREE.PlaneGeometry(
                    9.7,
                    9.7
                ),
                tileMaterial
            );

            tile.rotation.x = -Math.PI / 2;

            tile.position.set(
                x + 5,
                0.015,
                z + 5
            );

            tile.material = tileMaterial;

            groundGroup.add(tile);
        }
    }
}


// ============================================================
// BUILDINGS
// ============================================================

const obstacles = [];


function createBuilding(
    x,
    z,
    width,
    depth,
    height
) {

    const group = new THREE.Group();

    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x26333a,
            roughness: 0.9,
            metalness: 0.15
        });

    const roofMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x182329,
            roughness: 0.8
        });


    const body = new THREE.Mesh(
        new THREE.BoxGeometry(
            width,
            height,
            depth
        ),
        wallMaterial
    );

    body.position.y = height / 2;

    body.castShadow = true;
    body.receiveShadow = true;

    group.add(body);


    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(
            width + 0.6,
            0.5,
            depth + 0.6
        ),
        roofMaterial
    );

    roof.position.y = height + 0.25;

    roof.castShadow = true;

    group.add(roof);


    // kleine ramen
    const windowMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x58e9ff,
            emissive: 0x164b59,
            emissiveIntensity: 1.5
        });


    const windowCount = Math.max(
        2,
        Math.floor(width / 4)
    );


    for (let i = 0; i < windowCount; i++) {

        const win = new THREE.Mesh(
            new THREE.BoxGeometry(
                1.1,
                1.2,
                0.08
            ),
            windowMaterial
        );

        win.position.set(
            -width / 2 + 2 + i * 3,
            height * 0.55,
            depth / 2 + 0.05
        );

        group.add(win);
    }


    group.position.set(
        x,
        0,
        z
    );

    buildingGroup.add(group);


    obstacles.push({
        x,
        z,
        width: width + 1.2,
        depth: depth + 1.2
    });


    return group;
}


// grotere gebouwen
createBuilding(-80, -80, 34, 26, 11);
createBuilding(20, -90, 26, 30, 14);
createBuilding(90, -60, 40, 24, 9);

createBuilding(-110, 0, 25, 36, 12);
createBuilding(80, 10, 32, 32, 13);

createBuilding(-90, 80, 42, 24, 10);
createBuilding(20, 85, 30, 30, 12);
createBuilding(100, 95, 24, 36, 15);

createBuilding(-10, 150, 45, 24, 9);


// ============================================================
// WALLS
// ============================================================

function createWall(x, z, width, depth) {

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x35454b,
            roughness: 1
        });


    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(
            width,
            2.6,
            depth
        ),
        material
    );

    wall.position.set(
        x,
        1.3,
        z
    );

    wall.castShadow = true;
    wall.receiveShadow = true;

    buildingGroup.add(wall);


    obstacles.push({
        x,
        z,
        width: width + 1,
        depth: depth + 1
    });
}


createWall(-30, -25, 30, 2);
createWall(50, 45, 40, 2);
createWall(-55, 55, 2, 35);
createWall(55, 115, 2, 35);


// ============================================================
// TREES
// ============================================================

function createTree(x, z, scale = 1) {

    const tree = new THREE.Group();


    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.8 * scale,
            1.1 * scale,
            5 * scale,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x4d3827
        })
    );

    trunk.position.y =
        2.5 * scale;

    trunk.castShadow = true;

    tree.add(trunk);


    const crown = new THREE.Mesh(
        new THREE.ConeGeometry(
            3.8 * scale,
            7 * scale,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x1c5139,
            roughness: 1
        })
    );

    crown.position.y =
        7 * scale;

    crown.castShadow = true;

    tree.add(crown);


    tree.position.set(
        x,
        0,
        z
    );

    decorationGroup.add(tree);
}


for (let i = 0; i < 90; i++) {

    const x =
        THREE.MathUtils.randFloatSpread(
            WORLD_SIZE - 20
        );

    const z =
        THREE.MathUtils.randFloatSpread(
            WORLD_SIZE - 20
        );


    // niet midden op de startplaats
    if (
        Math.abs(x) < 35 &&
        Math.abs(z) < 35
    ) {
        continue;
    }


    createTree(
        x,
        z,
        THREE.MathUtils.randFloat(
            0.7,
            1.3
        )
    );
}


// ============================================================
// ROCKS
// ============================================================

function createRock(x, z, scale = 1) {

    const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(
            1.6 * scale,
            0
        ),
        new THREE.MeshStandardMaterial({
            color: 0x536066,
            roughness: 1
        })
    );

    rock.position.set(
        x,
        1 * scale,
        z
    );

    rock.rotation.y =
        Math.random() * Math.PI;

    rock.castShadow = true;

    decorationGroup.add(rock);
}


for (let i = 0; i < 120; i++) {

    const x =
        THREE.MathUtils.randFloatSpread(
            WORLD_SIZE - 20
        );

    const z =
        THREE.MathUtils.randFloatSpread(
            WORLD_SIZE - 20
        );


    if (
        Math.abs(x) < 30 &&
        Math.abs(z) < 30
    ) {
        continue;
    }


    createRock(
        x,
        z,
        THREE.MathUtils.randFloat(
            0.5,
            1.5
        )
    );
}


// ============================================================
// SIGNAL TOWERS
// ============================================================

function createSignalTower(x, z) {

    const tower = new THREE.Group();


    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.35,
            0.5,
            12,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x53636b,
            metalness: 0.7,
            roughness: 0.35
        })
    );

    pole.position.y = 6;

    pole.castShadow = true;

    tower.add(pole);


    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
            2,
            0.12,
            8,
            32
        ),
        new THREE.MeshStandardMaterial({
            color: 0x58e9ff,
            emissive: 0x58e9ff,
            emissiveIntensity: 2
        })
    );

    ring.position.y = 10;

    ring.rotation.x =
        Math.PI / 2;

    tower.add(ring);


    const light = new THREE.PointLight(
        0x58e9ff,
        3,
        25
    );

    light.position.y = 10;

    tower.add(light);


    tower.position.set(
        x,
        0,
        z
    );

    decorationGroup.add(tower);
}


createSignalTower(140, 140);
createSignalTower(-145, -135);


// ============================================================
// TANK
// ============================================================

const tank = new THREE.Group();

scene.add(tank);


const tankBodyMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x33474a,
        roughness: 0.72,
        metalness: 0.35
    });


const tankDarkMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x151e21,
        roughness: 0.85,
        metalness: 0.2
    });


const tankGlowMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x58e9ff,
        emissive: 0x58e9ff,
        emissiveIntensity: 2
    });


// body
const tankBody = new THREE.Mesh(
    new THREE.BoxGeometry(
        5.2,
        1.7,
        7
    ),
    tankBodyMaterial
);

tankBody.position.y = 1.8;

tankBody.castShadow = true;

tank.add(tankBody);


// front armor
const frontArmor = new THREE.Mesh(
    new THREE.BoxGeometry(
        4.8,
        1.4,
        1.1
    ),
    tankBodyMaterial
);

frontArmor.position.set(
    0,
    2,
    -3.5
);

frontArmor.castShadow = true;

tank.add(frontArmor);


// left track
const leftTrack = new THREE.Mesh(
    new THREE.BoxGeometry(
        1.15,
        1.5,
        6.5
    ),
    tankDarkMaterial
);

leftTrack.position.set(
    -3,
    1.25,
    0
);

leftTrack.castShadow = true;

tank.add(leftTrack);


// right track
const rightTrack = new THREE.Mesh(
    new THREE.BoxGeometry(
        1.15,
        1.5,
        6.5
    ),
    tankDarkMaterial
);

rightTrack.position.set(
    3,
    1.25,
    0
);

rightTrack.castShadow = true;

tank.add(rightTrack);


// track wheels
function addTrackWheels(side) {

    for (let i = -2; i <= 2; i++) {

        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.62,
                0.62,
                1.35,
                16
            ),
            new THREE.MeshStandardMaterial({
                color: 0x0d1316,
                roughness: 0.8
            })
        );

        wheel.rotation.z =
            Math.PI / 2;

        wheel.position.set(
            side * 3,
            1.25,
            i * 1.15
        );

        wheel.castShadow = true;

        tank.add(wheel);
    }
}

addTrackWheels(-1);
addTrackWheels(1);


// turret pivot
const turret = new THREE.Group();

turret.position.set(
    0,
    3.0,
    0
);

tank.add(turret);


// turret base
const turretBase = new THREE.Mesh(
    new THREE.CylinderGeometry(
        2.15,
        2.3,
        0.85,
        16
    ),
    tankDarkMaterial
);

turretBase.position.y = 0;

turretBase.castShadow = true;

turret.add(turretBase);


// turret armor
const turretTop = new THREE.Mesh(
    new THREE.BoxGeometry(
        3.7,
        1.25,
        4.2
    ),
    tankBodyMaterial
);

turretTop.position.y = 0.65;

turretTop.castShadow = true;

turret.add(turretTop);


// weapon pivot
const weapon = new THREE.Group();

weapon.position.set(
    0,
    0.8,
    -2.0
);

turret.add(weapon);


// cannon
const cannon = new THREE.Mesh(
    new THREE.CylinderGeometry(
        0.28,
        0.4,
        7,
        16
    ),
    tankDarkMaterial
);

cannon.rotation.x =
    Math.PI / 2;

cannon.position.z =
    -3.3;

cannon.castShadow = true;

weapon.add(cannon);


// cannon glow ring
const cannonRing = new THREE.Mesh(
    new THREE.TorusGeometry(
        0.42,
        0.08,
        8,
        20
    ),
    tankGlowMaterial
);

cannonRing.position.z =
    -6.75;

cannonRing.rotation.x =
    Math.PI / 2;

weapon.add(cannonRing);


// turret sensor
const sensor = new THREE.Mesh(
    new THREE.SphereGeometry(
        0.25,
        12,
        12
    ),
    tankGlowMaterial
);

sensor.position.set(
    0,
    1.45,
    0
);

turret.add(sensor);


// tank lights
const frontLightMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x58e9ff,
        emissive: 0x58e9ff,
        emissiveIntensity: 3
    });


for (const side of [-1, 1]) {

    const lightMesh = new THREE.Mesh(
        new THREE.BoxGeometry(
            0.5,
            0.35,
            0.2
        ),
        frontLightMaterial
    );

    lightMesh.position.set(
        side * 1.6,
        2.25,
        -3.58
    );

    tank.add(lightMesh);
}


// start position
tank.position.set(
    0,
    0,
    0
);


// ============================================================
// ENEMIES
// ============================================================

const enemies = [];


function createEnemy(x, z) {

    const enemy = new THREE.Group();


    const bodyMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x7c9b63,
            roughness: 0.8
        });


    const darkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x1c2922,
            roughness: 0.9
        });


    const body = new THREE.Mesh(
        new THREE.BoxGeometry(
            2.5,
            1.7,
            3
        ),
        bodyMaterial
    );

    body.position.y = 1.4;

    body.castShadow = true;

    enemy.add(body);


    const head = new THREE.Mesh(
        new THREE.SphereGeometry(
            0.8,
            12,
            12
        ),
        bodyMaterial
    );

    head.position.set(
        0,
        2.6,
        -0.5
    );

    head.castShadow = true;

    enemy.add(head);


    const eyeMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xff5964,
            emissive: 0xff2535,
            emissiveIntensity: 2
        });


    const eye = new THREE.Mesh(
        new THREE.BoxGeometry(
            0.65,
            0.18,
            0.15
        ),
        eyeMaterial
    );

    eye.position.set(
        0,
        2.7,
        -1.2
    );

    enemy.add(eye);


    const legMaterial = darkMaterial;


    for (const side of [-1, 1]) {

        for (const front of [-1, 1]) {

            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.55,
                    1.1,
                    0.65
                ),
                legMaterial
            );

            leg.position.set(
                side * 0.8,
                0.55,
                front * 0.9
            );

            leg.castShadow = true;

            enemy.add(leg);
        }
    }


    enemy.position.set(
        x,
        0,
        z
    );


    enemy.userData.health = 5;
    enemy.userData.maxHealth = 5;
    enemy.userData.speed =
        THREE.MathUtils.randFloat(
            2.2,
            3.5
        );

    enemy.userData.attackCooldown = 0;


    enemyGroup.add(enemy);
    enemies.push(enemy);

    return enemy;
}


// initial enemies
for (let i = 0; i < 8; i++) {

    const angle =
        Math.random() *
        Math.PI *
        2;

    const distance =
        THREE.MathUtils.randFloat(
            55,
            130
        );

    createEnemy(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance
    );
}


// ============================================================
// BULLETS
// ============================================================

const bullets = [];


function shoot() {

    if (!gameRunning || paused || gameOver) {
        return;
    }

    if (shotCooldown > 0) {
        return;
    }

    if (ammo <= 0) {
        ammo = 12;
        updateHUD();
        return;
    }


    ammo--;

    shotCooldown = 0.28;


    const bulletMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x58e9ff,
            emissive: 0x58e9ff,
            emissiveIntensity: 5
        });


    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(
            0.18,
            10,
            10
        ),
        bulletMaterial
    );


    const direction =
        new THREE.Vector3(
            0,
            0,
            -1
        );


    direction.applyQuaternion(
        weapon.getWorldQuaternion(
            new THREE.Quaternion()
        )
    );


    const start =
        new THREE.Vector3();

    weapon.getWorldPosition(start);


    bullet.position.copy(start);

    bulletGroup.add(bullet);


    bullets.push({
        mesh: bullet,
        direction: direction.normalize(),
        speed: 45,
        life: 2.5
    });


    updateHUD();
}


// ============================================================
// MOUSE AIM
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

const aimPoint =
    new THREE.Vector3();


function updateMousePosition(event) {

    mouseX = event.clientX;
    mouseY = event.clientY;


    mouse.x =
        (event.clientX /
            window.innerWidth) *
            2 -
        1;

    mouse.y =
        -(event.clientY /
            window.innerHeight) *
            2 +
        1;
}


window.addEventListener(
    "mousemove",
    updateMousePosition
);


function updateTurretAim() {

    if (!gameRunning || paused) {
        return;
    }


    raycaster.setFromCamera(
        mouse,
        camera
    );


    if (
        raycaster.ray.intersectPlane(
            aimPlane,
            aimPoint
        )
    ) {

        const turretWorld =
            new THREE.Vector3();

        turret.getWorldPosition(
            turretWorld
        );


        const dx =
            aimPoint.x -
            turretWorld.x;

        const dz =
            aimPoint.z -
            turretWorld.z;


        if (
            Math.abs(dx) +
            Math.abs(dz) >
            0.01
        ) {

            const worldAngle =
                Math.atan2(
                    -dx,
                    -dz
                );


            const tankWorldAngle =
                tank.rotation.y;


            let localAngle =
                worldAngle -
                tankWorldAngle;


            localAngle =
                Math.atan2(
                    Math.sin(localAngle),
                    Math.cos(localAngle)
                );


            turret.rotation.y =
                localAngle;
        }
    }
}


// ============================================================
// CAMERA
// ============================================================

const cameraOffset =
    new THREE.Vector3(
        0,
        10,
        18
    );


function updateCamera() {

    // De camera blijft ALTIJD achter de tank.
    // De turret beïnvloedt de camera NIET.

    const desired =
        new THREE.Vector3(
            0,
            cameraOffset.y,
            cameraOffset.z
        );


    desired.applyQuaternion(
        tank.quaternion
    );


    desired.add(
        tank.position
    );


    camera.position.lerp(
        desired,
        0.12
    );


    const lookAt =
        new THREE.Vector3(
            tank.position.x,
            tank.position.y + 1.7,
            tank.position.z
        );


    camera.lookAt(
        lookAt
    );
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

            togglePause();
        }


        if (
            event.code === "KeyM" &&
            gameRunning
        ) {

            toggleMap();
        }


        if (
            event.code === "Space" &&
            gameRunning &&
            !paused
        ) {

            dash();
        }
    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;
    }
);


function isBlocked(
    x,
    z
) {

    const tankRadius = 3.2;


    if (
        x < -WORLD_SIZE / 2 + tankRadius ||
        x > WORLD_SIZE / 2 - tankRadius ||
        z < -WORLD_SIZE / 2 + tankRadius ||
        z > WORLD_SIZE / 2 - tankRadius
    ) {
        return true;
    }


    for (
        const obstacle of obstacles
    ) {

        const halfW =
            obstacle.width / 2;

        const halfD =
            obstacle.depth / 2;


        if (
            x > obstacle.x - halfW - tankRadius &&
            x < obstacle.x + halfW + tankRadius &&
            z > obstacle.z - halfD - tankRadius &&
            z < obstacle.z + halfD + tankRadius
        ) {

            return true;
        }
    }


    return false;
}


function moveTank(
    delta
) {

    if (!gameRunning || paused || gameOver) {
        return;
    }


    let forward = 0;
    let turn = 0;


    if (keys["KeyW"] || keys["ArrowUp"]) {
        forward += 1;
    }


    if (keys["KeyS"] || keys["ArrowDown"]) {
        forward -= 1;
    }


    if (keys["KeyA"] || keys["ArrowLeft"]) {
        turn += 1;
    }


    if (keys["KeyD"] || keys["ArrowRight"]) {
        turn -= 1;
    }


    const sprint =
        keys["ShiftLeft"] ||
        keys["ShiftRight"];


    const speed =
        sprint ? 12 : 7;


    const turnSpeed =
        sprint ? 1.8 : 2.1;


    tank.rotation.y +=
        turn *
        turnSpeed *
        delta;


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


        const oldX =
            tank.position.x;

        const oldZ =
            tank.position.z;


        const moveDistance =
            forward *
            speed *
            delta;


        tank.position.x +=
            direction.x *
            moveDistance;

        tank.position.z +=
            direction.z *
            moveDistance;


        if (
            isBlocked(
                tank.position.x,
                tank.position.z
            )
        ) {

            tank.position.x =
                oldX;

            tank.position.z =
                oldZ;
        }


        energy -=
            sprint
                ? delta * 8
                : delta * 2;


        if (energy < 0) {
            energy = 0;
        }
    }


    if (!sprint && energy < 100) {

        energy +=
            delta * 4;

        if (energy > 100) {
            energy = 100;
        }
    }


    updateHUD();
}


// ============================================================
// DASH
// ============================================================

function dash() {

    if (
        energy < 25 ||
        dashCooldown > 0 ||
        paused ||
        !gameRunning
    ) {
        return;
    }


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


    const oldX =
        tank.position.x;

    const oldZ =
        tank.position.z;


    tank.position.x +=
        direction.x * 13;

    tank.position.z +=
        direction.z * 13;


    if (
        isBlocked(
            tank.position.x,
            tank.position.z
        )
    ) {

        tank.position.x =
            oldX;

        tank.position.z =
            oldZ;
    }


    updateHUD();
}


// ============================================================
// ENEMY AI
// ============================================================

function updateEnemies(
    delta
) {

    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy =
            enemies[i];


        if (
            !enemy.parent
        ) {

            enemies.splice(i, 1);
            continue;
        }


        const dx =
            tank.position.x -
            enemy.position.x;

        const dz =
            tank.position.z -
            enemy.position.z;


        const distance =
            Math.hypot(
                dx,
                dz
            );


        if (distance > 5) {

            const direction =
                new THREE.Vector3(
                    dx,
                    0,
                    dz
                ).normalize();


            const speed =
                enemy.userData.speed;


            const oldX =
                enemy.position.x;

            const oldZ =
                enemy.position.z;


            enemy.position.x +=
                direction.x *
                speed *
                delta;

            enemy.position.z +=
                direction.z *
                speed *
                delta;


            if (
                isBlocked(
                    enemy.position.x,
                    enemy.position.z
                )
            ) {

                enemy.position.x =
                    oldX;

                enemy.position.z =
                    oldZ;
            }
        }


        enemy.lookAt(
            tank.position.x,
            enemy.position.y,
            tank.position.z
        );


        enemy.userData.attackCooldown -=
            delta;


        if (
            distance < 7 &&
            enemy.userData.attackCooldown <= 0
        ) {

            health -= 8;

            enemy.userData.attackCooldown =
                1.2;


            if (health <= 0) {

                health = 0;

                endGame();
            }


            updateHUD();
        }
    }
}


// ============================================================
// BULLET COLLISION
// ============================================================

function updateBullets(
    delta
) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        bullet.mesh.position.add(
            bullet.direction.clone().multiplyScalar(
                bullet.speed * delta
            )
        );


        bullet.life -= delta;


        let removeBullet =
            bullet.life <= 0;


        // world border
        if (
            Math.abs(bullet.mesh.position.x) >
                WORLD_SIZE / 2 ||
            Math.abs(bullet.mesh.position.z) >
                WORLD_SIZE / 2
        ) {

            removeBullet = true;
        }


        // building collision
        if (!removeBullet) {

            for (
                const obstacle of obstacles
            ) {

                const halfW =
                    obstacle.width / 2;

                const halfD =
                    obstacle.depth / 2;


                if (
                    bullet.mesh.position.x >
                        obstacle.x - halfW &&
                    bullet.mesh.position.x <
                        obstacle.x + halfW &&
                    bullet.mesh.position.z >
                        obstacle.z - halfD &&
                    bullet.mesh.position.z <
                        obstacle.z + halfD
                ) {

                    removeBullet = true;
                    break;
                }
            }
        }


        // enemy collision
        if (!removeBullet) {

            for (
                let j = enemies.length - 1;
                j >= 0;
                j--
            ) {

                const enemy =
                    enemies[j];


                if (!enemy.parent) {
                    continue;
                }


                const dx =
                    enemy.position.x -
                    bullet.mesh.position.x;

                const dz =
                    enemy.position.z -
                    bullet.mesh.position.z;


                const distance =
                    Math.hypot(
                        dx,
                        dz
                    );


                if (distance < 3) {

                    enemy.userData.health -= 1;

                    removeBullet = true;


                    if (
                        enemy.userData.health <= 0
                    ) {

                        enemyGroup.remove(
                            enemy
                        );


                        kills++;

                        credits += 10;

                        updateHUD();


                        showAchievement(
                            "SIGNAL DEFENDER"
                        );
                    }


                    break;
                }
            }
        }


        if (removeBullet) {

            bulletGroup.remove(
                bullet.mesh
            );

            bullets.splice(i, 1);
        }
    }
}


// ============================================================
// ENEMY SPAWN
// ============================================================

let enemySpawnTimer = 0;


function spawnEnemies(
    delta
) {

    enemySpawnTimer -= delta;


    if (
        enemySpawnTimer > 0
    ) {
        return;
    }


    enemySpawnTimer = 7;


    if (
        enemies.length >= 12
    ) {
        return;
    }


    const angle =
        Math.random() *
        Math.PI *
        2;


    const distance =
        THREE.MathUtils.randFloat(
            80,
            130
        );


    const x =
        tank.position.x +
        Math.cos(angle) *
        distance;


    const z =
        tank.position.z +
        Math.sin(angle) *
        distance;


    if (
        Math.abs(x) < WORLD_SIZE / 2 - 10 &&
        Math.abs(z) < WORLD_SIZE / 2 - 10
    ) {

        createEnemy(
            x,
            z
        );
    }
}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    if (healthBar) {
        healthBar.style.width =
            `${Math.max(0, health)}%`;
    }


    if (energyBar) {
        energyBar.style.width =
            `${Math.max(0, energy)}%`;
    }


    if (ammoText) {
        ammoText.textContent =
            ammo;
    }


    if (killsText) {
        killsText.textContent =
            `KILLS ${String(kills).padStart(2, "0")}`;
    }


    if (creditsText) {
        creditsText.textContent =
            `CREDITS ${String(credits).padStart(3, "0")}`;
    }


    if (objectiveText) {
        objectiveText.textContent =
            objective;
    }


    if (zoneText) {

        const distance =
            Math.hypot(
                tank.position.x,
                tank.position.z
            );


        if (distance < 70) {
            zoneText.textContent =
                "INNER SECTOR";
        } else if (distance < 150) {
            zoneText.textContent =
                "MID SECTOR";
        } else {
            zoneText.textContent =
                "OUTER SECTOR";
        }
    }
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

const achievements = {
    firstRun: false,
    firstKill: false,
    explorer: false,
    defender: false
};


function showAchievement(
    name
) {

    if (!achievementBox) {
        return;
    }


    achievementName.textContent =
        name;


    achievementBox.style.display =
        "flex";


    setTimeout(() => {

        achievementBox.style.display =
            "none";

    }, 3000);
}


// ============================================================
// START GAME
// ============================================================

function resetGame() {

    health = 100;
    energy = 100;
    ammo = 12;

    kills = 0;
    credits = 0;

    shotCooldown = 0;
    dashCooldown = 0;

    enemySpawnTimer = 4;

    objective =
        "LOCATE THE SIGNAL";


    gameOver = false;
    paused = false;
    mapOpen = false;


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


    turret.rotation.set(
        0,
        0,
        0
    );


    // verwijder oude bullets
    for (
        const bullet of bullets
    ) {

        bulletGroup.remove(
            bullet.mesh
        );
    }

    bullets.length = 0;


    // verwijder oude enemies
    for (
        const enemy of enemies
    ) {

        enemyGroup.remove(
            enemy
        );
    }

    enemies.length = 0;


    for (let i = 0; i < 8; i++) {

        const angle =
            Math.random() *
            Math.PI *
            2;

        const distance =
            THREE.MathUtils.randFloat(
                55,
                130
            );


        createEnemy(
            Math.cos(angle) * distance,
            Math.sin(angle) * distance
        );
    }


    updateHUD();
}


// ============================================================
// START
// ============================================================

function startGame() {

    resetGame();


    gameRunning = true;
    paused = false;
    gameOver = false;


    menu.style.display =
        "none";

    hud.style.display =
        "block";

    pauseScreen.style.display =
        "none";

    mapScreen.style.display =
        "none";


    canvas.style.display =
        "block";


    showAchievement(
        "FIRST ECHO"
    );
}


// ============================================================
// PAUSE
// ============================================================

function togglePause() {

    if (
        !gameRunning ||
        gameOver
    ) {
        return;
    }


    paused =
        !paused;


    pauseScreen.style.display =
        paused
            ? "flex"
            : "none";
}


function resumeGame() {

    paused = false;

    pauseScreen.style.display =
        "none";
}


// ============================================================
// SAVE
// ============================================================

function saveGame() {

    const saveData = {

        health,
        energy,
        ammo,
        kills,
        credits,

        x: tank.position.x,
        z: tank.position.z,

        rotation: tank.rotation.y,

        savedAt:
            Date.now()
    };


    localStorage.setItem(
        "echobound-save",
        JSON.stringify(saveData)
    );


    showAchievement(
        "RUN SAVED"
    );
}


// ============================================================
// LOAD
// ============================================================

function loadGame() {

    const raw =
        localStorage.getItem(
            "echobound-save"
        );


    if (!raw) {

        alert(
            "Er is nog geen opgeslagen run."
        );

        return;
    }


    try {

        const data =
            JSON.parse(raw);


        resetGame();


        health =
            Number(data.health ?? 100);

        energy =
            Number(data.energy ?? 100);

        ammo =
            Number(data.ammo ?? 12);

        kills =
            Number(data.kills ?? 0);

        credits =
            Number(data.credits ?? 0);


        tank.position.x =
            Number(data.x ?? 0);

        tank.position.z =
            Number(data.z ?? 0);

        tank.rotation.y =
            Number(data.rotation ?? 0);


        gameRunning = true;
        paused = false;
        gameOver = false;


        menu.style.display =
            "none";

        hud.style.display =
            "block";

        pauseScreen.style.display =
            "none";

        mapScreen.style.display =
            "none";


        updateHUD();


        showAchievement(
            "RUN RESTORED"
        );

    } catch (error) {

        console.error(error);

        alert(
            "De save kon niet worden geladen."
        );
    }
}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    if (gameOver) {
        return;
    }


    gameOver = true;
    gameRunning = false;


    hud.style.display =
        "none";


    pauseScreen.style.display =
        "none";


    menu.style.display =
        "flex";


    objective =
        "RUN TERMINATED";


    showAchievement(
        "EXPEDITION LOST"
    );
}


// ============================================================
// MAP
// ============================================================

function toggleMap() {

    if (!gameRunning) {
        return;
    }


    mapOpen =
        !mapOpen;


    mapScreen.style.display =
        mapOpen
            ? "flex"
            : "none";


    if (mapOpen) {
        drawMap();
    }
}


function drawMap() {

    if (!mapCanvas || !mapCtx) {
        return;
    }


    const rect =
        mapCanvas.getBoundingClientRect();


    const width =
        Math.max(
            300,
            Math.floor(rect.width)
        );


    const height =
        Math.max(
            300,
            Math.floor(rect.height)
        );


    mapCanvas.width =
        width;

    mapCanvas.height =
        height;


    mapCtx.fillStyle =
        "#061015";

    mapCtx.fillRect(
        0,
        0,
        width,
        height
    );


    const scale =
        Math.min(
            width,
            height
        ) /
        WORLD_SIZE;


    mapCtx.strokeStyle =
        "rgba(88,233,255,.18)";

    mapCtx.lineWidth = 1;


    for (
        let x = 0;
        x < width;
        x += 40
    ) {

        mapCtx.beginPath();

        mapCtx.moveTo(
            x,
            0
        );

        mapCtx.lineTo(
            x,
            height
        );

        mapCtx.stroke();
    }


    for (
        let y = 0;
        y < height;
        y += 40
    ) {

        mapCtx.beginPath();

        mapCtx.moveTo(
            0,
            y
        );

        mapCtx.lineTo(
            width,
            y
        );

        mapCtx.stroke();
    }


    // buildings
    mapCtx.fillStyle =
        "rgba(88,233,255,.16)";


    for (
        const obstacle of obstacles
    ) {

        const px =
            width / 2 +
            obstacle.x * scale;

        const py =
            height / 2 +
            obstacle.z * scale;


        mapCtx.fillRect(
            px -
                obstacle.width *
                scale /
                2,

            py -
                obstacle.depth *
                scale /
                2,

            obstacle.width *
                scale,

            obstacle.depth *
                scale
        );
    }


    // enemies
    mapCtx.fillStyle =
        "#ff5964";


    for (
        const enemy of enemies
    ) {

        const px =
            width / 2 +
            enemy.position.x *
            scale;

        const py =
            height / 2 +
            enemy.position.z *
            scale;


        mapCtx.beginPath();

        mapCtx.arc(
            px,
            py,
            4,
            0,
            Math.PI * 2
        );

        mapCtx.fill();
    }


    // player
    const playerX =
        width / 2 +
        tank.position.x *
        scale;

    const playerY =
        height / 2 +
        tank.position.z *
        scale;


    mapCtx.fillStyle =
        "#58e9ff";


    mapCtx.beginPath();

    mapCtx.arc(
        playerX,
        playerY,
        7,
        0,
        Math.PI * 2
    );

    mapCtx.fill();


    // player direction
    const direction =
        new THREE.Vector3(
            0,
            0,
            -1
        );

    direction.applyQuaternion(
        tank.quaternion
    );


    mapCtx.strokeStyle =
        "#58e9ff";

    mapCtx.lineWidth = 2;

    mapCtx.beginPath();

    mapCtx.moveTo(
        playerX,
        playerY
    );

    mapCtx.lineTo(
        playerX +
            direction.x *
            20,

        playerY +
            direction.z *
            20
    );

    mapCtx.stroke();
}


// ============================================================
// BUTTONS
// ============================================================

newGameButton?.addEventListener(
    "click",
    startGame
);


loadGameButton?.addEventListener(
    "click",
    loadGame
);


resumeButton?.addEventListener(
    "click",
    resumeGame
);


saveButton?.addEventListener(
    "click",
    saveGame
);


quitButton?.addEventListener(
    "click",
    () => {

        gameRunning = false;
        paused = false;
        gameOver = false;

        pauseScreen.style.display =
            "none";

        hud.style.display =
            "none";

        mapScreen.style.display =
            "none";

        menu.style.display =
            "flex";
    }
);


closeMapButton?.addEventListener(
    "click",
    () => {

        mapOpen = false;

        mapScreen.style.display =
            "none";
    }
);


// ============================================================
// ACHIEVEMENTS BUTTON
// ============================================================

achievementsButton?.addEventListener(
    "click",
    () => {

        alert(
            "ACHIEVEMENTS\n\n" +
            "✓ FIRST ECHO\n" +
            "✓ SIGNAL DEFENDER\n" +
            "○ EXPLORER\n" +
            "○ THE LOST SIGNAL"
        );
    }
);


// ============================================================
// CONTROLS BUTTON
// ============================================================

controlsButton?.addEventListener(
    "click",
    () => {

        alert(
            "CONTROLS\n\n" +
            "W / S = bewegen\n" +
            "A / D = tank draaien\n" +
            "MUIS = turret richten\n" +
            "LINKER MUISKLIK = schieten\n" +
            "SHIFT = sprint\n" +
            "SPACE = dash\n" +
            "M = kaart\n" +
            "ESC = pauze"
        );
    }
);


// ============================================================
// SHOOTING INPUT
// ============================================================

window.addEventListener(
    "mousedown",
    event => {

        if (
            event.button === 0 &&
            gameRunning &&
            !paused
        ) {

            firing = true;

            shoot();
        }
    }
);


window.addEventListener(
    "mouseup",
    event => {

        if (
            event.button === 0
        ) {

            firing = false;
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


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );


        if (mapOpen) {
            drawMap();
        }
    }
);


// ============================================================
// GAME LOOP
// ============================================================

function gameLoop(
    currentTime
) {

    requestAnimationFrame(
        gameLoop
    );


    let delta =
        (currentTime - lastTime) /
        1000;


    lastTime =
        currentTime;


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

        if (shotCooldown > 0) {
            shotCooldown -= delta;
        }


        if (dashCooldown > 0) {
            dashCooldown -= delta;
        }


        moveTank(delta);

        updateTurretAim();

        updateEnemies(delta);

        updateBullets(delta);

        spawnEnemies(delta);


        if (firing) {
            shoot();
        }


        updateCamera();


        if (mapOpen) {
            drawMap();
        }
    }


    renderer.render(
        scene,
        camera
    );
}


// ============================================================
// INITIAL CAMERA
// ============================================================

camera.position.set(
    0,
    10,
    18
);

camera.lookAt(
    0,
    1.5,
    0
);


// ============================================================
// INITIAL HUD
// ============================================================

updateHUD();


// ============================================================
// START LOOP
// ============================================================

requestAnimationFrame(
    gameLoop
);


// ============================================================
// DEBUG
// ============================================================

console.log(
    "ECHOBOUND 3D ENGINE ONLINE"
);
```
