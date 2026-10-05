import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

"use strict";


/* =========================================================
   ECHOBOUND — THE LOST SIGNAL
   3D TANK SURVIVAL
========================================================= */


/* =========================================================
   SETTINGS
========================================================= */

const WORLD_SIZE = 360;
const HALF_WORLD = WORLD_SIZE / 2;

const PLAYER_MAX_HEALTH = 100;
const PLAYER_MAX_ENERGY = 100;

const TANK_SPEED = 15;
const TANK_REVERSE_SPEED = 8;
const TANK_TURN_SPEED = 1.8;

const CAMERA_DISTANCE = 16;
const CAMERA_HEIGHT = 8;
const CAMERA_LOOK_HEIGHT = 2.2;

const BULLET_SPEED = 85;
const BULLET_DAMAGE = 25;

const FIRE_COOLDOWN = 0.24;

const ENEMY_COUNT = 10;

const SAVE_KEY = "echobound_save_v7";


/* =========================================================
   GLOBAL VARIABLES
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

let reloadTimer = 0;
let fireTimer = 0;

let totalPlayTime = 0;

let buildings = [];
let enemies = [];
let bullets = [];
let particles = [];
let resources = [];

let keys = {};

let mouse = {
    x: 0,
    y: 0,
    down: false
};

let mouseWorldPoint = new THREE.Vector3();

let achievements = {
    firstShot: false,
    firstKill: false,
    fiveKills: false,
    explorer: false,
    survivor: false
};


/* =========================================================
   DOM
========================================================= */

const canvas = document.getElementById("game");

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");

const newRunBtn = document.getElementById("newRunBtn");
const shopBtn = document.getElementById("shopBtn");
const loadBtn = document.getElementById("loadBtn");
const achievementsBtn = document.getElementById("achievementsBtn");
const controlsBtn = document.getElementById("controlsBtn");

const pauseBtn = document.getElementById("pauseBtn");
const mapBtn = document.getElementById("mapBtn");

const healthFill = document.getElementById("healthFill");
const energyFill = document.getElementById("energyFill");

const ammoText = document.getElementById("ammoText");
const killsText = document.getElementById("killsText");
const creditsText = document.getElementById("creditsText");


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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;


/* =========================================================
   SCENE
========================================================= */

scene = new THREE.Scene();

scene.background = new THREE.Color(0x071114);

scene.fog = new THREE.FogExp2(
    0x071114,
    0.004
);


/* =========================================================
   CAMERA
========================================================= */

camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    900
);

camera.position.set(
    0,
    CAMERA_HEIGHT,
    CAMERA_DISTANCE
);


/* =========================================================
   LIGHTING
========================================================= */

const hemiLight = new THREE.HemisphereLight(
    0x8bd4d8,
    0x182018,
    2.1
);

scene.add(hemiLight);


const sun = new THREE.DirectionalLight(
    0xffffff,
    3.2
);

sun.position.set(
    -90,
    120,
    50
);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

sun.shadow.camera.left = -200;
sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -200;

sun.shadow.camera.near = 1;
sun.shadow.camera.far = 400;

scene.add(sun);


/* =========================================================
   GROUND
========================================================= */

const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x253a34,
    roughness: 0.92,
    metalness: 0.04
});

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(
        WORLD_SIZE,
        WORLD_SIZE,
        40,
        40
    ),
    groundMaterial
);

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);


/* =========================================================
   GROUND DETAIL
========================================================= */

const grid = new THREE.GridHelper(
    WORLD_SIZE,
    36,
    0x47726e,
    0x2b4745
);

grid.position.y = 0.015;

grid.material.transparent = true;
grid.material.opacity = 0.18;

scene.add(grid);


/* =========================================================
   MATERIAL HELPERS
========================================================= */

function mat(color, roughness = 0.7, metalness = 0.1) {

    return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness
    });

}


function glowMat(color) {

    return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 2.5,
        roughness: 0.25,
        metalness: 0.15
    });

}


/* =========================================================
   BUILDING CREATION
========================================================= */

