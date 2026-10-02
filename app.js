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
   ECHOBOUND — THE LOST SIGNAL
   THIRD PERSON TANK
   FIREBASE SAVE SYSTEM
   GROTERE EN LANGERE MONSTERS
========================================================= */


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyDI32LBA050EFJujB5N_1QonDxbxhAOATg",
    authDomain: "echobound-52fdb.firebaseapp.com",
    databaseURL: "https://echobound-52fdb-default-rtdb.europe-west1.firebasedatabase.app",
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


/* =========================================================
   FIREBASE LOGIN
========================================================= */

const firebaseLogin =
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

            firebaseReady =
                false;

            console.error(
                "Firebase login mislukt:",
                error
            );

        });


/* =========================================================
   DOM
========================================================= */

const canvas =
    document.getElementById("game");

const menu =
    document.getElementById("menu");

const hud =
    document.getElementById("hud");

const pause =
    document.getElementById("pause");

const achievement =
    document.getElementById("achievement");

const healthBar =
    document.getElementById("healthBar");

const energyBar =
    document.getElementById("energyBar");

const ammoText =
    document.getElementById("ammo");

const killsText =
    document.getElementById("kills");

const creditsText =
    document.getElementById("credits");

const zoneText =
    document.getElementById("zone");

const objectiveText =
    document.getElementById("objective");


/* =========================================================
   RENDERER
========================================================= */

const renderer =
    new THREE.WebGLRenderer({

        canvas,

        antialias: true,

        powerPreference:
            "high-performance"

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


/*
   Three.js 0.186 gebruikt geen
   PCFSoftShadowMap meer.
*/

renderer.shadowMap.type =
    THREE.PCFShadowMap;


renderer.outputColorSpace =
    THREE.SRGBColorSpace;


/* =========================================================
   SCENE
========================================================= */

const scene =
    new THREE.Scene();


scene.background =
    new THREE.Color(
        0x061014
    );


scene.fog =
    new THREE.FogExp2(
        0x061014,
        0.0042
    );


/* =========================================================
   CAMERA
========================================================= */

const camera =
    new THREE.PerspectiveCamera(

        67,

        window.innerWidth /
        window.innerHeight,

        0.1,

        700

    );


camera.position.set(
    0,
    7,
    15
);


const CAMERA_DISTANCE =
    15;

const CAMERA_HEIGHT =
    7;

const CAMERA_TARGET_HEIGHT =
    1.15;

const CAMERA_SMOOTHNESS =
    10;

let cameraYaw =
    0;

let cameraPitch =
    0.20;

const MIN_CAMERA_PITCH =
    -0.28;

const MAX_CAMERA_PITCH =
    0.72;

const CAMERA_SENSITIVITY =
    0.0024;


/* =========================================================
   LIGHT
========================================================= */

const hemi =
    new THREE.HemisphereLight(

        0x9befff,
        0x101419,
        2.4

    );

scene.add(hemi);


const sun =
    new THREE.DirectionalLight(

        0xdffaff,
        3.4

    );


sun.position.set(
    -80,
    110,
    50
);


sun.castShadow =
    true;


sun.shadow.mapSize.width =
    2048;

sun.shadow.mapSize.height =
    2048;

sun.shadow.camera.left =
    -150;

sun.shadow.camera.right =
    150;

sun.shadow.camera.top =
    150;

sun.shadow.camera.bottom =
    -150;


scene.add(sun);


/* =========================================================
   GROUND
========================================================= */

const ground =
    new THREE.Mesh(

        new THREE.PlaneGeometry(
            360,
            360
        ),

        new THREE.MeshStandardMaterial({

            color: 0x101a1d,

            roughness: 0.96,

            metalness: 0.04

        })

    );


ground.rotation.x =
    -Math.PI / 2;


ground.receiveShadow =
    true;


scene.add(ground);


/* =========================================================
   GRID
========================================================= */

const grid =
    new THREE.GridHelper(

        360,
        72,
        0x1d6570,
        0x123038

    );


grid.position.y =
    0.025;


grid.material.transparent =
    true;


grid.material.opacity =
    0.14;


scene.add(grid);


/* =========================================================
   GAME STATE
========================================================= */

let gameRunning =
    false;

let paused =
    false;

let pointerLocked =
    false;

let pointerLockRequestPending =
    false;


const keys = {};


const obstacles = [];
const enemies = [];
const bullets = [];
const particles = [];


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
   POINTER LOCK
========================================================= */

function requestGamePointerLock() {

    if (!canvas) return;

    if (!gameRunning) return;

    if (paused) return;

    if (pointerLocked) return;

    if (pointerLockRequestPending) return;


    pointerLockRequestPending =
        true;


    try {

        const result =
            canvas.requestPointerLock();


        if (
            result &&
            typeof result.catch === "function"
        ) {

            result.catch(error => {

                console.warn(
                    "Pointer lock tijdelijk niet beschikbaar:",
                    error
                );

            });

        }

    } catch (error) {

        console.warn(
            "Pointer lock fout:",
            error
        );

    }


    setTimeout(() => {

        pointerLockRequestPending =
            false;

    }, 700);

}


/* =========================================================
   INPUT
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] =
            true;


        if (
            event.code === "KeyR"
        ) {

            reload();

        }


        if (
            event.code === "Escape"
        ) {

            if (gameRunning) {

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
   POINTER LOCK EVENTS
========================================================= */

canvas.addEventListener(
    "click",
    () => {

        if (!gameRunning) return;

        if (paused) return;

        if (!pointerLocked) {

            requestGamePointerLock();

        }

    }
);


canvas.addEventListener(
    "mousedown",
    event => {

        if (!gameRunning) return;

        if (paused) return;


        if (
            event.button === 0
        ) {

            if (!pointerLocked) {

                requestGamePointerLock();

            }

            shoot();

        }

    }
);


canvas.addEventListener(
    "contextmenu",
    event => {

        event.preventDefault();

    }
);


document.addEventListener(
    "pointerlockchange",
    () => {

        pointerLocked =
            document.pointerLockElement === canvas;


        if (pointerLocked) {

            pointerLockRequestPending =
                false;

        }

    }
);


document.addEventListener(
    "pointerlockerror",
    () => {

        pointerLocked =
            false;

        pointerLockRequestPending =
            false;

        console.warn(
            "Pointer lock kon niet worden geactiveerd."
        );

    }
);


/* =========================================================
   MOUSE CAMERA
========================================================= */

document.addEventListener(
    "mousemove",
    event => {

        if (!pointerLocked) return;

        if (!gameRunning) return;

        if (paused) return;


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


/* =========================================================
   TANK
========================================================= */

const tank =
    new THREE.Group();


tank.position.copy(
    player.position
);


/* =========================================================
   MATERIALS
========================================================= */

const tankBodyMaterial =
    new THREE.MeshStandardMaterial({

        color: 0x263d41,

        metalness: 0.75,

        roughness: 0.3

    });


const darkMetal =
    new THREE.MeshStandardMaterial({

        color: 0x10191c,

        metalness: 0.85,

        roughness: 0.25

    });


const trackMaterial =
    new THREE.MeshStandardMaterial({

        color: 0x0b1316,

        metalness: 0.45,

        roughness: 0.85

    });


const tankGlow =
    new THREE.MeshBasicMaterial({

        color: 0x35d7e8

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
    1.35;


tankBody.castShadow =
    true;


tankBody.receiveShadow =
    true;


tank.add(tankBody);


/* =========================================================
   FRONT ARMOR
========================================================= */

const frontArmor =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            4.6,
            1,
            0.55
        ),

        new THREE.MeshStandardMaterial({

            color: 0x314a4e,

            metalness: 0.8,

            roughness: 0.27

        })

    );


frontArmor.position.set(
    0,
    1.55,
    -1.75
);


frontArmor.rotation.x =
    -0.1;


frontArmor.castShadow =
    true;


tank.add(frontArmor);


/* =========================================================
   TOP ARMOR
========================================================= */

const topArmor =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            3.9,
            0.45,
            2.7
        ),

        new THREE.MeshStandardMaterial({

            color: 0x203438,

            metalness: 0.8,

            roughness: 0.25

        })

    );


topArmor.position.y =
    2.1;


topArmor.castShadow =
    true;


tank.add(topArmor);


/* =========================================================
   TRACKS
========================================================= */

const leftTrack =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            5.8,
            1.05,
            0.75
        ),

        trackMaterial

    );


