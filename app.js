// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// Complete 3D Tank Game
// ============================================================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    get
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDI32LBA050EFJujB5N_1QonDxbxhAOATg",
    authDomain: "echobound-52fdb.firebaseapp.com",
    databaseURL: "https://echobound-52fdb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "echobound-52fdb",
    storageBucket: "echobound-52fdb.firebasestorage.app",
    messagingSenderId: "1009201119169",
    appId: "1:1009201119169:web:6adf0afd74b7df66d73940"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

let firebaseUser = null;
let firebaseReady = false;

signInAnonymously(auth)
    .then((result) => {
        firebaseUser = result.user;
        firebaseReady = true;

        console.log("Firebase verbonden!");
        console.log("Firebase UID:", firebaseUser.uid);
    })
    .catch((error) => {
        console.error("Firebase login mislukt:", error);
    });


// ============================================================
// HTML ELEMENTS
// ============================================================

const canvas = document.getElementById("game");

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const pauseScreen = document.getElementById("pause");
const achievementPanel = document.getElementById("achievement");
const mapScreen = document.getElementById("map");

const healthBar = document.getElementById("healthBar");
const energyBar = document.getElementById("energyBar");

const ammoText = document.getElementById("ammo");
const killsText = document.getElementById("kills");
const creditsText = document.getElementById("credits");
const zoneText = document.getElementById("zone");

const objectiveText = document.getElementById("objective");
const achievementName = document.getElementById("achievementName");


// ============================================================
// THREE.JS
// ============================================================

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x071016);

scene.fog = new THREE.Fog(
    0x071016,
    45,
    190
);


// ============================================================
// CAMERA
// ============================================================

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

camera.position.set(
    0,
    8,
    15
);


// ============================================================
// LIGHTING
// ============================================================

const ambientLight = new THREE.HemisphereLight(
    0x8ab8c9,
    0x10151a,
    1.5
);

scene.add(ambientLight);


const sunLight = new THREE.DirectionalLight(
    0xbfdcff,
    2.4
);

sunLight.position.set(
    40,
    70,
    20
);

sunLight.castShadow = true;

sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;

sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;

scene.add(sunLight);


// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;
let gamePaused = false;
let gameOver = false;

let elapsedTime = 0;

let wave = 1;


// ============================================================
// PLAYER
// ============================================================

const player = {

    position: new THREE.Vector3(
        0,
        0,
        20
    ),

    rotation: Math.PI,

    turretRotation: 0,

    health: 100,
    maxHealth: 100,

    energy: 100,
    maxEnergy: 100,

    ammo: 12,
    maxAmmo: 12,

    kills: 0,
    credits: 0,

    speed: 9,
    reverseSpeed: 5,

    turnSpeed: 1.8,

    fireCooldown: 0,

    reloadTimer: 0,

    reloadTime: 1.6,

    isReloading: false,

    recoil: 0
};


// ============================================================
// CAMERA SETTINGS
// ============================================================

const CAMERA_DISTANCE = 14;
const CAMERA_HEIGHT = 6.5;
const CAMERA_TARGET_HEIGHT = 1.5;

let cameraYaw = 0;
let cameraPitch = 0.25;

const CAMERA_SENSITIVITY = 0.0025;

const MIN_CAMERA_PITCH = -0.35;
const MAX_CAMERA_PITCH = 0.75;

let pointerLocked = false;


// ============================================================
// TANK
// ============================================================

const tank = new THREE.Group();

tank.position.copy(player.position);

scene.add(tank);


// ============================================================
// TANK MATERIALS
// ============================================================

const tankDark = new THREE.MeshStandardMaterial({
    color: 0x151d22,
    metalness: 0.8,
    roughness: 0.3
});

const tankMain = new THREE.MeshStandardMaterial({
    color: 0x34454d,
    metalness: 0.75,
    roughness: 0.32
});

const tankLight = new THREE.MeshStandardMaterial({
    color: 0x687c83,
    metalness: 0.8,
    roughness: 0.25
});

const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x39d9ff
});


// ============================================================
// TANK BODY
// ============================================================

const bodyGeometry = new THREE.BoxGeometry(
    5.2,
    1.7,
    7
);

const body = new THREE.Mesh(
    bodyGeometry,
    tankMain
);

body.position.y = 1.6;

body.castShadow = true;
body.receiveShadow = true;

tank.add(body);


// ============================================================
// FRONT ARMOR
// ============================================================

const frontArmorGeometry = new THREE.BoxGeometry(
    5.6,
    1.5,
    1.2
);

const frontArmor = new THREE.Mesh(
    frontArmorGeometry,
    tankLight
);

frontArmor.position.set(
    0,
    1.8,
    -3.45
);

frontArmor.rotation.x = -0.15;

frontArmor.castShadow = true;

tank.add(frontArmor);


// ============================================================
// TOP ARMOR
// ============================================================

const topGeometry = new THREE.BoxGeometry(
    4.5,
    0.65,
    4.7
);

const top = new THREE.Mesh(
    topGeometry,
    tankDark
);

top.position.y = 2.65;

top.castShadow = true;

tank.add(top);


// ============================================================
// TRACKS
// ============================================================

function createTrack(x) {

    const group = new THREE.Group();

    const trackBody = new THREE.Mesh(
        new THREE.BoxGeometry(
            1.1,
            1.8,
            6.8
        ),
        tankDark
    );

    trackBody.position.x = x;
    trackBody.position.y = 1.35;

    trackBody.castShadow = true;

    group.add(trackBody);


    for (let i = 0; i < 7; i++) {

        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.48,
                0.48,
                0.3,
                16
            ),
            tankLight
        );

        wheel.rotation.z = Math.PI / 2;

        wheel.position.set(
            x,
            1.15,
            -2.6 + i * 0.85
        );

        wheel.castShadow = true;

        tank.add(wheel);
    }

    tank.add(group);
}

createTrack(-2.6);
createTrack(2.6);


// ============================================================
// GLOW STRIPS
// ============================================================

