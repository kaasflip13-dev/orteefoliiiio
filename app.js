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


/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyDI32LBA050EFJujB5N_1QonDxbxhAOATg",
    authDomain: "echobound-52fdb.firebaseapp.com",
    databaseURL:
        "https://echobound-52fdb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "echobound-52fdb",
    storageBucket: "echobound-52fdb.firebasestorage.app",
    messagingSenderId: "1009201119169",
    appId: "1:1009201119169:web:6adf0afd74b7df66d73940"
};

const firebaseApp =
    initializeApp(firebaseConfig);

const database =
    getDatabase(firebaseApp);

const auth =
    getAuth(firebaseApp);

let firebaseUser = null;
let firebaseReady = false;

signInAnonymously(auth)
    .then(result => {

        firebaseUser =
            result.user;

        firebaseReady =
            true;

        console.log(
            "Firebase verbonden!"
        );

        console.log(
            "Firebase UID:",
            firebaseUser.uid
        );

    })
    .catch(error => {

        console.error(
            "Firebase login mislukt:",
            error
        );

    });


/* =========================================================
   DOM
========================================================= */

const game =
    document.getElementById("game");

const menu =
    document.getElementById("menu");

const hud =
    document.getElementById("hud");

const pauseScreen =
    document.getElementById("pause");

const achievementScreen =
    document.getElementById("achievement");


/* =========================================================
   RENDERER
========================================================= */

const renderer =
    new THREE.WebGLRenderer({
        antialias: true
    });

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

renderer.shadowMap.enabled =
    true;

renderer.shadowMap.type =
    THREE.PCFShadowMap;

if (game) {

    game.appendChild(
        renderer.domElement
    );

}


/* =========================================================
   SCENE
========================================================= */

const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(
        0x101722
    );

scene.fog =
    new THREE.Fog(
        0x101722,
        80,
        260
    );


/* =========================================================
   CAMERA
========================================================= */

const camera =
    new THREE.PerspectiveCamera(
        70,
        window.innerWidth /
            window.innerHeight,
        0.1,
        500
    );

camera.position.set(
    0,
    8,
    15
);


/* =========================================================
   LIGHTS
========================================================= */

const ambientLight =
    new THREE.HemisphereLight(
        0x9db7d0,
        0x172015,
        2.0
    );

scene.add(
    ambientLight
);


const sun =
    new THREE.DirectionalLight(
        0xffffff,
        2.5
    );

sun.position.set(
    50,
    100,
    40
);

sun.castShadow =
    true;

sun.shadow.mapSize.width =
    2048;

sun.shadow.mapSize.height =
    2048;

scene.add(
    sun
);


/* =========================================================
   GROUND
========================================================= */

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x26352a,
        roughness: 1
    });

const ground =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            500,
            500
        ),
        groundMaterial
    );

ground.rotation.x =
    -Math.PI / 2;

ground.receiveShadow =
    true;

scene.add(
    ground
);


/* =========================================================
   GRID
========================================================= */

const grid =
    new THREE.GridHelper(
        500,
        100,
        0x42544a,
        0x28342f
    );

grid.position.y =
    0.02;

scene.add(
    grid
);


/* =========================================================
   GAME STATE
========================================================= */

let gameRunning =
    false;

let gamePaused =
    false;

let gameOver =
    false;

let clock =
    new THREE.Clock();


/* =========================================================
   PLAYER
========================================================= */

const player = {

    position:
        new THREE.Vector3(
            0,
            0,
            20
        ),

    rotation: 0,

    turretRotation: 0,

    cannonPitch: 0,

    health: 100,

    energy: 100,

    ammo: 8,

    maxAmmo: 8,

    kills: 0,

    credits: 0,

    speed: 8,

    reverseSpeed: 4,

    turnSpeed: 1.75,

    fireCooldown: 0,

    reloadTimer: 0,

    isReloading: false,

    recoil: 0

};


/* =========================================================
   CAMERA SETTINGS
========================================================= */

const CAMERA_DISTANCE =
    15;

const CAMERA_HEIGHT =
    7;

const CAMERA_TARGET_HEIGHT =
    1.4;

const CAMERA_SMOOTHNESS =
    8;

let cameraYaw =
    0;

let cameraPitch =
    0.20;

const MIN_CAMERA_PITCH =
    -0.3;

const MAX_CAMERA_PITCH =
    0.7;

const CAMERA_SENSITIVITY =
    0.0025;


/* =========================================================
   INPUT
========================================================= */

const keys = {};

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] =
            true;

        if (
            event.code ===
            "KeyR"
        ) {

            reload();

        }

        if (
            event.code ===
            "Escape"
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

        keys[event.code] =
            false;

    }
);


/* =========================================================
   POINTER LOCK
========================================================= */

renderer.domElement.addEventListener(
    "click",
    () => {

        if (
            gameRunning &&
            !gamePaused &&
            !gameOver
        ) {

            renderer.domElement.requestPointerLock();

        }

    }
);


document.addEventListener(
    "mousemove",
    event => {

        if (
            document.pointerLockElement !==
            renderer.domElement
        ) {

            return;

        }


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


document.addEventListener(
    "mousedown",
    event => {

        if (
            event.button === 0 &&
            gameRunning &&
            !gamePaused &&
            !gameOver
        ) {

            shoot();

        }

    }
);


/* =========================================================
   TANK
========================================================= */

const tank =
    new THREE.Group();

scene.add(
    tank
);


/* =========================================================
   TANK MATERIALS
========================================================= */

const tankBodyMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x394b4d,
        metalness: 0.8,
        roughness: 0.35
    });

const tankDarkMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x151c1e,
        metalness: 0.7,
        roughness: 0.5
    });

const tankGlowMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x26d9ff,
        emissive: 0x087c99,
        emissiveIntensity: 4
    });


/* =========================================================
   TANK BODY
========================================================= */

const tankBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            5.2,
            1.55,
            3.5
        ),
        tankBodyMaterial
    );

tankBody.position.y =
    1.25;

tankBody.castShadow =
    true;

tank.add(
    tankBody
);


/* =========================================================
   FRONT ARMOR
========================================================= */

