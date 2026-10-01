/* =========================================================
   ECHOBOUND 3D
   THE LOST SIGNAL
   ========================================================= */

import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


/* =========================================================
   BASIC SETUP
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


/* =========================================================
   THREE.JS
   ========================================================= */

const renderer =
    new THREE.WebGLRenderer({
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

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;


const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(0x071016);

scene.fog =
    new THREE.Fog(
        0x071016,
        35,
        180
    );


/* =========================================================
   CAMERA
   ========================================================= */

const camera =
    new THREE.PerspectiveCamera(
        75,
        window.innerWidth /
        window.innerHeight,
        0.1,
        500
    );

camera.position.set(
    0,
    1.7,
    8
);


/* =========================================================
   LIGHTING
   ========================================================= */

const ambient =
    new THREE.HemisphereLight(
        0x8edfff,
        0x101820,
        1.8
    );

scene.add(ambient);


const sun =
    new THREE.DirectionalLight(
        0xdff9ff,
        2.2
    );

sun.position.set(
    30,
    60,
    20
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

scene.add(sun);


/* =========================================================
   WORLD
   ========================================================= */

const worldSize = 220;

const groundGeometry =
    new THREE.PlaneGeometry(
        worldSize,
        worldSize,
        32,
        32
    );

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x101a1d,
        roughness: 0.92,
        metalness: 0.05
    });

const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
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
        worldSize,
        44,
        0x174b58,
        0x102d35
    );

grid.position.y = 0.015;

scene.add(grid);


/* =========================================================
   PLAYER
   ========================================================= */

const player = {

    position:
        new THREE.Vector3(
            0,
            1.7,
            20
        ),

    velocity:
        new THREE.Vector3(),

    health: 100,

    energy: 100,

    yaw: 0,

    pitch: 0,

    speed: 8,

    sprintSpeed: 13,

    radius: 0.65,

    kills: 0,

    credits: 0,

    ammo: 12,

    maxAmmo: 12,

    fireCooldown: 0,

    dashCooldown: 0

};


/* =========================================================
   INPUT
   ========================================================= */

const keys = {};

let mouseDown = false;

let pointerLocked = false;


window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "Space"
        ) {
            event.preventDefault();
        }

        if (
            event.code === "Escape" &&
            gameRunning
        ) {
            togglePause();
        }

        if (
            event.code === "KeyR" &&
            gameRunning
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


canvas.addEventListener(
    "mousedown",
    event => {

        if (!gameRunning) return;

        if (event.button === 0) {

            mouseDown = true;

            if (!pointerLocked) {

                canvas.requestPointerLock();

            }

            shoot();

        }

    }
);


window.addEventListener(
    "mouseup",
    event => {

        if (event.button === 0) {

            mouseDown = false;

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


document.addEventListener(
    "mousemove",
    event => {

        if (
            !gameRunning ||
            !pointerLocked
        ) {
            return;
        }

        player.yaw -=
            event.movementX * 0.0023;

        player.pitch -=
            event.movementY * 0.0018;

        player.pitch =
            Math.max(
                -1.35,
                Math.min(
                    1.35,
                    player.pitch
                )
            );

    }
);


/* =========================================================
   BUILDINGS / ROCKS / TREES
   ========================================================= */

const obstacles = [];

const enemies = [];

const bullets = [];

const enemyBullets = [];


function addObstacle(
    x,
    z,
    width,
    height,
    depth,
    color = 0x25363b
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );

    const material =
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.8,
            metalness: 0.15
        });

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        x,
        height / 2,
        z
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);

    obstacles.push({
        mesh,
        radius:
            Math.max(
                width,
                depth
            ) * 0.55
    });

    return mesh;
}


/* =========================================================
   ROCKS
   ========================================================= */

function addRock(x, z, scale = 1) {

    const geometry =
        new THREE.DodecahedronGeometry(
            1.2 * scale,
            0
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x354146,
            roughness: 1
        });

    const rock =
        new THREE.Mesh(
            geometry,
            material
        );

    rock.position.set(
        x,
        0.8 * scale,
        z
    );

    rock.rotation.y =
        Math.random() * Math.PI;

    rock.castShadow = true;

    scene.add(rock);

    obstacles.push({
        mesh: rock,
        radius: 1.5 * scale
    });

}


/* =========================================================
   TREES
   ========================================================= */