function createGlowStrip(x) {

    const strip = new THREE.Mesh(
        new THREE.BoxGeometry(
            0.12,
            0.12,
            5
        ),
        glowMaterial
    );

    strip.position.set(
        x,
        2.35,
        0
    );

    tank.add(strip);
}

createGlowStrip(-2.3);
createGlowStrip(2.3);


// ============================================================
// TURRET
// ============================================================

const turret = new THREE.Group();

turret.position.y = 3.15;

tank.add(turret);


const turretBase = new THREE.Mesh(
    new THREE.CylinderGeometry(
        1.9,
        2.2,
        0.7,
        16
    ),
    tankDark
);

turretBase.castShadow = true;

turret.add(turretBase);


// ============================================================
// TURRET TOP
// ============================================================

const turretTop = new THREE.Mesh(
    new THREE.BoxGeometry(
        3.2,
        1,
        3.8
    ),
    tankMain
);

turretTop.position.z = 0.1;

turretTop.castShadow = true;

turret.add(turretTop);


// ============================================================
// CANNON
// ============================================================

const cannonGroup = new THREE.Group();

cannonGroup.position.set(
    0,
    0.1,
    -2
);

turret.add(cannonGroup);


const cannon = new THREE.Mesh(
    new THREE.CylinderGeometry(
        0.28,
        0.34,
        6,
        16
    ),
    tankLight
);

cannon.rotation.x = Math.PI / 2;

cannon.position.z = -2.7;

cannon.castShadow = true;

cannonGroup.add(cannon);


// ============================================================
// CANNON TIP
// ============================================================

const cannonTip = new THREE.Mesh(
    new THREE.CylinderGeometry(
        0.42,
        0.42,
        0.7,
        16
    ),
    tankDark
);

cannonTip.rotation.x = Math.PI / 2;

cannonTip.position.z = -5.7;

cannonGroup.add(cannonTip);


// ============================================================
// MUZZLE
// ============================================================

const muzzle = new THREE.Object3D();

muzzle.position.set(
    0,
    0,
    -6
);

cannonGroup.add(muzzle);


// ============================================================
// ENVIRONMENT
// ============================================================

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(
        400,
        400
    ),
    new THREE.MeshStandardMaterial({
        color: 0x172328,
        roughness: 1
    })
);

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);


// ============================================================
// GRID
// ============================================================

const grid = new THREE.GridHelper(
    400,
    80,
    0x28444d,
    0x16272d
);

grid.position.y = 0.03;

scene.add(grid);


// ============================================================
// OBSTACLES
// ============================================================

const obstacles = [];


// ============================================================
// ROCK
// ============================================================

function createRock(x, z, scale = 1) {

    const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(
            2 * scale,
            1
        ),
        new THREE.MeshStandardMaterial({
            color: 0x38454a,
            roughness: 1
        })
    );

    rock.position.set(
        x,
        1.3 * scale,
        z
    );

    rock.scale.y = 0.8;

    rock.castShadow = true;
    rock.receiveShadow = true;

    scene.add(rock);

    obstacles.push({
        object: rock,
        radius: 2.5 * scale
    });
}


// ============================================================
// TREE
// ============================================================

function createTree(x, z) {

    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.7,
            1,
            5,
            10
        ),
        new THREE.MeshStandardMaterial({
            color: 0x46362a,
            roughness: 1
        })
    );

    trunk.position.y = 2.5;

    trunk.castShadow = true;

    tree.add(trunk);


    const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(
            3.2,
            1
        ),
        new THREE.MeshStandardMaterial({
            color: 0x1c4637,
            roughness: 1
        })
    );

    crown.position.y = 6;

    crown.castShadow = true;

    tree.add(crown);

    tree.position.set(
        x,
        0,
        z
    );

    scene.add(tree);

    obstacles.push({
        object: tree,
        radius: 3
    });
}


// ============================================================
// BUILDING
// ============================================================

function createBuilding(x, z) {

    const building = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(
            10,
            5,
            10
        ),
        new THREE.MeshStandardMaterial({
            color: 0x29363b,
            roughness: 0.9
        })
    );

    base.position.y = 2.5;

    base.castShadow = true;
    base.receiveShadow = true;

    building.add(base);


    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(
            10.8,
            0.7,
            10.8
        ),
        tankDark
    );

    roof.position.y = 5.35;

    roof.castShadow = true;

    building.add(roof);

    building.position.set(
        x,
        0,
        z
    );

    scene.add(building);

    obstacles.push({
        object: building,
        radius: 7
    });
}


// ============================================================
// CREATE WORLD
// ============================================================

function createWorld() {

    for (let i = 0; i < 25; i++) {

        const x =
            (Math.random() - 0.5) * 180;

        const z =
            (Math.random() - 0.5) * 180;

        if (
            Math.abs(x) < 20 &&
            Math.abs(z) < 20
        ) {
            continue;
        }

        createRock(
            x,
            z,
            0.7 + Math.random() * 0.8
        );
    }


    for (let i = 0; i < 18; i++) {

        const x =
            (Math.random() - 0.5) * 180;

        const z =
            (Math.random() - 0.5) * 180;

        if (
            Math.abs(x) < 25 &&
            Math.abs(z) < 25
        ) {
            continue;
        }

        createTree(x, z);
    }


    createBuilding(
        -35,
        -20
    );

    createBuilding(
        38,
        25
    );

    createBuilding(
        -45,
        45
    );
}

createWorld();


// ============================================================
// SIGNAL TOWER
// ============================================================

const signalTower = new THREE.Group();

signalTower.position.set(
    0,
    0,
    -65
);

scene.add(signalTower);


const towerPole = new THREE.Mesh(
    new THREE.CylinderGeometry(
        0.7,
        1,
        18,
        10
    ),
    tankDark
);

towerPole.position.y = 9;

towerPole.castShadow = true;

signalTower.add(towerPole);


const towerTop = new THREE.Mesh(
    new THREE.SphereGeometry(
        2,
        16,
        16
    ),
    new THREE.MeshBasicMaterial({
        color: 0x3fe8ff
    })
);

