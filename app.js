import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";


/* =====================================================
   DOM
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
        canvas,
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
        0x050b0f
    );


scene.fog =
    new THREE.FogExp2(
        0x071116,
        0.006
    );


/* =====================================================
   CAMERA
===================================================== */

const camera =
    new THREE.PerspectiveCamera(
        75,
        window.innerWidth /
        window.innerHeight,
        0.05,
        500
    );


camera.position.set(
    0,
    1.65,
    18
);


/* =====================================================
   LIGHT
===================================================== */

const hemisphere =
    new THREE.HemisphereLight(
        0x9edfff,
        0x101519,
        1.8
    );

scene.add(
    hemisphere
);


const sun =
    new THREE.DirectionalLight(
        0xd8f5ff,
        2.5
    );


sun.position.set(
    -40,
    70,
    20
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
   MOON LIGHT
===================================================== */

const moon =
    new THREE.DirectionalLight(
        0x315bff,
        0.8
    );


moon.position.set(
    50,
    30,
    -70
);


scene.add(
    moon
);


/* =====================================================
   GROUND
===================================================== */

const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x111a1c,
        roughness: 0.96,
        metalness: 0.02
    });


const ground =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            300,
            300,
            80,
            80
        ),
        groundMaterial
    );


ground.rotation.x =
    -Math.PI / 2;


ground.receiveShadow = true;


scene.add(
    ground
);


/* =====================================================
   GROUND DETAILS
===================================================== */

const grid =
    new THREE.GridHelper(
        280,
        56,
        0x173e49,
        0x10282e
    );


grid.position.y =
    0.02;


grid.material.opacity =
    0.28;

grid.material.transparent =
    true;


scene.add(
    grid
);


/* =====================================================
   WORLD OBJECTS
===================================================== */

const obstacles = [];

const enemies = [];

const bullets = [];

const particles = [];

const pickups = [];


/* =====================================================
   PLAYER
===================================================== */

const player = {

    position:
        new THREE.Vector3(
            0,
            1.65,
            18
        ),

    velocity:
        new THREE.Vector3(),

    yaw: 0,

    pitch: 0,

    health: 100,

    energy: 100,

    ammo: 12,

    maxAmmo: 12,

    kills: 0,

    credits: 0,

    fireCooldown: 0,

    dashCooldown: 0,

    damageFlash: 0

};


let gameRunning = false;

let paused = false;

let mouseDown = false;

let pointerLocked = false;

const keys = {};


/* =====================================================
   INPUT
===================================================== */

window.addEventListener(
    "keydown",
    e => {

        keys[e.code] = true;


        if (
            e.code === "Escape" &&
            gameRunning
        ) {

            togglePause();

        }


        if (
            e.code === "KeyR" &&
            gameRunning &&
            !paused
        ) {

            reload();

        }


        if (
            e.code === "KeyM" &&
            gameRunning &&
            !paused
        ) {

            openMap();

        }

    }
);


window.addEventListener(
    "keyup",
    e => {

        keys[e.code] = false;

    }
);


canvas.addEventListener(
    "mousedown",
    e => {

        if (
            e.button !== 0 ||
            !gameRunning ||
            paused
        ) {
            return;
        }


        mouseDown = true;


        if (!pointerLocked) {

            canvas.requestPointerLock();

        }


        shoot();

    }
);


