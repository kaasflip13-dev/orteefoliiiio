/* =========================================================
   SIGNALWAKE
   A completely new 2D game concept
   No libraries required
   ========================================================= */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");


// =========================================================
// SCREEN ELEMENTS
// =========================================================

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const hud = document.getElementById("hud");

const saveScreen = document.getElementById("saveScreen");
const achievementScreen = document.getElementById("achievementScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const continueButton = document.getElementById("continueButton");
const saveButton = document.getElementById("saveButton");

const achievementButton =
    document.getElementById("achievementButton");

const closeAchievements =
    document.getElementById("closeAchievements");

const backSave =
    document.getElementById("backSave");

const resumeButton =
    document.getElementById("resumeButton");

const pauseSaveButton =
    document.getElementById("pauseSaveButton");

const pauseMenuButton =
    document.getElementById("pauseMenuButton");

const restartButton =
    document.getElementById("restartButton");

const gameOverMenuButton =
    document.getElementById("gameOverMenuButton");


// =========================================================
// HUD
// =========================================================

const healthBar =
    document.getElementById("healthBar");

const energyBar =
    document.getElementById("energyBar");

const phaseText =
    document.getElementById("phaseText");

const shardText =
    document.getElementById("shardText");

const resonatorText =
    document.getElementById("resonatorText");

const signalText =
    document.getElementById("signalText");

const objective =
    document.getElementById("objective");


// =========================================================
// CANVAS
// =========================================================

function resizeCanvas() {

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();


// =========================================================
// WORLD
// =========================================================

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;

const world = {
    seed: Math.random() * 100000
};


// =========================================================
// GAME STATE
// =========================================================

let running = false;
let paused = false;
let gameOver = false;

let selectedSave = 0;

let phase = 0;

let score = 0;

let lastTime = performance.now();

let pulseRadius = 0;
let pulseActive = false;

let camera = {
    x: 0,
    y: 0
};


// =========================================================
// PLAYER
// =========================================================

const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,

    radius: 18,

    speed: 210,

    health: 100,
    maxHealth: 100,

    energy: 100,
    maxEnergy: 100,

    shards: 0,

    resonators: 0,

    signal: 0,

    invincible: 0,

    moving: false
};


// =========================================================
// INPUT
// =========================================================

const keys = {};

window.addEventListener("keydown", event => {

    keys[event.key.toLowerCase()] = true;

    if (event.key === "Escape") {

        if (running && !gameOver) {

            paused = !paused;

            pauseScreen.classList.toggle(
                "hidden",
                !paused
            );
        }
    }

    if (event.code === "Space") {

        event.preventDefault();

        usePulse();
    }

    if (event.key.toLowerCase() === "q") {

        changePhase();
    }

    if (event.key.toLowerCase() === "e") {

        buildResonator();
    }
});

window.addEventListener("keyup", event => {

    keys[event.key.toLowerCase()] = false;
});


// =========================================================
// WORLD OBJECTS
// =========================================================

const shards = [];
const creatures = [];
const nodes = [];
const gates = [];
const resonators = [];
const particles = [];
const echoes = [];


// =========================================================
// RANDOM HELPERS
// =========================================================

function random(min, max) {

    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {

    return Math.floor(random(min, max + 1));
}

function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}


// =========================================================
// WORLD GENERATION
// =========================================================

function generateWorld() {

    shards.length = 0;
    creatures.length = 0;
    nodes.length = 0;
    gates.length = 0;
    resonators.length = 0;
    particles.length = 0;
    echoes.length = 0;


    // Energy shards
    for (let i = 0; i < 90; i++) {

        shards.push({
            x: random(100, WORLD_WIDTH - 100),
            y: random(100, WORLD_HEIGHT - 100),

            radius: random(5, 9),

            value: randomInt(1, 3),

            phase: randomInt(0, 1),

            collected: false,

            angle: random(0, Math.PI * 2)
        });
    }


    // Resonance nodes
    for (let i = 0; i < 18; i++) {

        nodes.push({
            x: random(300, WORLD_WIDTH - 300),
            y: random(300, WORLD_HEIGHT - 300),

            radius: 28,

            activated: false,

            phase: randomInt(0, 1),

            power: random(1, 4)
        });
    }


    // Phase gates
    for (let i = 0; i < 24; i++) {

        gates.push({
            x: random(200, WORLD_WIDTH - 200),
            y: random(200, WORLD_HEIGHT - 200),

            width: random(50, 110),

            height: random(50, 110),

            phase: randomInt(0, 1)
        });
    }


    // Creatures
    for (let i = 0; i < 28; i++) {

        let x;
        let y;

        do {

            x = random(100, WORLD_WIDTH - 100);
            y = random(100, WORLD_HEIGHT - 100);

        } while (
            Math.hypot(
                x - player.x,
                y - player.y
            ) < 500
        );

        creatures.push({

            x,
            y,

            radius: random(13, 22),

            speed: random(40, 75),

            health: 3,

            alert: 0,

            phase: randomInt(0, 1),

            wobble: random(0, 10)
        });
    }
}


// =========================================================
// RESET PLAYER
// =========================================================

function resetPlayer() {

    player.x = WORLD_WIDTH / 2;
    player.y = WORLD_HEIGHT / 2;

    player.health = player.maxHealth;

    player.energy = player.maxEnergy;

    player.shards = 0;

    player.resonators = 0;

    player.signal = 0;

    player.invincible = 0;

    score = 0;

    phase = 0;
}


// =========================================================
// START GAME
// =========================================================

function startGame() {

    menu.classList.add("hidden");

    saveScreen.classList.add("hidden");

    achievementScreen.classList.add("hidden");

    pauseScreen.classList.add("hidden");

    gameOverScreen.classList.add("hidden");

    game.style.display = "block";

    hud.style.display = "block";

    resetPlayer();

    generateWorld();

    running = true;

    paused = false;

    gameOver = false;

    lastTime = performance.now();

    objective.textContent =
        "Find a Resonance Node and activate it.";

    requestAnimationFrame(gameLoop);
}


// =========================================================
// RETURN MENU
// =========================================================

function returnToMenu() {

    running = false;

    paused = false;

    gameOver = false;

    game.style.display = "none";

    hud.style.display = "none";

    saveScreen.classList.add("hidden");

    achievementScreen.classList.add("hidden");

    pauseScreen.classList.add("hidden");

    gameOverScreen.classList.add("hidden");

    menu.classList.remove("hidden");
}


// =========================================================
// PHASE SHIFT
// =========================================================

function changePhase() {

    if (!running || paused || gameOver) {
        return;
    }

    if (player.energy < 15) {
        return;
    }

    player.energy -= 15;

    phase = phase === 0 ? 1 : 0;

    createBurst(
        player.x,
        player.y,
        25
    );

    checkAchievements();
}


// =========================================================
// PULSE
// =========================================================

function usePulse() {

    if (!running || paused || gameOver) {
        return;
    }

    if (pulseActive) {
        return;
    }

    if (player.energy < 20) {
        return;
    }

    player.energy -= 20;

    pulseActive = true;

    pulseRadius = 0;

    score += 5;

    // The pulse makes creatures hear you.
    for (const creature of creatures) {

        const d = distance(player, creature);

        if (d < 900) {

            creature.alert = 5;
        }
    }

    createBurst(
        player.x,
        player.y,
        45
    );

    unlock("firstPulse");
}


// =========================================================
// RESONATOR
// =========================================================

function buildResonator() {

    if (!running || paused || gameOver) {
        return;
    }

    if (player.shards < 5) {
        objective.textContent =
            "You need 5 Echo Shards to build a Resonator.";

        return;
    }

    player.shards -= 5;

    player.resonators++;

    resonators.push({

        x: player.x,
        y: player.y,

        radius: 25,

        power: 0,

        active: true
    });

    createBurst(
        player.x,
        player.y,
        30
    );

    objective.textContent =
        "Resonator deployed. Stay nearby to amplify it.";

    unlock("builder");
}


// =========================================================
// PARTICLES
// =========================================================

function createBurst(x, y, amount) {

    for (let i = 0; i < amount; i++) {

        const angle =
            random(0, Math.PI * 2);

        const speed =
            random(30, 160);

        particles.push({

            x,
            y,

            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,

            life: random(0.4, 1),

            size: random(2, 5)
        });
    }
}


// =========================================================
// UPDATE
// =========================================================

function update(dt) {

    updatePlayer(dt);

    updateCreatures(dt);

    updateShards(dt);

    updateResonators(dt);

    updateParticles(dt);

    updatePulse(dt);

    updateEchoes(dt);

    updateCamera();

    checkNodes();

    updateHUD();

    if (player.health <= 0) {

        endGame();
    }
}


// =========================================================
// PLAYER
// =========================================================

function updatePlayer(dt) {

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


    const moving =
        dx !== 0 ||
        dy !== 0;

    player.moving = moving;


    if (moving) {

        const length =
            Math.hypot(dx, dy);

        dx /= length;
        dy /= length;

        let speed =
            player.speed;

        if (keys["shift"]) {

            speed *= 1.65;

            player.energy -= 10 * dt;

            if (player.energy < 0) {
                player.energy = 0;
            }
        }

        player.x += dx * speed * dt;
        player.y += dy * speed * dt;

        player.x =
            Math.max(
                30,
                Math.min(
                    WORLD_WIDTH - 30,
                    player.x
                )
            );

        player.y =
            Math.max(
                30,
                Math.min(
                    WORLD_HEIGHT - 30,
                    player.y
                )
            );


        // Create a memory echo behind you.
        if (Math.random() < dt * 5) {

            echoes.push({

                x: player.x,
                y: player.y,

                life: 2
            });
        }
    }


    // Regenerate resonance.
    if (!keys["shift"]) {

        player.energy += 12 * dt;
    }

    player.energy =
        Math.min(
            player.maxEnergy,
            player.energy
        );


    if (player.invincible > 0) {

        player.invincible -= dt;
    }
}


// =========================================================
// CREATURES
// =========================================================

function updateCreatures(dt) {

    for (const creature of creatures) {

        if (creature.health <= 0) {
            continue;
        }

        creature.wobble += dt;


        // Creatures only exist in their own phase.
        if (creature.phase !== phase) {
            continue;
        }


        const d =
            distance(
                creature,
                player
            );


        // Pulse alert
        if (creature.alert > 0) {

            creature.alert -= dt;
        }


        let targetX = creature.x;
        let targetY = creature.y;


        if (
            d < 550 ||
            creature.alert > 0
        ) {

            targetX = player.x;
            targetY = player.y;
        }
        else {

            targetX =
                creature.x +
                Math.cos(creature.wobble) *
                40;

            targetY =
                creature.y +
                Math.sin(creature.wobble * 0.7) *
                40;
        }


        const dx =
            targetX - creature.x;

        const dy =
            targetY - creature.y;

        const len =
            Math.hypot(dx, dy);


        if (len > 1) {

            creature.x +=
                (dx / len) *
                creature.speed *
                dt;

            creature.y +=
                (dy / len) *
                creature.speed *
                dt;
        }


        if (
            d <
            creature.radius +
            player.radius +
            5
        ) {

            if (player.invincible <= 0) {

                player.health -= 15;

                player.invincible = 0.8;

                createBurst(
                    player.x,
                    player.y,
                    12
                );
            }
        }
    }
}


// =========================================================
// SHARDS
// =========================================================

function updateShards(dt) {

    for (const shard of shards) {

        if (shard.collected) {
            continue;
        }

        shard.angle += dt;


        if (shard.phase !== phase) {
            continue;
        }


        const d =
            distance(
                player,
                shard
            );


        if (d < 40) {

            shard.collected = true;

            player.shards +=
                shard.value;

            score +=
                shard.value * 10;

            createBurst(
                shard.x,
                shard.y,
                8
            );

            unlock("collector");
        }
    }
}


// =========================================================
// RESONATORS
// =========================================================

function updateResonators(dt) {

    for (const resonator of resonators) {

        const d =
            distance(
                player,
                resonator
            );

        if (d < 280) {

            resonator.power += dt * 20;

            player.signal +=
                dt * 4;

            if (player.signal > 100) {
                player.signal = 100;
            }

            score += dt * 2;
        }
    }
}


// =========================================================
// NODES
// =========================================================

function checkNodes() {

    for (const node of nodes) {

        if (node.activated) {
            continue;
        }

        if (node.phase !== phase) {
            continue;
        }

        const d =
            distance(
                player,
                node
            );


        if (d < 80) {

            node.activated = true;

            player.signal += 12;

            score += 100;

            createBurst(
                node.x,
                node.y,
                35
            );

            objective.textContent =
                "Node activated. Search for another signal.";

            unlock("node");

            const total =
                nodes.filter(
                    n => n.activated
                ).length;

            if (total >= 5) {

                objective.textContent =
                    "Five nodes awakened. The world is listening.";

                unlock("fiveNodes");
            }
        }
    }
}


// =========================================================
// PULSE UPDATE
// =========================================================

function updatePulse(dt) {

    if (!pulseActive) {
        return;
    }

    pulseRadius +=
        1000 * dt;


    if (pulseRadius > 950) {

        pulseActive = false;

        pulseRadius = 0;
    }
}


// =========================================================
// PARTICLE UPDATE
// =========================================================

function updateParticles(dt) {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.life -= dt;

        p.vx *= 0.97;
        p.vy *= 0.97;


        if (p.life <= 0) {

            particles.splice(i, 1);
        }
    }
}