leftTrack.position.set(
    0,
    0.55,
    -2.05
);


leftTrack.castShadow =
    true;


tank.add(leftTrack);


const rightTrack =
    leftTrack.clone();


rightTrack.position.z =
    2.05;


tank.add(rightTrack);


/* =========================================================
   TRACK WHEELS
========================================================= */

const tankWheels = [];


function createTrackWheels(z) {

    for (
        let i = -2;
        i <= 2;
        i++
    ) {

        const wheel =
            new THREE.Mesh(

                new THREE.CylinderGeometry(
                    0.42,
                    0.42,
                    0.82,
                    14
                ),

                new THREE.MeshStandardMaterial({

                    color: 0x18272b,

                    metalness: 0.65,

                    roughness: 0.45

                })

            );


        wheel.rotation.x =
            Math.PI / 2;


        wheel.position.set(
            i * 1.05,
            0.52,
            z
        );


        wheel.castShadow =
            true;


        tank.add(wheel);

        tankWheels.push(
            wheel
        );

    }

}


createTrackWheels(-2.43);
createTrackWheels(2.43);


/* =========================================================
   TRACK LIGHT
========================================================= */

const leftGlow =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            4.8,
            0.08,
            0.05
        ),

        tankGlow

    );


leftGlow.position.set(
    0,
    0.55,
    -2.48
);


tank.add(leftGlow);


const rightGlow =
    leftGlow.clone();


rightGlow.position.z =
    2.48;


tank.add(rightGlow);


/* =========================================================
   TURRET
========================================================= */

const turret =
    new THREE.Group();


turret.position.y =
    2.45;


tank.add(turret);


/* =========================================================
   TURRET BASE
========================================================= */

const turretBase =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
            1.55,
            1.75,
            0.65,
            12
        ),

        new THREE.MeshStandardMaterial({

            color: 0x30484c,

            metalness: 0.8,

            roughness: 0.27

        })

    );


turretBase.castShadow =
    true;


turret.add(turretBase);


/* =========================================================
   TURRET BODY
========================================================= */

const turretBody =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            2.9,
            0.9,
            2.25
        ),

        new THREE.MeshStandardMaterial({

            color: 0x263d41,

            metalness: 0.82,

            roughness: 0.25

        })

    );


turretBody.position.y =
    0.55;


turretBody.castShadow =
    true;


turret.add(turretBody);


/* =========================================================
   CANNON
========================================================= */

const cannon =
    new THREE.Group();


cannon.position.set(
    0,
    0.62,
    -1.15
);


turret.add(cannon);


/* =========================================================
   CANNON BASE
========================================================= */

const cannonBase =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
            0.34,
            0.42,
            0.7,
            12
        ),

        darkMetal

    );


cannonBase.rotation.x =
    Math.PI / 2;


cannonBase.position.z =
    0.1;


cannon.add(cannonBase);


/* =========================================================
   BARREL
========================================================= */

const barrel =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
            0.22,
            0.3,
            5.8,
            14
        ),

        darkMetal

    );


barrel.rotation.x =
    Math.PI / 2;


barrel.position.z =
    -2.75;


barrel.castShadow =
    true;


cannon.add(barrel);


/* =========================================================
   BARREL RING
========================================================= */

const barrelRing =
    new THREE.Mesh(

        new THREE.TorusGeometry(
            0.29,
            0.07,
            8,
            18
        ),

        new THREE.MeshStandardMaterial({

            color: 0x405b5f,

            metalness: 0.9,

            roughness: 0.2

        })

    );


barrelRing.rotation.x =
    Math.PI / 2;


barrelRing.position.z =
    -1.3;


cannon.add(barrelRing);


/* =========================================================
   BARREL ENERGY
========================================================= */

const cannonGlow =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            0.08,
            0.08,
            4.5
        ),

        new THREE.MeshBasicMaterial({

            color: 0x58e9ff

        })

    );


cannonGlow.position.set(
    0,
    0.16,
    -2.7
);


cannon.add(cannonGlow);


/* =========================================================
   TANK LIGHT
========================================================= */

const tankLight =
    new THREE.PointLight(
        0x58e9ff,
        5,
        15
    );


tankLight.position.set(
    0,
    2.8,
    -1
);


tank.add(tankLight);


/* =========================================================
   FRONT LIGHTS
========================================================= */

for (
    const x of [-1.45, 1.45]
) {

    const light =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                0.45,
                0.25,
                0.08
            ),

            new THREE.MeshBasicMaterial({

                color: 0x8ff6ff

            })

        );


    light.position.set(
        x,
        1.45,
        -1.82
    );


    tank.add(light);

}


scene.add(tank);


/* =========================================================
   TANK SHADOW
========================================================= */

const tankShadow =
    new THREE.Mesh(

        new THREE.CircleGeometry(
            3.4,
            32
        ),

        new THREE.MeshBasicMaterial({

            color: 0x000000,

            transparent: true,

            opacity: 0.28,

            depthWrite: false

        })

    );


tankShadow.rotation.x =
    -Math.PI / 2;


tankShadow.position.y =
    0.04;


scene.add(tankShadow);


/* =========================================================
   OBSTACLES
========================================================= */

function addObstacle(
    object,
    radius
) {

    scene.add(object);

    obstacles.push({

        object,

        radius

    });

}


/* =========================================================
   ROCK
========================================================= */

function createRock(
    x,
    z,
    scale
) {

    const rock =
        new THREE.Mesh(

            new THREE.IcosahedronGeometry(
                1.6 * scale,
                1
            ),

            new THREE.MeshStandardMaterial({

                color: 0x3a484b,

                roughness: 0.95,

                metalness: 0.05

            })

        );


    rock.position.set(
        x,
        0.9 * scale,
        z
    );


    rock.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );


    rock.castShadow =
        true;

    rock.receiveShadow =
        true;


    addObstacle(
        rock,
        1.7 * scale
    );

}


/* =========================================================
   TREE
========================================================= */

function createTree(
    x,
    z,
    scale
) {

    const tree =
        new THREE.Group();


    const trunk =
        new THREE.Mesh(

            new THREE.CylinderGeometry(

                0.28 * scale,
                0.43 * scale,
                3.5 * scale,
                8

            ),

            new THREE.MeshStandardMaterial({

                color: 0x382c23,

                roughness: 1

            })

        );


    trunk.position.y =
        1.75 * scale;


    trunk.castShadow =
        true;


    tree.add(trunk);


    const crown =
        new THREE.Mesh(

            new THREE.ConeGeometry(

                1.8 * scale,
                4.6 * scale,
                9

            ),

            new THREE.MeshStandardMaterial({

                color: 0x153d38,

                roughness: 1

            })

        );


    crown.position.y =
        4.2 * scale;


    crown.castShadow =
        true;


    tree.add(crown);


    tree.position.set(
        x,
        0,
        z
    );


    addObstacle(
        tree,
        1.7 * scale
    );

}


/* =========================================================
   BUILDING
========================================================= */

