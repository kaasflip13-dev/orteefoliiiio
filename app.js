// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// FAST FPS EDITION
// ============================================================

import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";


// ============================================================
// CANVAS
// ============================================================

const canvas =
    document.getElementById("game");


// ============================================================
// RENDERER
// ============================================================

const renderer =
    new THREE.WebGLRenderer({
        canvas: canvas,

        antialias: false,

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
        1.25
    )
);


renderer.shadowMap.enabled =
    false;


renderer.outputColorSpace =
    THREE.SRGBColorSpace;


renderer.toneMapping =
    THREE.ACESFilmicToneMapping;


renderer.toneMappingExposure =
    1.05;


// ============================================================
// SCENE
// ============================================================

const scene =
    new THREE.Scene();


scene.background =
    new THREE.Color(
        0x071016
    );


scene.fog =
    new THREE.Fog(
        0x071016,
        90,
        280
    );


// ============================================================
// CAMERA
// ============================================================

const camera =
    new THREE.PerspectiveCamera(
        65,
        window.innerWidth /
        window.innerHeight,
        0.1,
        500
    );


// ============================================================
// LIGHT
// ============================================================

scene.add(
    new THREE.HemisphereLight(
        0xa9cfff,
        0x18221a,
        1.5
    )
);


const sun =
    new THREE.DirectionalLight(
        0xffffff,
        1.25
    );


sun.position.set(
    60,
    100,
    40
);


scene.add(sun);


// ============================================================
// GAME STATE
// ============================================================

let gameState =
    "menu";


let health =
    100;


let energy =
    100;


let ammo =
    12;


let maxAmmo =
    12;


let credits =
    0;


let kills =
    0;


let fireCooldown =
    0;


let reloadTimer =
    0;


let gameTime =
    0;


let spawnTimer =
    4;


let mouseDown =
    false;


// ============================================================
// INPUT
// ============================================================

const keys = {};


const mouse =
    new THREE.Vector2();


window.addEventListener(
    "keydown",
    function (event) {

        keys[event.key] =
            true;


        if (
            event.key.toLowerCase()
            === "r"
        ) {

            reload();
        }


        if (
            event.key === "Escape"
        ) {

            if (
                gameState ===
                "playing"
            ) {

                gameState =
                    "paused";

                showPause();
            }

            else if (
                gameState ===
                "paused"
            ) {

                closePanels();

                gameState =
                    "playing";
            }
        }
    }
);


window.addEventListener(
    "keyup",
    function (event) {

        keys[event.key] =
            false;
    }
);


window.addEventListener(
    "mousemove",
    function (event) {

        mouse.x =
            (
                event.clientX /
                window.innerWidth
            ) * 2 - 1;


        mouse.y =
            -(
                event.clientY /
                window.innerHeight
            ) * 2 + 1;
    }
);


window.addEventListener(
    "mousedown",
    function (event) {

        if (
            event.button === 0
        ) {

            mouseDown =
                true;

            shoot();
        }
    }
);


window.addEventListener(
    "mouseup",
    function (event) {

        if (
            event.button === 0
        ) {

            mouseDown =
                false;
        }
    }
);


// ============================================================
// WORLD
// ============================================================

const WORLD_SIZE =
    420;


// ============================================================
// MATERIALS
// ============================================================

const groundMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x26382e
    });


const roadMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x17211e
    });


const buildingMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x29393c
    });


const buildingDarkMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x172225
    });


const tankMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x526966
    });


const tankDarkMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x182326
    });


const metalMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x778987
    });


const enemyMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x633b7e
    });


const enemyDarkMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x25162e
    });


const redMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xff3349
    });


const blueMaterial =
    new THREE.MeshBasicMaterial({
        color: 0x42eaff
    });


// ============================================================
// GROUND
// ============================================================

const ground =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            WORLD_SIZE,
            WORLD_SIZE
        ),
        groundMaterial
    );


ground.rotation.x =
    -Math.PI / 2;


scene.add(ground);


// ============================================================
// ROADS
// ============================================================

