import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";


/* =====================================================
   ELEMENTS
===================================================== */

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

const healthBar =
    document.getElementById("healthBar");

const energyBar =
    document.getElementById("energyBar");

const ammoText =
    document.getElementById("ammo");

const killsText =
    document.getElementById("kills");

const creditsText =
    document.getElementById("credits");

const zoneText =
    document.getElementById("zone");

const objectiveText =
    document.getElementById("objective");


/* =====================================================
   RENDERER
===================================================== */

const renderer =
    new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance"
    });


renderer.setSize(
    window.innerWidth,
    window.innerHeight
);


renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);


renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;


/* =====================================================
   SCENE
===================================================== */

const scene =
    new THREE.Scene();


scene.background =
    new THREE.Color(
        0x071014
    );


scene.fog =
    new THREE.FogExp2(
        0x071116,
        0.0055
    );


/* =====================================================
   CAMERA
===================================================== */

const camera =
    new THREE.PerspectiveCamera(
        65,
        window.innerWidth /
        window.innerHeight,
        .1,
        500
    );


camera.position.set(
    0,
    4,
    9
);


/* =====================================================
   LIGHTING
===================================================== */

const ambient =
    new THREE.HemisphereLight(
        0x9cecff,
        0x10151a,
        2
    );


scene.add(
    ambient
);


const sun =
    new THREE.DirectionalLight(
        0xd9f7ff,
        3
    );


sun.position.set(
    -50,
    80,
    30
);


sun.castShadow = true;

sun.shadow.mapSize.width =
    2048;

sun.shadow.mapSize.height =
    2048;

sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;


scene.add(
    sun
);


/* =====================================================
   GROUND
===================================================== */

const ground =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            300,
            300
        ),
        new THREE.MeshStandardMaterial({
            color: 0x121b1d,
            roughness: 1,
            metalness: .05
        })
    );


ground.rotation.x =
    -Math.PI / 2;


ground.receiveShadow = true;


scene.add(
    ground
);


/* =====================================================
   GRID
===================================================== */

const grid =
    new THREE.GridHelper(
        300,
        60,
        0x1d5662,
        0x102b31
    );


grid.position.y =
    .025;


grid.material.transparent =
    true;

grid.material.opacity =
    .2;


scene.add(
    grid
);


/* =====================================================
   WORLD
===================================================== */

const obstacles = [];

const enemies = [];

const bullets = [];

const particles = [];


/* =====================================================
   PLAYER DATA
===================================================== */

const player = {

    position:
        new THREE.Vector3(
            0,
            0,
            18
        ),

    velocity:
        new THREE.Vector3(),

    yaw: 0,

    cameraYaw: 0,

    cameraPitch: .25,

    health: 100,

    energy: 100,

    ammo: 12,

    maxAmmo: 12,

    kills: 0,

    credits: 0,

    fireCooldown: 0,

    dashCooldown: 0,

    shooting: false,

    running: false

};


let gameRunning =
    false;

let paused =
    false;

let pointerLocked =
    false;


/* =====================================================
   INPUT
===================================================== */

const keys = {};


window.addEventListener(
    "keydown",
    event => {

        keys[event.code] =
            true;


        if (
            event.code === "Escape" &&
            gameRunning
        ) {

            togglePause();

        }


        if (
            event.code === "KeyR" &&
            gameRunning &&
            !paused
        ) {

            reload();

        }


        if (
            event.code === "KeyM" &&
            gameRunning &&
            !paused
        ) {

            openMap();

        }

    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[event.code] =
            false;

    }
);


/* =====================================================
   MOUSE
===================================================== */

