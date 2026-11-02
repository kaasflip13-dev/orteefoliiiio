
"use strict";

// ============================================
// FACTORY WORLD - COMPLETE GAME
// ============================================

const WIDTH = 14;
const HEIGHT = 9;

let money = 500;
let sold = 0;
let selectedBuilding = null;
let items = [];
let cells = [];
let totalSales = 0;
let lastSale = "Nog niets verkocht";
let lastProduction = 0;

const BUILDINGS = {
    miner: {
        name: "Mijnmachine",
        emoji: "⛏️",
        price: 80,
        description: "Maakt ijzererts",
        output: "ore",
        interval: 1800
    },
    crystalMiner: {
        name: "Kristalmijn",
        emoji: "💎",
        price: 140,
        description: "Maakt kristallen",
        output: "crystal",
        interval: 2300
    },
    quarry: {
        name: "Steengroeve",
        emoji: "🪨",
        price: 100,
        description: "Maakt steen",
        output: "stone",
        interval: 2000
    },
    belt: {
        name: "Transportband",
        emoji: "➡️",
        price: 10,
        description: "Verplaatst producten",
    },
    smelter: {
        name: "Smelter",
        emoji: "🔥",
        price: 120,
        description: "Erts → metaal",
    },
    crusher: {
        name: "Vergruizer",
        emoji: "🔨",
        price: 90,
        description: "Erts → steen",
    },
    press: {
        name: "Persmachine",
        emoji: "🏗️",
        price: 130,
        description: "Metaal → platen",
    },
    assembler: {
        name: "Assembler",
        emoji: "🤖",
        price: 180,
        description: "Metaal → tandwielen",
    },
    storage: {
        name: "Opslag",
        emoji: "📦",
        price: 75,
        description: "Tussenstation voor producten",
    },
    seller: {
        name: "Verkoopstation",
        emoji: "💰",
        price: 100,
        description: "Verkoopt producten",
    }
};

const PRODUCTS = {
    ore: {
        name: "IJzererts",
        emoji: "🟤",
        value: 5
    },
    crystal: {
        name: "Kristal",
        emoji: "💎",
        value: 16
    },
    stone: {
        name: "Steen",
        emoji: "🪨",
        value: 4
    },
    metal: {
        name: "Metaal",
        emoji: "🔩",
        value: 18
    },
    plate: {
        name: "Metalen plaat",
        emoji: "🟫",
        value: 27
    },
    gear: {
        name: "Tandwiel",
        emoji: "⚙️",
        value: 38
    },
    circuit: {
        name: "Circuit",
        emoji: "🔌",
        value: 55
    }
};

const PROCESSORS = {
    smelter: {
        ore: "metal"
    },
    crusher: {
        ore: "stone"
    },
    press: {
        metal: "plate"
    },
    assembler: {
        metal: "gear",
        crystal: "circuit"
    }
};

const grid = document.getElementById("factoryGrid");
const menu = document.getElementById("buildingMenu");

function createGrid() {
    cells = [];
    items = [];
    grid.innerHTML = "";

    for (let y = 0; y < HEIGHT; y++) {
        cells[y] = [];

        for (let x = 0; x < WIDTH; x++) {
            const cell = {
                x,
                y,
                building: null,
                cooldown: 0
            };

            cells[y][x] = cell;

            const element = document.createElement("div");
            element.className = "cell empty";
            element.dataset.x = x;
            element.dataset.y = y;

            element.addEventListener("click", () => {
                handleCellClick(x, y);
            });

            element.addEventListener("contextmenu", event => {
                event.preventDefault();
                removeBuilding(x, y);
            });

            grid.appendChild(element);
        }
    }

    renderGrid();
}

function createBuildingMenu() {
    menu.innerHTML = "";

    for (const [id, building] of Object.entries(BUILDINGS)) {
        const button = document.createElement("button");
        button.className = "building-button";
        button.dataset.building = id;

        button.innerHTML = `
            <span class="building-emoji">${building.emoji}</span>
            <span class="building-info">
                <strong>${building.name}</strong>
                <small>${building.description}</small>
            </span>
            <span class="building-price">€${building.price}</span>
        `;

        button.addEventListener("click", () => {
            selectBuilding(id);
        });

        menu.appendChild(button);
    }
}

function selectBuilding(id) {
    selectedBuilding = id;

    document.querySelectorAll(".building-button").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.building === id
        );
    });

    const building = BUILDINGS[id];

    document.getElementById("selectedText").textContent =
        `${building.emoji} ${building.name} geselecteerd — klik op een vakje`;

    showToast(`${building.name} geselecteerd`);
}

