import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

/* =========================================================
   ECHOBOUND — THE LOST SIGNAL
   PLAYER TANK SYSTEM
========================================================= */

const canvas = document.getElementById("game");

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const pause = document.getElementById("pause");
const achievement = document.getElementById("achievement");

const healthBar = document.getElementById("healthBar");
const energyBar = document.getElementById("energyBar");

const ammoText = document.getElementById("ammo");
const killsText = document.getElementById("kills");
const creditsText = document.getElementById("credits");
const zoneText = document.getElementById("zone");
const objectiveText = document.getElementById("objective");


/* =========================================================
   RENDERER
========================================================= */

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;


/* =========================================================
   SCENE
========================================================= */

const scene = new THREE.Scene();

scene.background =
    new THREE.Color(0x061014);

scene.fog =
    new THREE.FogExp2(
        0x061014,
        0.0045
    );


/* =========================================================
   CAMERA
========================================================= */

const camera =
    new THREE.PerspectiveCamera(
        65,
        window.innerWidth /
        window.innerHeight,
        0.1,
        700
    );

camera.position.set(
    0,
    5,
    10
);


/* =========================================================
   LIGHTING
========================================================= */

const hemi =
    new THREE.HemisphereLight(
        0x9befff,
        0x101419,
        2.3
    );

scene.add(hemi);


const sun =
    new THREE.DirectionalLight(
        0xdffaff,
        3.2
    );

sun.position.set(
    -80,
    110,
    50
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;

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

ground.receiveShadow = true;

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
    0.15;

scene.add(grid);


/* =========================================================
   GAME STATE
========================================================= */

let gameRunning = false;
let paused = false;
let pointerLocked = false;

const keys = {};

const obstacles = [];
const enemies = [];
const bullets = [];
const particles = [];

const decorativeTanks = [];


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
   CAMERA
========================================================= */

let cameraYaw = 0;

let cameraPitch = 0.25;

const cameraDistance = 11;

const cameraHeight = 5;

const cameraTargetHeight = 1.8;

const cameraSensitivity = 0.0025;

const cameraTarget =
    new THREE.Vector3();

const cameraDesired =
    new THREE.Vector3();

const cameraRaycaster =
    new THREE.Raycaster();


/* =========================================================
   INPUT
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "KeyR"
        ) {

            reload();

        }

    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;

    }
);


/* =========================================================
   MOUSE
========================================================= */

canvas.addEventListener(
    "click",
    () => {

        if (
            gameRunning &&
            !paused &&
            !pointerLocked
        ) {

            canvas.requestPointerLock();

        }

    }
);


canvas.addEventListener(
    "mousedown",
    event => {

        if (
            !gameRunning ||
            paused
        ) {

            return;

        }

        if (
            !pointerLocked
        ) {

            canvas.requestPointerLock();

        }

        if (
            event.button === 0
        ) {

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

    }
);


/* =========================================================
   MOUSE LOOK
========================================================= */

document.addEventListener(
    "mousemove",
    event => {

        if (
            !pointerLocked ||
            !gameRunning ||
            paused
        ) {

            return;

        }

        cameraYaw -=
            event.movementX *
            cameraSensitivity;

        cameraPitch -=
            event.movementY *
            cameraSensitivity;

        cameraPitch =
            THREE.MathUtils.clamp(
                cameraPitch,
                -0.35,
                0.85
            );

    }
);


/* =========================================================
   PLAYER TANK
========================================================= */

const tank =
    new THREE.Group();

tank.position.copy(
    player.position
);


/* =========================================================
   TANK MATERIALS
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
   MAIN BODY
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

tankBody.castShadow = true;
tankBody.receiveShadow = true;

tank.add(tankBody);


/* =========================================================
   FRONT ARMOR
========================================================= */

const frontArmor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4.6,
            1.0,
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

frontArmor.castShadow = true;

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

topArmor.castShadow = true;

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

leftTrack.castShadow = true;

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

        wheel.castShadow = true;

        tank.add(wheel);

        tankWheels.push(wheel);

    }

}

createTrackWheels(-2.43);
createTrackWheels(2.43);