const frontArmor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4.6,
            0.8,
            0.5
        ),
        tankBodyMaterial
    );

frontArmor.position.set(
    0,
    1.25,
    -1.85
);

frontArmor.castShadow =
    true;

tank.add(
    frontArmor
);


/* =========================================================
   TANK TOP
========================================================= */

const tankTop =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            3.5,
            0.5,
            2.5
        ),
        tankBodyMaterial
    );

tankTop.position.y =
    2.1;

tankTop.castShadow =
    true;

tank.add(
    tankTop
);


/* =========================================================
   TRACKS
========================================================= */

const leftTrack =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.75,
            1.4,
            3.8
        ),
        tankDarkMaterial
    );

leftTrack.position.set(
    -2.5,
    0.85,
    0
);

leftTrack.castShadow =
    true;

tank.add(
    leftTrack
);


const rightTrack =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.75,
            1.4,
            3.8
        ),
        tankDarkMaterial
    );

rightTrack.position.set(
    2.5,
    0.85,
    0
);

rightTrack.castShadow =
    true;

tank.add(
    rightTrack
);


/* =========================================================
   TRACK LIGHTS
========================================================= */

const leftGlow =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.08,
            0.3,
            3.0
        ),
        tankGlowMaterial
    );

leftGlow.position.set(
    -2.9,
    1,
    0
);

tank.add(
    leftGlow
);


const rightGlow =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.08,
            0.3,
            3.0
        ),
        tankGlowMaterial
    );

rightGlow.position.set(
    2.9,
    1,
    0
);

tank.add(
    rightGlow
);


/* =========================================================
   TURRET
========================================================= */

const turret =
    new THREE.Group();

turret.position.y =
    2.45;

tank.add(
    turret
);


const turretBody =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            1.7,
            1.9,
            0.8,
            8
        ),
        tankBodyMaterial
    );

turretBody.castShadow =
    true;

turret.add(
    turretBody
);


/* =========================================================
   CANNON
========================================================= */

const cannon =
    new THREE.Group();

cannon.position.set(
    0,
    0.1,
    -0.4
);

turret.add(
    cannon
);


const cannonBase =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.45,
            0.55,
            1.2,
            12
        ),
        tankDarkMaterial
    );

cannonBase.rotation.z =
    Math.PI / 2;

cannon.add(
    cannonBase
);


const barrel =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.22,
            0.3,
            5.8,
            14
        ),
        tankDarkMaterial
    );

barrel.rotation.x =
    Math.PI / 2;

barrel.position.z =
    -2.75;

barrel.castShadow =
    true;

cannon.add(
    barrel
);


/* =========================================================
   MUZZLE
========================================================= */

const muzzle =
    new THREE.Object3D();

muzzle.position.set(
    0,
    0,
    -5.7
);

cannon.add(
    muzzle
);


/* =========================================================
   OBSTACLES
========================================================= */

const obstacles = [];


function createObstacle(
    x,
    z,
    width,
    height,
    depth,
    color
) {

    const material =
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.9
        });

    const mesh =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            material
        );

    mesh.position.set(
        x,
        height / 2,
        z
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    scene.add(
        mesh
    );


    obstacles.push({

        object: mesh,

        radius:
            Math.max(
                width,
                depth
            ) / 2

    });

}


function createRock(
    x,
    z
) {

    const rock =
        new THREE.Mesh(
            new THREE.DodecahedronGeometry(
                2 +
                Math.random() * 2
            ),
            new THREE.MeshStandardMaterial({
                color: 0x4a514c,
                roughness: 1
            })
        );

    rock.position.set(
        x,
        1.3,
        z
    );

    rock.scale.y =
        0.8;

    rock.castShadow =
        true;

    rock.receiveShadow =
        true;

    scene.add(
        rock
    );


    obstacles.push({

        object: rock,

        radius: 2.5

    });

}


function generateWorld() {

    for (
        let i = 0;
        i < 30;
        i++
    ) {

        const x =
            (Math.random() - 0.5) *
            220;

        const z =
            (Math.random() - 0.5) *
            220;


        if (
            Math.abs(x) < 15 &&
            Math.abs(z) < 15
        ) {

            continue;

        }


        if (
            Math.random() <
            0.55
        ) {

            createRock(
                x,
                z
            );

        } else {

            createObstacle(
                x,
                z,
                4 +
                    Math.random() * 4,
                3 +
                    Math.random() * 4,
                4 +
                    Math.random() * 4,
                0x303b3c
            );

        }

    }

}

generateWorld();


/* =========================================================
   SIGNAL TOWER
========================================================= */

const tower =
    new THREE.Group();

tower.position.set(
    0,
    0,
    -70
);

scene.add(
    tower
);


const towerPole =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.5,
            0.8,
            18,
            12
        ),
        tankDarkMaterial
    );

towerPole.position.y =
    9;

towerPole.castShadow =
    true;

tower.add(
    towerPole
);


const towerLight =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            1,
            16,
            16
        ),
        tankGlowMaterial
    );

towerLight.position.y =
    18;

tower.add(
    towerLight
);


/* =========================================================
   ENEMIES
========================================================= */

const enemies = [];

const enemyMaterials = {

    body:
        new THREE.MeshStandardMaterial({
            color: 0x39272f,
            roughness: 0.8
        }),

    dark:
        new THREE.MeshStandardMaterial({
            color: 0x17151a,
            roughness: 0.9
        }),

    armor:
        new THREE.MeshStandardMaterial({
            color: 0x513943,
            metalness: 0.3,
            roughness: 0.7
        }),

    glow:
        new THREE.MeshStandardMaterial({
            color: 0xff274d,
            emissive: 0xb50028,
            emissiveIntensity: 6
        })

};


/* =========================================================
   ENEMY PART HELPER
========================================================= */

function enemyBox(
    parent,
    name,
    width,
    height,
    depth,
    material,
    x,
    y,
    z
) {

    const mesh =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            material
        );

    mesh.name =
        name;

    mesh.position.set(
        x,
        y,
        z
    );

    mesh.castShadow =
        true;

    parent.add(
        mesh
    );

    return mesh;

}