function createRoad(
    x,
    z,
    width,
    depth
) {

    const road =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                width,
                depth
            ),
            roadMaterial
        );


    road.rotation.x =
        -Math.PI / 2;


    road.position.set(
        x,
        0.01,
        z
    );


    scene.add(road);
}


createRoad(
    0,
    0,
    22,
    WORLD_SIZE
);


createRoad(
    0,
    0,
    WORLD_SIZE,
    22
);


// ============================================================
// BUILDINGS
// ============================================================

const buildings = [];


function createBuilding(
    x,
    z,
    width,
    depth,
    height
) {

    const group =
        new THREE.Group();


    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            buildingMaterial
        );


    body.position.y =
        height / 2;


    group.add(body);


    const roof =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width + 0.5,
                0.35,
                depth + 0.5
            ),
            buildingDarkMaterial
        );


    roof.position.y =
        height + 0.17;


    group.add(roof);


    // Een paar simpele ramen.
    const windowMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffc95b
        });


    const windowCount =
        Math.min(
            4,
            Math.floor(
                width / 8
            )
        );


    for (
        let i = 0;
        i < windowCount;
        i++
    ) {

        const windowMesh =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.2,
                    1,
                    0.08
                ),
                windowMaterial
            );


        windowMesh.position.set(
            -width / 2 +
            4 +
            i * 5,

            height * 0.58,

            -depth / 2 -
            0.05
        );


        group.add(
            windowMesh
        );
    }


    group.position.set(
        x,
        0,
        z
    );


    scene.add(group);


    buildings.push({
        x: x,
        z: z,
        w: width,
        d: depth
    });
}


// ============================================================
// CITY
// ============================================================

createBuilding(
    -65,
    -70,
    34,
    30,
    15
);


createBuilding(
    65,
    -70,
    38,
    28,
    18
);


createBuilding(
    -70,
    70,
    40,
    32,
    17
);


createBuilding(
    70,
    70,
    34,
    34,
    14
);


createBuilding(
    -105,
    0,
    30,
    40,
    12
);


createBuilding(
    105,
    0,
    30,
    40,
    16
);


createBuilding(
    0,
    -105,
    42,
    28,
    15
);


createBuilding(
    0,
    105,
    42,
    28,
    18
);


// ============================================================
// COLLISION
// ============================================================

function circleBoxCollision(
    x,
    z,
    radius,
    box
) {

    const closestX =
        Math.max(
            box.x - box.w / 2,
            Math.min(
                x,
                box.x + box.w / 2
            )
        );


    const closestZ =
        Math.max(
            box.z - box.d / 2,
            Math.min(
                z,
                box.z + box.d / 2
            )
        );


    const dx =
        x - closestX;


    const dz =
        z - closestZ;


    return (
        dx * dx +
        dz * dz
    ) < radius * radius;
}


function buildingCollision(
    position,
    radius = 2
) {

    for (
        const building of
        buildings
    ) {

        if (
            circleBoxCollision(
                position.x,
                position.z,
                radius,
                building
            )
        ) {

            return true;
        }
    }


    return false;
}


// ============================================================
// TREES
// ============================================================

const treeMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x2b5038
    });


const trunkMaterial =
    new THREE.MeshLambertMaterial({
        color: 0x3b3026
    });


function createTree(
    x,
    z
) {

    const group =
        new THREE.Group();


    const trunk =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.45,
                0.55,
                3,
                7
            ),
            trunkMaterial
        );


    trunk.position.y =
        1.5;


    group.add(trunk);


    const leaves =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                2.2,
                5,
                7
            ),
            treeMaterial
        );


    leaves.position.y =
        5;


    group.add(leaves);


    group.position.set(
        x,
        0,
        z
    );


    scene.add(group);
}


const treePositions = [

    [-150, -145],
    [-125, -130],
    [-155, -90],

    [-135, 125],
    [-105, 150],

    [120, 135],
    [155, 110],

    [145, 65],

    [135, -130],
    [100, -150],

    [-160, 40],
    [160, -40]

];


for (
    const position of
    treePositions
) {

    createTree(
        position[0],
        position[1]
    );
}


// ============================================================
// PLAYER / TANK
// ============================================================

const player =
    new THREE.Group();