function createBuilding(
    x,
    z,
    width,
    height,
    depth
) {

    const building =
        new THREE.Group();


    const body =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),

            new THREE.MeshStandardMaterial({

                color: 0x17272b,

                metalness: 0.62,

                roughness: 0.42

            })

        );


    body.position.y =
        height / 2;


    body.castShadow =
        true;

    body.receiveShadow =
        true;


    building.add(body);


    for (
        let y = 1.5;
        y < height;
        y += 1.6
    ) {

        const strip =
            new THREE.Mesh(

                new THREE.BoxGeometry(
                    width + 0.05,
                    0.06,
                    0.06
                ),

                new THREE.MeshBasicMaterial({

                    color: 0x2d8791

                })

            );


        strip.position.set(
            0,
            y,
            depth / 2 + 0.04
        );


        building.add(strip);

    }


    building.position.set(
        x,
        0,
        z
    );


    addObstacle(
        building,
        Math.max(
            width,
            depth
        ) * 0.72
    );

}


/* =========================================================
   WORLD
========================================================= */

function generateWorld() {

    for (
        let i = 0;
        i < 70;
        i++
    ) {

        const x =
            (Math.random() - 0.5) *
            250;


        const z =
            (Math.random() - 0.5) *
            250;


        if (
            Math.abs(x) < 22 &&
            Math.abs(z - 20) < 22
        ) {

            continue;

        }


        createRock(
            x,
            z,
            0.5 +
            Math.random() * 1.1
        );

    }


    for (
        let i = 0;
        i < 45;
        i++
    ) {

        const x =
            (Math.random() - 0.5) *
            250;


        const z =
            (Math.random() - 0.5) *
            250;


        if (
            Math.abs(x) < 25 &&
            Math.abs(z - 20) < 25
        ) {

            continue;

        }


        createTree(
            x,
            z,
            0.6 +
            Math.random() * 0.8
        );

    }


    createBuilding(
        -35,
        -20,
        17,
        9,
        13
    );


    createBuilding(
        35,
        -45,
        15,
        7,
        20
    );


    createBuilding(
        40,
        35,
        19,
        10,
        12
    );


    createBuilding(
        -45,
        45,
        15,
        6,
        17
    );

}


generateWorld();


/* =========================================================
   SIGNAL TOWER
========================================================= */

const signalTower =
    new THREE.Group();


const tower =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
            0.4,
            0.75,
            14,
            10
        ),

        new THREE.MeshStandardMaterial({

            color: 0x2a4044,

            metalness: 0.8,

            roughness: 0.3

        })

    );


tower.position.y =
    7;


tower.castShadow =
    true;


signalTower.add(tower);


const signalOrb =
    new THREE.Mesh(

        new THREE.SphereGeometry(
            0.75,
            20,
            20
        ),

        new THREE.MeshStandardMaterial({

            color: 0x58e9ff,

            emissive: 0x58e9ff,

            emissiveIntensity: 7

        })

    );


signalOrb.position.y =
    14;


signalTower.add(signalOrb);


const signalLight =
    new THREE.PointLight(
        0x58e9ff,
        14,
        40
    );


signalLight.position.y =
    14;


signalTower.add(signalLight);


signalTower.position.set(
    0,
    0,
    -85
);


scene.add(signalTower);


/* =========================================================
   TANK COLLISION
========================================================= */

function tankBlocked(
    position
) {

    for (
        const obstacle of obstacles
    ) {

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


        if (
            distance <
            3 +
            obstacle.radius
        ) {

            return true;

        }

    }


    if (
        Math.abs(position.x) > 165 ||
        Math.abs(position.z) > 165
    ) {

        return true;

    }


    return false;

}


/* =========================================================
   TANK MOVEMENT
========================================================= */

function updateTank(
    delta
) {

    let throttle =
        0;

    let steering =
        0;


    if (keys.KeyW) {
        throttle += 1;
    }

    if (keys.KeyS) {
        throttle -= 1;
    }

    if (keys.KeyA) {
        steering += 1;
    }

    if (keys.KeyD) {
        steering -= 1;
    }


    if (steering !== 0) {

        player.rotation +=
            steering *
            player.turnSpeed *
            delta;

    }


    if (throttle !== 0) {

        const speed =
            throttle > 0
                ? player.speed
                : player.reverseSpeed;


        const forward =
            new THREE.Vector3(

                -Math.sin(
                    player.rotation
                ),

                0,

                -Math.cos(
                    player.rotation
                )

            );


        const next =
            player.position.clone();


        next.addScaledVector(
            forward,
            speed *
            throttle *
            delta
        );


        if (!tankBlocked(next)) {

            player.position.copy(
                next
            );

        }

    }


    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    tankShadow.position.set(
        player.position.x,
        0.04,
        player.position.z
    );


    if (throttle !== 0) {

        for (
            const wheel of tankWheels
        ) {

            wheel.rotation.z +=
                delta *
                10 *
                throttle;

        }

    }

}


/* =========================================================
   TURRET
========================================================= */

function updateTurret(
    delta
) {

    let targetRotation =
        cameraYaw -
        player.rotation;


    targetRotation =
        Math.atan2(
            Math.sin(targetRotation),
            Math.cos(targetRotation)
        );


    let difference =
        targetRotation -
        player.turretRotation;


    difference =
        Math.atan2(
            Math.sin(difference),
            Math.cos(difference)
        );


    player.turretRotation +=
        difference *
        Math.min(
            1,
            delta * 12
        );


    turret.rotation.y =
        player.turretRotation;


    const desiredPitch =
        THREE.MathUtils.clamp(
            cameraPitch * 0.55,
            -0.12,
            0.28
        );


    player.cannonPitch +=
        (
            desiredPitch -
            player.cannonPitch
        ) *
        Math.min(
            1,
            delta * 10
        );


    cannon.rotation.x =
        player.cannonPitch;


    if (player.recoil > 0) {

        player.recoil -= delta;


        cannon.position.z =
            -1.15 +
            Math.sin(
                player.recoil * 35
            ) *
            0.18;

    } else {

        cannon.position.z =
            -1.15;

    }

}


/* =========================================================
   CANNON AIM
========================================================= */

function getCannonDirection() {

    const muzzlePosition =
        new THREE.Vector3();


    barrel.getWorldPosition(
        muzzlePosition
    );


    const forward =
        new THREE.Vector3(
            0,
            0,
            -1
        );


    const quaternion =
        new THREE.Quaternion();


    cannon.getWorldQuaternion(
        quaternion
    );


    forward.applyQuaternion(
        quaternion
    );


    forward.normalize();


    /*
       We gebruiken de echte richting van
       het kanon.

       Hierdoor kunnen grote monsters ook
       boven de tank geraakt worden.
    */

    return forward;

}


/* =========================================================
   SHOOT
========================================================= */

function shoot() {

    if (!gameRunning) return;

    if (paused) return;

    if (player.isReloading) return;

    if (player.fireCooldown > 0) return;


    if (player.ammo <= 0) {

        reload();

        return;

    }


    player.ammo--;


    player.fireCooldown =
        0.7;


    player.recoil =
        0.22;


    const muzzlePosition =
        new THREE.Vector3();


    barrel.getWorldPosition(
        muzzlePosition
    );


    const direction =
        getCannonDirection();


    const projectile =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                0.18,
                12,
                12
            ),

            new THREE.MeshBasicMaterial({

                color: 0x8ff7ff

            })

        );


    projectile.position.copy(
        muzzlePosition
    );


    scene.add(
        projectile
    );


    bullets.push({

        object:
            projectile,

        velocity:
            direction
                .clone()
                .multiplyScalar(75),

        life: 4,

        damage: 50

    });


    createMuzzleFlash(
        muzzlePosition
    );


    updateHUD();

}


/* =========================================================
   MUZZLE FLASH
========================================================= */