/* =========================================================
   CLAW
========================================================= */

function createClaw(
    parent,
    name
) {

    const claw =
        new THREE.Group();

    claw.name =
        name;

    parent.add(
        claw
    );


    enemyBox(
        claw,
        "clawPalm",
        0.8,
        0.45,
        1.1,
        enemyMaterials.dark,
        0,
        0,
        -0.55
    );


    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const finger =
            enemyBox(
                claw,
                "finger",
                0.18,
                0.35,
                0.9,
                enemyMaterials.armor,
                (i - 1) *
                    0.25,
                -0.05,
                -1.25
            );

        finger.rotation.x =
            -0.35;

    }


    return claw;

}


/* =========================================================
   CREATE ENEMY
========================================================= */

function createEnemy(
    x,
    z,
    type = "stalker"
) {

    const enemy =
        new THREE.Group();

    enemy.position.set(
        x,
        0,
        z
    );


    let health = 80;
    let speed = 2.3;
    let radius = 2.0;
    let height = 7;


    /* =====================================================
       STALKER
    ===================================================== */

    if (
        type ===
        "stalker"
    ) {

        health = 80;
        speed = 2.3;
        radius = 2.0;
        height = 7;


        // lichaam
        enemyBox(
            enemy,
            "body",
            1.8,
            3.2,
            1.6,
            enemyMaterials.body,
            0,
            2.5,
            0
        );


        // borst
        enemyBox(
            enemy,
            "chestArmor",
            2.1,
            1.5,
            1.8,
            enemyMaterials.armor,
            0,
            3.0,
            -0.1
        );


        // hoofd
        enemyBox(
            enemy,
            "head",
            1.55,
            1.7,
            1.55,
            enemyMaterials.dark,
            0,
            4.9,
            -0.05
        );


        // gezicht
        enemyBox(
            enemy,
            "face",
            1.1,
            0.7,
            0.3,
            enemyMaterials.armor,
            0,
            4.85,
            -0.85
        );


        // ogen
        enemyBox(
            enemy,
            "eyeLeft",
            0.25,
            0.2,
            0.1,
            enemyMaterials.glow,
            -0.38,
            5.0,
            -1.02
        );

        enemyBox(
            enemy,
            "eyeRight",
            0.25,
            0.2,
            0.1,
            enemyMaterials.glow,
            0.38,
            5.0,
            -1.02
        );


        // armen
        const leftArm =
            enemyBox(
                enemy,
                "leftArm",
                0.65,
                3.0,
                0.7,
                enemyMaterials.body,
                -1.35,
                2.5,
                0
            );

        const rightArm =
            enemyBox(
                enemy,
                "rightArm",
                0.65,
                3.0,
                0.7,
                enemyMaterials.body,
                1.35,
                2.5,
                0
            );


        // klauwen
        const leftClaw =
            createClaw(
                leftArm,
                "leftClaw"
            );

        leftClaw.position.y =
            -1.65;


        const rightClaw =
            createClaw(
                rightArm,
                "rightClaw"
            );

        rightClaw.position.y =
            -1.65;


        // benen
        enemyBox(
            enemy,
            "leftLeg",
            0.8,
            2.5,
            0.9,
            enemyMaterials.dark,
            -0.65,
            0.8,
            0
        );

        enemyBox(
            enemy,
            "rightLeg",
            0.8,
            2.5,
            0.9,
            enemyMaterials.dark,
            0.65,
            0.8,
            0
        );


        // hoorns
        const horn1 =
            new THREE.Mesh(
                new THREE.ConeGeometry(
                    0.25,
                    1.4,
                    8
                ),
                enemyMaterials.armor
            );

        horn1.position.set(
            -0.55,
            6.15,
            0
        );

        horn1.rotation.z =
            -0.35;

        enemy.add(
            horn1
        );


        const horn2 =
            horn1.clone();

        horn2.position.x =
            0.55;

        horn2.rotation.z =
            0.35;

        enemy.add(
            horn2
        );

    }


    /* =====================================================
       CRAWLER
    ===================================================== */

    if (
        type ===
        "crawler"
    ) {

        health = 45;
        speed = 3.5;
        radius = 2.5;
        height = 3;


        enemyBox(
            enemy,
            "body",
            5.8,
            1.5,
            2.2,
            enemyMaterials.body,
            0,
            1.45,
            0
        );


        enemyBox(
            enemy,
            "backArmor",
            4.8,
            0.8,
            2.4,
            enemyMaterials.armor,
            0,
            2.2,
            0
        );


        enemyBox(
            enemy,
            "head",
            1.8,
            1.5,
            1.8,
            enemyMaterials.dark,
            0,
            1.7,
            -3.1
        );


        enemyBox(
            enemy,
            "eyeLeft",
            0.25,
            0.2,
            0.1,
            enemyMaterials.glow,
            -0.45,
            1.9,
            -4.02
        );


        enemyBox(
            enemy,
            "eyeRight",
            0.25,
            0.2,
            0.1,
            enemyMaterials.glow,
            0.45,
            1.9,
            -4.02
        );


        // zes poten
        for (
            let i = 0;
            i < 6;
            i++
        ) {

            const side =
                i % 2 === 0
                    ? -1
                    : 1;

            const index =
                Math.floor(
                    i / 2
                );

            const leg =
                enemyBox(
                    enemy,
                    "crawlerLeg",
                    0.45,
                    1.7,
                    0.5,
                    enemyMaterials.dark,
                    side * 2.0,
                    0.7,
                    -1.6 +
                        index * 1.6
                );

            leg.rotation.z =
                side *
                0.55;

        }


        // grote voor-klauwen
        const leftArm =
            enemyBox(
                enemy,
                "leftArm",
                0.55,
                1.8,
                0.6,
                enemyMaterials.body,
                -1.5,
                1.2,
                -2.0
            );

        const rightArm =
            enemyBox(
                enemy,
                "rightArm",
                0.55,
                1.8,
                0.6,
                enemyMaterials.body,
                1.5,
                1.2,
                -2.0
            );


        const leftClaw =
            createClaw(
                leftArm,
                "leftClaw"
            );

        leftClaw.position.y =
            -1;


        const rightClaw =
            createClaw(
                rightArm,
                "rightClaw"
            );

        rightClaw.position.y =
            -1;

    }


    /* =====================================================
       GUARDIAN
    ===================================================== */

    if (
        type ===
        "guardian"
    ) {

        health = 180;
        speed = 1.25;
        radius = 3.2;
        height = 9;


        enemyBox(
            enemy,
            "body",
            3.0,
            4.4,
            2.7,
            enemyMaterials.body,
            0,
            3.0,
            0
        );


        enemyBox(
            enemy,
            "chestArmor",
            3.6,
            2.1,
            3.0,
            enemyMaterials.armor,
            0,
            4.0,
            -0.1
        );


        // kern
        const core =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.8,
                    16,
                    16
                ),
                enemyMaterials.glow
            );

        core.position.set(
            0,
            4.0,
            -1.6
        );

        enemy.add(
            core
        );


        // hoofd
        enemyBox(
            enemy,
            "head",
            2.2,
            2.3,
            2.1,
            enemyMaterials.dark,
            0,
            6.5,
            0
        );


        enemyBox(
            enemy,
            "face",
            1.6,
            0.9,
            0.4,
            enemyMaterials.armor,
            0,
            6.4,
            -1.15
        );


        // ogen
        enemyBox(
            enemy,
            "eyeLeft",
            0.35,
            0.3,
            0.1,
            enemyMaterials.glow,
            -0.55,
            6.6,
            -1.3
        );


        enemyBox(
            enemy,
            "eyeRight",
            0.35,
            0.3,
            0.1,
            enemyMaterials.glow,
            0.55,
            6.6,
            -1.3
        );


        // armen
        const leftArm =
            enemyBox(
                enemy,
                "leftArm",
                0.95,
                4.0,
                1.1,
                enemyMaterials.body,
                -2.25,
                3.0,
                0
            );


        const rightArm =
            enemyBox(
                enemy,
                "rightArm",
                0.95,
                4.0,
                1.1,
                enemyMaterials.body,
                2.25,
                3.0,
                0
            );


        const leftClaw =
            createClaw(
                leftArm,
                "leftClaw"
            );

        leftClaw.position.y =
            -2.1;

        leftClaw.scale.set(
            1.4,
            1.4,
            1.4
        );


        const rightClaw =
            createClaw(
                rightArm,
                "rightClaw"
            );

        rightClaw.position.y =
            -2.1;

        rightClaw.scale.set(
            1.4,
            1.4,
            1.4
        );


        // benen
        enemyBox(
            enemy,
            "leftLeg",
            1.2,
            3.0,
            1.3,
            enemyMaterials.dark,
            -1.0,
            1.0,
            0
        );


        enemyBox(
            enemy,
            "rightLeg",
            1.2,
            3.0,
            1.3,
            enemyMaterials.dark,
            1.0,
            1.0,
            0
        );


        // hoorns
        for (
            let side of [-1, 1]
        ) {

            const horn =
                new THREE.Mesh(
                    new THREE.ConeGeometry(
                        0.45,
                        2.2,
                        8
                    ),
                    enemyMaterials.armor
                );

            horn.position.set(
                side * 0.9,
                8.0,
                0
            );

            horn.rotation.z =
                side *
                0.35;

            enemy.add(
                horn
            );

        }

    }


    /* =====================================================
       ENEMY LIGHT
    ===================================================== */

    const enemyLight =
        new THREE.PointLight(
            0xff1744,
            2.5,
            12
        );

    enemyLight.position.y =
        height * 0.65;

    enemy.add(
        enemyLight
    );


    /* =====================================================
       ENEMY DATA
    ===================================================== */

    enemy.userData.enemy =
        true;


    scene.add(
        enemy
    );


    enemies.push({

        object: enemy,

        type,

        health,

        maxHealth:
            health,

        speed,

        radius,

        height,

        dead: false,

        distanceToPlayer: 999,

        attackDistance:
            type === "crawler"
                ? 5
                : type === "guardian"
                    ? 6
                    : 4.5,

        attackAnimation: 0,

        attackCooldown:
            Math.random() *
            1.5,

        attackHit: false,

        isAttacking: false

    });

}


