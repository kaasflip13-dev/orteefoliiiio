// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// SIMPLE TANK CONTROLS
// ============================================================

import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";


// ============================================================
// HTML
// ============================================================

const canvas = document.getElementById("game");

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const gameOverScreen = document.getElementById("gameOver");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const healthBar = document.getElementById("healthBar");
const energyBar = document.getElementById("energyBar");

const ammoText = document.getElementById("ammo");
const killsText = document.getElementById("kills");


// ============================================================
// RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false,
    powerPreference: "high-performance"
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);


// ============================================================
// SCENE
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x071015);

scene.fog = new THREE.Fog(
    0x071015,
    100,
    300
);


// ============================================================
// CAMERA
// ============================================================

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);


// ============================================================
// LIGHT
// ============================================================

const skyLight = new THREE.HemisphereLight(
    0xbdeaff,
    0x182020,
    2
);

scene.add(skyLight);


const sun = new THREE.DirectionalLight(
    0xffffff,
    1.8
);

sun.position.set(
    50,
    100,
    50
);

scene.add(sun);


// ============================================================
// GAME VARIABLES
// ============================================================

let gameRunning = false;

let health = 100;

let energy = 100;

let ammo = 20;

let kills = 0;


// ============================================================
// WORLD
// ============================================================

const WORLD_SIZE = 400;

const buildings = [];

const enemies = [];

const bullets = [];


// ============================================================
// GROUND
// ============================================================

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(
        WORLD_SIZE,
        WORLD_SIZE
    ),
    new THREE.MeshStandardMaterial({
        color: 0x263536,
        roughness: 1
    })
);

ground.rotation.x = -Math.PI / 2;

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

    const road = new THREE.Mesh(
        new THREE.BoxGeometry(
            width,
            0.03,
            depth
        ),
        new THREE.MeshBasicMaterial({
            color: 0x151d20
        })
    );

    road.position.set(
        x,
        0.02,
        z
    );

    scene.add(road);
}


createRoad(
    0,
    0,
    25,
    WORLD_SIZE
);


createRoad(
    0,
    0,
    WORLD_SIZE,
    25
);


// ============================================================
// BUILDINGS
// ============================================================

function createBuilding(
    x,
    z,
    width,
    depth,
    height
) {

    const building = new THREE.Mesh(
        new THREE.BoxGeometry(
            width,
            height,
            depth
        ),
        new THREE.MeshStandardMaterial({
            color: 0x39474b,
            roughness: 0.9
        })
    );

    building.position.set(
        x,
        height / 2,
        z
    );

    scene.add(building);

    buildings.push({
        mesh: building,
        x: x,
        z: z,
        width: width,
        depth: depth
    });
}


createBuilding(
    -70,
    -70,
    35,
    30,
    18
);

createBuilding(
    60,
    -70,
    40,
    35,
    22
);

createBuilding(
    -75,
    65,
    30,
    45,
    16
);

createBuilding(
    65,
    65,
    45,
    30,
    20
);

createBuilding(
    0,
    -115,
    60,
    25,
    14
);

createBuilding(
    115,
    0,
    25,
    55,
    17
);

createBuilding(
    -115,
    0,
    25,
    55,
    17
);


// ============================================================
// TREES
// ============================================================

function createTree(
    x,
    z
) {

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(
            1.2,
            1.5,
            5,
            6
        ),
        new THREE.MeshStandardMaterial({
            color: 0x4b3627
        })
    );

    trunk.position.set(
        x,
        2.5,
        z
    );

    scene.add(trunk);


    const crown = new THREE.Mesh(
        new THREE.SphereGeometry(
            4,
            8,
            6
        ),
        new THREE.MeshStandardMaterial({
            color: 0x294d3a
        })
    );

    crown.position.set(
        x,
        7,
        z
    );

    scene.add(crown);
}


const treePositions = [
    [-30, -45],
    [35, -35],
    [-40, 40],
    [40, 40],
    [-130, -100],
    [130, -100],
    [-130, 100],
    [130, 100],
    [100, 110],
    [-100, 110]
];


for (
    const position of treePositions
) {

    createTree(
        position[0],
        position[1]
    );

}


// ============================================================
// PLAYER / TANK
// ============================================================

const player = new THREE.Group();

scene.add(player);


// ============================================================
// TANK BODY
// ============================================================

