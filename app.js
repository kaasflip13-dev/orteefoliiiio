import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

"use strict";

/*
============================================================
 ECHOBOUND — THE LOST SIGNAL
 ULTRA VISUAL EDITION
============================================================

 WASD       = rijden
 A / D      = draaien
 MUIS       = richten
 LINKERKLIK = schieten
 R          = herladen
 ESC        = pauze

 De camera blijft altijd achter de tank.
 De muis bestuurt alleen de turret.
============================================================
*/


/* =========================================================
   CONFIG
========================================================= */

const WORLD_SIZE = 420;
const HALF_WORLD = WORLD_SIZE / 2;

const PLAYER_MAX_HEALTH = 100;
const PLAYER_MAX_ENERGY = 100;

const TANK_SPEED = 17;
const TANK_REVERSE_SPEED = 9;
const TANK_TURN_SPEED = 1.9;

const CAMERA_DISTANCE = 18;
const CAMERA_HEIGHT = 8.5;
const CAMERA_LOOK_HEIGHT = 2.5;

const BULLET_SPEED = 105;
const BULLET_DAMAGE = 35;

const FIRE_COOLDOWN = 0.22;

const START_ENEMIES = 12;

const SAVE_KEY = "echobound_ultra_save_v1";


/* =========================================================
   GLOBALS
========================================================= */

let scene;
let camera;
let renderer;
let clock;

let player;
let turret;
let muzzle;

let gameState = "menu";

let playerHealth = PLAYER_MAX_HEALTH;
let playerEnergy = PLAYER_MAX_ENERGY;

let credits = 100;
let kills = 0;

let ammo = 12;
let maxAmmo = 12;

let ammoUpgrade = 0;

let fireTimer = 0;
let reloadTimer = 0;

let totalPlayTime = 0;

let enemies = [];
let bullets = [];
let particles = [];
let buildings = [];
let resources = [];
let decorations = [];

let keys = {};

let mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    down: false
};

let achievements = {
    firstShot: false,
    firstKill: false,
    fiveKills: false,
    explorer: false,
    survivor: false
};

let worldTime = 0;


/* =========================================================
   DOM
========================================================= */

const canvas = document.getElementById("game");

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");

const newRunBtn = document.getElementById("newRunBtn");
const shopBtn = document.getElementById("shopBtn");
const loadBtn = document.getElementById("loadBtn");
const achievementsBtn =
    document.getElementById("achievementsBtn");
const controlsBtn =
    document.getElementById("controlsBtn");

const pauseBtn =
    document.getElementById("pauseBtn");

const mapBtn =
    document.getElementById("mapBtn");

const healthFill =
    document.getElementById("healthFill");

const energyFill =
    document.getElementById("energyFill");

const ammoText =
    document.getElementById("ammoText");

const killsText =
    document.getElementById("killsText");

const creditsText =
    document.getElementById("creditsText");


/* =========================================================
   RENDERER
========================================================= */

renderer = new THREE.WebGLRenderer({
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
renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.3;


/* =========================================================
   SCENE
========================================================= */

scene = new THREE.Scene();

scene.background =
    new THREE.Color(0x061014);

scene.fog =
    new THREE.FogExp2(
        0x071216,
        0.0029
    );


/* =========================================================
   CAMERA
========================================================= */

camera =
    new THREE.PerspectiveCamera(
        60,
        window.innerWidth /
        window.innerHeight,
        0.1,
        1000
    );


camera.position.set(
    0,
    CAMERA_HEIGHT,
    CAMERA_DISTANCE
);


/* =========================================================
   LIGHTS
========================================================= */

const hemisphere =
    new THREE.HemisphereLight(
        0x8eeaff,
        0x111813,
        2.2
    );

scene.add(hemisphere);


const sun =
    new THREE.DirectionalLight(
        0xe9ffff,
        4.2
    );

sun.position.set(
    -110,
    150,
    80
);

sun.castShadow = true;

sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;

sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -260;

sun.shadow.camera.near = 1;
sun.shadow.camera.far = 500;

scene.add(sun);


/* =========================================================
   MOON LIGHT
========================================================= */

const moon =
    new THREE.DirectionalLight(
        0x396dff,
        0.8
    );

moon.position.set(
    100,
    80,
    -100
);

scene.add(moon);


/* =========================================================
   MATERIALS
========================================================= */

function material(
    color,
    roughness = 0.7,
    metalness = 0.1
) {

    return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness
    });

}


function glowing(
    color,
    intensity = 3
) {

    return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: intensity,
        roughness: 0.25,
        metalness: 0.2
    });

}


/* =========================================================
   GROUND
========================================================= */

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x243a35,
        roughness: 0.98,
        metalness: 0.02
    });


const ground =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            WORLD_SIZE,
            WORLD_SIZE,
            80,
            80
        ),
        groundMaterial
    );


ground.rotation.x =
    -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);


/* =========================================================
   GROUND GRID
========================================================= */

const grid =
    new THREE.GridHelper(
        WORLD_SIZE,
        42,
        0x3e7771,
        0x203c3a
    );

grid.position.y = 0.02;

grid.material.transparent = true;
grid.material.opacity = 0.13;

scene.add(grid);


/* =========================================================
   ROADS
========================================================= */

function createRoad(
    x,
    z,
    width,
    length,
    rotation = 0
) {

    const road =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                width,
                length
            ),
            material(
                0x172325,
                0.95,
                0.02
            )
        );

    road.rotation.x =
        -Math.PI / 2;

    road.rotation.z =
        rotation;

    road.position.set(
        x,
        0.035,
        z
    );

    road.receiveShadow = true;

    scene.add(road);


    /* center line */

    for (
        let i = -length / 2;
        i < length / 2;
        i += 8
    ) {

        const line =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    0.25,
                    3.5
                ),
                glowing(
                    0xb2a86a,
                    0.5
                )
            );

        line.rotation.x =
            -Math.PI / 2;

        line.rotation.z =
            rotation;

        const local =
            new THREE.Vector3(
                0,
                0.045,
                i
            );

        local.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            rotation
        );

        line.position.set(
            x + local.x,
            0.045,
            z + local.z
        );

        scene.add(line);

    }

}


createRoad(
    0,
    0,
    15,
    WORLD_SIZE,
    0
);

createRoad(
    0,
    0,
    WORLD_SIZE,
    15,
    0
);


/* =========================================================
   BUILDINGS
========================================================= */

