// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// NIEUWE 3D TANK GAME APP.JS
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
    .then(result => {
        firebaseUser = result.user;
        firebaseReady = true;

        console.log("Firebase verbonden!");
        console.log("UID:", firebaseUser.uid);
    })
    .catch(error => {
        console.error("Firebase login mislukt:", error);
    });


// ============================================================
// HTML
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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;


const scene = new THREE.Scene();

scene.background =
    new THREE.Color(0x071016);

scene.fog = new THREE.Fog(
    0x071016,
    50,
    220
);


// ============================================================
// CAMERA
// ============================================================

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    600
);

camera.position.set(
    0,
    8,
    15
);


// ============================================================
// LIGHT
// ============================================================

const ambientLight =
    new THREE.HemisphereLight(
        0x8ab8c9,
        0x10151a,
        1.7
    );

scene.add(ambientLight);


const sun =
    new THREE.DirectionalLight(
        0xcfeaff,
        2.5
    );

sun.position.set(
    40,
    80,
    30
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

sun.shadow.camera.left = -120;
sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;

scene.add(sun);


// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;
let gamePaused = false;
let gameOver = false;

let elapsedTime = 0;


// ============================================================
// PLAYER
// ============================================================

const player = {

    position: new THREE.Vector3(
        0,
        0,
        20
    ),

    // BELANGRIJK:
    // 0 graden = voorkant van de tank
    rotation: 0,

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

    reloadTime: 1.5,

    isReloading: false,

    recoil: 0
};


// ============================================================
// CAMERA INSTELLINGEN
// ============================================================

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 5.5;
const CAMERA_TARGET_HEIGHT = 2.2;

let cameraYaw = 0;
let cameraPitch = 0.25;

const CAMERA_SENSITIVITY = 0.0025;

const MIN_CAMERA_PITCH = -0.3;
const MAX_CAMERA_PITCH = 0.8;

let pointerLocked = false;


// ============================================================
// TANK
// ============================================================

const tank = new THREE.Group();

tank.position.copy(
    player.position
);

scene.add(tank);


// ============================================================
// MATERIALEN
// ============================================================

const tankDark =
    new THREE.MeshStandardMaterial({
        color: 0x151d22,
        metalness: 0.85,
        roughness: 0.3
    });


const tankMain =
    new THREE.MeshStandardMaterial({
        color: 0x344b53,
        metalness: 0.75,
        roughness: 0.32
    });


const tankLight =
    new THREE.MeshStandardMaterial({
        color: 0x71878e,
        metalness: 0.8,
        roughness: 0.25
    });


const tankGlow =
    new THREE.MeshBasicMaterial({
        color: 0x39d9ff
    });


// ============================================================
// TANK BODY
// ============================================================

const body =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            5.2,
            1.7,
            7
        ),
        tankMain
    );

body.position.y = 1.6;

body.castShadow = true;
body.receiveShadow = true;

tank.add(body);


// ============================================================
// FRONT ARMOR
// ============================================================

const frontArmor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            5.6,
            1.5,
            1.2
        ),
        tankLight
    );

// DE VOORKANT IS -Z
frontArmor.position.set(
    0,
    1.8,
    -3.45
);

frontArmor.rotation.x = -0.15;

frontArmor.castShadow = true;

tank.add(frontArmor);


// ============================================================
// TOP
// ============================================================

const topArmor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4.5,
            0.65,
            4.7
        ),
        tankDark
    );

topArmor.position.y = 2.65;

topArmor.castShadow = true;

tank.add(topArmor);


// ============================================================
// TRACKS
// ============================================================

function createTrack(x) {

    const track =
        new THREE.Group();

    const trackBody =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.1,
                1.8,
                6.8
            ),
            tankDark
        );

    trackBody.position.set(
        x,
        1.35,
        0
    );

    trackBody.castShadow = true;

    track.add(trackBody);


    for (let i = 0; i < 7; i++) {

        const wheel =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.48,
                    0.48,
                    0.3,
                    16
                ),
                tankLight
            );

        wheel.rotation.z =
            Math.PI / 2;

        wheel.position.set(
            x,
            1.15,
            -2.6 + i * 0.85
        );

        wheel.castShadow = true;

        tank.add(wheel);
    }

    tank.add(track);
}

