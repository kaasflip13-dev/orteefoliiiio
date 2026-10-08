"use strict";

/* =========================================================
   ECHOBOUND — THE LOST SIGNAL
   SIMPLE 2D VERSION
   ========================================================= */


/* =========================================================
   CANVAS
   ========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


/* =========================================================
   GAME
   ========================================================= */

let running = false;
let paused = false;
let lastTime = 0;

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

const camera = {
    x: 0,
    y: 0
};


/* =========================================================
   PLAYER
   ========================================================= */

const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,

    radius: 25,

    speed: 220,
    sprintSpeed: 340,

    health: 100,
    maxHealth: 100,

    energy: 100,
    maxEnergy: 100,

    angle: 0,

    weapon: 0,

    ammo: 12,

    cooldown: 0,
    reload: 0,

    resources: {
        wood: 0,
        stone: 0,
        crystal: 0,
        metal: 0
    }
};


/* =========================================================
   WEAPONS
   ========================================================= */

const weapons = [

    {
        name: "PULSE",
        damage: 25,
        speed: 800,
        cooldown: 0.25,
        ammo: 12
    },

    {
        name: "BURST",
        damage: 12,
        speed: 900,
        cooldown: 0.10,
        ammo: 24
    },

    {
        name: "CANNON",
        damage: 65,
        speed: 600,
        cooldown: 0.8,
        ammo: 5
    }

];


/* =========================================================
   INPUT
   ========================================================= */

const keys = {};

const mouse = {
    x: 0,
    y: 0,
    down: false
};


window.addEventListener("keydown", function (event) {

    keys[event.key.toLowerCase()] = true;

    if (event.key === "Escape") {
        togglePause();
    }

    if (event.key === "1") {
        changeWeapon(0);
    }

    if (event.key === "2") {
        changeWeapon(1);
    }

    if (event.key === "3") {
        changeWeapon(2);
    }

    if (event.key.toLowerCase() === "r") {
        startReload();
    }

    if (event.key.toLowerCase() === "e") {
        collectResource();
    }
});


window.addEventListener("keyup", function (event) {
    keys[event.key.toLowerCase()] = false;
});


canvas.addEventListener("mousemove", function (event) {

    const rect = canvas.getBoundingClientRect();

    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
});


canvas.addEventListener("mousedown", function () {
    mouse.down = true;
});


window.addEventListener("mouseup", function () {
    mouse.down = false;
});


/* =========================================================
   WORLD OBJECTS
   ========================================================= */

const trees = [];
const rocks = [];
const buildings = [];
const resources = [];
const aliens = [];
const bullets = [];
const particles = [];


/* =========================================================
   GAME DATA
   ========================================================= */

let kills = 0;
let credits = 100;
let score = 0;


/* =========================================================
   RANDOM
   ========================================================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}


/* =========================================================
   DISTANCE
   ========================================================= */

function distance(x1, y1, x2, y2) {

    return Math.hypot(
        x2 - x1,
        y2 - y1
    );
}


/* =========================================================
   START
   ========================================================= */

function startGame() {

    running = true;
    paused = false;

    player.x = WORLD_WIDTH / 2;
    player.y = WORLD_HEIGHT / 2;

    player.health = 100;
    player.energy = 100;

    player.weapon = 0;
    player.ammo = weapons[0].ammo;

    player.resources.wood = 0;
    player.resources.stone = 0;
    player.resources.crystal = 0;
    player.resources.metal = 0;

    kills = 0;
    credits = 100;
    score = 0;

    bullets.length = 0;
    aliens.length = 0;
    particles.length = 0;

    createWorld();
    createAliens();

    document.getElementById("menu").style.display = "none";

    document
        .getElementById("gameOverScreen")
        .classList.add("hidden");

    updateHUD();

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);
}


/* =========================================================
   CREATE WORLD
   ========================================================= */