function addTree(x, z) {

    const group =
        new THREE.Group();


    const trunk =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.25,
                0.38,
                3,
                8
            ),
            new THREE.MeshStandardMaterial({
                color: 0x3b2c20
            })
        );

    trunk.position.y = 1.5;

    trunk.castShadow = true;

    group.add(trunk);


    const leaves =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                1.8,
                4,
                8
            ),
            new THREE.MeshStandardMaterial({
                color: 0x183f3a,
                roughness: 1
            })
        );

    leaves.position.y = 4;

    leaves.castShadow = true;

    group.add(leaves);


    group.position.set(
        x,
        0,
        z
    );

    scene.add(group);

    obstacles.push({
        mesh: group,
        radius: 1.5
    });

}


/* =========================================================
   WORLD GENERATION
   ========================================================= */

function generateWorld() {

    for (
        let i = 0;
        i < 45;
        i++
    ) {

        const x =
            (Math.random() - 0.5) *
            180;

        const z =
            (Math.random() - 0.5) *
            180;

        if (
            Math.abs(x) < 15 &&
            Math.abs(z - 20) < 15
        ) {
            continue;
        }

        addRock(
            x,
            z,
            0.6 +
            Math.random() * 0.9
        );

    }


    for (
        let i = 0;
        i < 28;
        i++
    ) {

        const x =
            (Math.random() - 0.5) *
            180;

        const z =
            (Math.random() - 0.5) *
            180;

        if (
            Math.abs(x) < 18 &&
            Math.abs(z - 20) < 18
        ) {
            continue;
        }

        addTree(x, z);

    }


    addObstacle(
        0,
        -25,
        18,
        5,
        2,
        0x1c3037
    );

    addObstacle(
        -25,
        -5,
        2,
        5,
        18,
        0x1c3037
    );

    addObstacle(
        30,
        18,
        14,
        4,
        2,
        0x1c3037
    );

}


generateWorld();


/* =========================================================
   SIGNAL BEACON
   ========================================================= */

const beacon =
    new THREE.Group();


const beaconPole =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.18,
            0.25,
            8,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x263b40,
            metalness: 0.7,
            roughness: 0.35
        })
    );

beaconPole.position.y = 4;

beaconPole.castShadow = true;

beacon.add(beaconPole);


const beaconLight =
    new THREE.PointLight(
        0x55e7ff,
        7,
        25
    );

beaconLight.position.y = 7;

beacon.add(beaconLight);


const beaconOrb =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            0.45,
            16,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x55e7ff,
            emissive: 0x55e7ff,
            emissiveIntensity: 5
        })
    );

beaconOrb.position.y = 7;

beacon.add(beaconOrb);

beacon.position.set(
    0,
    0,
    -70
);

scene.add(beacon);


/* =========================================================
   ENEMIES
   ========================================================= */

function createEnemy(
    x,
    z,
    type = "stalker"
) {

    const group =
        new THREE.Group();


    let size = 1;

    let color = 0x8d4e65;

    if (type === "crawler") {

        size = 0.75;

        color = 0x9c7650;

    }

    if (type === "guardian") {

        size = 1.5;

        color = 0x6e5b96;

    }


    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                size,
                12,
                10
            ),
            new THREE.MeshStandardMaterial({
                color,
                roughness: 0.65,
                metalness: 0.2
            })
        );

    body.scale.y = 1.15;

    body.castShadow = true;

    group.add(body);


    const eye =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.18 * size,
                8,
                8
            ),
            new THREE.MeshStandardMaterial({
                color: 0x55e7ff,
                emissive: 0x55e7ff,
                emissiveIntensity: 5
            })
        );

    eye.position.set(
        0,
        0.25 * size,
        -0.85 * size
    );

    group.add(eye);


    group.position.set(
        x,
        size,
        z
    );

    scene.add(group);


    const enemy = {

        mesh: group,

        type,

        health:
            type === "guardian"
                ? 100
                : type === "crawler"
                    ? 35
                    : 55,

        speed:
            type === "guardian"
                ? 1.3
                : type === "crawler"
                    ? 3.0
                    : 2.1,

        radius:
            0.8 * size,

        attackCooldown:
            Math.random() * 2,

        dead: false

    };


    enemies.push(enemy);

}


/* =========================================================
   SPAWN ENEMIES
   ========================================================= */

function spawnEnemies() {

    for (
        let i = 0;
        i < 14;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI * 2;

        const distance =
            30 +
            Math.random() * 65;

        const x =
            Math.cos(angle) *
            distance;

        const z =
            20 +
            Math.sin(angle) *
            distance;

        const roll =
            Math.random();

        let type = "stalker";

        if (roll > 0.85) {

            type = "guardian";

        } else if (roll > 0.6) {

            type = "crawler";

        }

        createEnemy(
            x,
            z,
            type
        );

    }

}