function createBuilding(
    x,
    z,
    width,
    height,
    depth,
    color
) {

    const group =
        new THREE.Group();

    group.position.set(
        x,
        height / 2,
        z
    );


    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            material(
                color,
                0.65,
                0.3
            )
        );


    body.castShadow = true;
    body.receiveShadow = true;

    group.add(body);


    /* roof */

    const roof =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width + 1,
                0.5,
                depth + 1
            ),
            material(
                0x131f21,
                0.55,
                0.7
            )
        );

    roof.position.y =
        height / 2 + 0.2;

    roof.castShadow = true;

    group.add(roof);


    /* windows */

    const windowMat =
        glowing(
            0x55dfe4,
            2.5
        );


    const cols =
        Math.max(
            2,
            Math.floor(width / 3.2)
        );

    const rows =
        Math.max(
            1,
            Math.floor(height / 3)
        );


    for (
        let side = 0;
        side < 2;
        side++
    ) {

        for (
            let r = 0;
            r < rows;
            r++
        ) {

            for (
                let c = 0;
                c < cols;
                c++
            ) {

                if (
                    Math.random() < 0.2
                ) {
                    continue;
                }


                const windowMesh =
                    new THREE.Mesh(
                        new THREE.BoxGeometry(
                            0.8,
                            0.65,
                            0.08
                        ),
                        windowMat
                    );


                const px =
                    -width / 2 +
                    1.5 +
                    c * 3;


                const py =
                    -height / 2 +
                    1.7 +
                    r * 3;


                windowMesh.position.set(
                    px,
                    py,
                    side === 0
                        ? -depth / 2 - 0.06
                        : depth / 2 + 0.06
                );


                if (side === 1) {

                    windowMesh.rotation.y =
                        Math.PI;

                }


                group.add(
                    windowMesh
                );

            }

        }

    }


    /* rooftop antenna */

    const antenna =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.06,
                0.06,
                4,
                8
            ),
            material(
                0x899b9d,
                0.5,
                0.8
            )
        );

    antenna.position.y =
        height / 2 + 2;

    group.add(antenna);


    const antennaLight =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.18,
                10,
                10
            ),
            glowing(
                0xff3d51,
                4
            )
        );

    antennaLight.position.y =
        height / 2 + 4;

    group.add(
        antennaLight
    );


    scene.add(group);


    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: height,
        mesh: group
    });

}


/* =========================================================
   CITY
========================================================= */

createBuilding(
    -70,
    -75,
    34,
    15,
    30,
    0x34484b
);

createBuilding(
    -22,
    -82,
    27,
    24,
    24,
    0x3c4d50
);

createBuilding(
    38,
    -75,
    45,
    14,
    27,
    0x2b3e41
);

createBuilding(
    88,
    -42,
    34,
    19,
    30,
    0x35474b
);

createBuilding(
    -95,
    -15,
    32,
    13,
    27,
    0x293b3f
);

createBuilding(
    83,
    22,
    39,
    23,
    31,
    0x35494d
);

createBuilding(
    -82,
    45,
    37,
    17,
    31,
    0x304448
);

createBuilding(
    -35,
    70,
    45,
    14,
    30,
    0x2c4145
);

createBuilding(
    38,
    73,
    48,
    18,
    34,
    0x394c4e
);

createBuilding(
    100,
    88,
    29,
    21,
    27,
    0x2c4145
);


/* =========================================================
   ROCK
========================================================= */

function createRock(
    x,
    z,
    scale = 1
) {

    const rock =
        new THREE.Mesh(
            new THREE.DodecahedronGeometry(
                1.5,
                1
            ),
            material(
                0x3b4846,
                0.92,
                0.08
            )
        );

    rock.position.set(
        x,
        0.9 * scale,
        z
    );

    rock.scale.setScalar(
        scale
    );

    rock.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );

    rock.castShadow = true;

    scene.add(rock);

}


/* =========================================================
   ROCKS
========================================================= */

for (
    let i = 0;
    i < 120;
    i++
) {

    const x =
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 5,
            HALF_WORLD - 5
        );

    const z =
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 5,
            HALF_WORLD - 5
        );


    if (
        Math.abs(x) < 18 &&
        Math.abs(z) < 18
    ) {
        continue;
    }


    createRock(
        x,
        z,
        THREE.MathUtils.randFloat(
            0.4,
            1.4
        )
    );

}


/* =========================================================
   TREES
========================================================= */

function createTree(
    x,
    z,
    scale = 1
) {

    const tree =
        new THREE.Group();

    tree.position.set(
        x,
        0,
        z
    );

    tree.scale.setScalar(
        scale
    );


    const trunk =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.45,
                0.7,
                4,
                8
            ),
            material(
                0x4b382d,
                0.95,
                0
            )
        );

    trunk.position.y = 2;

    trunk.castShadow = true;

    tree.add(trunk);


    const green =
        material(
            0x153a32,
            0.95,
            0
        );


    const crown1 =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                3.2,
                5.5,
                9
            ),
            green
        );

    crown1.position.y = 5;

    crown1.castShadow = true;

    tree.add(crown1);


    const crown2 =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                2.5,
                4.5,
                9
            ),
            material(
                0x205247,
                0.95,
                0
            )
        );

    crown2.position.y = 7.5;

    crown2.castShadow = true;

    tree.add(crown2);


    scene.add(tree);

}


for (
    let i = 0;
    i < 95;
    i++
) {

    const x =
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 8,
            HALF_WORLD - 8
        );

    const z =
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 8,
            HALF_WORLD - 8
        );


    if (
        Math.abs(x) < 25 &&
        Math.abs(z) < 25
    ) {
        continue;
    }


    createTree(
        x,
        z,
        THREE.MathUtils.randFloat(
            0.7,
            1.35
        )
    );

}


/* =========================================================
   STREET LIGHTS
========================================================= */

function createStreetLight(
    x,
    z
) {

    const group =
        new THREE.Group();


    group.position.set(
        x,
        0,
        z
    );


    const pole =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.12,
                0.18,
                6,
                8
            ),
            material(
                0x263537,
                0.45,
                0.75
            )
        );

    pole.position.y = 3;

    pole.castShadow = true;

    group.add(pole);


    const lamp =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.32,
                12,
                12
            ),
            glowing(
                0x65fff0,
                5
            )
        );

    lamp.position.y = 6;

    group.add(lamp);


    const light =
        new THREE.PointLight(
            0x55fff0,
            5,
            18
        );

    light.position.y = 5.7;

    group.add(light);


    scene.add(group);

}


for (
    let x = -180;
    x <= 180;
    x += 30
) {

    createStreetLight(
        x,
        10
    );

    createStreetLight(
        x,
        -10
    );

}


/* =========================================================
   RESOURCES
========================================================= */