/* =========================================================
   TRACK GLOW
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

turretBase.castShadow = true;

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

turretBody.castShadow = true;

turret.add(turretBody);


/* =========================================================
   CANNON PIVOT
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
   MAIN BARREL
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

barrel.castShadow = true;

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
   BARREL ENERGY LINE
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
   OBSTACLE SYSTEM
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
   ROCKS
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

    rock.castShadow = true;
    rock.receiveShadow = true;

    addObstacle(
        rock,
        1.7 * scale
    );

}


/* =========================================================
   TREES
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

    trunk.castShadow = true;

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

    crown.castShadow = true;

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
   BUILDINGS
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

    body.castShadow = true;
    body.receiveShadow = true;

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
        Math.max(width, depth) * 0.72
    );

}


/* =========================================================
   WORLD GENERATION
========================================================= */

function generateWorld() {

    for (
        let i = 0;
        i < 70;
        i++
    ) {

        const x =
            (Math.random() - 0.5) * 250;

        const z =
            (Math.random() - 0.5) * 250;


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
            (Math.random() - 0.5) * 250;

        const z =
            (Math.random() - 0.5) * 250;


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
   DECORATIVE TANKS
========================================================= */

function createDecorativeTank(
    x,
    z,
    rotation
) {

    const clone =
        tank.clone(true);

    clone.position.set(
        x,
        0,
        z
    );

    clone.rotation.y =
        rotation;

    scene.add(clone);

    decorativeTanks.push(
        clone
    );

}


createDecorativeTank(
    25,
    -12,
    0.5
);


createDecorativeTank(
    -28,
    -38,
    -0.8
);


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

tower.castShadow = true;

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
            3.0 +
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

    let throttle = 0;
    let steering = 0;


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


    if (
        steering !== 0
    ) {

        const turningSpeed =
            player.turnSpeed *
            delta *
            (
                throttle === 0
                    ? 0.8
                    : 1
            );


        player.rotation +=
            steering *
            turningSpeed;

    }


    if (
        throttle !== 0
    ) {

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


        if (
            !tankBlocked(next)
        ) {

            player.position.copy(next);

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


    if (
        throttle !== 0
    ) {

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
   TURRET + CANNON AIM
========================================================= */

function updateTurret(
    delta
) {

    /*
       De horizontale richting van de
       muiscamera bepaalt waar het
       kanon naartoe kijkt.
    */

    let targetTurretRotation =
        cameraYaw -
        player.rotation;


    targetTurretRotation =
        Math.atan2(
            Math.sin(
                targetTurretRotation
            ),
            Math.cos(
                targetTurretRotation
            )
        );


    let difference =
        targetTurretRotation -
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


    /*
       De camera bepaalt de verticale
       hoek van het kanon.

       We gebruiken een veel kleinere
       hoek dan de camera zelf zodat
       het kanon niet over de monsters
       heen schiet.
    */

    const desiredPitch =
        THREE.MathUtils.clamp(
            cameraPitch * 0.55,
            -0.12,
            0.32
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


    /*
       Recoil.
    */

    if (
        player.recoil > 0
    ) {

        player.recoil -=
            delta;

        cannon.position.z =
            -1.15 +
            Math.sin(
                player.recoil * 35
            ) * 0.18;

    } else {

        cannon.position.z =
            -1.15;

    }

}


/* =========================================================
   NIEUW RICHTSYSTEEM
========================================================= */

function getCannonDirection() {

    /*
       We halen de echte positie van
       de loop op.
    */

    const muzzlePosition =
        new THREE.Vector3();

    barrel.getWorldPosition(
        muzzlePosition
    );


    /*
       Richting waarin de turret/cannon
       wijst.
    */

    const forward =
        new THREE.Vector3(
            0,
            0,
            -1
        );


    const cannonQuaternion =
        new THREE.Quaternion();


    cannon.getWorldQuaternion(
        cannonQuaternion
    );


    forward.applyQuaternion(
        cannonQuaternion
    );


    forward.normalize();


    /*
       We maken een virtueel richtpunt
       verderop.
       
       Dit richtpunt ligt laag genoeg
       om monsters te kunnen raken.
    */

    const aimPoint =
        muzzlePosition.clone();


    aimPoint.addScaledVector(
        forward,
        120
    );


    /*
       De kogel wordt gecorrigeerd
       richting ongeveer 1.2 meter
       boven de grond.
    */

    aimPoint.y =
        1.2;


    /*
       Nu rekenen we opnieuw de echte
       richting vanaf de loop naar het
       richtpunt uit.
    */

    const direction =
        new THREE.Vector3()
            .subVectors(
                aimPoint,
                muzzlePosition
            )
            .normalize();


    return direction;

}


/* =========================================================
   SHOOT
========================================================= */

function shoot() {

    if (
        !gameRunning ||
        paused
    ) {

        return;

    }


    if (
        player.isReloading
    ) {

        return;

    }


    if (
        player.fireCooldown > 0
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
        0.22;


    const muzzlePosition =
        new THREE.Vector3();


    barrel.getWorldPosition(
        muzzlePosition
    );


    /*
       BELANGRIJK:
       Hier wordt nu het nieuwe
       lage richtsysteem gebruikt.
    */

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


    scene.add(projectile);


    bullets.push({

        object: projectile,

        velocity:
            direction.clone()
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

        object: flash,

        velocity:
            new THREE.Vector3(
                0,
                0,
                0
            ),

        life: 0.09

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


    setTimeout(
        () => {

            scene.remove(
                flashLight
            );

        },
        80
    );

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
        1.7;

}


/* =========================================================
   UPDATE RELOAD
========================================================= */

function updateReload(
    delta
) {

    if (
        !player.isReloading
    ) {

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


    updateHUD();

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
           Enemy collision.
        */

        for (
            const enemy of enemies
        ) {

            if (
                enemy.dead
            ) {

                continue;

            }


            const distance =
                bullet.object.position.distanceTo(
                    enemy.object.position
                );


            if (
                distance <
                enemy.radius + 0.65
            ) {

                enemy.health -=
                    bullet.damage;


                createHitParticles(
                    bullet.object.position
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


        /*
           World collision.
        */

        if (
            !remove
        ) {

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

                    remove = true;

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
   ENEMY CREATION
========================================================= */

function createEnemy(
    x,
    z,
    type
) {

    const enemy =
        new THREE.Group();


    let scale = 1;
    let bodyColor = 0x713654;
    let health = 80;
    let speed = 2;


    if (
        type === "crawler"
    ) {

        scale = 0.75;
        bodyColor = 0x8b6842;
        health = 45;
        speed = 3.1;

    }


    if (
        type === "guardian"
    ) {

        scale = 1.5;
        bodyColor = 0x4c3d77;
        health = 150;
        speed = 1.1;

    }


    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                scale,
                16,
                12
            ),
            new THREE.MeshStandardMaterial({
                color: bodyColor,
                roughness: 0.55,
                metalness: 0.35
            })
        );


    body.scale.y =
        1.25;

    body.castShadow = true;

    enemy.add(body);


    const head =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.6 * scale,
                14,
                10
            ),
            new THREE.MeshStandardMaterial({
                color: 0x1e2a2d,
                metalness: 0.5,
                roughness: 0.4
            })
        );


    head.position.y =
        0.8 * scale;

    enemy.add(head);


    const eye =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.13 * scale,
                10,
                10
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff4f91
            })
        );


    eye.position.set(
        0,
        0.82 * scale,
        -0.5 * scale
    );


    enemy.add(eye);


    enemy.position.set(
        x,
        scale,
        z
    );


    scene.add(enemy);


    enemies.push({

        object: enemy,

        type,

        health,

        speed,

        radius:
            0.9 * scale,

        dead: false

    });

}


/* =========================================================
   SPAWN ENEMIES
========================================================= */

function spawnEnemies() {

    for (
        let i = 0;
        i < 24;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const distance =
            40 +
            Math.random() *
            100;


        const x =
            Math.sin(angle) *
            distance;


        const z =
            20 +
            Math.cos(angle) *
            distance;


        let type =
            "stalker";


        const chance =
            Math.random();


        if (
            chance > 0.88
        ) {

            type =
                "guardian";

        } else if (
            chance > 0.58
        ) {

            type =
                "crawler";

        }


        createEnemy(
            x,
            z,
            type
        );

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
            enemy.dead
        ) {

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


        if (
            distance > 120
        ) {

            continue;

        }


        direction.normalize();


        if (
            distance > 4.5
        ) {

            const next =
                enemy.object.position.clone();


            next.addScaledVector(
                direction,
                enemy.speed *
                delta
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


    enemy.dead = true;


    createHitParticles(
        enemy.object.position
    );


    scene.remove(
        enemy.object
    );


    player.kills++;


    if (
        enemy.type === "guardian"
    ) {

        player.credits += 120;

    } else if (
        enemy.type === "crawler"
    ) {

        player.credits += 35;

    } else {

        player.credits += 55;

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


    updateHUD();

}


/* =========================================================
   HIT PARTICLES
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


        scene.add(particle);


        particles.push({

            object: particle,

            velocity:
                new THREE.Vector3(
                    (Math.random() - 0.5) * 6,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 6
                ),

            life: 0.4

        });

    }

}


/* =========================================================
   PARTICLES
========================================================= */

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
   CAMERA
========================================================= */

function updateCamera(
    delta
) {

    cameraTarget.copy(
        player.position
    );


    cameraTarget.y +=
        cameraTargetHeight;


    const horizontal =
        Math.cos(cameraPitch) *
        cameraDistance;


    cameraDesired.x =
        cameraTarget.x +
        Math.sin(cameraYaw) *
        horizontal;


    cameraDesired.z =
        cameraTarget.z +
        Math.cos(cameraYaw) *
        horizontal;


    cameraDesired.y =
        cameraTarget.y +
        cameraHeight +
        Math.sin(cameraPitch) *
        cameraDistance;


    const direction =
        new THREE.Vector3()
            .subVectors(
                cameraDesired,
                cameraTarget
            );


    const distance =
        direction.length();


    direction.normalize();


    cameraRaycaster.set(
        cameraTarget,
        direction
    );


    const obstacleObjects =
        obstacles.map(
            item =>
                item.object
        );


    const hits =
        cameraRaycaster.intersectObjects(
            obstacleObjects,
            true
        );


    let safe =
        cameraDesired.clone();


    if (
        hits.length > 0
    ) {

        const hit =
            hits.find(
                h =>
                    h.distance > 0.5
            );


        if (
            hit &&
            hit.distance < distance
        ) {

            safe =
                cameraTarget.clone()
                    .addScaledVector(
                        direction,
                        Math.max(
                            3,
                            hit.distance - 0.5
                        )
                    );

        }

    }


    const smooth =
        1 -
        Math.exp(
            -12 * delta
        );


    camera.position.lerp(
        safe,
        smooth
    );


    camera.lookAt(
        cameraTarget
    );

}


/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    if (
        healthBar
    ) {

        healthBar.style.width =
            `${player.health}%`;

    }


    if (
        energyBar
    ) {

        energyBar.style.width =
            `${player.energy}%`;

    }


    if (
        ammoText
    ) {

        ammoText.textContent =
            player.isReloading
                ? "RELOADING"
                : player.ammo;

    }


    if (
        killsText
    ) {

        killsText.textContent =
            "KILLS " +
            String(
                player.kills
            ).padStart(2, "0");

    }


    if (
        creditsText
    ) {

        creditsText.textContent =
            "CREDITS " +
            String(
                player.credits
            ).padStart(3, "0");

    }


    if (
        zoneText
    ) {

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


    if (
        objectiveText
    ) {

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

    if (
        !achievement
    ) {

        return;

    }


    const title =
        document.getElementById(
            "achievementName"
        );


    if (
        title
    ) {

        title.textContent =
            name;

    }


    achievement.style.display =
        "flex";


    setTimeout(
        () => {

            achievement.style.display =
                "none";

        },
        3000
    );

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


    player.rotation = 0;

    player.turretRotation = 0;

    player.cannonPitch = 0;

    player.health = 100;

    player.energy = 100;

    player.ammo =
        player.maxAmmo;

    player.kills = 0;

    player.credits = 0;

    player.isReloading = false;

    player.reloadTimer = 0;

    cameraYaw = 0;

    cameraPitch = 0.25;


    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.object
        );

    }

    enemies.length = 0;


    for (
        const bullet of bullets
    ) {

        scene.remove(
            bullet.object
        );

    }

    bullets.length = 0;


    spawnEnemies();


    gameRunning = true;

    paused = false;


    if (
        menu
    ) {

        menu.style.display =
            "none";

    }


    if (
        hud
    ) {

        hud.style.display =
            "block";

    }


    if (
        pause
    ) {

        pause.style.display =
            "none";

    }


    updateHUD();


    canvas.requestPointerLock();

}


/* =========================================================
   SAVE
========================================================= */

function saveGame() {

    const data = {

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
            cameraPitch

    };


    localStorage.setItem(
        "echobound_tank_save",
        JSON.stringify(data)
    );

}


/* =========================================================
   LOAD
========================================================= */

function loadGame() {

    const saved =
        localStorage.getItem(
            "echobound_tank_save"
        );


    if (
        !saved
    ) {

        alert(
            "Er is nog geen opgeslagen tank-run."
        );

        return;

    }


    try {

        const data =
            JSON.parse(saved);


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
            data.cameraPitch ?? 0.25;


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


        enemies.length = 0;


        spawnEnemies();


        gameRunning = true;

        paused = false;


        if (
            menu
        ) {

            menu.style.display =
                "none";

        }


        if (
            hud
        ) {

            hud.style.display =
                "block";

        }


        updateHUD();


        canvas.requestPointerLock();

    } catch (
        error
    ) {

        console.error(error);


        alert(
            "De tank-save kon niet worden geladen."
        );

    }

}


/* =========================================================
   PAUSE
========================================================= */

function togglePause() {

    if (
        !gameRunning
    ) {

        return;

    }


    paused =
        !paused;


    if (
        pause
    ) {

        pause.style.display =
            paused
                ? "flex"
                : "none";

    }


    if (
        paused
    ) {

        document.exitPointerLock();

    } else {

        canvas.requestPointerLock();

    }

}


/* =========================================================
   MENU BUTTONS
========================================================= */

const newGameButton =
    document.getElementById(
        "newGame"
    );


if (
    newGameButton
) {

    newGameButton.addEventListener(
        "click",
        newGame
    );

}


const loadGameButton =
    document.getElementById(
        "loadGame"
    );


if (
    loadGameButton
) {

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


if (
    controlsButton
) {

    controlsButton.addEventListener(
        "click",
        () => {

            alert(
                "ECHOBOUND — TANK CONTROLS\n\n" +
                "W = vooruit\n" +
                "S = achteruit\n" +
                "A = links draaien\n" +
                "D = rechts draaien\n\n" +
                "MUis = rondkijken en richten\n" +
                "LINKERMUIS = kanon afvuren\n" +
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


if (
    achievementsButton
) {

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
   PAUSE BUTTONS
========================================================= */

const resumeButton =
    document.getElementById(
        "resume"
    );


if (
    resumeButton
) {

    resumeButton.addEventListener(
        "click",
        () => {

            paused = false;


            if (
                pause
            ) {

                pause.style.display =
                    "none";

            }


            canvas.requestPointerLock();

        }
    );

}


const saveButton =
    document.getElementById(
        "save"
    );


if (
    saveButton
) {

    saveButton.addEventListener(
        "click",
        saveGame
    );

}


const quitButton =
    document.getElementById(
        "quit"
    );


if (
    quitButton
) {

    quitButton.addEventListener(
        "click",
        () => {

            saveGame();

            gameRunning = false;

            paused = false;

            document.exitPointerLock();


            if (
                pause
            ) {

                pause.style.display =
                    "none";

            }


            if (
                hud
            ) {

                hud.style.display =
                    "none";

            }


            if (
                menu
            ) {

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


    document.exitPointerLock();


    mapCanvas.width = 900;
    mapCanvas.height = 520;


    const ctx =
        mapCanvas.getContext("2d");


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

    ctx.lineWidth = 1;


    for (
        let x = 0;
        x < 900;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(x, 520);

        ctx.stroke();

    }


    for (
        let y = 0;
        y < 520;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(900, y);

        ctx.stroke();

    }


    /*
       Speler.
    */

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

    ctx.lineWidth = 3;


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


    /*
       Vijanden.
    */

    ctx.fillStyle =
        "#ff4f91";


    for (
        const enemy of enemies
    ) {

        if (
            enemy.dead
        ) {

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


    /*
       Signaal.
    */

    ctx.strokeStyle =
        "#58e9ff";

    ctx.lineWidth = 3;


    ctx.beginPath();

    ctx.arc(
        450,
        260 - 85 * 2.2,
        13,
        0,
        Math.PI * 2
    );

    ctx.stroke();

}


/* =========================================================
   CLOSE MAP
========================================================= */

const closeMapButton =
    document.getElementById(
        "closeMap"
    );


if (
    closeMapButton
) {

    closeMapButton.addEventListener(
        "click",
        () => {

            const map =
                document.getElementById(
                    "map"
                );


            if (
                map
            ) {

                map.style.display =
                    "none";

            }


            if (
                gameRunning &&
                !paused
            ) {

                canvas.requestPointerLock();

            }

        }
    );

}


/* =========================================================
   GAME OVER
========================================================= */

function endRun() {

    gameRunning = false;


    document.exitPointerLock();


    saveGame();


    if (
        hud
    ) {

        hud.style.display =
            "none";

    }


    if (
        menu
    ) {

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


    /*
       Signaal animatie.
    */

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


        updateTank(
            delta
        );


        updateTurret(
            delta
        );


        updateReload(
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

    } else {

        updateCamera(
            delta
        );

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