canvas.addEventListener(
    "mousedown",
    event => {

        if (
            !gameRunning ||
            paused
        ) {
            return;
        }


        if (
            event.button === 0
        ) {

            player.shooting =
                true;


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

        if (
            event.button === 0
        ) {

            player.shooting =
                false;

        }

    }
);


document.addEventListener(
    "pointerlockchange",
    () => {

        pointerLocked =
            document.pointerLockElement ===
            canvas;

    }
);


document.addEventListener(
    "mousemove",
    event => {

        if (
            !pointerLocked ||
            !gameRunning ||
            paused
        ) {
            return;
        }


        player.cameraYaw -=
            event.movementX *
            .003;


        player.cameraPitch -=
            event.movementY *
            .002;


        player.cameraPitch =
            THREE.MathUtils.clamp(
                player.cameraPitch,
                -.15,
                1.05
            );

    }
);


/* =====================================================
   PLAYER MODEL
===================================================== */

const playerModel =
    new THREE.Group();


/* body */

const body =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            .38,
            1.05,
            8,
            16
        ),
        new THREE.MeshStandardMaterial({
            color: 0x27383e,
            metalness: .65,
            roughness: .3
        })
    );


body.position.y =
    1.05;


body.castShadow = true;


playerModel.add(
    body
);


/* armor */

const armor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            .72,
            .68,
            .48
        ),
        new THREE.MeshStandardMaterial({
            color: 0x17262b,
            metalness: .85,
            roughness: .25
        })
    );


armor.position.set(
    0,
    1.25,
    -.02
);


armor.castShadow = true;


playerModel.add(
    armor
);


/* helmet */

const helmet =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            .35,
            16,
            12
        ),
        new THREE.MeshStandardMaterial({
            color: 0x263a40,
            metalness: .8,
            roughness: .25
        })
    );


helmet.position.y =
    1.85;


helmet.scale.y =
    1.08;


helmet.castShadow = true;


playerModel.add(
    helmet
);


/* visor */

const visor =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            .42,
            .12,
            .04
        ),
        new THREE.MeshBasicMaterial({
            color: 0x55e8ff
        })
    );


visor.position.set(
    0,
    1.87,
    -.34
);


playerModel.add(
    visor
);


/* backpack */

const backpack =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            .48,
            .72,
            .25
        ),
        new THREE.MeshStandardMaterial({
            color: 0x111b20,
            metalness: .75,
            roughness: .3
        })
    );


backpack.position.set(
    0,
    1.18,
    .33
);


playerModel.add(
    backpack
);


/* left arm */

const leftArm =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            .13,
            .55,
            6,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x26383e,
            metalness: .65,
            roughness: .3
        })
    );


leftArm.position.set(
    -.48,
    1.18,
    0
);


leftArm.rotation.z =
    -.18;


playerModel.add(
    leftArm
);


/* right arm */

const rightArm =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            .13,
            .55,
            6,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x26383e,
            metalness: .65,
            roughness: .3
        })
    );


rightArm.position.set(
    .48,
    1.18,
    -.05
);


rightArm.rotation.z =
    .18;


playerModel.add(
    rightArm
);


/* legs */

const leftLeg =
    new THREE.Mesh(
        new THREE.CapsuleGeometry(
            .15,
            .65,
            6,
            8
        ),
        new THREE.MeshStandardMaterial({
            color: 0x18272c,
            metalness: .6,
            roughness: .4
        })
    );


leftLeg.position.set(
    -.2,
    .43,
    0
);


playerModel.add(
    leftLeg
);


const rightLeg =
    leftLeg.clone();


rightLeg.position.x =
    .2;


playerModel.add(
    rightLeg
);


/* weapon */

const weapon =
    new THREE.Group();


const weaponBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            .18,
            .16,
            .85
        ),
        new THREE.MeshStandardMaterial({
            color: 0x101b20,
            metalness: .9,
            roughness: .2
        })
    );


weaponBody.position.z =
    -.4;


weapon.add(
    weaponBody
);


const weaponGlow =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            .08,
            .07,
            .5
        ),
        new THREE.MeshBasicMaterial({
            color: 0x5ceaff
        })
    );


weaponGlow.position.set(
    0,
    .04,
    -.65
);


weapon.add(
    weaponGlow
);


weapon.position.set(
    .47,
    1.23,
    -.45
);


weapon.rotation.x =
    -.1;


playerModel.add(
    weapon
);


scene.add(
    playerModel
);


/* =====================================================
   ROCK
===================================================== */