createTrack(-2.6);
createTrack(2.6);


// ============================================================
// GLOW STRIPS
// ============================================================

function createGlowStrip(x) {

    const strip =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.12,
                0.12,
                5
            ),
            tankGlow
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

const turret =
    new THREE.Group();

turret.position.y = 3.15;

tank.add(turret);


const turretBase =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            1.9,
            2.2,
            0.7,
            20
        ),
        tankDark
    );

turretBase.castShadow = true;

turret.add(turretBase);


// ============================================================
// TURRET TOP
// ============================================================

const turretTop =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            3.2,
            1,
            3.8
        ),
        tankMain
    );

turretTop.position.z = 0;

turretTop.castShadow = true;

turret.add(turretTop);


// ============================================================
// CANNON
// ============================================================

const cannonGroup =
    new THREE.Group();

cannonGroup.position.set(
    0,
    0.1,
    -2
);

turret.add(cannonGroup);


const cannon =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.28,
            0.34,
            6,
            16
        ),
        tankLight
    );

cannon.rotation.x =
    Math.PI / 2;

cannon.position.z =
    -2.7;

cannon.castShadow = true;

cannonGroup.add(cannon);


// ============================================================
// CANNON TIP
// ============================================================

const cannonTip =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.42,
            0.42,
            0.7,
            16
        ),
        tankDark
    );

cannonTip.rotation.x =
    Math.PI / 2;

cannonTip.position.z =
    -5.7;

cannonGroup.add(cannonTip);


// ============================================================
// MUZZLE
// ============================================================

const muzzle =
    new THREE.Object3D();

muzzle.position.set(
    0,
    0,
    -6
);

cannonGroup.add(muzzle);


// ============================================================
// GROUND
// ============================================================

const ground =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            500,
            500
        ),
        new THREE.MeshStandardMaterial({
            color: 0x172328,
            roughness: 1
        })
    );

ground.rotation.x =
    -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);


// ============================================================
// GRID
// ============================================================

const grid =
    new THREE.GridHelper(
        500,
        100,
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

function createRock(
    x,
    z,
    scale = 1
) {

    const rock =
        new THREE.Mesh(
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

    const tree =
        new THREE.Group();


    const trunk =
        new THREE.Mesh(
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


    const crown =
        new THREE.Mesh(
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

    const building =
        new THREE.Group();


    const base =
        new THREE.Mesh(
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


    const roof =
        new THREE.Mesh(
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
// WORLD
// ============================================================

function createWorld() {

    for (let i = 0; i < 30; i++) {

        const x =
            (Math.random() - 0.5) * 190;

        const z =
            (Math.random() - 0.5) * 190;

        if (
            Math.abs(x) < 22 &&
            Math.abs(z) < 22
        ) {
            continue;
        }

        createRock(
            x,
            z,
            0.7 +
            Math.random() * 0.8
        );
    }


    for (let i = 0; i < 20; i++) {

        const x =
            (Math.random() - 0.5) * 190;

        const z =
            (Math.random() - 0.5) * 190;

        if (
            Math.abs(x) < 25 &&
            Math.abs(z) < 25
        ) {
            continue;
        }

        createTree(x, z);
    }


    createBuilding(-35, -20);
    createBuilding(38, 25);
    createBuilding(-45, 45);
}

createWorld();


// ============================================================
// SIGNAL TOWER
// ============================================================

const signalTower =
    new THREE.Group();

signalTower.position.set(
    0,
    0,
    -65
);

scene.add(signalTower);


const towerPole =
    new THREE.Mesh(
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


const towerLight =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            2,
            16,
            16
        ),
        new THREE.MeshBasicMaterial({
            color: 0x3fe8ff
        })
    );

towerLight.position.y = 18;

signalTower.add(towerLight);


// ============================================================
// ENEMIES
// ============================================================

const enemies = [];

const enemyBodyMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x4a2025,
        metalness: 0.35,
        roughness: 0.7
    });

const enemyDarkMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x1b1215,
        metalness: 0.5,
        roughness: 0.65
    });

const enemyEyeMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xff2838
    });