function createBuilding(
    x,
    z,
    w,
    h,
    d,
    color = 0x28373a
) {

    const group = new THREE.Group();

    group.position.set(
        x,
        h / 2,
        z
    );


    const body = new THREE.Mesh(
        new THREE.BoxGeometry(
            w,
            h,
            d
        ),
        mat(color, 0.82, 0.18)
    );

    body.castShadow = true;
    body.receiveShadow = true;

    group.add(body);


    /* roof */

    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(
            w * 1.05,
            0.35,
            d * 1.05
        ),
        mat(0x172426, 0.7, 0.35)
    );

    roof.position.y = h / 2 + 0.18;

    roof.castShadow = true;

    group.add(roof);


    /* windows */

    const windowMaterial = glowMat(0x52dcd0);

    const rows = Math.max(
        1,
        Math.floor(h / 3)
    );

    const columns = Math.max(
        1,
        Math.floor(w / 3)
    );


    for (let r = 0; r < rows; r++) {

        for (let c = 0; c < columns; c++) {

            if (Math.random() < 0.35) {
                continue;
            }

            const win = new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.7,
                    0.55,
                    0.08
                ),
                windowMaterial
            );

            win.position.set(
                -w / 2 +
                    1.5 +
                    c * 3,
                -h / 2 +
                    1.7 +
                    r * 3,
                -d / 2 - 0.05
            );

            group.add(win);
        }

    }


    scene.add(group);

    buildings.push({
        x,
        z,
        w,
        d,
        h,
        mesh: group
    });

}


/* =========================================================
   BUILDINGS
========================================================= */

createBuilding(-70, -65, 32, 14, 28, 0x314347);
createBuilding(-20, -72, 25, 20, 22, 0x3a4647);
createBuilding(35, -70, 42, 12, 25, 0x293a3d);

createBuilding(75, -25, 30, 18, 34, 0x344347);
createBuilding(-80, -5, 34, 11, 25, 0x2b3e40);

createBuilding(-45, 45, 30, 16, 28, 0x34484a);
createBuilding(20, 50, 44, 13, 30, 0x293b3e);

createBuilding(82, 65, 28, 21, 24, 0x3b4849);

createBuilding(-75, 85, 35, 14, 27, 0x29383b);


/* =========================================================
   TREES
========================================================= */

function createTree(x, z, scale = 1) {

    const group = new THREE.Group();

    group.position.set(
        x,
        0,
        z
    );

    group.scale.setScalar(scale);


    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.45,
            0.65,
            3.8,
            7
        ),
        mat(0x49382c, 0.95, 0)
    );

    trunk.position.y = 1.9;

    trunk.castShadow = true;

    group.add(trunk);


    const crown1 = new THREE.Mesh(
        new THREE.ConeGeometry(
            2.7,
            5,
            9
        ),
        mat(0x183b32, 0.95, 0)
    );

    crown1.position.y = 5;

    crown1.castShadow = true;

    group.add(crown1);


    const crown2 = new THREE.Mesh(
        new THREE.ConeGeometry(
            2.1,
            4.2,
            9
        ),
        mat(0x245348, 0.95, 0)
    );

    crown2.position.y = 7;

    crown2.castShadow = true;

    group.add(crown2);


    scene.add(group);

}


/* =========================================================
   RANDOM TREES
========================================================= */

for (let i = 0; i < 75; i++) {

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

    let nearBuilding = false;

    for (const b of buildings) {

        if (
            Math.abs(x - b.x) <
                b.w / 2 + 5 &&
            Math.abs(z - b.z) <
                b.d / 2 + 5
        ) {
            nearBuilding = true;
            break;
        }

    }

    if (!nearBuilding) {

        createTree(
            x,
            z,
            THREE.MathUtils.randFloat(
                0.7,
                1.25
            )
        );

    }

}


/* =========================================================
   RESOURCES
========================================================= */

function createResource(x, z) {

    const group = new THREE.Group();

    group.position.set(
        x,
        0,
        z
    );


    const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(
            0.9,
            0
        ),
        glowMat(0x53d9ff)
    );

    crystal.position.y = 1;

    crystal.rotation.y =
        Math.random() * Math.PI;

    crystal.castShadow = true;

    group.add(crystal);


    const light = new THREE.PointLight(
        0x42dfff,
        1.4,
        8
    );

    light.position.y = 1.2;

    group.add(light);


    scene.add(group);

    resources.push({
        group,
        baseY: 0
    });

}


for (let i = 0; i < 40; i++) {

    createResource(
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 10,
            HALF_WORLD - 10
        ),
        THREE.MathUtils.randFloat(
            -HALF_WORLD + 10,
            HALF_WORLD - 10
        )
    );

}


/* =========================================================
   TANK
========================================================= */