function createMuzzleFlash(
    position
) {

    const flash =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                0.55,
                12,
                12
            ),

            new THREE.MeshBasicMaterial({

                color: 0x9cf8ff,

                transparent: true,

                opacity: 0.9

            })

        );


    flash.position.copy(
        position
    );


    scene.add(flash);


    particles.push({

        object:
            flash,

        velocity:
            new THREE.Vector3(),

        life:
            0.09

    });


    const flashLight =
        new THREE.PointLight(
            0x8cf7ff,
            12,
            15
        );


    flashLight.position.copy(
        position
    );


    scene.add(
        flashLight
    );


    setTimeout(() => {

        scene.remove(
            flashLight
        );

    }, 80);

}


/* =========================================================
   RELOAD
========================================================= */

function reload() {

    if (
        player.isReloading ||
        player.ammo >= player.maxAmmo
    ) {

        return;

    }


    player.isReloading =
        true;


    player.reloadTimer =
        1.7;

}


function updateReload(
    delta
) {

    if (!player.isReloading) {
        return;
    }


    player.reloadTimer -=
        delta;


    if (
        player.reloadTimer <= 0
    ) {

        player.ammo =
            player.maxAmmo;


        player.isReloading =
            false;

    }

}


/* =========================================================
   BULLETS
========================================================= */

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


        bullet.object.position.addScaledVector(
            bullet.velocity,
            delta
        );


        bullet.life -=
            delta;


        let remove =
            bullet.life <= 0;


        /*
           MONSTER HIT DETECTION

           De kogel kijkt niet meer alleen
           naar de voeten van het monster.

           We gebruiken meerdere punten:
           borst, hoofd en middenlichaam.
        */

        for (
            const enemy of enemies
        ) {

            if (enemy.dead) {
                continue;
            }


            const hitPoints = [

                new THREE.Vector3(
                    0,
                    enemy.hitHeight * 0.45,
                    0
                ),

                new THREE.Vector3(
                    0,
                    enemy.hitHeight * 0.72,
                    0
                ),

                new THREE.Vector3(
                    0,
                    enemy.hitHeight * 0.90,
                    0
                )

            ];


            let hit = false;


            for (
                const localPoint of hitPoints
            ) {

                const worldPoint =
                    enemy.object.localToWorld(
                        localPoint.clone()
                    );


                const distance =
                    bullet.object.position.distanceTo(
                        worldPoint
                    );


                if (
                    distance <
                    enemy.hitRadius + 0.65
                ) {

                    hit = true;

                    break;

                }

            }


            /*
               Extra brede lichaams-hitbox.
            */

            if (!hit) {

                const horizontal =
                    new THREE.Vector2(

                        bullet.object.position.x -
                        enemy.object.position.x,

                        bullet.object.position.z -
                        enemy.object.position.z

                    ).length();


                const vertical =
                    Math.abs(

                        bullet.object.position.y -
                        enemy.object.position.y

                    );


                if (
                    horizontal <
                    enemy.radius + 0.75 &&

                    vertical <
                    enemy.hitHeight + 1
                ) {

                    hit = true;

                }

            }


            if (hit) {

                enemy.health -=
                    bullet.damage;


                createHitParticles(
                    bullet.object.position
                );


                remove =
                    true;


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


        /*
           OBSTACLE HIT
        */

        if (!remove) {

            for (
                const obstacle of obstacles
            ) {

                const distance =
                    bullet.object.position.distanceTo(
                        obstacle.object.position
                    );


                if (
                    distance <
                    obstacle.radius
                ) {

                    createHitParticles(
                        bullet.object.position
                    );


                    remove =
                        true;


                    break;

                }

            }

        }


        if (remove) {

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
   ENEMY SPAWNING
========================================================= */

function spawnEnemies() {

    const types = [

        "stalker",
        "crawler",
        "guardian"

    ];


    /*
       Meer monsters verspreid over
       de wereld.
    */

    const count =
        18;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        let angle =
            Math.random() *
            Math.PI *
            2;


        let distance =
            40 +
            Math.random() *
            100;


        let x =
            player.position.x +
            Math.cos(angle) *
            distance;


        let z =
            player.position.z +
            Math.sin(angle) *
            distance;


        x =
            THREE.MathUtils.clamp(
                x,
                -150,
                150
            );


        z =
            THREE.MathUtils.clamp(
                z,
                -150,
                150
            );


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
   ENEMIES
   EXTRA GROOT + LANG
========================================================= */

function createEnemy(
    x,
    z,
    type
) {

    const enemy =
        new THREE.Group();


    /* =====================================================
       MONSTER INSTELLINGEN
    ===================================================== */

    let scale = 1.5;

    let color = 0x713654;

    let health = 80;

    let speed = 2;

    let monsterHeight = 7;

    let hitRadius = 2.2;


    /*
       STALKER
       Lang, smal en hoog.
    */

    if (
        type === "stalker"
    ) {

        scale =
            1.65;

        color =
            0x713654;

        health =
            100;

        speed =
            2.15;

        monsterHeight =
            7.4;

        hitRadius =
            2.45;

    }


    /*
       CRAWLER
       Laag maar extreem lang.
    */

    if (
        type === "crawler"
    ) {

        scale =
            1.35;

        color =
            0x8b6842;

        health =
            55;

        speed =
            3.25;

        monsterHeight =
            3.2;

        hitRadius =
            2.8;

    }


    /*
       GUARDIAN
       Gigantisch en zwaar.
    */

    if (
        type === "guardian"
    ) {

        scale =
            2.45;

        color =
            0x4c3d77;

        health =
            190;

        speed =
            1.05;

        monsterHeight =
            10.2;

        hitRadius =
            3.6;

    }


    /* =====================================================
       MATERIALEN
    ===================================================== */

    const bodyMaterial =
        new THREE.MeshStandardMaterial({

            color,

            roughness: 0.48,

            metalness: 0.35

        });


    const darkMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x171b20,

            roughness: 0.55,

            metalness: 0.4

        });


    const boneMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x667276,

            roughness: 0.65,

            metalness: 0.25

        });


    const eyeMaterial =
        new THREE.MeshStandardMaterial({

            color: 0xff356f,

            emissive: 0xff174f,

            emissiveIntensity: 6,

            roughness: 0.2,

            metalness: 0.1

        });


    const energyMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x58e9ff,

            emissive: 0x22dfff,

            emissiveIntensity: 5,

            roughness: 0.25,

            metalness: 0.35

        });


    /* =====================================================
       LICHAAM — EXTRA LANG
    ===================================================== */

    const body =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                1.35 * scale,
                20,
                16
            ),

            bodyMaterial

        );


    /*
       Standaard langwerpig lichaam.
    */

    body.scale.set(

        0.88,

        1.85,

        0.70

    );


    body.position.y =
        2.45 * scale;


    body.castShadow =
        true;


    body.receiveShadow =
        true;


    enemy.add(body);


    /* =====================================================
       EXTRA RUG / LANG LICHAAM
    ===================================================== */

    const longBack =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                1.15 * scale,
                18,
                14
            ),

            bodyMaterial

        );


    longBack.scale.set(
        0.85,
        1.65,
        0.9
    );


    longBack.position.set(
        0,
        2.15 * scale,
        0.45 * scale
    );


    longBack.castShadow =
        true;


    enemy.add(longBack);


    /* =====================================================
       BORSTPLAAT
    ===================================================== */

    const chest =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                1.08 * scale,
                16,
                12
            ),

            darkMaterial

        );


    chest.scale.set(
        0.84,
        1.15,
        0.38
    );


    chest.position.set(
        0,
        2.65 * scale,
        -0.80 * scale
    );


    chest.castShadow =
        true;


    enemy.add(chest);


    /* =====================================================
       GLOEIEND BORSTSYMBOOL
    ===================================================== */

    const chestCore =
        new THREE.Mesh(

            new THREE.OctahedronGeometry(
                0.30 * scale,
                1
            ),

            energyMaterial

        );


    chestCore.position.set(
        0,
        2.65 * scale,
        -1.16 * scale
    );


    chestCore.rotation.z =
        Math.PI / 4;


    enemy.add(chestCore);


    /* =====================================================
       NEK
    ===================================================== */

    const neck =
        new THREE.Mesh(

            new THREE.CylinderGeometry(
                0.40 * scale,
                0.55 * scale,
                0.82 * scale,
                12
            ),

            darkMaterial

        );


    neck.position.y =
        3.75 * scale;


    neck.castShadow =
        true;


    enemy.add(neck);


    /* =====================================================
       HOOFD
    ===================================================== */

    const head =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                0.86 * scale,
                18,
                14
            ),

            bodyMaterial

        );


    head.scale.set(
        0.90,
        1.08,
        0.88
    );


    head.position.y =
        4.35 * scale;


    head.castShadow =
        true;


    enemy.add(head);


    /* =====================================================
       GEZICHT
    ===================================================== */

    const face =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                0.90 * scale,
                0.58 * scale,
                0.20 * scale
            ),

            darkMaterial

        );


    face.position.set(
        0,
        4.28 * scale,
        -0.76 * scale
    );


    enemy.add(face);


    /* =====================================================
       OGEN
    ===================================================== */

    for (
        const eyeX of [-0.34, 0.34]
    ) {

        const eye =
            new THREE.Mesh(

                new THREE.SphereGeometry(
                    0.17 * scale,
                    12,
                    12
                ),

                eyeMaterial

            );


        eye.position.set(
            eyeX * scale,
            4.42 * scale,
            -0.90 * scale
        );


        eye.scale.z =
            0.55;


        enemy.add(eye);


        const eyeLight =
            new THREE.PointLight(
                0xff356f,
                2.2,
                5 * scale
            );


        eyeLight.position.copy(
            eye.position
        );


        enemy.add(
            eyeLight
        );

    }


    /* =====================================================
       HOORNS
    ===================================================== */

    for (
        const hornX of [-0.58, 0.58]
    ) {

        const horn =
            new THREE.Mesh(

                new THREE.ConeGeometry(
                    0.25 * scale,
                    1.55 * scale,
                    8
                ),

                boneMaterial

            );


        horn.position.set(
            hornX * scale,
            5.15 * scale,
            -0.05 * scale
        );


        horn.rotation.z =
            hornX < 0
                ? -0.35
                : 0.35;


        horn.rotation.x =
            -0.12;


        horn.castShadow =
            true;


        enemy.add(horn);

    }


    /* =====================================================
       ARMEN
    ===================================================== */

    for (
        const side of [-1, 1]
    ) {

        const arm =
            new THREE.Group();


        arm.position.set(
            side * 1.25 * scale,
            3.0 * scale,
            0
        );


        enemy.add(arm);


        const upperArm =
            new THREE.Mesh(

                new THREE.CapsuleGeometry(
                    0.34 * scale,
                    1.45 * scale,
                    6,
                    10
                ),

                bodyMaterial

            );


        upperArm.rotation.z =
            side * 0.28;


        upperArm.position.y =
            -0.65 * scale;


        upperArm.castShadow =
            true;


        arm.add(upperArm);


        const forearm =
            new THREE.Mesh(

                new THREE.CapsuleGeometry(
                    0.29 * scale,
                    1.25 * scale,
                    6,
                    10
                ),

                darkMaterial

            );


        forearm.rotation.z =
            side * 0.12;


        forearm.position.set(
            side * 0.12 * scale,
            -1.75 * scale,
            -0.10 * scale
        );


        forearm.castShadow =
            true;


        arm.add(forearm);


        const hand =
            new THREE.Mesh(

                new THREE.SphereGeometry(
                    0.42 * scale,
                    12,
                    10
                ),

                darkMaterial

            );


        hand.position.set(
            side * 0.16 * scale,
            -2.65 * scale,
            -0.16 * scale
        );


        hand.castShadow =
            true;


        arm.add(hand);


        for (
            let claw = 0;
            claw < 3;
            claw++
        ) {

            const clawMesh =
                new THREE.Mesh(

                    new THREE.ConeGeometry(
                        0.075 * scale,
                        0.55 * scale,
                        7
                    ),

                    boneMaterial

                );


            clawMesh.position.set(
                side * (
                    0.02 +
                    claw * 0.16
                ) * scale,
                -3.0 * scale,
                -(
                    0.28 +
                    claw * 0.09
                ) * scale
            );


            clawMesh.rotation.x =
                -Math.PI / 2;


            clawMesh.rotation.z =
                side * 0.15;


            enemy.add(
                clawMesh
            );

        }

    }


    /* =====================================================
       EXTRA LANGE BENEN
    ===================================================== */

    for (
        const side of [-1, 1]
    ) {

        const leg =
            new THREE.Group();


        leg.position.set(
            side * 0.62 * scale,
            1.35 * scale,
            0
        );


        enemy.add(leg);


        const upperLeg =
            new THREE.Mesh(

                new THREE.CapsuleGeometry(
                    0.40 * scale,
                    1.45 * scale,
                    6,
                    10
                ),

                bodyMaterial

            );


        upperLeg.position.y =
            -0.55 * scale;


        upperLeg.rotation.z =
            side * 0.10;


        upperLeg.castShadow =
            true;


        leg.add(upperLeg);


        const lowerLeg =
            new THREE.Mesh(

                new THREE.CapsuleGeometry(
                    0.32 * scale,
                    1.40 * scale,
                    6,
                    10
                ),

                darkMaterial

            );


        lowerLeg.position.set(
            side * 0.08 * scale,
            -1.85 * scale,
            -0.10 * scale
        );


        lowerLeg.rotation.z =
            side * 0.08;


        lowerLeg.castShadow =
            true;


        leg.add(lowerLeg);


        const foot =
            new THREE.BoxGeometry(
                0.78 * scale,
                0.44 * scale,
                1.35 * scale
            );


        const footMesh =
            new THREE.Mesh(
                foot,
                darkMaterial
            );


        footMesh.position.set(
            side * 0.08 * scale,
            -3.15 * scale,
            -0.42 * scale
        );


        footMesh.castShadow =
            true;


        leg.add(footMesh);

    }


    /* =====================================================
       RUGSTEKELS
    ===================================================== */

    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const spike =
            new THREE.Mesh(

                new THREE.ConeGeometry(
                    0.28 * scale,
                    1.05 * scale,
                    7
                ),

                boneMaterial

            );


        spike.position.set(
            0,
            1.65 * scale +
            i * 0.58 * scale,
            0.85 * scale
        );


        spike.rotation.x =
            Math.PI / 2;


        spike.castShadow =
            true;


        enemy.add(spike);

    }


    /* =====================================================
       SCHOUDEERPLATEN
    ===================================================== */

    for (
        const side of [-1, 1]
    ) {

        const shoulder =
            new THREE.Mesh(

                new THREE.SphereGeometry(
                    0.62 * scale,
                    12,
                    10
                ),

                bodyMaterial

            );


        shoulder.scale.set(
            1.35,
            0.72,
            0.88
        );


        shoulder.position.set(
            side * 1.25 * scale,
            3.20 * scale,
            0
        );


        shoulder.castShadow =
            true;


        enemy.add(shoulder);

    }


    /* =====================================================
       CRAWLER
       EXTREEM LANG EN LAAG
    ===================================================== */

    if (
        type === "crawler"
    ) {

        enemy.scale.set(
            1.55,
            0.58,
            1.85
        );


        /*
           Lange staart.
        */

        const tail =
            new THREE.Mesh(

                new THREE.CapsuleGeometry(
                    0.35 * scale,
                    2.7 * scale,
                    6,
                    10
                ),

                bodyMaterial

            );


        tail.rotation.x =
            Math.PI / 2;


        tail.position.z =
            2.4 * scale;


        tail.castShadow =
            true;


        enemy.add(tail);


        /*
           Extra insectpoten.
        */

        for (
            const side of [-1, 1]
        ) {

            for (
                let i = 0;
                i < 4;
                i++
            ) {

                const leg =
                    new THREE.Mesh(

                        new THREE.CapsuleGeometry(
                            0.14 * scale,
                            1.20 * scale,
                            5,
                            8
                        ),

                        darkMaterial

                    );


                leg.position.set(

                    side *
                    (
                        0.9 +
                        i * 0.42
                    ) *
                    scale,

                    0.85 * scale,

                    (
                        0.9 -
                        i * 0.65
                    ) *
                    scale

                );


                leg.rotation.z =
                    side * 0.95;


                leg.rotation.x =
                    0.55;


                leg.castShadow =
                    true;


                enemy.add(leg);

            }

        }


        /*
           Crawler extra kop.
        */

        const crawlerHead =
            new THREE.Mesh(

                new THREE.SphereGeometry(
                    0.85 * scale,
                    16,
                    12
                ),

                bodyMaterial

            );


        crawlerHead.scale.set(
            1.15,
            0.75,
            1.25
        );


        crawlerHead.position.set(
            0,
            1.85 * scale,
            -2.25 * scale
        );


        crawlerHead.castShadow =
            true;


        enemy.add(crawlerHead);

    }


    /* =====================================================
       GUARDIAN
       GIGANTISCH
    ===================================================== */

    if (
        type === "guardian"
    ) {

        enemy.scale.set(
            1.18,
            1.45,
            1.18
        );


        /*
           Brede zware schouders.
        */

        for (
            const side of [-1, 1]
        ) {

            const armor =
                new THREE.Mesh(

                    new THREE.IcosahedronGeometry(
                        0.95 * scale,
                        1
                    ),

                    darkMaterial

                );


            armor.scale.set(
                1.55,
                0.82,
                1.20
            );


            armor.position.set(
                side * 1.48 * scale,
                3.55 * scale,
                0
            );


            armor.castShadow =
                true;


            enemy.add(armor);

        }


        /*
           Groot extra borstcore.
        */

        const core =
            new THREE.Mesh(

                new THREE.OctahedronGeometry(
                    0.58 * scale,
                    1
                ),

                energyMaterial

            );


        core.position.set(
            0,
            3.0 * scale,
            -1.35 * scale
        );


        enemy.add(core);


        /*
           Extra lange hoorns.
        */

        for (
            const side of [-1, 1]
        ) {

            const largeHorn =
                new THREE.Mesh(

                    new THREE.ConeGeometry(
                        0.42 * scale,
                        2.8 * scale,
                        8
                    ),

                    boneMaterial

                );


            largeHorn.position.set(
                side * 0.78 * scale,
                5.65 * scale,
                0
            );


            largeHorn.rotation.z =
                side * 0.35;


            largeHorn.castShadow =
                true;


            enemy.add(
                largeHorn
            );

        }


        /*
           Guardian extra rug.
        */

        for (
            let i = 0;
            i < 4;
            i++
        ) {

            const largeSpike =
                new THREE.Mesh(

                    new THREE.ConeGeometry(
                        0.38 * scale,
                        1.55 * scale,
                        7
                    ),

                    boneMaterial

                );


            largeSpike.position.set(
                0,
                2.0 * scale +
                i * 0.9 * scale,
                1.0 * scale
            );


            largeSpike.rotation.x =
                Math.PI / 2;


            largeSpike.castShadow =
                true;


            enemy.add(
                largeSpike
            );

        }

    }


    /* =====================================================
       MONSTER GLOW
    ===================================================== */

    const monsterLight =
        new THREE.PointLight(

            0xff356f,

            type === "guardian"
                ? 4.5
                : 2.2,

            type === "guardian"
                ? 13
                : 8

        );


    monsterLight.position.set(
        0,
        monsterHeight * 0.55,
        -0.5 * scale
    );


    enemy.add(
        monsterLight
    );


    /* =====================================================
       POSITIE
    ===================================================== */

    enemy.position.set(
        x,
        0,
        z
    );


    scene.add(
        enemy
    );


    /* =====================================================
       ENEMY DATA
    ===================================================== */

    enemies.push({

        object:
            enemy,

        type,

        health,

        maxHealth:
            health,

        speed,

        radius:

            type === "guardian"

                ? 3.5

                : type === "crawler"

                    ? 2.8

                    : 2.4,

        height:
            monsterHeight,

        hitHeight:
            monsterHeight,

        hitRadius,

        dead:
            false

    });

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

        if (enemy.dead) {
            continue;
        }


        const direction =
            new THREE.Vector3()
                .subVectors(
                    player.position,
                    enemy.object.position
                );


        const distance =
            direction.length();


        if (distance > 120) {
            continue;
        }


        direction.normalize();


        if (distance > 4.5) {

            const next =
                enemy.object.position.clone();


            next.addScaledVector(
                direction,
                enemy.speed * delta
            );


            if (
                !enemyBlocked(
                    next,
                    enemy.radius
                )
            ) {

                enemy.object.position.copy(
                    next
                );

            }


            enemy.object.lookAt(
                player.position.x,
                enemy.object.position.y,
                player.position.z
            );

        } else {

            player.health -=

                (
                    enemy.type === "guardian"
                        ? 15
                        : enemy.type === "crawler"
                            ? 8
                            : 7
                ) * delta;

        }

    }


    player.health =
        THREE.MathUtils.clamp(
            player.health,
            0,
            100
        );


    if (
        player.health <= 0
    ) {

        endRun();

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


/* =========================================================
   KILL
========================================================= */

function killEnemy(
    enemy
) {

    if (enemy.dead) {
        return;
    }


    enemy.dead =
        true;


    createHitParticles(
        enemy.object.position.clone().add(
            new THREE.Vector3(
                0,
                enemy.hitHeight * 0.5,
                0
            )
        )
    );


    scene.remove(
        enemy.object
    );


    player.kills++;


    if (
        enemy.type === "guardian"
    ) {

        player.credits +=
            120;

    } else if (
        enemy.type === "crawler"
    ) {

        player.credits +=
            35;

    } else {

        player.credits +=
            55;

    }


    if (
        player.kills === 1
    ) {

        showAchievement(
            "FIRST ECHO"
        );

    }


    if (
        player.kills === 10
    ) {

        showAchievement(
            "ECHO HUNTER"
        );

    }


    if (
        player.kills === 25
    ) {

        showAchievement(
            "SIGNAL BREAKER"
        );

    }

}


/* =========================================================
   PARTICLES
========================================================= */

function createHitParticles(
    position
) {

    for (
        let i = 0;
        i < 10;
        i++
    ) {

        const particle =
            new THREE.Mesh(

                new THREE.SphereGeometry(
                    0.045,
                    5,
                    5
                ),

                new THREE.MeshBasicMaterial({

                    color: 0x58e9ff

                })

            );


        particle.position.copy(
            position
        );


        scene.add(
            particle
        );


        particles.push({

            object:
                particle,

            velocity:
                new THREE.Vector3(

                    (Math.random() - 0.5) * 6,

                    Math.random() * 5,

                    (Math.random() - 0.5) * 6

                ),

            life:
                0.4

        });

    }

}


function updateParticles(
    delta
) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            particles[i];


        particle.object.position.addScaledVector(
            particle.velocity,
            delta
        );


        particle.velocity.y -=
            8 * delta;


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
   THIRD PERSON CAMERA
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
        Math.cos(cameraPitch) *
        CAMERA_DISTANCE;


    const desired =
        new THREE.Vector3();


    desired.x =
        target.x +
        Math.sin(cameraYaw) *
        horizontalDistance;


    desired.z =
        target.z +
        Math.cos(cameraYaw) *
        horizontalDistance;


    desired.y =
        target.y +
        CAMERA_HEIGHT +
        Math.sin(cameraPitch) *
        CAMERA_DISTANCE;


    const cameraDirection =
        new THREE.Vector3()
            .subVectors(
                desired,
                target
            );


    const fullDistance =
        cameraDirection.length();


    cameraDirection.normalize();


    const raycaster =
        new THREE.Raycaster(
            target,
            cameraDirection,
            0.2,
            fullDistance
        );


    const objects =
        obstacles.map(
            item =>
                item.object
        );


    const hits =
        raycaster.intersectObjects(
            objects,
            true
        );


    let finalPosition =
        desired.clone();


    if (hits.length > 0) {

        const hit =
            hits[0];


        finalPosition =
            target.clone()
                .addScaledVector(
                    cameraDirection,
                    Math.max(
                        4,
                        hit.distance - 0.7
                    )
                );

    }


    const smooth =
        1 -
        Math.exp(
            -CAMERA_SMOOTHNESS *
            delta
        );


    camera.position.lerp(
        finalPosition,
        smooth
    );


    const lookTarget =
        target.clone();


    const lookDistance =
        28;


    lookTarget.x +=
        -Math.sin(cameraYaw) *
        lookDistance;


    lookTarget.z +=
        -Math.cos(cameraYaw) *
        lookDistance;


    lookTarget.y +=
        0.4;


    camera.lookAt(
        lookTarget
    );

}