/* =========================================================
   SPAWN ENEMIES
========================================================= */

function spawnEnemies() {

    // Oude monsters verwijderen
    for (
        const enemy of enemies
    ) {

        if (
            enemy.object
        ) {

            scene.remove(
                enemy.object
            );

        }

    }

    enemies.length =
        0;


    const types = [
        "stalker",
        "crawler",
        "guardian"
    ];


    for (
        let i = 0;
        i < 18;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const distance =
            35 +
            Math.random() *
            100;


        const x =
            player.position.x +
            Math.cos(angle) *
            distance;


        const z =
            player.position.z +
            Math.sin(angle) *
            distance;


        const type =
            types[
                Math.floor(
                    Math.random() *
                    types.length
                )
            ];


        createEnemy(
            x,
            z,
            type
        );

    }

}


/* =========================================================
   ENEMY COLLISION
========================================================= */

function enemyBlocked(
    position,
    radius
) {

    for (
        const obstacle of obstacles
    ) {

        if (
            !obstacle ||
            !obstacle.object
        ) {

            continue;

        }


        const dx =
            position.x -
            obstacle.object.position.x;

        const dz =
            position.z -
            obstacle.object.position.z;


        const distance =
            Math.sqrt(
                dx * dx +
                dz * dz
            );


        const obstacleRadius =
            obstacle.radius ||
            2;


        if (
            distance <
            radius +
            obstacleRadius
        ) {

            return true;

        }

    }


    return false;

}


/* =========================================================
   ENEMY ATTACK ANIMATION
========================================================= */