function createResource(
    x,
    z
) {

    const group =
        new THREE.Group();

    group.position.set(
        x,
        0,
        z
    );


    const crystal =
        new THREE.Mesh(
            new THREE.OctahedronGeometry(
                1.15,
                1
            ),
            glowing(
                0x45d9ff,
                3
            )
        );

    crystal.position.y = 1.2;

    crystal.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );

    crystal.castShadow = true;

    group.add(crystal);


    const light =
        new THREE.PointLight(
            0x40dfff,
            2,
            10
        );

    light.position.y = 1.2;

    group.add(light);


    scene.add(group);


    resources.push({
        group,
        phase: Math.random() * 10
    });

}


for (
    let i = 0;
    i < 50;
    i++
) {

    createResource(
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 15,
            HALF_WORLD - 15
        ),
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 15,
            HALF_WORLD - 15
        )
    );

}


/* =========================================================
   TANK
========================================================= */

function createTank() {

    const tank =
        new THREE.Group();


    /* main hull */

    const hull =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                5.8,
                1.45,
                7.4
            ),
            material(
                0x3c514d,
                0.38,
                0.78
            )
        );

    hull.position.y = 1.25;

    hull.castShadow = true;
    hull.receiveShadow = true;

    tank.add(hull);


    /* sloped front */

    const front =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                5.4,
                1.5,
                1.5
            ),
            material(
                0x50635e,
                0.38,
                0.8
            )
        );

    front.position.set(
        0,
        1.35,
        -3.85
    );

    front.rotation.x =
        -0.12;

    front.castShadow = true;

    tank.add(front);


    /* upper armor */

    const upper =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                4.2,
                1.35,
                4.4
            ),
            material(
                0x465c57,
                0.36,
                0.82
            )
        );

    upper.position.y = 2.25;

    upper.castShadow = true;

    tank.add(upper);


    /* side armor */

    for (
        const side of [-1, 1]
    ) {

        const armor =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.4,
                    1.4,
                    5.7
                ),
                material(
                    0x283a37,
                    0.4,
                    0.85
                )
            );

        armor.position.set(
            side * 3.05,
            1.5,
            0
        );

        armor.castShadow = true;

        tank.add(armor);

    }


    /* tracks */

    const trackMaterial =
        material(
            0x12191a,
            0.9,
            0.7
        );


    for (
        const side of [-1, 1]
    ) {

        const track =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.25,
                    1.7,
                    7.8
                ),
                trackMaterial
            );

        track.position.set(
            side * 3.1,
            1.05,
            0
        );

        track.castShadow = true;

        tank.add(track);


        for (
            let i = -2;
            i <= 2;
            i++
        ) {

            const wheel =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.67,
                        0.67,
                        0.45,
                        18
                    ),
                    material(
                        0x283130,
                        0.78,
                        0.75
                    )
                );

            wheel.rotation.z =
                Math.PI / 2;

            wheel.position.set(
                side * 3.15,
                0.95,
                i * 1.45
            );

            wheel.castShadow = true;

            tank.add(wheel);

        }

    }


    /* turret base */

    const turretBase =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                2.15,
                2.4,
                0.7,
                32
            ),
            material(
                0x263b38,
                0.34,
                0.86
            )
        );

    turretBase.position.y = 3.05;

    turretBase.castShadow = true;

    tank.add(turretBase);


    /* turret */

    turret =
        new THREE.Group();

    turret.position.y =
        3.35;

    tank.add(turret);


    /* turret armor */

    const turretBody =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                3.25,
                1.25,
                3.5
            ),
            material(
                0x405650,
                0.3,
                0.9
            )
        );

    turretBody.castShadow = true;

    turret.add(turretBody);


    /* turret top */

    const turretTop =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.7,
                0.35,
                2.7
            ),
            material(
                0x293e3a,
                0.32,
                0.9
            )
        );

    turretTop.position.y =
        0.78;

    turret.add(turretTop);


    /* cannon */

    const cannon =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.27,
                0.38,
                7.2,
                20
            ),
            material(
                0x151e1d,
                0.25,
                0.95
            )
        );

    cannon.rotation.x =
        Math.PI / 2;

    cannon.position.z =
        -4.2;

    cannon.castShadow = true;

    turret.add(cannon);


    /* cannon rings */

    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const ring =
            new THREE.Mesh(
                new THREE.TorusGeometry(
                    0.4,
                    0.08,
                    8,
                    20
                ),
                material(
                    0x596b66,
                    0.25,
                    0.9
                )
            );

        ring.rotation.x =
            Math.PI / 2;

        ring.position.z =
            -1.5 -
            i * 1.7;

        turret.add(ring);

    }


    /* muzzle */

    muzzle =
        new THREE.Object3D();

    muzzle.position.set(
        0,
        0,
        -8
    );

    turret.add(muzzle);


    /* muzzle glow */

    const muzzleGlow =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.35,
                12,
                12
            ),
            glowing(
                0x6afff2,
                6
            )
        );

    muzzleGlow.position.copy(
        muzzle.position
    );

    muzzleGlow.visible = false;

    muzzle.add(
        muzzleGlow
    );


    /* antenna */

    const antenna =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.045,
                0.045,
                2.2,
                8
            ),
            material(
                0x8b9996,
                0.45,
                0.8
            )
        );

    antenna.position.set(
        1.25,
        1.1,
        0.7
    );

    turret.add(antenna);


    const redLight =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.14,
                12,
                12
            ),
            glowing(
                0xff304d,
                6
            )
        );

    redLight.position.set(
        1.25,
        2.2,
        0.7
    );

    turret.add(redLight);


    scene.add(tank);

    return tank;

}


player =
    createTank();


/* =========================================================
   MONSTER CREATION
========================================================= */