function createRock(
    x,
    z,
    scale
) {

    const rock =
        new THREE.Mesh(
            new THREE.IcosahedronGeometry(
                1.3 * scale,
                1
            ),
            new THREE.MeshStandardMaterial({
                color: 0x39464a,
                roughness: .95
            })
        );


    rock.position.set(
        x,
        .8 * scale,
        z
    );


    rock.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );


    rock.castShadow = true;

    rock.receiveShadow = true;


    scene.add(
        rock
    );


    obstacles.push({
        object: rock,
        radius: 1.35 * scale
    });

}


/* =====================================================
   TREE
===================================================== */

function createTree(
    x,
    z,
    scale
) {

    const tree =
        new THREE.Group();


    const trunk =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                .25 * scale,
                .4 * scale,
                3 * scale,
                8
            ),
            new THREE.MeshStandardMaterial({
                color: 0x392c23,
                roughness: 1
            })
        );


    trunk.position.y =
        1.5 * scale;


    trunk.castShadow = true;


    tree.add(
        trunk
    );


    const crown =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                1.8 * scale,
                4.4 * scale,
                9
            ),
            new THREE.MeshStandardMaterial({
                color: 0x153d38,
                roughness: 1
            })
        );


    crown.position.y =
        4 * scale;


    crown.castShadow = true;


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


    obstacles.push({
        object: tree,
        radius: 1.5 * scale
    });

}


/* =====================================================
   BUILDING
===================================================== */

function createBuilding(
    x,
    z,
    width,
    height,
    depth
) {

    const building =
        new THREE.Group();


    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            new THREE.MeshStandardMaterial({
                color: 0x17272c,
                metalness: .55,
                roughness: .45
            })
        );


    body.position.y =
        height / 2;


    body.castShadow = true;

    body.receiveShadow = true;


    building.add(
        body
    );


    for (
        let y = 1.2;
        y < height;
        y += 1.4
    ) {

        const lightStrip =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width + .04,
                    .045,
                    .04
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x55e8ff
                })
            );


        lightStrip.position.set(
            0,
            y,
            depth / 2 + .03
        );


        building.add(
            lightStrip
        );

    }


    const light =
        new THREE.PointLight(
            0x55e8ff,
            3,
            20
        );


    light.position.y =
        height + 1;


    building.add(
        light
    );


    building.position.set(
        x,
        0,
        z
    );


    scene.add(
        building
    );


    obstacles.push({
        object: building,
        radius:
            Math.max(
                width,
                depth
            ) * .65
    });

}


/* =====================================================
   WORLD GENERATION
===================================================== */

function generateWorld() {

    for (
        let i = 0;
        i < 65;
        i++
    ) {

        const x =
            (Math.random() - .5) *
            230;


        const z =
            (Math.random() - .5) *
            230;


        if (
            Math.abs(x) < 18 &&
            Math.abs(z - 18) < 18
        ) {

            continue;

        }


        createRock(
            x,
            z,
            .5 +
            Math.random() * 1.1
        );

    }


    for (
        let i = 0;
        i < 38;
        i++
    ) {

        const x =
            (Math.random() - .5) *
            230;


        const z =
            (Math.random() - .5) *
            230;


        if (
            Math.abs(x) < 22 &&
            Math.abs(z - 18) < 22
        ) {

            continue;

        }


        createTree(
            x,
            z,
            .65 +
            Math.random() * .7
        );

    }


    createBuilding(
        -30,
        -15,
        16,
        8,
        12
    );


    createBuilding(
        30,
        -40,
        12,
        6,
        18
    );


    createBuilding(
        35,
        30,
        18,
        10,
        11
    );


    createBuilding(
        -40,
        40,
        14,
        5,
        15
    );

}


generateWorld();


/* =====================================================
   SIGNAL TOWER
===================================================== */

const tower =
    new THREE.Group();


const towerBody =
    new THREE.Mesh(
        new THREE.CylinderGeometry(
            .35,
            .65,
            12,
            10
        ),
        new THREE.MeshStandardMaterial({
            color: 0x293b40,
            metalness: .8,
            roughness: .3
        })
    );


towerBody.position.y =
    6;


tower.add(
    towerBody
);


const towerOrb =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            .7,
            20,
            20
        ),
        new THREE.MeshStandardMaterial({
            color: 0x55e8ff,
            emissive: 0x55e8ff,
            emissiveIntensity: 7
        })
    );


towerOrb.position.y =
    12;


