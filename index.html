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
    GFX.init();
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
    const raw = localStorage.getItem("factoryWorldSaveV2");

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

    localStorage.removeItem("factoryWorldSaveV2");

    render();
    buildingInfo.textContent = "Klik op een gebouw om informatie te bekijken.";
    notify("Nieuwe fabriek gestart!");
});

// ------------------------------------------------------
// START GAME
// ------------------------------------------------------

createMenu();
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
