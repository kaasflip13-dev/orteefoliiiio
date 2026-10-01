import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";


/* =========================================================
   ECHOBOUND
   THIRD PERSON CAMERA VERSION
========================================================= */


/* =========================================================
   HTML ELEMENTS
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
    canvas: canvas,
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
    new THREE.Color(0x071014);

scene.fog =
    new THREE.FogExp2(
        0x071014,
        0.005
    );


/* =========================================================
   CAMERA
========================================================= */

const camera = new THREE.PerspectiveCamera(
    68,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

camera.position.set(
    0,
    4,
    8
);


/* =========================================================
   LIGHTS
========================================================= */

const hemisphereLight =
    new THREE.HemisphereLight(
        0x9defff,
        0x101418,
        2.1
    );

scene.add(
    hemisphereLight
);


const sun =
    new THREE.DirectionalLight(
        0xdffaff,
        3.2
    );

sun.position.set(
    -50,
    90,
    35
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

sun.shadow.camera.left = -120;
sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120;
sun.shadow.camera.bottom = -120;

scene.add(
    sun
);


/* =========================================================
   GROUND
========================================================= */

const ground =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            320,
            320
        ),
        new THREE.MeshStandardMaterial({
            color: 0x111a1d,
            roughness: 1,
            metalness: 0.03
        })
    );

ground.rotation.x =
    -Math.PI / 2;

ground.receiveShadow = true;

scene.add(
    ground
);


/* =========================================================
   GRID
========================================================= */

const grid =
    new THREE.GridHelper(
        320,
        64,
        0x1e5b68,
        0x102d34
    );

grid.position.y =
    0.02;

grid.material.transparent =
    true;

grid.material.opacity =
    0.18;

scene.add(
    grid
);


/* =========================================================
   WORLD ARRAYS
========================================================= */

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
            18
        ),

    health: 100,
    energy: 100,

    ammo: 12,
    maxAmmo: 12,

    kills: 0,
    credits: 0,

    yaw: 0,

    speed: 7,

    sprintSpeed: 12,

    dashCooldown: 0,

    fireCooldown: 0,

    moving: false,
    sprinting: false

};


/* =========================================================
   THIRD PERSON CAMERA SETTINGS

   Deze waarden bepalen hoe de camera voelt.
========================================================= */

const cameraSettings = {

    distance: 7.5,

    height: 2.4,

    lookHeight: 1.35,

    minDistance: 2.0,

    maxDistance: 9.0,

    sensitivity: 0.0024,

    smooth: 12,

    minPitch: -0.55,

    maxPitch: 1.0

};


/*
    cameraYaw:
    horizontale draaiing

    cameraPitch:
    omhoog / omlaag
*/

let cameraYaw = 0;

let cameraPitch = 0.22;


/*
    Camera wordt onafhankelijk
    van het personage bestuurd.
*/

let cameraTarget =
    new THREE.Vector3();

let cameraDesired =
    new THREE.Vector3();


/* =========================================================
   INPUT
========================================================= */

const keys = {};

let gameRunning = false;
let paused = false;

let pointerLocked = false;


/* =========================================================
   KEYBOARD
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;


        /*
            M = map
        */

        if (
            event.code === "KeyM" &&
            gameRunning &&
            !paused
        ) {

            openMap();

        }


        /*
            R = reload
        */

        if (
            event.code === "KeyR" &&
            gameRunning &&
            !paused
        ) {

            reload();

        }


        /*
            ESC wordt normaal door
            de browser gebruikt om pointer
            lock te verlaten.
        */

    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;

    }
);


/* =========================================================
   POINTER LOCK
========================================================= */

/*
    Klik op de game om de camera te activeren.

    Daarna beweegt de muis de camera
    zonder dat de muis uit het scherm gaat.
*/

canvas.addEventListener(
    "click",
    () => {

        if (
            !gameRunning ||
            paused
        ) {
            return;
        }

        if (
            document.pointerLockElement !== canvas
        ) {

            canvas.requestPointerLock();

        }

    }
);


