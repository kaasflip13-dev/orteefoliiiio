// ============================================================
// ECHOBOUND
// EXTRA SIMPLE STABLE VERSION
// ============================================================


// ============================================================
// CHECK THREE.JS
// ============================================================

if (typeof THREE === "undefined") {

    document.body.innerHTML = `
        <div style="
            color:white;
            background:#080f12;
            height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:Arial;
            text-align:center;
            padding:30px;
        ">
            <div>
                <h1>Three.js kon niet laden</h1>
                <p>
                    Controleer je internetverbinding en vernieuw de pagina.
                </p>
            </div>
        </div>
    `;

    throw new Error(
        "Three.js kon niet worden geladen."
    );

}


// ============================================================
// HTML
// ============================================================

const canvas =
    document.getElementById("game");

const menu =
    document.getElementById("menu");

const hud =
    document.getElementById("hud");

const gameOver =
    document.getElementById("gameOver");

const startButton =
    document.getElementById("startButton");

const restartButton =
    document.getElementById("restartButton");

const healthBar =
    document.getElementById("healthBar");

const ammoText =
    document.getElementById("ammo");

const killsText =
    document.getElementById("kills");

const gameOverText =
    document.getElementById("gameOverText");


// ============================================================
// RENDERER
// ============================================================

const renderer =
    new THREE.WebGLRenderer({

        canvas: canvas,

        antialias: false

    });


renderer.setSize(
    window.innerWidth,
    window.innerHeight
);


renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        1.5
    )
);


// ============================================================
// SCENE
// ============================================================

const scene =
    new THREE.Scene();


scene.background =
    new THREE.Color(
        0x081116
    );


scene.fog =
    new THREE.Fog(
        0x081116,
        80,
        280
    );


// ============================================================
// CAMERA
// ============================================================

const camera =
    new THREE.PerspectiveCamera(

        60,

        window.innerWidth /
        window.innerHeight,

        0.1,

        500

    );


// ============================================================
// LIGHT
// ============================================================

const light =
    new THREE.HemisphereLight(

        0xbdefff,

        0x202020,

        2

    );


scene.add(
    light
);


const sun =
    new THREE.DirectionalLight(

        0xffffff,

        1.5

    );


sun.position.set(
    50,
    100,
    50
);


scene.add(
    sun
);


// ============================================================
// GAME VARIABLES
// ============================================================

let playing = false;

let health = 100;

let ammo = 20;

let kills = 0;


// ============================================================
// WORLD
// ============================================================

const buildings = [];

const enemies = [];

const bullets = [];


// ============================================================
// GROUND
// ============================================================

const ground =
    new THREE.Mesh(

        new THREE.PlaneGeometry(
            400,
            400
        ),

        new THREE.MeshStandardMaterial({
            color: 0x283638
        })

    );


ground.rotation.x =
    -Math.PI / 2;


scene.add(
    ground
);


// ============================================================
// BUILDINGS
// ============================================================

function addBuilding(
    x,
    z,
    width,
    depth,
    height
) {

    const mesh =
        new THREE.Mesh(

            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),

            new THREE.MeshStandardMaterial({
                color: 0x3d4b4e
            })

        );


    mesh.position.set(

        x,

        height / 2,

        z

    );


    scene.add(
        mesh
    );


    buildings.push({

        x: x,

        z: z,

        width: width,

        depth: depth

    });

}


addBuilding(
    -60,
    -60,
    35,
    35,
    15
);


addBuilding(
    60,
    -60,
    35,
    35,
    18
);


addBuilding(
    -60,
    60,
    35,
    35,
    16
);


addBuilding(
    60,
    60,
    35,
    35,
    20
);


// ============================================================
// TANK
// ============================================================

const tank =
    new THREE.Group();


scene.add(
    tank
);


// ============================================================
// TANK BODY
// ============================================================

const tankBody =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            5,
            2,
            7
        ),

        new THREE.MeshStandardMaterial({
            color: 0x53686c
        })

    );