tower.add(
    towerOrb
);


const towerLight =
    new THREE.PointLight(
        0x55e8ff,
        12,
        35
    );


towerLight.position.y =
    12;


tower.add(
    towerLight
);


tower.position.set(
    0,
    0,
    -80
);


scene.add(
    tower
);


/* =====================================================
   COLLISION
===================================================== */

function blocked(
    position,
    radius
) {

    for (
        const obstacle of obstacles
    ) {

        const dx =
            position.x -
            obstacle.object.position.x;


        const dz =
            position.z -
            obstacle.object.position.z;


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


/* =====================================================
   CAMERA
===================================================== */

function updateCamera(
    delta
) {

    const target =
        player.position.clone();


    target.y +=
        1.45;


    const cameraDistance =
        7;


    const horizontal =
        Math.cos(
            player.cameraPitch
        ) *
        cameraDistance;


    const cameraPosition =
        new THREE.Vector3();


    cameraPosition.x =
        target.x +
        Math.sin(
            player.cameraYaw
        ) *
        horizontal;


    cameraPosition.z =
        target.z +
        Math.cos(
            player.cameraYaw
        ) *
        horizontal;


    cameraPosition.y =
        target.y +
        Math.sin(
            player.cameraPitch
        ) *
        cameraDistance +
        1.0;


    const smooth =
        1 -
        Math.pow(
            .001,
            delta
        );


    camera.position.lerp(
        cameraPosition,
        smooth
    );


    camera.lookAt(
        target
    );

}


/* =====================================================
   PLAYER MOVEMENT
===================================================== */

function updatePlayer(
    delta
) {

    const input =
        new THREE.Vector2();


    if (
        keys.KeyW
    ) {

        input.y += 1;

    }


    if (
        keys.KeyS
    ) {

        input.y -= 1;

    }


    if (
        keys.KeyA
    ) {

        input.x -= 1;

    }


    if (
        keys.KeyD
    ) {

        input.x += 1;

    }


    if (
        input.lengthSq() > 0
    ) {

        input.normalize();


        const forward =
            new THREE.Vector3(
                -Math.sin(
                    player.cameraYaw
                ),
                0,
                -Math.cos(
                    player.cameraYaw
                )
            );


        const right =
            new THREE.Vector3(
                Math.cos(
                    player.cameraYaw
                ),
                0,
                -Math.sin(
                    player.cameraYaw
                )
            );


        const movement =
            new THREE.Vector3();


        movement.addScaledVector(
            forward,
            input.y
        );


        movement.addScaledVector(
            right,
            input.x
        );


        movement.normalize();


        const sprint =
            keys.ShiftLeft ||
            keys.ShiftRight;


        player.running =
            sprint &&
            player.energy > 0;


        const speed =
            player.running
                ? 12
                : 7;


        if (
            player.running
        ) {

            player.energy -=
                delta * 17;

        } else {

            player.energy +=
                delta * 9;

        }


        player.energy =
            THREE.MathUtils.clamp(
                player.energy,
                0,
                100
            );


        const next =
            player.position.clone();


        next.addScaledVector(
            movement,
            speed * delta
        );


        if (
            !blocked(
                next,
                .7
            )
        ) {

            player.position.copy(
                next
            );

        }


        /* character rotation */

        const wantedRotation =
            Math.atan2(
                movement.x,
                movement.z
            );


        let difference =
            wantedRotation -
            playerModel.rotation.y;


        difference =
            Math.atan2(
                Math.sin(difference),
                Math.cos(difference)
            );


        playerModel.rotation.y +=
            difference *
            Math.min(
                1,
                delta * 10
            );


        /* walking animation */

        const walk =
            Math.sin(
                performance.now() *
                (player.running ? .015 : .011)
            );


        leftLeg.rotation.x =
            walk * .45;


        rightLeg.rotation.x =
            -walk * .45;


        leftArm.rotation.x =
            -walk * .25;


        rightArm.rotation.x =
            walk * .25;

    } else {

        player.running =
            false;


        player.energy +=
            delta * 10;

    }


    /* DASH */

    if (
        keys.Space &&
        player.dashCooldown <= 0 &&
        player.energy >= 30
    ) {

        const direction =
            new THREE.Vector3(
                -Math.sin(
                    player.cameraYaw
                ),
                0,
                -Math.cos(
                    player.cameraYaw
                )
            );


        const next =
            player.position.clone();


        next.addScaledVector(
            direction,
            8
        );


        if (
            !blocked(
                next,
                .7
            )
        ) {

            player.position.copy(
                next
            );

        }


        player.energy -=
            30;


        player.dashCooldown =
            .9;


        keys.Space =
            false;

    }


    player.dashCooldown -=
        delta;


    player.position.y =
        0;


    playerModel.position.copy(
        player.position
    );

}


/* =====================================================
   ENEMIES
===================================================== */

function createEnemy(
    x,
    z,
    type
) {

    const enemy =
        new THREE.Group();


    let scale =
        1;

    let color =
        0x702d4d;


    if (
        type === "crawler"
    ) {

        scale =
            .7;

        color =
            0x8a6240;

    }


    if (
        type === "guardian"
    ) {

        scale =
            1.45;

        color =
            0x4f3c79;

    }


    const body =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                scale,
                16,
                12
            ),
            new THREE.MeshStandardMaterial({
                color,
                roughness: .55,
                metalness: .3
            })
        );


    body.scale.y =
        1.25;


    body.castShadow = true;


    enemy.add(
        body
    );


    const head =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                .6 * scale,
                14,
                10
            ),
            new THREE.MeshStandardMaterial({
                color: 0x1e292d,
                metalness: .5,
                roughness: .4
            })
        );


    head.position.y =
        .75 * scale;


    enemy.add(
        head
    );


    const eye =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                .13 * scale,
                10,
                10
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff4f91
            })
        );


    eye.position.set(
        0,
        .8 * scale,
        -.5 * scale
    );


    enemy.add(
        eye
    );


    const ring =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                .9 * scale,
                .04,
                8,
                32
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff4f91
            })
        );


    ring.rotation.x =
        Math.PI / 2;


    ring.position.y =
        .2 * scale;


    enemy.add(
        ring
    );


    enemy.position.set(
        x,
        scale,
        z
    );


    scene.add(
        enemy
    );


    enemies.push({

        object: enemy,

        type,

        health:
            type === "guardian"
                ? 120
                : type === "crawler"
                    ? 40
                    : 65,

        speed:
            type === "guardian"
                ? 1.1
                : type === "crawler"
                    ? 3.1
                    : 1.9,

        radius:
            .8 * scale,

        dead: false

    });

}