/*
    Linkermuisknop schiet.

    Pointer lock wordt ook geactiveerd.
*/

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
            event.button === 0
        ) {

            if (
                document.pointerLockElement !== canvas
            ) {

                canvas.requestPointerLock();

            }

            shoot();

        }

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
   CAMERA MOUSE CONTROL
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


        /*
            Horizontaal.
            Hiermee kun je volledig rond draaien.
        */

        cameraYaw -=
            event.movementX *
            cameraSettings.sensitivity;


        /*
            Verticaal.
            Omhoog en omlaag.
        */

        cameraPitch -=
            event.movementY *
            cameraSettings.sensitivity;


        /*
            Voorkomt dat de camera
            helemaal ondersteboven draait.
        */

        cameraPitch =
            THREE.MathUtils.clamp(
                cameraPitch,
                cameraSettings.minPitch,
                cameraSettings.maxPitch
            );

    }
);


/* =========================================================
   PLAYER MODEL
========================================================= */

const playerModel =
    new THREE.Group();


/* =========================================================
   BODY
========================================================= */

const body =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            0.38,
            1.05,
            8,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x26373d,
            metalness: 0.7,
            roughness: 0.28
        })
    );

body.position.y =
    1.05;

body.castShadow = true;

playerModel.add(
    body
);


/* =========================================================
   CHEST ARMOR
========================================================= */

const chest =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.78,
            0.68,
            0.5
        ),
        new THREE.MeshStandardMaterial({
            color: 0x17262b,
            metalness: 0.85,
            roughness: 0.25
        })
    );

chest.position.set(
    0,
    1.25,
    0
);

chest.castShadow = true;

playerModel.add(
    chest
);


/* =========================================================
   HEAD
========================================================= */

const head =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            0.35,
            18,
            14
        ),
        new THREE.MeshStandardMaterial({
            color: 0x293d43,
            metalness: 0.8,
            roughness: 0.25
        })
    );

head.position.y =
    1.86;

head.castShadow = true;

playerModel.add(
    head
);


/* =========================================================
   VISOR
========================================================= */

const visor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.44,
            0.13,
            0.045
        ),
        new THREE.MeshBasicMaterial({
            color: 0x58e9ff
        })
    );

visor.position.set(
    0,
    1.88,
    -0.34
);

playerModel.add(
    visor
);


/* =========================================================
   BACKPACK
========================================================= */

const backpack =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.5,
            0.75,
            0.28
        ),
        new THREE.MeshStandardMaterial({
            color: 0x111b20,
            metalness: 0.75,
            roughness: 0.3
        })
    );

backpack.position.set(
    0,
    1.18,
    0.34
);

backpack.castShadow = true;

playerModel.add(
    backpack
);


/* =========================================================
   BACKPACK CORE
========================================================= */

const backpackCore =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.16,
            0.3,
            0.03
        ),
        new THREE.MeshBasicMaterial({
            color: 0x58e9ff
        })
    );

backpackCore.position.set(
    0,
    1.2,
    0.49
);

playerModel.add(
    backpackCore
);


/* =========================================================
   ARMS
========================================================= */

const armMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x26383e,
        metalness: 0.7,
        roughness: 0.3
    });


const leftArm =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            0.13,
            0.58,
            6,
            8
        ),
        armMaterial
    );

leftArm.position.set(
    -0.46,
    1.18,
    -0.02
);

leftArm.rotation.z =
    -0.18;

leftArm.castShadow = true;

playerModel.add(
    leftArm
);


const rightArm =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            0.13,
            0.58,
            6,
            8
        ),
        armMaterial
    );

rightArm.position.set(
    0.46,
    1.18,
    -0.05
);

rightArm.rotation.z =
    0.18;

rightArm.castShadow = true;

playerModel.add(
    rightArm
);


/* =========================================================
   LEGS
========================================================= */

const legMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x18272c,
        metalness: 0.65,
        roughness: 0.4
    });


const leftLeg =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            0.15,
            0.65,
            6,
            8
        ),
        legMaterial
    );

leftLeg.position.set(
    -0.2,
    0.43,
    0
);

leftLeg.castShadow = true;

playerModel.add(
    leftLeg
);


const rightLeg =
    leftLeg.clone();

rightLeg.position.x =
    0.2;

playerModel.add(
    rightLeg
);


/* =========================================================
   BOOTS
========================================================= */

const bootMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x0b1418,
        metalness: 0.7,
        roughness: 0.4
    });


const leftBoot =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.3,
            0.18,
            0.45
        ),
        bootMaterial
    );

leftBoot.position.set(
    -0.2,
    0.08,
    -0.08
);

playerModel.add(
    leftBoot
);


const rightBoot =
    leftBoot.clone();