tankBody.position.y =
    1.5;


tank.add(
    tankBody
);


// ============================================================
// TANK TOP
// ============================================================

const tankTop =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            4,
            1.2,
            4
        ),

        new THREE.MeshStandardMaterial({
            color: 0x34474b
        })

    );


tankTop.position.y =
    3;


tank.add(
    tankTop
);


// ============================================================
// TRACKS
// ============================================================

const trackMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x111719
    });


const leftTrack =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            1.3,
            1.8,
            7.5
        ),

        trackMaterial

    );


leftTrack.position.set(

    -3,

    1,

    0

);


tank.add(
    leftTrack
);


const rightTrack =
    leftTrack.clone();


rightTrack.position.x =
    3;


tank.add(
    rightTrack
);


// ============================================================
// TURRET
// ============================================================

const turret =
    new THREE.Group();


turret.position.y =
    3.8;


tank.add(
    turret
);


// ============================================================
// TURRET BODY
// ============================================================

const turretBody =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
            2,
            2.2,
            1.2,
            10
        ),

        new THREE.MeshStandardMaterial({
            color: 0x66777b
        })

    );


turret.add(
    turretBody
);


// ============================================================
// CANNON
// ============================================================

const cannon =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
            0.35,
            0.45,
            6,
            8
        ),

        new THREE.MeshStandardMaterial({
            color: 0x172124
        })

    );


cannon.rotation.x =
    Math.PI / 2;


cannon.position.z =
    -3.5;


turret.add(
    cannon
);


// ============================================================
// MUZZLE
// ============================================================

const muzzle =
    new THREE.Object3D();


muzzle.position.set(
    0,
    0,
    -6.5
);


turret.add(
    muzzle
);


// ============================================================
// TANK START
// ============================================================

tank.position.set(
    0,
    0,
    0
);


// ============================================================
// KEYBOARD
// ============================================================

const keys = {};


window.addEventListener(
    "keydown",
    function(event) {

        keys[
            event.key.toLowerCase()
        ] = true;

    }
);


window.addEventListener(
    "keyup",
    function(event) {

        keys[
            event.key.toLowerCase()
        ] = false;

    }
);


// ============================================================
// MOUSE
// ============================================================

const mouse =
    new THREE.Vector2();


window.addEventListener(
    "mousemove",
    function(event) {

        mouse.x =
            event.clientX /
            window.innerWidth *
            2 -
            1;


        mouse.y =
            -(

                event.clientY /
                window.innerHeight

            ) *
            2 +
            1;

    }
);


// ============================================================
// RAYCASTER
// ============================================================

const raycaster =
    new THREE.Raycaster();


const floorPlane =
    new THREE.Plane(

        new THREE.Vector3(
            0,
            1,
            0
        ),

        0

    );


// ============================================================
// MOUSE POSITION
// ============================================================

function mouseWorld() {

    raycaster.setFromCamera(
        mouse,
        camera
    );


    const position =
        new THREE.Vector3();


    raycaster.ray.intersectPlane(
        floorPlane,
        position
    );


    return position;

}


// ============================================================
// AIM
// ============================================================

function aimCannon() {

    if (!playing) {
        return;
    }


    const target =
        mouseWorld();


    const dx =
        target.x -
        tank.position.x;


    const dz =
        target.z -
        tank.position.z;


    const angle =
        Math.atan2(
            -dx,
            -dz
        );


    turret.rotation.y =
        angle -
        tank.rotation.y;

}


// ============================================================
// COLLISION
// ============================================================