towerTop.position.y = 18;

signalTower.add(towerTop);


// ============================================================
// ENEMIES
// ============================================================

const enemies = [];


// ============================================================
// ENEMY MATERIALS
// ============================================================

const enemyBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a2025,
    metalness: 0.35,
    roughness: 0.7
});

const enemyDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b1215,
    metalness: 0.5,
    roughness: 0.65
});

const enemyEyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff2838
});


// ============================================================
// CREATE ENEMY
// ============================================================

function createEnemy(x, z, type = "stalker") {

    const enemy = new THREE.Group();

    let health = 80;
    let speed = 2.3;
    let radius = 2;
    let height = 7;


    if (type === "crawler") {

        health = 45;
        speed = 3.4;
        radius = 2.6;
        height = 3;

    }


    if (type === "guardian") {

        health = 180;
        speed = 1.2;
        radius = 3.2;
        height = 9;

    }


    // ========================================================
    // STALKER
    // ========================================================

    if (type === "stalker") {

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(
                1.8,
                3.2,
                1.4
            ),
            enemyBodyMaterial
        );

        body.position.y = 3;

        body.castShadow = true;

        enemy.add(body);


        const head = new THREE.Mesh(
            new THREE.SphereGeometry(
                1.05,
                12,
                12
            ),
            enemyDarkMaterial
        );

        head.position.y = 5.2;

        head.castShadow = true;

        enemy.add(head);


        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(
                0.15,
                8,
                8
            ),
            enemyEyeMaterial
        );

        leftEye.position.set(
            -0.35,
            5.3,
            -0.9
        );

        enemy.add(leftEye);


        const rightEye = leftEye.clone();

        rightEye.position.x = 0.35;

        enemy.add(rightEye);


        const leftArm = new THREE.Group();

        leftArm.name = "leftArm";

        leftArm.position.set(
            -1.25,
            3.5,
            0
        );

        enemy.add(leftArm);


        const leftArmMesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                0.65,
                3.3,
                0.65
            ),
            enemyBodyMaterial
        );

        leftArmMesh.position.y = -1.2;

        leftArmMesh.rotation.z = -0.2;

        leftArm.add(leftArmMesh);


        const leftClaw = new THREE.Group();

        leftClaw.name = "leftClaw";

        leftClaw.position.y = -2.8;

        leftArm.add(leftClaw);


        for (let i = -1; i <= 1; i++) {

            const claw = new THREE.Mesh(
                new THREE.ConeGeometry(
                    0.13,
                    1,
                    6
                ),
                enemyDarkMaterial
            );

            claw.position.x = i * 0.22;

            claw.rotation.x = Math.PI;

            leftClaw.add(claw);
        }


        const rightArm = new THREE.Group();

        rightArm.name = "rightArm";

        rightArm.position.set(
            1.25,
            3.5,
            0
        );

        enemy.add(rightArm);


        const rightArmMesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                0.65,
                3.3,
                0.65
            ),
            enemyBodyMaterial
        );

        rightArmMesh.position.y = -1.2;

        rightArmMesh.rotation.z = 0.2;

        rightArm.add(rightArmMesh);


        const rightClaw = new THREE.Group();

        rightClaw.name = "rightClaw";

        rightClaw.position.y = -2.8;

        rightArm.add(rightClaw);


        for (let i = -1; i <= 1; i++) {

            const claw = new THREE.Mesh(
                new THREE.ConeGeometry(
                    0.13,
                    1,
                    6
                ),
                enemyDarkMaterial
            );

            claw.position.x = i * 0.22;

            claw.rotation.x = Math.PI;

            rightClaw.add(claw);
        }


        const leftLeg = new THREE.Mesh(
            new THREE.BoxGeometry(
                0.7,
                2.7,
                0.8
            ),
            enemyDarkMaterial
        );

        leftLeg.position.set(
            -0.55,
            0,
            0
        );

        leftLeg.castShadow = true;

        enemy.add(leftLeg);


        const rightLeg = leftLeg.clone();

        rightLeg.position.x = 0.55;

        enemy.add(rightLeg);
    }


    // ========================================================
    // CRAWLER
    // ========================================================

    if (type === "crawler") {

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(
                5.5,
                1.8,
                2.3
            ),
            enemyBodyMaterial
        );

        body.position.y = 1.7;

        body.castShadow = true;

        enemy.add(body);


        const head = new THREE.Mesh(
            new THREE.SphereGeometry(
                1.2,
                12,
                12
            ),
            enemyDarkMaterial
        );

        head.position.set(
            0,
            2,
            -2.7
        );

        enemy.add(head);


        for (const x of [-0.5, 0.5]) {

            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.18,
                    8,
                    8
                ),
                enemyEyeMaterial
            );

            eye.position.set(
                x,
                2.2,
                -3.65
            );

            enemy.add(eye);
        }


        for (let i = 0; i < 6; i++) {

            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.45,
                    2.2,
                    0.45
                ),
                enemyDarkMaterial
            );

            const side =
                i % 2 === 0
                    ? -1
                    : 1;

            const row =
                Math.floor(i / 2);

            leg.position.set(
                side * 2.2,
                0.5,
                -1.5 + row * 1.5
            );

            leg.rotation.z =
                side * 0.45;

            leg.castShadow = true;

            enemy.add(leg);
        }


        const leftArm = new THREE.Group();

        leftArm.name = "leftArm";

        leftArm.position.set(
            -2.4,
            1.9,
            -1.6
        );

        enemy.add(leftArm);


        const clawArm = new THREE.Mesh(
            new THREE.BoxGeometry(
                0.7,
                2.5,
                0.7
            ),
            enemyBodyMaterial
        );

        clawArm.position.y = -1;

        leftArm.add(clawArm);


        const leftClaw = new THREE.Group();

        leftClaw.name = "leftClaw";

        leftClaw.position.y = -2.1;

        leftArm.add(leftClaw);


        for (let i = -1; i <= 1; i++) {

            const claw = new THREE.Mesh(
                new THREE.ConeGeometry(
                    0.15,
                    1,
                    6
                ),
                enemyDarkMaterial
            );

            claw.position.x = i * 0.22;

            claw.rotation.x = Math.PI;

            leftClaw.add(claw);
        }


        const rightArm = leftArm.clone();

        rightArm.name = "rightArm";

        rightArm.position.x = 2.4;

        rightArm.scale.x = -1;

        enemy.add(rightArm);
    }


    // ========================================================
    // GUARDIAN
    // ========================================================

    if (type === "guardian") {

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(
                3.5,
                5,
                2.8
            ),
            enemyBodyMaterial
        );

        body.position.y = 4;

        body.castShadow = true;

        enemy.add(body);


        const chest = new THREE.Mesh(
            new THREE.BoxGeometry(
                4,
                2.5,
                3.1
            ),
            enemyDarkMaterial
        );

        chest.position.y = 4.2;

        enemy.add(chest);


        const core = new THREE.Mesh(
            new THREE.SphereGeometry(
                0.75,
                16,
                16
            ),
            enemyEyeMaterial
        );

        core.position.set(
            0,
            4.2,
            -1.65
        );

        enemy.add(core);


        const head = new THREE.Mesh(
            new THREE.SphereGeometry(
                1.5,
                12,
                12
            ),
            enemyDarkMaterial
        );

        head.position.y = 7.6;

        enemy.add(head);


        for (const x of [-0.5, 0.5]) {

            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.25,
                    8,
                    8
                ),
                enemyEyeMaterial
            );

            eye.position.set(
                x,
                7.8,
                -1.35
            );

            enemy.add(eye);
        }


        const leftArm = new THREE.Group();

        leftArm.name = "leftArm";

        leftArm.position.set(
            -2.4,
            5,
            0
        );

        enemy.add(leftArm);


        const armMesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                1.1,
                5,
                1.1
            ),
            enemyBodyMaterial
        );

        armMesh.position.y = -2;

        leftArm.add(armMesh);


        const leftClaw = new THREE.Group();

        leftClaw.name = "leftClaw";

        leftClaw.position.y = -4.5;

        leftArm.add(leftClaw);


        for (let i = -1; i <= 1; i++) {

            const claw = new THREE.Mesh(
                new THREE.ConeGeometry(
                    0.2,
                    1.5,
                    6
                ),
                enemyDarkMaterial
            );

            claw.position.x = i * 0.3;

            claw.rotation.x = Math.PI;

            leftClaw.add(claw);
        }


        const rightArm = leftArm.clone();

        rightArm.name = "rightArm";

        rightArm.position.x = 2.4;

        rightArm.scale.x = -1;

        enemy.add(rightArm);


        const leftLeg = new THREE.Mesh(
            new THREE.BoxGeometry(
                1.2,
                3.5,
                1.4
            ),
            enemyDarkMaterial
        );

        leftLeg.position.set(
            -1,
            0,
            0
        );

        enemy.add(leftLeg);


        const rightLeg = leftLeg.clone();

        rightLeg.position.x = 1;

        enemy.add(rightLeg);
    }


    enemy.position.set(
        x,
        0,
        z
    );

    scene.add(enemy);


    enemies.push({

        object: enemy,

        type: type,

        health: health,

        maxHealth: health,

        speed: speed,

        radius: radius,

        height: height,

        dead: false,

        attackDistance:
            type === "crawler"
                ? 5
                : type === "guardian"
                    ? 6
                    : 4.5,

        attackAnimation: 0,

        attackCooldown:
            Math.random() * 1.5,

        attackHit: false,

        isAttacking: false,

        walkTime: Math.random() * 10
    });


    return enemy;
}