rightBoot.position.x =
    0.2;

playerModel.add(
    rightBoot
);


/* =========================================================
   WEAPON
========================================================= */

const weapon =
    new THREE.Group();


const weaponBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.18,
            0.16,
            0.85
        ),
        new THREE.MeshStandardMaterial({
            color: 0x0e191e,
            metalness: 0.9,
            roughness: 0.18
        })
    );

weaponBody.position.z =
    -0.4;

weapon.add(
    weaponBody
);


const weaponGlow =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.07,
            0.07,
            0.55
        ),
        new THREE.MeshBasicMaterial({
            color: 0x58e9ff
        })
    );

weaponGlow.position.set(
    0,
    0.04,
    -0.67
);

weapon.add(
    weaponGlow
);


/*
    Loop / muzzle.
*/

const muzzle =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.06,
            0.06,
            0.2,
            10
        ),
        new THREE.MeshStandardMaterial({
            color: 0x263b40,
            metalness: 0.9,
            roughness: 0.2
        })
    );

muzzle.rotation.x =
    Math.PI / 2;

muzzle.position.z =
    -0.88;

weapon.add(
    muzzle
);


weapon.position.set(
    0.48,
    1.28,
    -0.45
);

weapon.rotation.x =
    -0.12;

playerModel.add(
    weapon
);


/* =========================================================
   ADD PLAYER
========================================================= */

scene.add(
    playerModel
);


/* =========================================================
   PLAYER SHADOW
========================================================= */

const playerShadow =
    new THREE.Mesh(
        new THREE.CircleGeometry(
            0.85,
            24
        ),
        new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.32,
            depthWrite: false
        })
    );

playerShadow.rotation.x =
    -Math.PI / 2;

playerShadow.position.y =
    0.035;

scene.add(
    playerShadow
);


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
                1.3 * scale,
                1
            ),
            new THREE.MeshStandardMaterial({
                color: 0x39474b,
                roughness: 0.95,
                metalness: 0.05
            })
        );

    rock.position.set(
        x,
        0.8 * scale,
        z
    );

    rock.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );

    rock.castShadow = true;
    rock.receiveShadow = true;

    scene.add(
        rock
    );

    obstacles.push({
        object: rock,
        radius: 1.25 * scale
    });

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
                0.25 * scale,
                0.4 * scale,
                3 * scale,
                8
            ),
            new THREE.MeshStandardMaterial({
                color: 0x392c23,
                roughness: 1
            })
        );

    trunk.position.y =
        1.5 * scale;

    trunk.castShadow = true;

    tree.add(
        trunk
    );


    const crown =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                1.8 * scale,
                4.4 * scale,
                9
            ),
            new THREE.MeshStandardMaterial({
                color: 0x153d38,
                roughness: 1
            })
        );

    crown.position.y =
        4 * scale;

    crown.castShadow = true;

    tree.add(
        crown
    );


    tree.position.set(
        x,
        0,
        z
    );

    scene.add(
        tree
    );


    obstacles.push({
        object: tree,
        radius: 1.5 * scale
    });

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
                color: 0x17272c,
                metalness: 0.6,
                roughness: 0.42
            })
        );

    body.position.y =
        height / 2;

    body.castShadow = true;
    body.receiveShadow = true;

    building.add(
        body
    );


    for (
        let y = 1.2;
        y < height;
        y += 1.4
    ) {

        const strip =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width + 0.04,
                    0.045,
                    0.04
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x58e9ff
                })
            );

        strip.position.set(
            0,
            y,
            depth / 2 + 0.03
        );

        building.add(
            strip
        );

    }


    building.position.set(
        x,
        0,
        z
    );

    scene.add(
        building
    );


    obstacles.push({
        object: building,
        radius:
            Math.max(
                width,
                depth
            ) * 0.65
    });

}


/* =========================================================
   GENERATE WORLD
========================================================= */