function createTank() {

    const group = new THREE.Group();


    /* lower body */

    const lower = new THREE.Mesh(
        new THREE.BoxGeometry(
            5.2,
            1.3,
            7.2
        ),
        mat(0x344b48, 0.55, 0.65)
    );

    lower.position.y = 1.1;

    lower.castShadow = true;
    lower.receiveShadow = true;

    group.add(lower);


    /* front */

    const front = new THREE.Mesh(
        new THREE.BoxGeometry(
            4.7,
            1.4,
            1.3
        ),
        mat(0x4b625e, 0.55, 0.7)
    );

    front.position.set(
        0,
        1.3,
        -3.7
    );

    front.rotation.x = -0.1;

    front.castShadow = true;

    group.add(front);


    /* upper body */

    const upper = new THREE.Mesh(
        new THREE.BoxGeometry(
            3.9,
            1.4,
            4.5
        ),
        mat(0x435955, 0.48, 0.72)
    );

    upper.position.y = 2;

    upper.castShadow = true;

    group.add(upper);


    /* tracks */

    const trackMaterial =
        mat(
            0x151c1c,
            0.92,
            0.5
        );


    for (const side of [-1, 1]) {

        const track = new THREE.Mesh(
            new THREE.BoxGeometry(
                1.15,
                1.55,
                7.6
            ),
            trackMaterial
        );

        track.position.set(
            side * 2.65,
            1,
            0
        );

        track.castShadow = true;

        group.add(track);


        for (let i = -2; i <= 2; i++) {

            const wheel =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.62,
                        0.62,
                        0.38,
                        16
                    ),
                    mat(
                        0x252d2d,
                        0.85,
                        0.55
                    )
                );

            wheel.rotation.z =
                Math.PI / 2;

            wheel.position.set(
                side * 2.66,
                0.92,
                i * 1.45
            );

            wheel.castShadow = true;

            group.add(wheel);

        }

    }


    /* turret base */

    const turretBase =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                1.85,
                2.15,
                0.65,
                24
            ),
            mat(
                0x253a38,
                0.48,
                0.72
            )
        );

    turretBase.position.y = 2.95;

    turretBase.castShadow = true;

    group.add(turretBase);


    /* turret */

    turret = new THREE.Group();

    turret.position.y = 3.25;

    group.add(turret);


    const turretBody =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.8,
                1.1,
                3.2
            ),
            mat(
                0x405550,
                0.42,
                0.76
            )
        );

    turretBody.castShadow = true;

    turret.add(turretBody);


    /* cannon */

    const cannon =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.27,
                0.34,
                6.4,
                16
            ),
            mat(
                0x182321,
                0.32,
                0.9
            )
        );

    cannon.rotation.x =
        Math.PI / 2;

    cannon.position.z = -4;

    cannon.castShadow = true;

    turret.add(cannon);


    /* muzzle */

    muzzle = new THREE.Object3D();

    muzzle.position.set(
        0,
        0,
        -7.2
    );

    turret.add(muzzle);


    /* muzzle glow */

    const muzzleGlow =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.42,
                12,
                12
            ),
            glowMat(0x64fff0)
        );

    muzzleGlow.position.copy(
        muzzle.position
    );

    muzzleGlow.visible = false;

    muzzle.add(muzzleGlow);


    /* antenna */

    const antenna =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.04,
                0.04,
                1.8,
                8
            ),
            mat(
                0x899b98,
                0.5,
                0.5
            )
        );

    antenna.position.set(
        1.2,
        1.1,
        0.5
    );

    turret.add(antenna);


    const antennaLight =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.13,
                8,
                8
            ),
            glowMat(0xff514d)
        );

    antennaLight.position.set(
        1.2,
        2,
        0.5
    );

    turret.add(antennaLight);


    group.position.set(
        0,
        0,
        0
    );

    group.rotation.y = 0;

    scene.add(group);

    return group;

}


player = createTank();


/* =========================================================
   ENEMIES
========================================================= */

function createEnemy(x, z) {

    const group = new THREE.Group();

    group.position.set(
        x,
        0,
        z
    );


    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                2.0,
                20,
                20
            ),
            glowMat(0x9d3df0)
        );

    body.position.y = 2;

    body.castShadow = true;

    group.add(body);


    const eye =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.45,
                12,
                12
            ),
            glowMat(0xff3d55)
        );

    eye.position.set(
        0,
        2.2,
        -1.75
    );

    group.add(eye);


    const light =
        new THREE.PointLight(
            0x9f32ff,
            1.7,
            11
        );

    light.position.y = 2;

    group.add(light);


    scene.add(group);


    enemies.push({
        group,
        health: 50,
        speed: THREE.MathUtils.randFloat(
            3.5,
            5.2
        ),
        attackTimer:
            THREE.MathUtils.randFloat(
                1,
                3
            )
    });

}