// ============================================================
// SPAWN ENEMIES
// ============================================================

function spawnEnemies() {

    for (const enemy of enemies) {

        scene.remove(enemy.object);
    }

    enemies.length = 0;


    const types = [
        "stalker",
        "stalker",
        "crawler",
        "stalker",
        "crawler",
        "guardian"
    ];


    types.forEach((type, index) => {

        const angle =
            (index / types.length) *
            Math.PI *
            2;

        const distance =
            35 + Math.random() * 25;

        const x =
            player.position.x +
            Math.cos(angle) * distance;

        const z =
            player.position.z +
            Math.sin(angle) * distance;

        createEnemy(
            x,
            z,
            type
        );
    });
}


// ============================================================
// BULLETS
// ============================================================

const bullets = [];


// ============================================================
// PARTICLES
// ============================================================

const particles = [];


// ============================================================
// SHOOT
// ============================================================

function shoot() {

    if (!gameRunning) return;

    if (gamePaused) return;

    if (gameOver) return;

    if (player.isReloading) return;

    if (player.fireCooldown > 0) return;

    if (player.ammo <= 0) {

        reload();

        return;
    }


    player.ammo--;

    player.fireCooldown = 0.55;


    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(
            0.16,
            8,
            8
        ),
        new THREE.MeshBasicMaterial({
            color: 0x6cecff
        })
    );


    const worldMuzzle =
        new THREE.Vector3();

    muzzle.getWorldPosition(
        worldMuzzle
    );


    bullet.position.copy(
        worldMuzzle
    );


    const direction =
        new THREE.Vector3();

    camera.getWorldDirection(
        direction
    );


    bullet.userData = {

        velocity:
            direction.clone().multiplyScalar(80),

        life: 4,

        damage: 50
    };


    scene.add(bullet);

    bullets.push(bullet);


    createMuzzleFlash();

    player.recoil = 0.18;
}


// ============================================================
// MUZZLE FLASH
// ============================================================