player.position.set(
    0,
    0,
    0
);


scene.add(player);


const hull =
    new THREE.Group();


player.add(hull);


// Main tank body.
const hullBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4.8,
            1.2,
            6
        ),
        tankMaterial
    );


hullBody.position.y =
    1.1;


hull.add(hullBody);


// Upper armor.
const upperArmor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            3.8,
            0.9,
            3.6
        ),
        metalMaterial
    );


upperArmor.position.y =
    2;


hull.add(
    upperArmor
);


// Front armor.
const frontArmor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            4,
            0.8,
            0.8
        ),
        tankDarkMaterial
    );


frontArmor.position.set(
    0,
    1.25,
    -3
);


hull.add(
    frontArmor
);


// ============================================================
// TRACKS
// ============================================================

function createTrack(
    x
) {

    const track =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.1,
                1.2,
                5.8
            ),
            tankDarkMaterial
        );


    track.position.set(
        x,
        0.75,
        0
    );


    hull.add(track);


    for (
        let i = -2;
        i <= 2;
        i++
    ) {

        const wheel =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.43,
                    0.43,
                    0.35,
                    8
                ),
                metalMaterial
            );


        wheel.rotation.z =
            Math.PI / 2;


        wheel.position.set(
            x,
            0.75,
            i * 1.05
        );


        hull.add(wheel);
    }
}


createTrack(
    -2.5
);


createTrack(
    2.5
);


// ============================================================
// TURRET
// ============================================================

const turret =
    new THREE.Group();


turret.position.y =
    2.5;


player.add(turret);


const turretBody =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            1.9,
            2.1,
            0.8,
            8
        ),
        tankDarkMaterial
    );


turretBody.rotation.y =
    Math.PI / 8;


turret.add(
    turretBody
);


// Cannon.
const cannon =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.65,
            0.65,
            5
        ),
        metalMaterial
    );


cannon.position.set(
    0,
    0.15,
    -2.7
);


turret.add(
    cannon
);


// Cannon end.
const cannonEnd =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.5,
            0.5,
            0.8,
            8
        ),
        tankDarkMaterial
    );


cannonEnd.rotation.x =
    Math.PI / 2;


cannonEnd.position.set(
    0,
    0.15,
    -5.15
);


turret.add(
    cannonEnd
);


// Muzzle position.
const muzzle =
    new THREE.Object3D();


muzzle.position.set(
    0,
    0.15,
    -5.55
);


turret.add(
    muzzle
);


// ============================================================
// TANK CORE
// ============================================================

const tankCore =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            0.25,
            6,
            6
        ),
        blueMaterial
    );


tankCore.position.set(
    0,
    1.6,
    -0.8
);


hull.add(
    tankCore
);


// ============================================================
// ENEMIES
// ============================================================

const enemies = [];


const MAX_ENEMIES =
    8;


function randomEnemyType() {

    const types = [
        "crawler",
        "stalker",
        "brute"
    ];


    return types[
        Math.floor(
            Math.random() *
            types.length
        )
    ];
}


// ============================================================
// SPAWN ENEMY
// ============================================================

function spawnMonsterNearPlayer(
    preferredDistance = 35
) {

    if (
        enemies.length >=
        MAX_ENEMIES
    ) {

        return;
    }


    let spawnX = 0;
    let spawnZ = 0;

    let valid =
        false;


    for (
        let attempt = 0;
        attempt < 40;
        attempt++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const distance =
            preferredDistance +
            Math.random() *
            15;


        spawnX =
            player.position.x +
            Math.cos(angle) *
            distance;


        spawnZ =
            player.position.z +
            Math.sin(angle) *
            distance;


        spawnX =
            THREE.MathUtils.clamp(
                spawnX,
                -WORLD_SIZE / 2 + 10,
                WORLD_SIZE / 2 - 10
            );


        spawnZ =
            THREE.MathUtils.clamp(
                spawnZ,
                -WORLD_SIZE / 2 + 10,
                WORLD_SIZE / 2 - 10
            );


        const test =
            new THREE.Vector3(
                spawnX,
                0,
                spawnZ
            );


        if (
            !buildingCollision(
                test,
                5
            )
        ) {

            valid =
                true;

            break;
        }
    }


    if (!valid) {
        return;
    }


    const enemy =
        createMonster(
            spawnX,
            spawnZ,
            randomEnemyType()
        );


    enemies.push(
        enemy
    );
}


