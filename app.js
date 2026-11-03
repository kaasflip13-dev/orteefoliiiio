// ======================================================
// FACTORY WORLD
// Complete factory game
// ======================================================

const world = document.getElementById("world");
const moneyDisplay = document.getElementById("money");
const soldDisplay = document.getElementById("sold");
const statusDisplay = document.getElementById("status");
const toast = document.getElementById("toast");

const WIDTH = 12;
const HEIGHT = 7;

const prices = {
    miner: 50,
    smelter: 75,
    assembler: 100,
    belt: 10,
    sell: 25,
    upgrade: 150
};

const products = {
    stone: { icon: "🪨", name: "Steen", value: 2 },
    ore: { icon: "🟠", name: "Ruw erts", value: 5 },
    metal: { icon: "🔩", name: "Metaal", value: 15 },
    gear: { icon: "⚙️", name: "Tandwiel", value: 40 }
};

let money = 250;
let sold = 0;
let selectedBuild = "miner";
let buildings = {};
let items = {};
let assemblerBuffers = {};
let nextItemId = 1;

let lastProduction = 0;
let lastMovement = 0;
let minerCounters = {};

const directions = [
    { x: 1, y: 0, icon: "➡️" },
    { x: 0, y: 1, icon: "⬇️" },
    { x: -1, y: 0, icon: "⬅️" },
    { x: 0, y: -1, icon: "⬆️" }
];

function key(x, y) {
    return `${x},${y}`;
}

function getBuilding(x, y) {
    return buildings[key(x, y)];
}

function getItem(x, y) {
    return items[key(x, y)];
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function updateStats() {
    moneyDisplay.textContent = `€${money}`;
    soldDisplay.textContent = sold;
}

function selectBuild(type) {
    selectedBuild = type;

    document.querySelectorAll(".build-button").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.build === type
        );
    });

    const messages = {
        miner: "Klik op een leeg vakje om een mijnmachine te plaatsen.",
        smelter: "Plaats een smelter op een leeg vakje.",
        assembler: "Plaats een assembler op een leeg vakje.",
        belt: "Plaats een transportband. Klik op draaien om de richting te veranderen.",
        sell: "Plaats een verkoopstation aan het einde van je transportband.",
        upgrade: "Klik op een mijnmachine om de upgrade erop te plaatsen.",
        erase: "Klik op een gebouw om het te verwijderen.",
        rotate: "Klik op een transportband om hem te draaien."
    };

    statusDisplay.textContent = messages[type] || "";
}

document.querySelectorAll(".build-button").forEach(button => {
    button.addEventListener("click", () => {
        selectBuild(button.dataset.build);
    });
});

// ------------------------------------------------------
// GEBOUWEN PLAATSEN
// ------------------------------------------------------

function placeBuilding(x, y) {
    const id = key(x, y);
    const existing = buildings[id];

    if (selectedBuild === "erase") {
        if (!existing) {
            showToast("Hier staat geen gebouw.");
            return;
        }

        delete buildings[id];
        delete items[id];
        delete assemblerBuffers[id];
        delete minerCounters[id];

        render();
        showToast("Gebouw verwijderd.");
        return;
    }

    if (selectedBuild === "rotate") {
        if (!existing || existing.type !== "belt") {
            showToast("Je kunt alleen transportbanden draaien.");
            return;
        }

        existing.direction = (existing.direction + 1) % 4;
        render();
        showToast("Transportband gedraaid.");
        return;
    }

    if (selectedBuild === "upgrade") {
        if (!existing || existing.type !== "miner") {
            showToast("Deze upgrade werkt alleen op een mijnmachine.");
            return;
        }

        if (existing.upgraded) {
            showToast("Deze machine heeft al een upgrade.");
            return;
        }

        if (money < prices.upgrade) {
            showToast("Niet genoeg geld!");
            return;
        }

        money -= prices.upgrade;
        existing.upgraded = true;

        updateStats();
        render();
        showToast("⚡ Productie-upgrade geplaatst!");
        return;
    }

    if (existing) {
        showToast("Dit vakje is al bezet.");
        return;
    }

    const price = prices[selectedBuild];

    if (price === undefined) return;

    if (money < price) {
        showToast("Niet genoeg geld!");
        return;
    }

    money -= price;

    buildings[id] = {
        type: selectedBuild,
        direction: 0,
        upgraded: false
    };

    if (selectedBuild === "assembler") {
        assemblerBuffers[id] = 0;
    }

    if (selectedBuild === "miner") {
        minerCounters[id] = 0;
    }

    updateStats();
    render();
    showToast("Gebouw geplaatst!");
}