// =========================================================
// ECHOES
// =========================================================

function updateEchoes(dt) {

    for (let i = echoes.length - 1; i >= 0; i--) {

        echoes[i].life -= dt;

        if (echoes[i].life <= 0) {

            echoes.splice(i, 1);
        }
    }
}


// =========================================================
// CAMERA
// =========================================================

function updateCamera() {

    camera.x =
        player.x -
        canvas.width / 2;

    camera.y =
        player.y -
        canvas.height / 2;


    camera.x =
        Math.max(
            0,
            Math.min(
                WORLD_WIDTH - canvas.width,
                camera.x
            )
        );

    camera.y =
        Math.max(
            0,
            Math.min(
                WORLD_HEIGHT - canvas.height,
                camera.y
            )
        );
}


// =========================================================
// DRAW
// =========================================================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    drawWorld();

    drawGates();

    drawNodes();

    drawShards();

    drawResonators();

    drawCreatures();

    drawEchoes();

    drawPlayer();

    drawParticles();

    drawPulse();

    drawVignette();
}


// =========================================================
// WORLD
// =========================================================

function drawWorld() {

    ctx.fillStyle =
        phase === 0
            ? "#081217"
            : "#120b19";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const grid = 100;

    const startX =
        Math.floor(camera.x / grid) * grid;

    const startY =
        Math.floor(camera.y / grid) * grid;


    ctx.lineWidth = 1;


    for (
        let x = startX;
        x < camera.x + canvas.width + grid;
        x += grid
    ) {

        for (
            let y = startY;
            y < camera.y + canvas.height + grid;
            y += grid
        ) {

            const sx = x - camera.x;
            const sy = y - camera.y;

            const value =
                Math.sin(
                    x * 0.012 +
                    y * 0.007
                );


            ctx.strokeStyle =
                phase === 0
                    ? `rgba(70,130,145,${0.035 + Math.abs(value) * 0.025})`
                    : `rgba(155,80,160,${0.035 + Math.abs(value) * 0.025})`;

            ctx.strokeRect(
                sx,
                sy,
                grid,
                grid
            );
        }
    }


    // Organic terrain marks
    for (
        let x = startX;
        x < camera.x + canvas.width + grid;
        x += 150
    ) {

        for (
            let y = startY;
            y < camera.y + canvas.height + grid;
            y += 150
        ) {

            const sx =
                x - camera.x + 35;

            const sy =
                y - camera.y + 50;

            ctx.beginPath();

            ctx.arc(
                sx,
                sy,
                2 + Math.abs(
                    Math.sin(x * 0.1)
                ) * 4,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                phase === 0
                    ? "rgba(100,160,165,0.16)"
                    : "rgba(180,100,185,0.14)";

            ctx.fill();
        }
    }
}


// =========================================================
// GATES
// =========================================================

function drawGates() {

    for (const gate of gates) {

        if (gate.phase !== phase) {
            continue;
        }

        const x =
            gate.x - camera.x;

        const y =
            gate.y - camera.y;


        if (
            x < -150 ||
            y < -150 ||
            x > canvas.width + 150 ||
            y > canvas.height + 150
        ) {
            continue;
        }


        ctx.save();

        ctx.translate(
            x + gate.width / 2,
            y + gate.height / 2
        );

        ctx.rotate(
            Math.sin(
                gate.x * 0.01
            ) * 0.15
        );


        ctx.strokeStyle =
            phase === 0
                ? "rgba(75,220,235,0.5)"
                : "rgba(220,105,240,0.5)";

        ctx.lineWidth = 3;

        ctx.strokeRect(
            -gate.width / 2,
            -gate.height / 2,
            gate.width,
            gate.height
        );


        ctx.beginPath();

        ctx.moveTo(
            -gate.width / 2,
            0
        );

        ctx.lineTo(
            gate.width / 2,
            0
        );

        ctx.strokeStyle =
            "rgba(255,255,255,0.12)";

        ctx.stroke();

        ctx.restore();
    }
}


// =========================================================
// NODES
// =========================================================

function drawNodes() {

    for (const node of nodes) {

        if (node.phase !== phase) {
            continue;
        }

        const x =
            node.x - camera.x;

        const y =
            node.y - camera.y;


        if (
            x < -100 ||
            y < -100 ||
            x > canvas.width + 100 ||
            y > canvas.height + 100
        ) {
            continue;
        }


        const pulse =
            Math.sin(
                performance.now() * 0.003 +
                node.x
            ) * 5;


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            node.radius + pulse,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            node.activated
                ? "#6eeeff"
                : "#52727c";

        ctx.lineWidth = 3;

        ctx.stroke();


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            8,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            node.activated
                ? "#d8fbff"
                : "#36505a";

        ctx.fill();


        if (node.activated) {

            ctx.beginPath();

            ctx.moveTo(x, y - 42);
            ctx.lineTo(x + 10, y - 62);
            ctx.lineTo(x, y - 82);
            ctx.lineTo(x - 10, y - 62);
            ctx.closePath();

            ctx.fillStyle =
                "rgba(80,225,255,0.25)";

            ctx.fill();
        }
    }
}


// =========================================================
// SHARDS
// =========================================================

function drawShards() {

    for (const shard of shards) {

        if (shard.collected) {
            continue;
        }

        if (shard.phase !== phase) {
            continue;
        }

        const x =
            shard.x - camera.x;

        const y =
            shard.y - camera.y;


        if (
            x < -30 ||
            y < -30 ||
            x > canvas.width + 30 ||
            y > canvas.height + 30
        ) {
            continue;
        }


        const s =
            1 +
            Math.sin(
                shard.angle * 3
            ) * 0.15;


        ctx.save();

        ctx.translate(x, y);

        ctx.rotate(shard.angle);

        ctx.scale(s, s);

        ctx.beginPath();

        ctx.moveTo(0, -10);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-7, 0);
        ctx.closePath();

        ctx.fillStyle =
            phase === 0
                ? "#72e6ee"
                : "#d38ce8";

        ctx.fill();

        ctx.strokeStyle =
            "rgba(255,255,255,0.7)";

        ctx.stroke();

        ctx.restore();
    }
}


