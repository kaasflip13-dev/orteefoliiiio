// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// COMPLETE APP.JS
// ============================================================

(async function () {

    "use strict";

    // ============================================================
    // THREE.JS
    // ============================================================

    let THREE;

    try {

        const module = await import(
            "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
        );

        THREE = module;

    } catch (error) {

        document.body.innerHTML = `
            <div style="
                min-height:100vh;
                background:#05090c;
                color:white;
                display:flex;
                align-items:center;
                justify-content:center;
                font-family:Arial;
                text-align:center;
            ">
                <div>
                    <h1>EchoBound kan niet starten</h1>
                    <p>Three.js kon niet worden geladen.</p>
                    <p>Controleer je internetverbinding.</p>
                </div>
            </div>
        `;

        console.error(error);
        return;
    }

    // ============================================================
    // OUDE HTML UI VERBERGEN
    // ============================================================

    [
        "menu",
        "hud",
        "pause",
        "achievement",
        "achievements",
        "map",
        "gameOver",
        "controls",
        "shop"
    ].forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.style.display = "none";
        }

    });

    // ============================================================
    // CANVAS
    // ============================================================

    let canvas =
        document.getElementById("game");

    if (!canvas) {

        canvas =
            document.createElement("canvas");

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

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.background = "#05090c";

    // ============================================================
    // CONSTANTEN
    // ============================================================

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

    const SAVE_KEY =
        "echobound_save_v4";

    // ============================================================
    // GAME VARIABLES
    // ============================================================

    let scene;
    let camera;
    let renderer;
    let clock;

    let player;
    let turret;
    let cannon;
    let muzzle;

    let buildings = [];
    let enemies = [];
    let bullets = [];
    let particles = [];
    let resources = [];

    let gameState = "menu";

    let health =
        PLAYER_MAX_HEALTH;

    let energy =
        PLAYER_MAX_ENERGY;

    let ammo = 12;
    let maxAmmo = 12;

    let credits = 0;
    let kills = 0;

    let fireTimer = 0;
    let reloadTimer = 0;

    let gameTime = 0;

    let mouseX =
        window.innerWidth / 2;

    let mouseY =
        window.innerHeight / 2;

    let mouseDown = false;

    let notificationTimer = 0;

    const keys = {};

    let achievements = {

        firstShot: false,
        firstKill: false,
        fiveKills: false,
        explorer: false,
        survivor: false

    };

    // ============================================================
    // MATERIALEN
    // ============================================================

    const materials = {};

    createMaterials();

    // ============================================================
    // UI
    // ============================================================

    createUI();

    // ============================================================
    // THREE
    // ============================================================

    createThree();

    // ============================================================
    // WERELD
    // ============================================================

    createWorld();

    // ============================================================
    // PLAYER
    // ============================================================

    createPlayer();

    // ============================================================
    // ENEMIES
    // ============================================================

    createEnemies();

    // ============================================================
    // EVENTS
    // ============================================================

    setupEvents();

    resize();

    window.addEventListener(
        "resize",
        resize
    );

    clock =
        new THREE.Clock();

    showMenu();

    animate();

    // ============================================================
    // MATERIALEN MAKEN
    // ============================================================

    function createMaterials() {

        materials.ground =
            new THREE.MeshStandardMaterial({
                color: 0x182326,
                roughness: 1
            });

        materials.tankBody =
            new THREE.MeshStandardMaterial({
                color: 0x3c6972,
                metalness: 0.65,
                roughness: 0.35
            });

        materials.tankDark =
            new THREE.MeshStandardMaterial({
                color: 0x121e23,
                metalness: 0.7,
                roughness: 0.3
            });

        materials.tankAccent =
            new THREE.MeshStandardMaterial({
                color: 0x55f4f4,
                emissive: 0x147b80,
                emissiveIntensity: 1.5
            });

        materials.cannon =
            new THREE.MeshStandardMaterial({
                color: 0x263b42,
                metalness: 0.85,
                roughness: 0.25
            });

        materials.building =
            new THREE.MeshStandardMaterial({
                color: 0x29383d,
                metalness: 0.4,
                roughness: 0.7
            });

        materials.buildingAccent =
            new THREE.MeshStandardMaterial({
                color: 0x397e84,
                emissive: 0x123c40,
                emissiveIntensity: 1
            });

        materials.enemy =
            new THREE.MeshStandardMaterial({
                color: 0x8e4357,
                metalness: 0.3,
                roughness: 0.6
            });

        materials.enemyAccent =
            new THREE.MeshStandardMaterial({
                color: 0xff5c75,
                emissive: 0x72152a,
                emissiveIntensity: 1.6
            });

        materials.bullet =
            new THREE.MeshStandardMaterial({
                color: 0x75ffff,
                emissive: 0x18eaff,
                emissiveIntensity: 4
            });

        materials.resource =
            new THREE.MeshStandardMaterial({
                color: 0xc4a75c,
                emissive: 0x352a0c,
                emissiveIntensity: 0.5
            });

        materials.tree =
            new THREE.MeshStandardMaterial({
                color: 0x28463b
            });

        materials.treeTop =
            new THREE.MeshStandardMaterial({
                color: 0x39735d
            });

        materials.rock =
            new THREE.MeshStandardMaterial({
                color: 0x4b5559
            });

    }

    // ============================================================
    // THREE.JS SCENE
    // ============================================================

    function createThree() {

        scene =
            new THREE.Scene();

        scene.background =
            new THREE.Color(0x071016);

        scene.fog =
            new THREE.Fog(
                0x071016,
                110,
                330
            );

        camera =
            new THREE.PerspectiveCamera(
                65,
                window.innerWidth /
                window.innerHeight,
                0.1,
                600
            );

        renderer =
            new THREE.WebGLRenderer({
                canvas: canvas,
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

        renderer.shadowMap.type =
            THREE.PCFSoftShadowMap;

        // Licht

        const ambient =
            new THREE.HemisphereLight(
                0xa5dce5,
                0x10161a,
                1.8
            );

        scene.add(ambient);

        const sun =
            new THREE.DirectionalLight(
                0xbcefff,
                2.4
            );

        sun.position.set(
            60,
            100,
            30
        );

        sun.castShadow = true;

        sun.shadow.mapSize.width =
            2048;

        sun.shadow.mapSize.height =
            2048;

        sun.shadow.camera.left =
            -220;

        sun.shadow.camera.right =
            220;

        sun.shadow.camera.top =
            220;

        sun.shadow.camera.bottom =
            -220;

        scene.add(sun);

        // Grond

        const ground =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    WORLD_SIZE,
                    WORLD_SIZE
                ),
                materials.ground
            );

        ground.rotation.x =
            -Math.PI / 2;

        ground.receiveShadow =
            true;

        scene.add(ground);

        // Grid

        const grid =
            new THREE.GridHelper(
                WORLD_SIZE,
                36,
                0x27545a,
                0x14272c
            );

        grid.position.y =
            0.02;

        scene.add(grid);

    }

    // ============================================================
    // WERELD
    // ============================================================

    function createWorld() {

        buildings = [];
        resources = [];

        const buildingPositions = [

            [-95, -90, 32, 24],
            [-25, -105, 40, 28],
            [65, -90, 30, 35],
            [115, -30, 36, 25],
            [80, 50, 48, 28],
            [5, 90, 30, 36],
            [-75, 65, 38, 28],
            [-120, 5, 28, 38],
            [20, -15, 30, 25],
            [-35, 15, 24, 28]

        ];

        buildingPositions.forEach(
            function (data) {

                createBuilding(
                    data[0],
                    data[1],
                    data[2],
                    data[3]
                );

            }
        );

        // Bomen

        for (
            let i = 0;
            i < 90;
            i++
        ) {

            let x;
            let z;

            do {

                x =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 10,
                        HALF_WORLD - 10
                    );

                z =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 10,
                        HALF_WORLD - 10
                    );

            } while (
                positionBlocked(
                    x,
                    z,
                    3
                )
            );

            createTree(
                x,
                z
            );

        }

        // Rotsen

        for (
            let i = 0;
            i < 70;
            i++
        ) {

            let x;
            let z;

            do {

                x =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 8,
                        HALF_WORLD - 8
                    );

                z =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 8,
                        HALF_WORLD - 8
                    );

            } while (
                positionBlocked(
                    x,
                    z,
                    2
                )
            );

            createRock(
                x,
                z
            );

        }

        // Resources

        for (
            let i = 0;
            i < 35;
            i++
        ) {

            let x;
            let z;

            do {

                x =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 8,
                        HALF_WORLD - 8
                    );

                z =
                    THREE.MathUtils.randFloat(
                        -HALF_WORLD + 8,
                        HALF_WORLD - 8
                    );

            } while (
                positionBlocked(
                    x,
                    z,
                    2
                )
            );

            createResource(
                x,
                z
            );

        }

        createWorldBorders();

    }

    // ============================================================
    // GEBOUW
    // ============================================================

    function createBuilding(
        x,
        z,
        width,
        depth
    ) {

        const group =
            new THREE.Group();

        group.position.set(
            x,
            0,
            z
        );

        const body =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    7,
                    depth
                ),
                materials.building
            );

        body.position.y = 3.5;

        body.castShadow = true;
        body.receiveShadow = true;

        group.add(body);

        const roof =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width + 1,
                    0.5,
                    depth + 1
                ),
                materials.buildingAccent
            );

        roof.position.y = 7.1;

        roof.castShadow = true;

        group.add(roof);

        scene.add(group);

        buildings.push({

            x: x,
            z: z,
            width: width,
            depth: depth

        });

    }

    // ============================================================
    // BOOM
    // ============================================================

    function createTree(
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

        const trunk =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.45,
                    0.65,
                    3.5,
                    7
                ),
                materials.tree
            );

        trunk.position.y =
            1.75;

        trunk.castShadow = true;

        group.add(trunk);

        const top =
            new THREE.Mesh(
                new THREE.ConeGeometry(
                    2.4,
                    5,
                    7
                ),
                materials.treeTop
            );

        top.position.y =
            5;

        top.castShadow = true;

        group.add(top);

        scene.add(group);

    }

    // ============================================================
    // ROTS
    // ============================================================

    function createRock(
        x,
        z
    ) {

        const rock =
            new THREE.Mesh(
                new THREE.DodecahedronGeometry(
                    THREE.MathUtils.randFloat(
                        0.7,
                        1.8
                    )
                ),
                materials.rock
            );

        rock.position.set(
            x,
            0.7,
            z
        );

        rock.rotation.set(
            Math.random(),
            Math.random(),
            Math.random()
        );

        rock.castShadow = true;

        scene.add(rock);

    }

    // ============================================================
    // RESOURCE
    // ============================================================

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
                    1.2
                ),
                materials.resource
            );

        crystal.position.y =
            1.2;

        crystal.castShadow = true;

        group.add(crystal);

        scene.add(group);

        resources.push({

            mesh: group,
            collected: false

        });

    }

    // ============================================================
    // WERELDRAND
    // ============================================================

    function createWorldBorders() {

        const material =
            new THREE.MeshStandardMaterial({
                color: 0x101f24,
                metalness: 0.5,
                roughness: 0.5
            });

        const thickness = 2;
        const height = 8;

        const north =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    WORLD_SIZE,
                    height,
                    thickness
                ),
                material
            );

        north.position.set(
            0,
            height / 2,
            -HALF_WORLD
        );

        scene.add(north);

        const south =
            north.clone();

        south.position.z =
            HALF_WORLD;

        scene.add(south);

        const east =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    thickness,
                    height,
                    WORLD_SIZE
                ),
                material
            );

        east.position.set(
            HALF_WORLD,
            height / 2,
            0
        );

        scene.add(east);

        const west =
            east.clone();

        west.position.x =
            -HALF_WORLD;

        scene.add(west);

    }

    // ============================================================
    // TANK MAKEN
    // ============================================================

    function createPlayer() {

        player =
            new THREE.Group();

        // Tank start

        player.position.set(
            0,
            0,
            25
        );

        player.rotation.y = 0;

        // Onderkant

        const lowerBody =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    5.4,
                    1.2,
                    7.2
                ),
                materials.tankDark
            );

        lowerBody.position.y =
            1;

        lowerBody.castShadow =
            true;

        player.add(lowerBody);

        // Body

        const body =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    4.8,
                    2,
                    6.2
                ),
                materials.tankBody
            );

        body.position.y =
            2.2;

        body.castShadow =
            true;

        player.add(body);

        // Linker track

        const leftTrack =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.15,
                    1.5,
                    6.8
                ),
                materials.tankDark
            );

        leftTrack.position.set(
            -2.65,
            1.25,
            0
        );

        leftTrack.castShadow =
            true;

        player.add(leftTrack);

        // Rechter track

        const rightTrack =
            leftTrack.clone();

        rightTrack.position.x =
            2.65;

        player.add(rightTrack);

        // Turret basis

        const turretBase =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    2.25,
                    2.45,
                    0.8,
                    16
                ),
                materials.tankDark
            );

        turretBase.position.y =
            3.5;

        turretBase.castShadow =
            true;

        player.add(turretBase);

        // ========================================================
        // TURRET
        // ========================================================

        turret =
            new THREE.Group();

        turret.position.y =
            3.9;

        turret.rotation.y = 0;

        player.add(turret);

        const turretBody =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    3.8,
                    1.5,
                    4.2
                ),
                materials.tankBody
            );

        turretBody.position.z =
            0.3;

        turretBody.castShadow =
            true;

        turret.add(turretBody);

        // ========================================================
        // CANNON
        //
        // De cannon wijst nu standaard naar -Z.
        // Geen rare X-rotatie meer.
        // ========================================================

        cannon =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.75,
                    0.75,
                    5.8
                ),
                materials.cannon
            );

        cannon.position.set(
            0,
            0,
            -3.4
        );

        cannon.castShadow =
            true;

        turret.add(cannon);

        // ========================================================
        // MUZZLE
        // ========================================================

        muzzle =
            new THREE.Object3D();

        muzzle.position.set(
            0,
            0,
            -2.9
        );

        cannon.add(muzzle);

        // Klein licht aan de voorkant

        const cannonLight =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.9,
                    0.2,
                    0.25
                ),
                materials.tankAccent
            );

        cannonLight.position.set(
            0,
            0,
            -3
        );

        cannon.add(cannonLight);

        scene.add(player);

    }

    // ============================================================
    // VIJANDEN
    // ============================================================

    function createEnemies() {

        enemies.forEach(
            function (enemy) {

                scene.remove(
                    enemy.mesh
                );

            }
        );

        enemies = [];

        for (
            let i = 0;
            i < ENEMY_COUNT;
            i++
        ) {

            spawnEnemy();

        }

    }

    function spawnEnemy() {

        if (!player) {
            return;
        }

        let x;
        let z;

        let attempts = 0;

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

            attempts++;

        } while (

            (
                positionBlocked(
                    x,
                    z,
                    2.5
                ) ||
                x <
                -HALF_WORLD + 8 ||
                x >
                HALF_WORLD - 8 ||
                z <
                -HALF_WORLD + 8 ||
                z >
                HALF_WORLD - 8
            ) &&
            attempts < 100

        );

        const enemy =
            createEnemy();

        enemy.mesh.position.set(
            x,
            0,
            z
        );

        scene.add(
            enemy.mesh
        );

        enemies.push(enemy);

    }

    function createEnemy() {

        const group =
            new THREE.Group();

        const body =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    3.2,
                    2.2,
                    4
                ),
                materials.enemy
            );

        body.position.y =
            1.5;

        body.castShadow =
            true;

        group.add(body);

        const core =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.7,
                    12,
                    12
                ),
                materials.enemyAccent
            );

        core.position.y =
            1.7;

        group.add(core);

        const left =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.7,
                    1.4,
                    3.8
                ),
                materials.tankDark
            );

        left.position.set(
            -1.9,
            0.8,
            0
        );

        group.add(left);

        const right =
            left.clone();

        right.position.x =
            1.9;

        group.add(right);

        return {

            mesh: group,

            health: 50,

            speed:
                THREE.MathUtils.randFloat(
                    4,
                    7
                ),

            attackTimer: 0

        };

    }

    // ============================================================
    // INPUT
    // ============================================================

    function setupEvents() {

        // ========================================================
        // KEYBOARD
        // ========================================================

        window.addEventListener(
            "keydown",
            function (event) {

                keys[event.code] = true;

                if (
                    [
                        "Space",
                        "ArrowUp",
                        "ArrowDown",
                        "ArrowLeft",
                        "ArrowRight"
                    ].includes(
                        event.code
                    )
                ) {

                    event.preventDefault();

                }

                if (
                    event.code === "KeyR" &&
                    gameState === "playing"
                ) {

                    startReload();

                }

                if (
                    event.code === "Escape"
                ) {

                    if (
                        gameState === "playing"
                    ) {

                        showPause();

                    } else if (
                        gameState === "paused"
                    ) {

                        resumeGame();

                    }

                }

            }
        );

        window.addEventListener(
            "keyup",
            function (event) {

                keys[event.code] = false;

            }
        );

        // ========================================================
        // MUIS
        // ========================================================

        window.addEventListener(
            "mousemove",
            function (event) {

                mouseX =
                    event.clientX;

                mouseY =
                    event.clientY;

            }
        );

        // ========================================================
        // SCHIETEN
        // ========================================================

        canvas.addEventListener(
            "pointerdown",
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

                shoot();

            }
        );

        canvas.addEventListener(
            "pointerup",
            function (event) {

                if (
                    event.button === 0
                ) {

                    mouseDown = false;

                }

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

        // ========================================================
        // UI BUTTONS
        // ========================================================

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!button) {
                    return;
                }

                handleAction(
                    button.dataset.action
                );

            }
        );

    }

    // ============================================================
    // BUTTON ACTIONS
    // ============================================================

    function handleAction(
        action
    ) {

        if (
            action === "newrun"
        ) {

            startNewRun();
            return;

        }

        if (
            action === "load"
        ) {

            loadGame();
            return;

        }

        if (
            action === "shop"
        ) {

            showShop();
            return;

        }

        if (
            action === "achievements"
        ) {

            showAchievements();
            return;

        }

        if (
            action === "controls"
        ) {

            showControls();
            return;

        }

        if (
            action === "resume"
        ) {

            resumeGame();
            return;

        }

        if (
            action === "pause"
        ) {

            showPause();
            return;

        }

        if (
            action === "save"
        ) {

            saveGame();

            notify(
                "Game opgeslagen."
            );

            return;

        }

        if (
            action === "menu"
        ) {

            showMenu();
            return;

        }

        if (
            action === "map"
        ) {

            showMap();
            return;

        }

        if (
            action === "close"
        ) {

            hidePanel();
            return;

        }

        if (
            action === "buyammo"
        ) {

            buyAmmo();
            return;

        }

        if (
            action === "repair"
        ) {

            repairTank();
            return;

        }

        if (
            action === "upgrade"
        ) {

            upgradeTank();
            return;

        }

    }

    // ============================================================
    // NIEUWE RUN
    // ============================================================

    function startNewRun() {

        health =
            PLAYER_MAX_HEALTH;

        energy =
            PLAYER_MAX_ENERGY;

        ammo =
            maxAmmo;

        credits = 0;
        kills = 0;

        fireTimer = 0;
        reloadTimer = 0;

        gameTime = 0;

        mouseDown = false;

        player.position.set(
            0,
            0,
            25
        );

        player.rotation.y =
            0;

        turret.rotation.y =
            0;

        bullets.forEach(
            function (bullet) {

                scene.remove(
                    bullet.mesh
                );

            }
        );

        bullets = [];

        particles.forEach(
            function (particle) {

                scene.remove(
                    particle.mesh
                );

            }
        );

        particles = [];

        createEnemies();

        gameState =
            "playing";

        hidePanel();

        showHUD();

        updateHUD();

        notify(
            "Nieuwe run gestart."
        );

    }

    // ============================================================
    // SCHIETEN
    // ============================================================

    function shoot() {

        if (
            gameState !== "playing"
        ) {
            return;
        }

        if (
            !player ||
            !turret ||
            !cannon
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
                "Geen ammo. Druk R."
            );

            return;

        }

        ammo--;

        fireTimer =
            FIRE_COOLDOWN;

        // ========================================================
        // RICHTPUNT ONDER DE MUIS
        //
        // Dit is de belangrijke fix.
        //
        // We laten een ray vanaf de camera door de muis lopen
        // en laten die een horizontaal vlak raken.
        // De kogel vliegt daarna van de loop naar dat punt.
        //
        // Daardoor:
        // - schiet hij niet achteruit
        // - schiet hij niet omhoog
        // - gaat hij niet over vijanden heen
        // ========================================================

        const target =
            getMouseWorldPosition();

        if (!target) {

            ammo++;

            return;

        }

        // Positie van de ECHTE loop

        const start =
            new THREE.Vector3();

        muzzle.getWorldPosition(
            start
        );

        // Richting van de loop naar het doel

        const direction =
            target
                .clone()
                .sub(start);

        // Niet volledig verticaal schieten

        if (
            direction.lengthSq() < 0.01
        ) {

            ammo++;

            return;

        }

        direction.normalize();

        // Kogel

        const bulletMesh =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.28,
                    12,
                    12
                ),
                materials.bullet
            );

        // Een klein beetje voor de loop

        const bulletStart =
            start
                .clone()
                .add(
                    direction
                        .clone()
                        .multiplyScalar(0.7)
                );

        bulletMesh.position.copy(
            bulletStart
        );

        bulletMesh.castShadow =
            true;

        scene.add(
            bulletMesh
        );

        bullets.push({

            mesh: bulletMesh,

            velocity:
                direction
                    .clone()
                    .multiplyScalar(
                        BULLET_SPEED
                    ),

            life: 4

        });

        createMuzzleFlash(
            start
        );

        if (
            !achievements.firstShot
        ) {

            achievements.firstShot =
                true;

            notify(
                "Achievement unlocked: First Signal"
            );

        }

        updateHUD();

    }

    // ============================================================
    // MUIS -> WERELD POSITIE
    // ============================================================

    function getMouseWorldPosition() {

        const rect =
            renderer.domElement.getBoundingClientRect();

        const mouse =
            new THREE.Vector2();

        mouse.x =
            (
                (
                    mouseX -
                    rect.left
                ) /
                rect.width
            ) * 2 - 1;

        mouse.y =
            -(
                (
                    mouseY -
                    rect.top
                ) /
                rect.height
            ) * 2 + 1;

        const raycaster =
            new THREE.Raycaster();

        raycaster.setFromCamera(
            mouse,
            camera
        );

        // Het doelvlak ligt laag boven de grond.
        // Hierdoor richt de cannon op een echt punt op de grond.

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

        const hit =
            raycaster.ray.intersectPlane(
                plane,
                target
            );

        if (!hit) {
            return null;
        }

        return target;

    }

    // ============================================================
    // TURRET RICHTING
    // ============================================================

    function updateTurretAim() {

        if (
            gameState !== "playing"
        ) {
            return;
        }

        if (!player || !turret) {
            return;
        }

        const target =
            getMouseWorldPosition();

        if (!target) {
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
            0.01
        ) {
            return;
        }

        // Onze tank kijkt naar -Z.
        // Daarom gebruiken we deze yaw:

        const worldYaw =
            Math.atan2(
                -dx,
                -dz
            );

        const localYaw =
            normalizeAngle(
                worldYaw -
                player.rotation.y
            );

        turret.rotation.y =
            THREE.MathUtils.lerp(
                turret.rotation.y,
                localYaw,
                0.45
            );

    }

    function normalizeAngle(
        angle
    ) {

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

    // ============================================================
    // MUZZLE FLASH
    // ============================================================

    function createMuzzleFlash(
        position
    ) {

        const flash =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.65,
                    8,
                    8
                ),
                materials.tankAccent
            );

        flash.position.copy(
            position
        );

        scene.add(flash);

        particles.push({

            mesh: flash,

            life: 0.08,

            maxLife: 0.08,

            velocity:
                new THREE.Vector3(
                    0,
                    0,
                    0
                )

        });

    }

    // ============================================================
    // BULLETS UPDATE
    // ============================================================

    function updateBullets(dt) {

        for (
            let i = bullets.length - 1;
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
                    .multiplyScalar(dt);

            const newPosition =
                oldPosition
                    .clone()
                    .add(movement);

            // Muur

            if (
                lineBlocked(
                    oldPosition,
                    newPosition
                )
            ) {

                createHitEffect(
                    newPosition
                );

                removeBullet(i);

                continue;

            }

            bullet.mesh.position.copy(
                newPosition
            );

            bullet.life -= dt;

            let hit = false;

            // Vijanden

            for (
                let e = enemies.length - 1;
                e >= 0;
                e--
            ) {

                const enemy =
                    enemies[e];

                // We kijken alleen naar het
                // lichaam van de vijand.
                // Hierdoor zijn kogels veel
                // makkelijker raak.

                const enemyCenter =
                    enemy.mesh.position
                        .clone();

                enemyCenter.y = 1.5;

                const distance =
                    enemyCenter.distanceTo(
                        bullet.mesh.position
                    );

                if (
                    distance < 2.8
                ) {

                    enemy.health -=
                        BULLET_DAMAGE;

                    createHitEffect(
                        bullet.mesh.position
                    );

                    removeBullet(i);

                    hit = true;

                    if (
                        enemy.health <= 0
                    ) {

                        killEnemy(e);

                    }

                    break;

                }

            }

            if (hit) {
                continue;
            }

            if (
                bullet.life <= 0
            ) {

                removeBullet(i);

            }

        }

    }

    function removeBullet(
        index
    ) {

        const bullet =
            bullets[index];

        if (!bullet) {
            return;
        }

        scene.remove(
            bullet.mesh
        );

        bullets.splice(
            index,
            1
        );

    }

    // ============================================================
    // HIT EFFECT
    // ============================================================

    function createHitEffect(
        position
    ) {

        for (
            let i = 0;
            i < 5;
            i++
        ) {

            const particle =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.09,
                        6,
                        6
                    ),
                    materials.tankAccent
                );

            particle.position.copy(
                position
            );

            particle.position.x +=
                THREE.MathUtils.randFloat(
                    -0.3,
                    0.3
                );

            particle.position.y +=
                THREE.MathUtils.randFloat(
                    -0.3,
                    0.3
                );

            particle.position.z +=
                THREE.MathUtils.randFloat(
                    -0.3,
                    0.3
                );

            scene.add(
                particle
            );

            particles.push({

                mesh: particle,

                life: 0.3,

                maxLife: 0.3,

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
                    )

            });

        }

    }

    // ============================================================
    // PARTICLES
    // ============================================================

    function updateParticles(dt) {

        for (
            let i = particles.length - 1;
            i >= 0;
            i--
        ) {

            const particle =
                particles[i];

            particle.life -= dt;

            particle.mesh.position.add(
                particle.velocity
                    .clone()
                    .multiplyScalar(dt)
            );

            particle.velocity.y -=
                8 * dt;

            const scale =
                Math.max(
                    0,
                    particle.life /
                    particle.maxLife
                );

            particle.mesh.scale.setScalar(
                scale
            );

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
    // ENEMY UPDATE
    // ============================================================

    function updateEnemies(dt) {

        if (!player) {
            return;
        }

        enemies.forEach(
            function (enemy) {

                const enemyPosition =
                    enemy.mesh.position;

                const dx =
                    player.position.x -
                    enemyPosition.x;

                const dz =
                    player.position.z -
                    enemyPosition.z;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dz * dz
                    );

                // Naar speler lopen

                if (
                    distance > 6
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
                            .clone()
                            .multiplyScalar(
                                enemy.speed *
                                dt
                            );

                    const next =
                        enemyPosition
                            .clone()
                            .add(
                                movement
                            );

                    if (
                        !positionBlocked(
                            next.x,
                            next.z,
                            2
                        )
                    ) {

                        enemyPosition.copy(
                            next
                        );

                    }

                    enemy.mesh.rotation.y =
                        Math.atan2(
                            dx,
                            dz
                        );

                }

                enemy.attackTimer -=
                    dt;

                if (
                    distance < 7 &&
                    enemy.attackTimer <= 0
                ) {

                    if (
                        !lineBlocked(
                            enemyPosition,
                            player.position
                        )
                    ) {

                        damagePlayer(
                            8
                        );

                        enemy.attackTimer =
                            1.2;

                    }

                }

            }
        );

    }

    // ============================================================
    // ENEMY KILL
    // ============================================================

    function killEnemy(
        index
    ) {

        const enemy =
            enemies[index];

        if (!enemy) {
            return;
        }

        createHitEffect(
            enemy.mesh.position
        );

        scene.remove(
            enemy.mesh
        );

        enemies.splice(
            index,
            1
        );

        kills++;

        credits += 25;

        if (
            !achievements.firstKill
        ) {

            achievements.firstKill =
                true;

            notify(
                "Achievement unlocked: First Contact"
            );

        }

        if (
            kills >= 5 &&
            !achievements.fiveKills
        ) {

            achievements.fiveKills =
                true;

            notify(
                "Achievement unlocked: Hunter"
            );

        }

        setTimeout(
            function () {

                if (
                    gameState === "playing"
                ) {

                    spawnEnemy();

                }

            },
            1000
        );

        updateHUD();

    }

    // ============================================================
    // PLAYER DAMAGE
    // ============================================================

    function damagePlayer(
        amount
    ) {

        if (
            gameState !== "playing"
        ) {
            return;
        }

        health -= amount;

        health =
            Math.max(
                0,
                health
            );

        if (
            health <= 0
        ) {

            gameOver();

        }

        updateHUD();

    }

    // ============================================================
    // PLAYER MOVEMENT
    // ============================================================

    function updatePlayer(dt) {

        if (
            gameState !== "playing"
        ) {
            return;
        }

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

        if (
            turn !== 0
        ) {

            player.rotation.y +=
                turn *
                TANK_TURN_SPEED *
                dt;

        }

        if (
            forward === 0
        ) {
            return;
        }

        const speed =
            forward > 0
                ? TANK_SPEED
                : TANK_REVERSE_SPEED;

        // Tank front = -Z

        const direction =
            new THREE.Vector3(
                0,
                0,
                -1
            );

        direction.applyQuaternion(
            player.quaternion
        );

        direction.normalize();

        const movement =
            direction
                .multiplyScalar(
                    speed *
                    forward *
                    dt
                );

        moveTank(
            movement.x,
            movement.z
        );

    }

    function moveTank(
        dx,
        dz
    ) {

        const radius = 3;

        const nextX =
            player.position.x +
            dx;

        if (
            !positionBlocked(
                nextX,
                player.position.z,
                radius
            )
        ) {

            player.position.x =
                nextX;

        }

        const nextZ =
            player.position.z +
            dz;

        if (
            !positionBlocked(
                player.position.x,
                nextZ,
                radius
            )
        ) {

            player.position.z =
                nextZ;

        }

    }

    // ============================================================
    // CAMERA
    // ============================================================

    function updateCamera(dt) {

        if (!player) {
            return;
        }

        // Camera zit altijd achter de tank.
        // De camera draait dus NIET los van de tank.

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

    // ============================================================
    // COLLISION
    // ============================================================

    function positionBlocked(
        x,
        z,
        radius
    ) {

        if (
            x - radius <
            -HALF_WORLD + 2
        ) {
            return true;
        }

        if (
            x + radius >
            HALF_WORLD - 2
        ) {
            return true;
        }

        if (
            z - radius <
            -HALF_WORLD + 2
        ) {
            return true;
        }

        if (
            z + radius >
            HALF_WORLD - 2
        ) {
            return true;
        }

        for (
            let i = 0;
            i < buildings.length;
            i++
        ) {

            const building =
                buildings[i];

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
                x > minX &&
                x < maxX &&
                z > minZ &&
                z < maxZ
            ) {

                return true;

            }

        }

        return false;

    }

    // ============================================================
    // KOGEL MUUR CHECK
    // ============================================================

    function lineBlocked(
        start,
        end
    ) {

        const distance =
            start.distanceTo(
                end
            );

        const steps =
            Math.max(
                1,
                Math.ceil(
                    distance * 2
                )
            );

        for (
            let i = 0;
            i <= steps;
            i++
        ) {

            const t =
                i / steps;

            const x =
                THREE.MathUtils.lerp(
                    start.x,
                    end.x,
                    t
                );

            const z =
                THREE.MathUtils.lerp(
                    start.z,
                    end.z,
                    t
                );

            if (
                positionBlocked(
                    x,
                    z,
                    0.45
                )
            ) {

                return true;

            }

        }

        return false;

    }

    // ============================================================
    // RESOURCES
    // ============================================================

    function collectResources() {

        if (!player) {
            return;
        }

        resources.forEach(
            function (resource) {

                if (
                    resource.collected
                ) {
                    return;
                }

                const distance =
                    resource.mesh
                        .position
                        .distanceTo(
                            player.position
                        );

                if (
                    distance < 4
                ) {

                    resource.collected =
                        true;

                    resource.mesh.visible =
                        false;

                    credits += 5;

                    notify(
                        "+5 credits"
                    );

                    updateHUD();

                }

            }
        );

    }

    // ============================================================
    // RELOAD
    // ============================================================

    function startReload() {

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
            "Reloading..."
        );

    }

    function updateReload(dt) {

        if (
            reloadTimer <= 0
        ) {
            return;
        }

        reloadTimer -= dt;

        if (
            reloadTimer <= 0
        ) {

            reloadTimer = 0;

            ammo = maxAmmo;

            notify(
                "Reload compleet."
            );

            updateHUD();

        }

    }

    // ============================================================
    // FIRE TIMER
    // ============================================================

    function updateFire(dt) {

        if (
            fireTimer > 0
        ) {

            fireTimer -= dt;

            if (
                fireTimer < 0
            ) {

                fireTimer = 0;

            }

        }

        if (
            mouseDown &&
            gameState === "playing" &&
            fireTimer <= 0
        ) {

            shoot();

        }

    }

    // ============================================================
    // SHOP
    // ============================================================

    function buyAmmo() {

        if (
            credits < 10
        ) {

            notify(
                "Niet genoeg credits."
            );

            return;

        }

        credits -= 10;

        ammo = maxAmmo;

        notify(
            "Ammo aangevuld."
        );

        updateHUD();

    }

    function repairTank() {

        if (
            credits < 20
        ) {

            notify(
                "Niet genoeg credits."
            );

            return;

        }

        if (
            health >=
            PLAYER_MAX_HEALTH
        ) {

            notify(
                "Je tank is al volledig."
            );

            return;

        }

        credits -= 20;

        health =
            PLAYER_MAX_HEALTH;

        notify(
            "Tank gerepareerd."
        );

        updateHUD();

    }

    function upgradeTank() {

        if (
            credits < 50
        ) {

            notify(
                "Je hebt 50 credits nodig."
            );

            return;

        }

        credits -= 50;

        maxAmmo += 4;

        ammo = maxAmmo;

        notify(
            "Ammo capaciteit verbeterd."
        );

        updateHUD();

    }

    // ============================================================
    // SAVE
    // ============================================================

    function saveGame() {

        if (!player) {
            return;
        }

        const data = {

            health: health,

            energy: energy,

            ammo: ammo,

            maxAmmo: maxAmmo,

            credits: credits,

            kills: kills,

            gameTime: gameTime,

            position: {

                x: player.position.x,

                y: player.position.y,

                z: player.position.z

            },

            rotationY:
                player.rotation.y,

            turretRotation:
                turret.rotation.y,

            achievements:
                achievements

        };

        try {

            localStorage.setItem(
                SAVE_KEY,
                JSON.stringify(data)
            );

        } catch (error) {

            console.error(
                "Save error:",
                error
            );

        }

    }

    // ============================================================
    // LOAD
    // ============================================================

    function loadGame() {

        let raw;

        try {

            raw =
                localStorage.getItem(
                    SAVE_KEY
                );

        } catch (error) {

            console.error(error);

            raw = null;

        }

        if (!raw) {

            notify(
                "Geen opgeslagen game gevonden."
            );

            return;

        }

        try {

            const data =
                JSON.parse(raw);

            health =
                data.health ??
                PLAYER_MAX_HEALTH;

            energy =
                data.energy ??
                PLAYER_MAX_ENERGY;

            ammo =
                data.ammo ??
                12;

            maxAmmo =
                data.maxAmmo ??
                12;

            credits =
                data.credits ??
                0;

            kills =
                data.kills ??
                0;

            gameTime =
                data.gameTime ??
                0;

            if (
                data.position
            ) {

                player.position.set(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );

            }

            player.rotation.y =
                data.rotationY ??
                0;

            turret.rotation.y =
                data.turretRotation ??
                0;

            if (
                data.achievements
            ) {

                achievements =
                    Object.assign(
                        achievements,
                        data.achievements
                    );

            }

            createEnemies();

            gameState =
                "playing";

            hidePanel();

            showHUD();

            updateHUD();

            notify(
                "Game geladen."
            );

        } catch (error) {

            console.error(error);

            notify(
                "Savebestand is beschadigd."
            );

        }

    }

    // ============================================================
    // GAME OVER
    // ============================================================

    function gameOver() {

        gameState =
            "gameover";

        mouseDown = false;

        saveGame();

        showGameOver();

    }

    // ============================================================
    // UI MAKEN
    // ============================================================

    function createUI() {

        const ui =
            document.createElement(
                "div"
            );

        ui.id =
            "echobound-ui";

        ui.innerHTML = `

            <!-- ==================================================
                 HOOFDMENU
                 ================================================== -->

            <div id="eb-menu"
                 class="eb-screen">

                <div class="eb-logo">
                    ECHOBOUND
                </div>

                <div class="eb-subtitle">
                    THE LOST SIGNAL
                </div>

                <button data-action="newrun">
                    NEW RUN
                </button>

                <button data-action="load">
                    LOAD GAME
                </button>

                <button data-action="shop">
                    SHOP
                </button>

                <button data-action="achievements">
                    ACHIEVEMENTS
                </button>

                <button data-action="controls">
                    CONTROLS
                </button>

            </div>

            <!-- ==================================================
                 HUD
                 ================================================== -->

            <div id="eb-hud">

                <div class="eb-status">

                    <div>
                        HULL

                        <div class="eb-bar">
                            <div
                                id="eb-health"
                                class="eb-health">
                            </div>
                        </div>
                    </div>

                    <div>
                        ENERGY

                        <div class="eb-bar">
                            <div
                                id="eb-energy"
                                class="eb-energy">
                            </div>
                        </div>
                    </div>

                    <div id="eb-ammo">
                        AMMO: 12 / 12
                    </div>

                    <div id="eb-kills">
                        KILLS: 0
                    </div>

                    <div id="eb-credits">
                        CREDITS: 0
                    </div>

                </div>

                <div class="eb-crosshair">
                    +
                </div>

                <div class="eb-actions">

                    <!-- SHOP STAAT HIER NIET MEER -->

                    <button data-action="map">
                        MAP
                    </button>

                    <button data-action="pause">
                        PAUSE
                    </button>

                </div>

                <div id="eb-notification">
                </div>

            </div>

            <!-- ==================================================
                 PANEL
                 ================================================== -->

            <div
                id="eb-panel"
                class="eb-screen eb-hidden">
            </div>

        `;

        document.body.appendChild(
            ui
        );

        createUIStyle();

    }

    // ============================================================
    // UI STYLE
    // ============================================================

    function createUIStyle() {

        const style =
            document.createElement(
                "style"
            );

        style.textContent = `

            #echobound-ui {
                position:fixed;
                inset:0;
                z-index:20;
                pointer-events:none;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
                color:#dffcff;
            }

            .eb-screen {
                position:absolute;
                inset:0;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                gap:12px;
                pointer-events:auto;

                background:
                    radial-gradient(
                        circle at center,
                        rgba(
                            25,
                            75,
                            82,
                            .42
                        ),
                        rgba(
                            2,
                            7,
                            10,
                            .97
                        )
                    );
            }

            .eb-hidden {
                display:none !important;
            }

            .eb-logo {
                font-size:
                    clamp(
                        42px,
                        8vw,
                        90px
                    );

                font-weight:900;

                letter-spacing:12px;

                color:#7df8ff;

                text-shadow:
                    0 0 10px #27dbe5,
                    0 0 35px #0c7d88;
            }

            .eb-subtitle {

                letter-spacing:6px;

                color:#7e9da2;

                margin-bottom:30px;
            }

            #echobound-ui button {

                width:260px;

                padding:
                    15px 20px;

                border:
                    1px solid
                    #3caab2;

                background:
                    linear-gradient(
                        180deg,
                        #153b42,
                        #0b2025
                    );

                color:#dffcff;

                font-weight:bold;

                letter-spacing:2px;

                cursor:pointer;

                border-radius:4px;

                box-shadow:
                    0 0 15px
                    rgba(
                        40,
                        220,
                        230,
                        .12
                    );

                transition:
                    .15s;

                pointer-events:auto;
            }

            #echobound-ui button:hover {

                background:
                    linear-gradient(
                        180deg,
                        #1b5961,
                        #103037
                    );

                transform:
                    translateY(-2px);

                box-shadow:
                    0 0 22px
                    rgba(
                        70,
                        240,
                        250,
                        .28
                    );
            }

            #eb-hud {

                position:absolute;

                inset:0;

                display:none;

                pointer-events:none;
            }

            .eb-status {

                position:absolute;

                left:20px;

                top:20px;

                width:220px;

                display:flex;

                flex-direction:column;

                gap:9px;

                padding:14px;

                background:
                    rgba(
                        4,
                        12,
                        16,
                        .72
                    );

                border:
                    1px solid
                    rgba(
                        76,
                        220,
                        230,
                        .3
                    );

                backdrop-filter:
                    blur(5px);
            }

            .eb-bar {

                width:100%;

                height:7px;

                margin-top:4px;

                background:#17252a;

                overflow:hidden;
            }

            .eb-health {

                width:100%;

                height:100%;

                background:#51e1cf;
            }

            .eb-energy {

                width:100%;

                height:100%;

                background:#4fa8ff;
            }

            .eb-crosshair {

                position:absolute;

                left:50%;

                top:50%;

                transform:
                    translate(
                        -50%,
                        -50%
                    );

                color:#91fbff;

                font-size:25px;

                text-shadow:
                    0 0 10px #00ffff;
            }

            .eb-actions {

                position:absolute;

                right:20px;

                top:20px;

                display:flex;

                gap:8px;

                pointer-events:auto;
            }

            .eb-actions button {

                width:auto !important;

                padding:
                    10px 14px !important;

                font-size:11px;
            }

            #eb-notification {

                position:absolute;

                left:50%;

                bottom:50px;

                transform:
                    translateX(-50%);

                padding:
                    12px 22px;

                background:
                    rgba(
                        4,
                        20,
                        24,
                        .9
                    );

                border:
                    1px solid
                    #4cdbe4;

                opacity:0;

                transition:
                    opacity .2s;
            }

            #eb-panel {

                position:absolute;

                inset:0;

                display:flex;

                align-items:center;

                justify-content:center;

                pointer-events:auto;

                background:
                    rgba(
                        3,
                        9,
                        12,
                        .91
                    );
            }

            .eb-box {

                width:
                    min(
                        720px,
                        calc(
                            100vw - 40px
                        )
                    );

                max-height:
                    calc(
                        100vh - 60px
                    );

                overflow:auto;

                padding:30px;

                background:
                    linear-gradient(
                        180deg,
                        #10252a,
                        #081317
                    );

                border:
                    1px solid
                    #3e9da5;

                box-shadow:
                    0 0 40px
                    rgba(
                        0,
                        220,
                        240,
                        .15
                    );
            }

            .eb-box h1 {

                color:#7df8ff;

                margin-top:0;

                letter-spacing:4px;
            }

            .eb-box h2 {

                color:#9deef3;

                font-size:17px;
            }

            .eb-box p,
            .eb-box li {

                color:#a8c3c7;

                line-height:1.6;
            }

            .eb-small {

                color:#769398;

                font-size:13px;
            }

        `;

        document.head.appendChild(
            style
        );

    }

    // ============================================================
    // HOOFDMENU
    // ============================================================

    function showMenu() {

        gameState =
            "menu";

        mouseDown = false;

        const menu =
            document.getElementById(
                "eb-menu"
            );

        const hud =
            document.getElementById(
                "eb-hud"
            );

        menu.style.display =
            "flex";

        hud.style.display =
            "none";

        hidePanel();

    }

    // ============================================================
    // HUD
    // ============================================================

    function showHUD() {

        const menu =
            document.getElementById(
                "eb-menu"
            );

        const hud =
            document.getElementById(
                "eb-hud"
            );

        menu.style.display =
            "none";

        hud.style.display =
            "block";

    }

    function updateHUD() {

        const healthBar =
            document.getElementById(
                "eb-health"
            );

        const energyBar =
            document.getElementById(
                "eb-energy"
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

        if (healthBar) {

            healthBar.style.width =
                (
                    health /
                    PLAYER_MAX_HEALTH *
                    100
                ) + "%";

        }

        if (energyBar) {

            energyBar.style.width =
                (
                    energy /
                    PLAYER_MAX_ENERGY *
                    100
                ) + "%";

        }

        if (ammoText) {

            if (
                reloadTimer > 0
            ) {

                ammoText.textContent =
                    "RELOADING...";

            } else {

                ammoText.textContent =
                    "AMMO: " +
                    ammo +
                    " / " +
                    maxAmmo;

            }

        }

        if (killsText) {

            killsText.textContent =
                "KILLS: " +
                kills;

        }

        if (creditsText) {

            creditsText.textContent =
                "CREDITS: " +
                credits;

        }

    }

    // ============================================================
    // PAUSE
    // ============================================================

    function showPause() {

        if (
            gameState !== "playing"
        ) {
            return;
        }

        gameState =
            "paused";

        mouseDown = false;

        const panel =
            document.getElementById(
                "eb-panel"
            );

        panel.innerHTML = `

            <div class="eb-box">

                <h1>PAUSED</h1>

                <p>
                    The Lost Signal is waiting.
                </p>

                <br>

                <button data-action="resume">
                    RESUME
                </button>

                <button data-action="save">
                    SAVE GAME
                </button>

                <button data-action="achievements">
                    ACHIEVEMENTS
                </button>

                <button data-action="controls">
                    CONTROLS
                </button>

                <button data-action="menu">
                    QUIT TO MENU
                </button>

            </div>

        `;

        panel.classList.remove(
            "eb-hidden"
        );

    }

    function resumeGame() {

        gameState =
            "playing";

        hidePanel();

        showHUD();

    }

    // ============================================================
    // SHOP
    // ============================================================

    function showShop() {

        const panel =
            document.getElementById(
                "eb-panel"
            );

        panel.innerHTML = `

            <div class="eb-box">

                <h1>FIELD SHOP</h1>

                <p>
                    Credits:
                    <strong>
                        ${credits}
                    </strong>
                </p>

                <br>

                <button data-action="buyammo">
                    AMMO — 10 CREDITS
                </button>

                <button data-action="repair">
                    REPAIR — 20 CREDITS
                </button>

                <button data-action="upgrade">
                    AMMO UPGRADE — 50 CREDITS
                </button>

                <br>

                <button data-action="close">
                    BACK
                </button>

            </div>

        `;

        panel.classList.remove(
            "eb-hidden"
        );

    }

    // ============================================================
    // ACHIEVEMENTS
    // ============================================================

    function showAchievements() {

        const panel =
            document.getElementById(
                "eb-panel"
            );

        const list = [

            {
                name:
                    "First Signal",
                description:
                    "Fire your first shot.",
                unlocked:
                    achievements.firstShot
            },

            {
                name:
                    "First Contact",
                description:
                    "Destroy your first enemy.",
                unlocked:
                    achievements.firstKill
            },

            {
                name:
                    "Hunter",
                description:
                    "Destroy 5 enemies.",
                unlocked:
                    achievements.fiveKills
            },

            {
                name:
                    "Explorer",
                description:
                    "Travel deep into the lost zone.",
                unlocked:
                    achievements.explorer
            },

            {
                name:
                    "Survivor",
                description:
                    "Survive a long run.",
                unlocked:
                    achievements.survivor
            }

        ];

        panel.innerHTML = `

            <div class="eb-box">

                <h1>ACHIEVEMENTS</h1>

                ${list.map(
                    function (item) {

                        return `

                            <div style="
                                margin:12px 0;
                                padding:14px;
                                border:1px solid;
                                ${
                                    item.unlocked
                                    ? "#3edfe7"
                                    : "#27383c"
                                };
                                background:
                                ${
                                    item.unlocked
                                    ? "rgba(35,120,125,.15)"
                                    : "rgba(0,0,0,.18)"
                                };
                            ">

                                <strong>

                                    ${
                                        item.unlocked
                                        ? "✓"
                                        : "□"
                                    }

                                    ${item.name}

                                </strong>

                                <div class="eb-small">

                                    ${item.description}

                                </div>

                            </div>

                        `;

                    }
                ).join("")}

                <button data-action="close">
                    BACK
                </button>

            </div>

        `;

        panel.classList.remove(
            "eb-hidden"
        );

    }

    // ============================================================
    // CONTROLS
    // ============================================================

    function showControls() {

        const panel =
            document.getElementById(
                "eb-panel"
            );

        panel.innerHTML = `

            <div class="eb-box">

                <h1>CONTROLS</h1>

                <h2>Tank</h2>

                <p>
                    <strong>W</strong>
                    — vooruit
                </p>

                <p>
                    <strong>S</strong>
                    — achteruit
                </p>

                <p>
                    <strong>A / D</strong>
                    — draaien
                </p>

                <h2>Combat</h2>

                <p>
                    <strong>Muis</strong>
                    — kanon richten
                </p>

                <p>
                    <strong>Linkermuisknop</strong>
                    — schieten
                </p>

                <p>
                    <strong>R</strong>
                    — reload
                </p>

                <h2>Game</h2>

                <p>
                    <strong>ESC</strong>
                    — pauze
                </p>

                <button data-action="close">
                    BACK
                </button>

            </div>

        `;

        panel.classList.remove(
            "eb-hidden"
        );

    }

    // ============================================================
    // MAP
    // ============================================================

    function showMap() {

        const panel =
            document.getElementById(
                "eb-panel"
            );

        panel.innerHTML = `

            <div class="eb-box">

                <h1>ZONE MAP</h1>

                <div style="
                    width:100%;
                    height:420px;
                    position:relative;
                    overflow:hidden;
                    background:#0c171b;
                    border:1px solid #28575c;
                ">

                    <div style="
                        position:absolute;
                        left:50%;
                        top:50%;
                        width:12px;
                        height:12px;
                        transform:
                            translate(
                                -50%,
                                -50%
                            );
                        border-radius:50%;
                        background:#63f5ff;
                        box-shadow:
                            0 0 15px
                            #63f5ff;
                    "></div>

                    ${buildings.map(
                        function (building) {

                            const left =
                                (
                                    (
                                        building.x +
                                        HALF_WORLD
                                    ) /
                                    WORLD_SIZE *
                                    100
                                );

                            const top =
                                (
                                    (
                                        building.z +
                                        HALF_WORLD
                                    ) /
                                    WORLD_SIZE *
                                    100
                                );

                            const width =
                                (
                                    building.width /
                                    WORLD_SIZE *
                                    100
                                );

                            const height =
                                (
                                    building.depth /
                                    WORLD_SIZE *
                                    100
                                );

                            return `

                                <div style="
                                    position:absolute;
                                    left:${left}%;
                                    top:${top}%;
                                    width:${width}%;
                                    height:${height}%;
                                    background:#28454a;
                                    border:
                                        1px solid
                                        #4d7478;
                                "></div>

                            `;

                        }
                    ).join("")}

                </div>

                <br>

                <button data-action="close">
                    BACK
                </button>

            </div>

        `;

        panel.classList.remove(
            "eb-hidden"
        );

    }

    // ============================================================
    // GAME OVER
    // ============================================================

    function showGameOver() {

        const menu =
            document.getElementById(
                "eb-menu"
            );

        const hud =
            document.getElementById(
                "eb-hud"
            );

        const panel =
            document.getElementById(
                "eb-panel"
            );

        menu.style.display =
            "none";

        hud.style.display =
            "none";

        panel.innerHTML = `

            <div class="eb-box"
                 style="
                    text-align:center;
                 ">

                <h1>
                    SIGNAL LOST
                </h1>

                <p>
                    Your tank has been disabled.
                </p>

                <p>
                    Kills:
                    <strong>
                        ${kills}
                    </strong>
                </p>

                <p>
                    Credits:
                    <strong>
                        ${credits}
                    </strong>
                </p>

                <br>

                <button data-action="newrun">
                    NEW RUN
                </button>

                <button data-action="load">
                    LOAD GAME
                </button>

                <button data-action="menu">
                    MAIN MENU
                </button>

            </div>

        `;

        panel.classList.remove(
            "eb-hidden"
        );

    }

    // ============================================================
    // PANEL SLUITEN
    // ============================================================

    function hidePanel() {

        const panel =
            document.getElementById(
                "eb-panel"
            );

        panel.classList.add(
            "eb-hidden"
        );

        panel.innerHTML = "";

    }

    // ============================================================
    // NOTIFICATION
    // ============================================================

    function notify(
        message
    ) {

        const element =
            document.getElementById(
                "eb-notification"
            );

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.style.opacity =
            "1";

        notificationTimer =
            2.5;

    }

    function updateNotification(
        dt
    ) {

        if (
            notificationTimer <= 0
        ) {
            return;
        }

        notificationTimer -= dt;

        if (
            notificationTimer <= 0
        ) {

            const element =
                document.getElementById(
                    "eb-notification"
                );

            if (element) {

                element.style.opacity =
                    "0";

            }

        }

    }

    // ============================================================
    // ACHIEVEMENTS CHECK
    // ============================================================

    function updateAchievements() {

        if (
            player &&
            !achievements.explorer
        ) {

            const distance =
                Math.sqrt(
                    player.position.x *
                    player.position.x +
                    player.position.z *
                    player.position.z
                );

            if (
                distance > 120
            ) {

                achievements.explorer =
                    true;

                notify(
                    "Achievement unlocked: Explorer"
                );

            }

        }

        if (
            gameTime > 300 &&
            !achievements.survivor
        ) {

            achievements.survivor =
                true;

            notify(
                "Achievement unlocked: Survivor"
            );

        }

    }

    // ============================================================
    // MAIN UPDATE
    // ============================================================

    function update(dt) {

        if (
            gameState !== "playing"
        ) {
            updateNotification(dt);
            return;
        }

        gameTime += dt;

        updatePlayer(dt);

        updateTurretAim();

        updateCamera(dt);

        updateFire(dt);

        updateReload(dt);

        updateBullets(dt);

        updateEnemies(dt);

        updateParticles(dt);

        collectResources();

        updateAchievements();

        updateNotification(dt);

        energy +=
            4 * dt;

        energy =
            Math.min(
                PLAYER_MAX_ENERGY,
                energy
            );

        updateHUD();

    }

    // ============================================================
    // ANIMATION
    // ============================================================

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

    // ============================================================
    // RESIZE
    // ============================================================

    function resize() {

        if (
            !renderer ||
            !camera
        ) {
            return;
        }

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }

    // ============================================================
    // AUTO SAVE
    // ============================================================

    window.addEventListener(
        "beforeunload",
        function () {

            if (
                gameState === "playing" ||
                gameState === "paused"
            ) {

                saveGame();

            }

        }
    );

})();