function createMuzzleFlash() {

    const flash = new THREE.PointLight(
        0x55eaff,
        8,
        10
    );

    muzzle.add(flash);


    setTimeout(() => {

        muzzle.remove(flash);

    }, 60);
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

        bullet.position.add(
            bullet.userData.velocity
                .clone()
                .multiplyScalar(delta)
        );


        bullet.userData.life -= delta;


        let removeBullet =
            bullet.userData.life <= 0;


        for (const enemy of enemies) {

            if (enemy.dead) continue;

            const enemyPosition =
                enemy.object.position;

            const hitPosition =
                enemyPosition.clone();

            hitPosition.y +=
                enemy.height * 0.45;


            const distance =
                bullet.position.distanceTo(
                    hitPosition
                );


            if (
                distance <
                enemy.radius + 0.8
            ) {

                enemy.health -=
                    bullet.userData.damage;

                createHitParticles(
                    bullet.position
                );

                removeBullet = true;


                if (enemy.health <= 0) {

                    killEnemy(enemy);
                }

                break;
            }
        }


        if (removeBullet) {

            scene.remove(bullet);

            bullets.splice(
                i,
                1
            );
        }
    }
}


// ============================================================
// HIT PARTICLES
// ============================================================

function createHitParticles(position) {

    for (let i = 0; i < 8; i++) {

        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(
                0.08,
                5,
                5
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff6570
            })
        );


        particle.position.copy(
            position
        );


        particle.userData = {

            velocity:
                new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 5
                ),

            life: 0.5
        };


        scene.add(particle);

        particles.push(particle);
    }
}


// ============================================================
// PARTICLE UPDATE
// ============================================================