function createMonster(
    x,
    z,
    type = "brute"
) {

    const monster =
        new THREE.Group();


    monster.position.set(
        x,
        0,
        z
    );


    let health = 100;
    let speed = 4;
    let scale = 1;


    if (type === "crawler") {

        health = 65;
        speed = 6.2;
        scale = 0.78;

    }


    if (type === "brute") {

        health = 130;
        speed = 3.3;
        scale = 1.25;

    }


    if (type === "stalker") {

        health = 85;
        speed = 5;
        scale = 1;

    }


    monster.scale.setScalar(
        scale
    );


    /* body */

    let bodyColor =
        0x7d24c9;


    if (
        type === "brute"
    ) {

        bodyColor =
            0x9228bb;

    }


    if (
        type === "crawler"
    ) {

        bodyColor =
            0x4d2bc7;

    }


    if (
        type === "stalker"
    ) {

        bodyColor =
            0x7d20aa;

    }


    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                2.15,
                24,
                18
            ),
            glowing(
                bodyColor,
                2.8
            )
        );


    body.position.y =
        type === "crawler"
            ? 1.4
            : 2.4;


    body.scale.y =
        type === "crawler"
            ? 0.65
            : 1.15;


    body.castShadow = true;

    monster.add(body);


    /* armor spikes */

    const spikeMaterial =
        glowing(
            0xb13bff,
            3.5
        );


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const spike =
            new THREE.Mesh(
                new THREE.ConeGeometry(
                    0.32,
                    1.5,
                    8
                ),
                spikeMaterial
            );


        const angle =
            i / 6 *
            Math.PI * 2;


        spike.position.set(
            Math.cos(angle) * 1.8,
            2.4,
            Math.sin(angle) * 1.8
        );


        spike.rotation.z =
            Math.cos(angle) *
            0.7;


        spike.rotation.x =
            -Math.sin(angle) *
            0.7;


        monster.add(spike);

    }


    /* eyes */

    const eyeMaterial =
        glowing(
            0xff253f,
            8
        );


    for (
        const side of [-1, 1]
    ) {

        const eye =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.42,
                    16,
                    16
                ),
                eyeMaterial
            );


        eye.position.set(
            side * 0.72,
            2.65,
            -1.9
        );


        monster.add(eye);

    }


    /* mouth */

    const mouth =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                0.6,
                0.12,
                8,
                16,
                Math.PI
            ),
            glowing(
                0xff3151,
                5
            )
        );


    mouth.rotation.x =
        Math.PI / 2;

    mouth.position.set(
        0,
        1.9,
        -1.95
    );


    monster.add(mouth);


    /* energy core */

    const core =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.55,
                16,
                16
            ),
            glowing(
                0xff72e7,
                7
            )
        );


    core.position.set(
        0,
        2.2,
        1.8
    );


    monster.add(core);


    /* glow light */

    const light =
        new THREE.PointLight(
            0xb52cff,
            4,
            15
        );


    light.position.y = 2;

    monster.add(light);


    /* health bar */

    const healthGroup =
        new THREE.Group();

    healthGroup.position.y =
        5.1;

    monster.add(
        healthGroup
    );


    const barBack =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                3.8,
                0.35
            ),
            material(
                0x100d14,
                1,
                0
            )
        );


    healthGroup.add(
        barBack
    );


    const barFill =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                3.55,
                0.2
            ),
            glowing(
                0xff304f,
                3
            )
        );


    barFill.position.z =
        0.02;

    healthGroup.add(
        barFill
    );


    scene.add(
        monster
    );


    const enemy = {

        group: monster,

        body,

        health,

        maxHealth: health,

        speed,

        type,

        attackTimer:
            THREE.MathUtils.randFloat(
                0.5,
                2
            ),

        bar: barFill,

        phase:
            Math.random() * 10

    };


    enemies.push(
        enemy
    );

}


/* =========================================================
   SPAWN MONSTERS NEAR PLAYER
========================================================= */

function spawnMonsterNearPlayer() {

    let x;
    let z;

    let tries = 0;


    do {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const distance =
            THREE.MathUtils.randFloat(
                35,
                65
            );


        x =
            player.position.x +
            Math.cos(angle) *
            distance;


        z =
            player.position.z +
            Math.sin(angle) *
            distance;


        tries++;

    } while (
        (
            Math.abs(x) >
                HALF_WORLD - 10 ||
            Math.abs(z) >
                HALF_WORLD - 10
        ) &&
        tries < 50
    );


    const random =
        Math.random();


    let type = "stalker";


    if (
        random < 0.35
    ) {

        type = "crawler";

    } else if (
        random < 0.7
    ) {

        type = "stalker";

    } else {

        type = "brute";

    }


    createMonster(
        x,
        z,
        type
    );

}


/* =========================================================
   START MONSTERS
========================================================= */

for (
    let i = 0;
    i < START_ENEMIES;
    i++
) {

    spawnMonsterNearPlayer();

}


/* =========================================================
   INPUT
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;


        if (
            event.code === "Escape"
        ) {

            if (
                gameState === "playing"
            ) {

                pauseGame();

            } else if (
                gameState === "paused"
            ) {

                resumeGame();

            }

        }


        if (
            event.code === "KeyR"
        ) {

            if (
                gameState === "playing"
            ) {

                reloadTank();

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


window.addEventListener(
    "mousemove",
    event => {

        mouse.x =
            event.clientX;

        mouse.y =
            event.clientY;


        if (
            gameState === "playing"
        ) {

            updateTurretAim();

        }

    }
);


window.addEventListener(
    "mousedown",
    event => {

        if (
            event.button === 0
        ) {

            mouse.down = true;

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

            mouse.down = false;

        }

    }
);


/* =========================================================
   BUTTONS
========================================================= */

newRunBtn.onclick =
    startNewGame;

shopBtn.onclick =
    openShop;

loadBtn.onclick =
    loadGame;

achievementsBtn.onclick =
    showAchievements;

controlsBtn.onclick =
    showControls;

pauseBtn.onclick =
    pauseGame;

mapBtn.onclick =
    showMap;


/* =========================================================
   RAYCAST
========================================================= */

const raycaster =
    new THREE.Raycaster();

const mouseVector =
    new THREE.Vector2();


function getMouseWorld() {

    mouseVector.x =
        mouse.x /
        window.innerWidth *
        2 - 1;

    mouseVector.y =
        -(mouse.y /
        window.innerHeight *
        2 - 1);


    raycaster.setFromCamera(
        mouseVector,
        camera
    );


    const plane =
        new THREE.Plane(
            new THREE.Vector3(
                0,
                1,
                0
            ),
            0
        );


    const result =
        new THREE.Vector3();


    raycaster.ray.intersectPlane(
        plane,
        result
    );


    return result;

}


/* =========================================================
   AIM
========================================================= */

function updateTurretAim() {

    if (!turret) {
        return;
    }


    const target =
        getMouseWorld();


    const dx =
        target.x -
        player.position.x;


    const dz =
        target.z -
        player.position.z;


    turret.rotation.y =
        Math.atan2(
            -dx,
            -dz
        ) -
        player.rotation.y;

}


/* =========================================================
   PLAYER MOVEMENT
========================================================= */