/* =====================================================
   SPAWN
===================================================== */

function spawnEnemies() {

    for (
        let i = 0;
        i < 20;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const distance =
            35 +
            Math.random() *
            80;


        const x =
            Math.sin(angle) *
            distance;


        const z =
            18 +
            Math.cos(angle) *
            distance;


        const random =
            Math.random();


        let type =
            "stalker";


        if (
            random > .88
        ) {

            type =
                "guardian";

        } else if (
            random > .58
        ) {

            type =
                "crawler";

        }


        createEnemy(
            x,
            z,
            type
        );

    }

}


/* =====================================================
   ENEMY AI
===================================================== */

function updateEnemies(
    delta
) {

    for (
        const enemy of enemies
    ) {

        if (
            enemy.dead
        ) {
            continue;
        }


        const direction =
            new THREE.Vector3()
                .subVectors(
                    player.position,
                    enemy.object.position
                );


        const distance =
            direction.length();


        if (
            distance < 110
        ) {

            direction.normalize();


            if (
                distance > 2.4
            ) {

                const next =
                    enemy.object.position.clone();


                next.addScaledVector(
                    direction,
                    enemy.speed * delta
                );


                if (
                    !blocked(
                        next,
                        enemy.radius
                    )
                ) {

                    enemy.object.position.copy(
                        next
                    );

                }


                enemy.object.lookAt(
                    player.position.x,
                    enemy.object.position.y,
                    player.position.z
                );

            } else {

                player.health -=
                    (
                        enemy.type === "guardian"
                            ? 13
                            : 7
                    ) *
                    delta;

            }

        }


        enemy.object.position.y =
            (
                enemy.type === "guardian"
                    ? 1.45
                    : enemy.type === "crawler"
                        ? .7
                        : 1
            ) +
            Math.sin(
                performance.now() *
                .003 +
                enemy.object.position.x
            ) *
            .04;

    }


    player.health =
        THREE.MathUtils.clamp(
            player.health,
            0,
            100
        );


    if (
        player.health <= 0
    ) {

        endRun();

    }

}