const tankBody = new THREE.Mesh(
    new THREE.BoxGeometry(
        5.5,
        1.7,
        7
    ),
    new THREE.MeshStandardMaterial({
        color: 0x50656a,
        roughness: 0.75
    })
);

tankBody.position.y = 1.5;

player.add(tankBody);


// ============================================================
// TANK TOP
// ============================================================

const tankTop = new THREE.Mesh(
    new THREE.BoxGeometry(
        4.2,
        1.2,
        4.2
    ),
    new THREE.MeshStandardMaterial({
        color: 0x34474c
    })
);

tankTop.position.y = 2.8;

player.add(tankTop);


// ============================================================
// TRACKS
// ============================================================

const trackMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x151b1d
    });


const leftTrack = new THREE.Mesh(
    new THREE.BoxGeometry(
        1.4,
        1.8,
        7.5
    ),
    trackMaterial
);

leftTrack.position.set(
    -3.3,
    1.1,
    0
);

player.add(leftTrack);


const rightTrack =
    leftTrack.clone();

rightTrack.position.x = 3.3;

player.add(rightTrack);


// ============================================================
// TURRET
// ============================================================

const turret = new THREE.Group();

turret.position.y = 3.6;

player.add(turret);


// ============================================================
// TURRET BODY
// ============================================================

const turretBody = new THREE.Mesh(
    new THREE.CylinderGeometry(
        2.1,
        2.3,
        1.2,
        12
    ),
    new THREE.MeshStandardMaterial({
        color: 0x65777b
    })
);

turret.add(turretBody);


// ============================================================
// CANNON
// ============================================================

const cannon = new THREE.Mesh(
    new THREE.CylinderGeometry(
        0.35,
        0.45,
        7,
        8
    ),
    new THREE.MeshStandardMaterial({
        color: 0x1c272a
    })
);

cannon.rotation.x =
    Math.PI / 2;

cannon.position.z = -4;

turret.add(cannon);


// ============================================================
// MUZZLE
// ============================================================

const muzzle =
    new THREE.Object3D();

muzzle.position.set(
    0,
    0,
    -7.5
);

turret.add(muzzle);


// ============================================================
// PLAYER START
// ============================================================

player.position.set(
    0,
    0,
    0
);


// ============================================================
// KEYBOARD
// ============================================================

const keys = {};

window.addEventListener(
    "keydown",
    function(event) {

        keys[
            event.key.toLowerCase()
        ] = true;

    }
);


window.addEventListener(
    "keyup",
    function(event) {

        keys[
            event.key.toLowerCase()
        ] = false;

    }
);


// ============================================================
// MOUSE
// ============================================================

const mouse =
    new THREE.Vector2();


window.addEventListener(
    "mousemove",
    function(event) {

        mouse.x =
            (event.clientX /
                window.innerWidth) *
            2 - 1;

        mouse.y =
            -(event.clientY /
                window.innerHeight) *
            2 + 1;

    }
);


// ============================================================
// RAYCASTER
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


// ============================================================
// MOUSE WORLD POSITION
// ============================================================

function getMouseWorldPosition() {

    raycaster.setFromCamera(
        mouse,
        camera
    );


    const point =
        new THREE.Vector3();


    raycaster.ray.intersectPlane(
        groundPlane,
        point
    );


    return point;
}


// ============================================================
// TURRET AIM
// ============================================================