function createWorld() {

    trees.length = 0;
    rocks.length = 0;
    buildings.length = 0;
    resources.length = 0;


    /* TREES */

    for (let i = 0; i < 180; i++) {

        trees.push({
            x: random(50, WORLD_WIDTH - 50),
            y: random(50, WORLD_HEIGHT - 50),
            size: random(22, 38)
        });
    }


    /* ROCKS */

    for (let i = 0; i < 100; i++) {

        rocks.push({
            x: random(50, WORLD_WIDTH - 50),
            y: random(50, WORLD_HEIGHT - 50),
            size: random(15, 28)
        });
    }


    /* BUILDINGS */

    const buildingPositions = [

        [700, 700],
        [1450, 850],
        [2250, 650],
        [3100, 900],
        [4100, 700],

        [800, 1800],
        [1800, 1600],
        [2800, 1850],
        [3900, 1700],

        [650, 3000],
        [1550, 3300],
        [2600, 3000],
        [3800, 3200],
        [4500, 2800],

        [1200, 4300],
        [2400, 4200],
        [3600, 4300]
    ];


    for (const position of buildingPositions) {

        buildings.push({

            x: position[0],
            y: position[1],

            width: randomInt(230, 360),
            height: randomInt(180, 280)

        });
    }


    /* RESOURCES */

    const types = [
        "wood",
        "stone",
        "crystal",
        "metal"
    ];


    for (let i = 0; i < 150; i++) {

        resources.push({

            x: random(80, WORLD_WIDTH - 80),
            y: random(80, WORLD_HEIGHT - 80),

            type: types[
                randomInt(0, types.length - 1)
            ],

            amount: randomInt(1, 3),

            radius: 15
        });
    }
}


/* =========================================================
   ALIENS
   ========================================================= */

function createAliens() {

    for (let i = 0; i < 10; i++) {
        spawnAlien();
    }
}


function spawnAlien() {

    let x;
    let y;

    do {

        x = random(100, WORLD_WIDTH - 100);
        y = random(100, WORLD_HEIGHT - 100);

    } while (
        distance(
            x,
            y,
            player.x,
            player.y
        ) < 700
    );


    const types = [
        "crawler",
        "stalker",
        "guardian"
    ];

    const type =
        types[randomInt(0, 2)];


    let health = 45;
    let speed = 60;
    let size = 22;


    if (type === "stalker") {
        health = 60;
        speed = 90;
        size = 25;
    }


    if (type === "guardian") {
        health = 110;
        speed = 40;
        size = 35;
    }


    aliens.push({

        x,
        y,

        type,

        health,
        maxHealth: health,

        speed,
        radius: size,

        attackCooldown: 0

    });
}


/* =========================================================
   CAMERA
   ========================================================= */

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
            WORLD_WIDTH - canvas.width,
            camera.x
        )
    );


    camera.y = Math.max(
        0,
        Math.min(
            WORLD_HEIGHT - canvas.height,
            camera.y
        )
    );
}


/* =========================================================
   PLAYER ANGLE
   ========================================================= */

function updatePlayerAngle() {

    const worldMouseX =
        mouse.x + camera.x;

    const worldMouseY =
        mouse.y + camera.y;


    player.angle = Math.atan2(
        worldMouseY - player.y,
        worldMouseX - player.x
    );
}


/* =========================================================
   PLAYER MOVEMENT
   ========================================================= */