// =========================================================
// RESONATORS
// =========================================================

function drawResonators() {

    for (const r of resonators) {

        const x =
            r.x - camera.x;

        const y =
            r.y - camera.y;


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            r.radius,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            "#69e7ff";

        ctx.lineWidth = 2;

        ctx.stroke();


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            9,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#b9f8ff";

        ctx.fill();


        const power =
            Math.min(
                100,
                r.power
            );


        ctx.beginPath();

        ctx.arc(
            x,
            y,
            35 + power * 0.2,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle =
            `rgba(80,220,255,${0.05 + power / 500})`;

        ctx.stroke();
    }
}


// =========================================================
// CREATURES
// =========================================================

function drawCreatures() {

    for (const creature of creatures) {

        if (creature.health <= 0) {
            continue;
        }

        if (creature.phase !== phase) {
            continue;
        }

        const x =
            creature.x - camera.x;

        const y =
            creature.y - camera.y;


        if (
            x < -60 ||
            y < -60 ||
            x > canvas.width + 60 ||
            y > canvas.height + 60
        ) {
            continue;
        }


        const wobble =
            Math.sin(
                creature.wobble * 2
            ) * 3;


        ctx.save();

        ctx.translate(
            x,
            y
        );

        ctx.rotate(
            creature.wobble * 0.2
        );


        ctx.beginPath();

        ctx.moveTo(
            0,
            -creature.radius - wobble
        );

        ctx.lineTo(
            creature.radius,
            creature.radius
        );

        ctx.lineTo(
            0,
            creature.radius * 0.55
        );

        ctx.lineTo(
            -creature.radius,
            creature.radius
        );

        ctx.closePath();


        ctx.fillStyle =
            phase === 0
                ? "#7d969c"
                : "#8c668f";

        ctx.fill();


        ctx.strokeStyle =
            creature.alert > 0
                ? "#ffffff"
                : "#42545a";

        ctx.lineWidth = 2;

        ctx.stroke();


        ctx.beginPath();

        ctx.arc(
            0,
            -3,
            4,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            creature.alert > 0
                ? "#ffffff"
                : "#69dce8";

        ctx.fill();


        ctx.restore();
    }
}


// =========================================================
// PLAYER
// =========================================================

function drawPlayer() {

    const x =
        player.x - camera.x;

    const y =
        player.y - camera.y;


    ctx.save();

    ctx.translate(
        x,
        y
    );


    if (
        player.invincible > 0 &&
        Math.floor(
            player.invincible * 12
        ) % 2 === 0
    ) {

        ctx.globalAlpha = 0.4;
    }


    // Outer resonance ring
    ctx.beginPath();

    ctx.arc(
        0,
        0,
        28,
        0,
        Math.PI * 2
    );

    ctx.strokeStyle =
        phase === 0
            ? "rgba(80,225,255,0.25)"
            : "rgba(220,120,240,0.25)";

    ctx.lineWidth = 2;

    ctx.stroke();


    // Body
    ctx.beginPath();

    ctx.arc(
        0,
        0,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "#d7eef2";

    ctx.fill();


    ctx.strokeStyle =
        "#65dff2";

    ctx.lineWidth = 3;

    ctx.stroke();


    // Core
    ctx.beginPath();

    ctx.arc(
        0,
        0,
        7,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        phase === 0
            ? "#48d9ef"
            : "#d58ee9";

    ctx.fill();


    // Direction marker
    ctx.beginPath();

    ctx.moveTo(
        0,
        -28
    );

    ctx.lineTo(
        -7,
        -15
    );

    ctx.lineTo(
        7,
        -15
    );

    ctx.closePath();

    ctx.fillStyle =
        "#efffff";

    ctx.fill();


    ctx.restore();
}


// =========================================================
// ECHO TRAILS
// =========================================================

function drawEchoes() {

    for (const echo of echoes) {

        const x =
            echo.x - camera.x;

        const y =
            echo.y - camera.y;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            5 + echo.life * 2,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            `rgba(100,220,235,${echo.life / 10})`;

        ctx.fill();
    }
}


// =========================================================
// PARTICLES
// =========================================================

function drawParticles() {

    for (const p of particles) {

        const x =
            p.x - camera.x;

        const y =
            p.y - camera.y;


        ctx.globalAlpha =
            Math.max(
                0,
                p.life
            );

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#77e7f4";

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


// =========================================================
// PULSE DRAWING
// =========================================================

function drawPulse() {

    if (!pulseActive) {
        return;
    }


    const x =
        player.x - camera.x;

    const y =
        player.y - camera.y;


    ctx.beginPath();

    ctx.arc(
        x,
        y,
        pulseRadius,
        0,
        Math.PI * 2
    );


    ctx.strokeStyle =
        `rgba(100,230,255,${
            Math.max(
                0,
                1 - pulseRadius / 950
            )
        })`;

    ctx.lineWidth = 5;

    ctx.stroke();
}


// =========================================================
// VIGNETTE
// =========================================================

function drawVignette() {

    const gradient =
        ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.width * 0.2,
            canvas.width / 2,
            canvas.height / 2,
            canvas.width * 0.75
        );


    gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0.5)"
    );


    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}


// =========================================================
// HUD
// =========================================================

function updateHUD() {

    healthBar.style.width =
        `${Math.max(
            0,
            player.health
        )}%`;

    energyBar.style.width =
        `${Math.max(
            0,
            player.energy
        )}%`;


    phaseText.textContent =
        phase === 0
            ? "A"
            : "B";


    shardText.textContent =
        player.shards;


    resonatorText.textContent =
        player.resonators;


    signalText.textContent =
        `${Math.floor(
            player.signal
        )}%`;
}


// =========================================================
// GAME LOOP
// =========================================================

function gameLoop(time) {

    if (!running) {
        return;
    }


    const dt =
        Math.min(
            0.033,
            (time - lastTime) / 1000
        );

    lastTime = time;


    if (!paused && !gameOver) {

        update(dt);

        draw();
    }


    requestAnimationFrame(gameLoop);
}


// =========================================================
// GAME OVER
// =========================================================

function endGame() {

    gameOver = true;

    running = false;

    gameOverText.textContent =
        `Signal score: ${Math.floor(score)} • ` +
        `Echo Shards: ${player.shards} • ` +
        `Resonators: ${player.resonators}`;

    gameOverScreen.classList.remove(
        "hidden"
    );
}


// =========================================================
// ACHIEVEMENTS
// =========================================================

const achievementData = {

    firstPulse: {
        name: "FIRST WAVE",
        description: "Send your first Pulse.",
        icon: "◉"
    },

    collector: {
        name: "GATHERER",
        description: "Collect your first Echo Shard.",
        icon: "◆"
    },

    node: {
        name: "LISTENER",
        description: "Activate a Resonance Node.",
        icon: "◇"
    },

    fiveNodes: {
        name: "THE WORLD ANSWERS",
        description: "Activate five Resonance Nodes.",
        icon: "✦"
    },

    builder: {
        name: "ARCHITECT OF SOUND",
        description: "Deploy your first Resonator.",
        icon: "⌂"
    }
};


let achievements =
    JSON.parse(
        localStorage.getItem(
            "signalwakeAchievements"
        ) || "{}"
    );


function unlock(id) {

    if (achievements[id]) {
        return;
    }

    achievements[id] = true;

    localStorage.setItem(
        "signalwakeAchievements",
        JSON.stringify(achievements)
    );
}


function checkAchievements() {

    if (phase === 1) {

        // Phase shifting counts as exploration.
        unlock("phaseWalker");
    }
}


function showAchievements() {

    const list =
        document.getElementById(
            "achievementList"
        );

    list.innerHTML = "";


    for (
        const [id, data]
        of Object.entries(
            achievementData
        )
    ) {

        const unlocked =
            achievements[id] === true;


        const item =
            document.createElement(
                "div"
            );

        item.className =
            "achievement" +
            (unlocked
                ? " unlocked"
                : "");


        item.innerHTML = `
            <div class="achievement-icon">
                ${unlocked ? data.icon : "?"}
            </div>

            <div>
                <div class="achievement-name">
                    ${unlocked
                        ? data.name
                        : "UNKNOWN SIGNAL"}
                </div>

                <div class="achievement-description">
                    ${data.description}
                </div>
            </div>
        `;


        list.appendChild(item);
    }


    achievementScreen.classList.remove(
        "hidden"
    );
}


// =========================================================
// SAVE SYSTEM
// =========================================================

function saveGame(slot) {

    const data = {

        player: {
            x: player.x,
            y: player.y,
            health: player.health,
            energy: player.energy,
            shards: player.shards,
            resonators: player.resonators,
            signal: player.signal
        },

        phase,

        score,

        nodes: nodes.map(
            node => ({
                x: node.x,
                y: node.y,
                radius: node.radius,
                activated: node.activated,
                phase: node.phase,
                power: node.power
            })
        ),

        shards: shards.map(
            shard => ({
                x: shard.x,
                y: shard.y,
                radius: shard.radius,
                value: shard.value,
                phase: shard.phase,
                collected: shard.collected,
                angle: shard.angle
            })
        ),

        resonators: resonators.map(
            r => ({
                x: r.x,
                y: r.y,
                radius: r.radius,
                power: r.power,
                active: r.active
            })
        ),

        date:
            new Date().toLocaleString()
    };


    localStorage.setItem(
        `signalwakeSave${slot}`,
        JSON.stringify(data)
    );


    objective.textContent =
        `Game saved to slot ${slot}.`;
}


function loadGame(slot) {

    const raw =
        localStorage.getItem(
            `signalwakeSave${slot}`
        );


    if (!raw) {
        return false;
    }


    const data =
        JSON.parse(raw);


    player.x =
        data.player.x;

    player.y =
        data.player.y;

    player.health =
        data.player.health;

    player.energy =
        data.player.energy;

    player.shards =
        data.player.shards;

    player.resonators =
        data.player.resonators;

    player.signal =
        data.player.signal;


    phase =
        data.phase;

    score =
        data.score;


    nodes.length = 0;

    for (const n of data.nodes) {

        nodes.push(n);
    }


    shards.length = 0;

    for (const s of data.shards) {

        shards.push(s);
    }


    resonators.length = 0;

    for (const r of data.resonators) {

        resonators.push(r);
    }


    creatures.length = 0;

    // Creatures are regenerated.
    for (let i = 0; i < 28; i++) {

        creatures.push({

            x: random(
                100,
                WORLD_WIDTH - 100
            ),

            y: random(
                100,
                WORLD_HEIGHT - 100
            ),

            radius: random(13, 22),

            speed: random(40, 75),

            health: 3,

            alert: 0,

            phase: randomInt(0, 1),

            wobble: random(0, 10)
        });
    }


    return true;
}


// =========================================================
// SAVE SCREEN
// =========================================================

function showSaveSlots() {

    const container =
        document.getElementById(
            "saveSlots"
        );

    container.innerHTML = "";


    for (let i = 1; i <= 3; i++) {

        const raw =
            localStorage.getItem(
                `signalwakeSave${i}`
            );


        const div =
            document.createElement(
                "div"
            );

        div.className =
            "save-slot";


        let info =
            "EMPTY SLOT";


        if (raw) {

            try {

                const data =
                    JSON.parse(raw);

                info =
                    `Last saved: ${data.date}<br>` +
                    `Score: ${Math.floor(
                        data.score || 0
                    )}`;
            }

            catch {

                info =
                    "SAVE DATA ERROR";
            }
        }


        div.innerHTML = `
            <div class="save-slot-title">
                SAVE SLOT ${i}
            </div>

            <div class="save-slot-info">
                ${info}
            </div>

            <button data-load="${i}">
                LOAD SLOT
            </button>

            <button data-save="${i}">
                SAVE HERE
            </button>
        `;


        container.appendChild(div);
    }


    container
        .querySelectorAll(
            "[data-load]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const slot =
                        Number(
                            button.dataset.load
                        );

                    if (loadGame(slot)) {

                        selectedSave = slot;

                        saveScreen.classList.add(
                            "hidden"
                        );

                        menu.classList.add(
                            "hidden"
                        );

                        game.style.display =
                            "block";

                        hud.style.display =
                            "block";

                        running = true;

                        paused = false;

                        gameOver = false;

                        updateCamera();

                        objective.textContent =
                            `Save slot ${slot} loaded.`;

                        requestAnimationFrame(
                            gameLoop
                        );
                    }
                }
            );
        });


    container
        .querySelectorAll(
            "[data-save]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const slot =
                        Number(
                            button.dataset.save
                        );

                    if (running) {

                        saveGame(slot);

                    } else {

                        alert(
                            "Start a journey before saving."
                        );
                    }

                    showSaveSlots();
                }
            );
        });


    saveScreen.classList.remove(
        "hidden"
    );
}


