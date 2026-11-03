// roundRect fallback voor oudere browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    };
}
// ======================================================
// FACTORY WORLD - GRAFISCHE ENGINE (canvas)
// ======================================================
const FWGraphics = (() => {
    const T = 64, DPR = 2, EXTRUDE = 14;
    let cv, ctx, hover = null;
    const track = {}, parts = [];
    const COL = {
        miner:"#9a8433", crystal:"#8a4fd0", quarry:"#7d7568", copper:"#c8702e", coal:"#4a4f5c",
        smelter:"#c2481f", crusher:"#a8602f", press:"#c27a2a",
        assembler:"#2f78c4", circuit:"#1f9bb0", battery:"#3aa04f", workshop:"#5a64c8",
        warehouse:"#2f9a6a", sell:"#d4a21f", belt:"#2a313b"
    };
    const ICOL = { ore:"#ff9a3c", crystal:"#c58bff", stone:"#b8b2a4", copperOre:"#e8803a", coal:"#6b7280",
        metal:"#cfd8e3", gravel:"#e4e0d6", plate:"#58a6ff", gear:"#ffd34d", circuit:"#37e0c0", battery:"#6ee86e", tool:"#ff7ad1" };
    const RANGE = t => t === "sell" ? 3 : t === "warehouse" ? 2 : (typeof recipes !== "undefined" && recipes[t]) ? 3 : 0;

    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16);
        const c = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
        return `rgb(${c(16)},${c(8)},${c(0)})`; };
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

    function init() {
        const host = document.getElementById("world");
        host.innerHTML = "";
        cv = document.createElement("canvas");
        cv.width = W * T * DPR; cv.height = H * T * DPR;
        host.appendChild(cv);
        ctx = cv.getContext("2d");
        const pos = e => { const r = cv.getBoundingClientRect();
            return { x: Math.floor((e.clientX - r.left) / r.width * W), y: Math.floor((e.clientY - r.top) / r.height * H) }; };
                cv.style.touchAction = "none";
        cv.addEventListener("pointermove", e => hover = pos(e));
        cv.addEventListener("pointerleave", () => hover = null);
        cv.addEventListener("pointerdown", e => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            e.preventDefault();
            const p = pos(e);
            if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return;
            hover = p;
            updateStatus("Vakje " + (p.x + 1) + "," + (p.y + 1) + " aangeklikt");
            try { handleCellClick(p.x, p.y); } catch (err) { notify("Fout: " + err.message); console.error(err); }
            burst(p.x * T + T / 2, p.y * T + T / 2, "#ffffff", 5);
        });
        requestAnimationFrame(frame);
    }

    function burst(x, y, color, n = 8) {
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 0.6 + Math.random() * 1.6;
            parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.4, life: 1, c: color, r: 2 + Math.random() * 2, g: 0.02 }); }
    }
    function smoke(x, y) { parts.push({ x, y, vx: (Math.random() - .5) * .3, vy: -0.5 - Math.random() * .4, life: 1, c: "rgba(190,190,200,", r: 4 + Math.random() * 4, smoke: true, g: 0 }); }

    function ground() {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const h = hash(x, y), px = x * T, py = y * T;
            const g = ctx.createLinearGradient(px, py, px + T, py + T);
            const b = (x + y) % 2 ? 0.92 : 1;
            g.addColorStop(0, shade("#2c4a3e", b + h * .12)); g.addColorStop(1, shade("#1e3630", b + h * .12));
            ctx.fillStyle = g; ctx.fillRect(px, py, T, T);
            ctx.fillStyle = "rgba(255,255,255,.05)";
            for (let i = 0; i < 4; i++) ctx.fillRect(px + hash(x + i, y * 3) * (T - 3), py + hash(y + i, x * 5) * (T - 3), 2, 2);
        }
        ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let x = 0; x <= W; x++) { ctx.moveTo(x * T, 0); ctx.lineTo(x * T, H * T); }
        for (let y = 0; y <= H; y++) { ctx.moveTo(0, y * T); ctx.lineTo(W * T, y * T); }
        ctx.stroke();
    }

    function drawBelt(x, y, dir, t) {
        const px = x * T, py = y * T;
        ctx.save(); ctx.translate(px + T / 2, py + T / 2); ctx.rotate(dir * Math.PI / 2);
        rr(-T / 2 + 3, -T / 2 + 10, T - 6, T - 20, 6); ctx.fillStyle = "#1a2028"; ctx.fill();
        ctx.strokeStyle = "#556477"; ctx.lineWidth = 3; ctx.stroke();
        ctx.save(); rr(-T / 2 + 3, -T / 2 + 10, T - 6, T - 20, 6); ctx.clip();
        const off = (t / 25) % 16;
        ctx.strokeStyle = "rgba(255,210,90,.75)"; ctx.lineWidth = 3; ctx.lineCap = "round";
        for (let i = -T / 2 - 16; i < T / 2 + 16; i += 16) { const cx = i + off;
            ctx.beginPath(); ctx.moveTo(cx - 4, -9); ctx.lineTo(cx + 4, 0); ctx.lineTo(cx - 4, 9); ctx.stroke(); }
        ctx.restore(); ctx.restore();
    }

    function drawBlock(x, y, type, b, t, alpha = 1, upg = false) {
        const px = x * T, py = y * T, base = COL[type] || "#667", h = EXTRUDE;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(0,0,0,.4)"; rr(px + 8, py + 10, T - 8, T - 8, 10); ctx.fill();
        // voorkant
        ctx.fillStyle = shade(base, .55); rr(px + 4, py + T - 4 - h - 6, T - 8, h + 6, 8); ctx.fill();
        // bovenkant
        const top = ctx.createLinearGradient(px, py - h, px + T, py + T - h);
        top.addColorStop(0, shade(base, 1.35)); top.addColorStop(1, shade(base, .85));
        ctx.fillStyle = top; rr(px + 4, py + 4 - h + 4, T - 8, T - 12, 10); ctx.fill();
        ctx.strokeStyle = upg ? `rgba(255,215,90,${.6 + .4 * Math.sin(t / 200)})` : "rgba(255,255,255,.25)";
        ctx.lineWidth = upg ? 3 : 1.5; ctx.stroke();
        // icoon
        const bob = Math.sin(t / 380 + x * 2 + y) * 1.5;
        ctx.font = "28px 'Segoe UI Emoji','Apple Color Emoji',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        ctx.fillText(catalog[type].icon, px + T / 2, py + T / 2 - h + 2 + bob);
        ctx.shadowColor = "transparent";
        ctx.font = "800 7px Inter, Arial"; ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.fillText(catalog[type].name.toUpperCase(), px + T / 2, py + T - 10);
        if (b) { ctx.fillStyle = "#48d69b"; ctx.shadowColor = "#48d69b"; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(px + 12, py + 12 - h + 4, 3, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0; }
        if (upg) { ctx.font = "14px sans-serif"; ctx.fillText("⚡", px + T - 12, py + 12 - h + 4); }
        ctx.restore();
    }

    function range(x, y, r, color) {
        if (!r) return; const cx = x * T + T / 2, cy = y * T + T / 2, d = (r + .5) * T;
        ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy - d); ctx.lineTo(cx + d, cy); ctx.lineTo(cx, cy + d); ctx.lineTo(cx - d, cy); ctx.closePath();
        ctx.fillStyle = color + "22"; ctx.fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = color + "aa"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }

    function drawItem(it, k, t) {
        const [x, y] = k.split(",").map(Number); let tr = track[it.id];
        if (!tr) tr = track[it.id] = { fx: x, fy: y, tx: x, ty: y, t, born: t, seen: t };
        if (tr.tx !== x || tr.ty !== y) { tr.fx = tr.tx; tr.fy = tr.ty; tr.tx = x; tr.ty = y; tr.t = t; }
        tr.seen = t;
        let p = Math.min(1, (t - tr.t) / 600); p = p * p * (3 - 2 * p);
        const cx = (tr.fx + (tr.tx - tr.fx) * p) * T + T / 2, cy = (tr.fy + (tr.ty - tr.fy) * p) * T + T / 2;
        const pop = Math.min(1, (t - tr.born) / 250), s = 0.4 + .6 * (1 - Math.pow(1 - pop, 3)) , bob = Math.sin(t / 150 + it.id) * 1.5;
        if (t - tr.born < 40) burst(cx, cy, ICOL[it.type] || "#fff", 6);
        const col = ICOL[it.type] || "#fff", g = ctx.createRadialGradient(cx, cy + bob, 2, cx, cy + bob, 20 * s);
        g.addColorStop(0, col + "cc"); g.addColorStop(1, col + "00");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + bob, 20 * s, 0, 6.28); ctx.fill();
        ctx.fillStyle = "rgba(10,14,20,.8)"; ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy + bob, 13 * s, 0, 6.28); ctx.fill(); ctx.stroke();
        ctx.font = `${17 * s}px 'Segoe UI Emoji','Apple Color Emoji',sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(products[it.type].icon, cx, cy + bob + 1);
    }

    function frame(t) {
        try { draw(t); } catch (err) { console.error('Teken-fout:', err); }
        requestAnimationFrame(frame);
    }

    function draw(t) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W * T, H * T);
        ground();
        const bl = Object.entries(buildings).map(([k, b]) => { const [x, y] = k.split(",").map(Number); return { x, y, b }; });
        bl.filter(o => o.b.type === "belt").forEach(o => drawBelt(o.x, o.y, o.b.direction || 0, t));
        bl.filter(o => o.b.type !== "belt").sort((a, c) => a.y - c.y).forEach(o => {
            drawBlock(o.x, o.y, o.b.type, true, t, 1, o.b.upgraded);
            if ((recipes[o.b.type] || producers[o.b.type]) && Math.random() < (o.b.upgraded ? .12 : .06) && ["smelter", "coal", "crusher", "press"].includes(o.b.type)) smoke(o.x * T + T / 2 + 8, o.y * T + 6);
        });
        Object.entries(items).forEach(([k, it]) => { if (products[it.type]) drawItem(it, k, t); });
        for (const id in track) if (t - track[id].seen > 2000) delete track[id];
        // deeltjes
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i];
            p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= p.smoke ? .012 : .03;
            if (p.life <= 0) { parts.splice(i, 1); continue; }
            ctx.globalAlpha = p.life * (p.smoke ? .45 : 1);
            ctx.fillStyle = p.smoke ? p.c + "1)" : p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.smoke ? 2 - p.life : p.life), 0, 6.28); ctx.fill(); }
        ctx.globalAlpha = 1;
        // hover
        if (hover && hover.x >= 0 && hover.y >= 0 && hover.x < W && hover.y < H) {
            const hb = buildings[key(hover.x, hover.y)], tc = { build: "#f4b64e", erase: "#ff6b6b", upgrade: "#ffd34d", inspect: "#6ec1ff", rotate: "#48d69b" }[tool];
            if (tool === "build" && !hb && catalog[selectedBuild]) { range(hover.x, hover.y, RANGE(selectedBuild), "#f4b64e");
                drawBlock(hover.x, hover.y, selectedBuild, false, t, .55); }
            else if (hb) range(hover.x, hover.y, RANGE(hb.type), "#6ec1ff");
            ctx.strokeStyle = tc; ctx.lineWidth = 3; ctx.shadowColor = tc; ctx.shadowBlur = 14;
            rr(hover.x * T + 2, hover.y * T + 2, T - 4, T - 4, 8); ctx.stroke(); ctx.shadowBlur = 0;
        }
        // vignette
        const v = ctx.createRadialGradient(W * T / 2, H * T / 2, H * T * .45, W * T / 2, H * T / 2, W * T * .62);
        v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.45)");
        ctx.fillStyle = v; ctx.fillRect(0, 0, W * T, H * T);
    }
    return { init };
})();

// ======================================================
// FACTORY WORLD - COMPLETE GAME
// MET ZICHTBARE PRODUCTEN OP TRANSPORTBANDEN
// ======================================================

const world = document.getElementById("world");
const buildMenu = document.getElementById("buildMenu");
const moneyDisplay = document.getElementById("money");
const soldDisplay = document.getElementById("sold");
const buildingCountDisplay = document.getElementById("buildingCount");
const statusDisplay = document.getElementById("status");
const buildingInfo = document.getElementById("buildingInfo");
const productValues = document.getElementById("productValues");
const toast = document.getElementById("toast");

// Zichtbare lading op transportbanden
const beltCargoStyle = document.createElement("style");
beltCargoStyle.textContent = `
    .cell { position: relative; }

    .belt-cargo {
        position: absolute !important;
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 30 !important;
        width: 34px !important;
        height: 34px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 2px solid #fff !important;
        border-radius: 10px !important;
        background: linear-gradient(145deg, #fff8d8, #e8b84f) !important;
        box-shadow: 0 3px 9px #0009, 0 0 0 2px #65451c !important;
        font-size: 23px !important;
        line-height: 1 !important;
        pointer-events: none !important;
        animation: beltCargoBounce .55s ease-in-out infinite alternate;
    }

    .belt-cargo-value {
        position: absolute;
        z-index: 31;
        left: 50%;
        top: calc(50% + 19px);
        transform: translateX(-50%);
        padding: 1px 4px;
        border-radius: 5px;
        background: #17212b;
        color: white;
        font: 700 9px/1.3 Arial, sans-serif;
        white-space: nowrap;
        pointer-events: none;
    }

    @keyframes beltCargoBounce {
        from { margin-top: -2px; }
        to { margin-top: 2px; }
    }
`;
document.head.appendChild(beltCargoStyle);

const W = 14;
const H = 8;

const catalog = {
    miner: {
        name: "Ore Miner", icon: "⛏️", price: 50,
        category: "MIJNEN", description: "Wint ijzererts."
    },
    crystal: {
        name: "Crystal Miner", icon: "💎", price: 100,
        category: "MIJNEN", description: "Wint zeldzame kristallen."
    },
    quarry: {
        name: "Stone Quarry", icon: "🪨", price: 60,
        category: "MIJNEN", description: "Wint steen."
    },
    copper: {
        name: "Copper Miner", icon: "🟠", price: 90,
        category: "MIJNEN", description: "Wint koper."
    },
    coal: {
        name: "Coal Miner", icon: "⚫", price: 75,
        category: "MIJNEN", description: "Wint steenkool."
    },
    smelter: {
        name: "Smelter", icon: "🔥", price: 100,
        category: "VERWERKING", description: "Smelt erts tot metaal."
    },
    crusher: {
        name: "Crusher", icon: "🗜️", price: 90,
        category: "VERWERKING", description: "Vermaalt steen tot grind."
    },
    press: {
        name: "Metal Press", icon: "🏗️", price: 150,
        category: "VERWERKING", description: "Maakt metalen platen."
    },
    assembler: {
        name: "Assembler", icon: "🏭", price: 200,
        category: "FABRIEKEN", description: "Maakt tandwielen."
    },
    circuit: {
        name: "Circuit Factory", icon: "💻", price: 250,
        category: "FABRIEKEN", description: "Maakt elektronische circuits."
    },
    battery: {
        name: "Battery Factory", icon: "🔋", price: 250,
        category: "FABRIEKEN", description: "Maakt batterijen."
    },
    workshop: {
        name: "Tool Workshop", icon: "🛠️", price: 225,
        category: "FABRIEKEN", description: "Maakt gereedschap."
    },
    belt: {
        name: "Conveyor Belt", icon: "➡️", price: 10,
        category: "TRANSPORT", description: "Verplaatst producten."
    },
    warehouse: {
        name: "Warehouse", icon: "📦", price: 175,
        category: "TRANSPORT", description: "Slaat producten automatisch op."
    },
    sell: {
        name: "Sell Station", icon: "💰", price: 50,
        category: "TRANSPORT", description: "Verkoopt producten in de buurt."
    }
};

const products = {
    ore: { name: "IJzererts", icon: "🟠", value: 5 },
    crystal: { name: "Kristal", icon: "💎", value: 20 },
    stone: { name: "Steen", icon: "🪨", value: 2 },
    copperOre: { name: "Kopererts", icon: "🟤", value: 7 },
    coal: { name: "Steenkool", icon: "⚫", value: 4 },
    metal: { name: "Metaal", icon: "🔩", value: 15 },
    gravel: { name: "Grind", icon: "▫️", value: 4 },
    plate: { name: "Metalen plaat", icon: "🟦", value: 25 },
    gear: { name: "Tandwiel", icon: "⚙️", value: 40 },
    circuit: { name: "Circuit", icon: "💻", value: 65 },
    battery: { name: "Batterij", icon: "🔋", value: 55 },
    tool: { name: "Gereedschap", icon: "🛠️", value: 80 }
};

const recipes = {
    smelter: {
        input: { ore: 1, coal: 1 },
        output: "metal",
        amount: 1
    },
    crusher: {
        input: { stone: 2 },
        output: "gravel",
        amount: 3
    },
    press: {
        input: { metal: 2 },
        output: "plate",
        amount: 1
    },
    assembler: {
        input: { metal: 2 },
        output: "gear",
        amount: 1
    },
    circuit: {
        input: { copperOre: 1, crystal: 1 },
        output: "circuit",
        amount: 1
    },
    battery: {
        input: { metal: 1, crystal: 1 },
        output: "battery",
        amount: 1
    },
    workshop: {
        input: { metal: 1, gear: 1 },
        output: "tool",
        amount: 1
    }
};

const producers = {
    miner: "ore",
    crystal: "crystal",
    quarry: "stone",
    copper: "copperOre",
    coal: "coal"
};

let money = 500;
let sold = 0;
let selectedBuild = "miner";
let tool = "build";

let buildings = {};
let items = {};
let storage = {};
let counters = {};
let nextItemId = 1;
let selectedCell = null;

const directions = [
    { x: 1, y: 0, icon: "➡️" },
    { x: 0, y: 1, icon: "⬇️" },
    { x: -1, y: 0, icon: "⬅️" },
    { x: 0, y: -1, icon: "⬆️" }
];

function key(x, y) {
    return `${x},${y}`;
}

function distance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getBuilding(x, y) {
    return buildings[key(x, y)];
}

function getItem(x, y) {
    return items[key(x, y)];
}

function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function updateStats() {
    moneyDisplay.textContent = `€${Math.floor(money)}`;
    soldDisplay.textContent = sold;
    buildingCountDisplay.textContent = Object.keys(buildings).length;
}

function updateStatus(message) {
    statusDisplay.textContent = message;
}

// ------------------------------------------------------
// MENU
// ------------------------------------------------------

function createMenu() {
    buildMenu.innerHTML = "";

    let currentCategory = "";

    Object.entries(catalog).forEach(([id, data]) => {
        if (data.category !== currentCategory) {
            currentCategory = data.category;

            const heading = document.createElement("div");
            heading.className = "category";
            heading.textContent = currentCategory;
            buildMenu.appendChild(heading);
        }

        const button = document.createElement("button");
        button.className = "build-button";
        button.dataset.build = id;

        button.innerHTML = `
            <span class="build-icon">${data.icon}</span>
            <span class="build-copy">
                <strong>${data.name}</strong>
                <small>${data.description}</small>
            </span>
            <b class="build-price">€${data.price}</b>
        `;

        button.addEventListener("click", () => {
            tool = "build";
            selectedBuild = id;
            updateToolButtons();
            updateMenuSelection();
            updateStatus(`Klik ergens om ${data.name} te plaatsen.`);
        });

        buildMenu.appendChild(button);
    });
}

function updateMenuSelection() {
    document.querySelectorAll(".build-button").forEach(button => {
        button.classList.toggle(
            "selected",
            tool === "build" && button.dataset.build === selectedBuild
        );
    });
}

function updateToolButtons() {
    document.querySelectorAll(".tool-button").forEach(button => {
        button.classList.toggle("active", button.dataset.tool === tool);
    });
    updateMenuSelection();
}

document.querySelectorAll(".tool-button").forEach(button => {
    button.addEventListener("click", () => {
        tool = button.dataset.tool;
        updateToolButtons();

        const messages = {
            build: "Kies een gebouw en plaats het waar je wilt.",
            erase: "Klik op een gebouw om het te verwijderen.",
            upgrade: "Klik op een machine om een upgrade te plaatsen.",
            inspect: "Klik op een gebouw om de informatie te bekijken.",
            rotate: "Klik op een transportband om hem te draaien."
        };

        updateStatus(messages[tool]);
    });
});

// ------------------------------------------------------
// PRODUCTEN EN WAARDES
// ------------------------------------------------------

function createProductList() {
    productValues.innerHTML = "";

    Object.entries(products).forEach(([id, product]) => {
        const row = document.createElement("div");
        row.className = "product-row";
        row.innerHTML = `
            <span>${product.icon} ${product.name}</span>
            <b>€${product.value}</b>
        `;
        productValues.appendChild(row);
    });
}

// ------------------------------------------------------
// WERELD
// ------------------------------------------------------

function createWorld() {
    FWGraphics.init();
    render();
}

function render() {
    updateStats();
}

// ------------------------------------------------------
// GEBOUWEN PLAATSEN
// ------------------------------------------------------

function handleCellClick(x, y) {
    const id = key(x, y);
    const building = buildings[id];

    if (tool === "build") {
        placeBuilding(x, y);
        return;
    }

    if (tool === "erase") {
        if (!building) {
            notify("Hier staat geen gebouw.");
            return;
        }

        delete buildings[id];
        delete counters[id];
        delete storage[id];

        render();
        buildingInfo.textContent = "Gebouw verwijderd.";
        notify("Gebouw verwijderd.");
        return;
    }

    if (tool === "upgrade") {
        upgradeBuilding(x, y);
        return;
    }

    if (tool === "rotate") {
        if (!building || building.type !== "belt") {
            notify("Kies een transportband.");
            return;
        }

        building.direction = ((building.direction || 0) + 1) % 4;
        render();
        notify("Transportband gedraaid.");
        return;
    }

    if (tool === "inspect") {
        inspectBuilding(x, y);
    }
}

function placeBuilding(x, y) {
    const id = key(x, y);

    if (buildings[id]) {
        notify("Dit vakje is al bezet.");
        return;
    }

    const data = catalog[selectedBuild];

    if (!data) return;

    if (money < data.price) {
        notify("Niet genoeg geld!");
        return;
    }

    money -= data.price;

    buildings[id] = {
        type: selectedBuild,
        direction: 0,
        upgraded: false
    };

    counters[id] = 0;

    if (selectedBuild === "warehouse") {
        storage[id] = {};
    }

    render();
    notify(`${data.name} geplaatst!`);
}

function upgradeBuilding(x, y) {
    const id = key(x, y);
    const building = buildings[id];

    if (!building) {
        notify("Klik op een machine.");
        return;
    }

    if (!recipes[building.type] && !producers[building.type]) {
        notify("Dit gebouw kan geen upgrade krijgen.");
        return;
    }

    if (building.upgraded) {
        notify("Deze machine heeft al een upgrade.");
        return;
    }

    if (money < 150) {
        notify("Je hebt €150 nodig.");
        return;
    }

    money -= 150;
    building.upgraded = true;

    render();
    inspectBuilding(x, y);
    notify("⚡ Upgrade geplaatst!");
}

function inspectBuilding(x, y) {
    const building = getBuilding(x, y);

    if (!building) {
        buildingInfo.textContent = "Op deze plek staat geen gebouw.";
        return;
    }

    const data = catalog[building.type];
    let details = `<strong>${data.icon} ${data.name}</strong><br>${data.description}<br>Upgrade: ${building.upgraded ? "Ja ⚡" : "Nee"}`;

    if (recipes[building.type]) {
        const recipe = recipes[building.type];
        const inputText = Object.entries(recipe.input)
            .map(([type, amount]) => `${amount}× ${products[type].name}`)
            .join(" + ");

        details += `<br><br><strong>Recept:</strong><br>${inputText}<br>➡️ ${recipe.amount}× ${products[recipe.output].name}`;
    }

    if (producers[building.type]) {
        details += `<br><br><strong>Productie:</strong><br>${products[producers[building.type]].name}`;
    }

    if (building.type === "warehouse") {
        const stock = storage[key(x, y)] || {};
        const total = Object.values(stock).reduce((a, b) => a + b, 0);
        details += `<br><br>Opgeslagen producten: ${total}`;
    }

    buildingInfo.innerHTML = details;
    selectedCell = { x, y };
}

// ------------------------------------------------------
// GRONDSTOFFEN ZOEKEN
// ------------------------------------------------------

function findItems(type, amount, centerX, centerY, range = 3) {
    const found = [];

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (distance(centerX, centerY, x, y) > range) continue;

            const item = getItem(x, y);

            if (item && item.type === type) {
                found.push({ x, y });
            }
        }
    }

    return found.slice(0, amount);
}

function findEmptyPosition(centerX, centerY, range = 2) {
    for (let radius = 0; radius <= range; radius++) {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (distance(centerX, centerY, x, y) !== radius) continue;
                if (getItem(x, y)) continue;

                return { x, y };
            }
        }
    }

    return null;
}

function spawnProduct(type, x, y, amount = 1) {
    for (let i = 0; i < amount; i++) {
        const position = findEmptyPosition(x, y, 2);

        if (!position) return;

        items[key(position.x, position.y)] = {
            id: nextItemId++,
            type
        };
    }
}

// ------------------------------------------------------
// PRODUCTIE VAN MIJNEN
// ------------------------------------------------------

function produceResources() {
    Object.entries(buildings).forEach(([id, building]) => {
        const type = building.type;

        if (!producers[type]) return;

        counters[id] = (counters[id] || 0) + 1;

        const speed = building.upgraded ? 1 : 2;

        if (counters[id] < speed) return;

        counters[id] = 0;

        const [x, y] = id.split(",").map(Number);
        const amount = building.upgraded ? 2 : 1;

        spawnProduct(producers[type], x, y, amount);
    });
}

// ------------------------------------------------------
// MACHINES EN RECEPTEN
// ------------------------------------------------------

function processMachines() {
    Object.entries(buildings).forEach(([id, building]) => {
        const recipe = recipes[building.type];

        if (!recipe) return;

        const [x, y] = id.split(",").map(Number);
        const selectedItems = {};

        for (const [type, amount] of Object.entries(recipe.input)) {
            const found = findItems(type, amount, x, y, 3);

            if (found.length < amount) {
                return;
            }

            selectedItems[type] = found;
        }

        Object.values(selectedItems).flat().forEach(position => {
            delete items[key(position.x, position.y)];
        });

        const outputAmount = building.upgraded
            ? recipe.amount * 2
            : recipe.amount;

        spawnProduct(recipe.output, x, y, outputAmount);
    });
}

// ------------------------------------------------------
// WAREHOUSE
// ------------------------------------------------------

function collectProducts() {
    Object.entries(buildings).forEach(([id, building]) => {
        if (building.type !== "warehouse") return;

        const [x, y] = id.split(",").map(Number);
        const stock = storage[id] || (storage[id] = {});

        for (let iy = 0; iy < H; iy++) {
            for (let ix = 0; ix < W; ix++) {
                if (distance(x, y, ix, iy) > 2) continue;

                const itemId = key(ix, iy);
                const item = items[itemId];

                if (!item) continue;

                stock[item.type] = (stock[item.type] || 0) + 1;
                delete items[itemId];
            }
        }
    });
}

// ------------------------------------------------------
// VERKOPEN
// ------------------------------------------------------

function sellProduct(type, amount = 1) {
    const product = products[type];

    if (!product) return;

    money += product.value * amount;
    sold += amount;
}

function sellNearbyProducts() {
    Object.entries(buildings).forEach(([id, building]) => {
        if (building.type !== "sell") return;

        const [x, y] = id.split(",").map(Number);

        for (let iy = 0; iy < H; iy++) {
            for (let ix = 0; ix < W; ix++) {
                if (distance(x, y, ix, iy) > 3) continue;

                const itemId = key(ix, iy);
                const item = items[itemId];

                if (!item) continue;

                sellProduct(item.type);
                delete items[itemId];
            }
        }

        Object.entries(buildings).forEach(([warehouseId, warehouse]) => {
            if (warehouse.type !== "warehouse") return;

            const [wx, wy] = warehouseId.split(",").map(Number);

            if (distance(x, y, wx, wy) > 5) return;

            const stock = storage[warehouseId] || {};

            Object.entries(stock).forEach(([type, amount]) => {
                if (amount > 0) {
                    sellProduct(type, amount);
                    stock[type] = 0;
                }
            });
        });
    });

    updateStats();
}

// ------------------------------------------------------
// TRANSPORTBANDEN
// ------------------------------------------------------

function moveBelts() {
    const moves = [];

    Object.entries(items).forEach(([id, item]) => {
        const [x, y] = id.split(",").map(Number);
        const building = getBuilding(x, y);

        if (!building || building.type !== "belt") return;

        const direction = directions[building.direction || 0];
        const nx = x + direction.x;
        const ny = y + direction.y;

        if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;

        const nextId = key(nx, ny);

        if (items[nextId]) return;

        moves.push({ from: id, to: nextId, item });
    });

    moves.forEach(move => {
        if (!items[move.from] || items[move.to]) return;

        delete items[move.from];
        items[move.to] = move.item;
    });
}

// ------------------------------------------------------
// OPSLAAN
// ------------------------------------------------------

function saveGame(showMessage = true) {
    const data = {
        money,
        sold,
        buildings,
        items,
        storage,
        counters,
        nextItemId
    };

    try {
        localStorage.setItem("factoryWorldSaveV2", JSON.stringify(data));

        if (showMessage) notify("💾 Fabriek opgeslagen!");
    } catch (error) {
        notify("Opslaan is niet gelukt.");
    }
}

function loadGame() {
    let raw = null;
    try { raw = localStorage.getItem("factoryWorldSaveV2"); } catch (e) { return false; }

    if (!raw) return false;

    try {
        const data = JSON.parse(raw);

        money = Number(data.money) || 500;
        sold = Number(data.sold) || 0;
        buildings = data.buildings || {};
        items = data.items || {};
        storage = data.storage || {};
        counters = data.counters || {};
        nextItemId = data.nextItemId || 1;

        return true;
    } catch (error) {
        console.error("Save kon niet worden geladen:", error);
        return false;
    }
}

document.getElementById("saveButton").addEventListener("click", () => {
    saveGame(true);
});

document.getElementById("resetButton").addEventListener("click", () => {
    if (!confirm("Weet je zeker dat je een nieuwe fabriek wilt beginnen?")) {
        return;
    }

    money = 500;
    sold = 0;
    buildings = {};
    items = {};
    storage = {};
    counters = {};
    nextItemId = 1;

    try { localStorage.removeItem("factoryWorldSaveV2"); } catch (e) {}

    render();
    buildingInfo.textContent = "Klik op een gebouw om informatie te bekijken.";
    notify("Nieuwe fabriek gestart!");
});

// ------------------------------------------------------
// START GAME
// ------------------------------------------------------

createMenu();
updateToolButtons();
updateStatus("Ore Miner geselecteerd: klik op het terrein om te bouwen.");
createProductList();
createWorld();

if (loadGame()) {
    notify("Je fabriek is geladen!");
}

render();
updateStats();

setInterval(() => {
    produceResources();
    processMachines();
    collectProducts();
    sellNearbyProducts();
    render();
}, 1500);

setInterval(() => {
    moveBelts();
    render();
}, 650);

setInterval(() => {
    saveGame(false);
}, 10000);