/* =====================================================
   SHOOTING
===================================================== */

function shoot() {

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
        .16;


    weapon.rotation.x =
        -.18;


    setTimeout(
        () => {

            weapon.rotation.x =
                -.1;

        },
        70
    );


    const direction =
        new THREE.Vector3(
            -Math.sin(
                playerModel.rotation.y
            ),
            0,
            -Math.cos(
                playerModel.rotation.y
            )
        );


    const start =
        playerModel.position.clone();


    start.y +=
        1.3;


    start.addScaledVector(
        direction,
        1.1
    );


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                .08,
                8,
                8
            ),
            new THREE.MeshBasicMaterial({
                color: 0x75edff
            })
        );


    bullet.position.copy(
        start
    );


    scene.add(
        bullet
    );


    bullets.push({

        object: bullet,

        velocity:
            direction
                .clone()
                .multiplyScalar(60),

        life: 2

    });


    createMuzzleParticles(
        start
    );


    updateHUD();

}


/* =====================================================
   MUZZLE PARTICLES
===================================================== */

function createMuzzleParticles(
    position
) {

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    .04,
                    5,
                    5
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x9cf7ff
                })
            );


        p.position.copy(
            position
        );


        scene.add(
            p
        );


        particles.push({

            object: p,

            velocity:
                new THREE.Vector3(
                    (Math.random()-.5) * 4,
                    Math.random() * 3,
                    (Math.random()-.5) * 4
                ),

            life: .25

        });

    }

}


/* =====================================================
   BULLETS
===================================================== */

function updateBullets(
    delta
) {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            bullets[i];


        bullet.object.position.addScaledVector(
            bullet.velocity,
            delta
        );


        bullet.life -=
            delta;


        let remove =
            bullet.life <= 0;


        for (
            const enemy of enemies
        ) {

            if (
                enemy.dead
            ) {
                continue;
            }


            const distance =
                bullet.object.position.distanceTo(
                    enemy.object.position
                );


            if (
                distance <
                enemy.radius + .4
            ) {

                enemy.health -=
                    34;


                createHitParticles(
                    bullet.object.position
                );


                remove =
                    true;


                if (
                    enemy.health <= 0
                ) {

                    killEnemy(
                        enemy
                    );

                }


                break;

            }

        }


        if (
            remove
        ) {

            scene.remove(
                bullet.object
            );


            bullets.splice(
                i,
                1
            );

        }

    }

}


/* =====================================================
   HIT PARTICLES
===================================================== */

function createHitParticles(
    position
) {

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const p =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    .035,
                    5,
                    5
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x58e9ff
                })
            );


        p.position.copy(
            position
        );


        scene.add(
            p
        );


        particles.push({

            object: p,

            velocity:
                new THREE.Vector3(
                    (Math.random()-.5) * 5,
                    Math.random() * 4,
                    (Math.random()-.5) * 5
                ),

            life: .35

        });

    }

}


/* =====================================================
   PARTICLES
===================================================== */

function updateParticles(
    delta
) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            particles[i];


        p.object.position.addScaledVector(
            p.velocity,
            delta
        );


        p.velocity.y -=
            6 * delta;


        p.life -=
            delta;


        if (
            p.life <= 0
        ) {

            scene.remove(
                p.object
            );


            particles.splice(
                i,
                1
            );

        }

    }

}


/* =====================================================
   KILL
===================================================== */

function killEnemy(
    enemy
) {

    if (
        enemy.dead
    ) {
        return;
    }


    enemy.dead =
        true;


    createHitParticles(
        enemy.object.position
    );


    scene.remove(
        enemy.object
    );


    player.kills++;


    player.credits +=
        enemy.type === "guardian"
            ? 120
            : enemy.type === "crawler"
                ? 35
                : 55;


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


    if (
        player.kills === 25
    ) {

        showAchievement(
            "SIGNAL BREAKER"
        );

    }


    updateHUD();

}