// ============================================================
// CREATE MONSTER
// ============================================================

function createMonster(
    x,
    z,
    type
) {

    const group =
        new THREE.Group();


    group.position.set(
        x,
        0,
        z
    );


    scene.add(
        group
    );


    let scale = 1;
    let speed = 2.5;
    let damage = 6;
    let hp = 40;


    if (
        type ===
        "crawler"
    ) {

        scale = 0.9;
        speed = 3.2;
        damage = 5;
        hp = 35;
    }


    if (
        type ===
        "stalker"
    ) {

        scale = 1;
        speed = 4;
        damage = 7;
        hp = 40;
    }


    if (
        type ===
        "brute"
    ) {

        scale = 1.45;
        speed = 1.6;
        damage = 12;
        hp = 90;
    }


    // Body.
    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                2 * scale,
                10,
                7
            ),
            enemyMaterial
        );


    body.position.y =
        2.1 * scale;


    group.add(
        body
    );


    // Lower body.
    const lower =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                1.5 * scale,
                8,
                6
            ),
            enemyDarkMaterial
        );


    lower.position.y =
        0.9 * scale;


    group.add(
        lower
    );


    // Eyes.
    const eyeGeometry =
        new THREE.SphereGeometry(
            0.3 * scale,
            6,
            6
        );


    const leftEye =
        new THREE.Mesh(
            eyeGeometry,
            redMaterial
        );


    leftEye.position.set(
        -0.65 * scale,
        2.4 * scale,
        -1.65 * scale
    );


    group.add(
        leftEye
    );


    const rightEye =
        new THREE.Mesh(
            eyeGeometry,
            redMaterial
        );


    rightEye.position.set(
        0.65 * scale,
        2.4 * scale,
        -1.65 * scale
    );


    group.add(
        rightEye
    );


    // Energy core.
    const core =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.4 * scale,
                6,
                6
            ),
            blueMaterial
        );


    core.position.set(
        0,
        1.6 * scale,
        -1.8 * scale
    );


    group.add(
        core
    );


    // Health bar.
    const healthBack =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                4 * scale,
                0.35
            ),
            new THREE.MeshBasicMaterial({
                color:
                    0x180a0d
            })
        );


    healthBack.position.y =
        5 * scale;


    group.add(
        healthBack
    );


    const healthFill =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                3.8 * scale,
                0.25
            ),
            new THREE.MeshBasicMaterial({
                color:
                    0xff3349
            })
        );


    healthFill.position.y =
        5 * scale;


    healthFill.position.z =
        -0.03;


    group.add(
        healthFill
    );


    return {

        group,

        type,

        hp,

        maxHp: hp,

        speed,

        damage,

        scale,

        attackTimer: 0,

        healthFill
    };
}


// ============================================================
// BULLETS
// ============================================================

const bullets = [];


// ============================================================
// RAYCAST
// ============================================================

const raycaster =
    new THREE.Raycaster();


const groundPlane =
    new THREE.Plane(
        new THREE.Vector3(
            0,
            1,
            0
        ),
        0
    );


function getMouseWorldPosition() {

    raycaster.setFromCamera(
        mouse,
        camera
    );


    const position =
        new THREE.Vector3();


    raycaster.ray.intersectPlane(
        groundPlane,
        position
    );


    return position;
}


// ============================================================
// TURRET AIM
// ============================================================

function updateTurretAim() {

    const target =
        getMouseWorldPosition();


    const dx =
        target.x -
        player.position.x;


    const dz =
        target.z -
        player.position.z;


    const angle =
        Math.atan2(
            -dx,
            -dz
        );


    turret.rotation.y =
        angle -
        player.rotation.y;
}


// ============================================================
// SHOOT
// ============================================================