/* =========================================================
   COLLISION
   ========================================================= */

function collidesWithObstacle(
    position,
    radius
) {

    for (
        const obstacle of obstacles
    ) {

        const dx =
            position.x -
            obstacle.mesh.position.x;

        const dz =
            position.z -
            obstacle.mesh.position.z;

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
   MOVEMENT
   ========================================================= */

function updatePlayer(delta) {

    const direction =
        new THREE.Vector3();


    if (
        keys["KeyW"] ||
        keys["ArrowUp"]
    ) {

        direction.z -= 1;

    }

    if (
        keys["KeyS"] ||
        keys["ArrowDown"]
    ) {

        direction.z += 1;

    }

    if (
        keys["KeyA"] ||
        keys["ArrowLeft"]
    ) {

        direction.x -= 1;

    }

    if (
        keys["KeyD"] ||
        keys["ArrowRight"]
    ) {

        direction.x += 1;

    }


    if (
        direction.lengthSq() > 0
    ) {

        direction.normalize();


        const forward =
            new THREE.Vector3(
                Math.sin(player.yaw),
                0,
                Math.cos(player.yaw)
            );

        const right =
            new THREE.Vector3(
                Math.cos(player.yaw),
                0,
                -Math.sin(player.yaw)
            );


        const movement =
            new THREE.Vector3();


        movement.addScaledVector(
            right,
            direction.x
        );

        movement.addScaledVector(
            forward,
            direction.z
        );


        const sprint =
            keys["ShiftLeft"] ||
            keys["ShiftRight"];


        const speed =
            sprint
                ? player.sprintSpeed
                : player.speed;


        const next =
            player.position.clone();


        next.addScaledVector(
            movement,
            speed * delta
        );


        if (
            !collidesWithObstacle(
                next,
                player.radius
            )
        ) {

            player.position.copy(next);

        }

    }


    /* DASH */

    if (
        keys["Space"] &&
        player.dashCooldown <= 0 &&
        player.energy >= 25
    ) {

        const dashDirection =
            new THREE.Vector3(
                Math.sin(player.yaw),
                0,
                Math.cos(player.yaw)
            );

        const next =
            player.position.clone();

        next.addScaledVector(
            dashDirection,
            9
        );

        if (
            !collidesWithObstacle(
                next,
                player.radius
            )
        ) {

            player.position.copy(next);

        }

        player.energy -= 25;

        player.dashCooldown = 1;

    }


    player.dashCooldown -= delta;

    player.energy =
        Math.min(
            100,
            player.energy +
            delta * 7
        );


    camera.position.copy(
        player.position
    );


    camera.rotation.order =
        "YXZ";

    camera.rotation.y =
        player.yaw;

    camera.rotation.x =
        player.pitch;

}


/* =========================================================
   SHOOTING
   ========================================================= */

function shoot() {

    if (
        !gameRunning
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
        0.18;


    const direction =
        new THREE.Vector3();

    camera.getWorldDirection(
        direction
    );


    const start =
        camera.position.clone();

    start.addScaledVector(
        direction,
        1.2
    );


    const geometry =
        new THREE.SphereGeometry(
            0.09,
            8,
            8
        );


    const material =
        new THREE.MeshBasicMaterial({
            color: 0x55e7ff
        });


    const bullet =
        new THREE.Mesh(
            geometry,
            material
        );


    bullet.position.copy(
        start
    );


    scene.add(bullet);


    bullets.push({

        mesh: bullet,

        velocity:
            direction
                .clone()
                .multiplyScalar(45),

        life: 2

    });


    updateHUD();

}


function reload() {

    player.ammo =
        player.maxAmmo;

    updateHUD();

}


/* =========================================================
   BULLETS
   ========================================================= */

function updateBullets(delta) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        bullet.mesh.position.addScaledVector(
            bullet.velocity,
            delta
        );


        bullet.life -= delta;


        let remove = false;


        if (
            bullet.life <= 0
        ) {

            remove = true;

        }


        if (
            collidesWithObstacle(
                bullet.mesh.position,
                0.1
            )
        ) {

            remove = true;

        }


        for (
            const enemy of enemies
        ) {

            if (
                enemy.dead
            ) {
                continue;
            }


            const distance =
                bullet.mesh.position.distanceTo(
                    enemy.mesh.position
                );


            if (
                distance <
                enemy.radius + 0.25
            ) {

                enemy.health -= 30;

                remove = true;


                if (
                    enemy.health <= 0
                ) {

                    killEnemy(enemy);

                }

                break;

            }

        }


        if (remove) {

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
   KILL ENEMY
   ========================================================= */

function killEnemy(enemy) {

    enemy.dead = true;

    scene.remove(
        enemy.mesh
    );

    player.kills++;

    player.credits +=
        enemy.type === "guardian"
            ? 100
            : enemy.type === "crawler"
                ? 30
                : 50;


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


    updateHUD();

}


/* =========================================================
   ENEMY AI
   ========================================================= */

function updateEnemies(delta) {

    for (
        const enemy of enemies
    ) {

        if (
            enemy.dead
        ) {
            continue;
        }


        const toPlayer =
            new THREE.Vector3()
                .subVectors(
                    player.position,
                    enemy.mesh.position
                );


        const distance =
            toPlayer.length();


        if (
            distance > 180
        ) {
            continue;
        }


        if (
            distance > 2.5
        ) {

            toPlayer.normalize();


            const next =
                enemy.mesh.position.clone();


            next.addScaledVector(
                toPlayer,
                enemy.speed * delta
            );


            if (
                !collidesWithObstacle(
                    next,
                    enemy.radius
                )
            ) {

                enemy.mesh.position.copy(
                    next
                );

            }

        } else {

            player.health -=
                delta *
                (
                    enemy.type === "guardian"
                        ? 12
                        : 7
                );

        }


        enemy.mesh.lookAt(
            player.position.x,
            enemy.mesh.position.y,
            player.position.z
        );

    }


    player.health =
        Math.max(
            0,
            player.health
        );


    if (
        player.health <= 0
    ) {

        gameOver();

    }

}


/* =========================================================
   GAME OVER
   ========================================================= */

function gameOver() {

    gameRunning = false;

    document.exitPointerLock();

    saveGame();

    hud.style.display = "none";

    menu.style.display = "flex";

    alert(
        "RUN ENDED\n\n" +
        "KILLS: " +
        player.kills +
        "\nCREDITS: " +
        player.credits
    );

}


/* =========================================================
   GAME STATE
   ========================================================= */

let gameRunning = false;

let paused = false;


/* =========================================================
   NEW GAME
   ========================================================= */

function newGame() {

    player.position.set(
        0,
        1.7,
        20
    );

    player.health = 100;

    player.energy = 100;

    player.kills = 0;

    player.credits = 0;

    player.ammo = 12;

    player.yaw = 0;

    player.pitch = 0;


    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.mesh
        );

    }

    enemies.length = 0;


    for (
        const bullet of bullets
    ) {

        scene.remove(
            bullet.mesh
        );

    }

    bullets.length = 0;


    spawnEnemies();


    menu.style.display = "none";

    hud.style.display = "block";

    pause.style.display = "none";


    gameRunning = true;

    paused = false;


    updateHUD();


    canvas.requestPointerLock();

}


/* =========================================================
   SAVE
   ========================================================= */

function saveGame() {

    const data = {

        x: player.position.x,

        y: player.position.y,

        z: player.position.z,

        health: player.health,

        energy: player.energy,

        kills: player.kills,

        credits: player.credits,

        ammo: player.ammo,

        yaw: player.yaw,

        pitch: player.pitch

    };


    localStorage.setItem(
        "echobound_3d_save",
        JSON.stringify(data)
    );

}


/* =========================================================
   LOAD
   ========================================================= */

function loadGame() {

    const raw =
        localStorage.getItem(
            "echobound_3d_save"
        );


    if (!raw) {

        alert(
            "Geen opgeslagen run gevonden."
        );

        return;

    }


    try {

        const data =
            JSON.parse(raw);


        player.position.set(
            data.x || 0,
            data.y || 1.7,
            data.z || 20
        );


        player.health =
            data.health ?? 100;

        player.energy =
            data.energy ?? 100;

        player.kills =
            data.kills ?? 0;

        player.credits =
            data.credits ?? 0;

        player.ammo =
            data.ammo ?? 12;

        player.yaw =
            data.yaw ?? 0;

        player.pitch =
            data.pitch ?? 0;


        enemies.forEach(
            enemy =>
                scene.remove(
                    enemy.mesh
                )
        );

        enemies.length = 0;

        spawnEnemies();


        menu.style.display = "none";

        hud.style.display = "block";

        gameRunning = true;

        paused = false;


        updateHUD();

        canvas.requestPointerLock();


    } catch (error) {

        alert(
            "De save kon niet worden geladen."
        );

    }

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

    const kills =
        document.getElementById(
            "kills"
        );

    const credits =
        document.getElementById(
            "credits"
        );

    const ammo =
        document.getElementById(
            "ammo"
        );


    if (healthBar) {

        healthBar.style.width =
            Math.max(
                0,
                player.health
            ) + "%";

    }


    if (energyBar) {

        energyBar.style.width =
            Math.max(
                0,
                player.energy
            ) + "%";

    }


    if (kills) {

        kills.textContent =
            "KILLS: " +
            player.kills;

    }


    if (credits) {

        credits.textContent =
            "CREDITS: " +
            player.credits;

    }


    if (ammo) {

        ammo.textContent =
            player.ammo +
            " / ∞";

    }

}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

function showAchievement(name) {

    const nameElement =
        document.getElementById(
            "achievementName"
        );


    nameElement.textContent =
        name;


    achievement.style.display =
        "block";


    setTimeout(
        () => {

            achievement.style.display =
                "none";

        },
        3500
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


    pause.style.display =
        paused
            ? "flex"
            : "none";


    if (paused) {

        document.exitPointerLock();

    } else {

        canvas.requestPointerLock();

    }

}


document
    .getElementById("resume")
    .addEventListener(
        "click",
        () => {

            paused = false;

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

            gameRunning = false;

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
                "ECHObound CONTROLS\n\n" +

                "W A S D = Bewegen\n" +

                "Muis = Rondkijken\n" +

                "Linkermuisknop = Schieten\n" +

                "R = Herladen\n" +

                "SHIFT = Sprint\n" +

                "SPACE = Dash\n" +

                "ESC = Pauze"
            );

        }
    );


document
    .getElementById(
        "achievementsButtonGame"
    )
    .addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "achievementsButton"
                )
                .click();

        }
    );