/* =========================================================
   HUD
========================================================= */

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
                ? "RELOADING"
                : player.ammo;

    }


    if (killsText) {

        killsText.textContent =
            "KILLS " +
            String(
                player.kills
            ).padStart(
                2,
                "0"
            );

    }


    if (creditsText) {

        creditsText.textContent =
            "CREDITS " +
            String(
                player.credits
            ).padStart(
                3,
                "0"
            );

    }


    if (zoneText) {

        if (
            player.position.z < -50
        ) {

            zoneText.textContent =
                "SIGNAL ZONE";

        } else if (
            player.position.z < 5
        ) {

            zoneText.textContent =
                "DEAD ZONE";

        } else {

            zoneText.textContent =
                "OUTER SECTOR";

        }

    }


    if (objectiveText) {

        objectiveText.textContent =
            player.position.z < -50
                ? "REACH THE SIGNAL"
                : "LOCATE THE LOST SIGNAL";

    }

}


/* =========================================================
   ACHIEVEMENT
========================================================= */

function showAchievement(
    name
) {

    if (!achievement) {
        return;
    }


    const title =
        document.getElementById(
            "achievementName"
        );


    if (title) {

        title.textContent =
            name;

    }


    achievement.style.display =
        "flex";


    setTimeout(() => {

        achievement.style.display =
            "none";

    }, 3000);

}