function updateParticles(delta) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle = particles[i];

        particle.position.add(
            particle.userData.velocity
                .clone()
                .multiplyScalar(delta)
        );


        particle.userData.velocity.y -=
            8 * delta;


        particle.userData.life -=
            delta;


        if (
            particle.userData.life <= 0
        ) {

            scene.remove(particle);

            particles.splice(
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

    enemy.dead = true;

    player.kills++;

    player.credits +=
        enemy.type === "guardian"
            ? 100
            : enemy.type === "crawler"
                ? 35
                : 25;


    createHitParticles(
        enemy.object.position
    );


    unlockAchievement(
        "FIRST ECHO"
    );


    setTimeout(() => {

        scene.remove(
            enemy.object
        );

        const index =
            enemies.indexOf(enemy);

        if (index !== -1) {

            enemies.splice(
                index,
                1
            );
        }

    }, 250);
}


// ============================================================
// ENEMY COLLISION
// ============================================================

function enemyBlocked(
    position,
    radius
) {

    for (const obstacle of obstacles) {

        const obstaclePosition =
            obstacle.object.position;

        const distance =
            Math.hypot(
                position.x -
                obstaclePosition.x,

                position.z -
                obstaclePosition.z
            );


        if (
            distance <
            radius + obstacle.radius
        ) {

            return true;
        }
    }

    return false;
}


// ============================================================
// ENEMY ATTACK
// ============================================================

function updateEnemyAttackAnimation(
    enemy,
    delta
) {

    enemy.attackCooldown -=
        delta;


    const leftArm =
        enemy.object.getObjectByName(
            "leftArm"
        );

    const rightArm =
        enemy.object.getObjectByName(
            "rightArm"
        );


    if (
        !enemy.isAttacking &&
        enemy.attackCooldown <= 0
    ) {

        enemy.isAttacking = true;

        enemy.attackAnimation = 0;

        enemy.attackHit = false;

        enemy.attackCooldown =
            enemy.type === "guardian"
                ? 2.2
                : 1.4;
    }


    if (!enemy.isAttacking) {

        return;
    }


    enemy.attackAnimation +=
        delta;


    const t =
        enemy.attackAnimation;


    // ========================================================
    // PHASE 1: ARMS UP
    // ========================================================

    if (t < 0.35) {

        const p =
            t / 0.35;


        if (leftArm) {

            leftArm.rotation.x =
                -p * 1.5;
        }


        if (rightArm) {

            rightArm.rotation.x =
                -p * 1.5;
        }
    }


    // ========================================================
    // PHASE 2: SWING DOWN
    // ========================================================

    else if (t < 0.65) {

        const p =
            (t - 0.35) / 0.3;


        if (leftArm) {

            leftArm.rotation.x =
                -1.5 + p * 2.4;
        }


        if (rightArm) {

            rightArm.rotation.x =
                -1.5 + p * 2.4;
        }


        if (
            !enemy.attackHit &&
            p > 0.55
        ) {

            enemy.attackHit = true;

            const distance =
                enemy.object.position.distanceTo(
                    tank.position
                );


            if (
                distance <
                enemy.attackDistance + 1
            ) {

                const damage =
                    enemy.type === "guardian"
                        ? 18
                        : enemy.type === "crawler"
                            ? 6
                            : 8;


                damagePlayer(damage);


                if (
                    enemy.type === "guardian"
                ) {

                    const push =
                        new THREE.Vector3()
                            .subVectors(
                                tank.position,
                                enemy.object.position
                            )
                            .normalize();


                    player.position.add(
                        push.multiplyScalar(2)
                    );
                }
            }
        }
    }


    // ========================================================
    // PHASE 3: RETURN
    // ========================================================

    else if (t < 1) {

        const p =
            (t - 0.65) / 0.35;


        if (leftArm) {

            leftArm.rotation.x =
                0.9 * (1 - p);
        }


        if (rightArm) {

            rightArm.rotation.x =
                0.9 * (1 - p);
        }
    }


    else {

        enemy.isAttacking = false;

        enemy.attackAnimation = 0;

        if (leftArm) {

            leftArm.rotation.x = 0;
        }

        if (rightArm) {

            rightArm.rotation.x = 0;
        }
    }
}


// ============================================================
// ENEMY UPDATE
// ============================================================

function updateEnemies(delta) {

    for (const enemy of enemies) {

        if (enemy.dead) continue;


        const object =
            enemy.object;


        const dx =
            player.position.x -
            object.position.x;

        const dz =
            player.position.z -
            object.position.z;


        const distance =
            Math.hypot(
                dx,
                dz
            );


        enemy.distanceToPlayer =
            distance;


        object.lookAt(
            player.position.x,
            object.position.y,
            player.position.z
        );


        if (
            distance <=
            enemy.attackDistance
        ) {

            updateEnemyAttackAnimation(
                enemy,
                delta
            );

            continue;
        }


        enemy.isAttacking = false;


        const direction =
            new THREE.Vector3(
                dx,
                0,
                dz
            ).normalize();


        const movement =
            direction
                .clone()
                .multiplyScalar(
                    enemy.speed * delta
                );


        const nextPosition =
            object.position
                .clone()
                .add(movement);


        if (
            !enemyBlocked(
                nextPosition,
                enemy.radius
            )
        ) {

            object.position.copy(
                nextPosition
            );

        } else {

            const side =
                new THREE.Vector3(
                    -direction.z,
                    0,
                    direction.x
                );


            const sidePosition =
                object.position
                    .clone()
                    .add(
                        side.multiplyScalar(
                            enemy.speed *
                            delta
                        )
                    );


            if (
                !enemyBlocked(
                    sidePosition,
                    enemy.radius
                )
            ) {

                object.position.copy(
                    sidePosition
                );
            }
        }


        enemy.walkTime +=
            delta * enemy.speed;


        const swing =
            Math.sin(
                enemy.walkTime * 5
            ) * 0.35;


        const leftArm =
            enemy.object.getObjectByName(
                "leftArm"
            );

        const rightArm =
            enemy.object.getObjectByName(
                "rightArm"
            );


        if (
            leftArm &&
            rightArm
        ) {

            leftArm.rotation.x =
                swing;

            rightArm.rotation.x =
                -swing;
        }
    }
}


// ============================================================
// DAMAGE PLAYER
// ============================================================

function damagePlayer(amount) {

    if (gameOver) return;

    player.health -= amount;


    if (player.health < 0) {

        player.health = 0;
    }


    updateHUD();


    if (
        player.health <= 0
    ) {

        endGame();
    }
}


// ============================================================
// PLAYER MOVEMENT
// ============================================================

const keys = {};


window.addEventListener(
    "keydown",
    (event) => {

        keys[event.code] = true;


        if (
            event.code === "KeyR"
        ) {

            reload();
        }


        if (
            event.code === "Escape"
        ) {

            if (
                gameRunning &&
                !gameOver
            ) {

                togglePause();
            }
        }


        if (
            event.code === "KeyM"
        ) {

            toggleMap();
        }
    }
);


window.addEventListener(
    "keyup",
    (event) => {

        keys[event.code] = false;
    }
);


// ============================================================
// UPDATE PLAYER
// ============================================================

function updatePlayer(delta) {

    if (!gameRunning) return;

    if (gamePaused) return;

    if (gameOver) return;


    let moveDirection = 0;

    let turnDirection = 0;


    if (keys["KeyW"]) {

        moveDirection += 1;
    }


    if (keys["KeyS"]) {

        moveDirection -= 1;
    }


    if (keys["KeyA"]) {

        turnDirection += 1;
    }


    if (keys["KeyD"]) {

        turnDirection -= 1;
    }


    player.rotation +=
        turnDirection *
        player.turnSpeed *
        delta;


    const sprinting =
        keys["ShiftLeft"] ||
        keys["ShiftRight"];


    const speed =
        sprinting
            ? player.speed * 1.5
            : player.speed;


    const movement =
        new THREE.Vector3(
            Math.sin(player.rotation),
            0,
            Math.cos(player.rotation)
        );


    movement.multiplyScalar(
        moveDirection *
        speed *
        delta
    );


    const newPosition =
        player.position
            .clone()
            .add(movement);


    if (
        !tankBlocked(
            newPosition
        )
    ) {

        player.position.copy(
            newPosition
        );
    }


    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    player.energy +=
        sprinting
            ? -20 * delta
            : 8 * delta;


    player.energy =
        THREE.MathUtils.clamp(
            player.energy,
            0,
            player.maxEnergy
        );


    if (
        player.fireCooldown > 0
    ) {

        player.fireCooldown -=
            delta;
    }


    if (
        player.recoil > 0
    ) {

        player.recoil -=
            delta;
    }


    if (
        player.isReloading
    ) {

        player.reloadTimer -=
            delta;


        if (
            player.reloadTimer <= 0
        ) {

            player.isReloading = false;

            player.ammo =
                player.maxAmmo;
        }
    }


    updateHUD();
}


// ============================================================
// PLAYER COLLISION
// ============================================================

function tankBlocked(position) {

    for (const obstacle of obstacles) {

        const obstaclePosition =
            obstacle.object.position;


        const distance =
            Math.hypot(
                position.x -
                obstaclePosition.x,

                position.z -
                obstaclePosition.z
            );


        if (
            distance <
            obstacle.radius + 3
        ) {

            return true;
        }
    }


    return false;
}


// ============================================================
// RELOAD
// ============================================================

function reload() {

    if (!gameRunning) return;

    if (gamePaused) return;

    if (player.isReloading) return;

    if (
        player.ammo >=
        player.maxAmmo
    ) {

        return;
    }


    player.isReloading = true;

    player.reloadTimer =
        player.reloadTime;
}


// ============================================================
// CAMERA UPDATE
// ============================================================

function updateCamera(delta) {

    const target =
        tank.position.clone();


    target.y +=
        CAMERA_TARGET_HEIGHT;


    const horizontalDistance =
        CAMERA_DISTANCE *
        Math.cos(cameraPitch);


    const verticalDistance =
        CAMERA_DISTANCE *
        Math.sin(cameraPitch);


    const desiredPosition =
        new THREE.Vector3(
            target.x +
                Math.sin(cameraYaw) *
                horizontalDistance,

            target.y +
                CAMERA_HEIGHT +
                verticalDistance,

            target.z +
                Math.cos(cameraYaw) *
                horizontalDistance
        );


    const smooth =
        1 -
        Math.exp(
            -8 * delta
        );


    camera.position.lerp(
        desiredPosition,
        smooth
    );


    camera.lookAt(
        target
    );
}


// ============================================================
// MOUSE CAMERA
// ============================================================

document.addEventListener(
    "pointerlockchange",
    () => {

        pointerLocked =
            document.pointerLockElement ===
            canvas;
    }
);


document.addEventListener(
    "mousemove",
    (event) => {

        if (!pointerLocked) return;

        if (!gameRunning) return;

        if (gamePaused) return;


        cameraYaw -=
            event.movementX *
            CAMERA_SENSITIVITY;


        cameraPitch -=
            event.movementY *
            CAMERA_SENSITIVITY;


        cameraPitch =
            THREE.MathUtils.clamp(
                cameraPitch,
                MIN_CAMERA_PITCH,
                MAX_CAMERA_PITCH
            );
    }
);


canvas.addEventListener(
    "click",
    () => {

        if (!gameRunning) return;

        if (gamePaused) return;


        if (!pointerLocked) {

            canvas.requestPointerLock();

            return;
        }


        shoot();
    }
);


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    if (healthBar) {

        healthBar.style.width =
            `${player.health}%`;
    }


    if (energyBar) {

        energyBar.style.width =
            `${player.energy}%`;
    }


    if (ammoText) {

        ammoText.textContent =
            player.isReloading
                ? "RELOAD"
                : player.ammo;
    }


    if (killsText) {

        killsText.textContent =
            `KILLS ${String(player.kills).padStart(2, "0")}`;
    }


    if (creditsText) {

        creditsText.textContent =
            `CREDITS ${String(player.credits).padStart(3, "0")}`;
    }


    if (zoneText) {

        zoneText.textContent =
            player.position.z < -35
                ? "SIGNAL ZONE"
                : "OUTER SECTOR";
    }


    if (objectiveText) {

        objectiveText.textContent =
            player.position.distanceTo(
                signalTower.position
            ) < 15
                ? "REACH THE SIGNAL TOWER"
                : "LOCATE THE SIGNAL";
    }
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

const unlockedAchievements =
    new Set();


function unlockAchievement(name) {

    if (
        unlockedAchievements.has(name)
    ) {

        return;
    }


    unlockedAchievements.add(name);


    if (achievementName) {

        achievementName.textContent =
            name;
    }


    if (achievementPanel) {

        achievementPanel.classList.add(
            "show"
        );

        achievementPanel.style.display =
            "flex";


        setTimeout(() => {

            achievementPanel.classList.remove(
                "show"
            );

            achievementPanel.style.display =
                "";

        }, 3500);
    }
}


// ============================================================
// ACHIEVEMENT MENU
// ============================================================

function showAchievements() {

    alert(
        "ACHIEVEMENTS\n\n" +
        "FIRST ECHO\n" +
        "Versla je eerste monster.\n\n" +
        "SIGNAL HUNTER\n" +
        "Bereik de signaaltoren.\n\n" +
        "SURVIVOR\n" +
        "Blijf in leven."
    );
}


// ============================================================
// CONTROLS MENU
// ============================================================

function showControls() {

    alert(
        "CONTROLS\n\n" +
        "W / S = vooruit / achteruit\n" +
        "A / D = tank draaien\n" +
        "MUIS = camera draaien\n" +
        "LINKS KLIKKEN = schieten\n" +
        "R = herladen\n" +
        "SHIFT = sprint\n" +
        "M = kaart\n" +
        "ESC = pauze"
    );
}


// ============================================================
// MAP
// ============================================================

function toggleMap() {

    if (!mapScreen) return;


    const visible =
        mapScreen.style.display === "flex";


    if (visible) {

        mapScreen.style.display =
            "none";

    } else {

        mapScreen.style.display =
            "flex";
    }
}


const closeMapButton =
    document.getElementById(
        "closeMap"
    );


if (closeMapButton) {

    closeMapButton.addEventListener(
        "click",
        () => {

            if (mapScreen) {

                mapScreen.style.display =
                    "none";
            }
        }
    );
}


// ============================================================
// NEW GAME
// ============================================================

function newGame() {

    console.log("NEW RUN gestart");


    gameOver = false;

    gamePaused = false;

    gameRunning = true;


    player.position.set(
        0,
        0,
        20
    );


    player.rotation =
        Math.PI;


    player.health =
        player.maxHealth;


    player.energy =
        player.maxEnergy;


    player.ammo =
        player.maxAmmo;


    player.kills = 0;

    player.credits = 0;

    player.fireCooldown = 0;

    player.isReloading = false;

    player.reloadTimer = 0;


    tank.position.copy(
        player.position
    );

    tank.rotation.y =
        player.rotation;


    cameraYaw = 0;

    cameraPitch = 0.25;


    spawnEnemies();

    updateHUD();


    if (menu) {

        menu.style.display =
            "none";
    }


    if (hud) {

        hud.style.display =
            "block";
    }


    if (pauseScreen) {

        pauseScreen.style.display =
            "none";
    }


    if (mapScreen) {

        mapScreen.style.display =
            "none";
    }


    console.log(
        "Game gestart!"
    );
}


// ============================================================
// SAVE GAME
// ============================================================

async function saveGame() {

    const saveData = {

        player: {

            x: player.position.x,
            y: player.position.y,
            z: player.position.z,

            rotation: player.rotation,

            health: player.health,

            energy: player.energy,

            ammo: player.ammo,

            kills: player.kills,

            credits: player.credits
        },

        time: Date.now()
    };


    localStorage.setItem(
        "echobound_tank_save",
        JSON.stringify(saveData)
    );


    if (
        firebaseReady &&
        firebaseUser
    ) {

        try {

            await set(
                ref(
                    database,
                    `players/${firebaseUser.uid}/save1`
                ),
                saveData
            );


            console.log(
                "Game opgeslagen in Firebase!"
            );

        } catch (error) {

            console.error(
                "Firebase save error:",
                error
            );
        }
    }


    console.log(
        "Game opgeslagen!"
    );
}


// ============================================================
// APPLY SAVE
// ============================================================

function applyLoadedGame(saveData) {

    if (
        !saveData ||
        !saveData.player
    ) {

        return false;
    }


    const saved =
        saveData.player;


    player.position.set(
        saved.x || 0,
        saved.y || 0,
        saved.z || 20
    );


    player.rotation =
        saved.rotation ??
        Math.PI;


    player.health =
        saved.health ??
        100;


    player.energy =
        saved.energy ??
        100;


    player.ammo =
        saved.ammo ??
        player.maxAmmo;


    player.kills =
        saved.kills ??
        0;


    player.credits =
        saved.credits ??
        0;


    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    gameOver = false;

    gamePaused = false;

    gameRunning = true;


    spawnEnemies();

    updateHUD();


    if (menu) {

        menu.style.display =
            "none";
    }


    if (hud) {

        hud.style.display =
            "block";
    }


    if (pauseScreen) {

        pauseScreen.style.display =
            "none";
    }


    return true;
}


// ============================================================
// LOAD GAME
// ============================================================

async function loadGame() {

    console.log(
        "CONTINUE aangeklikt"
    );


    let saveData = null;


    if (
        firebaseReady &&
        firebaseUser
    ) {

        try {

            const snapshot =
                await get(
                    ref(
                        database,
                        `players/${firebaseUser.uid}/save1`
                    )
                );


            if (snapshot.exists()) {

                saveData =
                    snapshot.val();

                console.log(
                    "Save uit Firebase geladen."
                );
            }

        } catch (error) {

            console.error(
                "Firebase load error:",
                error
            );
        }
    }


    if (!saveData) {

        const localSave =
            localStorage.getItem(
                "echobound_tank_save"
            );


        if (localSave) {

            try {

                saveData =
                    JSON.parse(
                        localSave
                    );

            } catch (error) {

                console.error(
                    "Lokale save kapot:",
                    error
                );
            }
        }
    }


    if (saveData) {

        applyLoadedGame(
            saveData
        );

    } else {

        alert(
            "Er is nog geen opgeslagen run."
        );
    }
}


// ============================================================
// PAUSE
// ============================================================

function togglePause() {

    if (!gameRunning) return;

    if (gameOver) return;


    gamePaused =
        !gamePaused;


    if (pauseScreen) {

        pauseScreen.style.display =
            gamePaused
                ? "flex"
                : "none";
    }


    if (
        gamePaused &&
        document.pointerLockElement
    ) {

        document.exitPointerLock();
    }
}


// ============================================================
// QUIT TO MENU
// ============================================================

function quitToMenu() {

    gameRunning = false;

    gamePaused = false;

    gameOver = false;


    if (
        document.pointerLockElement
    ) {

        document.exitPointerLock();
    }


    if (pauseScreen) {

        pauseScreen.style.display =
            "none";
    }


    if (hud) {

        hud.style.display =
            "none";
    }


    if (menu) {

        menu.style.display =
            "block";
    }


    console.log(
        "Terug naar hoofdmenu."
    );
}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    gameOver = true;

    gameRunning = false;


    if (
        document.pointerLockElement
    ) {

        document.exitPointerLock();
    }


    localStorage.setItem(
        "echobound_last_run",
        JSON.stringify({
            kills: player.kills,
            credits: player.credits,
            time: Date.now()
        })
    );


    setTimeout(() => {

        alert(
            "RUN ENDED\n\n" +
            "Kills: " +
            player.kills +
            "\nCredits: " +
            player.credits
        );


        if (menu) {

            menu.style.display =
                "block";
        }


        if (hud) {

            hud.style.display =
                "none";
        }

    }, 200);
}