window.addEventListener(
    "mouseup",
    e => {

        if (
            e.button === 0
        ) {

            mouseDown = false;

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
    e => {

        if (
            !pointerLocked ||
            !gameRunning ||
            paused
        ) {
            return;
        }


        player.yaw -=
            e.movementX *
            0.0022;


        player.pitch -=
            e.movementY *
            0.0017;


        player.pitch =
            THREE.MathUtils.clamp(
                player.pitch,
                -1.35,
                1.35
            );

    }
);


/* =====================================================
   CREATE ROCK
===================================================== */

function createRock(
    x,
    z,
    scale = 1
) {

    const geometry =
        new THREE.IcosahedronGeometry(
            1.4 * scale,
            1
        );


    const material =
        new THREE.MeshStandardMaterial({
            color: 0x354246,
            roughness: 1
        });


    const rock =
        new THREE.Mesh(
            geometry,
            material
        );


    rock.position.set(
        x,
        .9 * scale,
        z
    );


    rock.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );


    rock.castShadow = true;


    scene.add(
        rock
    );


    obstacles.push({
        object: rock,
        radius: 1.4 * scale
    });

}


/* =====================================================
   CREATE TREE
===================================================== */

function createTree(
    x,
    z,
    scale = 1
) {

    const tree =
        new THREE.Group();


    const trunk =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                .25 * scale,
                .42 * scale,
                3 * scale,
                8
            ),
            new THREE.MeshStandardMaterial({
                color: 0x3b2d22,
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
                1.9 * scale,
                4.5 * scale,
                9
            ),
            new THREE.MeshStandardMaterial({
                color: 0x163c38,
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
   CREATE BUILDING
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
                color: 0x17272d,
                roughness: .55,
                metalness: .45
            })
        );


    body.position.y =
        height / 2;


    body.castShadow = true;

    body.receiveShadow = true;


    building.add(
        body
    );


    /* neon strips */

    for (
        let y = 1.2;
        y < height;
        y += 1.4
    ) {

        const strip =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width + .03,
                    .04,
                    .05
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x55e7ff
                })
            );


        strip.position.set(
            0,
            y,
            depth / 2 + .04
        );


        building.add(
            strip
        );

    }


    /* roof light */

    const roof =
        new THREE.PointLight(
            0x55e7ff,
            2.5,
            18
        );


    roof.position.set(
        0,
        height + 1,
        0
    );


    building.add(
        roof
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
   GENERATE WORLD
===================================================== */

function generateWorld() {

    for (
        let i = 0;
        i < 60;
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
            Math.random() * 1.2
        );

    }


    for (
        let i = 0;
        i < 35;
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
            .7 +
            Math.random() * .7
        );

    }


    createBuilding(
        -28,
        -18,
        16,
        8,
        12
    );


    createBuilding(
        30,
        -38,
        12,
        6,
        18
    );


    createBuilding(
        34,
        30,
        18,
        10,
        10
    );


    createBuilding(
        -38,
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
            color: 0x26383d,
            metalness: .8,
            roughness: .3
        })
    );


towerBody.position.y =
    6;


towerBody.castShadow = true;


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
            color: 0x55e7ff,
            emissive: 0x55e7ff,
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
        0x55e7ff,
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
   WEAPON VIEW
===================================================== */

const weapon =
    new THREE.Group();


const weaponBody =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            .32,
            .24,
            1.1
        ),
        new THREE.MeshStandardMaterial({
            color: 0x1a252a,
            metalness: .8,
            roughness: .25
        })
    );


weaponBody.position.set(
    .35,
    -.28,
    -.75
);


weapon.add(
    weaponBody
);


const weaponCore =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            .13,
            .13,
            .65
        ),
        new THREE.MeshBasicMaterial({
            color: 0x55e7ff
        })
    );


weaponCore.position.set(
    .35,
    -.22,
    -1.32
);


weapon.add(
    weaponCore
);


const weaponLight =
    new THREE.PointLight(
        0x55e7ff,
        1.5,
        4
    );


weaponLight.position.set(
    .35,
    -.2,
    -1.5
);


weapon.add(
    weaponLight
);


camera.add(
    weapon
);


scene.add(
    camera
);


/* =====================================================
   MUZZLE FLASH
===================================================== */

const muzzle =
    new THREE.Mesh(
        new THREE.SphereGeometry(
            .14,
            10,
            10
        ),
        new THREE.MeshBasicMaterial({
            color: 0x9cf5ff
        })
    );


muzzle.position.set(
    .35,
    -.22,
    -1.7
);


muzzle.visible = false;


camera.add(
    muzzle
);


/* =====================================================
   ENEMY
===================================================== */

function createEnemy(
    x,
    z,
    type
) {

    const group =
        new THREE.Group();


    let scale = 1;

    let bodyColor =
        0x702d4d;


    if (
        type === "crawler"
    ) {

        scale = .7;

        bodyColor =
            0x8a6240;

    }


    if (
        type === "guardian"
    ) {

        scale = 1.45;

        bodyColor =
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
                color: bodyColor,
                roughness: .55,
                metalness: .25
            })
        );


    body.scale.y =
        1.2;


    body.castShadow = true;


    group.add(
        body
    );


    /* head */

    const head =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                .65 * scale,
                14,
                10
            ),
            new THREE.MeshStandardMaterial({
                color: 0x20282c,
                roughness: .5,
                metalness: .4
            })
        );


    head.position.y =
        .7 * scale;


    head.castShadow = true;


    group.add(
        head
    );


    /* glowing eye */

    const eye =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                .13 * scale,
                10,
                10
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff4e8c
            })
        );


    eye.position.set(
        0,
        .78 * scale,
        -.55 * scale
    );


    group.add(
        eye
    );


    /* energy ring */

    const ring =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                .9 * scale,
                .035 * scale,
                8,
                32
            ),
            new THREE.MeshBasicMaterial({
                color: 0xff4e8c
            })
        );


    ring.rotation.x =
        Math.PI / 2;


    ring.position.y =
        .2 * scale;


    group.add(
        ring
    );


    group.position.set(
        x,
        scale,
        z
    );


    scene.add(
        group
    );


    const enemy = {

        object: group,

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
                    ? 3.2
                    : 2.0,

        radius:
            .9 * scale,

        attack:
            Math.random(),

        dead: false

    };


    enemies.push(
        enemy
    );

}