/* =====================================================
   RELOAD
===================================================== */

function reload() {

    player.ammo =
        player.maxAmmo;

    updateHUD();

}


/* =====================================================
   HUD
===================================================== */

function updateHUD() {

    healthBar.style.width =
        player.health + "%";


    energyBar.style.width =
        player.energy + "%";


    ammoText.textContent =
        player.ammo;


    killsText.textContent =
        "KILLS " +
        String(
            player.kills
        ).padStart(
            2,
            "0"
        );


    creditsText.textContent =
        "CREDITS " +
        String(
            player.credits
        ).padStart(
            3,
            "0"
        );


    if (
        player.position.z < -45
    ) {

        zoneText.textContent =
            "SIGNAL ZONE";

        objectiveText.textContent =
            "REACH THE SIGNAL";

    } else if (
        player.position.z < 10
    ) {

        zoneText.textContent =
            "DEAD ZONE";

        objectiveText.textContent =
            "SEARCH FOR THE SIGNAL";

    } else {

        zoneText.textContent =
            "OUTER SECTOR";

        objectiveText.textContent =
            "LOCATE THE SIGNAL";

    }

}


/* =====================================================
   NEW GAME
===================================================== */

function newGame() {

    player.position.set(
        0,
        0,
        18
    );


    player.health =
        100;

    player.energy =
        100;

    player.ammo =
        12;

    player.kills =
        0;

    player.credits =
        0;

    player.cameraYaw =
        0;

    player.cameraPitch =
        .25;


    enemies.forEach(
        enemy => {

            scene.remove(
                enemy.object
            );

        }
    );


    enemies.length =
        0;


    bullets.forEach(
        bullet => {

            scene.remove(
                bullet.object
            );

        }
    );


    bullets.length =
        0;


    spawnEnemies();


    menu.style.display =
        "none";


    hud.style.display =
        "block";


    pause.style.display =
        "none";


    gameRunning =
        true;


    paused =
        false;


    updateHUD();


    canvas.requestPointerLock();

}


/* =====================================================
   SAVE
===================================================== */

function saveGame() {

    const data = {

        x:
            player.position.x,

        z:
            player.position.z,

        health:
            player.health,

        energy:
            player.energy,

        ammo:
            player.ammo,

        kills:
            player.kills,

        credits:
            player.credits,

        cameraYaw:
            player.cameraYaw,

        cameraPitch:
            player.cameraPitch

    };


    localStorage.setItem(
        "echobound_third_person_save",
        JSON.stringify(data)
    );

}


/* =====================================================
   LOAD
===================================================== */

function loadGame() {

    const saved =
        localStorage.getItem(
            "echobound_third_person_save"
        );


    if (!saved) {

        alert(
            "Er is nog geen opgeslagen run."
        );

        return;

    }


    try {

        const data =
            JSON.parse(
                saved
            );


        player.position.set(
            data.x ?? 0,
            0,
            data.z ?? 18
        );


        player.health =
            data.health ?? 100;

        player.energy =
            data.energy ?? 100;

        player.ammo =
            data.ammo ?? 12;

        player.kills =
            data.kills ?? 0;

        player.credits =
            data.credits ?? 0;

        player.cameraYaw =
            data.cameraYaw ?? 0;

        player.cameraPitch =
            data.cameraPitch ?? .25;


        enemies.forEach(
            enemy => {

                scene.remove(
                    enemy.object
                );

            }
        );


        enemies.length =
            0;


        spawnEnemies();


        menu.style.display =
            "none";


        hud.style.display =
            "block";


        gameRunning =
            true;


        paused =
            false;


        updateHUD();


        canvas.requestPointerLock();

    } catch {

        alert(
            "De save kon niet worden geladen."
        );

    }

}


/* =====================================================
   PAUSE
===================================================== */

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


    if (
        paused
    ) {

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

            paused =
                false;

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

            gameRunning =
                false;

            paused =
                false;

            pause.style.display =
                "none";

            hud.style.display =
                "none";

            menu.style.display =
                "flex";

            document.exitPointerLock();

        }
    );