// ============================================================
// ENEMY CREATION
// ============================================================

function createEnemy(
    x,
    z,
    type = "stalker"
) {

    const enemy =
        new THREE.Group();


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


    // --------------------------------------------------------
    // STALKER
    // --------------------------------------------------------

    if (type === "stalker") {

        const body =
            new THREE.Mesh(
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


        const head =
            new THREE.Mesh(
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


        for (const xEye of [-0.35, 0.35]) {

            const eye =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.15,
                        8,
                        8
                    ),
                    enemyEyeMaterial
                );

            eye.position.set(
                xEye,
                5.3,
                -0.9
            );

            enemy.add(eye);
        }


        const leftArm =
            new THREE.Group();

        leftArm.name =
            "leftArm";

        leftArm.position.set(
            -1.25,
            3.5,
            0
        );

        enemy.add(leftArm);


        const leftArmMesh =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.65,
                    3.3,
                    0.65
                ),
                enemyBodyMaterial
            );

        leftArmMesh.position.y = -1.2;

        leftArm.add(leftArmMesh);


        const rightArm =
            leftArm.clone();

        rightArm.name =
            "rightArm";

        rightArm.position.x = 1.25;

        enemy.add(rightArm);
    }


    // --------------------------------------------------------
    // CRAWLER
    // --------------------------------------------------------

    if (type === "crawler") {

        const body =
            new THREE.Mesh(
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


        const head =
            new THREE.Mesh(
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


        for (const eyeX of [-0.5, 0.5]) {

            const eye =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.18,
                        8,
                        8
                    ),
                    enemyEyeMaterial
                );

            eye.position.set(
                eyeX,
                2.2,
                -3.65
            );

            enemy.add(eye);
        }


        for (let i = 0; i < 6; i++) {

            const leg =
                new THREE.Mesh(
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

            enemy.add(leg);
        }
    }


    // --------------------------------------------------------
    // GUARDIAN
    // --------------------------------------------------------

    if (type === "guardian") {

        const body =
            new THREE.Mesh(
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


        const chest =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    4,
                    2.5,
                    3.1
                ),
                enemyDarkMaterial
            );

        chest.position.y = 4.2;

        enemy.add(chest);


        const core =
            new THREE.Mesh(
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


        const head =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    1.5,
                    12,
                    12
                ),
                enemyDarkMaterial
            );

        head.position.y = 7.6;

        enemy.add(head);
    }


    enemy.position.set(
        x,
        0,
        z
    );

    scene.add(enemy);


    const data = {

        object: enemy,

        type,

        health,

        maxHealth: health,

        speed,

        radius,

        height,

        dead: false,

        attackDistance:
            type === "crawler"
                ? 5
                : type === "guardian"
                    ? 6
                    : 4.5,

        attackCooldown:
            Math.random() * 1.5,

        walkTime:
            Math.random() * 10
    };


    enemies.push(data);

    return data;
}


// ============================================================
// SPAWN ENEMIES
// ============================================================