function aimTurret() {

    if (!gameRunning) {

        return;

    }


    const target =
        getMouseWorldPosition();


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


// ============================================================
// BUILDING COLLISION
// ============================================================

function collidesWithBuilding(
    position,
    radius
) {

    for (
        const building of buildings
    ) {

        const minX =
            building.x -
            building.width / 2 -
            radius;


        const maxX =
            building.x +
            building.width / 2 +
            radius;


        const minZ =
            building.z -
            building.depth / 2 -
            radius;


        const maxZ =
            building.z +
            building.depth / 2 +
            radius;


        if (
            position.x > minX &&
            position.x < maxX &&
            position.z > minZ &&
            position.z < maxZ
        ) {

            return true;

        }

    }


    return false;
}


// ============================================================
// TANK MOVEMENT
// ============================================================

function movePlayer(delta) {

    /*
        NIEUWE BESTURING:

        W = vooruit
        S = achteruit
        A = links draaien
        D = rechts draaien
    */


    const forward =
        keys["w"] === true;


    const backward =
        keys["s"] === true;


    const turnLeft =
        keys["a"] === true;


    const turnRight =
        keys["d"] === true;


    // ----------------------------
    // DRAAIEN
    // ----------------------------

    let turnAmount = 0;


    if (turnLeft) {

        turnAmount -= 1;

    }


    if (turnRight) {

        turnAmount += 1;

    }


    const turnSpeed = 2.2;


    player.rotation.y +=
        turnAmount *
        turnSpeed *
        delta;


    // ----------------------------
    // RIJDEN
    // ----------------------------

    let moveAmount = 0;


    if (forward) {

        moveAmount += 1;

    }


    if (backward) {

        moveAmount -= 1;

    }


    if (moveAmount !== 0) {

        const speed =
            moveAmount > 0
                ? 20
                : 10;


        /*
            Three.js kijkt standaard
            voorwaarts richting -Z.
        */

        const direction =
            new THREE.Vector3(
                0,
                0,
                -1
            );


        direction.applyQuaternion(
            player.quaternion
        );


        const nextPosition =
            player.position.clone();


        nextPosition.add(
            direction.multiplyScalar(
                speed *
                moveAmount *
                delta
            )
        );


        if (
            !collidesWithBuilding(
                nextPosition,
                3.5
            )
        ) {

            player.position.copy(
                nextPosition
            );

        }

    }


    // ----------------------------
    // MAP RAND
    // ----------------------------

    player.position.x =
        THREE.MathUtils.clamp(
            player.position.x,
            -190,
            190
        );


    player.position.z =
        THREE.MathUtils.clamp(
            player.position.z,
            -190,
            190
        );

}


// ============================================================
// SHOOT
// ============================================================

function shoot() {

    if (!gameRunning) {

        return;

    }


    if (ammo <= 0) {

        return;

    }


    ammo--;

    updateHUD();


    const start =
        new THREE.Vector3();


    muzzle.getWorldPosition(
        start
    );


    const target =
        getMouseWorldPosition();


    const direction =
        target
            .clone()
            .sub(start)
            .normalize();


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.35,
                6,
                6
            ),
            new THREE.MeshBasicMaterial({
                color: 0x66eaff
            })
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

        life: 2

    });

}


// ============================================================
// LEFT CLICK
// ============================================================

window.addEventListener(
    "mousedown",
    function(event) {

        if (
            event.button === 0
        ) {

            shoot();

        }

    }
);


// ============================================================
// ENEMY
// ============================================================

function createEnemy(
    x,
    z
) {

    const enemy =
        new THREE.Group();


    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                2.5,
                8,
                6
            ),
            new THREE.MeshStandardMaterial({
                color: 0x6d3d8c
            })
        );


    body.position.y = 2.5;

    enemy.add(
        body
    );


    const eye =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.45,
                6,
                6
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff3344
            })
        );


    eye.position.set(
        0,
        2.7,
        -2.2
    );


    enemy.add(
        eye
    );


    enemy.position.set(
        x,
        0,
        z
    );


    scene.add(
        enemy
    );


    enemies.push({

        mesh: enemy,

        health: 3,

        speed: 4

    });

}


// ============================================================
// INITIAL ENEMIES
// ============================================================

function createInitialEnemies() {

    createEnemy(
        40,
        40
    );


    createEnemy(
        -45,
        35
    );


    createEnemy(
        55,
        -45
    );


    createEnemy(
        -50,
        -45
    );


    createEnemy(
        100,
        25
    );

}


// ============================================================
// ENEMY UPDATE
// ============================================================

function updateEnemies(delta) {

    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy =
            enemies[i];


        const direction =
            player.position
                .clone()
                .sub(
                    enemy.mesh.position
                );


        direction.y = 0;


        const distance =
            direction.length();


        if (
            distance > 7
        ) {

            direction.normalize();


            const nextPosition =
                enemy.mesh.position.clone();


            nextPosition.x +=
                direction.x *
                enemy.speed *
                delta;


            nextPosition.z +=
                direction.z *
                enemy.speed *
                delta;


            if (
                !collidesWithBuilding(
                    nextPosition,
                    2.5
                )
            ) {

                enemy.mesh.position.copy(
                    nextPosition
                );

            }

        }
        else {

            health -=
                15 *
                delta;


            if (
                health <= 0
            ) {

                health = 0;

                endGame();

            }

        }

    }

}


// ============================================================
// BULLETS
// ============================================================