function cancelSelection() {
    selectedBuilding = null;

    document.querySelectorAll(".building-button").forEach(button => {
        button.classList.remove("selected");
    });

    document.getElementById("selectedText").textContent =
        "Selecteer een gebouw om te beginnen";
}

function handleCellClick(x, y) {
    const cell = cells[y][x];

    if (!selectedBuilding) {
        if (cell.building) {
            removeBuilding(x, y);
        }
        return;
    }

    if (cell.building) {
        showToast("Dit vakje is al bezet!");
        return;
    }

    const building = BUILDINGS[selectedBuilding];

    if (money < building.price) {
        showToast("Niet genoeg geld!");
        return;
    }

    money -= building.price;

    cell.building = selectedBuilding;
    cell.cooldown = 0;

    renderGrid();
    updateStats();

    showToast(`${building.name} geplaatst!`);
}

function removeBuilding(x, y) {
    const cell = cells[y][x];

    if (!cell || !cell.building) return;

    const id = cell.building;
    const refund = Math.floor(BUILDINGS[id].price * 0.5);

    cell.building = null;
    cell.cooldown = 0;

    items = items.filter(item => !(item.x === x && item.y === y));

    money += refund;

    renderGrid();
    updateStats();

    showToast(`Gebouw verwijderd. €${refund} teruggekregen.`);
}

function renderGrid() {
    const elements = grid.children;

    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const cell = cells[y][x];
            const element = elements[y * WIDTH + x];

            element.className = "cell";
            element.innerHTML = "";

            if (!cell.building) {
                element.classList.add("empty");
            } else {
                const building = BUILDINGS[cell.building];

                element.classList.add(cell.building);

                const emoji = document.createElement("span");
                emoji.className = "cell-emoji";
                emoji.textContent = building.emoji;

                const name = document.createElement("span");
                name.className = "cell-name";
                name.textContent = building.name;

                element.appendChild(emoji);
                element.appendChild(name);
            }
        }
    }

    for (const item of items) {
        const element = elements[item.y * WIDTH + item.x];

        if (!element) continue;

        const product = PRODUCTS[item.product];

        const itemElement = document.createElement("span");
        itemElement.className = "item";
        itemElement.textContent = product.emoji;

        element.appendChild(itemElement);
    }

    document.getElementById("buildingCount").textContent =
        `${cells.flat().filter(cell => cell.building).length} geplaatst`;

    document.getElementById("itemsMoving").textContent =
        `${items.length} producten`;
}

function createItem(x, y, product) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return false;

    const target = cells[y][x];

    if (!target.building) return false;

    if (items.some(item => item.x === x && item.y === y)) {
        return false;
    }

    items.push({
        x,
        y,
        product
    });

    return true;
}

// ============================================
// PRODUCTIE
// ============================================

function produceItems(delta) {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const cell = cells[y][x];

            if (!cell.building) continue;

            const building = BUILDINGS[cell.building];

            if (!building.output) continue;

            cell.cooldown += delta;

            if (cell.cooldown >= building.interval) {
                const made = createItem(
                    x + 1,
                    y,
                    building.output
                );

                if (made) {
                    cell.cooldown = 0;
                    lastProduction++;
                }
            }
        }
    }
}

// ============================================
// TRANSPORTBANDEN EN VERWERKING
// ============================================

function moveItems() {
    // Eerst de meest rechtse producten verplaatsen.
    items.sort((a, b) => b.x - a.x);

    for (const item of [...items]) {
        const currentCell = cells[item.y][item.x];

        if (!currentCell || !currentCell.building) continue;

        const buildingType = currentCell.building;

        // Verwerk producten zodra ze op een machine staan.
        if (PROCESSORS[buildingType]) {
            const recipe = PROCESSORS[buildingType];

            if (recipe[item.product]) {
                item.product = recipe[item.product];
            }
        }

        // Verkoopstation.
        if (buildingType === "seller") {
            sellItem(item);
            continue;
        }

        // Opslag laat producten gewoon door.
        const nextX = item.x + 1;

        if (nextX >= WIDTH) continue;

        const nextCell = cells[item.y][nextX];

        // Producten bewegen alleen naar een geplaatst gebouw.
        if (!nextCell.building) continue;

        const occupied = items.some(other =>
            other !== item &&
            other.x === nextX &&
            other.y === item.y
        );

        if (occupied) continue;

        item.x = nextX;
    }

    // Verwijder producten die verkocht zijn.
    items = items.filter(item => !item.sold);
}

