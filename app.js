```javascript
/* ============================================================
   ECHOBOUND — THE LOST SIGNAL
   2D VERSION
   ============================================================ */

"use strict";

/* ============================================================
   CANVAS
   ============================================================ */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});


/* ============================================================
   WORLD
   ============================================================ */

const WORLD_W = 7000;
const WORLD_H = 7000;

const world = {
    trees: [],
    rocks: [],
    plants: [],
    buildings: [],
    aliens: [],
    bullets: [],
    particles: [],
    resources: []
};


/* ============================================================
   GAME STATE
   ============================================================ */

let gameRunning = false;
let paused = false;
let gameOver = false;

let lastTime = 0;

let score = 0;
let credits = 100;
let kills = 0;

let wave = 1;


/* ============================================================
   PLAYER
   ============================================================ */

const player = {
    x: WORLD_W / 2,
    y: WORLD_H / 2,

    radius: 28,

    speed: 250,
    sprintSpeed: 360,

    health: 100,
    maxHealth: 100,

    energy: 100,
    maxEnergy: 100,

    angle: 0,

    weapon: 0,

    ammo: 12,
    maxAmmo: 12,

    reloadTime: 0,

    shootCooldown: 0,

    resources: {
        wood: 0,
        stone: 0,
        crystal: 0,
        metal: 0
    }
};


/* ============================================================
   WEAPONS
   ============================================================ */

const weapons = [
    {
        name: "PULSE",
        damage: 20,
        speed: 800,
        cooldown: 0.22,
        maxAmmo: 12,
        color: "#64eaff"
    },

    {
        name: "BURST",
        damage: 12,
        speed: 900,
        cooldown: 0.10,
        maxAmmo: 24,
        color: "#ffffff"
    },

    {
        name: "CANNON",
        damage: 55,
        speed: 650,
        cooldown: 0.75,
        maxAmmo: 5,
        color: "#ffb347"
    }
];


/* ============================================================
   INPUT
   ============================================================ */

const keys = {};

window.addEventListener("keydown", (event) => {

    keys[event.key.toLowerCase()] = true;

    if (event.key === "Escape") {
        togglePause();
    }

    if (event.key === "1") {
        selectWeapon(0);
    }

    if (event.key === "2") {
        selectWeapon(1);
    }

    if (event.key === "3") {
        selectWeapon(2);
    }

    if (event.key.toLowerCase() === "r") {
        reload();
    }

    if (event.key.toLowerCase() === "e") {
        collectNearbyResource();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});


/* ============================================================
   MOUSE
   ============================================================ */

const mouse = {
    x: 0,
    y: 0,
    down: false
};

canvas.addEventListener("mousemove", (event) => {

    const rect = canvas.getBoundingClientRect();

    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;

    updatePlayerAngle();
});

canvas.addEventListener("mousedown", () => {
    mouse.down = true;
});

canvas.addEventListener("mouseup", () => {
    mouse.down = false;
});

canvas.addEventListener("mouseleave", () => {
    mouse.down = false;
});


/* ============================================================
   CAMERA
   ============================================================ */

const camera = {
    x: 0,
    y: 0
};


/* ============================================================
   RANDOM HELPERS
   ============================================================ */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function distance(a, b) {

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
}


/* ============================================================
   WORLD GENERATION
   ============================================================ */

function generateWorld() {

    world.trees = [];
    world.rocks = [];
    world.plants = [];
    world.buildings = [];
    world.aliens = [];
    world.resources = [];

    /* TREES */

    for (let i = 0; i < 280; i++) {

        const tree = {
            x: random(100, WORLD_W - 100),
            y: random(100, WORLD_H - 100),
            radius: random(25, 42)
        };

        if (distance(tree, player) > 250) {
            world.trees.push(tree);
        }
    }


    /* ROCKS */

    for (let i = 0; i < 190; i++) {

        world.rocks.push({
            x: random(100, WORLD_W - 100),
            y: random(100, WORLD_H - 100),
            radius: random(18, 35)
        });
    }


    /* PLANTS */

    for (let i = 0; i < 500; i++) {

        world.plants.push({
            x: random(50, WORLD_W - 50),
            y: random(50, WORLD_H - 50),
            size: random(4, 10)
        });
    }


    /* BUILDINGS */

    const positions = [
        [900, 800],
        [1700, 1200],
        [2600, 850],
        [3500, 1300],
        [4700, 900],
        [5600, 1500],

        [800, 2500],
        [1800, 3000],
        [2900, 2500],
        [4100, 2900],
        [5300, 2600],

        [1000, 4200],
        [2200, 4600],
        [3400, 4100],
        [4600, 4500],
        [5700, 4200],

        [1500, 5700],
        [3000, 5500],
        [4500, 5800]
    ];

    for (const [x, y] of positions) {

        world.buildings.push({
            x,
            y,
            width: randomInt(260, 420),
            height: randomInt(220, 340)
        });
    }


    /* RESOURCES */

    for (let i = 0; i < 250; i++) {

        const types = [
            "wood",
            "stone",
            "crystal",
            "metal"
        ];

        world.resources.push({
            x: random(100, WORLD_W - 100),
            y: random(100, WORLD_H - 100),
            type: types[randomInt(0, types.length - 1)],
            amount: randomInt(1, 4),
            radius: 18
        });
    }


    /* ALIENS */

    for (let i = 0; i < 9; i++) {
        spawnAlien();
    }
}


/* ============================================================
   ALIEN SPAWNING
   ============================================================ */

function spawnAlien() {

    let x;
    let y;

    do {

        x = random(200, WORLD_W - 200);
        y = random(200, WORLD_H - 200);

    } while (
        Math.hypot(
            x - player.x,
            y - player.y
        ) < 800
    );


    const types = [
        "crawler",
        "guardian",
        "stalker"
    ];

    const type = types[randomInt(0, types.length - 1)];


    world.aliens.push({

        x,
        y,

        radius: type === "guardian" ? 34 : 25,

        type,

        health:
            type === "guardian"
                ? 100
                : type === "stalker"
                    ? 60
                    : 45,

        maxHealth:
            type === "guardian"
                ? 100
                : type === "stalker"
                    ? 60
                    : 45,

        speed:
            type === "guardian"
                ? 45
                : type === "stalker"
                    ? 95
                    : 70,

        damage:
            type === "guardian"
                ? 18
                : type === "stalker"
                    ? 10
                    : 7,

        attackCooldown: random(0, 1),

        wanderAngle: random(0, Math.PI * 2)
    });
}


/* ============================================================
   START GAME
   ============================================================ */

function startGame() {

    gameRunning = true;
    paused = false;
    gameOver = false;

    player.x = WORLD_W / 2;
    player.y = WORLD_H / 2;

    player.health = player.maxHealth;
    player.energy = player.maxEnergy;

    player.weapon = 0;
    player.ammo = weapons[0].maxAmmo;

    score = 0;
    credits = 100;
    kills = 0;
    wave = 1;

    world.bullets = [];
    world.particles = [];

    generateWorld();

    updateMenu();

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);
}


/* ============================================================
   MENU
   ============================================================ */

function updateMenu() {

    const menu = document.getElementById("menu");

    if (!menu) return;

    menu.style.display = gameRunning ? "none" : "flex";
}


/* ============================================================
   PAUSE
   ============================================================ */

function togglePause() {

    if (!gameRunning || gameOver) return;

    paused = !paused;

    const pauseMenu = document.getElementById("pause");

    if (pauseMenu) {
        pauseMenu.style.display = paused ? "flex" : "none";
    }
}


/* ============================================================
   WEAPON
   ============================================================ */

function selectWeapon(index) {

    if (!weapons[index]) return;

    player.weapon = index;

    player.ammo = Math.min(
        player.ammo,
        weapons[index].maxAmmo
    );
}


/* ============================================================
   RELOAD
   ============================================================ */

function reload() {

    if (player.reloadTime > 0) return;

    const weapon = weapons[player.weapon];

    if (player.ammo >= weapon.maxAmmo) return;

    player.reloadTime = 1.2;
}


/* ============================================================
   PLAYER AIM
   ============================================================ */

function updatePlayerAngle() {

    const worldMouseX = mouse.x + camera.x;
    const worldMouseY = mouse.y + camera.y;

    player.angle = Math.atan2(
        worldMouseY - player.y,
        worldMouseX - player.x
    );
}


/* ============================================================
   SHOOT
   ============================================================ */

function shoot() {

    if (!gameRunning || paused || gameOver) return;

    if (player.reloadTime > 0) return;

    if (player.shootCooldown > 0) return;

    if (player.ammo <= 0) {

        reload();

        return;
    }

    const weapon = weapons[player.weapon];

    player.ammo--;

    player.shootCooldown = weapon.cooldown;


    const muzzleDistance = 38;

    const startX =
        player.x +
        Math.cos(player.angle) *
        muzzleDistance;

    const startY =
        player.y +
        Math.sin(player.angle) *
        muzzleDistance;


    world.bullets.push({

        x: startX,
        y: startY,

        vx:
            Math.cos(player.angle) *
            weapon.speed,

        vy:
            Math.sin(player.angle) *
            weapon.speed,

        damage: weapon.damage,

        life: 1.5,

        color: weapon.color
    });


    createParticles(
        startX,
        startY,
        weapon.color,
        5
    );
}


/* ============================================================
   PLAYER MOVEMENT
   ============================================================ */

function movePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"]) {
        dy -= 1;
    }

    if (keys["s"] || keys["arrowdown"]) {
        dy += 1;
    }

    if (keys["a"] || keys["arrowleft"]) {
        dx -= 1;
    }

    if (keys["d"] || keys["arrowright"]) {
        dx += 1;
    }


    if (dx !== 0 || dy !== 0) {

        const length = Math.hypot(dx, dy);

        dx /= length;
        dy /= length;

        let speed = player.speed;

        if (
            keys["shift"] &&
            player.energy > 0
        ) {

            speed = player.sprintSpeed;

            player.energy -= 25 * dt;

        } else {

            player.energy += 12 * dt;
        }

        player.energy = Math.max(
            0,
            Math.min(
                player.maxEnergy,
                player.energy
            )
        );


        const newX =
            player.x +
            dx * speed * dt;

        const newY =
            player.y +
            dy * speed * dt;


        if (!collidesWithBuilding(newX, player.y)) {
            player.x = newX;
        }

        if (!collidesWithBuilding(player.x, newY)) {
            player.y = newY;
        }
    }


    player.x = Math.max(
        player.radius,
        Math.min(
            WORLD_W - player.radius,
            player.x
        )
    );

    player.y = Math.max(
        player.radius,
        Math.min(
            WORLD_H - player.radius,
            player.y
        )
    );
}


/* ============================================================
   BUILDING COLLISION
   ============================================================ */

function collidesWithBuilding(x, y) {

    for (const building of world.buildings) {

        const closestX = Math.max(
            building.x - building.width / 2,
            Math.min(
                x,
                building.x + building.width / 2
            )
        );

        const closestY = Math.max(
            building.y - building.height / 2,
            Math.min(
                y,
                building.y + building.height / 2
            )
        );

        const dx = x - closestX;
        const dy = y - closestY;

        if (
            dx * dx +
            dy * dy <
            player.radius *
            player.radius
        ) {
            return true;
        }
    }

    return false;
}


/* ============================================================
   ALIEN UPDATE
   ============================================================ */

function updateAliens(dt) {

    for (const alien of world.aliens) {

        alien.attackCooldown -= dt;

        const dx = player.x - alien.x;
        const dy = player.y - alien.y;

        const dist = Math.hypot(dx, dy);


        if (dist < 650) {

            const nx = dx / dist;
            const ny = dy / dist;

            const nextX =
                alien.x +
                nx *
                alien.speed *
                dt;

            const nextY =
                alien.y +
                ny *
                alien.speed *
                dt;


            if (
                !collidesWithBuilding(
                    nextX,
                    alien.y
                )
            ) {
                alien.x = nextX;
            }

            if (
                !collidesWithBuilding(
                    alien.x,
                    nextY
                )
            ) {
                alien.y = nextY;
            }


            if (
                dist <
                alien.radius +
                player.radius +
                8
            ) {

                if (
                    alien.attackCooldown <= 0
                ) {

                    player.health -= alien.damage;

                    alien.attackCooldown = 1;

                    createParticles(
                        player.x,
                        player.y,
                        "#ff5c5c",
                        8
                    );
                }
            }

        } else {

            alien.wanderAngle +=
                random(-1, 1) *
                dt;

            alien.x +=
                Math.cos(alien.wanderAngle) *
                alien.speed *
                0.15 *
                dt;

            alien.y +=
                Math.sin(alien.wanderAngle) *
                alien.speed *
                0.15 *
                dt;
        }


        alien.x = Math.max(
            40,
            Math.min(
                WORLD_W - 40,
                alien.x
            )
        );

        alien.y = Math.max(
            40,
            Math.min(
                WORLD_H - 40,
                alien.y
            )
        );
    }
}


/* ============================================================
   BULLETS
   ============================================================ */

function updateBullets(dt) {

    for (
        let i = world.bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet = world.bullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        bullet.life -= dt;


        if (
            bullet.life <= 0 ||
            bullet.x < 0 ||
            bullet.y < 0 ||
            bullet.x > WORLD_W ||
            bullet.y > WORLD_H
        ) {

            world.bullets.splice(i, 1);

            continue;
        }


        if (
            bulletHitsBuilding(bullet)
        ) {

            createParticles(
                bullet.x,
                bullet.y,
                bullet.color,
                4
            );

            world.bullets.splice(i, 1);

            continue;
        }


        for (
            let j = world.aliens.length - 1;
            j >= 0;
            j--
        ) {

            const alien = world.aliens[j];

            const d = Math.hypot(
                bullet.x - alien.x,
                bullet.y - alien.y
            );


            if (d < alien.radius + 7) {

                alien.health -= bullet.damage;

                createParticles(
                    bullet.x,
                    bullet.y,
                    bullet.color,
                    6
                );

                world.bullets.splice(i, 1);


                if (alien.health <= 0) {

                    kills++;
                    score += 100;
                    credits += 20;

                    createParticles(
                        alien.x,
                        alien.y,
                        "#8cff66",
                        20
                    );

                    world.aliens.splice(j, 1);
                }

                break;
            }
        }
    }
}


/* ============================================================
   BUILDING BULLET COLLISION
   ============================================================ */

function bulletHitsBuilding(bullet) {

    for (const building of world.buildings) {

        if (
            bullet.x >
                building.x -
                building.width / 2 &&
            bullet.x <
                building.x +
                building.width / 2 &&
            bullet.y >
                building.y -
                building.height / 2 &&
            bullet.y <
                building.y +
                building.height / 2
        ) {

            return true;
        }
    }

    return false;
}


/* ============================================================
   RESOURCES
   ============================================================ */

function collectNearbyResource() {

    for (
        let i = world.resources.length - 1;
        i >= 0;
        i--
    ) {

        const resource = world.resources[i];

        if (
            distance(player, resource) < 70
        ) {

            player.resources[
                resource.type
            ] += resource.amount;

            createParticles(
                resource.x,
                resource.y,
                "#ffe66d",
                10
            );

            world.resources.splice(i, 1);

            return;
        }
    }
}


/* ============================================================
   PARTICLES
   ============================================================ */

function createParticles(
    x,
    y,
    color,
    amount
) {

    for (let i = 0; i < amount; i++) {

        const angle =
            random(0, Math.PI * 2);

        const speed =
            random(30, 150);

        world.particles.push({

            x,
            y,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            life: random(0.25, 0.7),

            maxLife: 0.7,

            size: random(2, 5),

            color
        });
    }
}


/* ============================================================
   PARTICLE UPDATE
   ============================================================ */

function updateParticles(dt) {

    for (
        let i = world.particles.length - 1;
        i >= 0;
        i--
    ) {

        const p = world.particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= 0.96;
        p.vy *= 0.96;

        p.life -= dt;


        if (p.life <= 0) {
            world.particles.splice(i, 1);
        }
    }
}


/* ============================================================
   CAMERA UPDATE
   ============================================================ */

function updateCamera() {

    camera.x =
        player.x -
        canvas.width / 2;

    camera.y =
        player.y -
        canvas.height / 2;


    camera.x = Math.max(
        0,
        Math.min(
            WORLD_W - canvas.width,
            camera.x
        )
    );

    camera.y = Math.max(
        0,
        Math.min(
            WORLD_H - canvas.height,
            camera.y
        )
    );
}


/* ============================================================
   DRAW WORLD
   ============================================================ */

function drawWorld() {

    ctx.fillStyle = "#16221b";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    ctx.save();

    ctx.translate(
        -camera.x,
        -camera.y
    );


    drawGround();
    drawPlants();
    drawResources();
    drawBuildings();
    drawRocks();
    drawTrees();
    drawAliens();
    drawBullets();
    drawPlayer();
    drawParticles();


    ctx.restore();
}


/* ============================================================
   GROUND
   ============================================================ */

function drawGround() {

    const grid = 100;

    ctx.strokeStyle =
        "rgba(255,255,255,0.025)";

    ctx.lineWidth = 1;


    for (
        let x = 0;
        x <= WORLD_W;
        x += grid
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_H);

        ctx.stroke();
    }


    for (
        let y = 0;
        y <= WORLD_H;
        y += grid
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_W, y);

        ctx.stroke();
    }
}


/* ============================================================
   PLANTS
   ============================================================ */

function drawPlants() {

    for (const plant of world.plants) {

        ctx.fillStyle = "#3e7d45";

        ctx.beginPath();

        ctx.arc(
            plant.x,
            plant.y,
            plant.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


/* ============================================================
   TREES
   ============================================================ */

function drawTrees() {

    for (const tree of world.trees) {

        ctx.fillStyle = "#263d29";

        ctx.beginPath();

        ctx.arc(
            tree.x,
            tree.y + 12,
            tree.radius * 0.55,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle = "#397447";

        ctx.beginPath();

        ctx.arc(
            tree.x,
            tree.y,
            tree.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle = "#4e9257";

        ctx.beginPath();

        ctx.arc(
            tree.x - tree.radius * 0.25,
            tree.y - tree.radius * 0.2,
            tree.radius * 0.42,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


/* ============================================================
   ROCKS
   ============================================================ */

function drawRocks() {

    for (const rock of world.rocks) {

        ctx.fillStyle = "#69747b";

        ctx.beginPath();

        ctx.arc(
            rock.x,
            rock.y,
            rock.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle = "#8b969d";

        ctx.beginPath();

        ctx.arc(
            rock.x - 6,
            rock.y - 7,
            rock.radius * 0.35,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


/* ============================================================
   RESOURCES
   ============================================================ */

function drawResources() {

    for (const resource of world.resources) {

        let color = "#ffffff";

        if (resource.type === "wood") {
            color = "#b4773e";
        }

        if (resource.type === "stone") {
            color = "#a7b0b7";
        }

        if (resource.type === "crystal") {
            color = "#8d7cff";
        }

        if (resource.type === "metal") {
            color = "#5ee7ff";
        }


        ctx.fillStyle = color;

        ctx.beginPath();

        ctx.arc(
            resource.x,
            resource.y,
            resource.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle =
            "rgba(255,255,255,0.4)";

        ctx.stroke();
    }
}


/* ============================================================
   BUILDINGS
   ============================================================ */

function drawBuildings() {

    for (const building of world.buildings) {

        const left =
            building.x -
            building.width / 2;

        const top =
            building.y -
            building.height / 2;


        ctx.fillStyle = "#242d35";

        ctx.fillRect(
            left,
            top,
            building.width,
            building.height
        );


        ctx.strokeStyle = "#65717a";

        ctx.lineWidth = 5;

        ctx.strokeRect(
            left,
            top,
            building.width,
            building.height
        );


        ctx.fillStyle = "#11171c";

        ctx.fillRect(
            building.x - 35,
            top + 20,
            70,
            35
        );


        ctx.fillStyle = "#0d1216";

        ctx.fillRect(
            building.x - 28,
            building.y + 15,
            56,
            60
        );
    }
}


/* ============================================================
   ALIENS
   ============================================================ */

function drawAliens() {

    for (const alien of world.aliens) {

        let bodyColor = "#62d96b";

        if (alien.type === "guardian") {
            bodyColor = "#c56cff";
        }

        if (alien.type === "stalker") {
            bodyColor = "#55e0dc";
        }


        ctx.fillStyle = bodyColor;

        ctx.beginPath();

        ctx.arc(
            alien.x,
            alien.y,
            alien.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /* EYES */

        ctx.fillStyle = "#07100a";

        ctx.beginPath();

        ctx.arc(
            alien.x - 8,
            alien.y - 5,
            4,
            0,
            Math.PI * 2
        );

        ctx.arc(
            alien.x + 8,
            alien.y - 5,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /* HEALTH BAR */

        const barWidth = alien.radius * 2;

        ctx.fillStyle = "#151515";

        ctx.fillRect(
            alien.x - barWidth / 2,
            alien.y - alien.radius - 12,
            barWidth,
            5
        );


        ctx.fillStyle = "#72ff72";

        ctx.fillRect(
            alien.x - barWidth / 2,
            alien.y - alien.radius - 12,
            barWidth *
                (alien.health / alien.maxHealth),
            5
        );
    }
}


/* ============================================================
   PLAYER
   ============================================================ */

function drawPlayer() {

    ctx.save();

    ctx.translate(
        player.x,
        player.y
    );

    ctx.rotate(player.angle);


    /* SHADOW */

    ctx.fillStyle =
        "rgba(0,0,0,0.35)";

    ctx.beginPath();

    ctx.ellipse(
        0,
        12,
        34,
        18,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* TANK BODY */

    ctx.fillStyle = "#53616a";

    ctx.fillRect(
        -28,
        -22,
        56,
        44
    );


    /* ARMOR */

    ctx.fillStyle = "#75858e";

    ctx.fillRect(
        -21,
        -17,
        42,
        34
    );


    /* TURRET */

    ctx.fillStyle = "#8e9ca3";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        18,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* BARREL */

    ctx.fillStyle = "#313a40";

    ctx.fillRect(
        8,
        -5,
        34,
        10
    );


    /* ENERGY CORE */

    ctx.fillStyle = "#61eaff";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        6,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.restore();
}


/* ============================================================
   BULLETS DRAW
   ============================================================ */

function drawBullets() {

    for (const bullet of world.bullets) {

        ctx.fillStyle = bullet.color;

        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


/* ============================================================
   PARTICLES DRAW
   ============================================================ */

function drawParticles() {

    for (const p of world.particles) {

        ctx.globalAlpha =
            Math.max(
                0,
                p.life / p.maxLife
            );

        ctx.fillStyle = p.color;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


/* ============================================================
   HUD
   ============================================================ */

function drawHUD() {

    const health =
        Math.max(
            0,
            player.health
        );

    const energy =
        Math.max(
            0,
            player.energy
        );


    ctx.fillStyle =
        "rgba(8,12,16,0.88)";

    ctx.fillRect(
        20,
        20,
        280,
        125
    );


    /* HEALTH */

    ctx.fillStyle = "#222";

    ctx.fillRect(
        35,
        40,
        230,
        18
    );

    ctx.fillStyle = "#ff5656";

    ctx.fillRect(
        35,
        40,
        230 *
            (health / player.maxHealth),
        18
    );


    /* ENERGY */

    ctx.fillStyle = "#222";

    ctx.fillRect(
        35,
        70,
        230,
        14
    );

    ctx.fillStyle = "#4fdcff";

    ctx.fillRect(
        35,
        70,
        230 *
            (energy / player.maxEnergy),
        14
    );


    ctx.fillStyle = "#ffffff";

    ctx.font = "16px Arial";

    ctx.fillText(
        `HP ${Math.ceil(health)}`,
        35,
        34
    );

    ctx.fillText(
        `ENERGY ${Math.ceil(energy)}`,
        35,
        101
    );


    const weapon =
        weapons[player.weapon];

    ctx.fillText(
        `${weapon.name}  ${player.ammo}/${weapon.maxAmmo}`,
        35,
        128
    );


    ctx.fillText(
        `KILLS ${kills}`,
        canvas.width - 180,
        35
    );

    ctx.fillText(
        `CREDITS ${credits}`,
        canvas.width - 180,
        60
    );

    ctx.fillText(
        `WAVE ${wave}`,
        canvas.width - 180,
        85
    );
}


/* ============================================================
   GAME OVER
   ============================================================ */

function checkGameOver() {

    if (player.health > 0) return;

    player.health = 0;

    gameOver = true;
    gameRunning = false;


    const menu =
        document.getElementById("menu");

    if (menu) {

        menu.style.display = "flex";

        const title =
            menu.querySelector("h1");

        if (title) {
            title.textContent =
                "ECHObOUND — GAME OVER";
        }
    }
}


/* ============================================================
   MAIN GAME LOOP
   ============================================================ */

function gameLoop(timestamp) {

    if (!gameRunning) return;

    const dt =
        Math.min(
            (timestamp - lastTime) / 1000,
            0.033
        );

    lastTime = timestamp;


    if (!paused && !gameOver) {

        player.shootCooldown =
            Math.max(
                0,
                player.shootCooldown - dt
            );


        if (player.reloadTime > 0) {

            player.reloadTime -= dt;

            if (player.reloadTime <= 0) {

                player.reloadTime = 0;

                player.ammo =
                    weapons[player.weapon]
                        .maxAmmo;
            }
        }


        movePlayer(dt);


        if (mouse.down) {
            shoot();
        }


        updateAliens(dt);
        updateBullets(dt);
        updateParticles(dt);

        updateCamera();

        checkGameOver();
    }


    drawWorld();
    drawHUD();


    if (paused) {

        ctx.fillStyle =
            "rgba(0,0,0,0.55)";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle = "#ffffff";

        ctx.font = "48px Arial";

        ctx.textAlign = "center";

        ctx.fillText(
            "PAUSED",
            canvas.width / 2,
            canvas.height / 2
        );

        ctx.textAlign = "left";
    }


    requestAnimationFrame(gameLoop);
}


/* ============================================================
   START BUTTON
   ============================================================ */

const startButton =
    document.getElementById("startButton");

if (startButton) {

    startButton.addEventListener(
        "click",
        () => {
            startGame();
        }
    );
}


/* ============================================================
   OPTIONAL MENU BUTTONS
   ============================================================ */

const resumeButton =
    document.getElementById("resumeButton");

if (resumeButton) {

    resumeButton.addEventListener(
        "click",
        () => {
            paused = false;

            const pauseMenu =
                document.getElementById("pause");

            if (pauseMenu) {
                pauseMenu.style.display = "none";
            }
        }
    );
}


/* ============================================================
   INITIAL MENU
   ============================================================ */

updateMenu();


/* ============================================================
   INITIAL CAMERA
   ============================================================ */

updateCamera();


/* ============================================================
   DEBUG
   ============================================================ */

console.log(
    "EchoBound 2D JavaScript loaded successfully."
);
```