function updateEnemyAttackAnimation(
    enemy,
    delta
) {

    if (
        !enemy ||
        enemy.dead ||
        !enemy.object
    ) {

        return;

    }


    const leftArm =
        enemy.object.getObjectByName(
            "leftArm"
        );

    const rightArm =
        enemy.object.getObjectByName(
            "rightArm"
        );


    const leftClaw =
        enemy.object.getObjectByName(
            "leftClaw"
        );

    const rightClaw =
        enemy.object.getObjectByName(
            "rightClaw"
        );


    enemy.attackCooldown -=
        delta;


    /* ==========================================
       NORMALE POSITIE
    ========================================== */

    if (
        !enemy.isAttacking
    ) {

        if (leftArm) {

            leftArm.rotation.x =
                THREE.MathUtils.lerp(
                    leftArm.rotation.x,
                    0,
                    delta * 8
                );

        }


        if (rightArm) {

            rightArm.rotation.x =
                THREE.MathUtils.lerp(
                    rightArm.rotation.x,
                    0,
                    delta * 8
                );

        }


        if (enemy.attackCooldown <= 0) {

            enemy.isAttacking =
                true;

            enemy.attackAnimation =
                0;

            enemy.attackHit =
                false;

        }

        return;

    }


    /* ==========================================
       ANIMATIE
    ========================================== */

    enemy.attackAnimation +=
        delta * (
            enemy.type ===
            "guardian"
                ? 3.2
                : 4.5
        );


    const t =
        enemy.attackAnimation;


    /* ==========================================
       FASE 1 — ARMEN OMHOOG
    ========================================== */

    if (
        t < 0.35
    ) {

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


    /* ==========================================
       FASE 2 — SLAG
    ========================================== */

    else if (
        t < 0.65
    ) {

        const p =
            (t - 0.35) /
            0.30;


        if (leftArm) {

            leftArm.rotation.x =
                -1.5 +
                p * 2.7;

        }


        if (rightArm) {

            rightArm.rotation.x =
                -1.5 +
                p * 2.7;

        }


        if (
            !enemy.attackHit &&
            p > 0.45
        ) {

            enemy.attackHit =
                true;


            if (
                enemy.distanceToPlayer <
                enemy.attackDistance +
                0.8
            ) {

                let damage = 7;


                if (
                    enemy.type ===
                    "guardian"
                ) {

                    damage =
                        18;

                }


                if (
                    enemy.type ===
                    "crawler"
                ) {

                    damage =
                        5;

                }


                player.health -=
                    damage;


                if (
                    player.health <
                    0
                ) {

                    player.health =
                        0;

                }


                createHitParticles(
                    player.position.clone()
                );


                // Guardian duwt de tank terug
                if (
                    enemy.type ===
                    "guardian"
                ) {

                    const push =
                        new THREE.Vector3()
                            .subVectors(
                                player.position,
                                enemy.object.position
                            )
                            .normalize();


                    player.position.add(
                        push.multiplyScalar(
                            1.2
                        )
                    );

                }


                if (
                    player.health <=
                    0 &&
                    !gameOver
                ) {

                    gameOver =
                        true;

                    showGameOver();

                }

            }

        }

    }


    /* ==========================================
       FASE 3 — ARMEN TERUG
    ========================================== */

    else if (
        t < 1.05
    ) {

        const p =
            (t - 0.65) /
            0.40;


        if (leftArm) {

            leftArm.rotation.x =
                1.2 -
                p * 1.2;

        }


        if (rightArm) {

            rightArm.rotation.x =
                1.2 -
                p * 1.2;

        }

    }


    /* ==========================================
       EINDE
    ========================================== */

    else {

        enemy.isAttacking =
            false;

        enemy.attackAnimation =
            0;

        enemy.attackHit =
            false;


        enemy.attackCooldown =
            enemy.type ===
            "guardian"
                ? 1.5
                : enemy.type ===
                    "crawler"
                    ? 0.8
                    : 1.1;

    }

}


/* =========================================================
   ENEMY UPDATE
========================================================= */

function updateEnemies(
    delta
) {

    for (
        const enemy of enemies
    ) {

        if (
            !enemy ||
            enemy.dead ||
            !enemy.object
        ) {

            continue;

        }


        const dx =
            player.position.x -
            enemy.object.position.x;

        const dz =
            player.position.z -
            enemy.object.position.z;


        const distance =
            Math.sqrt(
                dx * dx +
                dz * dz
            );


        enemy.distanceToPlayer =
            distance;


        /* ======================================
           KIJK NAAR TANK
        ====================================== */

        enemy.object.lookAt(
            player.position.x,
            enemy.object.position.y,
            player.position.z
        );


        /* ======================================
           AANVAL
        ====================================== */

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


        /* ======================================
           BEWEGING
        ====================================== */

        const direction =
            new THREE.Vector3(
                dx,
                0,
                dz
            );


        if (
            direction.lengthSq() <
            0.001
        ) {

            continue;

        }


        direction.normalize();


        const moveSpeed =
            enemy.speed;


        const moveAmount =
            moveSpeed *
            delta;


        const newX =
            enemy.object.position.x +
            direction.x *
            moveAmount;


        const newZ =
            enemy.object.position.z +
            direction.z *
            moveAmount;


        const newPosition =
            new THREE.Vector3(
                newX,
                0,
                newZ
            );


        if (
            !enemyBlocked(
                newPosition,
                enemy.radius
            )
        ) {

            enemy.object.position.x =
                newX;

            enemy.object.position.z =
                newZ;

        } else {

            // Probeer linksom
            const side1 =
                new THREE.Vector3(
                    enemy.object.position.x +
                        direction.z *
                        moveAmount,
                    0,
                    enemy.object.position.z -
                        direction.x *
                        moveAmount
                );


            // Probeer rechtsom
            const side2 =
                new THREE.Vector3(
                    enemy.object.position.x -
                        direction.z *
                        moveAmount,
                    0,
                    enemy.object.position.z +
                        direction.x *
                        moveAmount
                );


            if (
                !enemyBlocked(
                    side1,
                    enemy.radius
                )
            ) {

                enemy.object.position.x =
                    side1.x;

                enemy.object.position.z =
                    side1.z;

            } else if (
                !enemyBlocked(
                    side2,
                    enemy.radius
                )
            ) {

                enemy.object.position.x =
                    side2.x;

                enemy.object.position.z =
                    side2.z;

            }

        }


        /* ======================================
           LOOP-ANIMATIE TIJDENS LOPEN
        ====================================== */

        const walkTime =
            performance.now() *
            0.008;


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
            rightArm &&
            !enemy.isAttacking
        ) {

            const swing =
                Math.sin(
                    walkTime *
                    (enemy.type ===
                    "crawler"
                        ? 1.8
                        : 1.2)
                ) *
                0.25;


            leftArm.rotation.x =
                swing;

            rightArm.rotation.x =
                -swing;

        }

    }

}