function updatePlayer(dt) {

    let forward = 0;
    let turn = 0;


    if (
        keys["KeyW"] ||
        keys["ArrowUp"]
    ) {

        forward++;

    }


    if (
        keys["KeyS"] ||
        keys["ArrowDown"]
    ) {

        forward--;

    }


    if (
        keys["KeyA"] ||
        keys["ArrowLeft"]
    ) {

        turn++;

    }


    if (
        keys["KeyD"] ||
        keys["ArrowRight"]
    ) {

        turn--;

    }


    if (
        turn !== 0
    ) {

        player.rotation.y +=
            turn *
            TANK_TURN_SPEED *
            dt *
            (forward < 0
                ? -1
                : 1);

    }


    if (
        forward !== 0
    ) {

        const speed =
            forward > 0
                ? TANK_SPEED
                : TANK_REVERSE_SPEED;


        const direction =
            new THREE.Vector3(
                0,
                0,
                -1
            );


        direction.applyQuaternion(
            player.quaternion
        );


        const next =
            player.position.clone();


        next.add(
            direction.multiplyScalar(
                speed *
                forward *
                dt
            )
        );


        if (
            !buildingCollision(
                next,
                3.5
            )
        ) {

            player.position.copy(
                next
            );

        }

    }


    player.position.x =
        THREE.MathUtils.clamp(
            player.position.x,
            -HALF_WORLD + 6,
            HALF_WORLD - 6
        );


    player.position.z =
        THREE.MathUtils.clamp(
            player.position.z,
            -HALF_WORLD + 6,
            HALF_WORLD - 6
        );


    playerEnergy =
        Math.min(
            PLAYER_MAX_ENERGY,
            playerEnergy +
            7 * dt
        );

}


/* =========================================================
   BUILDING COLLISION
========================================================= */

function buildingCollision(
    position,
    radius
) {

    for (
        const b of buildings
    ) {

        const closestX =
            THREE.MathUtils.clamp(
                position.x,
                b.x - b.w / 2,
                b.x + b.w / 2
            );


        const closestZ =
            THREE.MathUtils.clamp(
                position.z,
                b.z - b.d / 2,
                b.z + b.d / 2
            );


        const dx =
            position.x -
            closestX;


        const dz =
            position.z -
            closestZ;


        if (
            dx * dx +
            dz * dz <
            radius * radius
        ) {

            return true;

        }

    }


    return false;

}


/* =========================================================
   SHOOT
========================================================= */

function shoot() {

    if (
        gameState !== "playing"
    ) {
        return;
    }


    if (
        reloadTimer > 0
    ) {
        return;
    }


    if (
        fireTimer > 0
    ) {
        return;
    }


    if (
        ammo <= 0
    ) {

        note(
            "OUT OF AMMO — PRESS R"
        );

        return;

    }


    ammo--;

    fireTimer =
        FIRE_COOLDOWN;

    achievements.firstShot =
        true;


    const start =
        new THREE.Vector3();


    muzzle.getWorldPosition(
        start
    );


    const target =
        getMouseWorld();


    const direction =
        target
            .clone()
            .sub(start)
            .normalize();


    start.add(
        direction
            .clone()
            .multiplyScalar(
                1
            )
    );


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.22,
                12,
                12
            ),
            glowing(
                0x6efff5,
                8
            )
        );


    bullet.position.copy(
        start
    );


    scene.add(
        bullet
    );


    bullets.push({

        mesh: bullet,

        velocity:
            direction.multiplyScalar(
                BULLET_SPEED
            ),

        life: 3

    });


    createMuzzleFlash(
        start,
        direction
    );


    updateHUD();

}


/* =========================================================
   MUZZLE FLASH
========================================================= */

function createMuzzleFlash(
    position,
    direction
) {

    const flash =
        new THREE.PointLight(
            0x65fff0,
            30,
            25
        );


    flash.position.copy(
        position
    );


    scene.add(flash);


    setTimeout(
        () => {
            scene.remove(
                flash
            );
        },
        90
    );


    for (
        let i = 0;
        i < 12;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.1,
                    7,
                    7
                ),
                glowing(
                    0x8ffff8,
                    8
                )
            );


        p.position.copy(
            position
        );


        const spread =
            direction.clone();


        spread.x +=
            THREE.MathUtils.randFloat(
                -0.25,
                0.25
            );


        spread.y +=
            THREE.MathUtils.randFloat(
                -0.25,
                0.25
            );


        spread.z +=
            THREE.MathUtils.randFloat(
                -0.25,
                0.25
            );


        spread.normalize();


        scene.add(p);


        particles.push({

            mesh: p,

            velocity:
                spread.multiplyScalar(
                    THREE.MathUtils.randFloat(
                        5,
                        12
                    )
                ),

            life: 0.4

        });

    }

}


/* =========================================================
   RELOAD
========================================================= */

function reloadTank() {

    if (
        reloadTimer > 0
    ) {
        return;
    }


    if (
        ammo >= maxAmmo
    ) {
        return;
    }


    reloadTimer = 1.3;

    note(
        "RELOADING..."
    );

}


/* =========================================================
   BULLETS
========================================================= */

function updateBullets(dt) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        const old =
            bullet.mesh.position.clone();


        bullet.mesh.position.add(
            bullet.velocity
                .clone()
                .multiplyScalar(dt)
        );


        bullet.life -= dt;


        if (
            bulletBlocked(
                old,
                bullet.mesh.position
            )
        ) {

            createHitEffect(
                bullet.mesh.position
            );


            scene.remove(
                bullet.mesh
            );


            bullets.splice(
                i,
                1
            );


            continue;

        }


        let hit = false;


        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy =
                enemies[j];


            const center =
                enemy.group.position
                    .clone();


            center.y = 2;


            const distance =
                bullet.mesh.position
                    .distanceTo(
                        center
                    );


            if (
                distance < 3.1
            ) {

                enemy.health -=
                    BULLET_DAMAGE;


                hit = true;


                createHitEffect(
                    bullet.mesh.position
                );


                if (
                    enemy.health <= 0
                ) {

                    destroyMonster(
                        j
                    );

                }


                break;

            }

        }


        if (
            hit ||
            bullet.life <= 0
        ) {

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


/* =========================================================
   BULLET BLOCKED BY BUILDINGS
========================================================= */

function bulletBlocked(
    from,
    to
) {

    const direction =
        to.clone()
            .sub(from);


    const distance =
        direction.length();


    direction.normalize();


    const ray =
        new THREE.Raycaster(
            from,
            direction,
            0,
            distance
        );


    for (
        const b of buildings
    ) {

        const box =
            new THREE.Box3()
                .setFromObject(
                    b.mesh
                );


        if (
            ray.ray.intersectsBox(
                box
            )
        ) {

            return true;

        }

    }


    return false;

}


/* =========================================================
   HIT EFFECT
========================================================= */

function createHitEffect(
    position
) {

    for (
        let i = 0;
        i < 10;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.11,
                    7,
                    7
                ),
                glowing(
                    0xff4778,
                    7
                )
            );


        p.position.copy(
            position
        );


        scene.add(p);


        particles.push({

            mesh: p,

            velocity:
                new THREE.Vector3(
                    THREE.MathUtils.randFloat(
                        -6,
                        6
                    ),
                    THREE.MathUtils.randFloat(
                        1,
                        7
                    ),
                    THREE.MathUtils.randFloat(
                        -6,
                        6
                    )
                ),

            life: 0.55

        });

    }

}