function updatePlayer(dt) {

    let x = 0;
    let y = 0;


    if (keys["w"] || keys["arrowup"]) {
        y -= 1;
    }

    if (keys["s"] || keys["arrowdown"]) {
        y += 1;
    }

    if (keys["a"] || keys["arrowleft"]) {
        x -= 1;
    }

    if (keys["d"] || keys["arrowright"]) {
        x += 1;
    }


    if (x === 0 && y === 0) {

        player.energy += 15 * dt;

        player.energy = Math.min(
            player.maxEnergy,
            player.energy
        );

        return;
    }


    const length = Math.hypot(x, y);

    x /= length;
    y /= length;


    let speed = player.speed;


    if (
        keys["shift"] &&
        player.energy > 0
    ) {

        speed = player.sprintSpeed;

        player.energy -= 30 * dt;

    } else {

        player.energy += 15 * dt;
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
        x * speed * dt;

    const newY =
        player.y +
        y * speed * dt;


    if (!collidesWithBuilding(
        newX,
        player.y,
        player.radius
    )) {
        player.x = newX;
    }


    if (!collidesWithBuilding(
        player.x,
        newY,
        player.radius
    )) {
        player.y = newY;
    }


    player.x = Math.max(
        player.radius,
        Math.min(
            WORLD_WIDTH - player.radius,
            player.x
        )
    );


    player.y = Math.max(
        player.radius,
        Math.min(
            WORLD_HEIGHT - player.radius,
            player.y
        )
    );
}


/* =========================================================
   BUILDING COLLISION
   ========================================================= */

function collidesWithBuilding(x, y, radius) {

    for (const building of buildings) {

        const left =
            building.x -
            building.width / 2;

        const right =
            building.x +
            building.width / 2;

        const top =
            building.y -
            building.height / 2;

        const bottom =
            building.y +
            building.height / 2;


        const closestX =
            Math.max(
                left,
                Math.min(x, right)
            );

        const closestY =
            Math.max(
                top,
                Math.min(y, bottom)
            );


        const dx = x - closestX;
        const dy = y - closestY;


        if (
            dx * dx +
            dy * dy <
            radius * radius
        ) {
            return true;
        }
    }


    return false;
}


/* =========================================================
   SHOOTING
   ========================================================= */

function shoot() {

    if (!running || paused) {
        return;
    }

    if (player.reload > 0) {
        return;
    }

    if (player.cooldown > 0) {
        return;
    }


    if (player.ammo <= 0) {

        startReload();

        return;
    }


    const weapon =
        weapons[player.weapon];


    player.ammo--;

    player.cooldown =
        weapon.cooldown;


    const startDistance = 38;


    const startX =
        player.x +
        Math.cos(player.angle) *
        startDistance;


    const startY =
        player.y +
        Math.sin(player.angle) *
        startDistance;


    bullets.push({

        x: startX,
        y: startY,

        vx:
            Math.cos(player.angle) *
            weapon.speed,

        vy:
            Math.sin(player.angle) *
            weapon.speed,

        damage: weapon.damage,

        life: 1.5

    });


    createParticles(
        startX,
        startY,
        "#72eaff",
        5
    );
}


/* =========================================================
   RELOAD
   ========================================================= */

function startReload() {

    if (player.reload > 0) {
        return;
    }


    const weapon =
        weapons[player.weapon];


    if (player.ammo >= weapon.ammo) {
        return;
    }


    player.reload = 1.1;
}


/* =========================================================
   CHANGE WEAPON
   ========================================================= */

function changeWeapon(index) {

    if (!weapons[index]) {
        return;
    }


    player.weapon = index;

    player.ammo =
        weapons[index].ammo;


    updateHUD();
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

        const bullet = bullets[i];


        bullet.x +=
            bullet.vx * dt;

        bullet.y +=
            bullet.vy * dt;


        bullet.life -= dt;


        if (
            bullet.life <= 0 ||
            bullet.x < 0 ||
            bullet.y < 0 ||
            bullet.x > WORLD_WIDTH ||
            bullet.y > WORLD_HEIGHT
        ) {

            bullets.splice(i, 1);

            continue;
        }


        /* BUILDING HIT */

        if (
            bulletHitsBuilding(bullet)
        ) {

            createParticles(
                bullet.x,
                bullet.y,
                "#ffffff",
                5
            );

            bullets.splice(i, 1);

            continue;
        }


        /* ALIEN HIT */

        for (
            let j = aliens.length - 1;
            j >= 0;
            j--
        ) {

            const alien = aliens[j];


            const d =
                distance(
                    bullet.x,
                    bullet.y,
                    alien.x,
                    alien.y
                );


            if (
                d <
                alien.radius + 5
            ) {

                alien.health -=
                    bullet.damage;


                createParticles(
                    bullet.x,
                    bullet.y,
                    "#8cff8c",
                    8
                );


                bullets.splice(i, 1);


                if (alien.health <= 0) {

                    kills++;
                    score += 100;
                    credits += 20;


                    createParticles(
                        alien.x,
                        alien.y,
                        "#72ff88",
                        20
                    );


                    aliens.splice(j, 1);


                    if (kills % 5 === 0) {
                        spawnAlien();
                    }
                }


                break;
            }
        }
    }
}


/* =========================================================
   BULLET / BUILDING
   ========================================================= */

function bulletHitsBuilding(bullet) {

    for (const building of buildings) {

        const left =
            building.x -
            building.width / 2;

        const right =
            building.x +
            building.width / 2;

        const top =
            building.y -
            building.height / 2;

        const bottom =
            building.y +
            building.height / 2;


        if (
            bullet.x >= left &&
            bullet.x <= right &&
            bullet.y >= top &&
            bullet.y <= bottom
        ) {
            return true;
        }
    }


    return false;
}


/* =========================================================
   ALIENS
   ========================================================= */