document
    .getElementById(
        "achievementsButton"
    )
    .addEventListener(
        "click",
        () => {

            alert(
                "ECHObound ACHIEVEMENTS\n\n" +

                "FIRST ECHO\n" +
                "Kill your first enemy.\n\n" +

                "ECHO HUNTER\n" +
                "Kill 10 enemies."
            );

        }
    );


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


    const ctx =
        mapCanvas.getContext(
            "2d"
        );


    mapCanvas.width = 800;

    mapCanvas.height = 500;


    ctx.fillStyle =
        "#061016";

    ctx.fillRect(
        0,
        0,
        800,
        500
    );


    ctx.strokeStyle =
        "#174b58";

    for (
        let x = 0;
        x < 800;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            500
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y < 500;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            800,
            y
        );

        ctx.stroke();

    }


    const px =
        400 +
        player.position.x * 2;


    const pz =
        250 +
        player.position.z * 2;


    ctx.fillStyle =
        "#55e7ff";

    ctx.beginPath();

    ctx.arc(
        px,
        pz,
        7,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
        "#9a5c75";


    enemies.forEach(
        enemy => {

            if (enemy.dead) {
                return;
            }


            const x =
                400 +
                enemy.mesh.position.x * 2;


            const z =
                250 +
                enemy.mesh.position.z * 2;


            ctx.beginPath();

            ctx.arc(
                x,
                z,
                5,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }
    );

}


document
    .getElementById("closeMap")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "map"
                )
                .style.display =
                "none";

        }
    );


/* M = MAP */

window.addEventListener(
    "keydown",
    event => {

        if (
            event.code === "KeyM" &&
            gameRunning &&
            !paused
        ) {

            openMap();

            document.exitPointerLock();

        }

    }
);


/* =========================================================
   SHOOTING LOOP
   ========================================================= */

function updateShooting(delta) {

    player.fireCooldown -=
        delta;


    if (
        mouseDown &&
        pointerLocked
    ) {

        shoot();

    }

}


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
   CLOCK
   ========================================================= */

const clock =
    new THREE.Clock();


/* =========================================================
   ANIMATION
   ========================================================= */

function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    beaconOrb.rotation.y +=
        delta;


    beaconLight.intensity =
        6 +
        Math.sin(
            performance.now() *
            0.004
        ) * 2;


    if (
        gameRunning &&
        !paused
    ) {

        updatePlayer(delta);

        updateBullets(delta);

        updateEnemies(delta);

        updateShooting(delta);

        updateHUD();

    }


    renderer.render(
        scene,
        camera
    );

}


animate();
