// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// COMPLETE APP.JS
// ROBUUSTE VERSIE
//
// - Werkt ook wanneer app.js GEEN type="module" is
// - Geen 2D-context op de Three.js game-canvas
// - Camera blijft altijd achter de tank
// - Muis bestuurt alleen de turret / het kanon
// - Linkermuisknop = schieten
// - WASD = tank besturen
// - Vijanden
// - Gebouwen + muren
// - Botsing met muren
// - Kogels stoppen bij muren
// - Shop
// - Achievements
// - Save / Load
// - Pause
// - Game Over
// - Map
// ============================================================

(function () {
    "use strict";

    // --------------------------------------------------------
    // START
    // --------------------------------------------------------

    function startEchoBound() {
        loadThreeAndStart();
    }

    async function loadThreeAndStart() {
        let THREE;

        try {
            THREE = await import(
                "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
            );
        } catch (error) {
            showFatalError(
                "Three.js kon niet worden geladen.",
                error
            );
            return;
        }

        try {
            createGame(THREE);
        } catch (error) {
            console.error(error);
            showFatalError(
                "EchoBound kon niet worden gestart.",
                error
            );
        }
    }

    // --------------------------------------------------------
    // FATAL ERROR
    // --------------------------------------------------------

    function showFatalError(title, error) {
        console.error("ECHOBOUND ERROR:", error);

        let box = document.getElementById("echobound-fatal-error");

        if (!box) {
            box = document.createElement("div");
            box.id = "echobound-fatal-error";

            box.style.position = "fixed";
            box.style.left = "0";
            box.style.top = "0";
            box.style.right = "0";
            box.style.bottom = "0";
            box.style.zIndex = "999999";
            box.style.background = "#080b10";
            box.style.color = "#ffffff";
            box.style.display = "flex";
            box.style.alignItems = "center";
            box.style.justifyContent = "center";
            box.style.fontFamily = "Arial, sans-serif";

            document.body.appendChild(box);
        }

        box.innerHTML = `
            <div style="
                width:min(700px,90vw);
                padding:35px;
                border:1px solid #3f596d;
                background:#111923;
                border-radius:18px;
                box-shadow:0 20px 80px #000;
            ">
                <div style="
                    color:#69d9ff;
                    font-size:14px;
                    letter-spacing:3px;
                    margin-bottom:12px;
                ">ECHOBOUND</div>

                <h1 style="
                    margin:0 0 15px;
                    font-size:32px;
                ">${title}</h1>

                <p style="
                    color:#a9b9c7;
                    line-height:1.6;
                ">
                    Er is een JavaScript-fout opgetreden.
                </p>

                <pre style="
                    white-space:pre-wrap;
                    color:#ff9d9d;
                    background:#090d12;
                    padding:15px;
                    border-radius:10px;
                    overflow:auto;
                ">${String(error && error.stack ? error.stack : error)}</pre>

                <button
                    onclick="location.reload()"
                    style="
                        padding:12px 20px;
                        border:0;
                        border-radius:8px;
                        background:#53cfff;
                        color:#071018;
                        font-weight:bold;
                        cursor:pointer;
                    "
                >
                    OPNIEUW LADEN
                </button>
            </div>
        `;
    }

    // --------------------------------------------------------
    // DOM READY
    // --------------------------------------------------------

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startEchoBound);
    } else {
        startEchoBound();
    }

    // ========================================================
    // GAME
    // ========================================================

    function createGame(THREE) {

        // ----------------------------------------------------
        // CONSTANTS
        // ----------------------------------------------------

        const WORLD_SIZE = 360;
        const HALF_WORLD = WORLD_SIZE / 2;

        const PLAYER_MAX_HEALTH = 100;
        const PLAYER_MAX_ENERGY = 100;

        const TANK_SPEED = 15;
        const TANK_REVERSE_SPEED = 8;
        const TANK_TURN_SPEED = 1.8;

        const CAMERA_DISTANCE = 16;
        const CAMERA_HEIGHT = 8;
        const CAMERA_LOOK_HEIGHT = 2.0;

        const BULLET_SPEED = 80;
        const BULLET_DAMAGE = 25;
        const FIRE_COOLDOWN = 0.24;

        const ENEMY_COUNT = 10;

        // ----------------------------------------------------
        // OLD HTML ELEMENTS
        // ----------------------------------------------------

        const oldElements = [
            "menu",
            "hud",
            "pause",
            "achievement",
            "map",
            "gameOver"
        ];

        for (const id of oldElements) {
            const el = document.getElementById(id);

            if (el) {
                el.style.display = "none";
                el.style.pointerEvents = "none";
            }
        }

        // ----------------------------------------------------
        // GAME CANVAS
        // ----------------------------------------------------

        let canvas = document.getElementById("game");

        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "game";
            document.body.appendChild(canvas);
        }

        canvas.style.position = "fixed";
        canvas.style.left = "0";
        canvas.style.top = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.display = "block";
        canvas.style.zIndex = "1";

        // BELANGRIJK:
        // Geen canvas.getContext("2d")!
        // Three.js gebruikt deze canvas voor WebGL.

        // ----------------------------------------------------
        // RENDERER
        // ----------------------------------------------------

        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 2)
        );

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // ----------------------------------------------------
        // SCENE
        // ----------------------------------------------------

        const scene = new THREE.Scene();

        scene.background = new THREE.Color(0x071016);

        scene.fog = new THREE.Fog(
            0x071016,
            80,
            280
        );

        // ----------------------------------------------------
        // CAMERA
        // ----------------------------------------------------

        const camera = new THREE.PerspectiveCamera(
            65,
            window.innerWidth / window.innerHeight,
            0.1,
            600
        );

        // ----------------------------------------------------
        // LIGHTING
        // ----------------------------------------------------

        const ambient = new THREE.HemisphereLight(
            0x9bc7dd,
            0x162018,
            1.6
        );

        scene.add(ambient);

        const sun = new THREE.DirectionalLight(
            0xffffff,
            2.1
        );

        sun.position.set(
            -80,
            120,
            -70
        );

        sun.castShadow = true;

        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;

        sun.shadow.camera.left = -220;
        sun.shadow.camera.right = 220;
        sun.shadow.camera.top = 220;
        sun.shadow.camera.bottom = -220;

        scene.add(sun);

        // ----------------------------------------------------
        // STATE
        // ----------------------------------------------------

        let gameState = "menu";

        let player = null;

        let turret = null;
        let cannon = null;

        let bullets = [];
        let enemies = [];
        let buildings = [];
        let particles = [];

        let keys = {};

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;

        let mouseDown = false;

        let lastTime = performance.now();

        let fireTimer = 0;

        let kills = 0;

        let credits = 250;

        let wave = 1;

        let playerHealth = PLAYER_MAX_HEALTH;
        let playerEnergy = PLAYER_MAX_ENERGY;

        let ammo = 12;
        const maxAmmo = 12;

        let reloadTimer = 0;

        let survivalTime = 0;

        let enemySpawnTimer = 0;

        let shopOpen = false;

        // ----------------------------------------------------
        // SAVE DATA
        // ----------------------------------------------------

        const SAVE_KEY = "echobound_save_v3";

        let achievements = {
            firstKill: false,
            tenKills: false,
            survivor: false,
            rich: false,
            explorer: false
        };

        // ----------------------------------------------------
        // UI ROOT
        // ----------------------------------------------------

        const ui = document.createElement("div");

        ui.id = "echobound-ui";

        ui.style.position = "fixed";
        ui.style.left = "0";
        ui.style.top = "0";
        ui.style.width = "100vw";
        ui.style.height = "100vh";
        ui.style.zIndex = "1000";
        ui.style.pointerEvents = "none";
        ui.style.fontFamily =
            "Arial, Helvetica, sans-serif";

        document.body.appendChild(ui);

        // ----------------------------------------------------
        // UI STYLE
        // ----------------------------------------------------

        const style = document.createElement("style");

        style.textContent = `
            #echobound-ui * {
                box-sizing:border-box;
            }

            .eb-panel {
                background:
                    linear-gradient(
                        145deg,
                        rgba(18,28,39,.98),
                        rgba(7,12,18,.98)
                    );

                border:
                    1px solid rgba(95,185,220,.35);

                box-shadow:
                    0 20px 80px rgba(0,0,0,.65),
                    inset 0 1px 0 rgba(255,255,255,.05);

                border-radius:18px;
                color:#eef8ff;
            }

            .eb-menu {
                position:absolute;
                left:50%;
                top:50%;
                transform:translate(-50%,-50%);
                width:min(560px,92vw);
                padding:34px;
                pointer-events:auto;
            }

            .eb-logo {
                color:#6bdcff;
                font-size:14px;
                letter-spacing:5px;
                margin-bottom:10px;
            }

            .eb-title {
                font-size:48px;
                line-height:1;
                margin:0 0 12px;
                letter-spacing:2px;
                text-shadow:0 0 25px rgba(65,205,255,.25);
            }

            .eb-subtitle {
                color:#9cafbd;
                margin-bottom:28px;
                letter-spacing:2px;
                font-size:12px;
            }

            .eb-button {
                width:100%;
                border:1px solid rgba(102,204,240,.28);
                background:
                    linear-gradient(
                        180deg,
                        rgba(42,69,88,.9),
                        rgba(20,34,46,.9)
                    );
                color:#eafaff;
                padding:14px 18px;
                margin-top:9px;
                border-radius:10px;
                font-weight:bold;
                letter-spacing:1px;
                cursor:pointer;
                transition:
                    transform .12s,
                    background .12s,
                    border-color .12s;
                pointer-events:auto;
            }

            .eb-button:hover {
                transform:translateY(-2px);
                background:
                    linear-gradient(
                        180deg,
                        rgba(58,105,130,.95),
                        rgba(24,43,57,.95)
                    );
                border-color:rgba(120,220,255,.7);
            }

            .eb-button.primary {
                background:
                    linear-gradient(
                        180deg,
                        #57d8ff,
                        #278bad
                    );
                color:#041018;
                border-color:#8be9ff;
            }

            .eb-button.danger {
                background:
                    linear-gradient(
                        180deg,
                        #743d49,
                        #45242b
                    );
            }

            .eb-small {
                color:#8094a2;
                font-size:12px;
                line-height:1.5;
            }

            .eb-hidden {
                display:none !important;
            }

            #eb-hud {
                position:absolute;
                left:0;
                top:0;
                right:0;
                bottom:0;
                pointer-events:none;
            }

            .eb-hud-box {
                position:absolute;
                padding:13px 15px;
                border-radius:12px;
                background:rgba(5,12,17,.78);
                border:1px solid rgba(100,200,230,.2);
                backdrop-filter:blur(8px);
            }

            #eb-status {
                left:18px;
                top:18px;
                width:250px;
            }

            #eb-info {
                right:18px;
                top:18px;
                min-width:190px;
                text-align:right;
            }

            #eb-objective {
                left:18px;
                bottom:18px;
                max-width:330px;
            }

            #eb-crosshair {
                position:absolute;
                left:50%;
                top:50%;
                transform:translate(-50%,-50%);
                width:32px;
                height:32px;
            }

            #eb-crosshair:before,
            #eb-crosshair:after {
                content:"";
                position:absolute;
                background:#bff5ff;
                box-shadow:0 0 8px #58ddff;
            }

            #eb-crosshair:before {
                width:2px;
                height:32px;
                left:15px;
                top:0;
            }

            #eb-crosshair:after {
                height:2px;
                width:32px;
                left:0;
                top:15px;
            }

            .eb-bar {
                width:100%;
                height:9px;
                border-radius:99px;
                overflow:hidden;
                background:#111c24;
                margin-top:6px;
                margin-bottom:10px;
            }

            .eb-bar-fill {
                height:100%;
                width:100%;
                background:#56db83;
                transition:width .15s;
            }

            .eb-energy {
                background:#55caff;
            }

            .eb-label {
                font-size:10px;
                color:#91a7b5;
                letter-spacing:1px;
            }

            .eb-value {
                font-size:15px;
                color:#ecfbff;
            }

            .eb-side-buttons {
                position:absolute;
                right:18px;
                bottom:18px;
                display:flex;
                gap:8px;
                pointer-events:auto;
            }

            .eb-side-buttons button {
                width:auto;
                margin:0;
                padding:10px 14px;
            }

            .eb-modal {
                position:absolute;
                left:50%;
                top:50%;
                transform:translate(-50%,-50%);
                width:min(600px,92vw);
                max-height:88vh;
                overflow:auto;
                padding:28px;
                pointer-events:auto;
            }

            .eb-modal h2 {
                margin:0 0 20px;
                font-size:27px;
            }

            .eb-row {
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:15px;
                padding:12px 0;
                border-bottom:1px solid rgba(255,255,255,.07);
            }

            .eb-achievement {
                padding:14px;
                border-radius:10px;
                margin-bottom:9px;
                background:rgba(255,255,255,.035);
                border:1px solid rgba(255,255,255,.06);
            }

            .eb-achievement.unlocked {
                border-color:rgba(91,224,166,.5);
                background:rgba(57,125,96,.12);
            }

            .eb-shop-item {
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:15px;
                padding:15px 0;
                border-bottom:1px solid rgba(255,255,255,.07);
            }

            .eb-shop-item button {
                width:auto;
                margin:0;
            }

            #eb-map-canvas {
                width:100%;
                height:auto;
                display:block;
                border-radius:12px;
                background:#091016;
                border:1px solid rgba(255,255,255,.08);
            }

            .eb-notice {
                position:absolute;
                left:50%;
                top:15%;
                transform:translateX(-50%);
                padding:12px 20px;
                background:rgba(6,15,21,.95);
                border:1px solid rgba(100,220,255,.35);
                border-radius:10px;
                color:#dff8ff;
                pointer-events:none;
            }
        `;

        ui.appendChild(style);

        // ----------------------------------------------------
        // UI HELPERS
        // ----------------------------------------------------

        function createElement(tag, className, parent) {
            const el = document.createElement(tag);

            if (className) {
                el.className = className;
            }

            if (parent) {
                parent.appendChild(el);
            }

            return el;
        }

        function button(parent, text, callback, className = "") {
            const b = document.createElement("button");

            b.className =
                "eb-button " + className;

            b.textContent = text;

            b.type = "button";

            b.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();

                try {
                    callback();
                } catch (error) {
                    console.error(error);
                }
            });

            parent.appendChild(b);

            return b;
        }

        function hide(el) {
            if (el) {
                el.classList.add("eb-hidden");
            }
        }

        function show(el) {
            if (el) {
                el.classList.remove("eb-hidden");
            }
        }

        // ----------------------------------------------------
        // MAIN MENU
        // ----------------------------------------------------

        const menu = createElement(
            "div",
            "eb-panel eb-menu",
            ui
        );

        menu.innerHTML = `
            <div class="eb-logo">THE LOST SIGNAL</div>
            <h1 class="eb-title">ECHOBOUND</h1>
            <div class="eb-subtitle">
                SURVIVAL • COMBAT • EXPLORATION
            </div>
        `;

        const menuButtons = createElement(
            "div",
            "",
            menu
        );

        button(
            menuButtons,
            "NEW RUN",
            startNewGame,
            "primary"
        );

        button(
            menuButtons,
            "LOAD GAME",
            loadGame
        );

        button(
            menuButtons,
            "ACHIEVEMENTS",
            openAchievements
        );

        button(
            menuButtons,
            "CONTROLS",
            openControls
        );

        createElement(
            "p",
            "eb-small",
            menu
        ).textContent =
            "WASD bestuurt de tank • Muis richt het kanon • Linkermuisknop vuurt";

        // ----------------------------------------------------
        // HUD
        // ----------------------------------------------------

        const hud = createElement(
            "div",
            "eb-hidden",
            ui
        );

        hud.id = "eb-hud";

        // status
        const statusBox = createElement(
            "div",
            "eb-hud-box",
            hud
        );

        statusBox.id = "eb-status";

        statusBox.innerHTML = `
            <div class="eb-label">HULL</div>
            <div class="eb-bar">
                <div id="eb-health-fill"
                     class="eb-bar-fill"></div>
            </div>

            <div class="eb-label">ENERGY</div>
            <div class="eb-bar">
                <div id="eb-energy-fill"
                     class="eb-bar-fill eb-energy"></div>
            </div>
        `;

        // info
        const infoBox = createElement(
            "div",
            "eb-hud-box",
            hud
        );

        infoBox.id = "eb-info";

        infoBox.innerHTML = `
            <div>
                <span class="eb-label">AMMO</span>
                <span id="eb-ammo"
                      class="eb-value">12 / 12</span>
            </div>

            <div style="margin-top:8px">
                <span class="eb-label">KILLS</span>
                <span id="eb-kills"
                      class="eb-value">0</span>
            </div>

            <div style="margin-top:8px">
                <span class="eb-label">CREDITS</span>
                <span id="eb-credits"
                      class="eb-value">250</span>
            </div>

            <div style="margin-top:8px">
                <span class="eb-label">WAVE</span>
                <span id="eb-wave"
                      class="eb-value">1</span>
            </div>
        `;

        const objective = createElement(
            "div",
            "eb-hud-box",
            hud
        );

        objective.id = "eb-objective";

        objective.innerHTML = `
            <div class="eb-label">OBJECTIVE</div>
            <div id="eb-objective-text">
                Survive and find the lost signal.
            </div>
        `;

        const crosshair = createElement(
            "div",
            "",
            hud
        );

        crosshair.id = "eb-crosshair";

        const sideButtons = createElement(
            "div",
            "eb-side-buttons",
            hud
        );

        button(
            sideButtons,
            "SHOP",
            openShop
        );

        button(
            sideButtons,
            "MAP",
            openMap
        );

        button(
            sideButtons,
            "PAUSE",
            pauseGame
        );

        // ----------------------------------------------------
        // PAUSE
        // ----------------------------------------------------

        const pausePanel = createElement(
            "div",
            "eb-panel eb-modal eb-hidden",
            ui
        );

        const pauseTitle = createElement(
            "h2",
            "",
            pausePanel
        );

        pauseTitle.textContent = "PAUSED";

        button(
            pausePanel,
            "RESUME",
            resumeGame,
            "primary"
        );

        button(
            pausePanel,
            "SAVE GAME",
            saveGame
        );

        button(
            pausePanel,
            "ACHIEVEMENTS",
            openAchievements
        );

        button(
            pausePanel,
            "CONTROLS",
            openControls
        );

        button(
            pausePanel,
            "QUIT TO MENU",
            quitToMenu,
            "danger"
        );

        // ----------------------------------------------------
        // ACHIEVEMENTS
        // ----------------------------------------------------

        const achievementsPanel = createElement(
            "div",
            "eb-panel eb-modal eb-hidden",
            ui
        );

        achievementsPanel.innerHTML = `
            <h2>ACHIEVEMENTS</h2>
            <div id="eb-achievements-list"></div>
        `;

        const achievementsList =
            achievementsPanel.querySelector(
                "#eb-achievements-list"
            );

        button(
            achievementsPanel,
            "BACK",
            closeModal
        );

        // ----------------------------------------------------
        // CONTROLS
        // ----------------------------------------------------

        const controlsPanel = createElement(
            "div",
            "eb-panel eb-modal eb-hidden",
            ui
        );

        controlsPanel.innerHTML = `
            <h2>CONTROLS</h2>

            <div class="eb-row">
                <span>Move forward</span>
                <strong>W</strong>
            </div>

            <div class="eb-row">
                <span>Move backward</span>
                <strong>S</strong>
            </div>

            <div class="eb-row">
                <span>Turn tank left</span>
                <strong>A</strong>
            </div>

            <div class="eb-row">
                <span>Turn tank right</span>
                <strong>D</strong>
            </div>

            <div class="eb-row">
                <span>Aim cannon</span>
                <strong>MOUSE</strong>
            </div>

            <div class="eb-row">
                <span>Fire</span>
                <strong>LEFT CLICK</strong>
            </div>

            <div class="eb-row">
                <span>Reload</span>
                <strong>R</strong>
            </div>

            <div class="eb-row">
                <span>Pause</span>
                <strong>ESC</strong>
            </div>
        `;

        button(
            controlsPanel,
            "BACK",
            closeModal
        );

        // ----------------------------------------------------
        // SHOP
        // ----------------------------------------------------

        const shopPanel = createElement(
            "div",
            "eb-panel eb-modal eb-hidden",
            ui
        );

        shopPanel.innerHTML = `
            <h2>FIELD SHOP</h2>

            <div class="eb-small"
                 style="margin-bottom:15px">
                Spend credits on upgrades.
            </div>

            <div class="eb-shop-item">
                <div>
                    <strong>Repair hull</strong>
                    <div class="eb-small">
                        Restore 30 health
                    </div>
                </div>

                <button id="eb-buy-repair"
                        class="eb-button">
                    80 CR
                </button>
            </div>

            <div class="eb-shop-item">
                <div>
                    <strong>Energy cell</strong>
                    <div class="eb-small">
                        Restore 40 energy
                    </div>
                </div>

                <button id="eb-buy-energy"
                        class="eb-button">
                    50 CR
                </button>
            </div>

            <div class="eb-shop-item">
                <div>
                    <strong>Ammo pack</strong>
                    <div class="eb-small">
                        Refill ammunition
                    </div>
                </div>

                <button id="eb-buy-ammo"
                        class="eb-button">
                    60 CR
                </button>
            </div>
        `;

        button(
            shopPanel,
            "CLOSE",
            closeModal
        );

        // ----------------------------------------------------
        // MAP
        // ----------------------------------------------------

        const mapPanel = createElement(
            "div",
            "eb-panel eb-modal eb-hidden",
            ui
        );

        mapPanel.innerHTML = `
            <h2>MAP</h2>
            <canvas
                id="eb-map-canvas"
                width="700"
                height="500">
            </canvas>
        `;

        button(
            mapPanel,
            "CLOSE",
            closeModal
        );

        // Separate 2D canvas!
        // Dus NIET de Three.js canvas.
        const mapCanvas =
            mapPanel.querySelector(
                "#eb-map-canvas"
            );

        const mapCtx =
            mapCanvas.getContext("2d");

        // ----------------------------------------------------
        // GAME OVER
        // ----------------------------------------------------

        const gameOverPanel = createElement(
            "div",
            "eb-panel eb-modal eb-hidden",
            ui
        );

        gameOverPanel.innerHTML = `
            <h2>MISSION FAILED</h2>

            <div id="eb-gameover-text"
                 class="eb-small"
                 style="font-size:15px">
            </div>
        `;

        button(
            gameOverPanel,
            "NEW RUN",
            startNewGame,
            "primary"
        );

        button(
            gameOverPanel,
            "LOAD GAME",
            loadGame
        );

        button(
            gameOverPanel,
            "MAIN MENU",
            quitToMenu
        );

        // ----------------------------------------------------
        // NOTICE
        // ----------------------------------------------------

        let noticeTimer = null;

        function notify(message) {
            const old =
                ui.querySelector(".eb-notice");

            if (old) {
                old.remove();
            }

            const n = createElement(
                "div",
                "eb-notice",
                ui
            );

            n.textContent = message;

            clearTimeout(noticeTimer);

            noticeTimer = setTimeout(
                () => {
                    n.remove();
                },
                1800
            );
        }

        // ----------------------------------------------------
        // SHOW / HIDE UI
        // ----------------------------------------------------

        function hideAllModals() {
            hide(pausePanel);
            hide(achievementsPanel);
            hide(controlsPanel);
            hide(shopPanel);
            hide(mapPanel);
            hide(gameOverPanel);
        }

        function closeModal() {
            hideAllModals();

            if (gameState === "playing") {
                show(hud);
            }
        }

        function showMenu() {
            gameState = "menu";

            hideAllModals();
            hide(hud);

            show(menu);

            mouseDown = false;
        }

        function showGame() {
            hide(menu);
            hideAllModals();
            show(hud);
        }

        // ----------------------------------------------------
        // ACHIEVEMENTS
        // ----------------------------------------------------

        const achievementDefinitions = [
            {
                id: "firstKill",
                name: "FIRST CONTACT",
                description:
                    "Destroy your first enemy."
            },
            {
                id: "tenKills",
                name: "DEFENDER",
                description:
                    "Destroy 10 enemies."
            },
            {
                id: "survivor",
                name: "SURVIVOR",
                description:
                    "Survive for 3 minutes."
            },
            {
                id: "rich",
                name: "RESOURCEFUL",
                description:
                    "Collect 1000 credits."
            },
            {
                id: "explorer",
                name: "EXPLORER",
                description:
                    "Travel far from the starting zone."
            }
        ];

        function updateAchievementsUI() {
            achievementsList.innerHTML = "";

            for (const a of achievementDefinitions) {
                const unlocked =
                    !!achievements[a.id];

                const item =
                    createElement(
                        "div",
                        "eb-achievement" +
                        (unlocked
                            ? " unlocked"
                            : ""),
                        achievementsList
                    );

                item.innerHTML = `
                    <strong>
                        ${unlocked ? "✓ " : "○ "}
                        ${a.name}
                    </strong>

                    <div class="eb-small">
                        ${a.description}
                    </div>
                `;
            }
        }

        function openAchievements() {
            hideAllModals();
            hide(menu);
            hide(hud);

            updateAchievementsUI();

            show(achievementsPanel);
        }

        // ----------------------------------------------------
        // CONTROLS
        // ----------------------------------------------------

        function openControls() {
            hideAllModals();
            hide(menu);
            hide(hud);

            show(controlsPanel);
        }

        // ----------------------------------------------------
        // SHOP
        // ----------------------------------------------------

        function openShop() {
            if (gameState !== "playing") {
                return;
            }

            shopOpen = true;

            hideAllModals();

            hide(hud);

            show(shopPanel);
        }

        function buyRepair() {
            if (credits < 80) {
                notify("Niet genoeg credits.");
                return;
            }

            if (playerHealth >= PLAYER_MAX_HEALTH) {
                notify("Hull is al vol.");
                return;
            }

            credits -= 80;

            playerHealth =
                Math.min(
                    PLAYER_MAX_HEALTH,
                    playerHealth + 30
                );

            notify("Hull gerepareerd.");

            updateHUD();
        }

        function buyEnergy() {
            if (credits < 50) {
                notify("Niet genoeg credits.");
                return;
            }

            if (playerEnergy >= PLAYER_MAX_ENERGY) {
                notify("Energy is al vol.");
                return;
            }

            credits -= 50;

            playerEnergy =
                Math.min(
                    PLAYER_MAX_ENERGY,
                    playerEnergy + 40
                );

            notify("Energy geladen.");

            updateHUD();
        }

        function buyAmmo() {
            if (credits < 60) {
                notify("Niet genoeg credits.");
                return;
            }

            credits -= 60;

            ammo = maxAmmo;

            notify("Ammunition gevuld.");

            updateHUD();
        }

        shopPanel
            .querySelector("#eb-buy-repair")
            .addEventListener(
                "click",
                buyRepair
            );

        shopPanel
            .querySelector("#eb-buy-energy")
            .addEventListener(
                "click",
                buyEnergy
            );

        shopPanel
            .querySelector("#eb-buy-ammo")
            .addEventListener(
                "click",
                buyAmmo
            );

        // ----------------------------------------------------
        // PAUSE
        // ----------------------------------------------------

        function pauseGame() {
            if (gameState !== "playing") {
                return;
            }

            gameState = "paused";

            hideAllModals();

            hide(hud);

            show(pausePanel);

            mouseDown = false;
        }

        function resumeGame() {
            if (gameState !== "paused") {
                return;
            }

            gameState = "playing";

            hideAllModals();

            show(hud);
        }

        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        function saveGame() {
            if (!player) {
                notify("Geen game om op te slaan.");
                return;
            }

            const data = {
                player: {
                    x: player.position.x,
                    z: player.position.z,
                    rotation: player.rotation.y
                },

                health: playerHealth,
                energy: playerEnergy,

                ammo: ammo,
                kills: kills,
                credits: credits,
                wave: wave,

                survivalTime: survivalTime,

                achievements: achievements
            };

            localStorage.setItem(
                SAVE_KEY,
                JSON.stringify(data)
            );

            notify("Game opgeslagen.");
        }

        // ----------------------------------------------------
        // LOAD
        // ----------------------------------------------------

        function loadGame() {
            const raw =
                localStorage.getItem(
                    SAVE_KEY
                );

            if (!raw) {
                notify("Geen opgeslagen game gevonden.");
                return;
            }

            let data;

            try {
                data = JSON.parse(raw);
            } catch (error) {
                notify("Savebestand is ongeldig.");
                return;
            }

            startNewGame(data);
        }

        // ----------------------------------------------------
        // MENU
        // ----------------------------------------------------

        function quitToMenu() {
            gameState = "menu";

            hideAllModals();

            hide(hud);

            show(menu);

            mouseDown = false;

            clearWorld();
        }

        // ----------------------------------------------------
        // WORLD MATERIALS
        // ----------------------------------------------------

        const materials = {
            ground:
                new THREE.MeshStandardMaterial({
                    color:0x17231f,
                    roughness:0.92
                }),

            road:
                new THREE.MeshStandardMaterial({
                    color:0x202a2e,
                    roughness:0.85
                }),

            wall:
                new THREE.MeshStandardMaterial({
                    color:0x263742,
                    roughness:0.7,
                    metalness:0.35
                }),

            wallTop:
                new THREE.MeshStandardMaterial({
                    color:0x395364,
                    roughness:0.55,
                    metalness:0.4
                }),

            tankBody:
                new THREE.MeshStandardMaterial({
                    color:0x536a73,
                    roughness:0.42,
                    metalness:0.68
                }),

            tankDark:
                new THREE.MeshStandardMaterial({
                    color:0x172127,
                    roughness:0.5,
                    metalness:0.65
                }),

            turret:
                new THREE.MeshStandardMaterial({
                    color:0x607985,
                    roughness:0.35,
                    metalness:0.72
                }),

            cannon:
                new THREE.MeshStandardMaterial({
                    color:0x10191e,
                    roughness:0.28,
                    metalness:0.82
                }),

            enemy:
                new THREE.MeshStandardMaterial({
                    color:0x9a4350,
                    roughness:0.48,
                    metalness:0.35
                }),

            enemyDark:
                new THREE.MeshStandardMaterial({
                    color:0x421f2a,
                    roughness:0.55,
                    metalness:0.25
                }),

            bullet:
                new THREE.MeshBasicMaterial({
                    color:0x62dcff
                })
        };

        // ----------------------------------------------------
        // GROUND
        // ----------------------------------------------------

        const groundGeometry =
            new THREE.PlaneGeometry(
                WORLD_SIZE,
                WORLD_SIZE
            );

        const ground =
            new THREE.Mesh(
                groundGeometry,
                materials.ground
            );

        ground.rotation.x = -Math.PI / 2;

        ground.receiveShadow = true;

        scene.add(ground);

        // ----------------------------------------------------
        // GRID / PATHS
        // ----------------------------------------------------

        const grid = new THREE.GridHelper(
            WORLD_SIZE,
            60,
            0x31505b,
            0x17272d
        );

        grid.position.y = 0.025;

        scene.add(grid);

        // ----------------------------------------------------
        // WORLD GROUP
        // ----------------------------------------------------

        const worldGroup =
            new THREE.Group();

        scene.add(worldGroup);

        // ----------------------------------------------------
        // PLAYER GROUP
        // ----------------------------------------------------

        function createTank() {

            const tank =
                new THREE.Group();

            // body
            const bodyGeometry =
                new THREE.BoxGeometry(
                    4.8,
                    1.65,
                    6.4
                );

            const body =
                new THREE.Mesh(
                    bodyGeometry,
                    materials.tankBody
                );

            body.position.y = 1.2;

            body.castShadow = true;
            body.receiveShadow = true;

            tank.add(body);

            // lower body
            const lowerGeometry =
                new THREE.BoxGeometry(
                    5.2,
                    0.8,
                    6.8
                );

            const lower =
                new THREE.Mesh(
                    lowerGeometry,
                    materials.tankDark
                );

            lower.position.y = 0.65;

            lower.castShadow = true;

            tank.add(lower);

            // tracks
            for (const side of [-1, 1]) {

                const track =
                    new THREE.Mesh(
                        new THREE.BoxGeometry(
                            0.85,
                            1.35,
                            6.5
                        ),
                        materials.tankDark
                    );

                track.position.set(
                    side * 2.65,
                    0.82,
                    0
                );

                track.castShadow = true;

                tank.add(track);
            }

            // turret
            const turretBase =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        1.75,
                        1.9,
                        0.65,
                        20
                    ),
                    materials.turret
                );

            turretBase.position.y = 2.15;

            turretBase.castShadow = true;

            tank.add(turretBase);

            turret =
                new THREE.Group();

            turret.position.y = 2.35;

            tank.add(turret);

            const turretBody =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        2.8,
                        0.9,
                        3.2
                    ),
                    materials.turret
                );

            turretBody.castShadow = true;

            turret.add(turretBody);

            // cannon
            cannon =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.28,
                        0.34,
                        5.5,
                        16
                    ),
                    materials.cannon
                );

            cannon.rotation.x =
                Math.PI / 2;

            cannon.position.set(
                0,
                0.05,
                -3.3
            );

            cannon.castShadow = true;

            turret.add(cannon);

            // cannon muzzle
            const muzzle =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.4,
                        0.4,
                        0.55,
                        16
                    ),
                    materials.cannon
                );

            muzzle.rotation.x =
                Math.PI / 2;

            muzzle.position.z = -2.8;

            cannon.add(muzzle);

            // headlights
            for (const side of [-1, 1]) {

                const light =
                    new THREE.Mesh(
                        new THREE.BoxGeometry(
                            0.45,
                            0.25,
                            0.12
                        ),
                        new THREE.MeshBasicMaterial({
                            color:0x8eeaff
                        })
                    );

                light.position.set(
                    side * 1.25,
                    1.45,
                    -3.23
                );

                tank.add(light);
            }

            return tank;
        }

        // ----------------------------------------------------
        // BUILDING
        // ----------------------------------------------------

        function createBuilding(
            x,
            z,
            width,
            depth,
            height
        ) {

            const group =
                new THREE.Group();

            group.position.set(
                x,
                0,
                z
            );

            const main =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        width,
                        height,
                        depth
                    ),
                    materials.wall
                );

            main.position.y =
                height / 2;

            main.castShadow = true;
            main.receiveShadow = true;

            group.add(main);

            const roof =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        width + 0.25,
                        0.35,
                        depth + 0.25
                    ),
                    materials.wallTop
                );

            roof.position.y =
                height + 0.17;

            roof.castShadow = true;

            group.add(roof);

            worldGroup.add(group);

            buildings.push({
                x,
                z,
                width,
                depth,
                height,
                mesh:group
            });
        }

        // ----------------------------------------------------
        // CREATE WORLD
        // ----------------------------------------------------

        function createWorld() {

            buildings = [];

            // perimeter
            createBuilding(
                0,
                -HALF_WORLD + 4,
                WORLD_SIZE,
                8,
                8
            );

            createBuilding(
                0,
                HALF_WORLD - 4,
                WORLD_SIZE,
                8,
                8
            );

            createBuilding(
                -HALF_WORLD + 4,
                0,
                8,
                WORLD_SIZE,
                8
            );

            createBuilding(
                HALF_WORLD - 4,
                0,
                8,
                WORLD_SIZE,
                8
            );

            // city structures
            const positions = [
                [-70,-75,35,28],
                [35,-75,30,32],
                [85,-45,35,25],

                [-100,-5,30,38],
                [55,5,45,26],

                [-65,55,32,32],
                [5,65,42,28],
                [90,70,30,38],

                [-110,105,28,24],
                [115,110,38,28],

                [-5,-125,28,25],
                [90,-120,35,25]
            ];

            for (const p of positions) {
                createBuilding(
                    p[0],
                    p[1],
                    p[2],
                    p[3],
                    5 + Math.random() * 6
                );
            }

            // smaller cover
            for (let i = 0; i < 22; i++) {

                const x =
                    THREE.MathUtils.randFloat(
                        -145,
                        145
                    );

                const z =
                    THREE.MathUtils.randFloat(
                        -145,
                        145
                    );

                if (
                    Math.abs(x) < 25 &&
                    Math.abs(z) < 25
                ) {
                    continue;
                }

                createBuilding(
                    x,
                    z,
                    THREE.MathUtils.randFloat(
                        7,
                        13
                    ),
                    THREE.MathUtils.randFloat(
                        7,
                        13
                    ),
                    THREE.MathUtils.randFloat(
                        2.5,
                        5
                    )
                );
            }
        }

        createWorld();

        // ----------------------------------------------------
        // DECORATION
        // ----------------------------------------------------

        function createDecoration() {

            const decoration =
                new THREE.Group();

            worldGroup.add(decoration);

            for (let i = 0; i < 130; i++) {

                const x =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 12,
                        HALF_WORLD - 12
                    );

                const z =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 12,
                        HALF_WORLD - 12
                    );

                if (
                    Math.abs(x) < 30 &&
                    Math.abs(z) < 30
                ) {
                    continue;
                }

                const rock =
                    new THREE.Mesh(
                        new THREE.DodecahedronGeometry(
                            THREE.MathUtils.randFloat(
                                0.25,
                                0.8
                            ),
                            0
                        ),
                        new THREE.MeshStandardMaterial({
                            color:
                                THREE.MathUtils.randInt(
                                    0x263c42,
                                    0x425b61
                                ),
                            roughness:1
                        })
                    );

                rock.position.set(
                    x,
                    0.35,
                    z
                );

                rock.rotation.set(
                    Math.random(),
                    Math.random(),
                    Math.random()
                );

                rock.castShadow = true;

                decoration.add(rock);
            }
        }

        createDecoration();

        // ----------------------------------------------------
        // COLLISION
        // ----------------------------------------------------

        function circleIntersectsRect(
            x,
            z,
            radius,
            rect
        ) {

            const minX =
                rect.x - rect.width / 2;

            const maxX =
                rect.x + rect.width / 2;

            const minZ =
                rect.z - rect.depth / 2;

            const maxZ =
                rect.z + rect.depth / 2;

            const closestX =
                Math.max(
                    minX,
                    Math.min(x, maxX)
                );

            const closestZ =
                Math.max(
                    minZ,
                    Math.min(z, maxZ)
                );

            const dx = x - closestX;
            const dz = z - closestZ;

            return (
                dx * dx +
                dz * dz <
                radius * radius
            );
        }

        function positionBlocked(
            x,
            z,
            radius
        ) {

            if (
                x < -HALF_WORLD + 10 ||
                x > HALF_WORLD - 10 ||
                z < -HALF_WORLD + 10 ||
                z > HALF_WORLD - 10
            ) {
                return true;
            }

            for (const b of buildings) {
                if (
                    circleIntersectsRect(
                        x,
                        z,
                        radius,
                        b
                    )
                ) {
                    return true;
                }
            }

            return false;
        }

        function moveTank(
            dx,
            dz
        ) {

            if (!player) {
                return;
            }

            const oldX =
                player.position.x;

            const oldZ =
                player.position.z;

            player.position.x += dx;

            if (
                positionBlocked(
                    player.position.x,
                    player.position.z,
                    3.1
                )
            ) {
                player.position.x = oldX;
            }

            player.position.z += dz;

            if (
                positionBlocked(
                    player.position.x,
                    player.position.z,
                    3.1
                )
            ) {
                player.position.z = oldZ;
            }
        }

        // ----------------------------------------------------
        // LINE OF SIGHT
        // ----------------------------------------------------

        function lineBlocked(
            start,
            end
        ) {

            const dx =
                end.x - start.x;

            const dz =
                end.z - start.z;

            const length =
                Math.sqrt(
                    dx * dx +
                    dz * dz
                );

            if (length <= 0.001) {
                return false;
            }

            const steps =
                Math.ceil(length / 2);

            for (let i = 1; i < steps; i++) {

                const t = i / steps;

                const x =
                    start.x + dx * t;

                const z =
                    start.z + dz * t;

                if (
                    positionBlocked(
                        x,
                        z,
                        0.5
                    )
                ) {
                    return true;
                }
            }

            return false;
        }

        // ----------------------------------------------------
        // ENEMIES
        // ----------------------------------------------------

        function createEnemy(
            x,
            z
        ) {

            const enemy =
                new THREE.Group();

            enemy.position.set(
                x,
                0,
                z
            );

            const body =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        3.6,
                        1.8,
                        4.8
                    ),
                    materials.enemy
                );

            body.position.y = 1.15;

            body.castShadow = true;

            enemy.add(body);

            const head =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        2.5,
                        1.0,
                        2.5
                    ),
                    materials.enemyDark
                );

            head.position.y = 2.3;

            head.castShadow = true;

            enemy.add(head);

            const eyeMaterial =
                new THREE.MeshBasicMaterial({
                    color:0x9cffce
                });

            for (const side of [-1, 1]) {

                const eye =
                    new THREE.Mesh(
                        new THREE.BoxGeometry(
                            0.35,
                            0.25,
                            0.12
                        ),
                        eyeMaterial
                    );

                eye.position.set(
                    side * 0.7,
                    2.35,
                    -1.27
                );

                enemy.add(eye);
            }

            enemy.userData = {
                health:60,
                speed:
                    THREE.MathUtils.randFloat(
                        3.0,
                        5.0
                    ),
                hitTimer:0
            };

            scene.add(enemy);

            enemies.push(enemy);

            return enemy;
        }

        function spawnEnemy() {

            if (!player) {
                return;
            }

            let x = 0;
            let z = 0;

            for (let tries = 0; tries < 50; tries++) {

                const angle =
                    Math.random() *
                    Math.PI *
                    2;

                const distance =
                    THREE.MathUtils.randFloat(
                        65,
                        125
                    );

                x =
                    player.position.x +
                    Math.cos(angle) *
                    distance;

                z =
                    player.position.z +
                    Math.sin(angle) *
                    distance;

                if (
                    !positionBlocked(
                        x,
                        z,
                        3
                    )
                ) {
                    break;
                }
            }

            createEnemy(x, z);
        }

        // ----------------------------------------------------
        // BULLETS
        // ----------------------------------------------------

        function createBullet() {

            if (!player || !cannon) {
                return;
            }

            if (ammo <= 0) {
                notify("Geen ammo. Druk R om te reloaden.");
                return;
            }

            if (reloadTimer > 0) {
                return;
            }

            if (fireTimer > 0) {
                return;
            }

            ammo--;

            fireTimer =
                FIRE_COOLDOWN;

            const direction =
                new THREE.Vector3(
                    0,
                    0,
                    -1
                );

            cannon.getWorldDirection(
                direction
            );

            const position =
                new THREE.Vector3();

            cannon.getWorldPosition(
                position
            );

            position.add(
                direction.clone().multiplyScalar(3)
            );

            const mesh =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.22,
                        10,
                        10
                    ),
                    materials.bullet
                );

            mesh.position.copy(position);

            scene.add(mesh);

            bullets.push({
                mesh,
                velocity:
                    direction
                        .clone()
                        .multiplyScalar(
                            BULLET_SPEED
                        ),
                life:3
            });

            // muzzle flash
            createMuzzleFlash(position);
        }

        function createMuzzleFlash(position) {

            const flash =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.65,
                        10,
                        10
                    ),
                    new THREE.MeshBasicMaterial({
                        color:0x8beaff,
                        transparent:true,
                        opacity:0.8
                    })
                );

            flash.position.copy(position);

            scene.add(flash);

            particles.push({
                mesh:flash,
                life:0.08
            });
        }

        function updateBullets(dt) {

            for (
                let i = bullets.length - 1;
                i >= 0;
                i--
            ) {

                const b = bullets[i];

                const old =
                    b.mesh.position.clone();

                b.mesh.position.add(
                    b.velocity
                        .clone()
                        .multiplyScalar(dt)
                );

                b.life -= dt;

                // muur
                if (
                    lineBlocked(
                        old,
                        b.mesh.position
                    )
                ) {
                    removeBullet(i);
                    continue;
                }

                // enemy hit
                let hit = false;

                for (
                    let j = enemies.length - 1;
                    j >= 0;
                    j--
                ) {

                    const enemy =
                        enemies[j];

                    const distance =
                        enemy.position.distanceTo(
                            b.mesh.position
                        );

                    if (distance < 3.0) {

                        enemy.userData.health -=
                            BULLET_DAMAGE;

                        createHitEffect(
                            b.mesh.position
                        );

                        removeBullet(i);

                        hit = true;

                        if (
                            enemy.userData.health <= 0
                        ) {
                            destroyEnemy(j);
                        }

                        break;
                    }
                }

                if (hit) {
                    continue;
                }

                if (
                    b.life <= 0 ||
                    Math.abs(
                        b.mesh.position.x
                    ) > HALF_WORLD ||
                    Math.abs(
                        b.mesh.position.z
                    ) > HALF_WORLD
                ) {
                    removeBullet(i);
                }
            }
        }

        function removeBullet(index) {

            const bullet =
                bullets[index];

            if (!bullet) {
                return;
            }

            scene.remove(
                bullet.mesh
            );

            bullet.mesh.geometry.dispose();

            bullets.splice(index, 1);
        }

        function createHitEffect(position) {

            const ring =
                new THREE.Mesh(
                    new THREE.RingGeometry(
                        0.2,
                        0.6,
                        16
                    ),
                    new THREE.MeshBasicMaterial({
                        color:0x9beeff,
                        transparent:true,
                        opacity:0.9,
                        side:THREE.DoubleSide
                    })
                );

            ring.rotation.x =
                -Math.PI / 2;

            ring.position.copy(position);

            ring.position.y += 0.1;

            scene.add(ring);

            particles.push({
                mesh:ring,
                life:0.25,
                grow:true
            });
        }

        // ----------------------------------------------------
        // ENEMY UPDATE
        // ----------------------------------------------------

        function updateEnemies(dt) {

            if (!player) {
                return;
            }

            for (
                let i = enemies.length - 1;
                i >= 0;
                i--
            ) {

                const enemy =
                    enemies[i];

                if (!enemy) {
                    continue;
                }

                const dx =
                    player.position.x -
                    enemy.position.x;

                const dz =
                    player.position.z -
                    enemy.position.z;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dz * dz
                    );

                enemy.userData.hitTimer -= dt;

                // face player
                const targetRotation =
                    Math.atan2(
                        -dx,
                        -dz
                    );

                enemy.rotation.y =
                    THREE.MathUtils.lerp(
                        enemy.rotation.y,
                        targetRotation,
                        Math.min(
                            1,
                            dt * 4
                        )
                    );

                // move
                if (distance > 7) {

                    const moveX =
                        dx / Math.max(
                            distance,
                            0.001
                        );

                    const moveZ =
                        dz / Math.max(
                            distance,
                            0.001
                        );

                    const speed =
                        enemy.userData.speed;

                    const oldX =
                        enemy.position.x;

                    const oldZ =
                        enemy.position.z;

                    enemy.position.x +=
                        moveX *
                        speed *
                        dt;

                    enemy.position.z +=
                        moveZ *
                        speed *
                        dt;

                    if (
                        positionBlocked(
                            enemy.position.x,
                            enemy.position.z,
                            2.2
                        )
                    ) {
                        enemy.position.x =
                            oldX;

                        enemy.position.z =
                            oldZ;
                    }
                }

                // attack if close
                if (
                    distance < 7 &&
                    enemy.userData.hitTimer <= 0
                ) {

                    enemy.userData.hitTimer =
                        1.0;

                    damagePlayer(8);
                }
            }
        }

        function destroyEnemy(index) {

            const enemy =
                enemies[index];

            if (!enemy) {
                return;
            }

            createExplosion(
                enemy.position.clone()
            );

            scene.remove(enemy);

            enemies.splice(
                index,
                1
            );

            kills++;

            credits += 35;

            if (!achievements.firstKill) {
                achievements.firstKill = true;
                notify("Achievement: FIRST CONTACT");
            }

            if (
                kills >= 10 &&
                !achievements.tenKills
            ) {
                achievements.tenKills = true;
                notify("Achievement: DEFENDER");
            }

            if (credits >= 1000) {
                achievements.rich = true;
            }

            updateHUD();
        }

        function createExplosion(position) {

            for (let i = 0; i < 8; i++) {

                const mesh =
                    new THREE.Mesh(
                        new THREE.BoxGeometry(
                            0.2,
                            0.2,
                            0.2
                        ),
                        new THREE.MeshBasicMaterial({
                            color:
                                i % 2
                                    ? 0x65dfff
                                    : 0xffffff
                        })
                    );

                mesh.position.copy(position);

                mesh.position.y +=
                    THREE.MathUtils.randFloat(
                        0.5,
                        2.5
                    );

                scene.add(mesh);

                particles.push({
                    mesh,
                    life:0.7,
                    velocity:
                        new THREE.Vector3(
                            THREE.MathUtils.randFloat(
                                -5,
                                5
                            ),
                            THREE.MathUtils.randFloat(
                                1,
                                7
                            ),
                            THREE.MathUtils.randFloat(
                                -5,
                                5
                            )
                        )
                });
            }
        }

        // ----------------------------------------------------
        // PLAYER DAMAGE
        // ----------------------------------------------------

        function damagePlayer(amount) {

            if (gameState !== "playing") {
                return;
            }

            playerHealth =
                Math.max(
                    0,
                    playerHealth - amount
                );

            updateHUD();

            if (playerHealth <= 0) {
                gameOver();
            }
        }

        // ----------------------------------------------------
        // PARTICLES
        // ----------------------------------------------------

        function updateParticles(dt) {

            for (
                let i = particles.length - 1;
                i >= 0;
                i--
            ) {

                const p =
                    particles[i];

                p.life -= dt;

                if (p.velocity) {
                    p.mesh.position.add(
                        p.velocity
                            .clone()
                            .multiplyScalar(dt)
                    );

                    p.velocity.y -=
                        9 * dt;
                }

                if (p.grow) {
                    p.mesh.scale.multiplyScalar(
                        1 + dt * 3
                    );
                }

                if (p.mesh.material.opacity !== undefined) {
                    p.mesh.material.opacity =
                        Math.max(
                            0,
                            p.life
                        );
                }

                if (p.life <= 0) {

                    scene.remove(
                        p.mesh
                    );

                    if (
                        p.mesh.geometry &&
                        p.mesh.geometry.dispose
                    ) {
                        p.mesh.geometry.dispose();
                    }

                    particles.splice(
                        i,
                        1
                    );
                }
            }
        }

        // ----------------------------------------------------
        // CAMERA
        // ----------------------------------------------------

        function updateCamera(dt) {

            if (!player) {
                return;
            }

            // De camera gebruikt ALTIJD de rotatie
            // van de tank.
            //
            // Hij draait dus niet onafhankelijk met de muis.

            const behind =
                new THREE.Vector3(
                    0,
                    CAMERA_HEIGHT,
                    CAMERA_DISTANCE
                );

            behind.applyQuaternion(
                player.quaternion
            );

            const desired =
                player.position
                    .clone()
                    .add(behind);

            camera.position.lerp(
                desired,
                Math.min(
                    1,
                    dt * 6
                )
            );

            const lookAt =
                player.position
                    .clone();

            lookAt.y +=
                CAMERA_LOOK_HEIGHT;

            camera.lookAt(
                lookAt
            );
        }

        // ----------------------------------------------------
        // MOUSE AIM
        // ----------------------------------------------------

        function updateTurretAim() {

            if (
                !player ||
                !turret
            ) {
                return;
            }

            // scherm naar wereld-ray
            const ndcX =
                (mouseX /
                    window.innerWidth) *
                    2 -
                1;

            const ndcY =
                -(mouseY /
                    window.innerHeight) *
                    2 +
                1;

            const raycaster =
                new THREE.Raycaster();

            raycaster.setFromCamera(
                new THREE.Vector2(
                    ndcX,
                    ndcY
                ),
                camera
            );

            const ray =
                raycaster.ray;

            // horizontaal vlak
            const plane =
                new THREE.Plane(
                    new THREE.Vector3(
                        0,
                        1,
                        0
                    ),
                    0
                );

            const target =
                new THREE.Vector3();

            if (
                !ray.intersectPlane(
                    plane,
                    target
                )
            ) {
                return;
            }

            const dx =
                target.x -
                player.position.x;

            const dz =
                target.z -
                player.position.z;

            if (
                Math.abs(dx) +
                Math.abs(dz) <
                0.1
            ) {
                return;
            }

            // wereldhoek
            const worldYaw =
                Math.atan2(
                    -dx,
                    -dz
                );

            // tankhoek eraf halen
            const localYaw =
                normalizeAngle(
                    worldYaw -
                    player.rotation.y
                );

            // Alleen turret draait.
            turret.rotation.y =
                THREE.MathUtils.lerp(
                    turret.rotation.y,
                    localYaw,
                    0.35
                );
        }

        function normalizeAngle(angle) {

            while (
                angle > Math.PI
            ) {
                angle -=
                    Math.PI * 2;
            }

            while (
                angle < -Math.PI
            ) {
                angle +=
                    Math.PI * 2;
            }

            return angle;
        }

        // ----------------------------------------------------
        // PLAYER MOVEMENT
        // ----------------------------------------------------

        function updatePlayer(dt) {

            if (!player) {
                return;
            }

            let forward = 0;
            let turn = 0;

            if (
                keys["w"] ||
                keys["ArrowUp"]
            ) {
                forward += 1;
            }

            if (
                keys["s"] ||
                keys["ArrowDown"]
            ) {
                forward -= 1;
            }

            if (
                keys["a"] ||
                keys["ArrowLeft"]
            ) {
                turn += 1;
            }

            if (
                keys["d"] ||
                keys["ArrowRight"]
            ) {
                turn -= 1;
            }

            // tank draaien
            if (turn !== 0) {

                player.rotation.y +=
                    turn *
                    TANK_TURN_SPEED *
                    dt;
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

                direction.multiplyScalar(
                    speed *
                    forward *
                    dt
                );

                moveTank(
                    direction.x,
                    direction.z
                );

                // explorer achievement
                const distance =
                    Math.sqrt(
                        player.position.x *
                        player.position.x +
                        player.position.z *
                        player.position.z
                    );

                if (
                    distance > 110
                ) {
                    achievements.explorer = true;
                }
            }

            // energy langzaam herstellen
            playerEnergy =
                Math.min(
                    PLAYER_MAX_ENERGY,
                    playerEnergy +
                    5 * dt
                );
        }

        // ----------------------------------------------------
        // RELOAD
        // ----------------------------------------------------

        function startReload() {

            if (ammo >= maxAmmo) {
                return;
            }

            if (reloadTimer > 0) {
                return;
            }

            reloadTimer = 1.2;

            notify("Reloading...");
        }

        function updateReload(dt) {

            if (reloadTimer <= 0) {
                return;
            }

            reloadTimer -= dt;

            if (reloadTimer <= 0) {
                reloadTimer = 0;
                ammo = maxAmmo;
                notify("Reload complete.");
            }
        }

        // ----------------------------------------------------
        // GAME START
        // ----------------------------------------------------

        function startNewGame(saveData = null) {

            clearWorld();

            gameState = "playing";

            shopOpen = false;

            playerHealth =
                saveData
                    ? saveData.health ?? PLAYER_MAX_HEALTH
                    : PLAYER_MAX_HEALTH;

            playerEnergy =
                saveData
                    ? saveData.energy ?? PLAYER_MAX_ENERGY
                    : PLAYER_MAX_ENERGY;

            ammo =
                saveData
                    ? saveData.ammo ?? maxAmmo
                    : maxAmmo;

            kills =
                saveData
                    ? saveData.kills ?? 0
                    : 0;

            credits =
                saveData
                    ? saveData.credits ?? 250
                    : 250;

            wave =
                saveData
                    ? saveData.wave ?? 1
                    : 1;

            survivalTime =
                saveData
                    ? saveData.survivalTime ?? 0
                    : 0;

            achievements =
                saveData &&
                saveData.achievements
                    ? {
                        ...achievements,
                        ...saveData.achievements
                    }
                    : {
                        firstKill:false,
                        tenKills:false,
                        survivor:false,
                        rich:false,
                        explorer:false
                    };

            // player
            player = createTank();

            scene.add(player);

            if (saveData && saveData.player) {

                player.position.set(
                    saveData.player.x ?? 0,
                    0,
                    saveData.player.z ?? 0
                );

                player.rotation.y =
                    saveData.player.rotation ?? 0;

            } else {

                player.position.set(
                    0,
                    0,
                    0
                );

                player.rotation.y = 0;
            }

            turret.rotation.y = 0;

            // enemies
            enemies = [];

            for (
                let i = 0;
                i < ENEMY_COUNT;
                i++
            ) {
                spawnEnemy();
            }

            bullets = [];

            particles = [];

            fireTimer = 0;
            reloadTimer = 0;
            enemySpawnTimer = 0;

            lastTime =
                performance.now();

            showGame();

            updateHUD();

            notify(
                saveData
                    ? "Save geladen."
                    : "Mission gestart."
            );
        }

        // ----------------------------------------------------
        // CLEAR WORLD
        // ----------------------------------------------------

        function clearWorld() {

            if (player) {
                scene.remove(player);
                player = null;
            }

            for (const enemy of enemies) {
                scene.remove(enemy);
            }

            enemies = [];

            for (const bullet of bullets) {
                scene.remove(
                    bullet.mesh
                );
            }

            bullets = [];

            for (const particle of particles) {
                scene.remove(
                    particle.mesh
                );
            }

            particles = [];

            if (turret) {
                turret = null;
            }

            if (cannon) {
                cannon = null;
            }
        }

        // ----------------------------------------------------
        // GAME OVER
        // ----------------------------------------------------

        function gameOver() {

            gameState = "gameover";

            mouseDown = false;

            hideAllModals();

            hide(hud);

            const text =
                gameOverPanel.querySelector(
                    "#eb-gameover-text"
                );

            text.innerHTML = `
                Je tank is vernietigd.<br><br>

                <strong>Kills:</strong>
                ${kills}<br>

                <strong>Credits:</strong>
                ${credits}<br>

                <strong>Wave:</strong>
                ${wave}<br>
            `;

            show(gameOverPanel);
        }

        // ----------------------------------------------------
        // HUD
        // ----------------------------------------------------

        function updateHUD() {

            const healthFill =
                document.getElementById(
                    "eb-health-fill"
                );

            const energyFill =
                document.getElementById(
                    "eb-energy-fill"
                );

            const ammoText =
                document.getElementById(
                    "eb-ammo"
                );

            const killsText =
                document.getElementById(
                    "eb-kills"
                );

            const creditsText =
                document.getElementById(
                    "eb-credits"
                );

            const waveText =
                document.getElementById(
                    "eb-wave"
                );

            if (healthFill) {
                healthFill.style.width =
                    (
                        playerHealth /
                        PLAYER_MAX_HEALTH *
                        100
                    ) + "%";
            }

            if (energyFill) {
                energyFill.style.width =
                    (
                        playerEnergy /
                        PLAYER_MAX_ENERGY *
                        100
                    ) + "%";
            }

            if (ammoText) {
                ammoText.textContent =
                    `${ammo} / ${maxAmmo}`;
            }

            if (killsText) {
                killsText.textContent =
                    kills;
            }

            if (creditsText) {
                creditsText.textContent =
                    credits;
            }

            if (waveText) {
                waveText.textContent =
                    wave;
            }

            const objectiveText =
                document.getElementById(
                    "eb-objective-text"
                );

            if (objectiveText) {

                if (reloadTimer > 0) {
                    objectiveText.textContent =
                        "Reloading...";
                } else if (enemies.length > 0) {
                    objectiveText.textContent =
                        `Neutralize the hostile units. ${enemies.length} detected.`;
                } else {
                    objectiveText.textContent =
                        "The area is clear. Find the lost signal.";
                }
            }
        }

        // ----------------------------------------------------
        // MAP
        // ----------------------------------------------------

        function drawMap() {

            const w =
                mapCanvas.width;

            const h =
                mapCanvas.height;

            mapCtx.clearRect(
                0,
                0,
                w,
                h
            );

            mapCtx.fillStyle =
                "#081015";

            mapCtx.fillRect(
                0,
                0,
                w,
                h
            );

            const scale =
                Math.min(
                    w,
                    h
                ) /
                WORLD_SIZE;

            const ox =
                w / 2;

            const oz =
                h / 2;

            function worldToMap(
                x,
                z
            ) {
                return {
                    x:
                        ox +
                        x * scale,

                    y:
                        oz +
                        z * scale
                };
            }

            // buildings
            mapCtx.fillStyle =
                "#344c59";

            for (const b of buildings) {

                const p =
                    worldToMap(
                        b.x,
                        b.z
                    );

                mapCtx.fillRect(
                    p.x -
                        b.width *
                        scale /
                        2,
                    p.y -
                        b.depth *
                        scale /
                        2,
                    b.width *
                        scale,
                    b.depth *
                        scale
                );
            }

            // enemies
            mapCtx.fillStyle =
                "#e75d70";

            for (const enemy of enemies) {

                const p =
                    worldToMap(
                        enemy.position.x,
                        enemy.position.z
                    );

                mapCtx.beginPath();

                mapCtx.arc(
                    p.x,
                    p.y,
                    4,
                    0,
                    Math.PI * 2
                );

                mapCtx.fill();
            }

            // player
            if (player) {

                const p =
                    worldToMap(
                        player.position.x,
                        player.position.z
                    );

                mapCtx.fillStyle =
                    "#66ddff";

                mapCtx.beginPath();

                mapCtx.arc(
                    p.x,
                    p.y,
                    6,
                    0,
                    Math.PI * 2
                );

                mapCtx.fill();

                // tank direction
                const direction =
                    new THREE.Vector3(
                        0,
                        0,
                        -1
                    );

                direction.applyQuaternion(
                    player.quaternion
                );

                mapCtx.strokeStyle =
                    "#b9f6ff";

                mapCtx.lineWidth = 2;

                mapCtx.beginPath();

                mapCtx.moveTo(
                    p.x,
                    p.y
                );

                mapCtx.lineTo(
                    p.x +
                        direction.x *
                        16,
                    p.y +
                        direction.z *
                        16
                );

                mapCtx.stroke();
            }
        }

        function openMap() {

            if (
                gameState !== "playing"
            ) {
                return;
            }

            drawMap();

            hideAllModals();

            hide(hud);

            show(mapPanel);
        }

        // ----------------------------------------------------
        // KEYBOARD
        // ----------------------------------------------------

        window.addEventListener(
            "keydown",
            function (event) {

                keys[event.key] = true;

                const key =
                    event.key.toLowerCase();

                keys[key] = true;

                if (
                    key === "r" &&
                    gameState === "playing"
                ) {
                    startReload();
                }

                if (
                    event.key === "Escape"
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
                    event.key === " " &&
                    gameState === "playing"
                ) {
                    event.preventDefault();
                }
            }
        );

        window.addEventListener(
            "keyup",
            function (event) {

                keys[event.key] = false;

                keys[
                    event.key.toLowerCase()
                ] = false;
            }
        );

        // ----------------------------------------------------
        // MOUSE
        // ----------------------------------------------------

        window.addEventListener(
            "mousemove",
            function (event) {

                mouseX = event.clientX;
                mouseY = event.clientY;
            }
        );

        window.addEventListener(
            "mousedown",
            function (event) {

                if (
                    event.button !== 0
                ) {
                    return;
                }

                if (
                    gameState !== "playing"
                ) {
                    return;
                }

                mouseDown = true;

                createBullet();
            }
        );

        window.addEventListener(
            "mouseup",
            function (event) {

                if (
                    event.button === 0
                ) {
                    mouseDown = false;
                }
            }
        );

        // ----------------------------------------------------
        // WINDOW
        // ----------------------------------------------------

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
                        window.devicePixelRatio || 1,
                        2
                    )
                );
            }
        );

        // ----------------------------------------------------
        // SAVE BEFORE CLOSE
        // ----------------------------------------------------

        window.addEventListener(
            "beforeunload",
            function () {

                if (
                    gameState === "playing"
                ) {
                    saveGame();
                }
            }
        );

        // ----------------------------------------------------
        // SHOP / ACHIEVEMENTS HELPERS
        // ----------------------------------------------------

        function checkAchievements(dt) {

            if (
                survivalTime >= 180 &&
                !achievements.survivor
            ) {
                achievements.survivor = true;
                notify(
                    "Achievement: SURVIVOR"
                );
            }

            if (credits >= 1000) {
                achievements.rich = true;
            }
        }

        // ----------------------------------------------------
        // GAME LOOP
        // ----------------------------------------------------

        function animate(now) {

            requestAnimationFrame(
                animate
            );

            const rawDt =
                (now - lastTime) /
                1000;

            const dt =
                Math.min(
                    rawDt,
                    0.05
                );

            lastTime = now;

            if (
                gameState === "playing"
            ) {

                survivalTime += dt;

                if (fireTimer > 0) {
                    fireTimer -= dt;
                }

                if (
                    mouseDown &&
                    fireTimer <= 0
                ) {
                    createBullet();
                }

                updatePlayer(dt);

                updateTurretAim();

                updateBullets(dt);

                updateEnemies(dt);

                updateParticles(dt);

                updateReload(dt);

                updateCamera(dt);

                enemySpawnTimer += dt;

                const targetEnemies =
                    Math.min(
                        18,
                        5 +
                        Math.floor(
                            survivalTime / 35
                        )
                    );

                if (
                    enemySpawnTimer > 4 &&
                    enemies.length <
                        targetEnemies
                ) {
                    enemySpawnTimer = 0;
                    spawnEnemy();
                }

                wave =
                    1 +
                    Math.floor(
                        survivalTime / 45
                    );

                checkAchievements(dt);

                updateHUD();
            }

            renderer.render(
                scene,
                camera
            );
        }

        // ----------------------------------------------------
        // INITIAL CAMERA
        // ----------------------------------------------------

        camera.position.set(
            0,
            CAMERA_HEIGHT,
            CAMERA_DISTANCE
        );

        camera.lookAt(
            0,
            0,
            0
        );

        // ----------------------------------------------------
        // START
        // ----------------------------------------------------

        updateAchievementsUI();

        showMenu();

        animate(
            performance.now()
        );

        console.log(
            "EchoBound gestart zonder JavaScript-fout."
        );
    }

})();