function updateAliens(dt) {

    for (const alien of aliens) {

        alien.attackCooldown -= dt;


        const dx =
            player.x - alien.x;

        const dy =
            player.y - alien.y;

        const d =
            Math.hypot(dx, dy);


        if (d > 5 && d < 850) {

            const nx = dx / d;
            const ny = dy / d;


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
                    alien.y,
                    alien.radius
                )
            ) {
                alien.x = nextX;
            }


            if (
                !collidesWithBuilding(
                    alien.x,
                    nextY,
                    alien.radius
                )
            ) {
                alien.y = nextY;
            }
        }


        if (
            d <
            player.radius +
            alien.radius +
            8
        ) {

            if (
                alien.attackCooldown <= 0
            ) {

                player.health -=
                    alien.type === "guardian"
                        ? 15
                        : 7;

                alien.attackCooldown = 1;

                createParticles(
                    player.x,
                    player.y,
                    "#ff5555",
                    8
                );
            }
        }
    }
}


/* =========================================================
   RESOURCES
   ========================================================= */

function collectResource() {

    let closest = null;
    let closestDistance = 70;


    for (const resource of resources) {

        const d =
            distance(
                player.x,
                player.y,
                resource.x,
                resource.y
            );


        if (d < closestDistance) {

            closest = resource;
            closestDistance = d;
        }
    }


    if (!closest) {
        return;
    }


    player.resources[
        closest.type
    ] += closest.amount;


    createParticles(
        closest.x,
        closest.y,
        "#ffe66d",
        10
    );


    const index =
        resources.indexOf(closest);


    if (index !== -1) {
        resources.splice(index, 1);
    }


    updateHUD();
}


/* =========================================================
   PARTICLES
   ========================================================= */

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
            random(30, 130);


        particles.push({

            x,
            y,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            life: random(0.2, 0.6),

            size: random(2, 5),

            color
        });
    }
}


function updateParticles(dt) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            particles[i];


        particle.x +=
            particle.vx * dt;

        particle.y +=
            particle.vy * dt;


        particle.vx *= 0.95;
        particle.vy *= 0.95;


        particle.life -= dt;


        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


/* =========================================================
   DRAW
   ========================================================= */

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    ctx.fillStyle = "#16241b";

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


/* =========================================================
   GROUND
   ========================================================= */

function drawGround() {

    ctx.fillStyle = "#1b2c20";

    ctx.fillRect(
        0,
        0,
        WORLD_WIDTH,
        WORLD_HEIGHT
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.025)";

    ctx.lineWidth = 1;


    const grid = 100;


    for (
        let x = 0;
        x <= WORLD_WIDTH;
        x += grid
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);

        ctx.stroke();
    }


    for (
        let y = 0;
        y <= WORLD_HEIGHT;
        y += grid
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);

        ctx.stroke();
    }
}


/* =========================================================
   PLANTS
   ========================================================= */

