
// ==========================================
// FACTORY TYCOON
// Complete game engine
// ==========================================

const canvas = document.getElementById("factoryCanvas");
const ctx = canvas.getContext("2d");

const moneyEl = document.getElementById("money");
const oreEl = document.getElementById("ore");
const metalEl = document.getElementById("metal");
const gearsEl = document.getElementById("gears");

const COLS = 16;
const ROWS = 11;

const costs = {
    miner: 100,
    smelter: 180,
    assembler: 300,
    seller: 150,
    belt: 15
};

const machineData = {
    miner: {
        name: "Mijnmachine",
        icon: "⛏️",
        description: "Haalt automatisch erts uit de grond.",
        speed: 2,
        output: "Erts"
    },
    smelter: {
        name: "Smelterij",
        icon: "🔥",
        description: "Verwerkt erts tot bruikbaar metaal.",
        speed: 3,
        output: "Metaal"
    },
    assembler: {
        name: "Assembler",
        icon: "⚙️",
        description: "Maakt tandwielen van metaal.",
        speed: 4,
        output: "Tandwielen"
    },
    seller: {
        name: "Verzendstation",
        icon: "📦",
        description: "Verkoopt automatisch geproduceerde tandwielen.",
        speed: 2,
        output: "Geld"
    },
    belt: {
        name: "Transportband",
        icon: "➡️",
        description: "Verplaatst goederen door je fabriek.",
        speed: 0,
        output: "Transport"
    }
};

let money = 500;
let ore = 0;
let metal = 0;
let gears = 0;

let machines = [];
let selectedTool = "select";
let selectedMachine = null;

let gameSpeed = 1;
let animation = 0;
let lastTime = 0;
let tickTimer = 0;

let rates = {
    ore: 0,
    metal: 0,
    gears: 0,
    income: 0
};

let rateTimer = 0;
let rateCounts = {
    ore: 0,
    metal: 0,
    gears: 0,
    income: 0
};

let goal = 1000;
let toastTimer;

let cellSize = 45;
let offsetX = 0;
let offsetY = 0;

const key = (x, y) => `${x},${y}`;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;

    cellSize = Math.min(
        width / COLS,
        height / ROWS
    );

    offsetX = (width - cellSize * COLS) / 2;
    offsetY = (height - cellSize * ROWS) / 2;

    draw();
}

window.addEventListener("resize", resizeCanvas);

// ==========================================
// MACHINE PLACEMENT
// ==========================================

function placeMachine(x, y) {
    if (machines.some(m => m.x === x && m.y === y)) {
        showToast("Dit vakje is al bezet!");
        return;
    }

    const cost = costs[selectedTool];

    if (money < cost) {
        showToast("Niet genoeg geld!");
        return;
    }

    money -= cost;

    const machine = {
        id: Date.now() + Math.random(),
        type: selectedTool,
        x,
        y,
        level: 1,
        timer: 0
    };

    machines.push(machine);

    updateUI();
    showToast(machineData[selectedTool].name + " gebouwd!");

    selectMachine(machine);
}

// ==========================================
// CANVAS CLICK
// ==========================================

canvas.addEventListener("click", event => {
    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const x = Math.floor((mouseX - offsetX) / cellSize);
    const y = Math.floor((mouseY - offsetY) / cellSize);

    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) {
        return;
    }

    const found = machines.find(m => m.x === x && m.y === y);

    if (selectedTool === "select") {
        if (found) {
            selectMachine(found);
        } else {
            selectedMachine = null;
            updateMachineInfo();
        }
        draw();
        return;
    }

    if (found) {
        selectMachine(found);
        showToast("Vakje is bezet!");
        return;
    }

    placeMachine(x, y);
});

function selectMachine(machine) {
    selectedMachine = machine;
    updateMachineInfo();
    draw();
}

// ==========================================
// MACHINE INFORMATION
// ==========================================

function updateMachineInfo() {
    const info = document.getElementById("machineInfo");
    const actions = document.getElementById("machineActions");

    if (!selectedMachine) {
        info.innerHTML = `
            <div class="big-icon">🏭</div>
            <h3>Geen machine geselecteerd</h3>
            <p>Klik op een machine in je fabriek om informatie te bekijken.</p>
        `;

        actions.innerHTML = "";
        return;
    }

    const m = selectedMachine;
    const data = machineData[m.type];

    info.innerHTML = `
        <div class="big-icon">${data.icon}</div>
        <h3>${data.name}</h3>
        <p>${data.description}</p>
        <p>Vakje: ${m.x + 1}, ${m.y + 1}</p>
        <p>Upgrade niveau: <b>${m.level}</b></p>
        <p>Productiesnelheid: <b>${(1 / data.speed * m.level).toFixed(2)} / sec</b></p>
    `;

    if (m.type === "belt") {
        actions.innerHTML = `
            <button class="action-btn danger" onclick="removeMachine()">
                🗑️ Transportband verwijderen
            </button>
        `;
    } else {
        const upgradeCost = Math.round(
            costs[m.type] * m.level * 0.8
        );

        actions.innerHTML = `
            <button class="action-btn" onclick="upgradeMachine()">
                ⬆️ UPGRADE - $${upgradeCost}
            </button>
            <button class="action-btn danger" onclick="removeMachine()">
                🗑️ MACHINE VERWIJDEREN
            </button>
        `;
    }
}