function createWorld() {
    world.innerHTML = "";

    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const cell = document.createElement("div");

            cell.className = "cell";
            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener("click", () => {
                placeBuilding(x, y);
            });

            world.appendChild(cell);
        }
    }

    render();
}

// ------------------------------------------------------
// WEERGAVE
// ------------------------------------------------------

function render() {
    const cells = world.querySelectorAll(".cell");

    cells.forEach(cell => {
        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);
        const id = key(x, y);

        const building = buildings[id];
        const item = items[id];

        cell.className = "cell";
        cell.innerHTML = "";

        if (building) {
            const type = building.type;

            const info = {
                miner: ["⛏️", "MIJN"],
                smelter: ["🔥", "SMELTER"],
                assembler: ["🏭", "ASSEMBLER"],
                belt: [directions[building.direction].icon, "BAND"],
                sell: ["💰", "VERKOOP"]
            };

            cell.classList.add(type);

            const icon = document.createElement("div");
            icon.className = "building";
            icon.textContent = info[type][0];

            if (type === "belt") {
                icon.textContent = directions[building.direction].icon;
            }

            cell.appendChild(icon);

            const name = document.createElement("div");
            name.className = "machine-name";
            name.textContent = info[type][1];
            cell.appendChild(name);

            if (building.upgraded) {
                const upgrade = document.createElement("div");
                upgrade.className = "upgrade-mark";
                upgrade.textContent = "⚡";
                cell.appendChild(upgrade);
            }
        }

        if (item) {
            const product = products[item.type];

            const itemIcon = document.createElement("div");
            itemIcon.className = "item";
            itemIcon.textContent = product.icon;

            const value = document.createElement("div");
            value.className = "item-value";
            value.textContent = `€${product.value}`;

            cell.appendChild(itemIcon);
            cell.appendChild(value);
        }
    });
}

// ------------------------------------------------------
// TRANSPORT
// ------------------------------------------------------

function canReceive(x, y) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
        return false;
    }

    const building = getBuilding(x, y);

    if (!building) return false;

    return [
        "belt",
        "smelter",
        "assembler",
        "sell"
    ].includes(building.type);
}

function getNextPosition(x, y, building) {
    let direction = 0;

    if (building.type === "belt") {
        direction = building.direction;
    }

    const d = directions[direction];

    return {
        x: x + d.x,
        y: y + d.y
    };
}

function createItem(type, x, y) {
    items[key(x, y)] = {
        id: nextItemId++,
        type
    };
}

function sellItem(item) {
    const product = products[item.type];

    if (!product) return;

    money += product.value;
    sold++;

    updateStats();
}

function processIncomingItem(x, y) {
    const id = key(x, y);
    const building = buildings[id];
    const item = items[id];

    if (!building || !item) return;

    // SMELTER: erts wordt metaal.
    if (building.type === "smelter") {
        if (item.type === "ore") {
            item.type = "metal";
        }
    }

    // ASSEMBLER: twee metalen worden een tandwiel.
    if (building.type === "assembler") {
        if (item.type === "metal") {
            assemblerBuffers[id] = (assemblerBuffers[id] || 0) + 1;
            delete items[id];

            if (assemblerBuffers[id] >= 2) {
                assemblerBuffers[id] -= 2;
                createItem("gear", x, y);
            }
        }
    }

    // VERKOOPSTATION: verkoopt ieder product.
    if (building.type === "sell") {
        sellItem(item);
        delete items[id];
    }
}