function generateWorld() {

    for (
        let i = 0;
        i < 65;
        i++
    ) {

        const x =
            (Math.random() - 0.5) * 230;

        const z =
            (Math.random() - 0.5) * 230;


        if (
            Math.abs(x) < 18 &&
            Math.abs(z - 18) < 18
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
        i < 38;
        i++
    ) {

        const x =
            (Math.random() - 0.5) * 230;

        const z =
            (Math.random() - 0.5) * 230;


        if (
            Math.abs(x) < 22 &&
            Math.abs(z - 18) < 22
        ) {
            continue;
        }


        createTree(
            x,
            z,
            0.65 +
            Math.random() * 0.7
        );

    }


    createBuilding(
        -30,
        -15,
        16,
        8,
        12
    );


    createBuilding(
        30,
        -40,
        12,
        6,
        18
    );


    createBuilding(
        35,
        30,
        18,
        10,
        11
    );


    createBuilding(
        -40,
        40,
        14,
        5,
        15
    );

}


generateWorld();


/* =========================================================
   SIGNAL TOWER
========================================================= */

const tower =
    new THREE.Group();


const towerBody =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.35,
            0.65,
            12,
            10
        ),
        new THREE.MeshStandardMaterial({
            color: 0x293b40,
            metalness: 0.8,
            roughness: 0.3
        })
    );

towerBody.position.y =
    6;

tower.add(
    towerBody
);


const towerOrb =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            0.7,
            20,
            20
        ),
        new THREE.MeshStandardMaterial({
            color: 0x58e9ff,
            emissive: 0x58e9ff,
            emissiveIntensity: 7
        })
    );

towerOrb.position.y =
    12;

tower.add(
    towerOrb
);


const towerLight =
    new THREE.PointLight(
        0x58e9ff,
        12,
        35
    );

towerLight.position.y =
    12;

tower.add(
    towerLight
);


tower.position.set(
    0,
    0,
    -80
);

scene.add(
    tower
);


/* =========================================================
   COLLISION
========================================================= */