/* =========================================================
   SAVE DATA
========================================================= */

function getSaveData() {

    return {

        x:
            player.position.x,

        z:
            player.position.z,

        rotation:
            player.rotation,

        turretRotation:
            player.turretRotation,

        cannonPitch:
            player.cannonPitch,

        health:
            player.health,

        energy:
            player.energy,

        ammo:
            player.ammo,

        kills:
            player.kills,

        credits:
            player.credits,

        cameraYaw:
            cameraYaw,

        cameraPitch:
            cameraPitch,

        savedAt:
            Date.now()

    };

}


/* =========================================================
   SAVE GAME
========================================================= */

async function saveGame() {

    const data =
        getSaveData();


    localStorage.setItem(
        "echobound_tank_save",
        JSON.stringify(data)
    );


    if (
        !firebaseReady ||
        !firebaseUser
    ) {

        try {

            await firebaseLogin;

        } catch (error) {

            console.error(
                error
            );

        }

    }


    if (
        !firebaseReady ||
        !firebaseUser
    ) {

        console.warn(
            "Geen Firebase-verbinding."
        );

        return;

    }


    try {

        const saveReference =
            ref(
                database,
                "players/" +
                firebaseUser.uid +
                "/save1"
            );


        await set(
            saveReference,
            data
        );


        console.log(
            "SAVE GELUKT!"
        );


        console.log(
            "Firebase locatie:",
            "players/" +
            firebaseUser.uid +
            "/save1"
        );

    } catch (error) {

        console.error(
            "Firebase save mislukt:",
            error
        );

        alert(
            "Firebase opslaan is mislukt.\n\n" +
            "Je lokale backup is wel opgeslagen."
        );

    }

}