/* =========================================================
   BULLETS
========================================================= */

const bullets = [];


function shoot() {

    if (
        !gameRunning ||
        gamePaused ||
        gameOver
    ) {

        return;

    }


    if (
        player.isReloading
    ) {

        return;

    }


    if (
        player.fireCooldown >
        0
    ) {

        return;

    }


    if (
        player.ammo <= 0
    ) {

        reload();

        return;

    }


    player.ammo--;

    player.fireCooldown =
        0.7;

    player.recoil =
        0.35;


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.18,
                12,
                12
            ),
            new THREE.MeshBasicMaterial({
                color: 0xffd45a
            })
        );


    const start =
        new THREE.Vector3();

    muzzle.getWorldPosition(
        start
    );


    const direction =
        new THREE.Vector3();

    camera.getWorldDirection(
        direction
    );

    direction.normalize();


    bullet.position.copy(
        start
    );


    scene.add(
        bullet
    );


    bullets.push({

        object: bullet,

        velocity:
            direction.multiplyScalar(
                75
            ),

        life: 4,

        damage: 50

    });


    // muzzle flash
    createMuzzleFlash(
        start
    );

}


/* =========================================================
   BULLET UPDATE
========================================================= */

function updateBullets(
    delta
) {

    for (
        let i =
            bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        bullet.object.position.add(
            bullet.velocity
                .clone()
                .multiplyScalar(
                    delta
                )
        );


        bullet.life -=
            delta;


        let remove =
            bullet.life <= 0;


        /* ======================================
           ENEMY HIT
        ====================================== */

        if (
            !remove
        ) {

            for (
                const enemy of enemies
            ) {

                if (
                    enemy.dead
                ) {

                    continue;

                }


                const hitPoint =
                    new THREE.Vector3(
                        0,
                        enemy.height *
                            0.55,
                        0
                    );


                enemy.object.localToWorld(
                    hitPoint
                );


                const distance =
                    bullet.object.position
                        .distanceTo(
                            hitPoint
                        );


                if (
                    distance <
                    enemy.radius +
                    0.7
                ) {

                    enemy.health -=
                        bullet.damage;


                    createHitParticles(
                        bullet.object
                            .position
                            .clone()
                    );


                    remove =
                        true;


                    if (
                        enemy.health <=
                        0
                    ) {

                        killEnemy(
                            enemy
                        );

                    }


                    break;

                }

            }

        }


        if (
            remove
        ) {

            scene.remove(
                bullet.object
            );

            bullets.splice(
                i,
                1
            );

        }

    }

}


/* =========================================================
   KILL ENEMY
========================================================= */

function killEnemy(
    enemy
) {

    if (
        enemy.dead
    ) {

        return;

    }


    enemy.dead =
        true;


    createExplosion(
        enemy.object.position.clone()
    );


    scene.remove(
        enemy.object
    );


    player.kills++;


    if (
        enemy.type ===
        "guardian"
    ) {

        player.credits +=
            120;

    } else if (
        enemy.type ===
        "crawler"
    ) {

        player.credits +=
            35;

    } else {

        player.credits +=
            55;

    }


    checkAchievements();

}


/* =========================================================
   PARTICLES
========================================================= */

const particles = [];


function createHitParticles(
    position
) {

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const particle =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.08,
                    6,
                    6
                ),
                new THREE.MeshBasicMaterial({
                    color: 0xff7b4d
                })
            );


        particle.position.copy(
            position
        );


        scene.add(
            particle
        );


        particles.push({

            object: particle,

            velocity:
                new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 4,
                    (Math.random() - 0.5) * 5
                ),

            life: 0.5

        });

    }

}


function createExplosion(
    position
) {

    for (
        let i = 0;
        i < 20;
        i++
    ) {

        const particle =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.12,
                    6,
                    6
                ),
                new THREE.MeshBasicMaterial({
                    color:
                        i % 2 === 0
                            ? 0xff334f
                            : 0xffb347
                })
            );


        particle.position.copy(
            position
        );


        scene.add(
            particle
        );


        particles.push({

            object: particle,

            velocity:
                new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 7,
                    (Math.random() - 0.5) * 8
                ),

            life: 0.8

        });

    }

}


function createMuzzleFlash(
    position
) {

    const flash =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.5,
                12,
                12
            ),
            new THREE.MeshBasicMaterial({
                color: 0xffc44d
            })
        );


    flash.position.copy(
        position
    );


    scene.add(
        flash
    );


    setTimeout(
        () => {

            scene.remove(
                flash
            );

        },
        70
    );

}


function updateParticles(
    delta
) {

    for (
        let i =
            particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            particles[i];


        particle.object.position.add(
            particle.velocity
                .clone()
                .multiplyScalar(
                    delta
                )
        );


        particle.velocity.y -=
            8 *
            delta;


        particle.life -=
            delta;


        if (
            particle.life <= 0
        ) {

            scene.remove(
                particle.object
            );

            particles.splice(
                i,
                1
            );

        }

    }

}


/* =========================================================
   TANK MOVEMENT
========================================================= */

function tankBlocked(
    position
) {

    for (
        const obstacle of obstacles
    ) {

        const distance =
            position.distanceTo(
                obstacle.object.position
            );


        if (
            distance <
            obstacle.radius +
            3
        ) {

            return true;

        }

    }


    return false;

}