function updateBullets(delta) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        bullet.mesh.position.add(
            bullet.direction
                .clone()
                .multiplyScalar(
                    70 *
                    delta
                )
        );


        bullet.life -=
            delta;


        let removeBullet =
            bullet.life <= 0;


        // ----------------------------
        // BUILDING
        // ----------------------------

        if (
            collidesWithBuilding(
                bullet.mesh.position,
                0.3
            )
        ) {

            removeBullet = true;

        }


        // ----------------------------
        // ENEMY
        // ----------------------------

        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy =
                enemies[j];


            const distance =
                bullet.mesh.position
                    .distanceTo(
                        enemy.mesh.position
                    );


            if (
                distance < 3
            ) {

                enemy.health--;

                removeBullet = true;


                if (
                    enemy.health <= 0
                ) {

                    scene.remove(
                        enemy.mesh
                    );


                    enemies.splice(
                        j,
                        1
                    );


                    kills++;


                    killsText.textContent =
                        kills;


                    spawnEnemy();

                }


                break;

            }

        }


        if (
            removeBullet
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


// ============================================================
// SPAWN ENEMY
// ============================================================

function spawnEnemy() {

    if (
        enemies.length >= 8
    ) {

        return;

    }


    const angle =
        Math.random() *
        Math.PI *
        2;


    const distance = 80;


    const x =
        player.position.x +
        Math.cos(angle) *
        distance;


    const z =
        player.position.z +
        Math.sin(angle) *
        distance;


    createEnemy(
        THREE.MathUtils.clamp(
            x,
            -170,
            170
        ),

        THREE.MathUtils.clamp(
            z,
            -170,
            170
        )
    );

}


// ============================================================
// CAMERA
// ============================================================

function updateCamera() {

    /*
        Camera blijft altijd
        achter de tank.
    */

    const offset =
        new THREE.Vector3(
            0,
            12,
            20
        );


    offset.applyQuaternion(
        player.quaternion
    );


    const wantedPosition =
        player.position
            .clone()
            .add(
                offset
            );


    camera.position.lerp(
        wantedPosition,
        0.12
    );


    const lookAt =
        player.position.clone();


    lookAt.y = 2;


    camera.lookAt(
        lookAt
    );

}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    healthBar.style.width =
        Math.max(
            0,
            health
        ) + "%";


    energyBar.style.width =
        Math.max(
            0,
            energy
        ) + "%";


    ammoText.textContent =
        ammo;


    killsText.textContent =
        kills;

}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    health = 100;

    energy = 100;

    ammo = 20;

    kills = 0;


    player.position.set(
        0,
        0,
        0
    );


    player.rotation.set(
        0,
        0,
        0
    );


    // Remove bullets

    for (
        const bullet of bullets
    ) {

        scene.remove(
            bullet.mesh
        );

    }


    bullets.length = 0;


    // Remove enemies

    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.mesh
        );

    }


    enemies.length = 0;


    createInitialEnemies();


    gameRunning = true;


    menu.classList.add(
        "hidden"
    );


    gameOverScreen.classList.add(
        "hidden"
    );


    hud.style.display =
        "block";


    updateHUD();

}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    if (!gameRunning) {

        return;

    }


    gameRunning = false;


    hud.style.display =
        "none";


    gameOverScreen.classList.remove(
        "hidden"
    );


    document.getElementById(
        "gameOverText"
    ).textContent =
        "Je hebt " +
        kills +
        " monsters vernietigd.";

}


// ============================================================
// BUTTONS
// ============================================================

startButton.addEventListener(
    "click",
    function() {

        startGame();

    }
);


restartButton.addEventListener(
    "click",
    function() {

        startGame();

    }
);


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
    "resize",
    function() {

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
                1.5
            )
        );

    }
);


// ============================================================
// GAME LOOP
// ============================================================

let lastTime =
    performance.now();


function gameLoop(
    currentTime
) {

    requestAnimationFrame(
        gameLoop
    );


    let delta =
        (
            currentTime -
            lastTime
        ) / 1000;


    lastTime =
        currentTime;


    delta =
        Math.min(
            delta,
            0.05
        );


    if (gameRunning) {

        movePlayer(
            delta
        );


        aimTurret();


        updateBullets(
            delta
        );


        updateEnemies(
            delta
        );


        updateCamera();


        updateHUD();

    }
    else {

        updateCamera();

    }


    renderer.render(
        scene,
        camera
    );

}


// ============================================================
// START
// ============================================================

createInitialEnemies();

updateCamera();

updateHUD();

gameLoop(
    performance.now()
);
