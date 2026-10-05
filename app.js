// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// COMPLETE APP.JS
// ============================================================

(async function () {

    "use strict";

    // ============================================================
    // THREE.JS
    // ============================================================

    const THREE = await import(
        "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
    );

    // ============================================================
    // HTML ELEMENTS
    // ============================================================

    const canvas =
        document.getElementById("game");

    const ui =
        document.getElementById("ui");

    const mainMenu =
        document.getElementById("menu");

    const hud =
        document.getElementById("hud");

    // ============================================================
    // GAME SETTINGS
    // ============================================================

    const WORLD_SIZE = 360;

    const HALF_WORLD =
        WORLD_SIZE / 2;

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

    const SAVE_KEY =
        "echobound_save_v6";

    // ============================================================
    // GAME STATE
    // ============================================================

    let gameState =
        "menu";

    let playerHealth =
        PLAYER_MAX_HEALTH;

    let playerEnergy =
        PLAYER_MAX_ENERGY;

    let credits =
        100;

    let kills =
        0;

    let ammo =
        12;

    let maxAmmo =
        12;

    let ammoUpgrade =
        0;

    let reloadTimer =
        0;

    let fireTimer =
        0;

    let totalPlayTime =
        0;

    let keys = {};

    let mouse = {
        x: 0,
        y: 0,
        down: false
    };

    // ============================================================
    // THREE OBJECTS
    // ============================================================

    let player;

    let turret;

    let muzzle;

    let camera;

    let renderer;

    let scene;

    let clock;

    // ============================================================
    // ARRAYS
    // ============================================================

    const bullets = [];

    const enemies = [];

    const buildings = [];

    const resources = [];

    const particles = [];

    // ============================================================
    // ACHIEVEMENTS
    // ============================================================

    const achievements = {

        firstShot: false,

        firstKill: false,

        fiveKills: false,

        explorer: false,

        survivor: false

    };

    // ============================================================
    // BASIC UI HELPERS
    // ============================================================

    function closeAllPanels() {

        if (!ui) {
            return;
        }

        ui.querySelectorAll(
            ".panel-layer"
        ).forEach(
            panel => panel.remove()
        );
    }

    function createPanel(
        html,
        className = ""
    ) {

        closeAllPanels();

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
            `panel ${className}`;

        panel.innerHTML =
            html;

        layer.appendChild(
            panel
        );

        ui.appendChild(
            layer
        );

        return {

            layer,

            panel,

            close() {

                layer.remove();

            }

        };
    }

    function notify(
        message
    ) {

        const old =
            document.querySelector(
                ".echo-notification"
            );

        if (old) {
            old.remove();
        }

        const notification =
            document.createElement(
                "div"
            );

        notification.className =
            "echo-notification";

        notification.textContent =
            message;

        document.body.appendChild(
            notification
        );

        setTimeout(
            () => {

                notification.classList.add(
                    "show"
                );

            },
            10
        );

        setTimeout(
            () => {

                notification.classList.remove(
                    "show"
                );

                setTimeout(
                    () => {

                        notification.remove();

                    },
                    300
                );

            },
            1800
        );
    }

    // ============================================================
    // SHOP
    // ============================================================

    function openShop() {

        /*
         * BELANGRIJKE FIX:
         *
         * Vanuit de game wordt de game gepauzeerd,
         * maar er wordt GEEN extra pause-panel gemaakt.
         *
         * Daardoor kan het pause-menu niet achter
         * de shop blijven staan.
         */

        if (
            gameState ===
            "playing"
        ) {

            gameState =
                "paused";
        }

        const shop =
            createPanel(
                `

                <div class="shop-sparkles">
                    ✦ ✧ ✦ ✧ ✦ ✧ ✦
                </div>

                <div class="shop-title">
                    🛒 ECHOBOUND SHOP
                </div>

                <div class="shop-unlocked">
                    FIELD SUPPLY TERMINAL
                </div>

                <div class="shop-event-text">
                    ⚡ KEEP YOUR TANK ALIVE ⚡
                </div>

                <div class="credits-card">
                    <span>AVAILABLE CREDITS</span>
                    <strong id="shopCredits">
                        ${credits}
                    </strong>
                </div>

                <div class="shop-grid">

                    <div class="shop-card">

                        <div class="shop-icon">
                            🔋
                        </div>

                        <h2>
                            AMMO PACK
                        </h2>

                        <p>
                            Completely refill your
                            current ammunition.
                        </p>

                        <div class="shop-price">
                            10 CREDITS
                        </div>

                        <button
                            class="echo-button buy-button"
                            id="buyAmmo"
                        >
                            BUY AMMO
                        </button>

                    </div>

                    <div class="shop-card">

                        <div class="shop-icon">
                            🛠️
                        </div>

                        <h2>
                            TANK REPAIR
                        </h2>

                        <p>
                            Restore your tank
                            to maximum hull strength.
                        </p>

                        <div class="shop-price">
                            20 CREDITS
                        </div>

                        <button
                            class="echo-button buy-button"
                            id="buyRepair"
                        >
                            REPAIR TANK
                        </button>

                    </div>

                    <div class="shop-card">

                        <div class="shop-icon">
                            ⚡
                        </div>

                        <h2>
                            AMMO UPGRADE
                        </h2>

                        <p>
                            Increase maximum ammo
                            capacity by 4 rounds.
                        </p>

                        <div class="shop-price">
                            50 CREDITS
                        </div>

                        <button
                            class="echo-button buy-button"
                            id="buyUpgrade"
                        >
                            UPGRADE
                        </button>

                    </div>

                </div>

                <div
                    class="shop-message"
                    id="shopMessage"
                >
                    WELCOME TO THE SUPPLY TERMINAL
                </div>

                <button
                    class="echo-button shop-back"
                    id="shopBack"
                >
                    ← BACK
                </button>

                `
            );

        // ========================================================
        // SHOP CONFETTI
        // ========================================================

        for (
            let i = 0;
            i < 42;
            i++
        ) {

            const piece =
                document.createElement(
                    "span"
                );

            piece.className =
                "shop-confetti";

            piece.style.left =
                `${Math.random() * 100}%`;

            piece.style.animationDelay =
                `${Math.random() * 3}s`;

            piece.style.animationDuration =
                `${2 + Math.random() * 3}s`;

            shop.panel.appendChild(
                piece
            );
        }

        // ========================================================
        // SHOP MESSAGE
        // ========================================================

        function shopMessage(
            message
        ) {

            const element =
                shop.panel.querySelector(
                    "#shopMessage"
                );

            if (!element) {
                return;
            }

            element.textContent =
                message;

            element.classList.remove(
                "shop-message-pop"
            );

            void element.offsetWidth;

            element.classList.add(
                "shop-message-pop"
            );
        }

        // ========================================================
        // SHOP CREDITS
        // ========================================================

        function updateShopCredits() {

            const element =
                shop.panel.querySelector(
                    "#shopCredits"
                );

            if (element) {

                element.textContent =
                    credits;

            }

            updateHUD();
        }

        // ========================================================
        // BUY AMMO
        // ========================================================

        shop.panel
            .querySelector(
                "#buyAmmo"
            )
            .addEventListener(
                "click",
                () => {

                    if (
                        credits < 10
                    ) {

                        shopMessage(
                            "⚠ NOT ENOUGH CREDITS"
                        );

                        return;
                    }

                    credits -=
                        10;

                    ammo =
                        maxAmmo;

                    updateShopCredits();

                    shopMessage(
                        "🔋 AMMO REFILLED!"
                    );

                    notify(
                        "AMMO REFILLED"
                    );

                }
            );

        // ========================================================
        // TANK REPAIR
        // ========================================================

        shop.panel
            .querySelector(
                "#buyRepair"
            )
            .addEventListener(
                "click",
                () => {

                    if (
                        playerHealth >=
                        PLAYER_MAX_HEALTH
                    ) {

                        shopMessage(
                            "✓ TANK ALREADY AT FULL HEALTH"
                        );

                        return;
                    }

                    if (
                        credits < 20
                    ) {

                        shopMessage(
                            "⚠ NOT ENOUGH CREDITS"
                        );

                        return;
                    }

                    credits -=
                        20;

                    playerHealth =
                        PLAYER_MAX_HEALTH;

                    updateShopCredits();

                    shopMessage(
                        "🛠️ 🎉 TANK FULLY REPAIRED!"
                    );

                    notify(
                        "TANK REPAIRED"
                    );

                }
            );

        // ========================================================
        // AMMO UPGRADE
        // ========================================================

        shop.panel
            .querySelector(
                "#buyUpgrade"
            )
            .addEventListener(
                "click",
                () => {

                    if (
                        credits < 50
                    ) {

                        shopMessage(
                            "⚠ NOT ENOUGH CREDITS"
                        );

                        return;
                    }

                    credits -=
                        50;

                    ammoUpgrade +=
                        4;

                    maxAmmo +=
                        4;

                    ammo =
                        maxAmmo;

                    updateShopCredits();

                    shopMessage(
                        "🎉 ⚡ AMMO CAPACITY UPGRADED!"
                    );

                    notify(
                        "AMMO UPGRADED"
                    );

                }
            );

        // ========================================================
        // SHOP BACK
        // ========================================================

        shop.panel
            .querySelector(
                "#shopBack"
            )
            .addEventListener(
                "click",
                () => {

                    shop.close();

                    /*
                     * Vanuit de game:
                     * terug naar PAUSED.
                     */

                    if (
                        gameState ===
                        "paused"
                    ) {

                        if (
                            hud.style.display !==
                            "none"
                        ) {

                            showPausePanel();

                        }

                        return;
                    }

                    /*
                     * Vanuit het hoofdmenu:
                     * hoofdmenu zichtbaar.
                     */

                    if (
                        gameState ===
                        "menu"
                    ) {

                        mainMenu.style.display =
                            "flex";

                        hud.style.display =
                            "none";

                    }

                }
            );
    }

    // ============================================================
    // ACHIEVEMENTS
    // ============================================================

    function openAchievements() {

        const unlocked =
            Object.values(
                achievements
            ).filter(Boolean).length;

        const panel =
            createPanel(
                `

                <h1>
                    🏆 ACHIEVEMENTS
                </h1>

                <div class="panel-subtitle">
                    ${unlocked} /
                    ${Object.keys(
                        achievements
                    ).length}
                    achievements unlocked
                </div>

                <p>
                    ${achievements.firstShot ? "🟢" : "⚪"}
                    FIRST SHOT
                </p>

                <p>
                    ${achievements.firstKill ? "🟢" : "⚪"}
                    FIRST KILL
                </p>

                <p>
                    ${achievements.fiveKills ? "🟢" : "⚪"}
                    FIVE KILLS
                </p>

                <p>
                    ${achievements.explorer ? "🟢" : "⚪"}
                    EXPLORER
                </p>

                <p>
                    ${achievements.survivor ? "🟢" : "⚪"}
                    SURVIVOR
                </p>

                <br>

                <button
                    class="echo-button"
                    id="achievementBack"
                >
                    ← BACK
                </button>

                `
            );

        panel.panel
            .querySelector(
                "#achievementBack"
            )
            .addEventListener(
                "click",
                panel.close
            );
    }

    // ============================================================
    // CONTROLS
    // ============================================================

    function openControls() {

        const panel =
            createPanel(
                `

                <h1>
                    CONTROLS
                </h1>

                <div class="panel-subtitle">
                    ECHOBOUND FIELD MANUAL
                </div>

                <p>
                    <b>W / ↑</b>
                    — Drive forward
                </p>

                <p>
                    <b>S / ↓</b>
                    — Drive backward
                </p>

                <p>
                    <b>A / ←</b>
                    — Turn left
                </p>

                <p>
                    <b>D / →</b>
                    — Turn right
                </p>

                <p>
                    <b>MOUSE</b>
                    — Aim cannon
                </p>

                <p>
                    <b>LEFT CLICK</b>
                    — Fire
                </p>

                <p>
                    <b>R</b>
                    — Reload
                </p>

                <p>
                    <b>ESC</b>
                    — Pause
                </p>

                <br>

                <button
                    class="echo-button"
                    id="controlsBack"
                >
                    ← BACK
                </button>

                `
            );

        panel.panel
            .querySelector(
                "#controlsBack"
            )
            .addEventListener(
                "click",
                panel.close
            );
    }

    // ============================================================
    // THREE.JS SCENE
    // ============================================================

    scene =
        new THREE.Scene();

    scene.background =
        new THREE.Color(
            0x071019
        );

    scene.fog =
        new THREE.Fog(
            0x071019,
            90,
            330
        );

    // ============================================================
    // CAMERA
    // ============================================================

    camera =
        new THREE.PerspectiveCamera(
            60,
            window.innerWidth /
            window.innerHeight,
            0.1,
            600
        );

    // ============================================================
    // RENDERER
    // ============================================================

    renderer =
        new THREE.WebGLRenderer({
            canvas,
            antialias: true
        });

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.shadowMap.enabled =
        true;

    // ============================================================
    // LIGHTS
    // ============================================================

    const hemiLight =
        new THREE.HemisphereLight(
            0x9bdcff,
            0x182015,
            2.1
        );

    scene.add(
        hemiLight
    );

    const sun =
        new THREE.DirectionalLight(
            0xffffff,
            2.4
        );

    sun.position.set(
        80,
        120,
        50
    );

    sun.castShadow =
        true;

    scene.add(
        sun
    );

    // ============================================================
    // GROUND
    // ============================================================

    const ground =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                WORLD_SIZE,
                WORLD_SIZE
            ),
            new THREE.MeshStandardMaterial({
                color: 0x182b25,
                roughness: 1
            })
        );

    ground.rotation.x =
        -Math.PI / 2;

    ground.receiveShadow =
        true;

    scene.add(
        ground
    );

    // ============================================================
    // GRID
    // ============================================================

    const grid =
        new THREE.GridHelper(
            WORLD_SIZE,
            36,
            0x31534d,
            0x1b332f
        );

    grid.position.y =
        0.02;

    grid.material.opacity =
        0.18;

    grid.material.transparent =
        true;

    scene.add(
        grid
    );

    // ============================================================
    // TANK
    // ============================================================

    function createTank() {

        const tank =
            new THREE.Group();

        // --------------------------------------------------------
        // LOWER BODY
        // --------------------------------------------------------

        const lower =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    4.6,
                    1.1,
                    6
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x283b44,
                    metalness: 0.7,
                    roughness: 0.3
                })
            );

        lower.position.y =
            1;

        lower.castShadow =
            true;

        tank.add(
            lower
        );

        // --------------------------------------------------------
        // MAIN BODY
        // --------------------------------------------------------

        const body =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    3.8,
                    1.25,
                    4.5
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x38525b,
                    metalness: 0.75,
                    roughness: 0.27
                })
            );

        body.position.y =
            1.9;

        body.castShadow =
            true;

        tank.add(
            body
        );

        // --------------------------------------------------------
        // TRACKS
        // --------------------------------------------------------

        const trackMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x11191d,
                roughness: 0.75
            });

        const leftTrack =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.05,
                    1.35,
                    6.4
                ),
                trackMaterial
            );

        leftTrack.position.set(
            -2.35,
            1,
            0
        );

        leftTrack.castShadow =
            true;

        tank.add(
            leftTrack
        );

        const rightTrack =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.05,
                    1.35,
                    6.4
                ),
                trackMaterial
            );

        rightTrack.position.set(
            2.35,
            1,
            0
        );

        rightTrack.castShadow =
            true;

        tank.add(
            rightTrack
        );

        // --------------------------------------------------------
        // TURRET BASE
        // --------------------------------------------------------

        const turretBase =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    1.55,
                    1.7,
                    0.55,
                    16
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x263f48,
                    metalness: 0.8,
                    roughness: 0.25
                })
            );

        turretBase.position.y =
            2.75;

        turretBase.castShadow =
            true;

        tank.add(
            turretBase
        );

        // --------------------------------------------------------
        // TURRET
        // --------------------------------------------------------

        turret =
            new THREE.Group();

        turret.position.y =
            2.85;

        tank.add(
            turret
        );

        // --------------------------------------------------------
        // TURRET BODY
        // --------------------------------------------------------

        const turretBody =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    2.6,
                    0.75,
                    2.5
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x45616a,
                    metalness: 0.8,
                    roughness: 0.25
                })
            );

        turretBody.castShadow =
            true;

        turret.add(
            turretBody
        );

        // --------------------------------------------------------
        // CANNON
        // --------------------------------------------------------

        const cannon =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.48,
                    0.48,
                    5.5
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x182329,
                    metalness: 0.9,
                    roughness: 0.2
                })
            );

        cannon.position.set(
            0,
            0.05,
            -3.35
        );

        cannon.castShadow =
            true;

        turret.add(
            cannon
        );

        // --------------------------------------------------------
        // MUZZLE
        // --------------------------------------------------------

        muzzle =
            new THREE.Object3D();

        muzzle.position.set(
            0,
            0.05,
            -6.1
        );

        turret.add(
            muzzle
        );

        // --------------------------------------------------------
        // CANNON GLOW
        // --------------------------------------------------------

        const glow =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.16,
                    12,
                    12
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x64eaff
                })
            );

        glow.position.set(
            0,
            0.05,
            -6.05
        );

        turret.add(
            glow
        );

        tank.position.set(
            0,
            0,
            0
        );

        scene.add(
            tank
        );

        return tank;
    }

    player =
        createTank();

    // ============================================================
    // BUILDINGS
    // ============================================================

    function createBuilding(
        x,
        z,
        w,
        d
    ) {

        const building =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    w,
                    4,
                    d
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x24353b,
                    metalness: 0.35,
                    roughness: 0.7
                })
            );

        building.position.set(
            x,
            2,
            z
        );

        building.castShadow =
            true;

        building.receiveShadow =
            true;

        scene.add(
            building
        );

        buildings.push({

            mesh: building,

            x,

            z,

            w,

            d

        });
    }

    createBuilding(
        -65,
        -50,
        30,
        24
    );

    createBuilding(
        50,
        -60,
        35,
        26
    );

    createBuilding(
        -75,
        55,
        25,
        32
    );

    createBuilding(
        70,
        55,
        34,
        22
    );

    createBuilding(
        0,
        95,
        42,
        20
    );

    createBuilding(
        95,
        -5,
        25,
        34
    );

    createBuilding(
        -105,
        -5,
        25,
        34
    );

    // ============================================================
    // TREES
    // ============================================================

    function createTree(
        x,
        z
    ) {

        const tree =
            new THREE.Group();

        const trunk =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.55,
                    0.7,
                    3,
                    8
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x513c27
                })
            );

        trunk.position.y =
            1.5;

        trunk.castShadow =
            true;

        tree.add(
            trunk
        );

        const crown =
            new THREE.Mesh(
                new THREE.ConeGeometry(
                    3.2,
                    6,
                    8
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x173c2d
                })
            );

        crown.position.y =
            5;

        crown.castShadow =
            true;

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
    }

    for (
        let i = 0;
        i < 55;
        i++
    ) {

        const x =
            THREE.MathUtils.randFloat(
                -HALF_WORLD + 10,
                HALF_WORLD - 10
            );

        const z =
            THREE.MathUtils.randFloat(
                -HALF_WORLD + 10,
                HALF_WORLD - 10
            );

        if (
            Math.abs(x) < 20 &&
            Math.abs(z) < 20
        ) {

            continue;
        }

        createTree(
            x,
            z
        );
    }

    // ============================================================
    // RESOURCES
    // ============================================================

    function createResource(
        x,
        z
    ) {

        const crystal =
            new THREE.Mesh(
                new THREE.OctahedronGeometry(
                    0.8,
                    0
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x65dfff,
                    emissive: 0x164b63,
                    emissiveIntensity: 1
                })
            );

        crystal.position.set(
            x,
            0.8,
            z
        );

        crystal.castShadow =
            true;

        scene.add(
            crystal
        );

        resources.push({

            mesh: crystal,

            collected: false

        });
    }

    for (
        let i = 0;
        i < 35;
        i++
    ) {

        createResource(
            THREE.MathUtils.randFloat(
                -150,
                150
            ),
            THREE.MathUtils.randFloat(
                -150,
                150
            )
        );
    }

    // ============================================================
    // BUILDING COLLISION
    // ============================================================

    function collidesWithBuilding(
        position
    ) {

        const radius =
            2.7;

        for (
            const building of buildings
        ) {

            const minX =
                building.x -
                building.w / 2 -
                radius;

            const maxX =
                building.x +
                building.w / 2 +
                radius;

            const minZ =
                building.z -
                building.d / 2 -
                radius;

            const maxZ =
                building.z +
                building.d / 2 +
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
    // ENEMIES
    // ============================================================

    function createEnemy() {

        const enemy =
            new THREE.Group();

        // --------------------------------------------------------
        // BODY
        // --------------------------------------------------------

        const body =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    1.6,
                    12,
                    10
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x8b4cff,
                    emissive: 0x24104a,
                    emissiveIntensity: 0.7
                })
            );

        body.position.y =
            1.6;

        body.castShadow =
            true;

        enemy.add(
            body
        );

        // --------------------------------------------------------
        // EYE
        // --------------------------------------------------------

        const eye =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.32,
                    10,
                    10
                ),
                new THREE.MeshBasicMaterial({
                    color: 0xff405d
                })
            );

        eye.position.set(
            0,
            1.8,
            -1.35
        );

        enemy.add(
            eye
        );

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

            health: 50,

            speed:
                THREE.MathUtils.randFloat(
                    4,
                    7
                ),

            attackTimer: 0

        });
    }

    function spawnEnemies() {

        while (
            enemies.length <
            ENEMY_COUNT
        ) {

            createEnemy();

        }
    }

    // ============================================================
    // LINE OF SIGHT
    // ============================================================

    function lineBlocked(
        start,
        end
    ) {

        const direction =
            end.clone().sub(
                start
            );

        const distance =
            direction.length();

        direction.normalize();

        const raycaster =
            new THREE.Raycaster(
                start,
                direction,
                0,
                distance
            );

        const objects =
            buildings.map(
                building =>
                    building.mesh
            );

        return raycaster
            .intersectObjects(
                objects,
                false
            )
            .length > 0;
    }

    // ============================================================
    // MOUSE AIM
    // ============================================================

    const mouseNDC =
        new THREE.Vector2();

    function getMouseWorldPosition() {

        mouseNDC.x =
            (
                mouse.x /
                window.innerWidth
            ) *
            2 -
            1;

        mouseNDC.y =
            -(
                mouse.y /
                window.innerHeight
            ) *
            2 +
            1;

        const raycaster =
            new THREE.Raycaster();

        raycaster.setFromCamera(
            mouseNDC,
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

        const target =
            new THREE.Vector3();

        raycaster.ray.intersectPlane(
            plane,
            target
        );

        if (!target) {

            return player.position.clone();

        }

        return target;
    }

    function updateTurretAim() {

        if (
            !player ||
            !turret
        ) {

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

        const worldYaw =
            Math.atan2(
                -dx,
                -dz
            );

        turret.rotation.y =
            worldYaw -
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

            notify(
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
            getMouseWorldPosition();

        const direction =
            target
                .clone()
                .sub(start)
                .normalize();

        start.add(
            direction
                .clone()
                .multiplyScalar(
                    0.8
                )
        );

        const bulletMesh =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.18,
                    8,
                    8
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x74eaff
                })
            );

        bulletMesh.position.copy(
            start
        );

        scene.add(
            bulletMesh
        );

        bullets.push({

            mesh: bulletMesh,

            velocity:
                direction.multiplyScalar(
                    BULLET_SPEED
                ),

            life: 3

        });

        createHitEffect(
            start,
            0x74eaff,
            5
        );
    }

    // ============================================================
    // RELOAD
    // ============================================================

    function reload() {

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

        reloadTimer =
            1.5;

        notify(
            "RELOADING..."
        );
    }

    // ============================================================
    // PARTICLES
    // ============================================================

    function createHitEffect(
        position,
        color,
        count
    ) {

        for (
            let i = 0;
            i < count;
            i++
        ) {

            const mesh =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.09,
                        6,
                        6
                    ),
                    new THREE.MeshBasicMaterial({
                        color
                    })
                );

            mesh.position.copy(
                position
            );

            scene.add(
                mesh
            );

            particles.push({

                mesh,

                velocity:
                    new THREE.Vector3(
                        THREE.MathUtils.randFloat(
                            -3,
                            3
                        ),
                        THREE.MathUtils.randFloat(
                            1,
                            5
                        ),
                        THREE.MathUtils.randFloat(
                            -3,
                            3
                        )
                    ),

                life: 0.6

            });
        }
    }

    // ============================================================
    // PLAYER MOVEMENT
    // ============================================================

    function updatePlayer(
        delta
    ) {

        let forward =
            0;

        let turn =
            0;

        if (
            keys["w"] ||
            keys["arrowup"]
        ) {

            forward +=
                1;
        }

        if (
            keys["s"] ||
            keys["arrowdown"]
        ) {

            forward -=
                1;
        }

        if (
            keys["a"] ||
            keys["arrowleft"]
        ) {

            turn +=
                1;
        }

        if (
            keys["d"] ||
            keys["arrowright"]
        ) {

            turn -=
                1;
        }

        player.rotation.y +=
            turn *
            TANK_TURN_SPEED *
            delta;

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

            const nextPosition =
                player.position
                    .clone()
                    .add(
                        direction.multiplyScalar(
                            speed *
                            forward *
                            delta
                        )
                    );

            nextPosition.x =
                THREE.MathUtils.clamp(
                    nextPosition.x,
                    -HALF_WORLD + 5,
                    HALF_WORLD - 5
                );

            nextPosition.z =
                THREE.MathUtils.clamp(
                    nextPosition.z,
                    -HALF_WORLD + 5,
                    HALF_WORLD - 5
                );

            if (
                !collidesWithBuilding(
                    nextPosition
                )
            ) {

                player.position.copy(
                    nextPosition
                );

            }
        }
    }

    // ============================================================
    // CAMERA
    // ============================================================

    function updateCamera() {

        /*
         * De camera draait NIET zelfstandig.
         *
         * Hij blijft altijd achter de tank.
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

        const desired =
            player.position
                .clone()
                .add(
                    offset
                );

        camera.position.lerp(
            desired,
            0.12
        );

        const lookTarget =
            player.position
                .clone();

        lookTarget.y +=
            CAMERA_LOOK_HEIGHT;

        camera.lookAt(
            lookTarget
        );
    }

    // ============================================================
    // ENEMY UPDATE
    // ============================================================

    function updateEnemies(
        delta
    ) {

        for (
            let i =
                enemies.length - 1;
            i >= 0;
            i--
        ) {

            const enemy =
                enemies[i];

            const enemyPos =
                enemy.mesh.position;

            const playerPos =
                player.position;

            const distance =
                enemyPos.distanceTo(
                    playerPos
                );

            if (
                distance > 7
            ) {

                const direction =
                    playerPos
                        .clone()
                        .sub(
                            enemyPos
                        )
                        .normalize();

                const next =
                    enemyPos
                        .clone()
                        .add(
                            direction.multiplyScalar(
                                enemy.speed *
                                delta
                            )
                        );

                if (
                    !collidesWithBuilding(
                        next
                    )
                ) {

                    enemy.mesh.position.copy(
                        next
                    );

                }

                enemy.mesh.lookAt(
                    playerPos.x,
                    enemy.mesh.position.y,
                    playerPos.z
                );

            } else {

                enemy.attackTimer -=
                    delta;

                if (
                    enemy.attackTimer <= 0
                ) {

                    const start =
                        enemyPos.clone();

                    start.y +=
                        1.5;

                    const target =
                        playerPos.clone();

                    target.y +=
                        1.5;

                    if (
                        !lineBlocked(
                            start,
                            target
                        )
                    ) {

                        playerHealth -=
                            8;

                        enemy.attackTimer =
                            1.2;

                        createHitEffect(
                            playerPos,
                            0xff405d,
                            6
                        );

                        if (
                            playerHealth <= 0
                        ) {

                            gameOver();

                        }
                    }
                }
            }
        }
    }

    // ============================================================
    // BULLET UPDATE
    // ============================================================

    function updateBullets(
        delta
    ) {

        for (
            let i =
                bullets.length - 1;
            i >= 0;
            i--
        ) {

            const bullet =
                bullets[i];

            const oldPosition =
                bullet.mesh.position.clone();

            const movement =
                bullet.velocity
                    .clone()
                    .multiplyScalar(
                        delta
                    );

            const newPosition =
                oldPosition
                    .clone()
                    .add(
                        movement
                    );

            // ----------------------------------------------------
            // BUILDING HIT
            // ----------------------------------------------------

            if (
                lineBlocked(
                    oldPosition,
                    newPosition
                )
            ) {

                createHitEffect(
                    newPosition,
                    0x8aeaff,
                    7
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

            bullet.mesh.position.copy(
                newPosition
            );

            bullet.life -=
                delta;

            let hitEnemy =
                false;

            // ----------------------------------------------------
            // ENEMY HIT
            // ----------------------------------------------------

            for (
                let e =
                    enemies.length - 1;
                e >= 0;
                e--
            ) {

                const enemy =
                    enemies[e];

                const enemyCenter =
                    enemy.mesh.position
                        .clone();

                enemyCenter.y =
                    1.5;

                const distance =
                    bullet.mesh.position
                        .distanceTo(
                            enemyCenter
                        );

                if (
                    distance < 2.8
                ) {

                    enemy.health -=
                        BULLET_DAMAGE;

                    createHitEffect(
                        bullet.mesh.position,
                        0xff68ff,
                        10
                    );

                    scene.remove(
                        bullet.mesh
                    );

                    bullets.splice(
                        i,
                        1
                    );

                    hitEnemy =
                        true;

                    if (
                        enemy.health <= 0
                    ) {

                        scene.remove(
                            enemy.mesh
                        );

                        enemies.splice(
                            e,
                            1
                        );

                        kills++;

                        credits +=
                            25;

                        achievements.firstKill =
                            true;

                        if (
                            kills >= 5
                        ) {

                            achievements.fiveKills =
                                true;
                        }

                        notify(
                            "+25 CREDITS"
                        );
                    }

                    break;
                }
            }

            if (
                !hitEnemy &&
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

    // ============================================================
    // RESOURCES
    // ============================================================

    function updateResources() {

        for (
            const resource of resources
        ) {

            if (
                resource.collected
            ) {

                continue;
            }

            resource.mesh.rotation.y +=
                0.02;

            const distance =
                resource.mesh.position
                    .distanceTo(
                        player.position
                    );

            if (
                distance < 4
            ) {

                resource.collected =
                    true;

                scene.remove(
                    resource.mesh
                );

                credits +=
                    5;

                notify(
                    "+5 CREDITS — RESOURCE COLLECTED"
                );
            }
        }
    }

    // ============================================================
    // PARTICLES
    // ============================================================

    function updateParticles(
        delta
    ) {

        for (
            let i =
                particles.length - 1;
            i >= 0;
            i--
        ) {

            const particle =
                particles[i];

            particle.mesh.position.add(
                particle.velocity
                    .clone()
                    .multiplyScalar(
                        delta
                    )
            );

            particle.velocity.y -=
                8 *
                delta;

            particle.life -=
                delta;

            if (
                particle.life <= 0
            ) {

                scene.remove(
                    particle.mesh
                );

                particles.splice(
                    i,
                    1
                );
            }
        }
    }

    // ============================================================
    // ACHIEVEMENTS UPDATE
    // ============================================================

    function updateAchievements() {

        const distance =
            Math.sqrt(
                player.position.x ** 2 +
                player.position.z ** 2
            );

        if (
            distance > 120
        ) {

            achievements.explorer =
                true;
        }

        if (
            totalPlayTime > 300
        ) {

            achievements.survivor =
                true;
        }
    }

    // ============================================================
    // HUD
    // ============================================================

    function updateHUD() {

        const healthFill =
            document.getElementById(
                "healthFill"
            );

        const energyFill =
            document.getElementById(
                "energyFill"
            );

        const ammoText =
            document.getElementById(
                "ammoText"
            );

        const killsText =
            document.getElementById(
                "killsText"
            );

        const creditsText =
            document.getElementById(
                "creditsText"
            );

        if (
            healthFill
        ) {

            healthFill.style.width =
                `${Math.max(
                    0,
                    playerHealth
                )}%`;

        }

        if (
            energyFill
        ) {

            energyFill.style.width =
                `${Math.max(
                    0,
                    playerEnergy
                )}%`;

        }

        if (
            ammoText
        ) {

            ammoText.textContent =
                `${ammo} / ${maxAmmo}`;

        }

        if (
            killsText
        ) {

            killsText.textContent =
                kills;

        }

        if (
            creditsText
        ) {

            creditsText.textContent =
                credits;

        }
    }

    // ============================================================
    // RESET OBJECTS
    // ============================================================

    function resetGameObjects() {

        for (
            const enemy of enemies
        ) {

            scene.remove(
                enemy.mesh
            );

        }

        enemies.length =
            0;

        for (
            const bullet of bullets
        ) {

            scene.remove(
                bullet.mesh
            );

        }

        bullets.length =
            0;

        for (
            const particle of particles
        ) {

            scene.remove(
                particle.mesh
            );

        }

        particles.length =
            0;

        for (
            const resource of resources
        ) {

            if (
                resource.mesh.parent
            ) {

                scene.remove(
                    resource.mesh
                );

            }

            resource.collected =
                false;

            scene.add(
                resource.mesh
            );
        }
    }

    // ============================================================
    // NEW GAME
    // ============================================================

    function startNewGame() {

        /*
         * ALLE OUDE PANELEN WORDEN VERWIJDERD.
         *
         * Hierdoor kan SHOP, PAUSE of GAME OVER
         * nooit boven de nieuwe game blijven staan.
         */

        closeAllPanels();

        resetGameObjects();

        gameState =
            "playing";

        playerHealth =
            PLAYER_MAX_HEALTH;

        playerEnergy =
            PLAYER_MAX_ENERGY;

        credits =
            100;

        kills =
            0;

        ammo =
            12;

        maxAmmo =
            12 +
            ammoUpgrade;

        reloadTimer =
            0;

        fireTimer =
            0;

        totalPlayTime =
            0;

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

        turret.rotation.set(
            0,
            0,
            0
        );

        achievements.firstShot =
            false;

        achievements.firstKill =
            false;

        achievements.fiveKills =
            false;

        achievements.explorer =
            false;

        achievements.survivor =
            false;

        spawnEnemies();

        // --------------------------------------------------------
        // HOOFDMENU WEG
        // --------------------------------------------------------

        mainMenu.style.display =
            "none";

        // --------------------------------------------------------
        // HUD AAN
        // --------------------------------------------------------

        hud.style.display =
            "block";

        notify(
            "ECHOBOUND RUN STARTED"
        );

        updateHUD();
    }

    // ============================================================
    // PAUSE
    // ============================================================

    function pauseGame() {

        if (
            gameState !==
            "playing"
        ) {

            return;
        }

        gameState =
            "paused";

        showPausePanel();
    }

    function showPausePanel() {

        closeAllPanels();

        const panel =
            createPanel(
                `

                <h1>
                    PAUSED
                </h1>

                <div class="panel-subtitle">
                    SYSTEM STANDBY
                </div>

                <button
                    class="echo-button"
                    id="resumeBtn"
                >
                    RESUME
                </button>

                <br><br>

                <button
                    class="echo-button"
                    id="pauseShopBtn"
                >
                    🛒 SHOP
                </button>

                <br><br>

                <button
                    class="echo-button"
                    id="pauseMenuBtn"
                >
                    MAIN MENU
                </button>

                `
            );

        // --------------------------------------------------------
        // RESUME
        // --------------------------------------------------------

        panel.panel
            .querySelector(
                "#resumeBtn"
            )
            .addEventListener(
                "click",
                () => {

                    panel.close();

                    gameState =
                        "playing";

                }
            );

        // --------------------------------------------------------
        // SHOP
        // --------------------------------------------------------

        panel.panel
            .querySelector(
                "#pauseShopBtn"
            )
            .addEventListener(
                "click",
                () => {

                    panel.close();

                    openShop();

                }
            );

        // --------------------------------------------------------
        // MAIN MENU
        // --------------------------------------------------------

        panel.panel
            .querySelector(
                "#pauseMenuBtn"
            )
            .addEventListener(
                "click",
                () => {

                    panel.close();

                    gameState =
                        "menu";

                    hud.style.display =
                        "none";

                    mainMenu.style.display =
                        "flex";

                }
            );
    }

    // ============================================================
    // MAP
    // ============================================================

    function openMap() {

        const panel =
            createPanel(
                `

                <h1>
                    MAP
                </h1>

                <div class="panel-subtitle">
                    CURRENT POSITION
                </div>

                <p>
                    X:
                    ${Math.round(
                        player.position.x
                    )}
                </p>

                <p>
                    Z:
                    ${Math.round(
                        player.position.z
                    )}
                </p>

                <p>
                    ENEMIES:
                    ${enemies.length}
                </p>

                <br>

                <button
                    class="echo-button"
                    id="mapBack"
                >
                    ← BACK
                </button>

                `
            );

        panel.panel
            .querySelector(
                "#mapBack"
            )
            .addEventListener(
                "click",
                panel.close
            );
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

        hud.style.display =
            "none";

        const panel =
            createPanel(
                `

                <h1>
                    SIGNAL LOST
                </h1>

                <div class="panel-subtitle">
                    YOUR TANK HAS BEEN DISABLED
                </div>

                <p>
                    KILLS:
                    <b>${kills}</b>
                </p>

                <p>
                    CREDITS:
                    <b>${credits}</b>
                </p>

                <br>

                <button
                    class="echo-button"
                    id="gameOverNew"
                >
                    NEW RUN
                </button>

                <br><br>

                <button
                    class="echo-button"
                    id="gameOverMenu"
                >
                    MAIN MENU
                </button>

                `
            );

        // --------------------------------------------------------
        // NEW RUN
        // --------------------------------------------------------

        panel.panel
            .querySelector(
                "#gameOverNew"
            )
            .addEventListener(
                "click",
                () => {

                    panel.close();

                    startNewGame();

                }
            );

        // --------------------------------------------------------
        // MAIN MENU
        // --------------------------------------------------------

        panel.panel
            .querySelector(
                "#gameOverMenu"
            )
            .addEventListener(
                "click",
                () => {

                    panel.close();

                    closeAllPanels();

                    gameState =
                        "menu";

                    hud.style.display =
                        "none";

                    mainMenu.style.display =
                        "flex";

                }
            );
    }

    // ============================================================
    // SAVE
    // ============================================================

    function saveGame() {

        const saveData = {

            player: {

                x:
                    player.position.x,

                z:
                    player.position.z,

                rotation:
                    player.rotation.y

            },

            health:
                playerHealth,

            energy:
                playerEnergy,

            credits,

            kills,

            ammo,

            maxAmmo,

            ammoUpgrade,

            totalPlayTime,

            achievements,

            gameState

        };

        localStorage.setItem(
            SAVE_KEY,
            JSON.stringify(
                saveData
            )
        );

        notify(
            "GAME SAVED"
        );
    }

    // ============================================================
    // LOAD GAME
    // ============================================================

    function loadGame() {

        const saved =
            localStorage.getItem(
                SAVE_KEY
            );

        if (!saved) {

            notify(
                "NO SAVE FOUND"
            );

            return;
        }

        try {

            const data =
                JSON.parse(
                    saved
                );

            /*
             * ALLE OUDE SHOP / PAUSE /
             * GAME OVER PANELEN WEG.
             */

            closeAllPanels();

            gameState =
                "playing";

            player.position.set(
                data.player.x,
                0,
                data.player.z
            );

            player.rotation.y =
                data.player.rotation;

            playerHealth =
                data.health;

            playerEnergy =
                data.energy;

            credits =
                data.credits;

            kills =
                data.kills;

            ammo =
                data.ammo;

            maxAmmo =
                data.maxAmmo;

            ammoUpgrade =
                data.ammoUpgrade ||
                0;

            totalPlayTime =
                data.totalPlayTime ||
                0;

            if (
                data.achievements
            ) {

                Object.assign(
                    achievements,
                    data.achievements
                );

            }

            resetGameObjects();

            spawnEnemies();

            // ----------------------------------------------------
            // MENU WEG
            // ----------------------------------------------------

            mainMenu.style.display =
                "none";

            // ----------------------------------------------------
            // HUD AAN
            // ----------------------------------------------------

            hud.style.display =
                "block";

            updateHUD();

            notify(
                "GAME LOADED"
            );

        } catch (
            error
        ) {

            console.error(
                error
            );

            notify(
                "SAVE FILE IS CORRUPTED"
            );
        }
    }

    // ============================================================
    // MAIN MENU BUTTONS
    // ============================================================

    const newRunButton =
        document.getElementById(
            "newRunBtn"
        );

    if (newRunButton) {

        newRunButton.addEventListener(
            "click",
            startNewGame
        );

    }

    const shopButton =
        document.getElementById(
            "shopBtn"
        );

    if (shopButton) {

        shopButton.addEventListener(
            "click",
            openShop
        );

    }

    const achievementsButton =
        document.getElementById(
            "achievementsBtn"
        );

    if (achievementsButton) {

        achievementsButton.addEventListener(
            "click",
            openAchievements
        );

    }

    const controlsButton =
        document.getElementById(
            "controlsBtn"
        );

    if (controlsButton) {

        controlsButton.addEventListener(
            "click",
            openControls
        );

    }

    const loadButton =
        document.getElementById(
            "loadBtn"
        );

    if (loadButton) {

        loadButton.addEventListener(
            "click",
            loadGame
        );

    }

    // ============================================================
    // HUD BUTTONS
    // ============================================================

    const pauseButton =
        document.getElementById(
            "pauseBtn"
        );

    if (pauseButton) {

        pauseButton.addEventListener(
            "click",
            pauseGame
        );

    }

    const mapButton =
        document.getElementById(
            "mapBtn"
        );

    if (mapButton) {

        mapButton.addEventListener(
            "click",
            openMap
        );

    }

    // ============================================================
    // KEYBOARD
    // ============================================================

    window.addEventListener(
        "keydown",
        event => {

            keys[
                event.key.toLowerCase()
            ] = true;

            // ----------------------------------------------------
            // RELOAD
            // ----------------------------------------------------

            if (
                event.key.toLowerCase() ===
                "r"
            ) {

                reload();

            }

            // ----------------------------------------------------
            // ESC
            // ----------------------------------------------------

            if (
                event.key ===
                "Escape"
            ) {

                if (
                    gameState ===
                    "playing"
                ) {

                    pauseGame();

                }

            }

        }
    );

    window.addEventListener(
        "keyup",
        event => {

            keys[
                event.key.toLowerCase()
            ] = false;

        }
    );

    // ============================================================
    // MOUSE MOVE
    // ============================================================

    window.addEventListener(
        "mousemove",
        event => {

            mouse.x =
                event.clientX;

            mouse.y =
                event.clientY;

        }
    );

    // ============================================================
    // MOUSE DOWN
    // ============================================================

    window.addEventListener(
        "mousedown",
        event => {

            if (
                event.button ===
                0
            ) {

                mouse.down =
                    true;

                shoot();

            }

        }
    );

    // ============================================================
    // MOUSE UP
    // ============================================================

    window.addEventListener(
        "mouseup",
        event => {

            if (
                event.button ===
                0
            ) {

                mouse.down =
                    false;

            }

        }
    );

    // ============================================================
    // WINDOW RESIZE
    // ============================================================

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

    // ============================================================
    // AUTO SAVE
    // ============================================================

    window.addEventListener(
        "beforeunload",
        () => {

            if (
                gameState ===
                    "playing" ||
                gameState ===
                    "paused"
            ) {

                const saveData = {

                    player: {

                        x:
                            player.position.x,

                        z:
                            player.position.z,

                        rotation:
                            player.rotation.y

                    },

                    health:
                        playerHealth,

                    energy:
                        playerEnergy,

                    credits,

                    kills,

                    ammo,

                    maxAmmo,

                    ammoUpgrade,

                    totalPlayTime,

                    achievements,

                    gameState

                };

                localStorage.setItem(
                    SAVE_KEY,
                    JSON.stringify(
                        saveData
                    )
                );

            }

        }
    );

    // ============================================================
    // GAME LOOP
    // ============================================================

    clock =
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

        if (
            gameState ===
            "playing"
        ) {

            totalPlayTime +=
                delta;

            // ----------------------------------------------------
            // FIRE TIMER
            // ----------------------------------------------------

            if (
                fireTimer > 0
            ) {

                fireTimer -=
                    delta;

            }

            // ----------------------------------------------------
            // RELOAD TIMER
            // ----------------------------------------------------

            if (
                reloadTimer > 0
            ) {

                reloadTimer -=
                    delta;

                if (
                    reloadTimer <= 0
                ) {

                    ammo =
                        maxAmmo;

                    notify(
                        "RELOAD COMPLETE"
                    );

                }

            }

            // ----------------------------------------------------
            // PLAYER
            // ----------------------------------------------------

            updatePlayer(
                delta
            );

            // ----------------------------------------------------
            // TURRET
            // ----------------------------------------------------

            updateTurretAim();

            // ----------------------------------------------------
            // CAMERA
            // ----------------------------------------------------

            updateCamera();

            // ----------------------------------------------------
            // ENEMIES
            // ----------------------------------------------------

            updateEnemies(
                delta
            );

            // ----------------------------------------------------
            // BULLETS
            // ----------------------------------------------------

            updateBullets(
                delta
            );

            // ----------------------------------------------------
            // RESOURCES
            // ----------------------------------------------------

            updateResources();

            // ----------------------------------------------------
            // PARTICLES
            // ----------------------------------------------------

            updateParticles(
                delta
            );

            // ----------------------------------------------------
            // ACHIEVEMENTS
            // ----------------------------------------------------

            updateAchievements();

            // ----------------------------------------------------
            // HUD
            // ----------------------------------------------------

            updateHUD();

            // ----------------------------------------------------
            // HOLD MOUSE TO FIRE
            // ----------------------------------------------------

            if (
                mouse.down
            ) {

                shoot();

            }

        }

        renderer.render(
            scene,
            camera
        );
    }

    // ============================================================
    // INITIAL STATE
    // ============================================================

    if (hud) {

        hud.style.display =
            "none";

    }

    if (mainMenu) {

        mainMenu.style.display =
            "flex";

    }

    updateHUD();

    // ============================================================
    // START LOOP
    // ============================================================

    animate();

})();