function updatePlayer(
    delta
) {

    if (
        player.fireCooldown >
        0
    ) {

        player.fireCooldown -=
            delta;

    }


    if (
        player.recoil >
        0
    ) {

        player.recoil -=
            delta * 2;

    }


    /* ======================================
       RELOAD
    ====================================== */

    if (
        player.isReloading
    ) {

        player.reloadTimer -=
            delta;


        if (
            player.reloadTimer <=
            0
        ) {

            player.ammo =
                player.maxAmmo;

            player.isReloading =
                false;

        }

    }


    /* ======================================
       TURN
    ====================================== */

    if (
        keys["KeyA"]
    ) {

        player.rotation +=
            player.turnSpeed *
            delta;

    }


    if (
        keys["KeyD"]
    ) {

        player.rotation -=
            player.turnSpeed *
            delta;

    }


    /* ======================================
       FORWARD
    ====================================== */

    let movement =
        0;


    if (
        keys["KeyW"]
    ) {

        movement =
            player.speed;

    }


    if (
        keys["KeyS"]
    ) {

        movement =
            -player.reverseSpeed;

    }


    if (
        movement !== 0
    ) {

        const forward =
            new THREE.Vector3(
                Math.sin(
                    player.rotation
                ),
                0,
                -Math.cos(
                    player.rotation
                )
            );


        const nextPosition =
            player.position.clone();


        nextPosition.add(
            forward.multiplyScalar(
                movement *
                delta
            )
        );


        if (
            !tankBlocked(
                nextPosition
            )
        ) {

            player.position.copy(
                nextPosition
            );

        }

    }


    /* ======================================
       TANK TRANSFORM
    ====================================== */

    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    /* ======================================
       TURRET NAAR CAMERA
    ====================================== */

    const turretTarget =
        cameraYaw -
        player.rotation;


    let turretDifference =
        turretTarget -
        player.turretRotation;


    while (
        turretDifference >
        Math.PI
    ) {

        turretDifference -=
            Math.PI * 2;

    }


    while (
        turretDifference <
        -Math.PI
    ) {

        turretDifference +=
            Math.PI * 2;

    }


    player.turretRotation +=
        turretDifference *
        Math.min(
            1,
            delta * 8
        );


    turret.rotation.y =
        player.turretRotation;


    cannon.rotation.x =
        -cameraPitch *
        0.7;

}


/* =========================================================
   RELOAD
========================================================= */

function reload() {

    if (
        player.isReloading
    ) {

        return;

    }


    if (
        player.ammo >=
        player.maxAmmo
    ) {

        return;

    }


    player.isReloading =
        true;

    player.reloadTimer =
        1.8;

}


/* =========================================================
   CAMERA
========================================================= */

function updateCamera(
    delta
) {

    const target =
        new THREE.Vector3(
            player.position.x,
            player.position.y +
                CAMERA_TARGET_HEIGHT,
            player.position.z
        );


    const horizontalDistance =
        CAMERA_DISTANCE *
        Math.cos(
            cameraPitch
        );


    const offset =
        new THREE.Vector3(

            Math.sin(
                cameraYaw
            ) *
            horizontalDistance,

            CAMERA_HEIGHT +
                Math.sin(
                    cameraPitch
                ) *
                CAMERA_DISTANCE,

            Math.cos(
                cameraYaw
            ) *
            horizontalDistance

        );


    const desiredPosition =
        target.clone().add(
            offset
        );


    camera.position.lerp(
        desiredPosition,
        Math.min(
            1,
            delta *
                CAMERA_SMOOTHNESS
        )
    );


    camera.lookAt(
        target
    );

}


/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    const healthBar =
        document.getElementById(
            "healthBar"
        );

    const energyBar =
        document.getElementById(
            "energyBar"
        );

    const ammo =
        document.getElementById(
            "ammo"
        );

    const kills =
        document.getElementById(
            "kills"
        );

    const credits =
        document.getElementById(
            "credits"
        );


    if (
        healthBar
    ) {

        healthBar.style.width =
            player.health +
            "%";

    }


    if (
        energyBar
    ) {

        energyBar.style.width =
            player.energy +
            "%";

    }


    if (
        ammo
    ) {

        ammo.textContent =
            player.isReloading
                ? "RELOADING..."
                : player.ammo +
                    " / " +
                    player.maxAmmo;

    }


    if (
        kills
    ) {

        kills.textContent =
            player.kills;

    }


    if (
        credits
    ) {

        credits.textContent =
            player.credits;

    }

}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

function checkAchievements() {

    const achievements =
        JSON.parse(
            localStorage.getItem(
                "echobound_achievements"
            ) ||
            "[]"
        );


    if (
        player.kills >= 1 &&
        !achievements.includes(
            "first"
        )
    ) {

        achievements.push(
            "first"
        );

        showAchievement(
            "FIRST BLOOD",
            "Je hebt je eerste monster verslagen."
        );

    }


    if (
        player.kills >= 10 &&
        !achievements.includes(
            "hunter"
        )
    ) {

        achievements.push(
            "hunter"
        );

        showAchievement(
            "MONSTER HUNTER",
            "Je hebt 10 monsters verslagen."
        );

    }


    if (
        player.kills >= 25 &&
        !achievements.includes(
            "survivor"
        )
    ) {

        achievements.push(
            "survivor"
        );

        showAchievement(
            "SURVIVOR",
            "Je hebt 25 monsters verslagen."
        );

    }


    localStorage.setItem(
        "echobound_achievements",
        JSON.stringify(
            achievements
        )
    );

}


function showAchievement(
    title,
    description
) {

    if (
        !achievementScreen
    ) {

        return;

    }


    achievementScreen.innerHTML =
        `
        <div class="achievement-card">
            <h2>${title}</h2>
            <p>${description}</p>
        </div>
        `;


    achievementScreen.style.display =
        "flex";


    setTimeout(
        () => {

            achievementScreen.style.display =
                "none";

        },
        3000
    );

}


/* =========================================================
   SAVE
========================================================= */

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

        }

    };


    localStorage.setItem(
        "echobound_tank_save",
        JSON.stringify(
            saveData
        )
    );


    if (
        firebaseReady &&
        firebaseUser
    ) {

        try {

            await set(
                ref(
                    database,
                    "players/" +
                    firebaseUser.uid +
                    "/save1"
                ),
                saveData
            );


            console.log(
                "Game opgeslagen in Firebase!"
            );

        } catch (
            error
        ) {

            console.error(
                "Firebase save fout:",
                error
            );

        }

    }

}