/* =========================================================
   SPAWN ENEMIES
========================================================= */

for (let i = 0; i < ENEMY_COUNT; i++) {

    let x;
    let z;

    do {

        x = THREE.MathUtils.randFloat(
            -HALF_WORLD + 15,
            HALF_WORLD - 15
        );

        z = THREE.MathUtils.randFloat(
            -HALF_WORLD + 15,
            HALF_WORLD - 15
        );

    } while (
        Math.hypot(x, z) < 45
    );

    createEnemy(x, z);

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
            event.code === "KeyR" &&
            gameState === "playing"
        ) {

            reloadTank();

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

newRunBtn.addEventListener(
    "click",
    startNewGame
);

shopBtn.addEventListener(
    "click",
    openShop
);

loadBtn.addEventListener(
    "click",
    loadGame
);

achievementsBtn.addEventListener(
    "click",
    showAchievements
);

controlsBtn.addEventListener(
    "click",
    showControls
);

pauseBtn.addEventListener(
    "click",
    pauseGame
);

mapBtn.addEventListener(
    "click",
    showMap
);


/* =========================================================
   NEW GAME
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
        12 + ammoUpgrade * 2;

    reloadTimer = 0;

    fireTimer = 0;

    totalPlayTime = 0;


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


    for (let i = 0; i < ENEMY_COUNT; i++) {

        let x;
        let z;

        do {

            x =
                THREE.MathUtils.randFloat(
                    -HALF_WORLD + 15,
                    HALF_WORLD - 15
                );

            z =
                THREE.MathUtils.randFloat(
                    -HALF_WORLD + 15,
                    HALF_WORLD - 15
                );

        } while (
            Math.hypot(x, z) < 50
        );

        createEnemy(x, z);

    }


    gameState = "playing";

    menu.style.display = "none";
    hud.style.display = "block";

    updateHUD();

    note("NEW RUN STARTED");

}


/* =========================================================
   LOAD GAME
========================================================= */

function loadGame() {

    const raw =
        localStorage.getItem(
            SAVE_KEY
        );

    if (!raw) {

        note("NO SAVE FOUND");

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

        if (data.player) {

            player.position.set(
                data.player.x ?? 0,
                0,
                data.player.z ?? 0
            );

            player.rotation.y =
                data.player.rotation ?? 0;

        }


        achievements =
            data.achievements ??
            achievements;


        closeAllPanels();

        gameState = "playing";

        menu.style.display = "none";

        hud.style.display = "block";

        updateHUD();

        note("SAVE LOADED");

    } catch (error) {

        console.error(error);

        note("SAVE IS CORRUPTED");

    }

}


/* =========================================================
   SAVE
========================================================= */

function saveGame() {

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
            x: player.position.x,
            z: player.position.z,
            rotation: player.rotation.y
        },

        achievements

    };


    localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(data)
    );

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

    gameState = "paused";

    showPausePanel();

}


function resumeGame() {

    closeAllPanels();

    gameState = "playing";

}


function showPausePanel() {

    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement("div");

    panel.className = "panel";

    panel.innerHTML = `
        <h2>PAUSED</h2>

        <p>
            EchoBound is paused.
        </p>

        <button id="resumeBtn">
            RESUME
        </button>

        <button id="pauseShopBtn">
            SHOP
        </button>

        <button id="pauseSaveBtn">
            SAVE GAME
        </button>

        <button id="pauseMenuBtn">
            MAIN MENU
        </button>
    `;


    layer.appendChild(panel);


    panel.querySelector(
        "#resumeBtn"
    ).onclick = resumeGame;


    panel.querySelector(
        "#pauseShopBtn"
    ).onclick = openShop;


    panel.querySelector(
        "#pauseSaveBtn"
    ).onclick = () => {

        saveGame();

        note("GAME SAVED");

    };


    panel.querySelector(
        "#pauseMenuBtn"
    ).onclick = () => {

        closeAllPanels();

        gameState = "menu";

        hud.style.display = "none";

        menu.style.display = "flex";

    };

}