function buildingCollision(
    position,
    radius
) {

    for (
        const building of buildings
    ) {

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
// TANK MOVEMENT
// ============================================================

function moveTank(
    delta
) {

    /*
        W = vooruit
        S = achteruit
        A = links draaien
        D = rechts draaien
    */


    if (
        keys["a"]
    ) {

        tank.rotation.y +=
            2.2 * delta;

    }


    if (
        keys["d"]
    ) {

        tank.rotation.y -=
            2.2 * delta;

    }


    let movement = 0;


    if (
        keys["w"]
    ) {

        movement = 1;

    }


    if (
        keys["s"]
    ) {

        movement = -1;

    }


    if (
        movement === 0
    ) {

        return;

    }


    const speed =
        movement === 1
            ? 20
            : 10;


    /*
        Tank voorkant = -Z
    */


    const direction =
        new THREE.Vector3(
            0,
            0,
            -1
        );


    direction.applyQuaternion(
        tank.quaternion
    );


    const next =
        tank.position.clone();


    next.add(

        direction.multiplyScalar(

            speed *
            movement *
            delta

        )

    );


    if (
        !buildingCollision(
            next,
            3.5
        )
    ) {

        tank.position.copy(
            next
        );

    }


    tank.position.x =
        THREE.MathUtils.clamp(
            tank.position.x,
            -190,
            190
        );


    tank.position.z =
        THREE.MathUtils.clamp(
            tank.position.z,
            -190,
            190
        );

}


// ============================================================
// SHOOT
// ============================================================

function shoot() {

    if (
        !playing
    ) {

        return;

    }


    if (
        ammo <= 0
    ) {

        return;

    }


    ammo--;


    updateHUD();


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


    const bullet =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                0.3,
                6,
                6
            ),

            new THREE.MeshBasicMaterial({
                color: 0x63eaff
            })

        );


    bullet.position.copy(
        start
    );


    scene.add(
        bullet
    );


    bullets.push({

        mesh: bullet,

        direction: direction,

        life: 2

    });

}


// ============================================================
// MOUSE SHOOT
// ============================================================

window.addEventListener(
    "mousedown",
    function(event) {

        if (
            event.button === 0
        ) {

            shoot();

        }

    }
);


// ============================================================
// ENEMY
// ============================================================

function createEnemy(
    x,
    z
) {

    const enemy =
        new THREE.Group();


    const body =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                2.5,
                8,
                6
            ),

            new THREE.MeshStandardMaterial({
                color: 0x703f91
            })

        );


    body.position.y =
        2.5;


    enemy.add(
        body
    );


    const eye =
        new THREE.Mesh(

            new THREE.SphereGeometry(
                0.45,
                6,
                6
            ),

            new THREE.MeshBasicMaterial({
                color: 0xff3344
            })

        );


    eye.position.set(
        0,
        2.7,
        -2.2
    );


    enemy.add(
        eye
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

        hp: 3,

        speed: 4

    });

}


// ============================================================
// CREATE ENEMIES
// ============================================================

function createEnemies() {

    createEnemy(
        40,
        40
    );


    createEnemy(
        -40,
        40
    );


    createEnemy(
        70,
        -40
    );

}


// ============================================================
// ENEMY MOVEMENT
// ============================================================

function updateEnemies(
    delta
) {

    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy =
            enemies[i];


        const direction =
            tank.position
                .clone()
                .sub(
                    enemy.mesh.position
                );


        direction.y = 0;


        const distance =
            direction.length();


        if (
            distance > 7
        ) {

            direction.normalize();


            const next =
                enemy.mesh.position
                    .clone();


            next.add(

                direction.multiplyScalar(

                    enemy.speed *
                    delta

                )

            );


            if (
                !buildingCollision(
                    next,
                    2.5
                )
            ) {

                enemy.mesh.position.copy(
                    next
                );

            }

        }
        else {

            health -=
                15 *
                delta;


            if (
                health <= 0
            ) {

                health = 0;

                endGame();

            }

        }

    }

}