function upgradeMachine() {
    if (!selectedMachine || selectedMachine.type === "belt") return;

    const m = selectedMachine;
    const cost = Math.round(costs[m.type] * m.level * 0.8);

    if (money < cost) {
        showToast("Niet genoeg geld voor upgrade!");
        return;
    }

    money -= cost;
    m.level++;

    updateUI();
    updateMachineInfo();

    showToast("Machine geüpgraded naar level " + m.level);
}

function removeMachine() {
    if (!selectedMachine) return;

    const index = machines.indexOf(selectedMachine);

    if (index === -1) return;

    const refund = Math.floor(costs[selectedMachine.type] * 0.4);

    money += refund;
    machines.splice(index, 1);

    selectedMachine = null;

    updateUI();
    updateMachineInfo();

    showToast("Machine verwijderd. Teruggekregen: $" + refund);
}

// ==========================================
// BUILD MENU
// ==========================================

document.querySelectorAll(".build-btn").forEach(button => {
    button.addEventListener("click", () => {
        selectedTool = button.dataset.type;

        document.querySelectorAll(".build-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        document.getElementById("selectedInfo").textContent =
            "Geselecteerd: " +
            (selectedTool === "select"
                ? "Selecteren"
                : machineData[selectedTool].name);

        selectedMachine = null;
        updateMachineInfo();

        canvas.style.cursor =
            selectedTool === "select" ? "default" : "crosshair";
    });
});

// ==========================================
// PRODUCTION SYSTEM
// ==========================================

function productionTick(dt) {
    for (const machine of machines) {
        machine.timer += dt;

        const data = machineData[machine.type];
        if (!data.speed) continue;

        const interval = data.speed / machine.level;

        while (machine.timer >= interval) {
            machine.timer -= interval;

            if (machine.type === "miner") {
                ore += 1;
                rateCounts.ore++;
            }

            if (machine.type === "smelter" && ore >= 1) {
                ore -= 1;
                metal += 1;
                rateCounts.metal++;
            }

            if (machine.type === "assembler" && metal >= 1) {
                metal -= 1;
                gears += 1;
                rateCounts.gears++;
            }

            if (machine.type === "seller" && gears >= 1) {
                gears -= 1;
                const earned = 25 * machine.level;
                money += earned;
                rateCounts.income += earned;
            }
        }
    }

    updateUI();
}

// ==========================================
// PRODUCTION STATISTICS
// ==========================================

function updateRates(dt) {
    rateTimer += dt;

    if (rateTimer >= 5) {
        const multiplier = 60 / rateTimer;

        rates.ore = Math.round(rateCounts.ore * multiplier);
        rates.metal = Math.round(rateCounts.metal * multiplier);
        rates.gears = Math.round(rateCounts.gears * multiplier);
        rates.income = Math.round(rateCounts.income * multiplier);

        rateCounts = {
            ore: 0,
            metal: 0,
            gears: 0,
            income: 0
        };

        rateTimer = 0;

        document.getElementById("oreRate").textContent =
            rates.ore + "/min";

        document.getElementById("metalRate").textContent =
            rates.metal + "/min";

        document.getElementById("gearRate").textContent =
            rates.gears + "/min";

        document.getElementById("incomeRate").textContent =
            "$" + rates.income + "/min";
    }
}

// ==========================================
// USER INTERFACE
// ==========================================

function updateUI() {
    moneyEl.textContent = Math.floor(money).toLocaleString("nl-NL");
    oreEl.textContent = ore;
    metalEl.textContent = metal;
    gearsEl.textContent = gears;

    const progress = Math.min(100, money / goal * 100);

    document.getElementById("goalProgress").style.width =
        progress + "%";

    document.getElementById("goalText").textContent =
        money >= goal
            ? "🎉 Doel bereikt! Verdien $5.000"
            : "Verdien $" + goal.toLocaleString("nl-NL");

    if (money >= goal) {
        goal = 5000;
    }

    draw();
}

// ==========================================
// FACTORY DRAWING
// ==========================================

function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#17212a";
    ctx.fillRect(0, 0, width, height);

    // Background floor
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const px = offsetX + x * cellSize;
            const py = offsetY + y * cellSize;

            ctx.fillStyle =
                (x + y) % 2 === 0 ? "#222f37" : "#202c34";

            ctx.fillRect(px, py, cellSize, cellSize);

            ctx.strokeStyle = "#35434a";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, cellSize, cellSize);
        }
    }

    // Decorative factory floor lines
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#f5a623";
    ctx.lineWidth = 2;

    for (let x = 0; x < COLS; x += 4) {
        for (let y = 0; y < ROWS; y += 4) {
            ctx.beginPath();
            ctx.moveTo(offsetX + x * cellSize, offsetY + y * cellSize);
            ctx.lineTo(offsetX + (x + 1) * cellSize, offsetY + y * cellSize);
            ctx.stroke();
        }
    }

    ctx.restore();

    // Machines
    for (const machine of machines) {
        drawMachine(machine);
    }

    // Selection
    if (selectedMachine) {
        const px = offsetX + selectedMachine.x * cellSize;
        const py = offsetY + selectedMachine.y * cellSize;

        ctx.strokeStyle = "#ffbd43";
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
    }
}