function shoot() {

    if (
        gameState !==
        "playing"
    ) {

        return;
    }


    if (
        fireCooldown >
        0
    ) {

        return;
    }


    if (
        reloadTimer >
        0
    ) {

        return;
    }


    if (
        ammo <= 0
    ) {

        reload();

        return;
    }


    ammo--;


    fireCooldown =
        0.2;


    const start =
        new THREE.Vector3();


    muzzle.getWorldPosition(
        start
    );


    const target =
        getMouseWorldPosition();


    const direction =
        target
            .sub(start)
            .normalize();


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.18,
                6,
                6
            ),
            blueMaterial
        );


    bullet.position.copy(
        start
    );


    scene.add(
        bullet
    );


    bullets.push({

        mesh: bullet,

        direction: direction,

        life: 1.4
    });


    createMuzzleFlash(
        start
    );
}


// ============================================================
// MUZZLE FLASH
// ============================================================

function createMuzzleFlash(
    position
) {

    const flash =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.55,
                6,
                6
            ),
            new THREE.MeshBasicMaterial({
                color:
                    0xffffff
            })
        );


    flash.position.copy(
        position
    );


    scene.add(
        flash
    );


    setTimeout(
        function () {

            scene.remove(
                flash
            );

            flash.geometry.dispose();

            flash.material.dispose();

        },
        60
    );
}


// ============================================================
// RELOAD
// ============================================================

function reload() {

    if (
        reloadTimer >
        0
    ) {

        return;
    }


    if (
        ammo >=
        maxAmmo
    ) {

        return;
    }


    reloadTimer =
        1.4;
}


// ============================================================
// BULLET / BUILDING
// ============================================================

function bulletBlocked(
    position
) {

    return buildingCollision(
        position,
        0.25
    );
}


// ============================================================
// DAMAGE ENEMY
// ============================================================

function damageEnemy(
    enemy,
    amount
) {

    enemy.hp -=
        amount;


    if (
        enemy.hp <=
        0
    ) {

        kills++;

        credits += 20;


        scene.remove(
            enemy.group
        );


        const index =
            enemies.indexOf(
                enemy
            );


        if (
            index !==
            -1
        ) {

            enemies.splice(
                index,
                1
            );
        }


        return;
    }


    const ratio =
        Math.max(
            0,
            enemy.hp /
            enemy.maxHp
        );


    enemy.healthFill.scale.x =
        ratio;
}


// ============================================================
// UPDATE BULLETS
// ============================================================

function updateBullets(
    dt
) {

    for (
        let i =
            bullets.length - 1;

        i >= 0;

        i--
    ) {

        const bullet =
            bullets[i];


        bullet.mesh.position.add(
            bullet.direction
                .clone()
                .multiplyScalar(
                    75 * dt
                )
        );


        bullet.life -=
            dt;


        let remove =
            bullet.life <= 0;


        if (
            bulletBlocked(
                bullet.mesh.position
            )
        ) {

            remove =
                true;
        }


        if (!remove) {

            for (
                const enemy of
                enemies
            ) {

                const distance =
                    bullet.mesh.position
                        .distanceTo(
                            enemy.group.position
                        );


                if (
                    distance <
                    3 *
                    enemy.scale
                ) {

                    damageEnemy(
                        enemy,
                        20
                    );


                    remove =
                        true;


                    break;
                }
            }
        }


        if (
            remove
        ) {

            scene.remove(
                bullet.mesh
            );


            bullet.mesh.geometry.dispose();

            bullet.mesh.material.dispose();


            bullets.splice(
                i,
                1
            );
        }
    }
}


// ============================================================
// UPDATE ENEMIES
// ============================================================