/* =========================================================
   DESTROY MONSTER
========================================================= */

function destroyMonster(
    index
) {

    const enemy =
        enemies[index];


    createExplosion(
        enemy.group.position
    );


    scene.remove(
        enemy.group
    );


    enemies.splice(
        index,
        1
    );


    kills++;

    credits += 20;

    achievements.firstKill =
        true;


    if (
        kills >= 5
    ) {

        achievements.fiveKills =
            true;

    }


    note(
        "MONSTER DESTROYED  +20"
    );


    updateHUD();


    setTimeout(
        () => {

            if (
                gameState ===
                "playing"
            ) {

                spawnMonsterNearPlayer();

            }

        },
        1800
    );

}


/* =========================================================
   EXPLOSION
========================================================= */

function createExplosion(
    position
) {

    const flash =
        new THREE.PointLight(
            0xff5638,
            45,
            32
        );


    flash.position.copy(
        position
    );


    flash.position.y +=
        2;


    scene.add(
        flash
    );


    setTimeout(
        () => {

            scene.remove(
                flash
            );

        },
        180
    );


    for (
        let i = 0;
        i < 30;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    THREE.MathUtils.randFloat(
                        0.08,
                        0.3
                    ),
                    8,
                    8
                ),
                glowing(
                    Math.random() > 0.5
                        ? 0xff573d
                        : 0xffc13d,
                    5
                )
            );


        p.position.copy(
            position
        );


        p.position.y +=
            THREE.MathUtils.randFloat(
                1,
                3
            );


        scene.add(p);


        particles.push({

            mesh: p,

            velocity:
                new THREE.Vector3(
                    THREE.MathUtils.randFloat(
                        -10,
                        10
                    ),
                    THREE.MathUtils.randFloat(
                        2,
                        12
                    ),
                    THREE.MathUtils.randFloat(
                        -10,
                        10
                    )
                ),

            life: 1.2

        });

    }

}


/* =========================================================
   MONSTER UPDATE
========================================================= */

function updateMonsters(dt) {

    for (
        const enemy of enemies
    ) {

        const toPlayer =
            player.position
                .clone()
                .sub(
                    enemy.group.position
                );


        toPlayer.y = 0;


        const distance =
            toPlayer.length();


        if (
            distance > 7
        ) {

            toPlayer.normalize();


            const next =
                enemy.group.position
                    .clone();


            next.add(
                toPlayer.multiplyScalar(
                    enemy.speed *
                    dt
                )
            );


            if (
                !buildingCollision(
                    next,
                    2.4
                )
            ) {

                enemy.group.position.copy(
                    next
                );

            }

        }


        enemy.group.lookAt(
            player.position.x,
            enemy.group.position.y,
            player.position.z
        );


        /* floating animation */

        enemy.group.position.y =
            Math.sin(
                worldTime * 3 +
                enemy.phase
            ) * 0.15;


        /* health bar */

        const healthPercent =
            Math.max(
                0,
                enemy.health /
                enemy.maxHealth
            );


        enemy.bar.scale.x =
            healthPercent;


        /* health bar faces camera */

        enemy.group.children
            .find(
                child =>
                    child.type ===
                    "Group"
            );


        enemy.attackTimer -=
            dt;


        if (
            distance < 42 &&
            enemy.attackTimer <= 0
        ) {

            if (
                !bulletBlocked(
                    enemy.group.position,
                    player.position
                )
            ) {

                playerHealth -=
                    enemy.type ===
                    "brute"
                        ? 12
                        : 8;


                achievements.survivor =
                    true;


                enemy.attackTimer =
                    enemy.type ===
                    "crawler"
                        ? 1.1
                        : 1.6;


                createHitEffect(
                    player.position
                );


                updateHUD();


                if (
                    playerHealth <= 0
                ) {

                    playerHealth = 0;

                    gameOver();

                }

            }

        }

    }

}


/* =========================================================
   PARTICLES
========================================================= */

function updateParticles(dt) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            particles[i];


        p.mesh.position.add(
            p.velocity
                .clone()
                .multiplyScalar(dt)
        );


        p.velocity.y -=
            12 * dt;


        p.life -= dt;


        p.mesh.scale.multiplyScalar(
            0.985
        );


        if (
            p.life <= 0
        ) {

            scene.remove(
                p.mesh
            );


            particles.splice(
                i,
                1
            );

        }

    }

}


/* =========================================================
   RESOURCES
========================================================= */

function updateResources() {

    for (
        const resource of resources
    ) {

        resource.group.rotation.y +=
            0.01;


        resource.group.position.y =
            Math.sin(
                worldTime * 2 +
                resource.phase
            ) *
            0.18;

    }

}


/* =========================================================
   CAMERA
========================================================= */

function updateCamera() {

    if (!player) {
        return;
    }


    const offset =
        new THREE.Vector3(
            0,
            CAMERA_HEIGHT,
            CAMERA_DISTANCE
        );


    offset.applyQuaternion(
        player.quaternion
    );


    const wanted =
        player.position
            .clone()
            .add(offset);


    camera.position.lerp(
        wanted,
        0.12
    );


    const look =
        player.position
            .clone();


    look.y =
        CAMERA_LOOK_HEIGHT;


    camera.lookAt(
        look
    );

}


/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    if (!healthFill) {
        return;
    }


    healthFill.style.width =
        `${
            Math.max(
                0,
                playerHealth
            ) /
            PLAYER_MAX_HEALTH *
            100
        }%`;


    energyFill.style.width =
        `${
            Math.max(
                0,
                playerEnergy
            ) /
            PLAYER_MAX_ENERGY *
            100
        }%`;


    ammoText.textContent =
        `${ammo} / ${maxAmmo}`;


    killsText.textContent =
        kills;


    creditsText.textContent =
        credits;

}


/* =========================================================
   START NEW GAME
========================================================= */

function startNewGame() {

    closeAllPanels();


    playerHealth =
        PLAYER_MAX_HEALTH;


    playerEnergy =
        PLAYER_MAX_ENERGY;


    credits = 100;

    kills = 0;

    ammo = 12;

    maxAmmo =
        12 +
        ammoUpgrade * 2;


    fireTimer = 0;
    reloadTimer = 0;


    player.position.set(
        0,
        0,
        0
    );


    player.rotation.y = 0;


    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.group
        );

    }


    enemies = [];


    for (
        let i = 0;
        i < START_ENEMIES;
        i++
    ) {

        spawnMonsterNearPlayer();

    }


    gameState =
        "playing";


    menu.style.display =
        "none";


    hud.style.display =
        "block";


    updateHUD();


    note(
        "NEW RUN — MONSTERS DETECTED"
    );

}