function drawMachine(machine) {
    const px = offsetX + machine.x * cellSize;
    const py = offsetY + machine.y * cellSize;
    const size = cellSize;

    const colors = {
        miner: "#795b39",
        smelter: "#8b4939",
        assembler: "#385d85",
        seller: "#477a60",
        belt: "#59656c"
    };

    ctx.fillStyle = colors[machine.type];
    ctx.fillRect(
        px + 4,
        py + 4,
        size - 8,
        size - 8
    );

    ctx.fillStyle = "rgba(0,0,0,.20)";
    ctx.fillRect(
        px + 4,
        py + size - 13,
        size - 8,
        9
    );

    if (machine.type === "belt") {
        ctx.fillStyle = "#d5dce0";

        for (let i = 0; i < 3; i++) {
            const position = ((animation * 0.7 + i / 3) % 1);
            const ax = px + 9 + position * (size - 18);

            ctx.fillRect(ax, py + size / 2 - 3, 5, 6);
        }
    } else {
        ctx.fillStyle = "rgba(255,255,255,.13)";
        ctx.beginPath();
        ctx.arc(
            px + size / 2,
            py + size / 2,
            size * 0.34,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.floor(size * 0.48)}px Arial`;

    ctx.fillStyle = "#ffffff";
    ctx.fillText(
        machineData[machine.type].icon,
        px + size / 2,
        py + size / 2 - 2
    );

    // Level badge
    if (machine.type !== "belt" && machine.level > 1) {
        ctx.fillStyle = "#f5a623";
        ctx.beginPath();
        ctx.arc(px + size - 8, py + 8, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#222";
        ctx.font = "bold 10px Arial";
        ctx.fillText(
            machine.level,
            px + size - 8,
            py + 8
        );
    }
}

// ==========================================
// ANIMATION LOOP
// ==========================================

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.1);
    lastTime = timestamp;

    const scaledDt = dt * gameSpeed;

    animation += scaledDt;

    tickTimer += scaledDt;

    while (tickTimer >= 0.25) {
        productionTick(0.25);
        tickTimer -= 0.25;
    }

    updateRates(scaledDt);

    draw();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// SAVE SYSTEM
// ==========================================

function saveGame() {
    const save = {
        money,
        ore,
        metal,
        gears,
        machines,
        goal
    };

    try {
        localStorage.setItem("factoryTycoonSave", JSON.stringify(save));
        showToast("💾 Fabriek succesvol opgeslagen!");
    } catch (error) {
        showToast("Opslaan is mislukt!");
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem("factoryTycoonSave");

        if (!raw) return;

        const save = JSON.parse(raw);

        if (
            !save ||
            !Array.isArray(save.machines) ||
            !Number.isFinite(save.money)
        ) {
            throw new Error("Ongeldige save");
        }

        money = Math.max(0, save.money);
        ore = Math.max(0, Number(save.ore) || 0);
        metal = Math.max(0, Number(save.metal) || 0);
        gears = Math.max(0, Number(save.gears) || 0);
        goal = Number(save.goal) || 1000;

        machines = save.machines.filter(m =>
            Number.isInteger(m.x) &&
            Number.isInteger(m.y) &&
            m.x >= 0 && m.x < COLS &&
            m.y >= 0 && m.y < ROWS &&
            costs[m.type] !== undefined
        ).map(m => ({
            ...m,
            level: Math.max(1, Number(m.level) || 1),
            timer: 0
        }));

        showToast("Je fabriek is geladen!");
        updateUI();
    } catch (error) {
        showToast("Save kon niet worden geladen!");
    }
}

document.getElementById("saveBtn").addEventListener("click", saveGame);

// ==========================================
// SPEED CONTROL
// ==========================================

document.getElementById("speedBtn").addEventListener("click", () => {
    gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 3 : 1;

    document.getElementById("speedBtn").textContent =
        "⏩ " + gameSpeed + "x";

    showToast("Spelsnelheid: " + gameSpeed + "x");
});

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

// ==========================================
// START GAME
// ==========================================

loadGame();
resizeCanvas();
updateUI();

requestAnimationFrame(gameLoop);

setInterval(saveGame, 30000);

window.addEventListener("beforeunload", saveGame);