/* =========================================================
   LOAD
========================================================= */

async function loadGame() {

    let saveData =
        null;


    if (
        firebaseReady &&
        firebaseUser
    ) {

        try {

            const snapshot =
                await get(
                    ref(
                        database,
                        "players/" +
                        firebaseUser.uid +
                        "/save1"
                    )
                );


            if (
                snapshot.exists()
            ) {

                saveData =
                    snapshot.val();

            }

        } catch (
            error
        ) {

            console.error(
                "Firebase load fout:",
                error
            );

        }

    }


    if (
        !saveData
    ) {

        const localSave =
            localStorage.getItem(
                "echobound_tank_save"
            );


        if (
            localSave
        ) {

            saveData =
                JSON.parse(
                    localSave
                );

        }

    }


    if (
        saveData
    ) {

        applyLoadedGame(
            saveData
        );

    } else {

        alert(
            "Geen opgeslagen game gevonden."
        );

    }

}


/* =========================================================
   APPLY SAVE
========================================================= */

function applyLoadedGame(
    saveData
) {

    const p =
        saveData.player;


    player.position.set(
        p.x || 0,
        p.y || 0,
        p.z || 20
    );


    player.rotation =
        p.rotation || 0;


    player.health =
        p.health ?? 100;


    player.energy =
        p.energy ?? 100;


    player.ammo =
        p.ammo ?? 8;


    player.kills =
        p.kills ?? 0;


    player.credits =
        p.credits ?? 0;


    spawnEnemies();


    gameRunning =
        true;

    gamePaused =
        false;

    gameOver =
        false;


    if (menu) {

        menu.style.display =
            "none";

    }


    if (hud) {

        hud.style.display =
            "block";

    }


    updateHUD();

}


/* =========================================================
   NEW GAME
========================================================= */

function newGame() {

    player.position.set(
        0,
        0,
        20
    );


    player.rotation =
        0;

    player.health =
        100;

    player.energy =
        100;

    player.ammo =
        player.maxAmmo;

    player.kills =
        0;

    player.credits =
        0;

    player.isReloading =
        false;

    player.fireCooldown =
        0;


    gameRunning =
        true;

    gamePaused =
        false;

    gameOver =
        false;


    spawnEnemies();


    if (menu) {

        menu.style.display =
            "none";

    }


    if (pauseScreen) {

        pauseScreen.style.display =
            "none";

    }


    if (hud) {

        hud.style.display =
            "block";

    }


    updateHUD();

}


/* =========================================================
   PAUSE
========================================================= */

function togglePause() {

    gamePaused =
        !gamePaused;


    if (
        pauseScreen
    ) {

        pauseScreen.style.display =
            gamePaused
                ? "flex"
                : "none";

    }

}


/* =========================================================
   GAME OVER
========================================================= */

function showGameOver() {

    gameRunning =
        false;


    if (
        document.pointerLockElement
    ) {

        document.exitPointerLock();

    }


    const screen =
        document.createElement(
            "div"
        );


    screen.style.position =
        "fixed";

    screen.style.inset =
        "0";

    screen.style.display =
        "flex";

    screen.style.flexDirection =
        "column";

    screen.style.alignItems =
        "center";

    screen.style.justifyContent =
        "center";

    screen.style.background =
        "rgba(0,0,0,0.85)";

    screen.style.color =
        "white";

    screen.style.zIndex =
        "9999";


    screen.innerHTML =
        `
        <h1>GAME OVER</h1>

        <p>
            Monsters verslagen:
            ${player.kills}
        </p>

        <button id="restartEchoBound">
            OPNIEUW BEGINNEN
        </button>
        `;


    document.body.appendChild(
        screen
    );


    document
        .getElementById(
            "restartEchoBound"
        )
        .onclick =
        () => {

            screen.remove();

            newGame();

        };

}


/* =========================================================
   BUTTON HELPERS
========================================================= */

function bindButton(
    ids,
    callback
) {

    for (
        const id of ids
    ) {

        const button =
            document.getElementById(
                id
            );


        if (
            button
        ) {

            button.onclick =
                callback;

        }

    }

}


/* =========================================================
   MENU BUTTONS
========================================================= */

bindButton(
    [
        "startBtn",
        "newGameBtn",
        "newRunBtn",
        "startGameBtn"
    ],
    newGame
);


bindButton(
    [
        "loadGameBtn",
        "loadBtn"
    ],
    loadGame
);


bindButton(
    [
        "saveGameBtn",
        "saveBtn"
    ],
    saveGame
);


bindButton(
    [
        "pauseBtn"
    ],
    togglePause
);


bindButton(
    [
        "resumeBtn"
    ],
    togglePause
);


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop() {

    requestAnimationFrame(
        gameLoop
    );


    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    if (
        gameRunning &&
        !gamePaused &&
        !gameOver
    ) {

        updatePlayer(
            delta
        );


        updateEnemies(
            delta
        );


        updateBullets(
            delta
        );


        updateParticles(
            delta
        );


        updateCamera(
            delta
        );


        updateHUD();

    }


    renderer.render(
        scene,
        camera
    );

}


gameLoop();


/* =========================================================
   RESIZE
========================================================= */

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


/* =========================================================
   START
========================================================= */

updateCamera(
    1
);

updateHUD();

console.log(
    "EchoBound gestart."
);
/* =========================================================
   START RUN — EXTRA VEILIGE KOPPELING
========================================================= */

function findStartRunButton() {

    const buttons =
        document.querySelectorAll("button");

    for (const button of buttons) {

        const text =
            button.textContent
                .trim()
                .toLowerCase();

        if (
            text === "start run" ||
            text === "start game" ||
            text === "new run" ||
            text === "start"
        ) {

            return button;

        }

    }

    return null;
}


const startRunButton =
    findStartRunButton();


if (startRunButton) {

    // Oude klik-events niet blokkeren
    startRunButton.addEventListener(
        "click",
        () => {

            console.log(
                "START RUN ingedrukt"
            );

            newGame();

        }
    );

} else {

    console.warn(
        "START RUN knop niet gevonden."
    );

}