function spawnEnemies() {

    for (const enemy of enemies) {

        scene.remove(
            enemy.object
        );
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


    types.forEach(
        (type, index) => {

            const angle =
                index /
                types.length *
                Math.PI *
                2;

            const distance =
                35 +
                Math.random() * 25;

            const x =
                player.position.x +
                Math.cos(angle) *
                distance;

            const z =
                player.position.z +
                Math.sin(angle) *
                distance;

            createEnemy(
                x,
                z,
                type
            );
        }
    );
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

    if (player.fireCooldown > 0) {
        return;
    }


    if (player.ammo <= 0) {

        reload();

        return;
    }


    player.ammo--;

    player.fireCooldown =
        0.45;


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.16,
                8,
                8
            ),
            new THREE.MeshBasicMaterial({
                color: 0x6cecff
            })
        );


    const start =
        new THREE.Vector3();

    muzzle.getWorldPosition(start);

    bullet.position.copy(start);


    // --------------------------------------------------------
    // SCHIET ALTIJD WAAR DE CAMERA NAAR KIJKT
    // --------------------------------------------------------

    const direction =
        new THREE.Vector3();

    camera.getWorldDirection(
        direction
    );


    bullet.userData = {

        velocity:
            direction
                .clone()
                .multiplyScalar(90),

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

    const flash =
        new THREE.PointLight(
            0x55eaff,
            10,
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

        const bullet =
            bullets[i];


        bullet.position.add(
            bullet.userData.velocity
                .clone()
                .multiplyScalar(delta)
        );


        bullet.userData.life -=
            delta;


        let remove =
            bullet.userData.life <= 0;


        // ----------------------------------------------------
        // OBSTACLE HIT
        // ----------------------------------------------------

        for (const obstacle of obstacles) {

            const distance =
                bullet.position.distanceTo(
                    obstacle.object.position
                );

            if (
                distance <
                obstacle.radius
            ) {

                createHitParticles(
                    bullet.position
                );

                remove = true;

                break;
            }
        }


        // ----------------------------------------------------
        // ENEMY HIT
        // ----------------------------------------------------

        if (!remove) {

            for (const enemy of enemies) {

                if (enemy.dead) continue;


                const hit =
                    enemy.object.position
                        .clone();

                hit.y +=
                    enemy.height * 0.45;


                const distance =
                    bullet.position.distanceTo(
                        hit
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


                    remove = true;


                    if (
                        enemy.health <= 0
                    ) {

                        killEnemy(
                            enemy
                        );
                    }

                    break;
                }
            }
        }


        if (remove) {

            scene.remove(
                bullet
            );

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

function createHitParticles(
    position
) {

    for (let i = 0; i < 8; i++) {

        const particle =
            new THREE.Mesh(
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

        particles.push(
            particle
        );
    }
}


// ============================================================
// PARTICLES
// ============================================================

function updateParticles(delta) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            particles[i];


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

            scene.remove(
                particle
            );

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

    if (enemy.dead) return;

    enemy.dead = true;


    player.kills++;


    if (
        enemy.type === "guardian"
    ) {

        player.credits += 100;

    } else if (
        enemy.type === "crawler"
    ) {

        player.credits += 35;

    } else {

        player.credits += 25;
    }


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

    for (
        const obstacle of obstacles
    ) {

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
            radius +
            obstacle.radius
        ) {

            return true;
        }
    }

    return false;
}


// ============================================================
// ENEMY UPDATE
// ============================================================

function updateEnemies(delta) {

    for (
        const enemy of enemies
    ) {

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


        if (
            distance >
            enemy.attackDistance
        ) {

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
                        enemy.speed *
                        delta
                    );


            const next =
                object.position
                    .clone()
                    .add(movement);


            if (
                !enemyBlocked(
                    next,
                    enemy.radius
                )
            ) {

                object.position.copy(
                    next
                );

            } else {

                // probeer opzij te gaan

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


            object.lookAt(
                player.position.x,
                object.position.y,
                player.position.z
            );


            enemy.walkTime +=
                delta *
                enemy.speed;
        }


        // ----------------------------------------------------
        // AANVAL
        // ----------------------------------------------------

        if (
            distance <=
            enemy.attackDistance
        ) {

            enemy.attackCooldown -=
                delta;


            if (
                enemy.attackCooldown <= 0
            ) {

                let damage = 8;

                if (
                    enemy.type === "crawler"
                ) {
                    damage = 6;
                }

                if (
                    enemy.type === "guardian"
                ) {
                    damage = 18;
                }


                damagePlayer(
                    damage
                );


                enemy.attackCooldown =
                    enemy.type === "guardian"
                        ? 2.2
                        : 1.3;
            }
        }
    }
}


// ============================================================
// PLAYER DAMAGE
// ============================================================

function damagePlayer(amount) {

    if (gameOver) return;


    player.health -=
        amount;


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
// KEYBOARD
// ============================================================

const keys = {};


window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;


        if (
            event.code === "KeyR"
        ) {

            reload();
        }


        if (
            event.code === "Space"
        ) {

            dash();
        }


        if (
            event.code === "KeyM"
        ) {

            toggleMap();
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
    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;
    }
);


// ============================================================
// PLAYER MOVEMENT
// ============================================================

function updatePlayer(delta) {

    if (!gameRunning) return;
    if (gamePaused) return;
    if (gameOver) return;


    let move =
        0;

    let turn =
        0;


    if (
        keys["KeyW"]
    ) {

        move += 1;
    }


    if (
        keys["KeyS"]
    ) {

        move -= 1;
    }


    if (
        keys["KeyA"]
    ) {

        turn += 1;
    }


    if (
        keys["KeyD"]
    ) {

        turn -= 1;
    }


    // --------------------------------------------------------
    // TANK DRAAIEN
    // --------------------------------------------------------

    player.rotation +=
        turn *
        player.turnSpeed *
        delta;


    // --------------------------------------------------------
    // SPEED
    // --------------------------------------------------------

    const sprinting =
        keys["ShiftLeft"] ||
        keys["ShiftRight"];


    let speed =
        player.speed;


    if (move < 0) {

        speed =
            player.reverseSpeed;
    }


    if (
        sprinting &&
        player.energy > 0 &&
        move > 0
    ) {

        speed *= 1.5;

        player.energy -=
            20 * delta;

    } else {

        player.energy +=
            8 * delta;
    }


    player.energy =
        THREE.MathUtils.clamp(
            player.energy,
            0,
            player.maxEnergy
        );


    // --------------------------------------------------------
    // VOORUIT = -Z
    // --------------------------------------------------------

    const forward =
        new THREE.Vector3(
            0,
            0,
            -1
        );


    forward.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        player.rotation
    );


    const movement =
        forward
            .clone()
            .multiplyScalar(
                move *
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


    // --------------------------------------------------------
    // TANK POSITION
    // --------------------------------------------------------

    tank.position.copy(
        player.position
    );


    // --------------------------------------------------------
    // TANK ROTATIE
    // --------------------------------------------------------

    // De tank zelf gebruikt -Z als voorkant.
    // Daarom hoeft hij NIET meer 180 graden extra te draaien.

    tank.rotation.y =
        player.rotation;


    // --------------------------------------------------------
    // FIRE COOLDOWN
    // --------------------------------------------------------

    if (
        player.fireCooldown > 0
    ) {

        player.fireCooldown -=
            delta;
    }


    // --------------------------------------------------------
    // RECOIL
    // --------------------------------------------------------

    if (
        player.recoil > 0
    ) {

        player.recoil -=
            delta;
    }


    // --------------------------------------------------------
    // RELOAD
    // --------------------------------------------------------

    if (
        player.isReloading
    ) {

        player.reloadTimer -=
            delta;


        if (
            player.reloadTimer <= 0
        ) {

            player.isReloading =
                false;

            player.ammo =
                player.maxAmmo;
        }
    }


    updateHUD();
}


// ============================================================
// TANK COLLISION
// ============================================================

function tankBlocked(position) {

    for (
        const obstacle of obstacles
    ) {

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
// DASH
// ============================================================

function dash() {

    if (!gameRunning) return;
    if (gamePaused) return;
    if (gameOver) return;


    if (
        player.energy < 25
    ) {

        return;
    }


    player.energy -= 25;


    const direction =
        new THREE.Vector3(
            0,
            0,
            -1
        );


    direction.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        player.rotation
    );


    const dashPosition =
        player.position
            .clone()
            .add(
                direction.multiplyScalar(
                    7
                )
            );


    if (
        !tankBlocked(
            dashPosition
        )
    ) {

        player.position.copy(
            dashPosition
        );

        tank.position.copy(
            player.position
        );
    }
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


    player.isReloading =
        true;

    player.reloadTimer =
        player.reloadTime;
}


// ============================================================
// CAMERA
// ============================================================

function updateCamera(delta) {

    const target =
        tank.position.clone();


    target.y +=
        CAMERA_TARGET_HEIGHT;


    const horizontalDistance =
        CAMERA_DISTANCE *
        Math.cos(
            cameraPitch
        );


    const verticalDistance =
        CAMERA_DISTANCE *
        Math.sin(
            cameraPitch
        );


    const desired =
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
        desired,
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
    event => {

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


// ============================================================
// MOUSE KLIKKEN
// ============================================================

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
            `KILLS ${String(
                player.kills
            ).padStart(2, "0")}`;
    }


    if (creditsText) {

        creditsText.textContent =
            `CREDITS ${String(
                player.credits
            ).padStart(3, "0")}`;
    }


    if (zoneText) {

        zoneText.textContent =
            player.position.z < -35
                ? "SIGNAL ZONE"
                : "OUTER SECTOR";
    }


    if (objectiveText) {

        const distance =
            player.position.distanceTo(
                signalTower.position
            );


        objectiveText.textContent =
            distance < 15
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
        unlockedAchievements.has(
            name
        )
    ) {

        return;
    }


    unlockedAchievements.add(
        name
    );


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

    const unlocked =
        unlockedAchievements.size;


    alert(
        "ACHIEVEMENTS\n\n" +

        "FIRST ECHO\n" +
        "Versla je eerste monster.\n\n" +

        "SIGNAL HUNTER\n" +
        "Bereik de signaaltoren.\n\n" +

        "SURVIVOR\n" +
        "Blijf in leven.\n\n" +

        "Unlocked: " +
        unlocked
    );
}


// ============================================================
// CONTROLS
// ============================================================

function showControls() {

    alert(
        "CONTROLS\n\n" +

        "W = vooruit\n" +
        "S = achteruit\n" +
        "A = links draaien\n" +
        "D = rechts draaien\n\n" +

        "MUIS = camera draaien\n" +
        "KLIK = schieten\n" +
        "R = herladen\n" +
        "SHIFT = sprint\n" +
        "SPACE = dash\n" +
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
        mapScreen.style.display ===
        "flex";


    mapScreen.style.display =
        visible
            ? "none"
            : "flex";
}


const closeMapButton =
    document.getElementById(
        "closeMap"
    );


if (closeMapButton) {

    closeMapButton.addEventListener(
        "click",
        () => {

            mapScreen.style.display =
                "none";
        }
    );
}


// ============================================================
// NEW GAME
// ============================================================

function newGame() {

    console.log(
        "Nieuwe EchoBound run gestart"
    );


    gameRunning = true;
    gamePaused = false;
    gameOver = false;


    player.position.set(
        0,
        0,
        20
    );


    player.rotation =
        0;


    player.health =
        player.maxHealth;


    player.energy =
        player.maxEnergy;


    player.ammo =
        player.maxAmmo;


    player.kills =
        0;


    player.credits =
        0;


    player.fireCooldown =
        0;


    player.isReloading =
        false;


    player.reloadTimer =
        0;


    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    // Camera achter de tank
    cameraYaw =
        Math.PI;


    cameraPitch =
        0.25;


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
}


// ============================================================
// SAVE GAME
// ============================================================

async function saveGame() {

    const saveData = {

        player: {

            x:
                player.position.x,

            y:
                player.position.y,

            z:
                player.position.z,

            rotation:
                player.rotation,

            health:
                player.health,

            energy:
                player.energy,

            ammo:
                player.ammo,

            kills:
                player.kills,

            credits:
                player.credits
        },

        achievements:
            Array.from(
                unlockedAchievements
            ),

        time:
            Date.now()
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
                "Firebase save gelukt!"
            );

        } catch (error) {

            console.error(
                "Firebase save fout:",
                error
            );
        }
    }


    console.log(
        "Run opgeslagen!"
    );
}


// ============================================================
// LOAD GAME
// ============================================================

async function loadGame() {

    let saveData =
        null;


    // --------------------------------------------------------
    // FIREBASE
    // --------------------------------------------------------

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


            if (
                snapshot.exists()
            ) {

                saveData =
                    snapshot.val();

                console.log(
                    "Firebase save geladen."
                );
            }

        } catch (error) {

            console.error(
                "Firebase load fout:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // LOCAL SAVE
    // --------------------------------------------------------

    if (!saveData) {

        const local =
            localStorage.getItem(
                "echobound_tank_save"
            );


        if (local) {

            try {

                saveData =
                    JSON.parse(
                        local
                    );

            } catch (error) {

                console.error(
                    "Lokale save fout:",
                    error
                );
            }
        }
    }


    if (!saveData) {

        alert(
            "Er is nog geen opgeslagen run."
        );

        return;
    }


    applyLoadedGame(
        saveData
    );
}


// ============================================================
// APPLY LOAD
// ============================================================

function applyLoadedGame(
    saveData
) {

    if (
        !saveData ||
        !saveData.player
    ) {

        return;
    }


    const saved =
        saveData.player;


    player.position.set(
        saved.x ?? 0,
        saved.y ?? 0,
        saved.z ?? 20
    );


    player.rotation =
        saved.rotation ?? 0;


    player.health =
        saved.health ?? 100;


    player.energy =
        saved.energy ?? 100;


    player.ammo =
        saved.ammo ??
        player.maxAmmo;


    player.kills =
        saved.kills ?? 0;


    player.credits =
        saved.credits ?? 0;


    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    // Achievements laden

    unlockedAchievements.clear();


    if (
        Array.isArray(
            saveData.achievements
        )
    ) {

        for (
            const achievement
            of saveData.achievements
        ) {

            unlockedAchievements.add(
                achievement
            );
        }
    }


    gameRunning = true;
    gamePaused = false;
    gameOver = false;


    cameraYaw =
        player.rotation +
        Math.PI;


    cameraPitch =
        0.25;


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
// QUIT
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

            kills:
                player.kills,

            credits:
                player.credits,

            time:
                Date.now()
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
// NEW RUN
// ============================================================

if (newGameButton) {

    newGameButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            newGame();
        }
    );
}


// ============================================================
// CONTINUE
// ============================================================

if (loadGameButton) {

    loadGameButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            loadGame();
        }
    );
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

if (achievementsButton) {

    achievementsButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showAchievements();
        }
    );
}


// ============================================================
// CONTROLS
// ============================================================

if (controlsButton) {

    controlsButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            showControls();
        }
    );
}


// ============================================================
// RESUME
// ============================================================

if (resumeButton) {

    resumeButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            togglePause();
        }
    );
}


// ============================================================
// SAVE
// ============================================================

if (saveButton) {

    saveButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            saveGame();
        }
    );
}


// ============================================================
// QUIT
// ============================================================

if (quitButton) {

    quitButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            quitToMenu();
        }
    );
}


// ============================================================
// START UI
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
// GAME LOOP
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


    if (
        gameRunning &&
        !gamePaused
    ) {

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
// START
// ============================================================

console.log(
    "================================"
);

console.log(
    "ECHOBOUND NIEUWE APP.JS GELADEN"
);

console.log(
    "Tank voorkant: -Z"
);

console.log(
    "W = vooruit"
);

console.log(
    "A/D = draaien"
);

console.log(
    "Muis = camera"
);

console.log(
    "Klik = schieten"
);

console.log(
    "Firebase = actief"
);

console.log(
    "================================"
);