function updateEnemies(
    dt
) {

    for (
        const enemy of
        enemies
    ) {

        if (
            !enemy.group.parent
        ) {

            continue;
        }


        enemy.attackTimer -=
            dt;


        const dx =
            player.position.x -
            enemy.group.position.x;


        const dz =
            player.position.z -
            enemy.group.position.z;


        const distance =
            Math.sqrt(
                dx * dx +
                dz * dz
            );


        // Face tank.
        enemy.group.rotation.y =
            Math.atan2(
                dx,
                dz
            );


        // Naar speler bewegen.
        if (
            distance >
            5
        ) {

            const direction =
                new THREE.Vector3(
                    dx,
                    0,
                    dz
                );


            direction.normalize();


            const movement =
                direction
                    .multiplyScalar(
                        enemy.speed *
                        dt
                    );


            const next =
                enemy.group.position
                    .clone()
                    .add(
                        movement
                    );


            if (
                !buildingCollision(
                    next,
                    2
                )
            ) {

                enemy.group.position.copy(
                    next
                );
            }
        }


        // Aanval.
        if (
            distance <
            5 &&
            enemy.attackTimer <=
            0
        ) {

            health -=
                enemy.damage;


            enemy.attackTimer =
                1.2;


            if (
                health <=
                0
            ) {

                health =
                    0;

                gameOver();
            }
        }


        // Kleine beweging.
        enemy.group.position.y =
            Math.sin(
                gameTime * 4 +
                enemy.group.position.x
            ) *
            0.1;
    }
}


// ============================================================
// PLAYER MOVEMENT
// ============================================================

function updatePlayer(
    dt
) {

    let forward =
        0;


    let right =
        0;


    if (
        keys["w"] ||
        keys["W"] ||
        keys["ArrowUp"]
    ) {

        forward++;
    }


    if (
        keys["s"] ||
        keys["S"] ||
        keys["ArrowDown"]
    ) {

        forward--;
    }


    if (
        keys["d"] ||
        keys["D"] ||
        keys["ArrowRight"]
    ) {

        right++;
    }


    if (
        keys["a"] ||
        keys["A"] ||
        keys["ArrowLeft"]
    ) {

        right--;
    }


    const movement =
        new THREE.Vector3(
            right,
            0,
            -forward
        );


    if (
        movement.lengthSq() >
        0
    ) {

        movement.normalize();


        let speed =
            10;


        if (
            keys["Shift"]
        ) {

            speed =
                15;
        }


        movement.multiplyScalar(
            speed * dt
        );


        const next =
            player.position
                .clone()
                .add(
                    movement
                );


        if (
            !buildingCollision(
                next,
                3
            )
        ) {

            player.position.copy(
                next
            );
        }


        // Tank beweegt in de richting.
        player.rotation.y =
            Math.atan2(
                movement.x,
                movement.z
            );
    }
}


// ============================================================
// CAMERA
// ============================================================

function updateCamera() {

    // Camera zit altijd achter de tank.
    const offset =
        new THREE.Vector3(
            0,
            8,
            15
        );


    offset.applyQuaternion(
        player.quaternion
    );


    const wanted =
        player.position
            .clone()
            .add(
                offset
            );


    camera.position.lerp(
        wanted,
        0.12
    );


    const target =
        player.position
            .clone();


    target.y =
        2;


    camera.lookAt(
        target
    );
}


// ============================================================
// MONSTER SPAWN
// ============================================================

function updateSpawning(
    dt
) {

    spawnTimer -=
        dt;


    if (
        spawnTimer <=
        0
    ) {

        if (
            enemies.length <
            MAX_ENEMIES
        ) {

            spawnMonsterNearPlayer(
                38
            );
        }


        spawnTimer =
            5;
    }
}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    const healthBar =
        document.getElementById(
            "healthBar"
        );


    const energyBar =
        document.getElementById(
            "energyBar"
        );


    const healthText =
        document.getElementById(
            "healthText"
        );


    const energyText =
        document.getElementById(
            "energyText"
        );


    const ammoElement =
        document.getElementById(
            "ammo"
        );


    const killsElement =
        document.getElementById(
            "kills"
        );


    const creditsElement =
        document.getElementById(
            "credits"
        );


    if (
        healthBar
    ) {

        healthBar.style.width =
            health +
            "%";
    }


    if (
        energyBar
    ) {

        energyBar.style.width =
            energy +
            "%";
    }


    if (
        healthText
    ) {

        healthText.textContent =
            Math.round(
                health
            );
    }


    if (
        energyText
    ) {

        energyText.textContent =
            Math.round(
                energy
            );
    }


    if (
        ammoElement
    ) {

        if (
            reloadTimer >
            0
        ) {

            ammoElement.textContent =
                "RELOADING...";
        }

        else {

            ammoElement.textContent =
                ammo +
                " / " +
                maxAmmo;
        }
    }


    if (
        killsElement
    ) {

        killsElement.textContent =
            kills;
    }


    if (
        creditsElement
    ) {

        creditsElement.textContent =
            credits;
    }
}