// ============================================================
// BULLETS
// ============================================================

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


        bullet.mesh.position.add(

            bullet.direction
                .clone()
                .multiplyScalar(
                    70 * delta
                )

        );


        bullet.life -=
            delta;


        let remove =
            bullet.life <= 0;


        // BUILDING

        if (
            buildingCollision(
                bullet.mesh.position,
                0.2
            )
        ) {

            remove = true;

        }


        // ENEMY

        for (
            let j = enemies.length - 1;
            j >= 0;
            j--
        ) {

            const enemy =
                enemies[j];


            const distance =
                bullet.mesh.position
                    .distanceTo(
                        enemy.mesh.position
                    );


            if (
                distance < 3
            ) {

                enemy.hp--;

                remove = true;


                if (
                    enemy.hp <= 0
                ) {

                    scene.remove(
                        enemy.mesh
                    );


                    enemies.splice(
                        j,
                        1
                    );


                    kills++;


                    updateHUD();


                    spawnEnemy();

                }


                break;

            }

        }


        if (
            remove
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
// SPAWN ENEMY
// ============================================================

function spawnEnemy() {

    if (
        enemies.length >= 5
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


        const distance = 70;


        x =
            tank.position.x +
            Math.cos(angle) *
            distance;


        z =
            tank.position.z +
            Math.sin(angle) *
            distance;


    } while (

        buildingCollision(
            new THREE.Vector3(
                x,
                0,
                z
            ),
            3
        )

    );


    x =
        THREE.MathUtils.clamp(
            x,
            -180,
            180
        );


    z =
        THREE.MathUtils.clamp(
            z,
            -180,
            180
        );


    createEnemy(
        x,
        z
    );

}


// ============================================================
// CAMERA
// ============================================================

function updateCamera() {

    /*
        Camera zit altijd
        achter de tank.
    */


    const offset =
        new THREE.Vector3(
            0,
            11,
            19
        );


    offset.applyQuaternion(
        tank.quaternion
    );


    const wanted =
        tank.position
            .clone()
            .add(
                offset
            );


    camera.position.lerp(
        wanted,
        0.12
    );


    const look =
        tank.position.clone();


    look.y = 2;


    camera.lookAt(
        look
    );

}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    healthBar.style.width =
        Math.max(
            0,
            health
        ) + "%";


    ammoText.textContent =
        ammo;


    killsText.textContent =
        kills;

}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    health = 100;

    ammo = 20;

    kills = 0;


    tank.position.set(
        0,
        0,
        0
    );


    tank.rotation.set(
        0,
        0,
        0
    );


    // BULLETS WEG

    for (
        const bullet of bullets
    ) {

        scene.remove(
            bullet.mesh
        );

    }


    bullets.length = 0;


    // ENEMIES WEG

    for (
        const enemy of enemies
    ) {

        scene.remove(
            enemy.mesh
        );

    }


    enemies.length = 0;


    // NIEUWE VIJANDEN

    createEnemies();


    playing = true;


    menu.style.display =
        "none";


    gameOver.style.display =
        "none";


    hud.style.display =
        "block";


    updateHUD();

}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    if (
        !playing
    ) {

        return;

    }


    playing = false;


    hud.style.display =
        "none";


    gameOver.style.display =
        "flex";


    gameOverText.textContent =
        "Je hebt " +
        kills +
        " monsters vernietigd.";

}


// ============================================================
// BUTTONS
// ============================================================

startButton.onclick =
    function() {

        startGame();

    };


restartButton.onclick =
    function() {

        startGame();

    };


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
    "resize",
    function() {

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
                1.5
            )
        );

    }
);


// ============================================================
// GAME LOOP
// ============================================================

let lastTime =
    performance.now();


function loop(
    currentTime
) {

    requestAnimationFrame(
        loop
    );


    let delta =
        (
            currentTime -
            lastTime
        ) / 1000;


    lastTime =
        currentTime;


    if (
        delta > 0.05
    ) {

        delta = 0.05;

    }


    if (
        playing
    ) {

        moveTank(
            delta
        );


        aimCannon();


        updateEnemies(
            delta
        );


        updateBullets(
            delta
        );


        updateCamera();


        updateHUD();

    }
    else {

        updateCamera();

    }


    renderer.render(
        scene,
        camera
    );

}


// ============================================================
// START
// ============================================================

updateCamera();

updateHUD();

loop(
    performance.now()
);