/* =========================================================
   SHOP
========================================================= */

function openShop() {

    if (
        gameState === "playing"
    ) {

        gameState = "paused";

    }


    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement("div");

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

                <div class="shop-icon">🔋</div>

                <h3>AMMO PACK</h3>

                <p>
                    Adds 10 ammunition to your current supply.
                </p>

                <div class="price">
                    10 CREDITS
                </div>

                <button id="buyAmmo">
                    BUY
                </button>

            </div>


            <div class="shop-card">

                <div class="shop-icon">🛠️</div>

                <h3>REPAIR</h3>

                <p>
                    Restores 35 hull health.
                </p>

                <div class="price">
                    20 CREDITS
                </div>

                <button id="buyRepair">
                    BUY
                </button>

            </div>


            <div class="shop-card">

                <div class="shop-icon">⚡</div>

                <h3>AMMO UPGRADE</h3>

                <p>
                    Increases your maximum magazine size by 2.
                </p>

                <div class="price">
                    50 CREDITS
                </div>

                <button id="buyUpgrade">
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


    layer.appendChild(panel);


    const refresh =
        () => {

            const credit =
                panel.querySelector(
                    "#shopCredits"
                );

            credit.textContent =
                credits;

            updateHUD();

        };


    panel.querySelector(
        "#buyAmmo"
    ).onclick = () => {

        if (credits < 10) {

            note("NOT ENOUGH CREDITS");

            return;

        }

        credits -= 10;

        ammo += 10;

        refresh();

        note("AMMO +10");

    };


    panel.querySelector(
        "#buyRepair"
    ).onclick = () => {

        if (credits < 20) {

            note("NOT ENOUGH CREDITS");

            return;

        }

        credits -= 20;

        playerHealth =
            Math.min(
                PLAYER_MAX_HEALTH,
                playerHealth + 35
            );

        refresh();

        note("TANK REPAIRED");

    };


    panel.querySelector(
        "#buyUpgrade"
    ).onclick = () => {

        if (credits < 50) {

            note("NOT ENOUGH CREDITS");

            return;

        }

        credits -= 50;

        ammoUpgrade++;

        maxAmmo =
            12 +
            ammoUpgrade * 2;

        ammo =
            Math.min(
                ammo + 2,
                maxAmmo
            );

        refresh();

        note("AMMO CAPACITY UPGRADED");

    };


    panel.querySelector(
        "#shopBack"
    ).onclick = () => {

        closeAllPanels();

        if (
            gameState === "paused"
        ) {

            showPausePanel();

        } else {

            gameState = "menu";

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
        document.createElement("div");

    panel.className =
        "panel";


    const list = [

        [
            "FIRST SIGNAL",
            "Fire your first shot.",
            achievements.firstShot
        ],

        [
            "FIRST CONTACT",
            "Destroy your first enemy.",
            achievements.firstKill
        ],

        [
            "HUNTER",
            "Destroy five enemies.",
            achievements.fiveKills
        ],

        [
            "EXPLORER",
            "Explore the world.",
            achievements.explorer
        ],

        [
            "SURVIVOR",
            "Survive a dangerous encounter.",
            achievements.survivor
        ]

    ];


    panel.innerHTML = `
        <h2>ACHIEVEMENTS</h2>

        <div class="achievement-list">

            ${list.map(item => `

                <div class="
                    achievement
                    ${item[2] ? "unlocked" : ""}
                ">

                    <strong>
                        ${item[2] ? "✓ " : "○ "}
                        ${item[0]}
                    </strong>

                    <span>
                        ${item[1]}
                    </span>

                </div>

            `).join("")}

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


    layer.appendChild(panel);


    panel.querySelector(
        "#achievementBack"
    ).onclick = () => {

        closeAllPanels();

    };

}


/* =========================================================
   CONTROLS
========================================================= */

function showControls() {

    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement("div");

    panel.className =
        "panel";


    panel.innerHTML = `

        <h2>CONTROLS</h2>

        <p>
            <strong>W / S</strong>
            Drive forward and backward.
        </p>

        <p>
            <strong>A / D</strong>
            Turn the tank.
        </p>

        <p>
            <strong>MOUSE</strong>
            Aim the cannon.
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
            Pause the game.
        </p>

        <button id="controlsBack">
            BACK
        </button>
    `;


    layer.appendChild(panel);


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
        gameState !== "playing"
    ) {
        return;
    }


    gameState = "paused";


    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement("div");

    panel.className =
        "panel";


    panel.innerHTML = `
        <h2>SECTOR MAP</h2>

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


    layer.appendChild(panel);


    const map =
        panel.querySelector(
            ".map-box"
        );


    for (
        const enemy of enemies
    ) {

        const dot =
            document.createElement("div");

        dot.className =
            "map-enemy";


        const x =
            (
                enemy.group.position.x /
                WORLD_SIZE
            ) * 100 + 50;


        const z =
            (
                enemy.group.position.z /
                WORLD_SIZE
            ) * 100 + 50;


        dot.style.left =
            `${x}%`;

        dot.style.top =
            `${z}%`;


        map.appendChild(dot);

    }


    panel.querySelector(
        "#mapBack"
    ).onclick = () => {

        closeAllPanels();

        gameState = "playing";

    };

}


/* =========================================================
   PANEL HELPERS
========================================================= */

function createPanelLayer() {

    const layer =
        document.createElement("div");

    layer.className =
        "panel-layer";

    document.body.appendChild(layer);

    return layer;

}


function closeAllPanels() {

    document
        .querySelectorAll(
            ".panel-layer"
        )
        .forEach(
            panel =>
                panel.remove()
        );

}


/* =========================================================
   MOUSE WORLD
========================================================= */

const raycaster =
    new THREE.Raycaster();

const mouseVector =
    new THREE.Vector2();


function mouseWorld() {

    mouseVector.x =
        (
            mouse.x /
            window.innerWidth
        ) * 2 - 1;

    mouseVector.y =
        -(
            mouse.y /
            window.innerHeight
        ) * 2 + 1;


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


    const hit =
        new THREE.Vector3();


    raycaster.ray.intersectPlane(
        plane,
        hit
    );


    return hit;

}


/* =========================================================
   TURRET AIM
========================================================= */

function updateTurretAim() {

    if (!turret) {
        return;
    }


    const target =
        mouseWorld();


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
   MOVEMENT
========================================================= */

function updatePlayer(dt) {

    let forward = 0;
    let turn = 0;


    if (
        keys["KeyW"] ||
        keys["ArrowUp"]
    ) {
        forward += 1;
    }


    if (
        keys["KeyS"] ||
        keys["ArrowDown"]
    ) {
        forward -= 1;
    }


    if (
        keys["KeyA"] ||
        keys["ArrowLeft"]
    ) {
        turn += 1;
    }


    if (
        keys["KeyD"] ||
        keys["ArrowRight"]
    ) {
        turn -= 1;
    }


    if (turn !== 0) {

        player.rotation.y +=
            turn *
            TANK_TURN_SPEED *
            dt *
            (forward < 0 ? -1 : 1);

    }


    if (forward !== 0) {

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
            !collidesWithBuilding(
                next,
                3.3
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
            -HALF_WORLD + 5,
            HALF_WORLD - 5
        );


    player.position.z =
        THREE.MathUtils.clamp(
            player.position.z,
            -HALF_WORLD + 5,
            HALF_WORLD - 5
        );


    playerEnergy =
        Math.min(
            PLAYER_MAX_ENERGY,
            playerEnergy + 6 * dt
        );

}


/* =========================================================
   BUILDING COLLISION
========================================================= */

function collidesWithBuilding(
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
   SHOOTING
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


    achievements.firstShot = true;


    const start =
        new THREE.Vector3();


    muzzle.getWorldPosition(
        start
    );


    const target =
        mouseWorld();


    const direction =
        target
            .clone()
            .sub(start)
            .normalize();


    start.add(
        direction
            .clone()
            .multiplyScalar(0.8)
    );


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.18,
                10,
                10
            ),
            glowMat(0x68fff0)
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
        start
    );


    updateHUD();

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


    reloadTimer = 1.35;

    note("RELOADING...");

}


/* =========================================================
   MUZZLE FLASH
========================================================= */

function createMuzzleFlash(
    position
) {

    const light =
        new THREE.PointLight(
            0x65fff1,
            12,
            18
        );


    light.position.copy(
        position
    );


    scene.add(
        light
    );


    setTimeout(
        () => {

            scene.remove(
                light
            );

        },
        80
    );


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.08,
                    6,
                    6
                ),
                glowMat(0x9ffff8)
            );


        p.position.copy(
            position
        );


        scene.add(
            p
        );


        particles.push({
            mesh: p,
            velocity:
                new THREE.Vector3(
                    THREE.MathUtils.randFloat(
                        -3,
                        3
                    ),
                    THREE.MathUtils.randFloat(
                        0,
                        4
                    ),
                    THREE.MathUtils.randFloat(
                        -3,
                        3
                    )
                ),
            life: 0.35
        });

    }

}