// ============================================================
// PANELS
// ============================================================

function closePanels() {

    const panels =
        document.querySelectorAll(
            ".panel-layer"
        );


    panels.forEach(
        function (panel) {

            panel.remove();
        }
    );
}


function createPanel(
    title,
    content
) {

    closePanels();


    const layer =
        document.createElement(
            "div"
        );


    layer.className =
        "panel-layer";


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel";


    panel.innerHTML =
        `
        <h2>${title}</h2>
        ${content}
        `;


    layer.appendChild(
        panel
    );


    document.body.appendChild(
        layer
    );


    return panel;
}


// ============================================================
// MAIN MENU
// ============================================================

function showMainMenu() {

    gameState =
        "menu";


    closePanels();


    createPanel(
        "ECHOBOUND",
        `
        <p>THE LOST SIGNAL</p>

        <button id="newRunButton">
            NEW RUN
        </button>

        <button id="shopButton">
            SHOP
        </button>

        <button id="achievementsButton">
            ACHIEVEMENTS
        </button>

        <button id="controlsButton">
            CONTROLS
        </button>
        `
    );


    document.getElementById(
        "newRunButton"
    ).onclick =
        startGame;


    document.getElementById(
        "shopButton"
    ).onclick =
        openShop;


    document.getElementById(
        "achievementsButton"
    ).onclick =
        showAchievements;


    document.getElementById(
        "controlsButton"
    ).onclick =
        showControls;
}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    closePanels();


    gameState =
        "playing";


    health =
        100;


    energy =
        100;


    ammo =
        maxAmmo;


    credits =
        0;


    kills =
        0;


    reloadTimer =
        0;


    player.position.set(
        0,
        0,
        0
    );


    player.rotation.y =
        0;


    // Oude monsters verwijderen.
    for (
        const enemy of
        enemies
    ) {

        scene.remove(
            enemy.group
        );
    }


    enemies.length =
        0;


    // Meteen vijf monsters.
    for (
        let i = 0;
        i < 5;
        i++
    ) {

        spawnMonsterNearPlayer(
            32 + i * 4
        );
    }


    updateHUD();
}


// ============================================================
// SHOP
// ============================================================