function moveItems() {
    // Van rechts naar links verwerken zodat producten
    // niet twee vakjes in dezelfde beurt overslaan.
    for (let x = WIDTH - 1; x >= 0; x--) {
        for (let y = HEIGHT - 1; y >= 0; y--) {
            const id = key(x, y);
            const item = items[id];
            const building = buildings[id];

            if (!item || !building) continue;

            if (building.type === "sell") {
                continue;
            }

            // Producten op een machine kunnen verder reizen.
            const next = getNextPosition(x, y, building);

            if (!canReceive(next.x, next.y)) continue;

            const nextId = key(next.x, next.y);

            if (items[nextId]) continue;

            delete items[id];
            items[nextId] = item;

            processIncomingItem(next.x, next.y);
        }
    }

    render();
}

// ------------------------------------------------------
// PRODUCTIE
// ------------------------------------------------------

function produceItems() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const id = key(x, y);
            const building = buildings[id];

            if (!building || building.type !== "miner") continue;

            const nextX = x + 1;
            const nextY = y;

            if (!canReceive(nextX, nextY)) continue;

            if (getItem(nextX, nextY)) continue;

            minerCounters[id] = (minerCounters[id] || 0) + 1;

            const productionSpeed = building.upgraded ? 1 : 2;

            if (minerCounters[id] < productionSpeed) continue;

            minerCounters[id] = 0;

            // Mijnmachines maken afwisselend steen en erts.
            const cycle = Math.floor(Math.random() * 2);
            const type = cycle === 0 ? "stone" : "ore";

            createItem(type, nextX, nextY);
            processIncomingItem(nextX, nextY);
        }
    }

    render();
}

// ------------------------------------------------------
// OPSLAAN EN LADEN
// ------------------------------------------------------

function saveGame() {
    const saveData = {
        money,
        sold,
        buildings,
        items,
        assemblerBuffers,
        minerCounters,
        nextItemId
    };

    try {
        localStorage.setItem("factoryWorldSave", JSON.stringify(saveData));
        showToast("💾 Fabriek opgeslagen!");
    } catch (error) {
        showToast("Opslaan is niet gelukt.");
    }
}

function loadGame() {
    const saved = localStorage.getItem("factoryWorldSave");

    if (!saved) return false;

    try {
        const data = JSON.parse(saved);

        money = Number(data.money) || 0;
        sold = Number(data.sold) || 0;
        buildings = data.buildings || {};
        items = data.items || {};
        assemblerBuffers = data.assemblerBuffers || {};
        minerCounters = data.minerCounters || {};
        nextItemId = data.nextItemId || 1;

        updateStats();
        render();

        return true;
    } catch (error) {
        console.error("Savebestand kon niet worden geladen:", error);
        return false;
    }
}

// ------------------------------------------------------
// KNOPPEN
// ------------------------------------------------------

document.getElementById("saveButton").addEventListener("click", saveGame);

document.getElementById("resetButton").addEventListener("click", () => {
    const confirmed = confirm(
        "Weet je zeker dat je een nieuwe fabriek wilt beginnen? Je huidige fabriek wordt verwijderd."
    );

    if (!confirmed) return;

    money = 250;
    sold = 0;
    buildings = {};
    items = {};
    assemblerBuffers = {};
    minerCounters = {};
    nextItemId = 1;

    localStorage.removeItem("factoryWorldSave");

    updateStats();
    render();

    showToast("Nieuwe fabriek gestart!");
});

// ------------------------------------------------------
// START
// ------------------------------------------------------

createWorld();

if (loadGame()) {
    showToast("Je vorige fabriek is geladen!");
}

updateStats();
selectBuild("miner");

// Productie en transport draaien automatisch.
setInterval(produceItems, 1000);
setInterval(moveItems, 550);

// Automatisch opslaan.
setInterval(() => {
    const saveData = {
        money,
        sold,
        buildings,
        items,
        assemblerBuffers,
        minerCounters,
        nextItemId
    };

    localStorage.setItem("factoryWorldSave", JSON.stringify(saveData));
}, 10000);