// ============================================================
// MENU BUTTONS
// ============================================================

const newGameButton =
    document.getElementById(
        "newGame"
    );

const loadGameButton =
    document.getElementById(
        "loadGame"
    );

const achievementsButton =
    document.getElementById(
        "achievementsButton"
    );

const controlsButton =
    document.getElementById(
        "controlsButton"
    );

const resumeButton =
    document.getElementById(
        "resume"
    );

const saveButton =
    document.getElementById(
        "save"
    );

const quitButton =
    document.getElementById(
        "quit"
    );


// ============================================================
// NEW RUN BUTTON
// ============================================================

if (newGameButton) {

    newGameButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            console.log(
                "NEW RUN BUTTON CLICK"
            );

            newGame();
        }
    );
}


// ============================================================
// CONTINUE BUTTON
// ============================================================

if (loadGameButton) {

    loadGameButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            loadGame();
        }
    );
}


// ============================================================
// ACHIEVEMENTS BUTTON
// ============================================================

if (achievementsButton) {

    achievementsButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            showAchievements();
        }
    );
}


// ============================================================
// CONTROLS BUTTON
// ============================================================

if (controlsButton) {

    controlsButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            showControls();
        }
    );
}


// ============================================================
// RESUME BUTTON
// ============================================================