/* =========================================================
   SAVE
========================================================= */

function saveGame() {

    if (!player) {
        return;
    }


    const data = {

        playerHealth,
        playerEnergy,

        credits,
        kills,

        ammo,
        maxAmmo,
        ammoUpgrade,

        totalPlayTime,

        player: {

            x:
                player.position.x,

            z:
                player.position.z,

            rotation:
                player.rotation.y

        },

        achievements

    };


    localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(data)
    );

}


/* =========================================================
   LOAD
========================================================= */

function loadGame() {

    const raw =
        localStorage.getItem(
            SAVE_KEY
        );


    if (!raw) {

        note(
            "NO SAVE FOUND"
        );

        return;

    }


    try {

        const data =
            JSON.parse(raw);


        playerHealth =
            data.playerHealth ??
            PLAYER_MAX_HEALTH;


        playerEnergy =
            data.playerEnergy ??
            PLAYER_MAX_ENERGY;


        credits =
            data.credits ??
            100;


        kills =
            data.kills ??
            0;


        ammo =
            data.ammo ??
            12;


        maxAmmo =
            data.maxAmmo ??
            12;


        ammoUpgrade =
            data.ammoUpgrade ??
            0;


        totalPlayTime =
            data.totalPlayTime ??
            0;


        if (
            data.player
        ) {

            player.position.set(
                data.player.x ?? 0,
                0,
                data.player.z ?? 0
            );


            player.rotation.y =
                data.player.rotation ??
                0;

        }


        if (
            data.achievements
        ) {

            achievements =
                data.achievements;

        }


        closeAllPanels();


        gameState =
            "playing";


        menu.style.display =
            "none";


        hud.style.display =
            "block";


        updateHUD();


        note(
            "SAVE LOADED"
        );


    } catch (
        error
    ) {

        console.error(
            error
        );


        note(
            "SAVE ERROR"
        );

    }

}


/* =========================================================
   PAUSE
========================================================= */

function pauseGame() {

    if (
        gameState !== "playing"
    ) {
        return;
    }


    gameState =
        "paused";


    showPausePanel();

}


function resumeGame() {

    closeAllPanels();

    gameState =
        "playing";

}


function showPausePanel() {

    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel";


    panel.innerHTML = `

        <h2>PAUSED</h2>

        <p>
            The Lost Signal is waiting.
        </p>

        <button id="resume">
            RESUME
        </button>

        <button id="pauseShop">
            SHOP
        </button>

        <button id="pauseSave">
            SAVE GAME
        </button>

        <button id="pauseMenu">
            MAIN MENU
        </button>
    `;


    layer.appendChild(
        panel
    );


    panel.querySelector(
        "#resume"
    ).onclick =
        resumeGame;


    panel.querySelector(
        "#pauseShop"
    ).onclick =
        openShop;


    panel.querySelector(
        "#pauseSave"
    ).onclick =
        () => {

            saveGame();

            note(
                "GAME SAVED"
            );

        };


    panel.querySelector(
        "#pauseMenu"
    ).onclick =
        () => {

            closeAllPanels();

            gameState =
                "menu";

            hud.style.display =
                "none";

            menu.style.display =
                "flex";

        };

}


/* =========================================================
   SHOP
========================================================= */

function openShop() {

    if (
        gameState ===
        "playing"
    ) {

        gameState =
            "paused";

    }


    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel shop-panel";


    panel.innerHTML = `

        <div class="shop-title">

            <h2>SHOP</h2>

            <div class="shop-credits">
                CREDITS:
                <strong id="shopCredits">
                    ${credits}
                </strong>
            </div>

        </div>


        <div class="shop-grid">

            <div class="shop-card">

                <div class="shop-icon">
                    🔋
                </div>

                <h3>
                    AMMO PACK
                </h3>

                <p>
                    Add 10 rounds.
                </p>

                <div class="price">
                    10 CREDITS
                </div>

                <button id="ammoBuy">
                    BUY
                </button>

            </div>


            <div class="shop-card">

                <div class="shop-icon">
                    🛠️
                </div>

                <h3>
                    REPAIR
                </h3>

                <p>
                    Restore 35 hull.
                </p>

                <div class="price">
                    20 CREDITS
                </div>

                <button id="repairBuy">
                    BUY
                </button>

            </div>


            <div class="shop-card">

                <div class="shop-icon">
                    ⚡
                </div>

                <h3>
                    AMMO UPGRADE
                </h3>

                <p>
                    Increase magazine size.
                </p>

                <div class="price">
                    50 CREDITS
                </div>

                <button id="upgradeBuy">
                    BUY
                </button>

            </div>

        </div>


        <div style="
            text-align:center;
            margin-top:25px;
        ">

            <button id="shopBack">
                BACK
            </button>

        </div>
    `;


    layer.appendChild(
        panel
    );


    const refresh =
        () => {

            panel.querySelector(
                "#shopCredits"
            ).textContent =
                credits;

            updateHUD();

        };


    panel.querySelector(
        "#ammoBuy"
    ).onclick =
        () => {

            if (
                credits < 10
            ) {

                note(
                    "NOT ENOUGH CREDITS"
                );

                return;

            }


            credits -= 10;

            ammo += 10;

            refresh();

        };


    panel.querySelector(
        "#repairBuy"
    ).onclick =
        () => {

            if (
                credits < 20
            ) {

                note(
                    "NOT ENOUGH CREDITS"
                );

                return;

            }


            credits -= 20;


            playerHealth =
                Math.min(
                    PLAYER_MAX_HEALTH,
                    playerHealth + 35
                );


            refresh();

            note(
                "TANK REPAIRED"
            );

        };


    panel.querySelector(
        "#upgradeBuy"
    ).onclick =
        () => {

            if (
                credits < 50
            ) {

                note(
                    "NOT ENOUGH CREDITS"
                );

                return;

            }


            credits -= 50;

            ammoUpgrade++;


            maxAmmo =
                12 +
                ammoUpgrade * 2;


            ammo =
                Math.min(
                    maxAmmo,
                    ammo + 2
                );


            refresh();

            note(
                "AMMO UPGRADED"
            );

        };


    panel.querySelector(
        "#shopBack"
    ).onclick =
        () => {

            closeAllPanels();

            if (
                gameState ===
                "paused"
            ) {

                showPausePanel();

            } else {

                gameState =
                    "menu";

                hud.style.display =
                    "none";

                menu.style.display =
                    "flex";

            }

        };

}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