function blocked(
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
   CAMERA COLLISION
========================================================= */

/*
    De camera wordt met een raycaster
    tussen de speler en de camera gecontroleerd.

    Daardoor gaat de camera niet zomaar
    dwars door een gebouw heen.
*/

const cameraRaycaster =
    new THREE.Raycaster();


function getSafeCameraPosition(
    desired,
    target
) {

    const direction =
        new THREE.Vector3()
            .subVectors(
                desired,
                target
            );


    const fullDistance =
        direction.length();


    direction.normalize();


    cameraRaycaster.set(
        target,
        direction
    );


    const cameraObjects =
        obstacles.map(
            item => item.object
        );


    const hits =
        cameraRaycaster.intersectObjects(
            cameraObjects,
            true
        );


    if (
        hits.length > 0
    ) {

        const hit =
            hits.find(
                item =>
                    item.distance > 0.3
            );


        if (
            hit &&
            hit.distance < fullDistance
        ) {

            return target.clone()
                .addScaledVector(
                    direction,
                    Math.max(
                        cameraSettings.minDistance,
                        hit.distance - 0.35
                    )
                );

        }

    }


    return desired;

}


/* =========================================================
   CAMERA UPDATE
========================================================= */

function updateThirdPersonCamera(
    delta
) {

    /*
        De camera kijkt naar de borst/hoofd
        van het personage.
    */

    cameraTarget.copy(
        player.position
    );

    cameraTarget.y +=
        cameraSettings.lookHeight;


    /*
        Horizontale afstand.
    */

    const horizontalDistance =
        Math.cos(
            cameraPitch
        ) *
        cameraSettings.distance;


    /*
        Camera achter de kijkrichting.
    */

    cameraDesired.x =
        cameraTarget.x +
        Math.sin(cameraYaw) *
        horizontalDistance;


    cameraDesired.z =
        cameraTarget.z +
        Math.cos(cameraYaw) *
        horizontalDistance;


    cameraDesired.y =
        cameraTarget.y +
        Math.sin(cameraPitch) *
        cameraSettings.distance +
        cameraSettings.height;


    /*
        Collision check.
    */

    const safePosition =
        getSafeCameraPosition(
            cameraDesired,
            cameraTarget
        );


    /*
        Smooth camera.
    */

    const smooth =
        1 -
        Math.exp(
            -cameraSettings.smooth *
            delta
        );


    camera.position.lerp(
        safePosition,
        smooth
    );


    /*
        Altijd naar speler kijken.
    */

    camera.lookAt(
        cameraTarget
    );

}


/* =========================================================
   CAMERA FORWARD VECTOR
========================================================= */

function getCameraForward() {

    const forward =
        new THREE.Vector3();

    camera.getWorldDirection(
        forward
    );

    forward.normalize();

    return forward;

}


/* =========================================================
   PLAYER MOVEMENT
========================================================= */

function updatePlayer(
    delta
) {

    const input =
        new THREE.Vector2(
            0,
            0
        );


    if (
        keys.KeyW
    ) {
        input.y += 1;
    }


    if (
        keys.KeyS
    ) {
        input.y -= 1;
    }


    if (
        keys.KeyA
    ) {
        input.x -= 1;
    }


    if (
        keys.KeyD
    ) {
        input.x += 1;
    }


    player.moving =
        input.lengthSq() > 0;


    if (
        player.moving
    ) {

        input.normalize();


        /*
            Beweging gebaseerd op cameraYaw,
            niet op de speler zelf.

            Daardoor voelt WASD zoals bij
            normale third-person games.
        */

        const forward =
            new THREE.Vector3(
                -Math.sin(cameraYaw),
                0,
                -Math.cos(cameraYaw)
            );


        const right =
            new THREE.Vector3(
                Math.cos(cameraYaw),
                0,
                -Math.sin(cameraYaw)
            );


        const movement =
            new THREE.Vector3();


        movement.addScaledVector(
            forward,
            input.y
        );


        movement.addScaledVector(
            right,
            input.x
        );


        movement.normalize();


        /*
            Sprint.
        */

        player.sprinting =
            (
                keys.ShiftLeft ||
                keys.ShiftRight
            ) &&
            player.energy > 0;


        const speed =
            player.sprinting
                ? player.sprintSpeed
                : player.speed;


        if (
            player.sprinting
        ) {

            player.energy -=
                delta * 18;

        } else {

            player.energy +=
                delta * 10;

        }


        player.energy =
            THREE.MathUtils.clamp(
                player.energy,
                0,
                100
            );


        /*
            Nieuwe positie.
        */

        const next =
            player.position.clone();


        next.addScaledVector(
            movement,
            speed * delta
        );


        /*
            Eerst X testen.
        */

        const xOnly =
            player.position.clone();

        xOnly.x =
            next.x;


        if (
            !blocked(
                xOnly,
                0.7
            )
        ) {

            player.position.x =
                next.x;

        }


        /*
            Daarna Z testen.
        */

        const zOnly =
            player.position.clone();

        zOnly.z =
            next.z;


        if (
            !blocked(
                zOnly,
                0.7
            )
        ) {

            player.position.z =
                next.z;

        }


        /*
            Personage draait naar de
            bewegingsrichting.
        */

        const targetRotation =
            Math.atan2(
                movement.x,
                movement.z
            );


        let rotationDifference =
            targetRotation -
            playerModel.rotation.y;


        rotationDifference =
            Math.atan2(
                Math.sin(
                    rotationDifference
                ),
                Math.cos(
                    rotationDifference
                )
            );


        playerModel.rotation.y +=
            rotationDifference *
            Math.min(
                1,
                delta * 10
            );


        /*
            Loopanimatie.
        */

        const walkSpeed =
            player.sprinting
                ? 0.017
                : 0.012;


        const walk =
            Math.sin(
                performance.now() *
                walkSpeed
            );


        leftLeg.rotation.x =
            walk * 0.45;

        rightLeg.rotation.x =
            -walk * 0.45;


        leftArm.rotation.x =
            -walk * 0.22;

        rightArm.rotation.x =
            walk * 0.22;

    } else {

        player.sprinting =
            false;

        player.energy +=
            delta * 8;

        player.energy =
            THREE.MathUtils.clamp(
                player.energy,
                0,
                100
            );

    }


    /*
        DASH
    */

    if (
        keys.Space &&
        player.dashCooldown <= 0 &&
        player.energy >= 30
    ) {

        const dashDirection =
            new THREE.Vector3(
                -Math.sin(cameraYaw),
                0,
                -Math.cos(cameraYaw)
            );


        const dashTarget =
            player.position.clone();


        dashTarget.addScaledVector(
            dashDirection,
            8
        );


        if (
            !blocked(
                dashTarget,
                0.7
            )
        ) {

            player.position.copy(
                dashTarget
            );

        }


        player.energy -=
            30;

        player.dashCooldown =
            0.8;


        keys.Space =
            false;

    }


    player.dashCooldown -=
        delta;


    player.position.y =
        0;


    playerModel.position.copy(
        player.position
    );


    playerShadow.position.set(
        player.position.x,
        0.035,
        player.position.z
    );

}


/* =========================================================
   ENEMIES
========================================================= */

function createEnemy(
    x,
    z,
    type
) {

    const enemy =
        new THREE.Group();


    let scale = 1;
    let color = 0x702d4d;


    if (
        type === "crawler"
    ) {

        scale = 0.7;
        color = 0x8a6240;

    }


    if (
        type === "guardian"
    ) {

        scale = 1.45;
        color = 0x4f3c79;

    }


    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                scale,
                16,
                12
            ),
            new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.55,
                metalness: 0.3
            })
        );


    body.scale.y =
        1.25;

    body.castShadow = true;

    enemy.add(
        body
    );


    const head =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.6 * scale,
                14,
                10
            ),
            new THREE.MeshStandardMaterial({
                color: 0x1e292d,
                metalness: 0.5,
                roughness: 0.4
            })
        );


    head.position.y =
        0.75 * scale;

    enemy.add(
        head
    );


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
        0.8 * scale,
        -0.5 * scale
    );

    enemy.add(
        eye
    );


    const ring =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                0.9 * scale,
                0.04,
                8,
                32
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff4f91
            })
        );


    ring.rotation.x =
        Math.PI / 2;

    ring.position.y =
        0.2 * scale;

    enemy.add(
        ring
    );


    enemy.position.set(
        x,
        scale,
        z
    );


    scene.add(
        enemy
    );


    enemies.push({

        object: enemy,

        type: type,

        health:
            type === "guardian"
                ? 120
                : type === "crawler"
                    ? 40
                    : 65,

        speed:
            type === "guardian"
                ? 1.1
                : type === "crawler"
                    ? 3.1
                    : 1.9,

        radius:
            0.8 * scale,

        dead: false

    });

}