if (resumeButton) {

    resumeButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            togglePause();
        }
    );
}


// ============================================================
// SAVE BUTTON
// ============================================================

if (saveButton) {

    saveButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            saveGame();
        }
    );
}


// ============================================================
// QUIT BUTTON
// ============================================================

if (quitButton) {

    quitButton.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            quitToMenu();
        }
    );
}


// ============================================================
// INITIAL UI
// ============================================================

if (hud) {

    hud.style.display =
        "none";
}


if (pauseScreen) {

    pauseScreen.style.display =
        "none";
}


if (mapScreen) {

    mapScreen.style.display =
        "none";
}


updateHUD();


// ============================================================
// ANIMATION LOOP
// ============================================================

const clock =
    new THREE.Clock();


function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    elapsedTime +=
        delta;


    if (gameRunning && !gamePaused) {

        updatePlayer(delta);

        updateEnemies(delta);

        updateBullets(delta);

        updateParticles(delta);

        updateCamera(delta);
    } else {

        updateCamera(delta);
    }


    renderer.render(
        scene,
        camera
    );
}


animate();


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
// DEBUG
// ============================================================

console.log(
    "EchoBound geladen."
);

console.log(
    "NEW RUN knop:",
    newGameButton
);

console.log(
    "CONTINUE knop:",
    loadGameButton
);

console.log(
    "SAVE knop:",
    saveButton
);

console.log(
    "QUIT knop:",
    quitButton
);