function showAchievements() {

    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel";


    const achievementData = [

        [
            "FIRST SIGNAL",
            "Fire your first shot.",
            achievements.firstShot
        ],

        [
            "FIRST CONTACT",
            "Destroy your first monster.",
            achievements.firstKill
        ],

        [
            "HUNTER",
            "Destroy five monsters.",
            achievements.fiveKills
        ],

        [
            "EXPLORER",
            "Explore the sector.",
            achievements.explorer
        ],

        [
            "SURVIVOR",
            "Survive a monster attack.",
            achievements.survivor
        ]

    ];


    panel.innerHTML = `

        <h2>
            ACHIEVEMENTS
        </h2>

        <div class="achievement-list">

            ${achievementData.map(
                a => `

                <div class="
                    achievement
                    ${a[2]
                        ? "unlocked"
                        : ""}
                ">

                    <strong>
                        ${
                            a[2]
                                ? "✓"
                                : "○"
                        }
                        ${a[0]}
                    </strong>

                    <span>
                        ${a[1]}
                    </span>

                </div>
            `
            ).join("")}

        </div>


        <div style="
            text-align:center;
            margin-top:20px;
        ">

            <button id="achievementBack">
                BACK
            </button>

        </div>
    `;


    layer.appendChild(
        panel
    );


    panel.querySelector(
        "#achievementBack"
    ).onclick =
        closeAllPanels;

}


/* =========================================================
   CONTROLS
========================================================= */

function showControls() {

    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel";


    panel.innerHTML = `

        <h2>
            CONTROLS
        </h2>

        <p>
            <strong>W / S</strong>
            Drive.
        </p>

        <p>
            <strong>A / D</strong>
            Turn.
        </p>

        <p>
            <strong>MOUSE</strong>
            Aim cannon.
        </p>

        <p>
            <strong>LEFT CLICK</strong>
            Fire.
        </p>

        <p>
            <strong>R</strong>
            Reload.
        </p>

        <p>
            <strong>ESC</strong>
            Pause.
        </p>

        <button id="controlsBack">
            BACK
        </button>
    `;


    layer.appendChild(
        panel
    );


    panel.querySelector(
        "#controlsBack"
    ).onclick =
        closeAllPanels;

}


/* =========================================================
   MAP
========================================================= */

function showMap() {

    if (
        gameState !==
        "playing"
    ) {
        return;
    }


    gameState =
        "paused";


    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel";


    panel.innerHTML = `

        <h2>
            SECTOR MAP
        </h2>

        <div class="map-box">

            <div class="map-player"></div>

        </div>

        <div style="
            text-align:center;
            margin-top:20px;
        ">

            <button id="mapBack">
                BACK TO GAME
            </button>

        </div>
    `;


    layer.appendChild(
        panel
    );


    const map =
        panel.querySelector(
            ".map-box"
        );


    for (
        const enemy of enemies
    ) {

        const dot =
            document.createElement(
                "div"
            );


        dot.className =
            "map-enemy";


        const x =
            enemy.group.position.x /
            WORLD_SIZE *
            100 +
            50;


        const z =
            enemy.group.position.z /
            WORLD_SIZE *
            100 +
            50;


        dot.style.left =
            `${x}%`;


        dot.style.top =
            `${z}%`;


        map.appendChild(
            dot
        );

    }


    panel.querySelector(
        "#mapBack"
    ).onclick =
        () => {

            closeAllPanels();

            gameState =
                "playing";

        };

}


/* =========================================================
   PANELS
========================================================= */

function createPanelLayer() {

    const layer =
        document.createElement(
            "div"
        );


    layer.className =
        "panel-layer";


    document.body.appendChild(
        layer
    );


    return layer;

}


function closeAllPanels() {

    document
        .querySelectorAll(
            ".panel-layer"
        )
        .forEach(
            e => e.remove()
        );

}


/* =========================================================
   GAME OVER
========================================================= */

function gameOver() {

    gameState =
        "gameover";


    saveGame();


    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel";


    panel.innerHTML = `

        <h2>
            TANK DESTROYED
        </h2>

        <p>
            The monsters overwhelmed your tank.
        </p>

        <p>
            KILLS:
            <strong>
                ${kills}
            </strong>
        </p>

        <p>
            CREDITS:
            <strong>
                ${credits}
            </strong>
        </p>

        <button id="retry">
            NEW RUN
        </button>

        <button id="gameMenu">
            MAIN MENU
        </button>
    `;


    layer.appendChild(
        panel
    );


    panel.querySelector(
        "#retry"
    ).onclick =
        startNewGame;


    panel.querySelector(
        "#gameMenu"
    ).onclick =
        () => {

            closeAllPanels();

            gameState =
                "menu";

            hud.style.display =
                "none";

            menu.style.display =
                "flex";

        };

}


/* =========================================================
   NOTIFICATION
========================================================= */

let notificationTimer;


function note(
    message
) {

    let element =
        document.querySelector(
            ".notification"
        );


    if (!element) {

        element =
            document.createElement(
                "div"
            );


        element.className =
            "notification";


        document.body.appendChild(
            element
        );

    }


    element.textContent =
        message;


    element.classList.add(
        "show"
    );


    clearTimeout(
        notificationTimer
    );


    notificationTimer =
        setTimeout(
            () => {

                element.classList.remove(
                    "show"
                );

            },
            1800
        );

}


/* =========================================================
   UPDATE
========================================================= */

function update(
    dt
) {

    worldTime += dt;


    if (
        gameState !==
        "playing"
    ) {

        updateCamera();

        return;

    }


    totalPlayTime += dt;


    if (
        totalPlayTime > 10
    ) {

        achievements.explorer =
            true;

    }


    if (
        fireTimer > 0
    ) {

        fireTimer -= dt;

    }


    if (
        reloadTimer > 0
    ) {

        reloadTimer -= dt;


        if (
            reloadTimer <= 0
        ) {

            ammo =
                maxAmmo;


            note(
                "RELOADED"
            );

        }

    }


    if (
        mouse.down
    ) {

        shoot();

    }


    updatePlayer(dt);

    updateTurretAim();

    updateBullets(dt);

    updateMonsters(dt);

    updateParticles(dt);

    updateResources();

    updateCamera();

    updateHUD();

}


/* =========================================================
   ANIMATION
========================================================= */

clock =
    new THREE.Clock();


function animate() {

    requestAnimationFrame(
        animate
    );


    const dt =
        Math.min(
            clock.getDelta(),
            0.05
        );


    update(dt);


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

    }
);


/* =========================================================
   AUTO SAVE
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        saveGame();

    }
);


/* =========================================================
   INITIAL STATE
========================================================= */

menu.style.display =
    "flex";


hud.style.display =
    "none";


updateHUD();

console.log(
    "ECHOBOUND ULTRA EDITION LOADED"
);