/* =========================================================
   APPLY LOADED GAME
========================================================= */

function applyLoadedGame(
    data
) {

    player.position.set(
        data.x ?? 0,
        0,
        data.z ?? 20
    );


    player.rotation =
        data.rotation ?? 0;


    player.turretRotation =
        data.turretRotation ?? 0;


    player.cannonPitch =
        data.cannonPitch ?? 0;


    player.health =
        data.health ?? 100;


    player.energy =
        data.energy ?? 100;


    player.ammo =
        data.ammo ?? 8;


    player.kills =
        data.kills ?? 0;


    player.credits =
        data.credits ?? 0;


    cameraYaw =
        data.cameraYaw ?? 0;


    cameraPitch =
        data.cameraPitch ?? 0.20;


    player.isReloading =
        false;


    player.reloadTimer =
        0;


    player.fireCooldown =
        0;


    player.recoil =
        0;


    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    turret.rotation.y =
        player.turretRotation;


    cannon.rotation.x =
        player.cannonPitch;


    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.object
        );

    }


    enemies.length =
        0;


    for (
        const bullet of bullets
    ) {

        scene.remove(
            bullet.object
        );

    }


    bullets.length =
        0;


    spawnEnemies();


    gameRunning =
        true;


    paused =
        false;


    if (menu) {

        menu.style.display =
            "none";

    }


    if (hud) {

        hud.style.display =
            "block";

    }


    if (pause) {

        pause.style.display =
            "none";

    }


    updateHUD();


    console.log(
        "EchoBound save geladen."
    );

}


/* =========================================================
   LOAD GAME
========================================================= */

async function loadGame() {

    if (
        !firebaseReady ||
        !firebaseUser
    ) {

        try {

            await firebaseLogin;

        } catch (error) {

            console.error(
                error
            );

        }

    }


    if (
        firebaseReady &&
        firebaseUser
    ) {

        try {

            const saveReference =
                ref(
                    database,
                    "players/" +
                    firebaseUser.uid +
                    "/save1"
                );


            const snapshot =
                await get(
                    saveReference
                );


            if (
                snapshot.exists()
            ) {

                const data =
                    snapshot.val();


                localStorage.setItem(
                    "echobound_tank_save",
                    JSON.stringify(data)
                );


                console.log(
                    "SAVE GELADEN UIT FIREBASE!"
                );


                applyLoadedGame(
                    data
                );


                return;

            }

        } catch (error) {

            console.error(
                "Firebase load mislukt:",
                error
            );

        }

    }


    const localSave =
        localStorage.getItem(
            "echobound_tank_save"
        );


    if (!localSave) {

        alert(
            "Er is nog geen opgeslagen tank-run."
        );

        return;

    }


    try {

        const data =
            JSON.parse(
                localSave
            );


        applyLoadedGame(
            data
        );

    } catch (error) {

        console.error(
            error
        );


        alert(
            "De tank-save kon niet worden geladen."
        );

    }

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


    player.turretRotation =
        0;


    player.cannonPitch =
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


    player.reloadTimer =
        0;


    player.fireCooldown =
        0;


    player.recoil =
        0;


    cameraYaw =
        0;


    cameraPitch =
        0.20;


    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.object
        );

    }


    enemies.length =
        0;


    for (
        const bullet of bullets
    ) {

        scene.remove(
            bullet.object
        );

    }


    bullets.length =
        0;


    for (
        const particle of particles
    ) {

        scene.remove(
            particle.object
        );

    }


    particles.length =
        0;


    spawnEnemies();


    tank.position.copy(
        player.position
    );


    tank.rotation.y =
        player.rotation;


    gameRunning =
        true;


    paused =
        false;


    pointerLocked =
        false;


    pointerLockRequestPending =
        false;


    if (menu) {

        menu.style.display =
            "none";

    }


    if (hud) {

        hud.style.display =
            "block";

    }


    if (pause) {

        pause.style.display =
            "none";

    }


    updateHUD();


    console.log(
        "Nieuwe tank-run gestart."
    );

}