/* =========================================================
   SPAWN ENEMIES
========================================================= */

function spawnEnemies() {

    for (
        let i = 0;
        i < 20;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const distance =
            35 +
            Math.random() * 80;


        const x =
            Math.sin(angle) *
            distance;


        const z =
            18 +
            Math.cos(angle) *
            distance;


        let type =
            "stalker";


        const random =
            Math.random();


        if (
            random > 0.88
        ) {

            type =
                "guardian";

        } else if (
            random > 0.58
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
   ENEMY AI
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
            distance < 110
        ) {

            direction.normalize();


            if (
                distance > 2.4
            ) {

                const next =
                    enemy.object.position.clone();


                next.addScaledVector(
                    direction,
                    enemy.speed * delta
                );


                if (
                    !blocked(
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
                            ? 13
                            : 7
                    ) * delta;

            }

        }


        const bob =
            Math.sin(
                performance.now() *
                0.003 +
                enemy.object.position.x
            ) * 0.04;


        enemy.object.position.y =
            (
                enemy.type === "guardian"
                    ? 1.45
                    : enemy.type === "crawler"
                        ? 0.7
                        : 1
            ) + bob;

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
   SHOOTING
========================================================= */

function shoot() {

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
        0.16;


    /*
        Camera kijkt naar het midden
        van het scherm.

        We gebruiken daarom een ray
        vanaf de camera.
    */

    const raycaster =
        new THREE.Raycaster();


    const center =
        new THREE.Vector2(
            0,
            0
        );


    raycaster.setFromCamera(
        center,
        camera
    );


    /*
        We bepalen eerst een doelpunt
        ver voor de camera.
    */

    const cameraDirection =
        getCameraForward();


    const target =
        camera.position.clone()
            .addScaledVector(
                cameraDirection,
                100
            );


    /*
        Wapenmond.
    */

    const muzzleWorld =
        new THREE.Vector3();


    muzzle.getWorldPosition(
        muzzleWorld
    );


    /*
        Richting van wapen naar doel.
    */

    const bulletDirection =
        target.clone()
            .sub(
                muzzleWorld
            )
            .normalize();


    /*
        Bullet.
    */

    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.075,
                8,
                8
            ),
            new THREE.MeshBasicMaterial({
                color: 0x7cf0ff
            })
        );


    bullet.position.copy(
        muzzleWorld
    );


    scene.add(
        bullet
    );


    bullets.push({

        object: bullet,

        velocity:
            bulletDirection
                .multiplyScalar(65),

        life: 2

    });


    /*
        Muzzle flash.
    */

    createMuzzleParticles(
        muzzleWorld
    );


    /*
        Wapen recoil.
    */

    weapon.rotation.x =
        -0.24;


    setTimeout(
        () => {

            weapon.rotation.x =
                -0.12;

        },
        70
    );


    updateHUD();

}


/* =========================================================
   MUZZLE PARTICLES
========================================================= */

function createMuzzleParticles(
    position
) {

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const particle =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.04,
                    5,
                    5
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x9cf7ff
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
                    (Math.random() - 0.5) * 4,
                    Math.random() * 3,
                    (Math.random() - 0.5) * 4
                ),

            life: 0.25

        });

    }

}