function drawPlants() {

    for (let i = 0; i < 300; i++) {

        const x =
            (i * 97) %
            WORLD_WIDTH;

        const y =
            (i * 173) %
            WORLD_HEIGHT;


        ctx.fillStyle = "#315f3c";

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
   TREES
   ========================================================= */

function drawTrees() {

    for (const tree of trees) {

        /* shadow */

        ctx.fillStyle =
            "rgba(0,0,0,0.3)";

        ctx.beginPath();

        ctx.ellipse(
            tree.x,
            tree.y + 15,
            tree.size * 0.7,
            tree.size * 0.4,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /* trunk */

        ctx.fillStyle = "#60432d";

        ctx.fillRect(
            tree.x - 7,
            tree.y,
            14,
            tree.size
        );


        /* leaves */

        ctx.fillStyle = "#367348";

        ctx.beginPath();

        ctx.arc(
            tree.x,
            tree.y,
            tree.size,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle = "#4b915b";

        ctx.beginPath();

        ctx.arc(
            tree.x - 10,
            tree.y - 8,
            tree.size * 0.45,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


/* =========================================================
   ROCKS
   ========================================================= */

function drawRocks() {

    for (const rock of rocks) {

        ctx.fillStyle = "#68747a";

        ctx.beginPath();

        ctx.arc(
            rock.x,
            rock.y,
            rock.size,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle = "#8d999e";

        ctx.beginPath();

        ctx.arc(
            rock.x - 5,
            rock.y - 6,
            rock.size * 0.35,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


/* =========================================================
   BUILDINGS
   ========================================================= */

function drawBuildings() {

    for (const building of buildings) {

        const left =
            building.x -
            building.width / 2;

        const top =
            building.y -
            building.height / 2;


        /* shadow */

        ctx.fillStyle =
            "rgba(0,0,0,0.35)";

        ctx.fillRect(
            left + 10,
            top + 10,
            building.width,
            building.height
        );


        /* building */

        ctx.fillStyle = "#303b42";

        ctx.fillRect(
            left,
            top,
            building.width,
            building.height
        );


        /* border */

        ctx.strokeStyle = "#68757b";

        ctx.lineWidth = 5;

        ctx.strokeRect(
            left,
            top,
            building.width,
            building.height
        );


        /* windows */

        ctx.fillStyle = "#152026";

        const windowCount = 3;


        for (let i = 0; i < windowCount; i++) {

            ctx.fillRect(
                left + 30 + i * 70,
                top + 30,
                38,
                28
            );
        }


        /* door */

        ctx.fillStyle = "#13191c";

        ctx.fillRect(
            building.x - 25,
            top + building.height - 70,
            50,
            70
        );
    }
}


/* =========================================================
   RESOURCES DRAW
   ========================================================= */

function drawResources() {

    for (const resource of resources) {

        let color = "#ffffff";

        if (resource.type === "wood") {
            color = "#b97b43";
        }

        if (resource.type === "stone") {
            color = "#a8b1b7";
        }

        if (resource.type === "crystal") {
            color = "#9b7cff";
        }

        if (resource.type === "metal") {
            color = "#55dce8";
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


/* =========================================================
   ALIENS DRAW
   ========================================================= */

function drawAliens() {

    for (const alien of aliens) {

        let color = "#62d96d";


        if (alien.type === "stalker") {
            color = "#52d9d2";
        }


        if (alien.type === "guardian") {
            color = "#b36cf5";
        }


        /* body */

        ctx.fillStyle = color;

        ctx.beginPath();

        ctx.arc(
            alien.x,
            alien.y,
            alien.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /* eyes */

        ctx.fillStyle = "#08100b";

        ctx.beginPath();

        ctx.arc(
            alien.x - 7,
            alien.y - 5,
            4,
            0,
            Math.PI * 2
        );

        ctx.arc(
            alien.x + 7,
            alien.y - 5,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();


        /* health */

        const width =
            alien.radius * 2;


        ctx.fillStyle = "#151515";

        ctx.fillRect(
            alien.x - width / 2,
            alien.y - alien.radius - 10,
            width,
            5
        );


        ctx.fillStyle = "#65ee76";

        ctx.fillRect(
            alien.x - width / 2,
            alien.y - alien.radius - 10,
            width *
                (alien.health /
                alien.maxHealth),
            5
        );
    }
}


/* =========================================================
   PLAYER DRAW
   ========================================================= */

function drawPlayer() {

    ctx.save();

    ctx.translate(
        player.x,
        player.y
    );

    ctx.rotate(player.angle);


    /* shadow */

    ctx.fillStyle =
        "rgba(0,0,0,0.35)";

    ctx.beginPath();

    ctx.ellipse(
        0,
        15,
        38,
        20,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* tank body */

    ctx.fillStyle = "#4d5b62";

    ctx.fillRect(
        -30,
        -23,
        60,
        46
    );


    /* armor */

    ctx.fillStyle = "#718087";

    ctx.fillRect(
        -22,
        -17,
        44,
        34
    );


    /* turret */

    ctx.fillStyle = "#909da3";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        18,
        0,
        Math.PI * 2
    );

    ctx.fill();


    /* barrel */

    ctx.fillStyle = "#283238";

    ctx.fillRect(
        5,
        -5,
        38,
        10
    );


    /* core */

    ctx.fillStyle = "#62eaff";

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


/* =========================================================
   BULLETS DRAW
   ========================================================= */

function drawBullets() {

    for (const bullet of bullets) {

        ctx.fillStyle = "#75eaff";

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


/* =========================================================
   PARTICLES DRAW
   ========================================================= */

function drawParticles() {

    for (const particle of particles) {

        ctx.globalAlpha =
            Math.max(
                0,
                particle.life
            );

        ctx.fillStyle =
            particle.color;

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


/* =========================================================
   HUD
   ========================================================= */

function updateHUD() {

    const healthBar =
        document.getElementById("healthBar");

    const energyBar =
        document.getElementById("energyBar");

    const weaponText =
        document.getElementById("weaponText");

    const ammoText =
        document.getElementById("ammoText");

    const killsText =
        document.getElementById("killsText");

    const creditsText =
        document.getElementById("creditsText");

    const resourceText =
        document.getElementById("resourceText");


    healthBar.style.width =
        player.health + "%";


    energyBar.style.width =
        player.energy + "%";


    const weapon =
        weapons[player.weapon];


    weaponText.textContent =
        weapon.name;


    ammoText.textContent =
        player.ammo +
        " / " +
        weapon.ammo;


    killsText.textContent =
        "KILLS: " + kills;


    creditsText.textContent =
        "CREDITS: " + credits;


    resourceText.textContent =
        "WOOD " +
        player.resources.wood +
        " | STONE " +
        player.resources.stone +
        " | CRYSTAL " +
        player.resources.crystal +
        " | METAL " +
        player.resources.metal;
}


/* =========================================================
   NEAR RESOURCE
   ========================================================= */

function updateInteraction() {

    let nearby = false;


    for (const resource of resources) {

        if (
            distance(
                player.x,
                player.y,
                resource.x,
                resource.y
            ) < 70
        ) {

            nearby = true;
            break;
        }
    }


    const interaction =
        document.getElementById(
            "interaction"
        );


    if (nearby) {
        interaction.classList.add(
            "visible"
        );
    } else {
        interaction.classList.remove(
            "visible"
        );
    }
}


/* =========================================================
   PAUSE
   ========================================================= */

function togglePause() {

    if (!running) {
        return;
    }


    paused = !paused;


    const screen =
        document.getElementById(
            "pauseScreen"
        );


    if (paused) {
        screen.classList.remove(
            "hidden"
        );
    } else {
        screen.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   GAME OVER
   ========================================================= */

function gameOver() {

    running = false;

    document.getElementById(
        "finalScore"
    ).textContent =
        "Score: " + score;


    document.getElementById(
        "finalKills"
    ).textContent =
        "Kills: " + kills;


    document
        .getElementById("gameOverScreen")
        .classList.remove("hidden");
}


/* =========================================================
   UPDATE
   ========================================================= */

function update(dt) {

    updatePlayer(dt);

    updatePlayerAngle();

    if (mouse.down) {
        shoot();
    }


    player.cooldown =
        Math.max(
            0,
            player.cooldown - dt
        );


    if (player.reload > 0) {

        player.reload -= dt;


        if (player.reload <= 0) {

            player.reload = 0;

            player.ammo =
                weapons[player.weapon].ammo;
        }
    }


    updateBullets(dt);
    updateAliens(dt);
    updateParticles(dt);

    updateCamera();
    updateInteraction();
    updateHUD();


    if (player.health <= 0) {

        player.health = 0;

        gameOver();
    }
}


/* =========================================================
   GAME LOOP
   ========================================================= */

function gameLoop(time) {

    if (!running) {
        draw();
        return;
    }


    const dt =
        Math.min(
            (time - lastTime) / 1000,
            0.033
        );


    lastTime = time;


    if (!paused) {
        update(dt);
    }


    draw();


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================================
   MENU BUTTONS
   ========================================================= */

document
    .getElementById("startButton")
    .addEventListener(
        "click",
        startGame
    );


document
    .getElementById("resumeButton")
    .addEventListener(
        "click",
        function () {

            paused = false;

            document
                .getElementById(
                    "pauseScreen"
                )
                .classList.add("hidden");
        }
    );


document
    .getElementById("restartButton")
    .addEventListener(
        "click",
        startGame
    );


document
    .getElementById("pauseMenuButton")
    .addEventListener(
        "click",
        function () {

            running = false;
            paused = false;

            document
                .getElementById(
                    "pauseScreen"
                )
                .classList.add("hidden");

            document
                .getElementById(
                    "menu"
                )
                .style.display = "flex";
        }
    );


document
    .getElementById("gameOverMenuButton")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "gameOverScreen"
                )
                .classList.add("hidden");

            document
                .getElementById(
                    "menu"
                )
                .style.display = "flex";
        }
    );


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

document
    .getElementById("achievementsButton")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "achievementScreen"
                )
                .classList.remove(
                    "hidden"
                );
        }
    );


document
    .getElementById("closeAchievements")
    .addEventListener(
        "click",
        function () {

            document
                .getElementById(
                    "achievementScreen"
                )
                .classList.add(
                    "hidden"
                );
        }
    );


/* =========================================================
   INITIAL
   ========================================================= */

updateHUD();

console.log(
    "EchoBound 2D is ready."
);