/* =====================================================
   ENEMY SPAWNING
===================================================== */

function spawnEnemies() {

    for (
        let i = 0;
        i < 18;
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
            Math.cos(angle) *
            distance;


        const z =
            18 +
            Math.sin(angle) *
            distance;


        const r =
            Math.random();


        let type =
            "stalker";


        if (
            r > .88
        ) {

            type =
                "guardian";

        } else if (
            r > .58
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
   PLAYER MOVEMENT
===================================================== */

function updatePlayer(
    delta
) {

    const input =
        new THREE.Vector2();


    if (
        keys.KeyW ||
        keys.ArrowUp
    ) {

        input.y -= 1;

    }


    if (
        keys.KeyS ||
        keys.ArrowDown
    ) {

        input.y += 1;

    }


    if (
        keys.KeyA ||
        keys.ArrowLeft
    ) {

        input.x -= 1;

    }


    if (
        keys.KeyD ||
        keys.ArrowRight
    ) {

        input.x += 1;

    }


    if (
        input.lengthSq() > 0
    ) {

        input.normalize();


        const forward =
            new THREE.Vector3(
                Math.sin(player.yaw),
                0,
                -Math.cos(player.yaw)
            );


        const right =
            new THREE.Vector3(
                Math.cos(player.yaw),
                0,
                Math.sin(player.yaw)
            );


        const movement =
            new THREE.Vector3();


        movement.addScaledVector(
            forward,
            -input.y
        );


        movement.addScaledVector(
            right,
            input.x
        );


        const sprint =
            keys.ShiftLeft ||
            keys.ShiftRight;


        const speed =
            sprint
                ? 12
                : 7;


        if (
            sprint &&
            player.energy > 0
        ) {

            player.energy -=
                delta * 14;

        } else {

            player.energy +=
                delta * 8;

        }


        const next =
            player.position.clone();


        next.addScaledVector(
            movement,
            speed * delta
        );


        if (
            !blocked(
                next,
                .65
            )
        ) {

            player.position.copy(
                next
            );

        }

    } else {

        player.energy +=
            delta * 9;

    }


    /* DASH */

    if (
        keys.Space &&
        player.dashCooldown <= 0 &&
        player.energy >= 30
    ) {

        const direction =
            new THREE.Vector3(
                Math.sin(player.yaw),
                0,
                -Math.cos(player.yaw)
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
                .65
            )
        ) {

            player.position.copy(
                next
            );

        }


        player.energy -= 30;

        player.dashCooldown =
            .9;

        keys.Space = false;

    }


    player.energy =
        THREE.MathUtils.clamp(
            player.energy,
            0,
            100
        );


    player.dashCooldown -=
        delta;


    camera.position.copy(
        player.position
    );


    camera.rotation.order =
        "YXZ";


    camera.rotation.y =
        player.yaw;


    camera.rotation.x =
        player.pitch;


    /* weapon sway */

    const moving =
        input.lengthSq() > 0;


    const sway =
        moving
            ? Math.sin(
                performance.now() * .009
            ) * .018
            : 0;


    weapon.position.x =
        sway;


    weapon.position.y =
        Math.abs(sway) *
        .5;

}


/* =====================================================
   SHOOT
===================================================== */

function shoot() {

    if (
        player.fireCooldown > 0 ||
        player.ammo <= 0
    ) {

        if (
            player.ammo <= 0
        ) {

            reload();

        }

        return;

    }


    player.ammo--;

    player.fireCooldown =
        .16;


    muzzle.visible =
        true;


    setTimeout(
        () => {
            muzzle.visible = false;
        },
        55
    );


    weapon.rotation.x =
        -.07;


    setTimeout(
        () => {

            weapon.rotation.x =
                0;

        },
        70
    );


    const direction =
        new THREE.Vector3();


    camera.getWorldDirection(
        direction
    );


    const start =
        camera.position.clone();


    start.addScaledVector(
        direction,
        1.6
    );


    const bullet =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                .07,
                8,
                8
            ),
            new THREE.MeshBasicMaterial({
                color: 0x7af1ff
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


    updateHUD();

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


        if (
            blocked(
                bullet.object.position,
                .08
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
                bullet.object.position.distanceTo(
                    enemy.object.position
                );


            if (
                distance <
                enemy.radius + .3
            ) {

                enemy.health -=
                    34;


                createHitParticles(
                    bullet.object.position
                );


                remove = true;


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


        if (remove) {

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
   PARTICLES
===================================================== */

function createHitParticles(
    position
) {

    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const particle =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    .035,
                    5,
                    5
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x55e7ff
                })
            );


        particle.position.copy(
            position
        );


        scene.add(
            particle
        );


        particles.push({

            object: particle,

            velocity:
                new THREE.Vector3(
                    (Math.random()-.5)*4,
                    Math.random()*3,
                    (Math.random()-.5)*4
                ),

            life: .35

        });

    }

}


/* =====================================================
   UPDATE PARTICLES
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
            distance < 120
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

            } else {

                player.health -=
                    (
                        enemy.type === "guardian"
                            ? 13
                            : 7
                    ) * delta;


                player.damageFlash =
                    .12;

            }


            enemy.object.lookAt(
                player.position.x,
                enemy.object.position.y,
                player.position.z
            );

        }


        /* floating animation */

        enemy.object.position.y +=
            Math.sin(
                performance.now() *
                .003 +
                enemy.object.position.x
            ) *
            .0015;

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


    enemy.dead = true;


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
        String(player.kills)
            .padStart(2, "0");


    creditsText.textContent =
        "CREDITS " +
        String(player.credits)
            .padStart(3, "0");


    if (
        player.position.z < -45
    ) {

        zoneText.textContent =
            "SIGNAL ZONE";

        objectiveText.textContent =
            "REACH THE SIGNAL";

    } else if (
        player.position.z < 15
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
        1.65,
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


    player.yaw =
        0;


    player.pitch =
        0;


    enemies.forEach(
        enemy =>
            scene.remove(
                enemy.object
            )
    );


    enemies.length =
        0;


    bullets.forEach(
        bullet =>
            scene.remove(
                bullet.object
            )
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

        y:
            player.position.y,

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

        yaw:
            player.yaw,

        pitch:
            player.pitch

    };


    localStorage.setItem(
        "echobound_save",
        JSON.stringify(data)
    );

}


/* =====================================================
   LOAD
===================================================== */

function loadGame() {

    const saved =
        localStorage.getItem(
            "echobound_save"
        );


    if (!saved) {

        alert(
            "Er is nog geen opgeslagen run."
        );

        return;

    }


    try {

        const data =
            JSON.parse(saved);


        player.position.set(
            data.x ?? 0,
            data.y ?? 1.65,
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


        player.yaw =
            data.yaw ?? 0;


        player.pitch =
            data.pitch ?? 0;


        enemies.forEach(
            enemy =>
                scene.remove(
                    enemy.object
                )
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
            "De save is beschadigd."
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
   MENU BUTTONS
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
                "Muis     - Rondkijken\n" +
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
                "✓ FIRST ECHO\n" +
                "Kill your first enemy.\n\n" +
                "✓ ECHO HUNTER\n" +
                "Kill 10 enemies.\n\n" +
                "✓ SIGNAL BREAKER\n" +
                "Kill 25 enemies."
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
        3200
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
        "rgba(87,232,255,.14)";


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


    /* player */

    const px =
        450 +
        player.position.x *
        2.3;


    const pz =
        260 +
        player.position.z *
        2.3;


    ctx.fillStyle =
        "#57e8ff";


    ctx.beginPath();

    ctx.arc(
        px,
        pz,
        7,
        0,
        Math.PI * 2
    );


    ctx.fill();


    /* enemies */

    ctx.fillStyle =
        "#ff4e8c";


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


    /* signal */

    ctx.strokeStyle =
        "#57e8ff";


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
                .getElementById(
                    "map"
                )
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


    /* tower animation */

    towerOrb.rotation.y +=
        delta * 1.5;


    towerLight.intensity =
        9 +
        Math.sin(
            performance.now() *
            .004
        ) *
        3;


    /* shooting */

    if (
        gameRunning &&
        !paused
    ) {

        player.fireCooldown -=
            delta;


        updatePlayer(
            delta
        );


        updateBullets(
            delta
        );


        updateEnemies(
            delta
        );


        updateParticles(
            delta
        );


        if (
            mouseDown &&
            pointerLocked
        ) {

            shoot();

        }


        if (
            player.damageFlash > 0
        ) {

            player.damageFlash -=
                delta;

        }


        updateHUD();

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