function openShop() {

    createPanel(
        "SHOP",
        `
        <div class="shop-panel">

            <h3>AMMO PACK</h3>

            <p>
                +6 ammunition
            </p>

            <button id="buyAmmo">
                BUY — 30 CREDITS
            </button>


            <h3>REPAIR</h3>

            <p>
                Restore 25 hull
            </p>

            <button id="buyRepair">
                BUY — 40 CREDITS
            </button>


            <h3>AMMO CAPACITY</h3>

            <p>
                Increase maximum ammunition
            </p>

            <button id="buyUpgrade">
                BUY — 100 CREDITS
            </button>


            <button id="shopBack">
                BACK
            </button>

        </div>
        `
    );


    document.getElementById(
        "buyAmmo"
    ).onclick =
        function () {

            if (
                credits >=
                30
            ) {

                credits -=
                    30;


                ammo =
                    Math.min(
                        maxAmmo,
                        ammo + 6
                    );


                updateHUD();
            }
        };


    document.getElementById(
        "buyRepair"
    ).onclick =
        function () {

            if (
                credits >=
                40
            ) {

                credits -=
                    40;


                health =
                    Math.min(
                        100,
                        health + 25
                    );


                updateHUD();
            }
        };


    document.getElementById(
        "buyUpgrade"
    ).onclick =
        function () {

            if (
                credits >=
                100
            ) {

                credits -=
                    100;


                maxAmmo +=
                    2;


                ammo =
                    maxAmmo;


                updateHUD();
            }
        };


    document.getElementById(
        "shopBack"
    ).onclick =
        showMainMenu;
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

function showAchievements() {

    createPanel(
        "ACHIEVEMENTS",
        `
        <div class="achievement-list">

            <p>
                🎯 <strong>FIRST SHOT</strong><br>
                Fire your first shot.
            </p>

            <p>
                👾 <strong>HUNTER</strong><br>
                Destroy 5 monsters.
            </p>

            <p>
                💀 <strong>MONSTER BREAKER</strong><br>
                Destroy 20 monsters.
            </p>

            <p>
                💰 <strong>RICH SURVIVOR</strong><br>
                Earn 500 credits.
            </p>

        </div>

        <button id="achievementBack">
            BACK
        </button>
        `
    );


    document.getElementById(
        "achievementBack"
    ).onclick =
        showMainMenu;
}


// ============================================================
// CONTROLS
// ============================================================

function showControls() {

    createPanel(
        "CONTROLS",
        `
        <p>W A S D — MOVE</p>

        <p>SHIFT — BOOST</p>

        <p>MOUSE — AIM CANNON</p>

        <p>LEFT CLICK — FIRE</p>

        <p>R — RELOAD</p>

        <p>ESC — PAUSE</p>

        <button id="controlsBack">
            BACK
        </button>
        `
    );


    document.getElementById(
        "controlsBack"
    ).onclick =
        showMainMenu;
}


// ============================================================
// PAUSE
// ============================================================

function showPause() {

    createPanel(
        "PAUSED",
        `
        <p>
            SYSTEM PAUSED
        </p>

        <button id="resumeButton">
            RESUME
        </button>

        <button id="pauseMenuButton">
            MAIN MENU
        </button>
        `
    );


    document.getElementById(
        "resumeButton"
    ).onclick =
        function () {

            closePanels();

            gameState =
                "playing";
        };


    document.getElementById(
        "pauseMenuButton"
    ).onclick =
        showMainMenu;
}


// ============================================================
// GAME OVER
// ============================================================

function gameOver() {

    if (
        gameState ===
        "gameover"
    ) {

        return;
    }


    gameState =
        "gameover";


    createPanel(
        "GAME OVER",
        `
        <div class="game-over">

            <p>
                YOUR TANK HAS BEEN DESTROYED.
            </p>

            <p>
                KILLS: ${kills}
            </p>

            <p>
                CREDITS: ${credits}
            </p>

            <button id="gameOverNew">
                NEW RUN
            </button>

            <button id="gameOverMenu">
                MAIN MENU
            </button>

        </div>
        `
    );


    document.getElementById(
        "gameOverNew"
    ).onclick =
        startGame;


    document.getElementById(
        "gameOverMenu"
    ).onclick =
        showMainMenu;
}


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
    "resize",
    function () {

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
                1.25
            )
        );
    }
);


// ============================================================
// GAME LOOP
// ============================================================

let previousTime =
    performance.now();


function gameLoop(
    currentTime
) {

    requestAnimationFrame(
        gameLoop
    );


    let dt =
        (
            currentTime -
            previousTime
        ) / 1000;


    previousTime =
        currentTime;


    // Bescherm tegen grote FPS-dalingen.
    dt =
        Math.min(
            dt,
            0.05
        );


    if (
        gameState ===
        "playing"
    ) {

        gameTime +=
            dt;


        fireCooldown =
            Math.max(
                0,
                fireCooldown -
                dt
            );


        if (
            reloadTimer >
            0
        ) {

            reloadTimer -=
                dt;


            if (
                reloadTimer <=
                0
            ) {

                reloadTimer =
                    0;

                ammo =
                    maxAmmo;
            }
        }


        if (
            mouseDown
        ) {

            shoot();
        }


        updatePlayer(
            dt
        );


        updateTurretAim();


        updateBullets(
            dt
        );


        updateEnemies(
            dt
        );


        updateSpawning(
            dt
        );


        updateCamera();


        // Energie loopt langzaam terug en herstelt.
        energy =
            Math.min(
                100,
                energy +
                dt * 3
            );


        updateHUD();
    }


    renderer.render(
        scene,
        camera
    );
}


// ============================================================
// START
// ============================================================

showMainMenu();


gameLoop(
    performance.now()
);