// =========================================================
// BUTTONS
// =========================================================

startButton.addEventListener(
    "click",
    () => {

        selectedSave = 1;

        startGame();
    }
);


continueButton.addEventListener(
    "click",
    () => {

        let found = false;


        for (let i = 1; i <= 3; i++) {

            if (
                localStorage.getItem(
                    `signalwakeSave${i}`
                )
            ) {

                if (loadGame(i)) {

                    selectedSave = i;

                    found = true;

                    menu.classList.add(
                        "hidden"
                    );

                    game.style.display =
                        "block";

                    hud.style.display =
                        "block";

                    running = true;

                    paused = false;

                    gameOver = false;

                    updateCamera();

                    requestAnimationFrame(
                        gameLoop
                    );

                    break;
                }
            }
        }


        if (!found) {

            objective.textContent =
                "No saved journey found.";
        }
    }
);


saveButton.addEventListener(
    "click",
    showSaveSlots
);


backSave.addEventListener(
    "click",
    () => {

        saveScreen.classList.add(
            "hidden"
        );
    }
);


achievementButton.addEventListener(
    "click",
    showAchievements
);


closeAchievements.addEventListener(
    "click",
    () => {

        achievementScreen.classList.add(
            "hidden"
        );
    }
);


resumeButton.addEventListener(
    "click",
    () => {

        paused = false;

        pauseScreen.classList.add(
            "hidden"
        );
    }
);


pauseSaveButton.addEventListener(
    "click",
    () => {

        saveGame(
            selectedSave || 1
        );
    }
);


pauseMenuButton.addEventListener(
    "click",
    returnToMenu
);


restartButton.addEventListener(
    "click",
    startGame
);


gameOverMenuButton.addEventListener(
    "click",
    returnToMenu
);


// =========================================================
// STARTUP
// =========================================================

game.style.display = "none";

hud.style.display = "none";

menu.classList.remove("hidden");

updateHUD();

console.log(
    "SIGNALWAKE initialized."
);