function sellItem(item) {
    const product = PRODUCTS[item.product];

    if (!product) return;

    money += product.value;
    sold++;
    totalSales += product.value;

    lastSale = `+€${product.value} (${product.name})`;

    item.sold = true;

    updateStats();
}

// ============================================
// GELD EN STATISTIEKEN
// ============================================

function updateStats() {
    document.getElementById("money").textContent =
        `€${money.toLocaleString("nl-NL")}`;

    document.getElementById("sold").textContent =
        sold.toLocaleString("nl-NL");

    document.getElementById("production").textContent =
        `${lastProduction}/min`;

    document.getElementById("lastSale").textContent = lastSale;

    document.getElementById("buildingCount").textContent =
        `${cells.flat().filter(cell => cell.building).length} geplaatst`;

    document.getElementById("itemsMoving").textContent =
        `${items.length} producten`;
}

// ============================================
// OPSLAAN EN LADEN
// ============================================

function saveGame() {
    const data = {
        money,
        sold,
        totalSales,
        lastSale,
        cells: cells.map(row =>
            row.map(cell => ({
                building: cell.building
            }))
        ),
        items
    };

    try {
        localStorage.setItem("factoryWorldSave", JSON.stringify(data));
        showToast("Game opgeslagen!");
    } catch (error) {
        showToast("Opslaan is niet gelukt.");
        console.error(error);
    }
}

function loadGame() {
    const saved = localStorage.getItem("factoryWorldSave");

    if (!saved) return false;

    try {
        const data = JSON.parse(saved);

        if (
            !data ||
            !Array.isArray(data.cells) ||
            data.cells.length !== HEIGHT
        ) {
            return false;
        }

        money = Number(data.money) || 0;
        sold = Number(data.sold) || 0;
        totalSales = Number(data.totalSales) || 0;
        lastSale = data.lastSale || "Nog niets verkocht";

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const savedCell = data.cells[y]?.[x];

                cells[y][x].building =
                    savedCell && BUILDINGS[savedCell.building]
                        ? savedCell.building
                        : null;

                cells[y][x].cooldown = 0;
            }
        }

        items = Array.isArray(data.items)
            ? data.items.filter(item =>
                Number.isInteger(item.x) &&
                Number.isInteger(item.y) &&
                item.x >= 0 &&
                item.x < WIDTH &&
                item.y >= 0 &&
                item.y < HEIGHT &&
                PRODUCTS[item.product] &&
                cells[item.y][item.x].building
            ).map(item => ({
                x: item.x,
                y: item.y,
                product: item.product
            }))
            : [];

        renderGrid();
        updateStats();

        return true;
    } catch (error) {
        console.error("Save laden mislukt:", error);
        return false;
    }
}

function resetGame() {
    const confirmed = confirm(
        "Weet je zeker dat je een nieuwe fabriek wilt beginnen? Je opgeslagen game wordt verwijderd."
    );

    if (!confirmed) return;

    localStorage.removeItem("factoryWorldSave");

    money = 500;
    sold = 0;
    totalSales = 0;
    lastSale = "Nog niets verkocht";
    lastProduction = 0;

    cancelSelection();
    createGrid();
    updateStats();

    showToast("Nieuwe fabriek gestart!");
}

// ============================================
// MELDINGEN
// ============================================

let toastTimeout;

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 1800);
}

// ============================================
// GAME LOOP
// ============================================

let lastMove = 0;
let lastProductionReset = Date.now();

function gameLoop() {
    const now = Date.now();

    if (now - lastMove >= 550) {
        moveItems();
        renderGrid();
        lastMove = now;
    }

    produceItems(100);

    if (now - lastProductionReset >= 60000) {
        lastProduction = 0;
        lastProductionReset = now;
        updateStats();
    }

    requestAnimationFrame(gameLoop);
}

// ============================================
// KNOPPEN
// ============================================

document.getElementById("cancelButton").addEventListener(
    "click",
    cancelSelection
);

document.getElementById("saveButton").addEventListener(
    "click",
    saveGame
);

document.getElementById("resetButton").addEventListener(
    "click",
    resetGame
);

// ============================================
// START GAME
// ============================================

createBuildingMenu();
createGrid();

if (loadGame()) {
    showToast("Welkom terug in je fabriek!");
}

updateStats();
requestAnimationFrame(gameLoop);
