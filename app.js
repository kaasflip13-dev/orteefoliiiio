// ============================================================
// ECHOBOUND — THE LOST SIGNAL
// COMPLETE APP.JS
// 3D TANK SURVIVAL + FEESTELIJKE SHOP EVENT
// ============================================================

(async function () {
    "use strict";

    // ------------------------------------------------------------
    // THREE.JS
    // ------------------------------------------------------------
    const THREE = await import(
        "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
    );

    // ------------------------------------------------------------
    // BASIS
    // ------------------------------------------------------------
    const canvas = document.getElementById("game");

    if (!canvas) {
        console.error("Canvas #game niet gevonden.");
        return;
    }

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

    const SAVE_KEY = "echobound_save_v5";

    // ------------------------------------------------------------
    // GAME DATA
    // ------------------------------------------------------------
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

    let keys = {};

    let mouse = {
        x: 0,
        y: 0,
        down: false
    };

    let player;
    let turret;
    let muzzle;

    let camera;
    let renderer;
    let scene;
    let clock;

    const bullets = [];
    const enemies = [];
    const buildings = [];
    const resources = [];
    const particles = [];

    // ------------------------------------------------------------
    // ACHIEVEMENTS
    // ------------------------------------------------------------
    const achievements = {
        firstShot: false,
        firstKill: false,
        fiveKills: false,
        explorer: false,
        survivor: false
    };

    // ============================================================
    // STYLING
    // ============================================================

    const style = document.createElement("style");

    style.textContent = `
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            overflow: hidden;
            background:
                radial-gradient(
                    circle at center,
                    #102337 0%,
                    #05080d 55%,
                    #020305 100%
                );
            font-family:
                Arial,
                Helvetica,
                sans-serif;
            color: white;
        }

        #game {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            display: block;
        }

        .echo-ui {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 20;
        }

        .echo-button {
            pointer-events: auto;
            border: 1px solid rgba(100, 220, 255, .65);
            background:
                linear-gradient(
                    135deg,
                    rgba(15, 35, 52, .96),
                    rgba(5, 14, 24, .96)
                );
            color: white;
            padding: 14px 22px;
            border-radius: 12px;
            font-weight: 800;
            letter-spacing: 1.5px;
            cursor: pointer;
            box-shadow:
                0 0 15px rgba(0, 200, 255, .12),
                inset 0 0 15px rgba(0, 200, 255, .04);
            transition:
                transform .16s ease,
                box-shadow .16s ease,
                border-color .16s ease,
                background .16s ease;
        }

        .echo-button:hover {
            transform: translateY(-2px) scale(1.02);
            border-color: #6eeaff;
            box-shadow:
                0 0 25px rgba(0, 210, 255, .35),
                inset 0 0 20px rgba(0, 210, 255, .08);
            background:
                linear-gradient(
                    135deg,
                    rgba(20, 55, 78, .98),
                    rgba(6, 20, 32, .98)
                );
        }

        .echo-button:active {
            transform: scale(.97);
        }

        .main-menu {
            pointer-events: auto;
            position: absolute;
            inset: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background:
                radial-gradient(
                    circle at center,
                    rgba(15, 48, 70, .72),
                    rgba(2, 5, 10, .96) 72%
                );
        }

        .menu-box {
            width: min(560px, 92vw);
            padding: 42px;
            border-radius: 24px;
            text-align: center;
            background:
                linear-gradient(
                    145deg,
                    rgba(10, 25, 39, .97),
                    rgba(3, 10, 17, .98)
                );
            border: 1px solid rgba(100, 220, 255, .45);
            box-shadow:
                0 0 70px rgba(0, 200, 255, .12),
                inset 0 0 50px rgba(0, 150, 255, .035);
        }

        .logo {
            font-size: clamp(42px, 8vw, 76px);
            font-weight: 1000;
            letter-spacing: 7px;
            margin-bottom: 5px;
            background:
                linear-gradient(
                    90deg,
                    #ffffff,
                    #73eaff,
                    #ffffff
                );
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-shadow:
                0 0 30px rgba(80, 220, 255, .25);
        }

        .subtitle {
            color: #72dfff;
            letter-spacing: 5px;
            font-size: 12px;
            margin-bottom: 30px;
        }

        .menu-buttons {
            display: grid;
            gap: 12px;
        }

        .shop-main-button {
            border-color: rgba(255, 211, 74, .85);
            background:
                linear-gradient(
                    135deg,
                    rgba(94, 65, 10, .98),
                    rgba(30, 22, 5, .98)
                );
            box-shadow:
                0 0 25px rgba(255, 210, 60, .15),
                inset 0 0 20px rgba(255, 210, 60, .05);
        }

        .shop-main-button:hover {
            border-color: #ffe889;
            box-shadow:
                0 0 35px rgba(255, 210, 60, .4);
        }

        /* ======================================================
           HUD
           ====================================================== */

        .hud {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }

        .hud-panel {
            position: absolute;
            left: 18px;
            top: 18px;
            min-width: 230px;
            padding: 15px;
            border-radius: 15px;
            background: rgba(3, 10, 16, .78);
            border: 1px solid rgba(100, 220, 255, .3);
            backdrop-filter: blur(8px);
        }

        .hud-title {
            font-size: 12px;
            letter-spacing: 3px;
            color: #75eaff;
            margin-bottom: 10px;
        }

        .bar {
            height: 8px;
            border-radius: 10px;
            overflow: hidden;
            background: rgba(255,255,255,.09);
            margin: 5px 0 9px;
        }

        .bar-fill {
            height: 100%;
            width: 100%;
            transition: width .15s linear;
        }

        #healthFill {
            background:
                linear-gradient(
                    90deg,
                    #ff4f62,
                    #ffb14e
                );
        }

        #energyFill {
            background:
                linear-gradient(
                    90deg,
                    #45d8ff,
                    #7a7cff
                );
        }

        .hud-info {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            font-size: 13px;
            margin-top: 7px;
        }

        .hud-actions {
            position: absolute;
            right: 18px;
            top: 18px;
            display: flex;
            gap: 8px;
            pointer-events: auto;
        }

        .hud-small {
            padding: 10px 13px;
            font-size: 11px;
        }

        /* ======================================================
           ALGEMENE PANELEN
           ====================================================== */

        .panel-layer {
            position: absolute;
            inset: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, .68);
            pointer-events: auto;
            backdrop-filter: blur(7px);
            padding: 20px;
        }

        .panel {
            width: min(850px, 92vw);
            max-height: 88vh;
            overflow-y: auto;
            overflow-x: hidden;
            border-radius: 24px;
            padding: 30px;
            background:
                linear-gradient(
                    145deg,
                    rgba(10, 25, 39, .98),
                    rgba(3, 8, 14, .99)
                );
            border: 1px solid rgba(100, 220, 255, .4);
            box-shadow:
                0 0 70px rgba(0, 190, 255, .16);
        }

        .panel h1 {
            margin: 0 0 8px;
            font-size: 32px;
            letter-spacing: 3px;
        }

        .panel-subtitle {
            color: #78dff7;
            margin-bottom: 24px;
        }

        /* ======================================================
           SHOP
           ====================================================== */

        .shop-panel {
            position: relative;
            width: min(1050px, 95vw);
            max-height: 92vh;

            /* BELANGRIJKE FIX:
               shop mag nu verticaal scrollen */
            overflow-y: auto;
            overflow-x: hidden;

            padding: 32px;

            background:
                radial-gradient(
                    circle at 50% -15%,
                    rgba(255, 229, 107, .28),
                    transparent 30%
                ),
                radial-gradient(
                    circle at 0% 100%,
                    rgba(74, 220, 255, .12),
                    transparent 30%
                ),
                radial-gradient(
                    circle at 100% 100%,
                    rgba(255, 82, 173, .10),
                    transparent 30%
                ),
                linear-gradient(
                    145deg,
                    rgba(20, 25, 35, .99),
                    rgba(4, 8, 14, .995)
                );

            border: 1px solid rgba(255, 220, 92, .72);

            box-shadow:
                0 0 30px rgba(255, 211, 55, .12),
                0 0 100px rgba(255, 185, 45, .18),
                inset 0 0 70px rgba(255, 195, 45, .035);
        }

        .shop-panel::-webkit-scrollbar {
            width: 10px;
        }

        .shop-panel::-webkit-scrollbar-track {
            background: rgba(255,255,255,.04);
            border-radius: 10px;
        }

        .shop-panel::-webkit-scrollbar-thumb {
            background:
                linear-gradient(
                    #ffe36b,
                    #72eaff
                );
            border-radius: 10px;
            border: 2px solid rgba(0,0,0,.2);
        }

        .shop-panel {
            scrollbar-width: thin;
            scrollbar-color:
                #ffe36b
                rgba(255,255,255,.04);
        }

        .shop-panel::before {
            content: "";
            position: absolute;
            left: -20%;
            top: -70%;
            width: 140%;
            height: 160%;
            pointer-events: none;
            background:
                conic-gradient(
                    from 0deg,
                    transparent 0deg,
                    rgba(255, 228, 92, .045) 8deg,
                    transparent 16deg,
                    rgba(99, 222, 255, .035) 25deg,
                    transparent 35deg,
                    rgba(255, 90, 174, .03) 45deg,
                    transparent 60deg
                );
            animation:
                shopRays 14s linear infinite;
        }

        .shop-header {
            position: relative;
            z-index: 3;
            text-align: center;
            padding: 0 0 12px;
        }

        .shop-event-badge {
            display: inline-block;
            padding: 7px 16px;
            margin-bottom: 8px;
            border-radius: 999px;
            color: #fff4ad;
            font-size: 10px;
            font-weight: 1000;
            letter-spacing: 3px;
            border: 1px solid rgba(255, 220, 89, .5);
            background:
                linear-gradient(
                    90deg,
                    rgba(255, 190, 40, .08),
                    rgba(255, 255, 255, .08),
                    rgba(255, 190, 40, .08)
                );
            box-shadow:
                0 0 20px rgba(255, 210, 70, .12);
            animation:
                badgePulse 2.2s ease-in-out infinite;
        }

        .shop-sparkles {
            font-size: 24px;
            letter-spacing: 15px;
            color: #ffe87a;
            text-shadow:
                0 0 8px rgba(255, 235, 120, .8),
                0 0 25px rgba(255, 205, 60, .5);
            animation:
                sparkle 1.8s infinite ease-in-out;
        }

        .shop-title {
            margin: 3px 0 0 !important;
            font-size: clamp(40px, 7vw, 70px) !important;
            font-weight: 1000;
            letter-spacing: 8px !important;
            background:
                linear-gradient(
                    90deg,
                    #ffffff,
                    #ffe06b,
                    #fff4a5,
                    #ffffff,
                    #79eaff,
                    #ffe06b
                );
            background-size: 300% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation:
                goldFlow 3s linear infinite;
            filter:
                drop-shadow(
                    0 0 12px
                    rgba(255, 214, 76, .18)
                );
        }

        .shop-unlocked {
            color: #ffe27a;
            font-weight: 900;
            letter-spacing: 4px;
            font-size: 12px;
            margin-top: 2px;
        }

        .shop-event-text {
            position: relative;
            z-index: 3;
            text-align: center;
            margin: 8px auto 17px;
            color: #9befff;
            font-size: 11px;
            letter-spacing: 2px;
            font-weight: 800;
        }

        .credits-card {
            position: relative;
            z-index: 4;
            margin: 8px auto 22px;
            width: min(390px, 90%);
            padding: 15px 22px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 13px;
            background:
                linear-gradient(
                    135deg,
                    rgba(93, 67, 10, .9),
                    rgba(25, 22, 10, .94)
                );
            border: 1px solid rgba(255, 220, 92, .65);
            box-shadow:
                0 0 25px rgba(255, 205, 60, .1),
                inset 0 0 20px rgba(255, 218, 75, .06);
            animation:
                creditGlow 2.5s ease-in-out infinite;
        }

        .coin {
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-weight: 1000;
            font-size: 17px;
            color: #5d4300;
            background:
                radial-gradient(
                    circle at 32% 27%,
                    #fffbd0,
                    #fff09a 20%,
                    #ffd33d 48%,
                    #bd8513 100%
                );
            border: 2px solid rgba(255, 244, 158, .7);
            box-shadow:
                0 0 10px rgba(255, 230, 92, .65),
                0 0 25px rgba(255, 211, 60, .3);
            animation:
                coinFloat 2s ease-in-out infinite;
        }

        .credits-number {
            font-size: 27px;
            font-weight: 1000;
            color: #ffe681;
            text-shadow:
                0 0 12px rgba(255, 218, 83, .35);
        }

        .credits-label {
            color: #c9c9c9;
            font-size: 10px;
            letter-spacing: 2px;
            margin-top: 2px;
        }

        .shop-grid {
            position: relative;
            z-index: 4;
            display: grid;
            grid-template-columns:
                repeat(3, 1fr);
            gap: 16px;
        }

        .shop-card {
            position: relative;
            overflow: hidden;
            padding: 23px 18px 18px;
            min-height: 275px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            border-radius: 20px;
            background:
                linear-gradient(
                    150deg,
                    rgba(18, 31, 43, .98),
                    rgba(6, 13, 20, .99)
                );
            border: 1px solid rgba(110, 220, 255, .24);
            box-shadow:
                0 8px 30px rgba(0, 0, 0, .22);
            transition:
                transform .2s ease,
                border-color .2s ease,
                box-shadow .2s ease;
        }

        .shop-card::before {
            content: "";
            position: absolute;
            width: 160px;
            height: 160px;
            border-radius: 50%;
            left: 50%;
            top: -105px;
            transform: translateX(-50%);
            background:
                radial-gradient(
                    circle,
                    rgba(90, 220, 255, .14),
                    transparent 70%
                );
            filter: blur(5px);
        }

        .shop-card::after {
            content: "";
            position: absolute;
            left: -80%;
            top: 0;
            width: 55%;
            height: 100%;
            transform: skewX(-20deg);
            background:
                linear-gradient(
                    90deg,
                    transparent,
                    rgba(255,255,255,.08),
                    transparent
                );
            transition:
                left .7s ease;
        }

        .shop-card:hover {
            transform:
                translateY(-7px)
                scale(1.015);
            border-color:
                rgba(255, 220, 100, .62);
            box-shadow:
                0 18px 40px
                rgba(0, 170, 255, .12),
                0 0 28px
                rgba(255, 207, 65, .08);
        }

        .shop-card:hover::after {
            left: 140%;
        }

        .shop-card:nth-child(1):hover {
            border-color:
                rgba(113, 218, 255, .75);
        }

        .shop-card:nth-child(2):hover {
            border-color:
                rgba(255, 105, 130, .75);
        }

        .shop-card:nth-child(3):hover {
            border-color:
                rgba(187, 129, 255, .75);
        }

        .shop-icon {
            position: relative;
            z-index: 2;
            width: 78px;
            height: 78px;
            display: grid;
            place-items: center;
            border-radius: 22px;
            font-size: 37px;
            margin-bottom: 13px;
            background:
                linear-gradient(
                    145deg,
                    rgba(65, 120, 145, .28),
                    rgba(10, 25, 35, .8)
                );
            border:
                1px solid
                rgba(110, 225, 255, .35);
            box-shadow:
                0 0 25px
                rgba(80, 220, 255, .08),
                inset 0 0 20px
                rgba(100, 220, 255, .05);
            transition:
                transform .2s ease,
                box-shadow .2s ease;
        }

        .shop-card:nth-child(2) .shop-icon {
            border-color:
                rgba(255, 110, 135, .38);
        }

        .shop-card:nth-child(3) .shop-icon {
            border-color:
                rgba(190, 130, 255, .4);
        }

        .shop-card:hover .shop-icon {
            transform:
                translateY(-3px)
                scale(1.08);
            box-shadow:
                0 0 30px
                rgba(90, 220, 255, .18);
        }

        .shop-card h2 {
            position: relative;
            z-index: 2;
            margin: 0 0 7px;
            font-size: 19px;
            letter-spacing: 1px;
        }

        .shop-card p {
            position: relative;
            z-index: 2;
            margin: 0 0 15px;
            color: #aebac3;
            font-size: 12px;
            line-height: 1.5;
            flex: 1;
        }

        .shop-price {
            position: relative;
            z-index: 2;
            color: #ffe27a;
            font-weight: 1000;
            margin-bottom: 10px;
            font-size: 13px;
            letter-spacing: 1px;
        }

        .buy-button {
            position: relative;
            z-index: 3;
            width: 100%;
            border-color:
                rgba(255, 216, 90, .55);
            color: #fff6c8;
        }

        .buy-button:hover {
            border-color: #ffe778;
            box-shadow:
                0 0 24px
                rgba(255, 214, 70, .2);
        }

        .shop-message {
            position: relative;
            z-index: 4;
            text-align: center;
            min-height: 25px;
            margin-top: 17px;
            color: #83eaff;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1px;
        }

        .shop-back {
            position: relative;
            z-index: 4;
            display: block;
            margin: 8px auto 0;
            min-width: 180px;
        }

        /* ======================================================
           CONFETTI
           ====================================================== */

        .shop-confetti {
            position: absolute;
            inset: 0;
            z-index: 2;
            overflow: hidden;
            pointer-events: none;
        }

        .shop-confetti-piece {
            position: absolute;
            top: -20px;
            width: 6px;
            height: 13px;
            border-radius: 2px;
            opacity: .75;
            animation:
                confettiFall var(--fall-time)
                linear infinite,
                confettiSpin var(--spin-time)
                linear infinite;
            animation-delay:
                var(--delay);
        }

        .shop-confetti-piece:nth-child(3n) {
            width: 5px;
            height: 9px;
        }

        .shop-confetti-piece:nth-child(4n) {
            border-radius: 50%;
        }

        .shop-top-line {
            position: relative;
            z-index: 4;
            height: 2px;
            width: 100%;
            margin: 2px auto 14px;
            background:
                linear-gradient(
                    90deg,
                    transparent,
                    #ffe16b,
                    #7ceaff,
                    #ffe16b,
                    transparent
                );
            box-shadow:
                0 0 15px
                rgba(255, 220, 75, .45);
        }

        /* ======================================================
           NOTIFICATION
           ====================================================== */

        .notification {
            position: absolute;
            left: 50%;
            bottom: 40px;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: 12px;
            background:
                rgba(3, 10, 16, .92);
            border:
                1px solid
                rgba(100, 220, 255, .35);
            color: white;
            opacity: 0;
            transition:
                opacity .2s;
        }

        .notification.show {
            opacity: 1;
        }

        /* ======================================================
           ANIMATIES
           ====================================================== */

        @keyframes sparkle {
            0%, 100% {
                opacity: .5;
                transform: scale(.95);
            }

            50% {
                opacity: 1;
                transform: scale(1.08);
            }
        }

        @keyframes goldFlow {
            0% {
                background-position:
                    0% 50%;
            }

            100% {
                background-position:
                    300% 50%;
            }
        }

        @keyframes shopRays {
            from {
                transform:
                    rotate(0deg);
            }

            to {
                transform:
                    rotate(360deg);
            }
        }

        @keyframes badgePulse {
            0%, 100% {
                transform:
                    scale(1);
                box-shadow:
                    0 0 15px
                    rgba(255, 210, 70, .08);
            }

            50% {
                transform:
                    scale(1.025);
                box-shadow:
                    0 0 28px
                    rgba(255, 210, 70, .22);
            }
        }

        @keyframes creditGlow {
            0%, 100% {
                box-shadow:
                    0 0 20px
                    rgba(255, 205, 60, .08),
                    inset 0 0 20px
                    rgba(255, 218, 75, .04);
            }

            50% {
                box-shadow:
                    0 0 35px
                    rgba(255, 205, 60, .18),
                    inset 0 0 25px
                    rgba(255, 218, 75, .07);
            }
        }

        @keyframes coinFloat {
            0%, 100% {
                transform:
                    translateY(0)
                    rotate(-4deg);
            }

            50% {
                transform:
                    translateY(-4px)
                    rotate(4deg);
            }
        }

        @keyframes confettiFall {
            0% {
                top: -25px;
                opacity: 0;
            }

            10% {
                opacity: .8;
            }

            90% {
                opacity: .75;
            }

            100% {
                top: 110%;
                opacity: 0;
            }
        }

        @keyframes confettiSpin {
            0% {
                transform:
                    rotate(0deg)
                    translateX(0);
            }

            50% {
                transform:
                    rotate(180deg)
                    translateX(18px);
            }

            100% {
                transform:
                    rotate(360deg)
                    translateX(0);
            }
        }

        /* ======================================================
           MOBIEL
           ====================================================== */

        @media (max-width: 750px) {

            .shop-panel {
                padding: 22px 16px;
            }

            .shop-grid {
                grid-template-columns: 1fr;
            }

            .shop-card {
                min-height: 210px;
            }

            .menu-box {
                padding: 28px 20px;
            }

            .panel {
                padding: 22px;
            }

            .shop-title {
                letter-spacing: 5px !important;
            }

            .hud-panel {
                min-width: 190px;
                left: 10px;
                top: 10px;
            }

            .hud-actions {
                right: 10px;
                top: 10px;
            }
        }
    `;

    document.head.appendChild(style);

    // ============================================================
    // UI ROOT
    // ============================================================

    const ui =
        document.createElement("div");

    ui.className =
        "echo-ui";

    document.body.appendChild(ui);

    // ============================================================
    // MENU
    // ============================================================

    const mainMenu =
        document.createElement("div");

    mainMenu.className =
        "main-menu";

    mainMenu.innerHTML = `
        <div class="menu-box">

            <div class="logo">
                ECHOBOUND
            </div>

            <div class="subtitle">
                THE LOST SIGNAL
            </div>

            <div class="menu-buttons">

                <button
                    class="echo-button"
                    id="newRunBtn"
                >
                    NEW RUN
                </button>

                <button
                    class="echo-button shop-main-button"
                    id="shopBtn"
                >
                    🛒 SHOP
                </button>

                <button
                    class="echo-button"
                    id="loadBtn"
                >
                    LOAD GAME
                </button>

                <button
                    class="echo-button"
                    id="achievementsBtn"
                >
                    🏆 ACHIEVEMENTS
                </button>

                <button
                    class="echo-button"
                    id="controlsBtn"
                >
                    CONTROLS
                </button>

            </div>
        </div>
    `;

    ui.appendChild(mainMenu);

    // ============================================================
    // HUD
    // ============================================================

    const hud =
        document.createElement("div");

    hud.className =
        "hud";

    hud.style.display =
        "none";

    hud.innerHTML = `
        <div class="hud-panel">

            <div class="hud-title">
                ECHOBOUND // SYSTEM
            </div>

            <div>
                HULL
            </div>

            <div class="bar">
                <div
                    class="bar-fill"
                    id="healthFill"
                ></div>
            </div>

            <div>
                ENERGY
            </div>

            <div class="bar">
                <div
                    class="bar-fill"
                    id="energyFill"
                ></div>
            </div>

            <div class="hud-info">
                <span>
                    AMMO
                </span>

                <strong id="ammoText">
                    12 / 12
                </strong>
            </div>

            <div class="hud-info">
                <span>
                    KILLS
                </span>

                <strong id="killsText">
                    0
                </strong>
            </div>

            <div class="hud-info">
                <span>
                    CREDITS
                </span>

                <strong id="creditsText">
                    100
                </strong>
            </div>

        </div>

        <div class="hud-actions">

            <button
                class="echo-button hud-small"
                id="mapBtn"
            >
                MAP
            </button>

            <button
                class="echo-button hud-small"
                id="pauseBtn"
            >
                PAUSE
            </button>

        </div>
    `;

    ui.appendChild(hud);

    // ============================================================
    // NOTIFICATION
    // ============================================================

    const notification =
        document.createElement("div");

    notification.className =
        "notification";

    ui.appendChild(notification);

    let notificationTimer = null;

    function notify(message) {

        notification.textContent =
            message;

        notification.classList.add(
            "show"
        );

        clearTimeout(
            notificationTimer
        );

        notificationTimer =
            setTimeout(() => {

                notification.classList.remove(
                    "show"
                );

            }, 2200);
    }

    // ============================================================
    // PANEL
    // ============================================================

    function createPanel(
        html,
        className = ""
    ) {

        const layer =
            document.createElement("div");

        layer.className =
            "panel-layer";

        const panel =
            document.createElement("div");

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

                if (
                    layer &&
                    layer.parentNode
                ) {

                    layer.remove();
                }
            }

        };
    }

    // ============================================================
    // ALLE LOSSE PANELEN SLUITEN
    // ============================================================

    function closeAllPanels() {

        ui
            .querySelectorAll(
                ".panel-layer"
            )
            .forEach(panel => {

                panel.remove();

            });
    }

    // ============================================================
    // FEESTELIJKE SHOP
    // ============================================================

    function openShop() {

        /*
         * BELANGRIJKE FIX:
         *
         * We gebruiken hier NIET pauseGame().
         * pauseGame() maakt namelijk een extra
         * pause-paneel aan.
         */

        if (
            gameState === "playing"
        ) {

            gameState =
                "paused";
        }

        // --------------------------------------------------------
        // CONFETTI
        // --------------------------------------------------------

        let confettiHTML = "";

        const confettiSymbols = [
            "◆",
            "●",
            "■",
            "✦"
        ];

        const confettiColors = [
            "#ffe36b",
            "#71eaff",
            "#ff72b8",
            "#a77aff",
            "#ffffff"
        ];

        for (
            let i = 0;
            i < 42;
            i++
        ) {

            const left =
                Math.random() * 100;

            const delay =
                -(Math.random() * 8);

            const fallTime =
                5 +
                Math.random() * 6;

            const spinTime =
                1.5 +
                Math.random() * 3;

            const symbol =
                confettiSymbols[
                    i %
                    confettiSymbols.length
                ];

            const hue =
                confettiColors[
                    i %
                    confettiColors.length
                ];

            confettiHTML += `
                <span
                    class="shop-confetti-piece"
                    style="
                        left:${left}%;
                        color:${hue};
                        background:${hue};
                        --delay:${delay}s;
                        --fall-time:${fallTime}s;
                        --spin-time:${spinTime}s;
                    "
                >${symbol}</span>
            `;
        }

        // --------------------------------------------------------
        // SHOP PANEL
        // --------------------------------------------------------

        const shop =
            createPanel(`

                <div class="shop-confetti">
                    ${confettiHTML}
                </div>

                <div class="shop-header">

                    <div class="shop-event-badge">
                        ✦ ECHOBOUND CELEBRATION EVENT ✦
                    </div>

                    <div class="shop-sparkles">
                        ✦ ✧ ✦ ✧ ✦
                    </div>

                    <h1 class="shop-title">
                        SHOP
                    </h1>

                    <div class="shop-unlocked">
                        ★ SUPPLY DEPOT UNLOCKED ★
                    </div>

                </div>

                <div class="shop-event-text">
                    🎉 YOUR SIGNAL IS STRONG — CELEBRATE WITH A SUPPLY DROP 🎉
                </div>

                <div class="shop-top-line"></div>

                <div class="credits-card">

                    <div class="coin">
                        ¢
                    </div>

                    <div>

                        <div
                            class="credits-number"
                            id="shopCredits"
                        >
                            ${credits}
                        </div>

                        <div class="credits-label">
                            ECHO CREDITS
                        </div>

                    </div>

                </div>

                <div class="shop-grid">

                    <div class="shop-card">

                        <div class="shop-icon">
                            🔫
                        </div>

                        <h2>
                            AMMO PACK
                        </h2>

                        <p>
                            Vul je munitie volledig aan.
                            Klaar voor het volgende gevecht.
                        </p>

                        <div class="shop-price">
                            ◆ 10 CREDITS
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
                            ❤️
                        </div>

                        <h2>
                            TANK REPAIR
                        </h2>

                        <p>
                            Herstel je tank volledig.
                            Laat je machine weer schitteren.
                        </p>

                        <div class="shop-price">
                            ◆ 20 CREDITS
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
                            Vergroot je maximale
                            munitiecapaciteit met 4 kogels.
                        </p>

                        <div class="shop-price">
                            ◆ 50 CREDITS
                        </div>

                        <button
                            class="echo-button buy-button"
                            id="buyUpgrade"
                        >
                            BUY UPGRADE
                        </button>

                    </div>

                </div>

                <div
                    class="shop-message"
                    id="shopMessage"
                >
                    🎉 WELKOM BIJ DE ECHOBOUND CELEBRATION DEPOT 🎉
                </div>

                <button
                    class="echo-button shop-back"
                    id="shopBack"
                >
                    ← BACK
                </button>

            `, "shop-panel");

        // --------------------------------------------------------
        // SHOP ELEMENTEN
        // --------------------------------------------------------

        const creditsElement =
            shop.panel.querySelector(
                "#shopCredits"
            );

        const messageElement =
            shop.panel.querySelector(
                "#shopMessage"
            );

        function updateShopCredits() {

            creditsElement.textContent =
                credits;

            updateHUD();
        }

        function shopMessage(
            message
        ) {

            messageElement.textContent =
                message;
        }

        // --------------------------------------------------------
        // AMMO
        // --------------------------------------------------------

        shop.panel
            .querySelector("#buyAmmo")
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

                    credits -= 10;

                    ammo =
                        maxAmmo;

                    updateShopCredits();

                    shopMessage(
                        "🎉 🔫 AMMO RESTOCKED!"
                    );

                    notify(
                        "AMMO RESTOCKED"
                    );
                }
            );

        // --------------------------------------------------------
        // REPAIR
        // --------------------------------------------------------

        shop.panel
            .querySelector("#buyRepair")
            .addEventListener(
                "click",
                () => {

                    if (
                        credits < 20
                    ) {

                        shopMessage(
                            "⚠ NOT ENOUGH CREDITS"
                        );

                        return;
                    }

                    if (
                        playerHealth >=
                        PLAYER_MAX_HEALTH
                    ) {

                        shopMessage(
                            "✨ TANK IS ALREADY FULLY REPAIRED"
                        );

                        return;
                    }

                    credits -= 20;

                    playerHealth =
                        PLAYER_MAX_HEALTH;

                    updateShopCredits();

                    shopMessage(
                        "🎉 ❤️ TANK FULLY REPAIRED!"
                    );

                    notify(
                        "TANK REPAIRED"
                    );
                }
            );

        // --------------------------------------------------------
        // UPGRADE
        // --------------------------------------------------------

        shop.panel
            .querySelector("#buyUpgrade")
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

                    credits -= 50;

                    ammoUpgrade += 4;

                    maxAmmo += 4;

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

        // --------------------------------------------------------
        // BACK
        // --------------------------------------------------------

        shop.panel
            .querySelector("#shopBack")
            .addEventListener(
                "click",
                () => {

                    shop.close();

                    /*
                     * Vanuit de game:
                     * terug naar PAUSED.
                     */

                    if (
                        gameState === "paused"
                    ) {

                        /*
                         * Alleen een pause-menu tonen
                         * wanneer de HUD actief is.
                         */

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
                     * het hoofdmenu weer zichtbaar maken.
                     */

                    if (
                        gameState === "menu"
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
            createPanel(`

                <h1>
                    🏆 ACHIEVEMENTS
                </h1>

                <div class="panel-subtitle">
                    ${unlocked} /
                    ${Object.keys(achievements).length}
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

            `);

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
            createPanel(`

                <h1>
                    CONTROLS
                </h1>

                <div class="panel-subtitle">
                    ECHOBOUND FIELD MANUAL
                </div>

                <p>
                    <b>W / ↑</b> — Drive forward
                </p>

                <p>
                    <b>S / ↓</b> — Drive backward
                </p>

                <p>
                    <b>A / ←</b> — Turn left
                </p>

                <p>
                    <b>D / →</b> — Turn right
                </p>

                <p>
                    <b>MOUSE</b> — Aim cannon
                </p>

                <p>
                    <b>LEFT CLICK</b> — Fire
                </p>

                <p>
                    <b>R</b> — Reload
                </p>

                <p>
                    <b>ESC</b> — Pause
                </p>

                <br>

                <button
                    class="echo-button"
                    id="controlsBack"
                >
                    ← BACK
                </button>

            `);

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

    camera =
        new THREE.PerspectiveCamera(
            60,
            window.innerWidth /
                window.innerHeight,
            .1,
            600
        );

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
        .02;

    grid.material.opacity =
        .18;

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

        const lower =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    4.6,
                    1.1,
                    6
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x283b44,
                    metalness: .7,
                    roughness: .3
                })
            );

        lower.position.y =
            1;

        lower.castShadow =
            true;

        tank.add(
            lower
        );

        const body =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    3.8,
                    1.25,
                    4.5
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x38525b,
                    metalness: .75,
                    roughness: .27
                })
            );

        body.position.y =
            1.9;

        body.castShadow =
            true;

        tank.add(
            body
        );

        const trackMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x11191d,
                roughness: .75
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

        const turretBase =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    1.55,
                    1.7,
                    .55,
                    16
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x263f48,
                    metalness: .8,
                    roughness: .25
                })
            );

        turretBase.position.y =
            2.75;

        turretBase.castShadow =
            true;

        tank.add(
            turretBase
        );

        turret =
            new THREE.Group();

        turret.position.y =
            2.85;

        tank.add(
            turret
        );

        const turretBody =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    2.6,
                    .75,
                    2.5
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x45616a,
                    metalness: .8,
                    roughness: .25
                })
            );

        turretBody.castShadow =
            true;

        turret.add(
            turretBody
        );

        const cannon =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    .48,
                    .48,
                    5.5
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x182329,
                    metalness: .9,
                    roughness: .2
                })
            );

        cannon.position.set(
            0,
            .05,
            -3.35
        );

        cannon.castShadow =
            true;

        turret.add(
            cannon
        );

        muzzle =
            new THREE.Object3D();

        muzzle.position.set(
            0,
            .05,
            -6.1
        );

        turret.add(
            muzzle
        );

        const glow =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    .16,
                    12,
                    12
                ),
                new THREE.MeshBasicMaterial({
                    color: 0x64eaff
                })
            );

        glow.position.set(
            0,
            .05,
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
                    metalness: .35,
                    roughness: .7
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
                    .55,
                    .7,
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
                    .8,
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
            .8,
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
    // COLLISION
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
                    emissiveIntensity: .7
                })
            );

        body.position.y =
            1.6;

        body.castShadow =
            true;

        enemy.add(
            body
        );

        const eye =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    .32,
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
            (mouse.x /
                window.innerWidth) *
                2 -
            1;

        mouseNDC.y =
            -(mouse.y /
                window.innerHeight) *
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
                .multiplyScalar(.8)
        );

        const bulletMesh =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    .18,
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
                        .09,
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
                life: .6
            });
        }
    }

    // ============================================================
    // PLAYER MOVEMENT
    // ============================================================

    function updatePlayer(
        delta
    ) {

        let forward = 0;
        let turn = 0;

        if (
            keys["w"] ||
            keys["arrowup"]
        ) {

            forward += 1;
        }

        if (
            keys["s"] ||
            keys["arrowdown"]
        ) {

            forward -= 1;
        }

        if (
            keys["a"] ||
            keys["arrowleft"]
        ) {

            turn += 1;
        }

        if (
            keys["d"] ||
            keys["arrowright"]
        ) {

            turn -= 1;
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
                .add(offset);

        camera.position.lerp(
            desired,
            .12
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
            let i = enemies.length - 1;
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
                        .sub(enemyPos)
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
                    .multiplyScalar(
                        delta
                    );

            const newPosition =
                oldPosition
                    .clone()
                    .add(
                        movement
                    );

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

            for (
                let e = enemies.length - 1;
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
                .02;

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
    // PARTICLE UPDATE
    // ============================================================

    function updateParticles(
        delta
    ) {

        for (
            let i = particles.length - 1;
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
                8 * delta;

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
    // RESET GAME OBJECTS
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
         * BELANGRIJKE FIX:
         * eerst alle oude panelen sluiten.
         *
         * Hierdoor kan bijvoorbeeld het oude
         * SHOP- of PAUSE-menu niet boven de game
         * blijven staan.
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
            12 + ammoUpgrade;

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

        /*
         * Hoofdmenu gegarandeerd weg.
         */

        mainMenu.style.display =
            "none";

        /*
         * HUD gegarandeerd zichtbaar.
         */

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

        /*
         * Voorkomt dubbele pause-panelen.
         */

        closeAllPanels();

        const panel =
            createPanel(`

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

            `);

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
            createPanel(`

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

            `);

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
            createPanel(`

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

            `);

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

        panel.panel
            .querySelector(
                "#gameOverMenu"
            )
            .addEventListener(
                "click",
                () => {

                    panel.close();

                    gameState =
                        "menu";

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
    // LOAD
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
             * BELANGRIJKE FIX:
             * oude shop/pause/game-over panelen
             * eerst verwijderen.
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

            /*
             * Hoofdmenu weg.
             */

            mainMenu.style.display =
                "none";

            /*
             * HUD aan.
             */

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
    // BUTTONS
    // ============================================================

    document
        .getElementById(
            "newRunBtn"
        )
        .addEventListener(
            "click",
            startNewGame
        );

    document
        .getElementById(
            "shopBtn"
        )
        .addEventListener(
            "click",
            openShop
        );

    document
        .getElementById(
            "achievementsBtn"
        )
        .addEventListener(
            "click",
            openAchievements
        );

    document
        .getElementById(
            "controlsBtn"
        )
        .addEventListener(
            "click",
            openControls
        );

    document
        .getElementById(
            "loadBtn"
        )
        .addEventListener(
            "click",
            loadGame
        );

    document
        .getElementById(
            "pauseBtn"
        )
        .addEventListener(
            "click",
            pauseGame
        );

    document
        .getElementById(
            "mapBtn"
        )
        .addEventListener(
            "click",
            openMap
        );

    // ============================================================
    // KEYBOARD
    // ============================================================

    window.addEventListener(
        "keydown",
        event => {

            keys[
                event.key.toLowerCase()
            ] = true;

            if (
                event.key.toLowerCase() ===
                "r"
            ) {

                reload();
            }

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
    // MOUSE
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
    // MAIN GAME LOOP
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
                .05
            );

        if (
            gameState ===
            "playing"
        ) {

            totalPlayTime +=
                delta;

            if (
                fireTimer > 0
            ) {

                fireTimer -=
                    delta;
            }

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

            updatePlayer(
                delta
            );

            updateTurretAim();

            updateCamera();

            updateEnemies(
                delta
            );

            updateBullets(
                delta
            );

            updateResources();

            updateParticles(
                delta
            );

            updateAchievements();

            updateHUD();

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
    // START
    // ============================================================

    updateHUD();

    animate();

})();