/* =========================================================
   BULLETS UPDATE
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
                enemy.radius + 0.4
            ) {

                enemy.health -=
                    34;


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
   HIT PARTICLES
========================================================= */

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
                    0.035,
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

            object: particle,

            velocity:
                new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 4,
                    (Math.random() - 0.5) * 5
                ),

            life: 0.35

        });

    }

}


/* =========================================================
   PARTICLES UPDATE
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
            6 * delta;


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


    updateHUD();

}


/* =========================================================
   RELOAD
========================================================= */

function reload() {

    player.ammo =
        player.maxAmmo;

    updateHUD();

}


/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    healthBar.style.width =
        `${player.health}%`;


    energyBar.style.width =
        `${player.energy}%`;


    ammoText.textContent =
        player.ammo;


    killsText.textContent =
        "KILLS " +
        String(
            player.kills
        ).padStart(
            2,
            "0"
        );


    creditsText.textContent =
        "CREDITS " +
        String(
            player.credits
        ).padStart(
            3,
            "0"
        );


    if (
        player.position.z < -45
    ) {

        zoneText.textContent =
            "SIGNAL ZONE";

        objectiveText.textContent =
            "REACH THE SIGNAL";

    } else if (
        player.position.z < 10
    ) {

        zoneText.textContent =
            "DEAD ZONE";

        objectiveText.textContent =
            "SEARCH FOR THE SIGNAL";

    } else {

        zoneText.textContent =
            "OUTER SECTOR";

        objectiveText.textContent =
            "LOCATE THE SIGNAL";

    }

}


/* =========================================================
   NEW GAME
========================================================= */

function newGame() {

    player.position.set(
        0,
        0,
        18
    );


    player.health =
        100;

    player.energy =
        100;

    player.ammo =
        12;

    player.kills =
        0;

    player.credits =
        0;


    cameraYaw =
        0;

    cameraPitch =
        0.22;


    /*
        Oude enemies verwijderen.
    */

    enemies.forEach(
        enemy => {

            scene.remove(
                enemy.object
            );

        }
    );


    enemies.length =
        0;


    /*
        Oude bullets verwijderen.
    */

    bullets.forEach(
        bullet => {

            scene.remove(
                bullet.object
            );

        }
    );


    bullets.length =
        0;


    spawnEnemies();


    menu.style.display =
        "none";


    hud.style.display =
        "block";


    pause.style.display =
        "none";


    gameRunning =
        true;


    paused =
        false;


    updateHUD();


    /*
        Camera activeren.
    */

    canvas.requestPointerLock();

}


/* =========================================================
   SAVE
========================================================= */

function saveGame() {

    const saveData = {

        x:
            player.position.x,

        z:
            player.position.z,

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
        "echobound_third_person_save",
        JSON.stringify(
            saveData
        )
    );

}


/* =========================================================
   LOAD
========================================================= */