/* =========================================================
   BULLET COLLISION
========================================================= */

function lineBlocked(
    from,
    to
) {

    const direction =
        to.clone().sub(from);

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
            new THREE.Box3().setFromObject(
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
   BULLET UPDATE
========================================================= */

function updateBullets(dt) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const b =
            bullets[i];


        const previous =
            b.mesh.position.clone();


        b.mesh.position.add(
            b.velocity
                .clone()
                .multiplyScalar(dt)
        );


        b.life -= dt;


        if (
            lineBlocked(
                previous,
                b.mesh.position
            )
        ) {

            scene.remove(
                b.mesh
            );

            bullets.splice(
                i,
                1
            );

            continue;

        }


        let hitEnemy = false;


        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy =
                enemies[j];


            const enemyCenter =
                enemy.group.position.clone();


            enemyCenter.y = 2;


            const distance =
                b.mesh.position.distanceTo(
                    enemyCenter
                );


            if (
                distance < 2.7
            ) {

                enemy.health -=
                    BULLET_DAMAGE;


                hitEnemy = true;


                createHitEffect(
                    b.mesh.position
                );


                if (
                    enemy.health <= 0
                ) {

                    destroyEnemy(
                        j
                    );

                }

                break;

            }

        }


        if (
            hitEnemy ||
            b.life <= 0 ||
            Math.abs(
                b.mesh.position.x
            ) > HALF_WORLD + 20 ||
            Math.abs(
                b.mesh.position.z
            ) > HALF_WORLD + 20
        ) {

            scene.remove(
                b.mesh
            );

            bullets.splice(
                i,
                1
            );

        }

    }

}