/* =========================================================
   PAUSE
========================================================= */

function togglePause() {

    if (!gameRunning) {
        return;
    }


    paused =
        !paused;


    if (pause) {

        pause.style.display =
            paused
                ? "flex"
                : "none";

    }


    if (paused) {

        if (
            document.pointerLockElement === canvas
        ) {

            document.exitPointerLock();

        }

    }

}


/* =========================================================
   MENU BUTTONS
========================================================= */

const newGameButton =
    document.getElementById(
        "newGame"
    );


if (newGameButton) {

    newGameButton.addEventListener(
        "click",
        newGame
    );

}


const loadGameButton =
    document.getElementById(
        "loadGame"
    );


if (loadGameButton) {

    loadGameButton.addEventListener(
        "click",
        loadGame
    );

}


/* =========================================================
   CONTROLS
========================================================= */

const controlsButton =
    document.getElementById(
        "controlsButton"
    );


if (controlsButton) {

    controlsButton.addEventListener(
        "click",
        () => {

            alert(

                "ECHOBOUND — TANK CONTROLS\n\n" +

                "W = vooruit\n" +

                "S = achteruit\n" +

                "A = links draaien\n" +

                "D = rechts draaien\n\n" +

                "MUIS = camera draaien\n" +

                "LINKERMUIS = schieten\n" +

                "R = herladen\n" +

                "ESC = pauze"

            );

        }
    );

}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

const achievementsButton =
    document.getElementById(
        "achievementsButton"
    );


if (achievementsButton) {

    achievementsButton.addEventListener(
        "click",
        () => {

            alert(

                "ACHIEVEMENTS\n\n" +

                "FIRST ECHO\n" +

                "Versla je eerste vijand.\n\n" +

                "ECHO HUNTER\n" +

                "Versla 10 vijanden.\n\n" +

                "SIGNAL BREAKER\n" +

                "Versla 25 vijanden."

            );

        }
    );

}


/* =========================================================
   RESUME
========================================================= */

const resumeButton =
    document.getElementById(
        "resume"
    );


if (resumeButton) {

    resumeButton.addEventListener(
        "click",
        () => {

            paused =
                false;


            if (pause) {

                pause.style.display =
                    "none";

            }


            requestGamePointerLock();

        }
    );

}


/* =========================================================
   SAVE BUTTON
========================================================= */

const saveButton =
    document.getElementById(
        "save"
    );


if (saveButton) {

    saveButton.addEventListener(
        "click",
        async () => {

            await saveGame();

        }
    );

}


/* =========================================================
   QUIT BUTTON
========================================================= */

const quitButton =
    document.getElementById(
        "quit"
    );


if (quitButton) {

    quitButton.addEventListener(
        "click",
        async () => {

            await saveGame();


            gameRunning =
                false;


            paused =
                false;


            if (
                document.pointerLockElement === canvas
            ) {

                document.exitPointerLock();

            }


            pointerLocked =
                false;


            pointerLockRequestPending =
                false;


            if (pause) {

                pause.style.display =
                    "none";

            }


            if (hud) {

                hud.style.display =
                    "none";

            }


            if (menu) {

                menu.style.display =
                    "flex";

            }

        }
    );

}


/* =========================================================
   MAP
========================================================= */

function openMap() {

    const map =
        document.getElementById(
            "map"
        );


    const mapCanvas =
        document.getElementById(
            "mapCanvas"
        );


    if (
        !map ||
        !mapCanvas
    ) {

        return;

    }


    map.style.display =
        "flex";


    if (
        document.pointerLockElement === canvas
    ) {

        document.exitPointerLock();

    }


    mapCanvas.width =
        900;


    mapCanvas.height =
        520;


    const ctx =
        mapCanvas.getContext(
            "2d"
        );


    ctx.fillStyle =
        "#031015";


    ctx.fillRect(
        0,
        0,
        900,
        520
    );


    ctx.strokeStyle =
        "rgba(88,233,255,.15)";


    for (
        let x = 0;
        x < 900;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            520
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y < 520;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            900,
            y
        );

        ctx.stroke();

    }


    const px =
        450 +
        player.position.x *
        2.2;


    const py =
        260 +
        player.position.z *
        2.2;


    ctx.fillStyle =
        "#58e9ff";


    ctx.save();


    ctx.translate(
        px,
        py
    );


    ctx.rotate(
        player.rotation
    );


    ctx.fillRect(
        -10,
        -7,
        20,
        14
    );


    ctx.strokeStyle =
        "#8ff7ff";


    ctx.lineWidth =
        3;


    ctx.beginPath();


    ctx.moveTo(
        0,
        0
    );


    ctx.lineTo(
        0,
        -20
    );


    ctx.stroke();


    ctx.restore();


    ctx.fillStyle =
        "#ff4f91";


    for (
        const enemy of enemies
    ) {

        if (enemy.dead) {
            continue;
        }


        const x =
            450 +
            enemy.object.position.x *
            2.2;


        const y =
            260 +
            enemy.object.position.z *
            2.2;


        ctx.beginPath();


        ctx.arc(
            x,
            y,
            5,
            0,
            Math.PI * 2
        );


        ctx.fill();

    }

}


/* =========================================================
   MAP BUTTON
========================================================= */

const mapButton =
    document.getElementById(
        "mapButton"
    );


if (mapButton) {

    mapButton.addEventListener(
        "click",
        openMap
    );

}


/* =========================================================
   CLOSE MAP
========================================================= */

const closeMapButton =
    document.getElementById(
        "closeMap"
    );


if (closeMapButton) {

    closeMapButton.addEventListener(
        "click",
        () => {

            const map =
                document.getElementById(
                    "map"
                );


            if (map) {

                map.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   GAME OVER
========================================================= */

function endRun() {

    if (!gameRunning) {
        return;
    }


    gameRunning =
        false;


    paused =
        false;


    if (
        document.pointerLockElement === canvas
    ) {

        document.exitPointerLock();

    }


    pointerLocked =
        false;


    pointerLockRequestPending =
        false;


    saveGame();


    if (hud) {

        hud.style.display =
            "none";

    }


    if (menu) {

        menu.style.display =
            "flex";

    }


    alert(

        "TANK DESTROYED\n\n" +

        "KILLS: " +
        player.kills +

        "\nCREDITS: " +
        player.credits

    );

}


/* =========================================================
   GAME LOOP
========================================================= */

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


    signalOrb.rotation.y +=
        delta * 1.5;


    signalLight.intensity =
        10 +
        Math.sin(
            performance.now() *
            0.004
        ) * 3;


    if (
        gameRunning &&
        !paused
    ) {

        player.fireCooldown -=
            delta;


        if (
            player.fireCooldown < 0
        ) {

            player.fireCooldown =
                0;

        }


        updateTank(delta);

        updateTurret(delta);

        updateReload(delta);

        updateEnemies(delta);

        updateBullets(delta);

        updateParticles(delta);

        updateCamera(delta);

        updateHUD();

    } else {

        updateCamera(delta);

    }


    renderer.render(
        scene,
        camera
    );

}


animate();


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


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );

    }
);