function loadGame() {

    const saved =
        localStorage.getItem(
            "echobound_third_person_save"
        );


    if (
        !saved
    ) {

        alert(
            "Er is nog geen opgeslagen run."
        );

        return;

    }


    try {

        const data =
            JSON.parse(
                saved
            );


        player.position.set(
            data.x ?? 0,
            0,
            data.z ?? 18
        );


        player.health =
            data.health ?? 100;

        player.energy =
            data.energy ?? 100;

        player.ammo =
            data.ammo ?? 12;

        player.kills =
            data.kills ?? 0;

        player.credits =
            data.credits ?? 0;


        cameraYaw =
            data.cameraYaw ?? 0;

        cameraPitch =
            data.cameraPitch ?? 0.22;


        enemies.forEach(
            enemy => {

                scene.remove(
                    enemy.object
                );

            }
        );


        enemies.length =
            0;


        spawnEnemies();


        menu.style.display =
            "none";


        hud.style.display =
            "block";


        pause.style.display =
            "none";


        gameRunning =
            true;


        paused =
            false;


        updateHUD();


        canvas.requestPointerLock();

    } catch {

        alert(
            "De save kon niet worden geladen."
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


    pause.style.display =
        paused
            ? "flex"
            : "none";


    if (
        paused
    ) {

        document.exitPointerLock();

    } else {

        canvas.requestPointerLock();

    }

}


/* =========================================================
   PAUSE BUTTONS
========================================================= */

document
    .getElementById("resume")
    .addEventListener(
        "click",
        () => {

            paused =
                false;

            pause.style.display =
                "none";

            canvas.requestPointerLock();

        }
    );


document
    .getElementById("save")
    .addEventListener(
        "click",
        () => {

            saveGame();

        }
    );


document
    .getElementById("quit")
    .addEventListener(
        "click",
        () => {

            saveGame();


            gameRunning =
                false;


            paused =
                false;


            pause.style.display =
                "none";


            hud.style.display =
                "none";


            menu.style.display =
                "flex";


            document.exitPointerLock();

        }
    );


/* =========================================================
   MENU BUTTONS
========================================================= */

document
    .getElementById("newGame")
    .addEventListener(
        "click",
        newGame
    );


document
    .getElementById("loadGame")
    .addEventListener(
        "click",
        loadGame
    );


document
    .getElementById("controlsButton")
    .addEventListener(
        "click",
        () => {

            alert(
                "ECHOBOUND CONTROLS\n\n" +
                "W A S D  = bewegen\n" +
                "MUIS     = camera draaien\n" +
                "KLIK     = schieten\n" +
                "R        = herladen\n" +
                "SHIFT    = sprint\n" +
                "SPACE    = dash\n" +
                "M        = map\n" +
                "ESC      = pauze"
            );

        }
    );


document
    .getElementById("achievementsButton")
    .addEventListener(
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


/* =========================================================
   ACHIEVEMENT
========================================================= */

function showAchievement(
    name
) {

    const nameElement =
        document.getElementById(
            "achievementName"
        );


    nameElement.textContent =
        name;


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


    map.style.display =
        "flex";


    document.exitPointerLock();


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


    /*
        Grid.
    */

    ctx.strokeStyle =
        "rgba(88,233,255,.14)";


    ctx.lineWidth =
        1;


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


    /*
        Player.
    */

    const playerX =
        450 +
        player.position.x *
        2.3;


    const playerY =
        260 +
        player.position.z *
        2.3;


    ctx.fillStyle =
        "#58e9ff";


    ctx.beginPath();

    ctx.arc(
        playerX,
        playerY,
        7,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /*
        Enemies.
    */

    ctx.fillStyle =
        "#ff4f91";


    enemies.forEach(
        enemy => {

            if (
                enemy.dead
            ) {
                return;
            }


            const x =
                450 +
                enemy.object.position.x *
                2.3;


            const y =
                260 +
                enemy.object.position.z *
                2.3;


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
    );


    /*
        Signal.
    */

    ctx.strokeStyle =
        "#58e9ff";

    ctx.lineWidth =
        3;


    ctx.beginPath();

    ctx.arc(
        450,
        260 - 80 * 2.3,
        14,
        0,
        Math.PI * 2
    );

    ctx.stroke();

}


/* =========================================================
   CLOSE MAP
========================================================= */

document
    .getElementById("closeMap")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("map")
                .style.display =
                "none";


            if (
                gameRunning &&
                !paused
            ) {

                canvas.requestPointerLock();

            }

        }
    );


/* =========================================================
   GAME OVER
========================================================= */

function endRun() {

    gameRunning =
        false;


    document.exitPointerLock();


    saveGame();


    hud.style.display =
        "none";


    menu.style.display =
        "flex";


    alert(
        "RUN ENDED\n\n" +
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
        Signal tower animation.
    */

    towerOrb.rotation.y +=
        delta * 1.5;


    towerLight.intensity =
        9 +
        Math.sin(
            performance.now() *
            0.004
        ) * 3;


    /*
        GAME.
    */

    if (
        gameRunning &&
        !paused
    ) {

        player.fireCooldown -=
            delta;


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


        updateThirdPersonCamera(
            delta
        );


        updateHUD();

    } else {

        /*
            Camera blijft ook in menu
            netjes staan.
        */

        updateThirdPersonCamera(
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