/* =========================================================
   HIT EFFECT
========================================================= */

function createHitEffect(
    position
) {

    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.1,
                    7,
                    7
                ),
                glowMat(0xff4f76)
            );


        p.position.copy(
            position
        );


        scene.add(
            p
        );


        particles.push({
            mesh: p,
            velocity:
                new THREE.Vector3(
                    THREE.MathUtils.randFloat(
                        -4,
                        4
                    ),
                    THREE.MathUtils.randFloat(
                        1,
                        5
                    ),
                    THREE.MathUtils.randFloat(
                        -4,
                        4
                    )
                ),
            life: 0.45
        });

    }

}


/* =========================================================
   DESTROY ENEMY
========================================================= */

function destroyEnemy(
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

    credits += 15;

    achievements.firstKill = true;

    if (
        kills >= 5
    ) {

        achievements.fiveKills = true;

    }


    note(
        "+15 CREDITS"
    );


    updateHUD();


    setTimeout(
        spawnEnemy,
        2500
    );

}


/* =========================================================
   EXPLOSION
========================================================= */

function createExplosion(
    position
) {

    const light =
        new THREE.PointLight(
            0xff5a45,
            20,
            25
        );


    light.position.copy(
        position
    );

    light.position.y += 2;

    scene.add(
        light
    );


    setTimeout(
        () => {

            scene.remove(
                light
            );

        },
        180
    );


    for (
        let i = 0;
        i < 18;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    THREE.MathUtils.randFloat(
                        0.08,
                        0.22
                    ),
                    7,
                    7
                ),
                glowMat(
                    Math.random() > 0.5
                        ? 0xff633f
                        : 0xffb33f
                )
            );


        p.position.copy(
            position
        );


        p.position.y += 2;


        scene.add(
            p
        );


        particles.push({
            mesh: p,
            velocity:
                new THREE.Vector3(
                    THREE.MathUtils.randFloat(
                        -8,
                        8
                    ),
                    THREE.MathUtils.randFloat(
                        2,
                        9
                    ),
                    THREE.MathUtils.randFloat(
                        -8,
                        8
                    )
                ),
            life: 0.8
        });

    }

}


/* =========================================================
   SPAWN ENEMY
========================================================= */