/* =====================================================
   MENU
===================================================== */

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
                "ECHOBOUND CONTROLS\n\n" +
                "W A S D  - Bewegen\n" +
                "Muis     - Camera draaien\n" +
                "Klik     - Schieten\n" +
                "R        - Herladen\n" +
                "SHIFT    - Sprint\n" +
                "SPACE    - Dash\n" +
                "M        - Map\n" +
                "ESC      - Pauze"
            );

        }
    );


document
    .getElementById("achievementsButton")
    .addEventListener(
        "click",
        () => {

            alert(
                "ACHIEVEMENTS\n\n" +
                "FIRST ECHO\n" +
                "Eerste vijand verslagen.\n\n" +
                "ECHO HUNTER\n" +
                "10 vijanden verslagen.\n\n" +
                "SIGNAL BREAKER\n" +
                "25 vijanden verslagen."
            );

        }
    );


/* =====================================================
   ACHIEVEMENT
===================================================== */

function showAchievement(
    name
) {

    document
        .getElementById(
            "achievementName"
        )
        .textContent =
        name;


    achievement.style.display =
        "flex";


    setTimeout(
        () => {

            achievement.style.display =
                "none";

        },
        3000
    );

}


/* =====================================================
   MAP
===================================================== */

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


    document.exitPointerLock();


    mapCanvas.width =
        900;

    mapCanvas.height =
        520;


    const ctx =
        mapCanvas.getContext(
            "2d"
        );


    ctx.fillStyle =
        "#031015";


    ctx.fillRect(
        0,
        0,
        900,
        520
    );


    ctx.strokeStyle =
        "rgba(88,233,255,.14)";


    for (
        let x = 0;
        x < 900;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            520
        );

        ctx.stroke();

    }


    for (
        let y = 0;
        y < 520;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            900,
            y
        );

        ctx.stroke();

    }


    const playerX =
        450 +
        player.position.x *
        2.3;


    const playerY =
        260 +
        player.position.z *
        2.3;


    ctx.fillStyle =
        "#58e9ff";


    ctx.beginPath();

    ctx.arc(
        playerX,
        playerY,
        7,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
        "#ff4f91";


    enemies.forEach(
        enemy => {

            if (
                enemy.dead
            ) {
                return;
            }


            const x =
                450 +
                enemy.object.position.x *
                2.3;


            const y =
                260 +
                enemy.object.position.z *
                2.3;


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
    );


    ctx.strokeStyle =
        "#58e9ff";

    ctx.lineWidth =
        3;


    ctx.beginPath();

    ctx.arc(
        450,
        260 - 80 * 2.3,
        14,
        0,
        Math.PI * 2
    );

    ctx.stroke();

}


document
    .getElementById("closeMap")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("map")
                .style.display =
                "none";


            if (
                gameRunning &&
                !paused
            ) {

                canvas.requestPointerLock();

            }

        }
    );


/* =====================================================
   GAME OVER
===================================================== */

function endRun() {

    gameRunning =
        false;


    document.exitPointerLock();


    saveGame();


    hud.style.display =
        "none";


    menu.style.display =
        "flex";


    alert(
        "RUN ENDED\n\n" +
        "KILLS: " +
        player.kills +
        "\nCREDITS: " +
        player.credits
    );

}


/* =====================================================
   ANIMATION
===================================================== */

const clock =
    new THREE.Clock();


function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        Math.min(
            clock.getDelta(),
            .05
        );


    towerOrb.rotation.y +=
        delta * 1.5;


    towerLight.intensity =
        9 +
        Math.sin(
            performance.now() *
            .004
        ) *
        3;


    if (
        gameRunning &&
        !paused
    ) {

        player.fireCooldown -=
            delta;


        updatePlayer(
            delta
        );


        updateEnemies(
            delta
        );


        updateBullets(
            delta
        );


        updateParticles(
            delta
        );


        if (
            player.shooting &&
            pointerLocked
        ) {

            shoot();

        }


        updateCamera(
            delta
        );


        updateHUD();

    } else {

        updateCamera(
            delta
        );

    }


    renderer.render(
        scene,
        camera
    );

}


animate();


/* =====================================================
   RESIZE
===================================================== */

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


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );

    }
);