function spawnEnemy() {

    if (
        gameState !== "playing"
    ) {
        return;
    }


    let x;
    let z;


    do {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const distance =
            THREE.MathUtils.randFloat(
                55,
                120
            );


        x =
            player.position.x +
            Math.cos(angle) *
            distance;


        z =
            player.position.z +
            Math.sin(angle) *
            distance;


    } while (
        Math.abs(x) >
            HALF_WORLD - 10 ||
        Math.abs(z) >
            HALF_WORLD - 10
    );


    createEnemy(
        x,
        z
    );

}


/* =========================================================
   ENEMY UPDATE
========================================================= */

function updateEnemies(dt) {

    for (
        const enemy of enemies
    ) {

        const direction =
            player.position
                .clone()
                .sub(enemy.group.position);


        direction.y = 0;


        const distance =
            direction.length();


        if (
            distance > 7
        ) {

            direction.normalize();


            const next =
                enemy.group.position
                    .clone();


            next.add(
                direction.multiplyScalar(
                    enemy.speed *
                    dt
                )
            );


            if (
                !collidesWithBuilding(
                    next,
                    2.0
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


        enemy.attackTimer -= dt;


        if (
            distance < 40 &&
            enemy.attackTimer <= 0
        ) {

            if (
                !lineBlocked(
                    enemy.group.position,
                    player.position
                )
            ) {

                playerHealth -= 8;

                enemy.attackTimer = 1.8;

                achievements.survivor =
                    true;

                createHitEffect(
                    player.position.clone()
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
            10 * dt;


        p.life -= dt;


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
   RESOURCES ANIMATION
========================================================= */

function updateResources(
    time
) {

    for (
        const resource of resources
    ) {

        resource.group.rotation.y +=
            0.01;

        resource.group.position.y =
            Math.sin(
                time * 0.002 +
                resource.group.position.x
            ) * 0.15;

    }

}


/* =========================================================
   CAMERA
========================================================= */

function updateCamera() {

    if (!player) {
        return;
    }


    /*
        Camera blijft altijd achter de tank.
        De muis draait dus NIET de camera.
    */

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
        0.13
    );


    const look =
        player.position.clone();


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

    healthFill.style.width =
        `${Math.max(
            0,
            playerHealth /
                PLAYER_MAX_HEALTH *
                100
        )}%`;


    energyFill.style.width =
        `${Math.max(
            0,
            playerEnergy /
                PLAYER_MAX_ENERGY *
                100
        )}%`;


    ammoText.textContent =
        `${ammo} / ${maxAmmo}`;


    killsText.textContent =
        kills;


    creditsText.textContent =
        credits;

}


/* =========================================================
   GAME OVER
========================================================= */

function gameOver() {

    gameState = "gameover";

    saveGame();

    closeAllPanels();


    const layer =
        createPanelLayer();


    const panel =
        document.createElement("div");

    panel.className =
        "panel";


    panel.innerHTML = `

        <h2>RUN TERMINATED</h2>

        <p>
            Your tank has been disabled.
        </p>

        <p>
            KILLS:
            <strong>${kills}</strong>
            <br>

            CREDITS:
            <strong>${credits}</strong>
        </p>

        <button id="retryBtn">
            NEW RUN
        </button>

        <button id="gameOverMenu">
            MAIN MENU
        </button>
    `;


    layer.appendChild(panel);


    panel.querySelector(
        "#retryBtn"
    ).onclick =
        startNewGame;


    panel.querySelector(
        "#gameOverMenu"
    ).onclick = () => {

        closeAllPanels();

        gameState = "menu";

        hud.style.display =
            "none";

        menu.style.display =
            "flex";

    };

}


/* =========================================================
   NOTIFICATION
========================================================= */

let notificationTimer = null;


function note(message) {

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
            1700
        );

}


/* =========================================================
   GAME LOOP
========================================================= */

function update(dt, time) {

    if (
        gameState !== "playing"
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

            ammo = maxAmmo;

            note("RELOADED");

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

    updateEnemies(dt);

    updateParticles(dt);

    updateResources(time);

    updateCamera();

    updateHUD();

}


/* =========================================================
   ANIMATION LOOP
========================================================= */

clock = new THREE.Clock();


function animate() {

    requestAnimationFrame(
        animate
    );


    const dt =
        Math.min(
            clock.getDelta(),
            0.05
        );


    const time =
        performance.now();


    update(
        dt,
        time
    );


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
   START STATE
========================================================= */

menu.style.display =
    "flex";

hud.style.display =
    "none";

updateHUD();
