import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { doc, getDoc, getDocs, setDoc, writeBatch, collection, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { TILES, EQUIPS, RECIPES, REMOVE_TOOL, EDIT_TOOL, TILE_BY_ID, ITEM_BY_ID } from "./data.js";
import { auth, db } from "./firebase.js";
import { burst, syncRanges } from "./fx.js";
import { initTrade, getTradeId, isSaveBlocked, resetTrade, resumeTrade, onTradeScreenShown } from "./trade.js";

// =====================================================================
//  SETTINGS: change these numbers to tune the game
// =====================================================================

// Chopsticks: a click upgrade (each one makes every click worth +1 more)
const CHOPSTICKS_BASE_COST = 10;
const PRICE_GROWTH = 1.15; // each one you own makes the next 15% more expensive

// The factory grid
const COLS = 8;
const ROWS = 6;
const CELL = 56;           // size of one square, in canvas pixels
// Draw at 2x (3x on very sharp big screens) so it stays crisp. On a phone the factory is shown smaller than
// its real size, so 2x is just as sharp there and has much fewer pixels to paint.
const RES = Math.min(window.innerWidth < 700 ? 2 : 3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
const CELLS = COLS * ROWS; // squares on one factory floor

// Chopping tables: little factories inside a factory (they can hold more chopping tables, forever)
const TABLE_ID = 'chopping_table';
const MAX_SAVE_CHARS = 900000; // a Firestore document can hold about 1 million characters

// How the sushi moves
const SPEED = 1.5;         // squares per second
const SPAWN_EVERY = 2;     // seconds between sushi from one rice cooker
const MAX_SUSHI = 80;      // safety limit so the page never gets slow (normal sushi, per floor)
const MAX_SPECIAL = 1000;  // the same for the spectacular sushi from chopping tables. They have their own, much bigger
                           // limit, so a floor full of tables never runs out of room and skips sushi.
const LITE_AFTER = 40;     // with more spectacular sushi than this on the floor you are watching, they are drawn simpler
const COMPLETE_BOOST = 2;  // a rice ball that meets a fish becomes complete sushi: its value is multiplied by this
const MAX_AGE = 60;        // sushi older than this many seconds disappears (stops endless loops)
const TABLE_EVERY = 1;     // a chopping table sends out one spectacular sushi every second (everything it sold since, packed together)

// The anvil: a one-time unlock in the shop
const ANVIL_COST = 100000000; // 100 million
const MAX_PER_KIND = 9999; // most of one tile you can own

// The inventory: slots like in Minecraft. The first 9 slots are the hotbar.
const INV_SLOTS = 36;      // 4 rows of 9
const HOTBAR = 9;
const MAX_STACK = 999;     // most items in one slot

// The special chopping table slot (next to the hotbar in the factory, it appears once you own a chopping table).
// A table that sits in it works by itself, no placing needed: whatever its inside sells over the last
// PROFIT_WINDOW seconds is its profit per second. Profit / TABLE_PROFIT_DIVIDE multiplies everything your
// normal factory sells (never less than x1, so the slot can only help you).
const TABLE_PROFIT_DIVIDE = 100;
const PROFIT_WINDOW = 10;  // seconds

// Player name and screen size (the game is drawn 20% smaller by default)
const MAX_NAME = 14;
const DEFAULT_SCALE = 80;  // percent
const MIN_SCALE = 50;
const MAX_SCALE = 150;

// Directions: 0 = right, 1 = down, 2 = left, 3 = up
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
const ARROWS = ['→', '↓', '←', '↑'];

// =====================================================================
//  GAME STATE
// =====================================================================
let points = 0;
let chopsticks = 0;      // how many Chopsticks you own
let rootLayer = null;    // the main factory (a "layer": see newLayer)
let viewPath = [];       // the chopping tables you are inside, outermost first. [] = the main factory
let viewOrigin = 'factory'; // where "Leave table" goes back to: 'factory' or 'inventory'
let editMode = false;    // true while the Edit tool is selected
let inventory = [];      // INV_SLOTS slots, each null or { id, n }. Slots 0-8 are the hotbar.
                         // A chopping table slot also has table: its inside (a "layer", see newLayer)
let anvil = false;       // true once you unlocked the anvil
let tableSlot = null;    // the special chopping table slot: null or { id, n: 1, table } (see putInTableSlot)
let tableLog = [];       // what the table in that slot sold lately: { t, v }, used for its profit per second
let buyAmount = 1;       // the shop buys this many at a time
let salesLog = [];       // recent sales, used to show "per second"

let hotbarSel = 0;        // which hotbar slot (0-8) is selected
let removeMode = false;  // true while the Remove tool is selected
let invSel = null;       // the slot you picked up (a slot address, see getSlotAt)
let anvilIn = [null, null]; // the two input slots of the Anvil
let playerName = '';     // your username
let rotation = 0;        // the direction new belts / rice cookers will face
let hover = null;        // the square the mouse is over

let currentUser = null;  // set only after the player's data has loaded
let unsaved = false;     // true when there are changes not yet in Firestore
let displayDirty = true; // true when the numbers on screen need refreshing

let weirdDeclined = false; // you said "Stop the weirdness": we don't ask again until the diamonds are gone
let weirdBusy = false;     // true while the weirdness popup or event is on screen
let weirdTimers = [];      // the timeouts of the event, so they can be cancelled


function emptyGrid() {
    return new Array(CELLS).fill(null);
}

// A "layer" is one factory floor: the main factory, or the inside of a chopping table.
//   grid:    COLS * ROWS squares, each null or { kind, dir, mods, table }
//            (table is only on chopping tables: it is the layer inside that table)
//   sushi, timers, effects: what is going on on this floor right now (these are never saved)
//   inner:   true when this floor is the inside of a chopping table (set by runFactory)
//   bank:    what the inside of a table sold since it last sent a sushi out (sales in a table are not paid
//            directly: they are packed into the table's next sushi)
//   pulses:  when each table last sent a sushi (for the little flash)
function newLayer() {
    return { grid: emptyGrid(), sushi: [], timers: {}, effects: [], inner: false, bank: 0, pulses: {}, nSpecial: 0 };
}

// The floor you are looking at: the main factory, or the inside of the table you opened
function viewLayer() {
    return viewPath.length > 0 ? viewPath[viewPath.length - 1] : rootLayer;
}

// Copies a floor and everything inside it (also the tables inside the tables...).
// It loops instead of calling itself, so a table inside a table inside a table... never runs out of stack.
function cloneLayer(layer) {
    const copy = newLayer();
    const todo = [[layer, copy]];
    while (todo.length > 0) {
        const pair = todo.pop();
        for (let i = 0; i < pair[0].grid.length; i++) {
            const cell = pair[0].grid[i];
            if (cell) {
                const cellCopy = { kind: cell.kind, dir: cell.dir, mods: cell.mods.slice() };
                if (cell.table) {
                    cellCopy.table = newLayer();
                    todo.push([cell.table, cellCopy.table]);
                }
                pair[1].grid[i] = cellCopy;
            }
        }
    }
    return copy;
}

// Is "target" this floor, or somewhere inside it? (Used so a table can never go inside itself.)
function layerContains(layer, target) {
    const todo = [layer];
    while (todo.length > 0) {
        const floor = todo.pop();
        if (floor === target) {
            return true;
        }
        for (const cell of floor.grid) {
            if (cell && cell.table) {
                todo.push(cell.table);
            }
        }
    }
    return false;
}

// How many pieces are on this floor, counting the ones inside tables too
function countPieces(layer) {
    let n = 0;
    const todo = [layer];
    while (todo.length > 0) {
        const floor = todo.pop();
        for (const cell of floor.grid) {
            if (cell) {
                n = n + 1;
                if (cell.table) {
                    todo.push(cell.table);
                }
            }
        }
    }
    return n;
}

function emptyInventory() {
    return new Array(INV_SLOTS).fill(null);
}

function resetGame() {
    points = 0;
    chopsticks = 0;
    anvil = false;
    tableSlot = null;
    tableLog = [];
    hotbarSel = 0;
    removeMode = false;
    invSel = null;
    anvilIn = [null, null];
    inventory = emptyInventory();
    rootLayer = newLayer();
    viewPath = [];
    viewOrigin = 'factory';
    editMode = false;
    cancelWeird();
    salesLog = [];
    displayDirty = true;
}
resetGame();

// =====================================================================
//  MATHS
// =====================================================================
// Big numbers get a letter: 1,474,879 -> "1.47M". Below one million we
// show the whole number with commas, like before.
const SUFFIXES = ['M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
                  'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];

// Returns the shortened text, or null when the number is too small to shorten
function abbreviate(number) {
    if (!(number >= 1000000)) return null;
    // How many groups of 3 digits are there above the first million?
    let group = Math.floor(Math.log10(number) / 3) - 2;      // 0 = M, 1 = B, ...
    if (group >= SUFFIXES.length) {
        // Bigger than the last letter: 1.23e66 (so the number never gets longer than the screen)
        if (!isFinite(number)) return '∞';
        const exponent = Math.floor(Math.log10(number));
        const mantissa = Math.floor(number / Math.pow(10, exponent) * 100) / 100;
        return String(mantissa) + 'e' + exponent;
    }
    let scaled = number / Math.pow(1000, group + 2);
    // Cut off (don't round) to 2 decimals, so 999,999,999 never shows as "1000M"
    scaled = Math.floor(scaled * 100) / 100;
    // Safety net for floating point: 1000M should become 1B
    if (scaled >= 1000 && group < SUFFIXES.length - 1) {
        group++;
        scaled = 1;
    }
    return String(scaled) + SUFFIXES[group];                  // 1.5 -> "1.5M", 2 -> "2M"
}

function format(number) {
    const short = abbreviate(number);
    if (short) return short;
    return Math.floor(number).toLocaleString('en-US'); // 12345.7 -> "12,345"
}

// The exact number with commas, for tooltips: 1474879 -> "1,474,879"
function formatFull(number) {
    return Math.floor(number).toLocaleString('en-US');
}

// For small numbers like 0.5: shows up to 2 decimals, no trailing zeros
function formatRate(number) {
    const short = abbreviate(number);
    if (short) return short;
    const rounded = Math.round(number * 100) / 100;
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Every click is worth your chopsticks PLUS a share of what your factory makes per second:
// the bigger your factory, the more a click gives. (0.1 = one click is worth 10% of a second of factory income.)
const CLICK_FACTORY_SHARE = 0.1;

function clickPower() {
    return 1 + chopsticks + pointsPerSecond() * CLICK_FACTORY_SHARE;
}

function chopsticksCost() {
    return Math.ceil(CHOPSTICKS_BASE_COST * Math.pow(PRICE_GROWTH, chopsticks));
}

// Everything you own, counted per kind: in the inventory plus placed on the factory.
// Pieces inside chopping tables count too (whether the table is in your bag or placed).
function ownedTotals() {
    const totals = {};
    const floors = [rootLayer];
    for (const s of inventory.concat([tableSlot])) { // (the special table slot counts too)
        if (s) {
            totals[s.id] = (totals[s.id] || 0) + s.n;
            if (s.table) {
                floors.push(s.table);
            }
        }
    }
    while (floors.length > 0) {
        const floor = floors.pop();
        for (const cell of floor.grid) {
            if (cell) {
                totals[cell.kind] = (totals[cell.kind] || 0) + 1;
                if (cell.table) {
                    floors.push(cell.table);
                }
            }
        }
    }
    return totals;
}

function ownedCount(kind) {
    return ownedTotals()[kind] || 0;
}

// ---- Inventory slots. Every helper takes the slot list, so it also works on a copy.
function countInSlots(slots, id) {
    let n = 0;
    for (const s of slots) {
        if (s && s.id === id) {
            n = n + s.n;
        }
    }
    return n;
}

// withTables = false: the copy shares the chopping tables with the original (fine when
// you only want to check if something fits, because that never changes a table)
function cloneSlots(slots, withTables) {
    return slots.map(function (s) {
        if (!s) {
            return null;
        }
        const copy = { id: s.id, n: s.n };
        if (s.table) {
            copy.table = withTables === false ? s.table : cloneLayer(s.table);
        }
        return copy;
    });
}

// How many fit in one slot: 999 for most things, 1 for a chopping table (it never stacks)
function stackMax(id) {
    const def = ITEM_BY_ID[id];
    return def && def.stackMax ? def.stackMax : MAX_STACK;
}

// Is there room for n more of this item?
function roomFor(slots, id, n) {
    const max = stackMax(id);
    let room = 0;
    for (const s of slots) {
        if (!s) {
            room = room + max;
        } else if (s.id === id) {
            room = room + max - s.n;
        }
    }
    return room >= n;
}

// Adds n items: tops up existing stacks first, then uses the first empty slots.
// All or nothing: returns false (and changes nothing) when there is no room.
// "table" is for chopping tables only: the inside to give it (a new empty table if you leave it out).
function addToSlots(slots, id, n, table) {
    if (!roomFor(slots, id, n)) {
        return false;
    }
    const max = stackMax(id);
    for (const s of slots) {
        if (n > 0 && s && s.id === id && s.n < max) {
            const add = Math.min(n, max - s.n);
            s.n = s.n + add;
            n = n - add;
        }
    }
    for (let i = 0; i < slots.length && n > 0; i++) {
        if (!slots[i]) {
            const add = Math.min(n, max);
            slots[i] = { id: id, n: add };
            if (id === TABLE_ID) {
                slots[i].table = table || newLayer();
                table = null; // every other table gets its own new inside
            }
            n = n - add;
        }
    }
    return true;
}

// Uses up one item from a slot (placing a piece)
function useFromSlot(i) {
    inventory[i].n = inventory[i].n - 1;
    if (inventory[i].n <= 0) {
        inventory[i] = null;
    }
}

// Slot addresses: 0-35 are inventory slots, 36 and 37 are the two Anvil input slots.
function getSlotAt(address) {
    return address < INV_SLOTS ? inventory[address] : anvilIn[address - INV_SLOTS];
}

function setSlotAt(address, value) {
    if (address < INV_SLOTS) {
        inventory[address] = value;
    } else {
        anvilIn[address - INV_SLOTS] = value;
    }
}

// Moves things between two slots, like in Minecraft:
// empty slot = move, same item = merge, different item = swap.
// one = true moves just a single item (right click).
function moveSlot(from, to, one) {
    if (from === to || !getSlotAt(from)) {
        return;
    }
    const a = getSlotAt(from);
    const b = getSlotAt(to);
    const single = stackMax(a.id) === 1; // a chopping table: always moves as a whole, never merges

    if (one && !single) {
        if (!b) {
            setSlotAt(to, { id: a.id, n: 1 });
        } else if (b.id === a.id && b.n < MAX_STACK) {
            b.n = b.n + 1;
        } else {
            return; // can't put one onto a different item
        }
        a.n = a.n - 1;
        if (a.n <= 0) {
            setSlotAt(from, null);
        }
    } else if (!b) {
        setSlotAt(to, a);
        setSlotAt(from, null);
    } else if (b.id === a.id && !single) {
        const moved = Math.min(MAX_STACK - b.n, a.n);
        b.n = b.n + moved;
        a.n = a.n - moved;
        if (a.n <= 0) {
            setSlotAt(from, null);
        }
    } else {
        setSlotAt(from, b);
        setSlotAt(to, a);
    }
    unsaved = true;
    displayDirty = true;
    saveSoon();
}

// Whatever is lying in the Anvil goes back to the inventory
function stowAnvil() {
    for (let k = 0; k < anvilIn.length; k++) {
        const s = anvilIn[k];
        if (s && addToSlots(inventory, s.id, s.n, s.table)) {
            anvilIn[k] = null;
            unsaved = true;
            displayDirty = true;
        }
    }
}

// The inventory as it is saved: items still in the Anvil are counted in
function inventoryForSave() {
    const copy = cloneSlots(inventory, false); // only used to save, so the tables don't need copying
    for (const s of anvilIn) {
        if (s) {
            addToSlots(copy, s.id, s.n, s.table);
        }
    }
    return copy;
}

// Price of the next piece of this kind. More pieces owned = more expensive.
function toolCost(def) {
    return Math.ceil(def.baseCost * Math.pow(def.growth, ownedCount(def.id)));
}

// Price of buying "amount" pieces in a row (ownedNow: how many you own, if you already counted)
function priceFor(def, amount, ownedNow) {
    const owned = ownedNow === undefined ? ownedCount(def.id) : ownedNow;
    let total = 0;
    for (let i = 0; i < amount; i++) {
        total = total + Math.ceil(def.baseCost * Math.pow(def.growth, owned + i));
    }
    return total;
}

// Sales in the last 10 seconds, averaged to "points per second"
function pointsPerSecond() {
    const now = performance.now() / 1000;
    let total = 0;
    for (const sale of salesLog) {
        if (now - sale.t <= 10) {
            total = total + sale.v;
        }
    }
    return total / 10;
}

// ---- The special chopping table slot
// The floor inside the table that sits in the special slot (null if the slot is empty)
function putInTableSlot(value) {
    tableSlot = value;
    tableLog = []; // a different table starts counting its profit from zero
}

function slotLayer() {
    return tableSlot && tableSlot.table ? tableSlot.table : null;
}

// What the table in the special slot earns per second (what its inside sold in the last PROFIT_WINDOW seconds)
function tableProfitPerSecond() {
    const now = performance.now() / 1000;
    let total = 0;
    for (const sale of tableLog) {
        if (now - sale.t <= PROFIT_WINDOW) {
            total = total + sale.v;
        }
    }
    return total / PROFIT_WINDOW;
}

// How many times more your normal factory sells for: profit / 100, but never below 1
function tableBoost() {
    if (!tableSlot) {
        return 1;
    }
    return Math.max(1, tableProfitPerSecond() / TABLE_PROFIT_DIVIDE);
}

// =====================================================================
//  SCREENS
// =====================================================================
let currentScreen = 'loading-screen';
let settingsReturn = 'menu-screen'; // where the Back button in Settings goes

function showScreen(screenId) {
    if (currentScreen === 'anvil-screen' && screenId !== 'anvil-screen') {
        stowAnvil();
    }
    if (screenId === 'settings-screen' && currentScreen !== 'settings-screen') {
        settingsReturn = currentScreen;
    }
    currentScreen = screenId;
    invSel = null;
    // You stay inside a table while you visit the Shop or the Inventory, but not on other screens
    if (screenId !== 'game-screen' && screenId !== 'shop-screen' && screenId !== 'inventory-screen') {
        viewPath = [];
        viewOrigin = 'factory';
    }
    const screens = document.querySelectorAll('.screen');
    for (const screen of screens) {
        screen.classList.add('hidden');
    }
    document.getElementById(screenId).classList.remove('hidden');
    if (screenId === 'settings-screen') {
        fillSettings();
        syncRanges();
    }
    if (screenId === 'leaderboard-screen') {
        loadLeaderboard(false);
    }
    if (screenId === 'trade-screen') {
        onTradeScreenShown();
    }
    playMusicFor(screenId);
    updateDisplay();
    if (screenId === 'game-screen') {
        setTimeout(checkWeirdness, 350); // a factory full of diamonds is weird
    }
}

// =====================================================================
//  THE HOTBAR (the first 9 inventory slots) + Remove and Rotate
// =====================================================================
const hotbarParts = [];  // one { button, emoji, count } per hotbar slot
let removeButton = null;
let editButton = null;

function buildToolbar() {
    const hotbar = document.getElementById('hotbar');
    for (let i = 0; i < HOTBAR; i++) {
        const button = document.createElement('button');
        button.className = 'slot';
        button.innerHTML =
            '<span class="slot-key">' + (i + 1) + '</span>' +
            '<span class="slot-emoji"></span>' +
            '<span class="slot-count"></span>';
        button.addEventListener('click', function () {
            selectHotbar(i);
        });
        hotbar.appendChild(button);
        hotbarParts.push({
            button: button,
            emoji: button.querySelector('.slot-emoji'),
            count: button.querySelector('.slot-count')
        });
    }

    const bar = document.getElementById('tool-buttons');

    removeButton = document.createElement('button');
    removeButton.className = 'tool';
    removeButton.title = REMOVE_TOOL.hint;
    removeButton.innerHTML =
        '<span class="tool-emoji">' + REMOVE_TOOL.emoji + '</span>' +
        '<span class="tool-name">Remove</span>' +
        '<span class="tool-cost">take back</span>';
    removeButton.addEventListener('click', function () {
        removeMode = !removeMode;
        editMode = false;
        displayDirty = true;
    });
    bar.appendChild(removeButton);

    editButton = document.createElement('button');
    editButton.className = 'tool';
    editButton.title = EDIT_TOOL.hint;
    editButton.innerHTML =
        '<span class="tool-emoji">' + EDIT_TOOL.emoji + '</span>' +
        '<span class="tool-name">Edit</span>' +
        '<span class="tool-cost">open table</span>';
    editButton.addEventListener('click', function () {
        editMode = !editMode;
        removeMode = false;
        displayDirty = true;
    });
    bar.appendChild(editButton);

    const rotate = document.createElement('button');
    rotate.className = 'tool';
    rotate.id = 'rotate-btn';
    rotate.title = 'Turn belts and rice cookers (shortcut: R)';
    rotate.innerHTML =
        '<span class="tool-emoji" id="rotate-arrow">→</span>' +
        '<span class="tool-name">Rotate</span>' +
        '<span class="tool-cost">R</span>';
    rotate.addEventListener('click', rotatePieces);
    bar.appendChild(rotate);
}
buildToolbar();

function selectHotbar(i) {
    hotbarSel = i;
    removeMode = false;
    editMode = false;
    displayDirty = true;
}

// ---- Going inside chopping tables
// From the factory: the table you clicked becomes the floor you look at
function enterTable(layer) {
    if (viewPath.length === 0) {
        viewOrigin = 'factory';
    }
    viewPath.push(layer);
    hover = null;
    displayDirty = true;
}

// From the Inventory: edit a table that is in your bag
function openTableFromInventory(layer) {
    viewPath = [layer];
    viewOrigin = 'inventory';
    hover = null;
    showScreen('game-screen');
}

function leaveTable() {
    if (viewPath.length === 0) {
        return;
    }
    viewPath.pop();
    hover = null;
    displayDirty = true;
    if (viewPath.length === 0 && viewOrigin === 'inventory') {
        viewOrigin = 'factory';
        showScreen('inventory-screen');
    }
}

// The bar above the factory while you are inside a table: where you are, and the way back
function updateTableBar() {
    const inside = viewPath.length > 0;
    document.getElementById('table-bar').classList.toggle('hidden', !inside);
    document.querySelector('.factory').classList.toggle('in-table', inside);
    document.getElementById('factory-title').innerText = inside ? '🔪 Chopping Table' : 'Sushi Factory';
    if (!inside) {
        return;
    }
    const depth = viewPath.length;
    let trail = viewOrigin === 'inventory' ? '🎒 Inventory' : '🏭 Factory';
    const shown = Math.min(depth, 3);
    trail = trail + (depth > shown ? ' › …' : '');
    for (let i = 0; i < shown; i++) {
        trail = trail + ' › 🔪 Table';
    }
    document.getElementById('table-trail').innerText = trail + ' (depth ' + depth + ')';
    document.getElementById('table-back').innerText =
        depth === 1 && viewOrigin === 'inventory' ? '⬅ Back to Inventory' : '⬅ Leave table';
}

function rotatePieces() {
    rotation = (rotation + 1) % 4;
    displayDirty = true;
}

// Keys: R rotates, 1-9 pick a hotbar slot (only while you're in the game)
document.addEventListener('keydown', function (event) {
    const inGame = !document.getElementById('game-screen').classList.contains('hidden');
    if (!inGame) {
        return;
    }
    if (event.key === 'Escape' && !weirdBusy) {
        leaveTable();
    } else if (event.key === 'r' || event.key === 'R') {
        rotatePieces();
    } else if (event.key >= '1' && event.key <= '9') {
        selectHotbar(Number(event.key) - 1);
    }
});

// Draws one inventory slot (used by the hotbar and the inventory screen)
function paintSlot(parts, stack) {
    const def = stack ? ITEM_BY_ID[stack.id] : null;
    parts.emoji.innerText = def ? def.emoji : '';
    parts.count.innerText = stack && stack.n > 1 ? String(stack.n) : '';
    parts.button.classList.toggle('golden', !!(def && def.golden));
    parts.button.classList.toggle('woody', !!(def && def.editable));
    parts.button.title = def ? def.name + (stack.n > 1 ? ' x' + stack.n : '') : 'Empty slot';
}

// A short message under the factory ("Need 20 points...")
let messageTimer = null;
function showMessage(text) {
    const box = document.getElementById('factory-message');
    box.innerText = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(function () {
        box.innerText = '';
    }, 2500);
}

// =====================================================================
//  SHOWING NUMBERS ON THE PAGE
// =====================================================================
function updateDisplay() {
    document.getElementById('score').innerText = format(points);
    // A long number gets a smaller font, so it always fits next to the factory
    const scoreLength = document.getElementById('score').innerText.length;
    document.getElementById('score').style.fontSize = scoreLength > 7
        ? 'calc(clamp(3.5rem, 16vw, 5rem) * ' + Math.max(0.4, 7 / scoreLength).toFixed(3) + ')'
        : '';
    document.getElementById('score').title = formatFull(points); // hover to see the exact number
    document.getElementById('per-second').innerText =
        formatRate(pointsPerSecond()) + ' per second, ' + formatRate(clickPower()) + ' per click' +
        (tableSlot ? ', table boost x' + formatRate(tableBoost()) : '');

    // Chopsticks button
    const cost = chopsticksCost();
    document.getElementById('chopsticks-count').innerText = 'x' + chopsticks;
    document.getElementById('chopsticks-cost').innerText = format(cost);
    document.getElementById('chopsticks-btn').disabled = points < cost;

    // Hotbar: the first 9 inventory slots
    for (let i = 0; i < HOTBAR; i++) {
        paintSlot(hotbarParts[i], inventory[i]);
        hotbarParts[i].button.classList.toggle('selected', !removeMode && hotbarSel === i);
    }
    removeButton.classList.toggle('selected', removeMode);
    editButton.classList.toggle('selected', editMode);
    updateTableBar();
    document.getElementById('rotate-arrow').innerText = ARROWS[rotation];
    updateGameTableSlot();

    // What the selected thing does
    const held = inventory[hotbarSel];
    let info = 'Empty slot. Open the Inventory to put something here.';
    if (removeMode) {
        info = REMOVE_TOOL.emoji + ' ' + REMOVE_TOOL.name + ': ' + REMOVE_TOOL.hint;
    } else if (editMode) {
        info = EDIT_TOOL.emoji + ' ' + EDIT_TOOL.name + ': ' + EDIT_TOOL.hint;
    } else if (held) {
        const def = ITEM_BY_ID[held.id];
        info = def.emoji + ' ' + def.name + ': ' + def.hint;
    }
    document.getElementById('held-info').innerText = info;

    document.getElementById('anvil-btn').classList.toggle('hidden', !anvil);
    updateShop();
    updateInventory();
    updateAnvil();
}

// =====================================================================
//  THE SHOP: buy tiles (they go to your inventory) and unlock the anvil
// =====================================================================
const SHOP_TILES = TILES.filter(function (t) { return t.shop !== false; });
const shopRows = {}; // tile id (or 'anvil') -> { sub, button }

function addShopRow(id, emoji, name, hint, onBuy) {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML =
        '<span class="item-emoji">' + emoji + '</span>' +
        '<span class="item-info"><span class="item-name">' + name + '</span>' +
        '<span class="item-sub"></span></span>';
    const button = document.createElement('button');
    button.className = 'item-buy';
    button.addEventListener('click', onBuy);
    row.appendChild(button);
    document.getElementById('shop-list').appendChild(row);
    shopRows[id] = { sub: row.querySelector('.item-sub'), hint: hint, button: button };
}

function buildShop() {
    for (const def of SHOP_TILES) {
        addShopRow(def.id, def.emoji, def.name, def.hint, function () {
            buyTile(def);
        });
    }
    addShopRow('anvil', '⚒️', 'Anvil', 'Unlocks the Anvil: try putting items together', buyAnvil);

    for (const button of document.querySelectorAll('.amount-btn')) {
        button.addEventListener('click', function () {
            buyAmount = Number(button.dataset.amount);
            displayDirty = true;
        });
    }
}

function updateShop() {
    document.getElementById('shop-score').innerText = format(points);
    if (currentScreen !== 'shop-screen') {
        return; // nothing to refresh while the shop is closed
    }
    const owned = ownedTotals();

    for (const button of document.querySelectorAll('.amount-btn')) {
        button.classList.toggle('selected', Number(button.dataset.amount) === buyAmount);
    }

    for (const def of SHOP_TILES) {
        const row = shopRows[def.id];
        const have = owned[def.id] || 0;
        const price = priceFor(def, buyAmount, have);
        const room = roomFor(inventory, def.id, buyAmount);
        row.sub.innerText = def.hint + ' (you own ' + format(have) + ')';
        row.button.innerText = room ? 'Buy ' + buyAmount + ': ' + format(price) : 'Inventory full';
        row.button.disabled = points < price || !room || have + buyAmount > MAX_PER_KIND;
    }

    const anvilRow = shopRows.anvil;
    anvilRow.sub.innerText = anvilRow.hint;
    if (anvil) {
        anvilRow.button.innerText = 'Unlocked ✓';
        anvilRow.button.disabled = true;
    } else {
        anvilRow.button.innerText = 'Unlock: ' + format(ANVIL_COST);
        anvilRow.button.disabled = points < ANVIL_COST;
    }
}

function buyTile(def) {
    const price = priceFor(def, buyAmount);
    if (points < price || ownedCount(def.id) + buyAmount > MAX_PER_KIND) {
        return;
    }
    if (!addToSlots(inventory, def.id, buyAmount)) {
        return; // no room in the inventory
    }
    points = points - price;
    unsaved = true;
    displayDirty = true;
    saveSoon();
}

function buyAnvil() {
    if (anvil || points < ANVIL_COST) {
        return;
    }
    points = points - ANVIL_COST;
    anvil = true;
    unsaved = true;
    displayDirty = true;
    saveSoon();
}

// =====================================================================
//  THE INVENTORY: slots like in Minecraft
// =====================================================================
// Click a stack, then click another slot: empty = move, same item = merge,
// different item = swap. Right-click moves just one. You can also drag.
const invParts = [];       // the inventory screen: one { button, emoji, count } per slot
const anvInvParts = [];    // the same 36 slots, shown on the Anvil screen
const anvilInParts = [];   // the two Anvil input slots
let anvilOutPart = null;   // the Anvil output slot
let dragFrom = null;

function slotClicked(address, one) {
    if (invSel === null) {
        if (getSlotAt(address)) {
            invSel = address;
        }
    } else if (invSel === address) {
        invSel = null;
    } else {
        const from = invSel;
        moveSlot(from, address, one);
        // Right-clicking keeps the stack selected, so you can drop several one by one
        if (!(one && getSlotAt(from))) {
            invSel = null;
        }
    }
    displayDirty = true;
}

// One slot you can click, right-click and drag. address says which slot it is.
function makeSlot(address) {
    // A div, not a button: Firefox can't drag buttons
    const el = document.createElement('div');
    el.className = 'slot';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.draggable = true;
    el.innerHTML = '<span class="slot-emoji"></span><span class="slot-count"></span>';

    el.addEventListener('click', function () {
        slotClicked(address, false);
    });
    el.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        slotClicked(address, true);
    });
    el.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            slotClicked(address, false);
        }
    });

    el.addEventListener('dragstart', function (event) {
        if (!getSlotAt(address)) {
            event.preventDefault();
            return;
        }
        dragFrom = address;
        el.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(address)); // Firefox needs this
    });
    el.addEventListener('dragover', function (event) {
        if (dragFrom !== null) {
            event.preventDefault();
        }
    });
    el.addEventListener('drop', function (event) {
        event.preventDefault();
        if (dragFrom !== null) {
            moveSlot(dragFrom, address, false);
            invSel = null;
            displayDirty = true;
        }
    });
    el.addEventListener('dragend', function () {
        dragFrom = null;
        el.classList.remove('dragging');
    });

    return {
        button: el,
        emoji: el.querySelector('.slot-emoji'),
        count: el.querySelector('.slot-count')
    };
}

// The 36 inventory slots: the first 9 go in the hotbar box, the rest in the bag box
function buildSlotGrid(hotbarBox, bagBox, parts) {
    for (let i = 0; i < INV_SLOTS; i++) {
        const part = makeSlot(i);
        (i < HOTBAR ? hotbarBox : bagBox).appendChild(part.button);
        parts.push(part);
    }
}

function buildInventory() {
    buildSlotGrid(document.getElementById('inv-hotbar'), document.getElementById('inv-bag'), invParts);
}

function paintGrid(parts) {
    for (let i = 0; i < INV_SLOTS; i++) {
        paintSlot(parts[i], inventory[i]);
        parts[i].button.classList.toggle('selected', invSel === i);
    }
}

function updateInventory() {
    if (invSel !== null && !getSlotAt(invSel)) {
        invSel = null; // the picked-up stack is gone
    }
    if (currentScreen !== 'inventory-screen') {
        return; // nothing to refresh while the inventory is closed
    }
    paintGrid(invParts);
    // The trash can lights up while a stack is picked up
    document.getElementById('trash-slot').classList.toggle('ready', invSel !== null && invSel < INV_SLOTS);
    let stock = 0;
    for (let i = 0; i < INV_SLOTS; i++) {
        if (inventory[i]) {
            stock = stock + inventory[i].n;
        }
    }
    const placed = countPieces(rootLayer);
    document.getElementById('inventory-total').innerText =
        format(stock) + (stock === 1 ? ' item' : ' items') + ' in your inventory, ' +
        format(placed) + ' placed in the factory';

    let text = 'Click a stack, then click another slot to move, merge or swap. ' +
        'Right-click moves one item. You can drag too. The top row is your hotbar.';
    const picked = invSel !== null && invSel < INV_SLOTS ? inventory[invSel] : null;
    if (invSel !== null) {
        const stack = getSlotAt(invSel);
        const def = ITEM_BY_ID[stack.id];
        text = def.emoji + ' ' + def.name + (stack.table ? '' : ' x' + stack.n) + ': ' + def.hint;
        if (stack.table) {
            text = text + ' (' + format(countPieces(stack.table)) + ' pieces inside)';
        }
    }
    document.getElementById('inv-info').innerText = text;
    // A chopping table can be edited right here
    document.getElementById('inv-edit-btn').classList.toggle('hidden', !(picked && picked.table));
}

// The same special slot next to the hotbar in the factory. Click it with a chopping table selected
// in the hotbar to put it in; click it when it is filled to take the table back.
const gameTableSlot = document.getElementById('game-table-slot');
const gameTableBtn = document.getElementById('game-table-btn');
const gameTableParts = {
    button: gameTableBtn,
    emoji: gameTableBtn.querySelector('.slot-emoji'),
    count: gameTableBtn.querySelector('.slot-count')
};
let ownsTableCache = false;
let ownsTableAt = -1000;

function updateGameTableSlot() {
    // Looking through every table is a bit of work, so only do it twice a second
    const now = performance.now();
    if (now - ownsTableAt > 500) {
        ownsTableAt = now;
        ownsTableCache = ownedCount(TABLE_ID) > 0;
    }
    const shown = ownsTableCache || !!tableSlot;
    gameTableSlot.classList.toggle('hidden', !shown);
    if (!shown) {
        return;
    }
    paintSlot(gameTableParts, tableSlot);
    gameTableBtn.classList.toggle('active', !!tableSlot);
    gameTableBtn.title = tableSlot
        ? 'Chopping table slot: profit ' + formatRate(tableProfitPerSecond()) + ' per second. Click to take the table back. Edit tool, Shift-click or right-click goes inside it.'
        : 'Chopping table slot: select a chopping table in your hotbar, then click here.';
    document.getElementById('game-table-label').innerText =
        tableSlot ? 'Boost x' + formatRate(tableBoost()) : 'Table slot';
}

function openSlotTable(event) {
    event.preventDefault();
    if (tableSlot && tableSlot.table) {
        enterTable(tableSlot.table);
    }
}
gameTableBtn.addEventListener('contextmenu', openSlotTable);

gameTableBtn.addEventListener('click', function (event) {
    // Edit tool (or Shift-click): go inside the table in the slot
    if (tableSlot && (editMode || event.shiftKey)) {
        openSlotTable(event);
        return;
    }
    if (tableSlot) {
        if (!addToSlots(inventory, TABLE_ID, 1, tableSlot.table)) {
            showMessage('Your inventory is full.');
            return;
        }
        putInTableSlot(null);
    } else {
        const held = inventory[hotbarSel];
        if (!held || held.id !== TABLE_ID) {
            showMessage('Select a chopping table in your hotbar, then click the table slot.');
            return;
        }
        putInTableSlot(held);
        inventory[hotbarSel] = null;
    }
    unsaved = true;
    displayDirty = true;
    saveSoon();
});

document.getElementById('inv-edit-btn').addEventListener('click', function () {
    const stack = invSel !== null && invSel < INV_SLOTS ? inventory[invSel] : null;
    if (stack && stack.table) {
        openTableFromInventory(stack.table);
    }
});
document.getElementById('table-back').addEventListener('click', leaveTable);

// ---- The trash can: throwing something away always asks first
let trashPending = null; // what we are asking about: { address, id, n }

function askTrash(address, one) {
    const stack = address !== null && address < INV_SLOTS ? inventory[address] : null;
    if (!stack) {
        return;
    }
    const def = ITEM_BY_ID[stack.id];
    // A chopping table is always thrown away as a whole (it never stacks)
    const n = one && stackMax(stack.id) !== 1 ? 1 : stack.n;
    trashPending = { address: address, id: stack.id, n: n };

    document.getElementById('trash-emoji').innerText = def.emoji;
    document.getElementById('trash-title').innerText =
        stack.table ? 'Throw away this chopping table?' : 'Throw away ' + format(n) + ' x ' + def.name + '?';
    let text = 'It will be gone for good. You cannot get it back.';
    if (stack.table) {
        text = 'It has ' + format(countPieces(stack.table)) + ' pieces inside, and they go with it. ' + text;
    } else if (n < stack.n) {
        text = 'You keep the other ' + format(stack.n - n) + '. ' + text;
    }
    document.getElementById('trash-detail').innerText = text;
    document.getElementById('trash-popup').classList.remove('hidden');
    document.getElementById('trash-keep').focus(); // Enter keeps it: the safe choice
}

function closeTrash() {
    trashPending = null;
    document.getElementById('trash-popup').classList.add('hidden');
}

function confirmTrash() {
    const ask = trashPending;
    closeTrash();
    if (!ask) {
        return;
    }
    // Check again: it must still be the same stack, with enough in it
    const stack = inventory[ask.address];
    if (!stack || stack.id !== ask.id || stack.n < ask.n) {
        return;
    }
    stack.n = stack.n - ask.n;
    if (stack.n <= 0) {
        inventory[ask.address] = null;
    }
    invSel = null;
    unsaved = true;
    displayDirty = true;
    saveSoon();
}

const trashSlot = document.getElementById('trash-slot');
trashSlot.addEventListener('click', function () {
    askTrash(invSel, false);
});
trashSlot.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    askTrash(invSel, true);
});
trashSlot.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        askTrash(invSel, false);
    }
});
trashSlot.addEventListener('dragover', function (event) {
    if (dragFrom !== null && dragFrom < INV_SLOTS) {
        event.preventDefault();
        trashSlot.classList.add('over');
    }
});
trashSlot.addEventListener('dragleave', function () {
    trashSlot.classList.remove('over');
});
trashSlot.addEventListener('drop', function (event) {
    event.preventDefault();
    trashSlot.classList.remove('over');
    if (dragFrom !== null && dragFrom < INV_SLOTS) {
        askTrash(dragFrom, false);
    }
});

document.getElementById('trash-keep').addEventListener('click', closeTrash);
document.getElementById('trash-yes').addEventListener('click', confirmTrash);
document.getElementById('trash-popup').addEventListener('click', function (event) {
    if (event.target === this) {
        closeTrash(); // clicking outside the box means "keep it"
    }
});
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && trashPending) {
        closeTrash();
    }
});

buildShop();
buildInventory();

// =====================================================================
//  THE ANVIL: two slots. Put items in and see what comes out (like Minecraft).
//  There is no recipe list: players have to work it out themselves.
// =====================================================================
// What do the two input slots make? The order and the slots don't matter, only what
// is in them: the same items as a recipe, at least as many as it needs.
function anvilRecipe() {
    const totals = {};
    for (const s of anvilIn) {
        if (s) {
            totals[s.id] = (totals[s.id] || 0) + s.n;
        }
    }
    const ids = Object.keys(totals);
    if (ids.length === 0) {
        return null;
    }
    for (const recipe of RECIPES) {
        if (recipe.needs.length === ids.length &&
            recipe.needs.every(function (need) { return (totals[need.id] || 0) >= need.n; })) {
            return recipe;
        }
    }
    return null;
}

// Uses up n of an item from the two input slots
function takeFromAnvil(id, n) {
    for (let k = 0; k < anvilIn.length && n > 0; k++) {
        const s = anvilIn[k];
        if (s && s.id === id) {
            const take = Math.min(n, s.n);
            s.n = s.n - take;
            n = n - take;
            if (s.n <= 0) {
                anvilIn[k] = null;
            }
        }
    }
}

// Click the output slot to take what it made. Shift-click makes as many as the inputs allow.
function takeOutput(all) {
    const recipe = anvilRecipe();
    if (!recipe) {
        return;
    }
    let most = 1;
    if (all) {
        most = Infinity;
        for (const need of recipe.needs) {
            let have = 0;
            for (const s of anvilIn) {
                if (s && s.id === need.id) {
                    have = have + s.n;
                }
            }
            most = Math.min(most, Math.floor(have / need.n));
        }
    }
    // If the bag has no room for that many, try fewer
    for (let count = most; count >= 1; count--) {
        const copy = cloneSlots(inventory);
        if (addToSlots(copy, recipe.out, recipe.n * count)) {
            for (const need of recipe.needs) {
                takeFromAnvil(need.id, need.n * count);
            }
            inventory = copy;
            unsaved = true;
            displayDirty = true;
            saveSoon();
            setMessage('anvil-msg', 'You made ' + (recipe.n * count) + ' x ' + ITEM_BY_ID[recipe.out].name + '!', 'good');
            return;
        }
    }
    setMessage('anvil-msg', 'Your inventory is full. Make some room first.', 'bad');
}

function buildAnvil() {
    buildSlotGrid(document.getElementById('anv-hotbar'), document.getElementById('anv-bag'), anvInvParts);

    const inBox = document.getElementById('anvil-in');
    for (let k = 0; k < 2; k++) {
        const part = makeSlot(INV_SLOTS + k);
        inBox.appendChild(part.button);
        anvilInParts.push(part);
    }

    // The output slot: you can only take from it
    const out = document.createElement('div');
    out.className = 'slot output';
    out.setAttribute('role', 'button');
    out.tabIndex = 0;
    out.innerHTML = '<span class="slot-emoji"></span><span class="slot-count"></span>';
    out.addEventListener('click', function (event) {
        takeOutput(event.shiftKey);
    });
    out.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            takeOutput(event.shiftKey);
        }
    });
    document.getElementById('anvil-out').appendChild(out);
    anvilOutPart = {
        button: out,
        emoji: out.querySelector('.slot-emoji'),
        count: out.querySelector('.slot-count')
    };
}

function updateAnvil() {
    paintGrid(anvInvParts);
    for (let k = 0; k < 2; k++) {
        paintSlot(anvilInParts[k], anvilIn[k]);
        anvilInParts[k].button.classList.toggle('selected', invSel === INV_SLOTS + k);
    }
    const recipe = anvilRecipe();
    paintSlot(anvilOutPart, recipe ? { id: recipe.out, n: recipe.n } : null);
    anvilOutPart.button.classList.toggle('ready', !!recipe);
}
buildAnvil();

// =====================================================================
//  ANTI-AUTOCLICKER
// =====================================================================
const MAX_CLICKS_PER_SECOND = 12; // a fast human is around 6-10, so 12 leaves some room
let recentClicks = [];            // when your last few clicks happened

function clickAllowed(event) {
    // Check 1: was this click made by a real mouse, touch or key?
    // A script like button.click() creates a fake event, and isTrusted is false for those.
    if (!event.isTrusted) {
        return false;
    }

    // Check 2: speed limit. Forget clicks older than 1 second, then count what's left.
    const now = performance.now();
    recentClicks = recentClicks.filter(function (time) {
        return now - time < 1000;
    });
    if (recentClicks.length >= MAX_CLICKS_PER_SECOND) {
        return false;
    }

    recentClicks.push(now);
    return true;
}

// =====================================================================
//  CLICKING
// =====================================================================
function pointsButton(event) {
    if (!clickAllowed(event)) {
        return; // ignore this click completely
    }
    const gained = clickPower();
    points = points + gained;
    unsaved = true;
    displayDirty = true;
    floatText(event, gained);
    clickEffects(event);
}

// The sparks, rice grains and the little bump of the big number
function clickEffects(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    burst(x, y, 1 + Math.min(1.1, Math.log10(clickPower()) * 0.25));
    const score = document.getElementById('score');
    score.classList.remove('bump');
    void score.offsetWidth; // restart the animation
    score.classList.add('bump');
}

function buyChopsticks() {
    const cost = chopsticksCost();
    if (points < cost) {
        return;
    }
    points = points - cost;
    chopsticks = chopsticks + 1;
    unsaved = true;
    displayDirty = true;
    saveSoon();
}

// A little "+1" (or "+3"...) that floats up from where you clicked
function floatText(event, amount) {
    const rect = event.currentTarget.getBoundingClientRect();
    // event.clientX is 0 when someone "clicks" with the keyboard, so fall back to the middle
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;

    const bubble = document.createElement('span');
    bubble.className = 'float';
    bubble.innerText = '+' + formatRate(amount);
    bubble.style.left = x + 'px';
    bubble.style.top = (y - 10) + 'px';
    bubble.style.setProperty('--drift', Math.round((Math.random() - 0.5) * 70) + 'px');
    document.body.appendChild(bubble);

    setTimeout(function () {
        bubble.remove();
    }, 900);
}

// =====================================================================
//  BUILDING: placing and removing pieces on the grid
// =====================================================================
function cellAt(layer, x, y) {
    return layer.grid[y * COLS + x];
}

function inGrid(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

// Sushi can enter any piece except a rice cooker or a chopping table (those only send sushi out)
function passable(layer, x, y) {
    if (!inGrid(x, y)) {
        return false;
    }
    const cell = cellAt(layer, x, y);
    return cell !== null && roleOf(cell) !== 'source' && roleOf(cell) !== 'table';
}

function clickSquare(x, y) {
    const layer = viewLayer();
    const index = y * COLS + x;
    const cell = layer.grid[index];

    // Edit tool: go inside a chopping table
    if (editMode) {
        if (cell && cell.table) {
            enterTable(cell.table);
        } else {
            showMessage('Click a chopping table to go inside it.');
        }
        return;
    }

    // Remove tool: upgrades (soy sauce, wasabi...) come off first, the last one put on first
    if (removeMode) {
        if (!cell) {
            return;
        }
        if (cell.mods.length > 0) {
            const last = cell.mods[cell.mods.length - 1];
            if (!addToSlots(inventory, last, 1)) {
                showMessage('Your inventory is full.');
                return;
            }
            cell.mods.pop();
        } else {
            // A chopping table comes back with everything that is inside it
            if (!addToSlots(inventory, cell.kind, 1, cell.table)) {
                showMessage('Your inventory is full.');
                return;
            }
            layer.grid[index] = null;
        }
        unsaved = true;
        displayDirty = true;
        afterBuilding();
        return;
    }

    const stack = inventory[hotbarSel];
    if (!stack) {
        showMessage('Nothing in this slot. Pick another one, or open the Inventory.');
        return;
    }
    const def = ITEM_BY_ID[stack.id];

    // An ingredient: it is used in the Anvil, not in the factory
    if (!TILE_BY_ID[def.id] && !def.applies) {
        showMessage('The ' + def.name.toLowerCase() + ' is an ingredient. It does not go on pieces.');
        return;
    }

    // An equipable item (soy sauce, wasabi...): goes ON a piece you already placed
    if (def.applies) {
        if (!cell) {
            showMessage('Click a piece you already placed to use the ' + def.name.toLowerCase() + ' on it.');
        } else if (!def.applies.includes(roleOf(cell))) {
            showMessage('The ' + def.name.toLowerCase() + " doesn't work on a " + TILE_BY_ID[cell.kind].name.toLowerCase() + '.');
        } else if (cell.mods.includes(def.id)) {
            showMessage('That piece already has ' + def.name.toLowerCase() + ' on it.');
        } else {
            cell.mods.push(def.id);
            useFromSlot(hotbarSel);
            unsaved = true;
            displayDirty = true;
        }
        return;
    }

    // A piece
    if (cell) {
        // Clicking a belt or rice cooker with the same piece turns it
        if (cell.kind === def.id && (def.role === 'belt' || def.role === 'source' || def.role === 'table')) {
            cell.dir = rotation;
            unsaved = true;
        } else {
            showMessage('That square is taken. Use Remove first.');
        }
        return;
    }
    const isTable = def.role === 'table';
    // A chopping table does not go on the main factory: it belongs in the special slot next to the hotbar.
    // (It can still go inside another chopping table.)
    if (isTable && layer === rootLayer) {
        showMessage('Put the chopping table in the special table slot next to the hotbar. It can only be placed inside another table.');
        return;
    }
    // A chopping table can go inside another one, but never inside itself (or inside something it holds)
    if (isTable && layerContains(stack.table, layer)) {
        showMessage("A chopping table can't go inside itself.");
        return;
    }
    layer.grid[index] = { kind: def.id, dir: rotation, mods: [] };
    if (isTable) {
        layer.grid[index].table = stack.table; // the inside moves with it
    }
    useFromSlot(hotbarSel);
    unsaved = true;
    displayDirty = true;
    afterBuilding();
}

// After placing or removing something: a floor full of diamonds is weird (see THE WEIRDNESS below)
function afterBuilding() {
    setTimeout(checkWeirdness, 300);
}

// =====================================================================
//  THE SUSHI: moving along belts
// =====================================================================
// Every sushi is an object: where it is (x, y), where it is heading (tx, ty),
// how far along it is (p from 0 to 1), and how much it is worth (value).

// What kind of piece is this cell: belt, source, topping or exit (null if empty)
function roleOf(cell) {
    return cell ? TILE_BY_ID[cell.kind].role : null;
}

// How much a piece earns: all its upgrades multiplied (golden 2 x soy sauce 1.5 = 3)
function modMultiplier(cell) {
    let m = 1;
    if (cell && cell.mods) {
        for (const id of cell.mods) {
            m = m * (ITEM_BY_ID[id].multiplier || 1);
        }
    }
    return m;
}

// How fast a piece works: its own speed times its upgrades (wasabi 2x, spicy drink 1.5x)
function speedMultiplier(cell) {
    let m = 1;
    if (cell && cell.kind && TILE_BY_ID[cell.kind]) {
        m = TILE_BY_ID[cell.kind].speed || 1;   // express belts and bigger rice cookers
    }
    if (cell && cell.mods) {
        for (const id of cell.mods) {
            m = m * (ITEM_BY_ID[id].speed || 1);
        }
    }
    return m;
}

// special = true: a spectacular sushi from a chopping table (already complete, drawn with a lot of sparkle)
function trySpawn(layer, sx, sy, dir, value, special) {
    // A table's sushi flies over any chopping tables in its way and lands on the first piece after them
    let steps = 1;
    if (special) {
        while (inGrid(sx + DX[dir] * steps, sy + DY[dir] * steps) &&
               roleOf(cellAt(layer, sx + DX[dir] * steps, sy + DY[dir] * steps)) === 'table') {
            steps++;
        }
    }
    const tx = sx + DX[dir] * steps;
    const ty = sy + DY[dir] * steps;
    const special_n = layer.nSpecial || 0;
    const full = special ? special_n >= MAX_SPECIAL : layer.sushi.length - special_n >= MAX_SUSHI;
    if (!passable(layer, tx, ty) || full) {
        return false; // nowhere to put it
    }
    if (special) {
        layer.nSpecial = special_n + 1;
    }
    layer.sushi.push({
        x: sx, y: sy, tx: tx, ty: ty,
        dx: DX[dir], dy: DY[dir],
        p: 0, value: value, age: 0,
        span: steps,                       // how many squares this hop is (more than 1 when it flies over tables)
        seen: [],                          // machines it already passed (each gives its bonus once)
        complete: !!special,               // false = a plain rice ball, true = sushi (it passed a fish)
        special: !!special,                // true = packed from a whole chopping table
        seed: Math.random() * 6.28,        // makes every spectacular sushi sparkle a little differently
        waiting: false,                    // true when it has reached the end of a belt
        jx: (Math.random() - 0.5) * 0.3,   // small random offset so waiting sushi form a little pile
        jy: (Math.random() - 0.5) * 0.3,
        dead: false
    });
    return true;
}

// Looks at the square the sushi is standing on and decides where to go next.
function tryDepart(layer, s) {
    const cell = cellAt(layer, s.x, s.y);
    if (!cell || roleOf(cell) === 'source') {
        s.dead = true;
        return;
    }
    if (roleOf(cell) === 'belt') {
        s.dx = DX[cell.dir];
        s.dy = DY[cell.dir];
    }
    // Machines (fish, chef) keep the direction the sushi was already travelling in

    const tx = s.x + s.dx;
    const ty = s.y + s.dy;
    if (passable(layer, tx, ty)) {
        s.tx = tx;
        s.ty = ty;
        s.waiting = false;
    } else {
        s.waiting = true; // end of the line: wait until you build something there
    }
}

const MAX_EFFECTS = 60; // most +5 popups on one floor at the same time

function sell(layer, s, x, y, multiplier) {
    const now = performance.now() / 1000;
    let gained = s.value * multiplier;
    if (layer === slotLayer()) {
        // The table in the special slot: its sales are its profit. They are not paid out and not packed
        // into a sushi: they only decide how much your normal factory is boosted.
        tableLog.push({ t: now, v: gained });
    } else if (layer.inner) {
        layer.bank = layer.bank + gained; // inside a chopping table: packed into the table's next sushi
    } else {
        gained = gained * tableBoost(); // the special slot table boosts the normal factory
        points = points + gained;
        salesLog.push({ t: now, v: gained });
    }
    if (layer === viewLayer() && layer.effects.length < MAX_EFFECTS) {
        // only if you can see it (and the floor isn't already full of popups). A spectacular sushi gets a big golden popup with a burst of stars.
        layer.effects.push({
            x: x, y: y, text: '+' + formatRate(gained), age: 0,
            big: !!s.special, life: s.special ? 1.5 : 0.9, seed: Math.random() * 6.28
        });
    }
    unsaved = true;
    displayDirty = true;
}

// Called when a sushi reaches the middle of its target square
function arrive(layer, s) {
    s.x = s.tx;
    s.y = s.ty;
    s.span = 1; // the next hop is one square again
    const cell = cellAt(layer, s.x, s.y);

    if (!cell || roleOf(cell) === 'source' || roleOf(cell) === 'table') {
        s.dead = true; // the piece was removed (or replaced by a table) while it was on its way
        return;
    }
    const def = TILE_BY_ID[cell.kind];
    if (def.role === 'exit') {
        sell(layer, s, s.x, s.y, (def.sell || 1) * modMultiplier(cell));
        s.dead = true;
        return;
    }
    if (def.role === 'topping') {
        const index = s.y * COLS + s.x;
        if (!s.seen.includes(index)) {
            s.seen.push(index);
            if (def.bonus) {
                s.value = s.value + def.bonus * modMultiplier(cell);
            }
            // The first seafood turns the rice ball into complete sushi, which is worth more
            if (def.completes && !s.complete) {
                s.complete = true;
                s.value = s.value * COMPLETE_BOOST;
            }
            // Seasoning multiplies the value (golden etc. make the extra part bigger)
            if (def.mult) {
                s.value = s.value * (1 + (def.mult - 1) * modMultiplier(cell));
            }
        }
    }
    tryDepart(layer, s);
}

function stepSushi(layer, s, dt) {
    s.age = s.age + dt;
    if (s.age > MAX_AGE) {
        s.dead = true;
        return;
    }

    if (s.waiting) {
        tryDepart(layer, s); // maybe you built something since last time
        if (s.waiting || s.dead) {
            return;
        }
    }

    // wasabi pieces are faster. A long hop over tables takes longer, so it is the same speed per square.
    s.p = s.p + SPEED * dt * speedMultiplier(cellAt(layer, s.x, s.y)) / (s.span || 1);
    // "while" in case a lot of time passed (for example the tab was in the background)
    while (s.p >= 1 && !s.dead) {
        s.p = s.p - 1;
        arrive(layer, s);
        if (s.waiting) {
            s.p = 0;
            return;
        }
    }
}

// One step of one floor. dt = seconds since the last step.
function runLayer(layer, dt) {
    // Rice cookers make sushi
    for (let i = 0; i < layer.grid.length; i++) {
        const cell = layer.grid[i];
        if (cell && roleOf(cell) === 'source') {
            layer.timers[i] = (layer.timers[i] || 0) + dt * speedMultiplier(cell);
            while (layer.timers[i] >= SPAWN_EVERY) {
                const x = i % COLS;
                const y = Math.floor(i / COLS);
                if (trySpawn(layer, x, y, cell.dir, 1 * modMultiplier(cell))) {
                    layer.timers[i] = layer.timers[i] - SPAWN_EVERY;
                } else {
                    layer.timers[i] = SPAWN_EVERY; // blocked: make one as soon as there is room
                    break;
                }
            }
        } else if (cell && roleOf(cell) === 'table') {
            // A chopping table works like a rice cooker, but it sends out ONE sushi per second:
            // everything its inside sold since the last one, packed together.
            const inside = cell.table;
            let t = Math.min((layer.timers[i] || 0) + dt, TABLE_EVERY); // no stored-up extra sushi: the bank holds the value
            if (t >= TABLE_EVERY && inside && inside.bank > 0) {
                const x = i % COLS;
                const y = Math.floor(i / COLS);
                if (trySpawn(layer, x, y, cell.dir, inside.bank, true)) {
                    inside.bank = 0;
                    t = 0;
                    layer.pulses[i] = performance.now() / 1000;
                } // blocked: keep the value in the bank and try again next step
            }
            layer.timers[i] = t;
        } else {
            delete layer.timers[i];
        }
    }

    // Move all the sushi
    for (const s of layer.sushi) {
        stepSushi(layer, s, dt);
    }
    layer.sushi = layer.sushi.filter(function (s) {
        return !s.dead;
    });
    let specials = 0;
    for (const s of layer.sushi) {
        if (s.special) {
            specials++;
        }
    }
    layer.nSpecial = specials;

    // Fade the "+5" popups
    for (const effect of layer.effects) {
        effect.age = effect.age + dt;
    }
    layer.effects = layer.effects.filter(function (effect) {
        return effect.age < (effect.life || 0.9);
    });
}

// One step of the whole factory: the main floor and every chopping table placed on it,
// and the tables inside those tables, and so on. (A loop, not recursion: tables can go forever.)
function runFactory(dt) {
    const floors = [rootLayer];
    // A table you are editing from your Inventory is not placed anywhere, but it works while you watch it
    if (viewPath.length > 0 && viewOrigin === 'inventory' && currentScreen === 'game-screen' && viewPath[0] !== slotLayer()) {
        viewPath[0].inner = true;
        floors.push(viewPath[0]);
    }
    // The table in the special slot works by itself (its inside is run like any other table)
    if (slotLayer()) {
        slotLayer().inner = true;
        floors.push(slotLayer());
    }
    while (floors.length > 0) {
        const floor = floors.pop();
        runLayer(floor, dt);
        for (const cell of floor.grid) {
            if (cell && cell.table) {
                cell.table.inner = true; // what it sells is packed into the table's sushi
                floors.push(cell.table);
            }
        }
    }

    // Forget sales older than 10 seconds
    const now = performance.now() / 1000;
    salesLog = salesLog.filter(function (sale) {
        return now - sale.t <= 10;
    });
    tableLog = tableLog.filter(function (sale) {
        return now - sale.t <= PROFIT_WINDOW;
    });
}

// The factory runs 20 times a second. It uses real elapsed time, so it also keeps
// working (a bit more roughly) when the tab is in the background.
let lastTick = performance.now();
setInterval(function () {
    const now = performance.now();
    const dt = Math.min((now - lastTick) / 1000, 5);
    lastTick = now;
    runFactory(dt);
}, 50);

// Refresh the "per second" number once a second, even when nothing else changed
setInterval(function () {
    displayDirty = true;
}, 1000);

// =====================================================================
//  DRAWING THE FACTORY (canvas)
// =====================================================================
const canvas = document.getElementById('factory-canvas');
let ctx = canvas.getContext('2d'); // (briefly swapped while a sprite is painted, see getSprite)
const mainCtx = ctx;
canvas.width = COLS * CELL * RES;
canvas.height = ROWS * CELL * RES;

// Noto Color Emoji is the ChromeOS emoji set. style.css loads it from Google Fonts,
// so every device shows the same emojis.
const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

// Canvas only uses a font that is already loaded, so ask for it up front
if (document.fonts && document.fonts.load) {
    const allEmoji = Object.values(ITEM_BY_ID).map(function (t) { return t.emoji; }).join('') + '⚒️🛒🎒🗑️✨⚙️';
    document.fonts.load('28px "Noto Color Emoji"', allEmoji).catch(function () {});
}

function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawEmoji(emoji, cx, cy, size) {
    ctx.font = size + 'px ' + EMOJI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(emoji, cx, cy + 2);
}

// ---- Small helpers for the renderer ----

// Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. Cached, because it is called every frame.
const shadeCache = {};
function shade(hex, amt) {
    const key = hex + '|' + amt;
    if (shadeCache[key]) {
        return shadeCache[key];
    }
    const n = parseInt(hex.slice(1), 16);
    const target = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    const r = Math.round((n >> 16) + (target - (n >> 16)) * p);
    const g = Math.round(((n >> 8) & 255) + (target - ((n >> 8) & 255)) * p);
    const b = Math.round((n & 255) + (target - (n & 255)) * p);
    shadeCache[key] = 'rgb(' + r + ',' + g + ',' + b + ')';
    return shadeCache[key];
}

function withAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// A deterministic random number generator, so the baked floor looks the same every time
function seededRandom(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Canvas shadows are measured in real canvas pixels, so they must be multiplied by RES
function glow(colour, blur, offsetY) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = blur * RES;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = (offsetY || 0) * RES;
}

function noGlow() {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
}

// An emoji with a soft drop shadow so it sits on the tile instead of being printed on it
function emojiSoft(emoji, cx, cy, size) {
    ctx.save();
    glow('rgba(0, 0, 0, 0.6)', 4, 2);
    drawEmoji(emoji, cx, cy, size);
    ctx.restore();
}

// ---- Sprites: pieces are painted once into a small hidden canvas, then stamped every frame ----
// This looks exactly the same, but is MUCH cheaper than redrawing every gradient, glow and emoji 60 times a second.
// (ox, oy) is where the piece's own (0, 0) sits inside the sprite, so there is room for glows around it.
let spriteCache = new Map();

function getSprite(key, w, h, ox, oy, paint) {
    let sp = spriteCache.get(key);
    if (sp) {
        return sp;
    }
    if (spriteCache.size > 2500) {
        spriteCache = new Map(); // safety net: never let the cache grow forever
    }
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * RES);
    c.height = Math.ceil(h * RES);
    const g = c.getContext('2d');
    const real = ctx;
    ctx = g;
    ctx.setTransform(RES, 0, 0, RES, ox * RES, oy * RES);
    try {
        paint();
    } finally {
        ctx = real;
    }
    sp = { c: c, ox: ox, oy: oy, w: w, h: h };
    spriteCache.set(key, sp);
    return sp;
}

function stamp(sp, x, y, scale) {
    if (scale === undefined) {
        ctx.drawImage(sp.c, x - sp.ox, y - sp.oy, sp.w, sp.h);
    } else {
        ctx.drawImage(sp.c, x - sp.ox * scale, y - sp.oy * scale, sp.w * scale, sp.h * scale);
    }
}

// Emoji and text fonts load a moment after the page: paint everything again once they are there
function forgetSprites() {
    spriteCache = new Map();
}
if (document.fonts) {
    if (document.fonts.ready) {
        document.fonts.ready.then(forgetSprites);
    }
    if (document.fonts.addEventListener) {
        document.fonts.addEventListener('loadingdone', forgetSprites);
    }
    setTimeout(forgetSprites, 1500);
}

// Text (the numbers on sushi and the +5 popups) as a sprite too: text with an outline and a glow is slow to draw.
// Sprite is centred on its text. kind: 'sushi', 'super', 'pop' or 'popBig'
const TEXT_STYLES = {
    sushi:  { font: '700 12px Fredoka, system-ui, sans-serif', line: 3.2, stroke: '#0a1511', fill: '#c6ea74', glow: null, blur: 0 },
    super:  { font: '700 15px Fredoka, system-ui, sans-serif', line: 4,   stroke: '#3b2a12', fill: '#ffe27a', glow: null, blur: 0 },
    pop:    { font: '700 18px Fredoka, system-ui, sans-serif', line: 4,   stroke: '#0a1511', fill: '#c6ea74', glow: 'rgba(183, 224, 90, 0.7)', blur: 6 },
    popBig: { font: '700 26px Fredoka, system-ui, sans-serif', line: 6,   stroke: '#3b2a12', fill: '#ffe27a', glow: 'rgba(255, 210, 80, 0.9)', blur: 10 }
};
const measureCtx = document.createElement('canvas').getContext('2d');
let textSprites = 0;

function getTextSprite(text, kind) {
    const key = 't|' + kind + '|' + text;
    const have = spriteCache.get(key);
    if (have) {
        return have;
    }
    const st = TEXT_STYLES[kind];
    measureCtx.font = st.font;
    const pad = Math.ceil(st.line + st.blur + 6);
    const w = Math.ceil(measureCtx.measureText(text).width) + pad * 2;
    const h = Math.ceil(parseInt(st.font.slice(4), 10) * 1.5) + pad * 2;
    // Numbers can be endless: keep at most 700 text sprites (the pieces' sprites stay)
    textSprites = textSprites + 1;
    if (textSprites > 700) {
        for (const k of Array.from(spriteCache.keys())) {
            if (k.charAt(0) === 't' && k.charAt(1) === '|') {
                spriteCache.delete(k);
            }
        }
        textSprites = 1;
    }
    return getSprite(key, w, h, w / 2, h / 2, function () {
        ctx.font = st.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = st.line;
        ctx.strokeStyle = st.stroke;
        ctx.strokeText(text, 0, 0);
        if (st.glow) {
            glow(st.glow, st.blur, 0);
        }
        ctx.fillStyle = st.fill;
        ctx.fillText(text, 0, 0);
    });
}

// ---- The floor: painted once, then just stamped every frame ----
// A dark lacquered board with a faint grid, speckle, lantern light from above and a vignette.
const floorCache = {};
function getFloor(wood) {
    const key = wood ? 'wood' : 'lacquer';
    if (floorCache[key]) {
        return floorCache[key];
    }
    const W = COLS * CELL;
    const H = ROWS * CELL;
    const c = document.createElement('canvas');
    c.width = W * RES;
    c.height = H * RES;
    const g = c.getContext('2d');
    g.scale(RES, RES);
    const rnd = seededRandom(wood ? 77 : 2024);

    for (let gy = 0; gy < ROWS; gy++) {
        for (let gx = 0; gx < COLS; gx++) {
            const even = (gx + gy) % 2 === 0;
            const base = wood ? (even ? '#2e2318' : '#35291c') : (even ? '#0b1812' : '#0e1e17');
            g.fillStyle = base;
            g.fillRect(gx * CELL, gy * CELL, CELL, CELL);
            const grad = g.createLinearGradient(0, gy * CELL, 0, (gy + 1) * CELL);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
            g.fillStyle = grad;
            g.fillRect(gx * CELL, gy * CELL, CELL, CELL);
        }
    }

    // Wood grain or lacquer speckle
    if (wood) {
        for (let i = 0; i < 90; i++) {
            const y = rnd() * H;
            const x = rnd() * W;
            g.strokeStyle = 'rgba(0, 0, 0, ' + (0.08 + rnd() * 0.12) + ')';
            g.lineWidth = 0.6 + rnd() * 0.8;
            g.beginPath();
            g.moveTo(x, y);
            g.bezierCurveTo(x + 20, y + rnd() * 3 - 1.5, x + 50, y + rnd() * 3 - 1.5, x + 70 + rnd() * 60, y + rnd() * 2);
            g.stroke();
        }
    } else {
        for (let i = 0; i < 260; i++) {
            g.fillStyle = rnd() < 0.5
                ? 'rgba(255, 255, 255, ' + (0.02 + rnd() * 0.05) + ')'
                : 'rgba(0, 0, 0, ' + (0.08 + rnd() * 0.12) + ')';
            g.beginPath();
            g.arc(rnd() * W, rnd() * H, 0.4 + rnd() * 0.7, 0, Math.PI * 2);
            g.fill();
        }
    }

    // Grid lines: a dark groove with a thin lit edge beside it
    for (let gx = 1; gx < COLS; gx++) {
        g.fillStyle = 'rgba(0, 0, 0, 0.45)';
        g.fillRect(gx * CELL - 0.5, 0, 1, H);
        g.fillStyle = 'rgba(255, 255, 255, 0.05)';
        g.fillRect(gx * CELL + 0.5, 0, 1, H);
    }
    for (let gy = 1; gy < ROWS; gy++) {
        g.fillStyle = 'rgba(0, 0, 0, 0.45)';
        g.fillRect(0, gy * CELL - 0.5, W, 1);
        g.fillStyle = 'rgba(255, 255, 255, 0.05)';
        g.fillRect(0, gy * CELL + 0.5, W, 1);
    }
    // Tiny studs where the lines cross
    g.fillStyle = wood ? 'rgba(255, 220, 160, 0.16)' : 'rgba(183, 224, 90, 0.16)';
    for (let gy = 1; gy < ROWS; gy++) {
        for (let gx = 1; gx < COLS; gx++) {
            g.beginPath();
            g.arc(gx * CELL, gy * CELL, 1.3, 0, Math.PI * 2);
            g.fill();
        }
    }

    // Lantern light from above
    const light = g.createRadialGradient(W * 0.5, H * 0.25, 10, W * 0.5, H * 0.35, W * 0.75);
    light.addColorStop(0, wood ? 'rgba(255, 200, 120, 0.16)' : 'rgba(255, 196, 107, 0.10)');
    light.addColorStop(1, 'rgba(255, 196, 107, 0)');
    g.fillStyle = light;
    g.fillRect(0, 0, W, H);

    // Vignette
    const vig = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);

    // Inner bevel around the whole board
    g.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, W - 2, H - 2);

    floorCache[key] = c;
    return c;
}

// Dust motes drifting in the lantern light (only a few, drawn additively)
const MOTES = [];
for (let i = 0; i < 16; i++) {
    MOTES.push({
        x: Math.random() * COLS * CELL, y: Math.random() * ROWS * CELL,
        speed: 3 + Math.random() * 6, wobble: 4 + Math.random() * 8,
        phase: Math.random() * 6.28, size: 0.8 + Math.random() * 1.4
    });
}

function drawMotes(time) {
    const W = COLS * CELL;
    const H = ROWS * CELL;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) {
        const x = (m.x + time * m.speed) % W;
        const y = (m.y + Math.sin(time * 0.6 + m.phase) * m.wobble + H) % H;
        const a = 0.12 + 0.14 * (0.5 + 0.5 * Math.sin(time * 1.4 + m.phase));
        ctx.fillStyle = 'rgba(255, 214, 150, ' + a + ')';
        ctx.beginPath();
        ctx.arc(x, y, m.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ---- Tiles ----

// The base of every piece: a soft shadow, a lit-from-above body, a gloss and a crisp edge
function tileBase(x, y, colour, r) {
    const px = x + 2;
    const py = y + 2;
    const s = CELL - 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    roundedRect(px, py + 2.5, s, s, r);
    ctx.fill();

    const body = ctx.createLinearGradient(0, py, 0, py + s);
    body.addColorStop(0, shade(colour, 0.15));
    body.addColorStop(0.45, colour);
    body.addColorStop(1, shade(colour, -0.32));
    ctx.fillStyle = body;
    roundedRect(px, py, s, s, r);
    ctx.fill();

    // Gloss on the top half
    ctx.save();
    roundedRect(px, py, s, s, r);
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, py, 0, py + s * 0.55);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(px, py, s, s * 0.55);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1;
    roundedRect(px + 0.5, py + 0.5, s - 1, s - 1, r - 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    roundedRect(px - 0.5, py - 0.5, s + 1, s + 1, r + 0.5);
    ctx.stroke();
}

// Upgrades on a piece: a glowing edge in the upgrade's colour for each one, and its icon in a little badge
function drawMods(x, y, mods, time) {
    if (!mods || mods.length === 0) {
        return;
    }
    for (let k = 0; k < mods.length; k++) {
        const def = ITEM_BY_ID[mods[k]];
        const pulse = 0.5 + 0.5 * Math.sin(time * 3 + k * 1.7);
        const level = Math.round(pulse * 6); // the pulsing glow comes in 7 steps (painted once each)
        const inset = 2 + k * 3;
        const size = CELL - 4 - k * 6;

        const edge = getSprite('modedge|' + def.id + '|' + k + '|' + level, CELL + 32, CELL + 32, 16, 16, function () {
            const p = level / 6;
            ctx.fillStyle = withAlpha(def.colour, 0.14 + 0.06 * p);
            roundedRect(inset, inset, size, size, 10);
            ctx.fill();
            glow(def.colour, 5 + 6 * p, 0);
            ctx.strokeStyle = def.colour;
            ctx.lineWidth = 2.2;
            roundedRect(inset, inset, size, size, 10);
            ctx.stroke();
        });
        stamp(edge, x, y);

        // Golden things shimmer: a bright band sweeps across them
        if (def.golden) {
            ctx.save();
            roundedRect(x + inset, y + inset, size, size, 10);
            ctx.clip();
            const sweep = ((time * 0.7) % 1.6) - 0.3;
            const sx = x + sweep * (CELL + 20) - 10;
            const band = ctx.createLinearGradient(sx - 14, y, sx + 14, y + CELL);
            band.addColorStop(0, 'rgba(255, 240, 170, 0)');
            band.addColorStop(0.5, 'rgba(255, 240, 170, 0.5)');
            band.addColorStop(1, 'rgba(255, 240, 170, 0)');
            ctx.fillStyle = band;
            ctx.fillRect(x, y, CELL, CELL);
            ctx.restore();
        }

        const bx = x + CELL - 12 - k * 15;
        const by = y + 12;
        const badge = getSprite('badge|' + def.id, 28, 28, 14, 14, function () {
            ctx.fillStyle = 'rgba(8, 19, 15, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = def.colour;
            ctx.lineWidth = 1.4;
            ctx.stroke();
            drawEmoji(def.emoji, 0, 0, 11);
        });
        stamp(badge, bx, by);
    }
}

// Brighter colours for the little factory drawn on a chopping table (the real ones are too dark)
const MINI_COLOUR = { belt: '#8fa89a', source: '#7fd1a0', topping: '#6fb7e0', exit: '#ff9c6e', table: '#d9b26f' };

// A four-pointed sparkle star
function drawStar(cx, cy, r, colour, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 - Math.PI / 2;
        const rr = k % 2 === 0 ? r : r * 0.28;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// A chopping table: a wooden tile with a tiny picture of what is inside it.
// Like a rice cooker it shows which way it sends sushi, and it flashes when it sends one.
function drawTable(x, y, table, dir, time, pulse) {
    stamp(getSprite('tablebase', CELL + 16, CELL + 16, 8, 8, function () {
        tileBase(0, 0, TILE_BY_ID[TABLE_ID].colour, 10);

        // Wood grain
        ctx.save();
        roundedRect(2, 2, CELL - 4, CELL - 4, 10);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.lineWidth = 1;
        for (let k = 1; k < 6; k++) {
            ctx.beginPath();
            ctx.moveTo(0, k * 9.5);
            ctx.bezierCurveTo(18, k * 9.5 - 2, 38, k * 9.5 + 2, CELL, k * 9.5);
            ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = '#b48a50';
        ctx.lineWidth = 1.6;
        roundedRect(2.5, 2.5, CELL - 5, CELL - 5, 9.5);
        ctx.stroke();
    }), x, y);

    const pad = 9;
    const size = (CELL - pad * 2) / COLS;
    const top = y + (CELL - size * ROWS) / 2 - 1;

    // A dark glass panel with the mini factory behind it
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    roundedRect(x + pad - 2, top - 2, size * COLS + 4, size * ROWS + 4, 3);
    ctx.fill();
    for (let gy = 0; gy < ROWS; gy++) {
        for (let gx = 0; gx < COLS; gx++) {
            const inner = table ? table.grid[gy * COLS + gx] : null;
            ctx.fillStyle = inner ? MINI_COLOUR[TILE_BY_ID[inner.kind].role] : 'rgba(255, 255, 255, 0.07)';
            ctx.fillRect(x + pad + gx * size + 0.5, top + gy * size + 0.5, size - 1, size - 1);
        }
    }
    stamp(getSprite('tableemoji', 28, 28, 14, 14, function () {
        drawEmoji(TILE_BY_ID[TABLE_ID].emoji, 0, 0, 12);
    }), x + CELL - 11, y + CELL - 10);

    // The flash when a sushi goes out
    const since = pulse ? time - pulse : 99;
    if (since < 0.45) {
        const k = since / 0.45;
        ctx.save();
        glow('rgba(255, 220, 110, 0.9)', 8, 0);
        ctx.strokeStyle = 'rgba(255, 226, 120, ' + (1 - k) + ')';
        ctx.lineWidth = 3;
        roundedRect(x + 2 - k * 4, y + 2 - k * 4, CELL - 4 + k * 8, CELL - 4 + k * 8, 10 + k * 4);
        ctx.stroke();
        ctx.restore();
    }

    // The arrow: which way the sushi comes out (golden, so it stands out on the wood)
    stamp(getSprite('tablearrow|' + (dir || 0), CELL + 16, CELL + 16, 8, 8, function () {
        ctx.translate(CELL / 2, CELL / 2);
        ctx.rotate((dir || 0) * Math.PI / 2);
        glow('rgba(255, 211, 77, 0.8)', 5, 0);
        ctx.fillStyle = '#ffd34d';
        ctx.strokeStyle = '#3b2a12';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(CELL * 0.27, -8);
        ctx.lineTo(CELL * 0.47, 0);
        ctx.lineTo(CELL * 0.27, 8);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }), x, y);
}

// Draws one piece in the square at (gx, gy). table: the inside of a chopping table (to draw it small).
// progress (0 to 1): how close a rice cooker or table is to making its next sushi.
function drawPiece(kind, dir, gx, gy, time, mods, table, pulse, progress) {
    const x = gx * CELL;
    const y = gy * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    const def = TILE_BY_ID[kind];
    if (def.role === 'table') {
        drawTable(x, y, table, dir, time, pulse);
        return;
    }

    if (def.role === 'belt') {
        const fast = def.speed > 1;

        // The belt itself (tile + two side rails) is painted once per direction
        stamp(getSprite('belt|' + kind + '|' + dir, CELL + 16, CELL + 16, 8, 8, function () {
            tileBase(0, 0, def.colour, 8);
            ctx.translate(CELL / 2, CELL / 2);
            ctx.rotate(dir * Math.PI / 2);
            for (const side of [-1, 1]) {
                const ry = side * (CELL / 2 - 9);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-CELL / 2 + 8, ry);
                ctx.lineTo(CELL / 2 - 8, ry);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-CELL / 2 + 8, ry + 1.6);
                ctx.lineTo(CELL / 2 - 8, ry + 1.6);
                ctx.stroke();
            }
        }), x, y);

        // Moving chevrons that point the way the belt goes. They fade in and out at the ends.
        const chevron = getSprite('chevron|' + (fast ? 'fast' : 'norm'), 44, 44, 22, 22, function () {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (fast) {
                glow('rgba(255, 226, 120, 0.9)', 5, 0);
            }
            ctx.strokeStyle = fast ? 'rgba(255, 226, 120, 0.9)' : 'rgba(247, 243, 232, 0.62)';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(-5, -8);
            ctx.lineTo(3, 0);
            ctx.lineTo(-5, 8);
            ctx.stroke();
        });
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(dir * Math.PI / 2);
        const cellNow = { kind: kind, mods: mods || [] };
        const phase = (time * SPEED * speedMultiplier(cellNow)) % 1;
        const baseAlpha = ctx.globalAlpha; // (less than 1 for the see-through preview)
        for (let k = 0; k < 3; k++) {
            const t = (phase + k / 3) % 1;
            ctx.globalAlpha = baseAlpha * Math.sin(t * Math.PI);
            stamp(chevron, (t - 0.5) * CELL * 0.86, 0);
        }
        ctx.restore();
        drawMods(x, y, mods, time);
        return;
    }

    // Machines: a coloured tile with an emoji on it (painted once, then stamped)
    stamp(getSprite('tile|' + kind, CELL + 16, CELL + 16, 8, 8, function () {
        tileBase(0, 0, def.colour, 10);
        // A coloured line along the bottom says what kind of machine it is
        ctx.fillStyle = MINI_COLOUR[def.role];
        ctx.globalAlpha = 0.75;
        roundedRect(15, CELL - 9, CELL - 30, 2.5, 1.25);
        ctx.fill();
        ctx.globalAlpha = 1;
    }), x, y);

    // Serving counters glow like paper lanterns (the glow breathes, so it is stamped with a changing strength)
    if (def.role === 'exit') {
        const lit = 0.18 + 0.12 * Math.sin(time * 2.4 + gx + gy);
        const baseAlpha = ctx.globalAlpha;
        ctx.globalAlpha = baseAlpha * Math.min(1, lit + 0.12);
        stamp(getSprite('lamp', CELL, CELL, 0, 0, function () {
            const lamp = ctx.createRadialGradient(CELL / 2, CELL / 2, 2, CELL / 2, CELL / 2, CELL * 0.55);
            lamp.addColorStop(0, 'rgba(255, 170, 90, 1)');
            lamp.addColorStop(1, 'rgba(255, 140, 60, 0)');
            ctx.fillStyle = lamp;
            ctx.fillRect(0, 0, CELL, CELL);
        }), x, y);
        ctx.globalAlpha = baseAlpha;
    }

    // A soft plate under the emoji, and the emoji
    stamp(getSprite('face|' + kind, CELL + 16, CELL + 16, 8, 8, function () {
        const plate = ctx.createRadialGradient(CELL / 2, CELL / 2 - 3, 1, CELL / 2, CELL / 2, 19);
        plate.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
        plate.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = plate;
        ctx.beginPath();
        ctx.arc(CELL / 2, CELL / 2, 19, 0, Math.PI * 2);
        ctx.fill();
        emojiSoft(def.emoji, CELL / 2, CELL / 2 - 1, 28);
    }), x, y);

    // The rice cooker's progress ring: it fills up, then a rice ball pops out
    // (painted in 90 steps, once each)
    if (def.role === 'source' && progress !== undefined) {
        const step = Math.round(Math.min(1, Math.max(0, progress)) * 90);
        stamp(getSprite('ring|' + step, CELL + 16, CELL + 16, 8, 8, function () {
            ctx.lineCap = 'round';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.arc(CELL / 2, CELL / 2, 22, 0, Math.PI * 2);
            ctx.stroke();
            if (step > 0) {
                glow('rgba(183, 224, 90, 0.8)', 4, 0);
                ctx.strokeStyle = '#c6ea74';
                ctx.beginPath();
                ctx.arc(CELL / 2, CELL / 2, 22, -Math.PI / 2, -Math.PI / 2 + (step / 90) * Math.PI * 2);
                ctx.stroke();
            }
        }), x, y);
    }

    drawMods(x, y, mods, time);

    // The rice cooker also shows which way it sends sushi
    if (def.role === 'source') {
        stamp(getSprite('srcarrow|' + dir, CELL + 16, CELL + 16, 8, 8, function () {
            ctx.translate(CELL / 2, CELL / 2);
            ctx.rotate(dir * Math.PI / 2);
            glow('rgba(255, 122, 77, 0.9)', 5, 0);
            ctx.fillStyle = '#ff8a5c';
            ctx.strokeStyle = 'rgba(60, 20, 5, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(CELL * 0.3, -7);
            ctx.lineTo(CELL * 0.46, 0);
            ctx.lineTo(CELL * 0.3, 7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }), x, y);
    }
}

// ---- Sushi ----

// The spectacular sushi a chopping table sends out: a glowing golden nigiri with spinning rays and sparkles
// lite = true when there are very many of them on the floor: no rays or number, a flat glow, one sparkle
function drawSuperSushi(cx, cy, value, time, seed, lite, label) {
    const beat = 0.5 + 0.5 * Math.sin(time * 6 + seed);
    const r = CELL * (0.62 + 0.07 * beat);

    // Warm glow, added to the light underneath
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (lite) {
        ctx.fillStyle = 'rgba(255, 190, 70, 0.28)';
    } else {
        const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 1.15);
        halo.addColorStop(0, 'rgba(255, 244, 180, 0.85)');
        halo.addColorStop(0.45, 'rgba(255, 180, 60, 0.38)');
        halo.addColorStop(1, 'rgba(255, 130, 40, 0)');
        ctx.fillStyle = halo;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, lite ? r * 0.8 : r * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Spinning rays, tapered like light through a window
    if (!lite) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, cy);
        ctx.rotate(time * 1.3 + seed);
        for (let k = 0; k < 8; k++) {
            ctx.rotate(Math.PI / 4);
            const ray = ctx.createLinearGradient(0, -r * 0.25, 0, -r * 1.15);
            ray.addColorStop(0, 'rgba(255, 232, 140, 0.55)');
            ray.addColorStop(1, 'rgba(255, 232, 140, 0)');
            ctx.fillStyle = ray;
            ctx.beginPath();
            ctx.moveTo(-3.2, -r * 0.25);
            ctx.lineTo(0, -r * 1.15);
            ctx.lineTo(3.2, -r * 0.25);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // The nigiri (bigger than a normal one): rice below, a shimmering topping on top
    const w = CELL * 0.72;
    const h = CELL * 0.4;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.6 + 4, w * 0.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const rice = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2 + 4);
    rice.addColorStop(0, '#fffdf6');
    rice.addColorStop(1, '#e6dfc8');
    ctx.fillStyle = rice;
    roundedRect(cx - w / 2, cy - h / 2 + 4, w, h * 0.75, 7);
    ctx.fill();

    const slide = (time * 0.8 + seed) % 1;
    const top = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
    top.addColorStop(0, '#ff6a3d');
    top.addColorStop(Math.max(0.01, slide - 0.25), '#ff8a4d');
    top.addColorStop(slide, '#fff0b0');
    top.addColorStop(Math.min(0.99, slide + 0.25), '#ff8a4d');
    top.addColorStop(1, '#ff5d6e');
    ctx.save();
    glow('rgba(255, 190, 60, 0.9)', lite ? 0 : 8, 0);
    ctx.fillStyle = top;
    roundedRect(cx - w / 2 - 2, cy - h / 2 - 5, w + 4, h * 0.65, 7);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 2;
    roundedRect(cx - w / 2 - 2, cy - h / 2 - 5, w + 4, h * 0.65, 7);
    ctx.stroke();

    // Sparkles circling it
    for (let k = 0; k < (lite ? 1 : 4); k++) {
        const a = time * 2.2 + seed + k * Math.PI / 2;
        const twinkle = 0.5 + 0.5 * Math.sin(time * 9 + k * 2 + seed);
        drawStar(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.62, 4 + 4 * twinkle, '#fff6c2', 0.5 + 0.5 * twinkle);
    }

    // Its value, big and golden
    if (lite) {
        return;
    }
    stamp(getTextSprite(label || formatRate(value), 'super'), cx, cy - h / 2 - 17);
}

// A little piece of nigiri
// A plain rice ball (before a fish) or complete sushi (after a fish)
function paintSushi(complete, auraAlpha) {
    const cx = 0;
    const cy = 0;
    const w = CELL * 0.5;
    const h = CELL * 0.3;

    if (!complete) {
        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.ellipse(cx + 1, cy + 10, 10, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // A round, slightly squat rice ball lit from the top left
        const ball = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy + 1, CELL * 0.2);
        ball.addColorStop(0, '#ffffff');
        ball.addColorStop(0.6, '#efe9d6');
        ball.addColorStop(1, '#bdb598');
        ctx.fillStyle = ball;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, CELL * 0.18, CELL * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        // A few grains
        ctx.strokeStyle = 'rgba(150, 138, 105, 0.45)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (const g of [[-4, 2, -3, 4], [2, 0, 4, 2], [-1, 5, 1, 6]]) {
            ctx.beginPath();
            ctx.moveTo(cx + g[0], cy + g[1]);
            ctx.lineTo(cx + g[2], cy + g[3]);
            ctx.stroke();
        }
    } else {
        // A rich sushi (worth a lot) gets a faint golden aura
        if (auraAlpha > 0) {
            const aura = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL * 0.5);
            aura.addColorStop(0, 'rgba(255, 210, 100, ' + auraAlpha + ')');
            aura.addColorStop(1, 'rgba(255, 210, 100, 0)');
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(cx, cy, CELL * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.ellipse(cx + 1, cy + h / 2 + 5, w * 0.55, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rice
        const rice = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2 + 3);
        rice.addColorStop(0, '#ffffff');
        rice.addColorStop(1, '#dcd5bd');
        ctx.fillStyle = rice;
        roundedRect(cx - w / 2, cy - h / 2 + 3, w, h * 0.7, 5);
        ctx.fill();

        // Fish on top, with pale marbling and a shine
        const fish = ctx.createLinearGradient(0, cy - h / 2 - 3, 0, cy - h / 2 + h * 0.52);
        fish.addColorStop(0, '#ffa273');
        fish.addColorStop(1, '#f2592b');
        ctx.fillStyle = fish;
        roundedRect(cx - w / 2 - 1.5, cy - h / 2 - 3, w + 3, h * 0.58, 5);
        ctx.fill();
        ctx.save();
        roundedRect(cx - w / 2 - 1.5, cy - h / 2 - 3, w + 3, h * 0.58, 5);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255, 236, 220, 0.55)';
        ctx.lineWidth = 1.2;
        for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.moveTo(cx + k * 7 - 4, cy - h / 2 - 3);
            ctx.lineTo(cx + k * 7 + 4, cy - h / 2 + h * 0.55);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - 5, cy - h / 2 - 0.5, 7, 1.8, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawSushi(cx, cy, value, complete, label) {
    const h = CELL * 0.3;
    // A rich sushi (worth a lot) gets a faint golden aura: its strength comes in a few steps
    let level = 0;
    if (complete && value >= 20) {
        level = Math.round(Math.min(0.4, 0.15 + value / 2000) * 50);
    }
    stamp(getSprite('sushi|' + (complete ? 1 : 0) + '|' + level, 72, 72, 36, 36, function () {
        paintSushi(complete, level / 50);
    }), cx, cy);

    if (value > 1) {
        stamp(getTextSprite(label || formatRate(value), 'sushi'), cx, cy - h / 2 - 11);
    }
}

// ---- Pieces popping into place ----
// A piece you just placed pops in with a little overshoot and a ring. When a whole floor
// shows up at once (loading, or going into a table) the pieces pop in as a quick diagonal wave.
const firstSeen = new WeakMap();

function popAge(cell, index, time, staggerNew) {
    let t0 = firstSeen.get(cell);
    if (t0 === undefined) {
        t0 = time + (staggerNew ? ((index % COLS) + Math.floor(index / COLS)) * 0.035 : 0);
        firstSeen.set(cell, t0);
    }
    return time - t0;
}

// Frame pacing: never draw more than ~60 times a second (a 120 Hz phone would do double the work for nothing).
// If a device still can't keep up, it draws 30 times a second instead, which is smoother than stuttering.
let lastFrameAt = 0;
let frameGap = 15;      // ms between frames
let frameCost = 0;      // how long drawing takes (smoothed)
let lastDisplayAt = 0;

function draw() {
    requestAnimationFrame(draw);

    const nowMs = performance.now();
    if (nowMs - lastFrameAt < frameGap) {
        return;
    }
    lastFrameAt = nowMs;

    // Keep the numbers fresh on every screen (shop and inventory too), at most 10 times a second:
    // changing lots of text every frame is slow, especially on a phone
    if (displayDirty && nowMs - lastDisplayAt >= 100) {
        lastDisplayAt = nowMs;
        updateDisplay();
        displayDirty = false;
    }

    // Nothing to draw while another screen is showing
    if (document.getElementById('game-screen').classList.contains('hidden')) {
        return;
    }

    drawFactory();

    frameCost = frameCost * 0.9 + (performance.now() - nowMs) * 0.1;
    if (frameCost > 20 && frameGap < 30) {
        frameGap = 33;
    } else if (frameCost < 11 && frameGap > 20) {
        frameGap = 15;
    }
}

function drawFactory() {
    const time = performance.now() / 1000;
    const layer = viewLayer();
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);

    // Floor (inside a chopping table it is wood)
    ctx.drawImage(getFloor(viewPath.length > 0), 0, 0, COLS * CELL, ROWS * CELL);
    drawMotes(time);

    // How many pieces are new this frame? If it is a lot, they pop in as a wave.
    let fresh = 0;
    for (let i = 0; i < layer.grid.length; i++) {
        if (layer.grid[i] && !firstSeen.has(layer.grid[i])) {
            fresh++;
        }
    }

    // Pieces
    for (let i = 0; i < layer.grid.length; i++) {
        const cell = layer.grid[i];
        if (!cell) {
            continue;
        }
        const gx = i % COLS;
        const gy = Math.floor(i / COLS);
        let progress;
        if (layer.timers[i] !== undefined) {
            const role = roleOf(cell);
            if (role === 'source') {
                progress = layer.timers[i] / SPAWN_EVERY;
            } else if (role === 'table') {
                progress = layer.timers[i] / TABLE_EVERY;
            }
        }
        const age = popAge(cell, i, time, fresh > 3);
        if (age < 0) {
            continue; // waiting for its turn in the wave
        }
        if (age < 0.4) {
            const k = age / 0.4;
            const scale = Math.max(0.01, easeOutBack(Math.min(1, age / 0.32)));
            const px = gx * CELL + CELL / 2;
            const py = gy * CELL + CELL / 2;
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(scale, scale);
            ctx.translate(-px, -py);
            drawPiece(cell.kind, cell.dir, gx, gy, time, cell.mods, cell.table, layer.pulses[i], progress);
            ctx.restore();
            // A ring of light spreads out from the new piece
            ctx.strokeStyle = 'rgba(255, 214, 140, ' + (0.6 * (1 - k)) + ')';
            ctx.lineWidth = 2.5 * (1 - k) + 0.5;
            roundedRect(gx * CELL + 2 - k * 7, gy * CELL + 2 - k * 7, CELL - 4 + k * 14, CELL - 4 + k * 14, 10 + k * 6);
            ctx.stroke();
        } else {
            drawPiece(cell.kind, cell.dir, gx, gy, time, cell.mods, cell.table, layer.pulses[i], progress);
        }
    }

    // Sushi on top
    for (const s of layer.sushi) {
        let gx;
        let gy;
        if (s.waiting) {
            gx = s.x + s.jx;
            gy = s.y + s.jy;
        } else {
            gx = s.x + (s.tx - s.x) * s.p;
            gy = s.y + (s.ty - s.y) * s.p;
        }
        if (s.shown !== s.value) {
            s.shown = s.value; // only turn the number into text when it changed
            s.label = formatRate(s.value);
        }
        if (s.special) {
            drawSuperSushi((gx + 0.5) * CELL, (gy + 0.5) * CELL, s.value, time, s.seed, layer.nSpecial > LITE_AFTER, s.label);
        } else {
            drawSushi((gx + 0.5) * CELL, (gy + 0.5) * CELL, s.value, s.complete, s.label);
        }
    }

    // "+5" popups
    for (const effect of layer.effects) {
        const life = effect.life || 0.9;
        const t = effect.age / life;
        const rise = (1 - Math.pow(1 - Math.min(1, effect.age / 0.9), 2)) * 38;
        const fade = Math.max(0, 1 - t * t);
        const bx = (effect.x + 0.5) * CELL;
        const by = (effect.y + 0.5) * CELL;

        if (effect.big) {
            // A spectacular sushi was sold: a flash, two rings, a burst of stars and big golden text
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const flash = ctx.createRadialGradient(bx, by, 2, bx, by, 26 + effect.age * 90);
            flash.addColorStop(0, 'rgba(255, 236, 160, ' + (fade * 0.6) + ')');
            flash.addColorStop(1, 'rgba(255, 190, 60, 0)');
            ctx.fillStyle = flash;
            ctx.beginPath();
            ctx.arc(bx, by, 26 + effect.age * 90, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            for (let ring = 0; ring < 2; ring++) {
                ctx.strokeStyle = 'rgba(255, 226, 120, ' + (fade * (0.8 - ring * 0.3)) + ')';
                ctx.lineWidth = 4 - ring * 1.5;
                ctx.beginPath();
                ctx.arc(bx, by, 8 + effect.age * (70 + ring * 45), 0, Math.PI * 2);
                ctx.stroke();
            }
            for (let k = 0; k < 12; k++) {
                const a = effect.seed + k * Math.PI / 6;
                const d = 10 + effect.age * (50 + (k % 3) * 28);
                drawStar(bx + Math.cos(a) * d, by + Math.sin(a) * d, 6 - effect.age * 2, k % 2 === 0 ? '#ffe27a' : '#fff6c2', fade);
            }
        } else if (effect.age < 0.45) {
            // A small pop of sparks around a normal sale
            const e = effect.age / 0.45;
            ctx.fillStyle = 'rgba(198, 234, 116, ' + (0.9 * (1 - e)) + ')';
            for (let k = 0; k < 6; k++) {
                const a = effect.seed + k * Math.PI / 3;
                const d = 8 + e * 16;
                ctx.beginPath();
                ctx.arc(bx + Math.cos(a) * d, by + Math.sin(a) * d, 2 * (1 - e) + 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const pop = 1 + 0.4 * Math.max(0, 1 - effect.age * 7);
        ctx.save();
        ctx.globalAlpha = fade;
        stamp(getTextSprite(effect.text, effect.big ? 'popBig' : 'pop'), bx, effect.y * CELL - rise + 8, pop);
        ctx.restore();
    }

    // The square under the mouse: a glowing marching outline + a see-through preview of the piece
    if (hover) {
        const cell = cellAt(layer, hover.x, hover.y);
        const stack = inventory[hotbarSel];
        const def = stack ? ITEM_BY_ID[stack.id] : null;
        let colour = '#b7e05a';          // green: this will work
        if (removeMode) {
            colour = cell ? '#ff9c9c' : 'rgba(246, 243, 234, 0.35)';
        } else if (editMode) {
            colour = cell && cell.table ? '#d9b26f' : '#ff9c9c';
        } else if (!def) {
            colour = 'rgba(246, 243, 234, 0.35)';
        } else if (def.applies) {
            // Equipable: only works on a matching piece with nothing on it yet
            const works = cell && def.applies.includes(roleOf(cell)) && !cell.mods.includes(def.id);
            colour = works ? def.colour : '#ff9c9c';
        } else if (!TILE_BY_ID[def.id]) {
            colour = '#ff9c9c';            // an ingredient can't be placed
        } else if (!cell) {
            if (def.role === 'table' && layerContains(stack.table, layer)) {
                colour = '#ff9c9c';    // a table can't go inside itself
            } else {
                ctx.globalAlpha = 0.55;
                drawPiece(def.id, rotation, hover.x, hover.y, time, [], stack.table);
                ctx.globalAlpha = 1;
            }
        } else if (cell.kind !== def.id) {
            colour = '#ff9c9c';
        }
        ctx.save();
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = colour;
        roundedRect(hover.x * CELL + 2, hover.y * CELL + 2, CELL - 4, CELL - 4, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        glow(colour, 8, 0);
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -time * 14;
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        roundedRect(hover.x * CELL + 2, hover.y * CELL + 2, CELL - 4, CELL - 4, 8);
        ctx.stroke();
        ctx.restore();
    }
}
requestAnimationFrame(draw);

// Mouse and touch on the canvas
function squareFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / rect.width * COLS);
    const y = Math.floor((event.clientY - rect.top) / rect.height * ROWS);
    if (!inGrid(x, y)) {
        return null;
    }
    return { x: x, y: y };
}

canvas.addEventListener('pointermove', function (event) {
    hover = squareFromEvent(event);
});

canvas.addEventListener('pointerleave', function () {
    hover = null;
});

canvas.addEventListener('click', function (event) {
    const square = squareFromEvent(event);
    if (square) {
        const cell = cellAt(viewLayer(), square.x, square.y);
        if (event.shiftKey && cell && cell.table) {
            enterTable(cell.table); // Shift-click a table: go inside
            return;
        }
        clickSquare(square.x, square.y);
        saveSoon();
    }
});

// Right-click a chopping table: go inside (on any other square the normal menu stays)
canvas.addEventListener('contextmenu', function (event) {
    const square = squareFromEvent(event);
    const cell = square ? cellAt(viewLayer(), square.x, square.y) : null;
    if (cell && cell.table) {
        event.preventDefault();
        enterTable(cell.table);
    }
});

// =====================================================================
//  SAVING
// =====================================================================
// The factory is saved as a list of short texts, one per square: "" (empty) or "belt:0".
// Upgrades add a third part: "fish:0:golden_soy_sauce,wasabi".
// A chopping table carries its inside in square brackets: "chopping_table:0[ ...48 squares split by ; ... ]".
// A table inside a table is just a table text inside those brackets, so it can go on forever,
// and it all still fits in the same two fields (factory and inventory) the Firestore rules already allow.

// "belt:0" / "fish:0:wasabi" / "chopping_table:0": a piece without its inside
function cellHead(cell) {
    return cell.kind + ':' + cell.dir + (cell.mods.length > 0 ? ':' + cell.mods.join(',') : '');
}

// The reverse of cellHead (null if it is not a real piece). A chopping table gets no inside yet.
function cellFromHead(head) {
    const parts = String(head).split(':');
    const kind = parts[0];
    const dir = Number(parts[1]);
    if (!TILE_BY_ID[kind] || !(dir >= 0 && dir <= 3)) {
        return null;
    }
    const cell = { kind: kind, dir: dir, mods: [] };
    if (TILE_BY_ID[kind].role === 'table') {
        cell.table = newLayer(); // (replaced by the real inside when the text has one)
    }
    for (const id of String(parts[2] || '').split(',')) {
        const equip = ITEM_BY_ID[id];
        if (equip && equip.applies && equip.applies.includes(TILE_BY_ID[kind].role) && !cell.mods.includes(id)) {
            cell.mods.push(id);
        }
    }
    return cell;
}

// One whole floor as text: its 48 squares split by ";" and the inside of every table in [ ].
// Loops instead of calling itself, so a table inside a table inside a table... is fine.
function layerToText(root) {
    const out = [];
    const stack = [{ grid: root.grid, i: 0 }];
    while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (frame.i >= CELLS) {
            stack.pop();
            if (stack.length > 0) {
                out.push(']');
            }
            continue;
        }
        if (frame.i > 0) {
            out.push(';');
        }
        const cell = frame.grid[frame.i];
        frame.i = frame.i + 1;
        if (cell) {
            out.push(cellHead(cell));
            if (cell.table) {
                out.push('[');
                stack.push({ grid: cell.table.grid, i: 0 });
            }
        }
    }
    return out.join('');
}

// The reverse of layerToText. Bad text gives empty squares instead of an error.
function textToLayer(text) {
    const root = newLayer();
    const stack = [{ layer: root, i: 0, head: '', opened: false }];

    // The square we were reading is done: store it (unless it was a table, which was stored at its "[")
    function finishSquare(frame) {
        if (!frame.opened && frame.head !== '' && frame.i < CELLS) {
            const cell = cellFromHead(frame.head);
            if (cell) {
                frame.layer.grid[frame.i] = cell;
            }
        }
        frame.i = frame.i + 1;
        frame.head = '';
        frame.opened = false;
    }

    for (let k = 0; k < text.length; k++) {
        const ch = text[k];
        const frame = stack[stack.length - 1];
        if (ch === ';') {
            finishSquare(frame);
        } else if (ch === '[') {
            const cell = cellFromHead(frame.head);
            let inside = newLayer(); // (thrown away if this square is not a real table)
            if (cell && TILE_BY_ID[cell.kind].role === 'table' && frame.i < CELLS) {
                cell.table = inside;
                frame.layer.grid[frame.i] = cell;
            }
            frame.opened = true;
            stack.push({ layer: inside, i: 0, head: '', opened: false });
        } else if (ch === ']') {
            if (stack.length > 1) {
                finishSquare(frame);
                stack.pop();
            }
        } else {
            frame.head = frame.head + ch;
        }
    }
    finishSquare(stack[stack.length - 1]);
    return root;
}

function gridToList(layer) {
    return layer.grid.map(function (cell) {
        if (!cell) {
            return '';
        }
        return cellHead(cell) + (cell.table ? '[' + layerToText(cell.table) + ']' : '');
    });
}

// Returns the 48 squares (empty ones if the saved list is missing or wrong)
function listToGrid(list) {
    const result = emptyGrid();
    if (!Array.isArray(list) || list.length !== CELLS) {
        return result;
    }
    for (let i = 0; i < list.length; i++) {
        const text = String(list[i]);
        const open = text.indexOf('[');
        if (open < 0) {
            result[i] = cellFromHead(text);
        } else if (text.endsWith(']')) {
            const cell = cellFromHead(text.slice(0, open));
            if (cell && TILE_BY_ID[cell.kind].role === 'table') {
                cell.table = textToLayer(text.slice(open + 1, -1));
                result[i] = cell;
            }
        }
    }
    return result;
}

// An inventory slot as text: "belt:12". A chopping table carries its inside: "chopping_table:1[...]".
function slotToText(s) {
    if (!s) {
        return '';
    }
    return s.id + ':' + s.n + (s.table ? '[' + layerToText(s.table) + ']' : '');
}

// The reverse (null if it is not a real item)
function slotFromText(text) {
    text = String(text);
    let inside = null;
    const open = text.indexOf('[');
    if (open >= 0) {
        if (!text.endsWith(']')) {
            return null;
        }
        inside = text.slice(open + 1, -1);
        text = text.slice(0, open);
    }
    const parts = text.split(':');
    const n = Math.floor(Number(parts[1]));
    if (!ITEM_BY_ID[parts[0]] || !(n >= 1)) {
        return null;
    }
    const stack = { id: parts[0], n: Math.min(n, stackMax(parts[0])) };
    if (parts[0] === TABLE_ID) {
        stack.table = inside === null ? newLayer() : textToLayer(inside);
    }
    return stack;
}

// The inventory is saved as a list of INV_SLOTS short texts: "" (empty) or "belt:12".
function inventoryToSave() {
    return inventory.map(slotToText);
}

function inventoryFromSave(saved) {
    const result = emptyInventory();
    if (Array.isArray(saved)) {
        // The new format: one text per slot
        for (let i = 0; i < Math.min(saved.length, INV_SLOTS); i++) {
            result[i] = slotFromText(saved[i]);
        }
    } else if (saved && typeof saved === 'object') {
        // Old saves: { belt: 3, fish: 1 }. Fill the slots in order, so the hotbar
        // starts out the way the old toolbar looked.
        for (const def of TILES) {
            const n = Math.floor(Number(saved[def.id]) || 0);
            const count = Math.min(Math.max(n, 0), MAX_PER_KIND);
            if (count > 0 && !addToSlots(result, def.id, count)) {
                console.warn('Not enough inventory room while converting an old save:', def.id);
            }
        }
    }
    return result;
}

// Everything that goes into the player's Firestore document
function saveData(pointsValue, chopsticksValue, slotsList) {
    const data = {
        name: playerName,
        points: Math.round(pointsValue * 100) / 100, // keep 2 decimals
        chopsticks: chopsticksValue,
        factory: gridToList(rootLayer),
        inventory: slotsList.map(slotToText),
        anvil: anvil,
        savedAt: serverTimestamp() // Google's clock, not the player's
    };
    if (tableSlot) {
        data.tableSlot = slotToText(tableSlot); // only present while a chopping table sits in the special slot
    }
    if (getTradeId()) {
        data.trade = getTradeId(); // the trade you are in right now (only present while you are in one)
    }
    return data;
}

// The leaderboard entry is a tiny public copy of your name and points.
// It is written together with your save, but at most every 30 seconds
// (and always when you change your name or leave the page) to keep writes low.
const BOARD_EVERY = 30000;
let lastBoardWrite = -BOARD_EVERY;
let boardForce = true;

async function save() {
    if (!currentUser || !unsaved || isSaveBlocked()) {
        return;
    }
    unsaved = false;
    const uid = currentUser.uid;
    const withBoard = boardForce || performance.now() - lastBoardWrite >= BOARD_EVERY;
    boardForce = false;
    try {
        const data = saveData(points, chopsticks, inventoryForSave());
        // A Firestore document holds about 1 million characters. Better to say so than to fail every time.
        if (data.factory.join('').length + data.inventory.join('').length + (data.tableSlot ? data.tableSlot.length : 0) > MAX_SAVE_CHARS) {
            unsaved = true;
            boardForce = boardForce || withBoard;
            showMessage('Your factory is too big to save! Take some pieces out of your tables.');
            return;
        }
        const batch = writeBatch(db);
        batch.set(doc(db, 'users', uid), data);
        if (withBoard) {
            batch.set(doc(db, 'leaderboard', uid), {
                name: playerName,
                points: Math.round(points * 100) / 100,
                savedAt: serverTimestamp()
            });
        }
        await batch.commit();
        if (withBoard) {
            lastBoardWrite = performance.now();
        }
    } catch (error) {
        unsaved = true; // try again next time
        if (withBoard) {
            boardForce = true;
        }
        console.error('Save failed:', error);
    }
}

setInterval(save, 10000);

// Important changes (buying, placing, removing) save almost right away,
// so a refresh a moment later does not lose them. Plain clicks and sales
// still wait for the 10 second timer, to keep the number of writes low.
let saveTimer = null;
function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
}

// Best effort when the page is closed or refreshed
window.addEventListener('pagehide', function () {
    boardForce = true;
    save();
});

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
        boardForce = true;
        save();
    }
});

// =====================================================================
//  LOGIN
// =====================================================================
const provider = new GoogleAuthProvider();

document.getElementById('login-btn').addEventListener('click', async function () {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Login failed:', error.code);
        document.getElementById('login-error').innerText = 'Login failed: ' + error.code;
    }
});

document.getElementById('logout-btn').addEventListener('click', async function () {
    boardForce = true;
    await save();          // don't lose progress
    await signOut(auth);
});

// Runs at page load and every time someone logs in or out
onAuthStateChanged(auth, async function (user) {
    if (user) {
        try {
            const snapshot = await getDoc(doc(db, 'users', user.uid));
            resetGame();
            resetTrade();
            playerName = cleanName(user.displayName) || 'Player';
            if (snapshot.exists()) {
                const data = snapshot.data();
                playerName = cleanName(data.name) || playerName;
                points = Number(data.points) || 0;
                // Older saves kept this inside "owned"
                chopsticks = Number(data.chopsticks) || Number(data.owned && data.owned.chopsticks) || 0;
                rootLayer.grid = listToGrid(data.factory);
                inventory = inventoryFromSave(data.inventory); // older saves have none: starts empty
                const savedSlot = typeof data.tableSlot === 'string' ? slotFromText(data.tableSlot) : null;
                tableSlot = savedSlot && savedSlot.id === TABLE_ID ? savedSlot : null; // older saves have none
                anvil = data.anvil === true;
                unsaved = false;
            } else {
                // New player: create their document right away, empty.
                await setDoc(doc(db, 'users', user.uid), saveData(0, 0, inventory));
                unsaved = false;
            }
            currentUser = user;
            // Were you in the middle of a trade? Carry on with it.
            if (snapshot.exists() && typeof snapshot.data().trade === 'string' && snapshot.data().trade) {
                resumeTrade(snapshot.data().trade);
            }
            boardForce = true;
            unsaved = true;   // puts you on the leaderboard
            saveSoon();
            showName();
            showScreen('menu-screen');
        } catch (error) {
            console.error('Load failed:', error);
            document.getElementById('login-error').innerText = 'Could not load your progress. Check the Firestore rules.';
            showScreen('login-screen');
        }
    } else {
        currentUser = null;
        resetGame();
        resetTrade();
        unsaved = false;
        showScreen('login-screen');
    }
});

// =====================================================================
//  MUSIC: one song per screen (files are in Sound/Music/)
// =====================================================================
// Screens that are not listed here play the main theme.
const MUSIC_DIR = 'Sound/Music/';
const MUSIC_DEFAULT = 'Main_Theme.mp3';
const SCREEN_MUSIC = {
    'menu-screen': 'MainMenu.mp3',
    'shop-screen': 'Shop.mp3',
    'settings-screen': 'Codes.mp3'
};
const DEFAULT_VOLUME = 50;   // percent

const musicTracks = {};      // file name -> <audio> element
let currentMusic = null;     // the file that should be playing now
let musicVolume = loadVolume() / 100;
let musicBlocked = false;    // true when the browser refused to play before a click

function loadVolume() {
    try {
        const saved = localStorage.getItem('sushiMusicVolume');
        if (saved !== null && Number(saved) >= 0 && Number(saved) <= 100) {
            return Number(saved);
        }
    } catch (error) {}
    return DEFAULT_VOLUME;
}

function getTrack(file) {
    if (!musicTracks[file]) {
        const audio = document.createElement('audio');
        audio.src = MUSIC_DIR + file;
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
        audio.dataset.track = file;
        audio.hidden = true;
        document.body.appendChild(audio);
        musicTracks[file] = audio;
    }
    return musicTracks[file];
}

// Slowly changes the volume of a song (pauseAtEnd = stop it when it is quiet)
function fadeMusic(audio, target, ms, pauseAtEnd) {
    clearInterval(audio.fadeTimer);
    const from = audio.volume;
    const steps = Math.max(1, Math.round(ms / 50));
    let step = 0;
    audio.fadeTimer = setInterval(function () {
        step = step + 1;
        audio.volume = Math.min(1, Math.max(0, from + (target - from) * step / steps));
        if (step >= steps) {
            clearInterval(audio.fadeTimer);
            if (pauseAtEnd) {
                audio.pause();
            }
        }
    }, 50);
}

function startMusic() {
    if (!currentMusic || musicVolume === 0 || document.visibilityState === 'hidden') {
        return;
    }
    const audio = getTrack(currentMusic);
    if (!audio.paused) {
        fadeMusic(audio, musicVolume, 400, false);
        return;
    }
    audio.volume = 0;
    audio.play().then(function () {
        musicBlocked = false;
        fadeMusic(audio, musicVolume, 700, false);
    }).catch(function () {
        // Browsers only allow sound after you click something. We try again on the first click.
        musicBlocked = true;
    });
}

function playMusicFor(screenId) {
    const file = SCREEN_MUSIC[screenId] || MUSIC_DEFAULT;
    if (file === currentMusic) {
        return; // same song: keep playing, don't restart it
    }
    if (currentMusic) {
        fadeMusic(getTrack(currentMusic), 0, 500, true);
    }
    currentMusic = file;
    startMusic();
}

function setMusicVolume(percent, remember) {
    musicVolume = percent / 100;
    document.getElementById('music-value').innerText = percent + '%';
    document.getElementById('music-input').value = percent;
    if (remember) {
        try {
            localStorage.setItem('sushiMusicVolume', String(percent));
        } catch (error) {}
    }
    if (musicVolume === 0) {
        if (currentMusic) {
            getTrack(currentMusic).pause();
        }
    } else {
        startMusic();
    }
}

document.getElementById('music-input').addEventListener('input', function (event) {
    setMusicVolume(Number(event.target.value), true);
});

// The first click or key press lets the browser play music
function unlockMusic() {
    if (musicBlocked) {
        startMusic();
    }
}
document.addEventListener('pointerdown', unlockMusic);
document.addEventListener('keydown', unlockMusic);

// Pause when you switch to another tab
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
        if (currentMusic) {
            getTrack(currentMusic).pause();
        }
    } else {
        startMusic();
    }
});

setMusicVolume(Math.round(musicVolume * 100), false);

// =====================================================================
//  SOUND EFFECTS: a click sound (files are in Sound/Sound_Effects/), with its own volume
// =====================================================================
const SFX_DIR = 'Sound/Sound_Effects/';
const CLICK_SOUND = 'Mouse_Click.mp3';
const DEFAULT_SFX_VOLUME = 50;   // percent
const MAX_CLICK_SOUNDS = 8;      // at most this many at the same time (fast clicking)

let sfxVolume = loadSfxVolume() / 100;
let clickSounds = 0;
const clickBase = new Audio(SFX_DIR + CLICK_SOUND);
clickBase.preload = 'auto';

function loadSfxVolume() {
    try {
        const saved = localStorage.getItem('sushiSfxVolume');
        if (saved !== null && Number(saved) >= 0 && Number(saved) <= 100) {
            return Number(saved);
        }
    } catch (error) {}
    return DEFAULT_SFX_VOLUME;
}

function playClick() {
    if (sfxVolume === 0 || clickSounds >= MAX_CLICK_SOUNDS) {
        return;
    }
    // A copy of the sound, so quick clicks can overlap instead of cutting each other off
    const sound = clickBase.cloneNode();
    sound.volume = sfxVolume;
    clickSounds = clickSounds + 1;
    const done = function () {
        clickSounds = Math.max(0, clickSounds - 1);
    };
    sound.addEventListener('ended', done);
    sound.addEventListener('error', done);
    sound.play().catch(done);
}

function setSfxVolume(percent, remember) {
    sfxVolume = percent / 100;
    document.getElementById('sfx-value').innerText = percent + '%';
    document.getElementById('sfx-input').value = percent;
    if (remember) {
        try {
            localStorage.setItem('sushiSfxVolume', String(percent));
        } catch (error) {}
    }
}

document.getElementById('sfx-input').addEventListener('input', function (event) {
    setSfxVolume(Number(event.target.value), true);
});
// Let go of the slider: play the sound once, so you hear how loud it is
document.getElementById('sfx-input').addEventListener('change', playClick);

// Every click on something you can press makes the sound (also with the keyboard: Enter and Space click too)
document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) {
        return;
    }
    if (event.target.closest('input[type="range"], input[type="text"], textarea')) {
        return; // sliders play their own sound when you let go
    }
    playClick();
}, true);

setSfxVolume(Math.round(sfxVolume * 100), false);

// =====================================================================
//  SETTINGS: username, game size, redeem codes
// =====================================================================
function cleanName(raw) {
    return String(raw || '')
        .replace(/[\u0000-\u001f\u007f]/g, '') // no control characters
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_NAME);
}

function showName() {
    document.getElementById('login-status').innerText = 'Signed in as ' + playerName;
}

// A line of feedback under a setting: kind is 'good' or 'bad'
function setMessage(id, text, kind) {
    const box = document.getElementById(id);
    box.innerText = text;
    box.className = 'setting-msg' + (kind ? ' ' + kind : '');
}

// ---- Game size (saved on this device, because it depends on this screen)
function loadScale() {
    try {
        const saved = Number(localStorage.getItem('sushiScale'));
        if (saved >= MIN_SCALE && saved <= MAX_SCALE) {
            return saved;
        }
    } catch (error) {}
    return DEFAULT_SCALE;
}

function applyScale(percent, remember) {
    document.documentElement.style.setProperty('--ui-scale', percent / 100);
    document.getElementById('scale-value').innerText = percent + '%';
    document.getElementById('scale-input').value = percent;
    document.getElementById('scale-reset').innerText = 'Reset to ' + DEFAULT_SCALE + '%';
    if (remember) {
        try {
            localStorage.setItem('sushiScale', String(percent));
        } catch (error) {}
    }
}
applyScale(loadScale(), false);

document.getElementById('scale-input').addEventListener('input', function (event) {
    applyScale(Number(event.target.value), true);
});

document.getElementById('scale-reset').addEventListener('click', function () {
    applyScale(DEFAULT_SCALE, true);
});

// ---- Username (saved in your Firestore document)
function fillSettings() {
    document.getElementById('name-input').value = playerName;
    setMessage('name-msg', '', '');
    setMessage('code-msg', '', '');
}

function saveName() {
    const name = cleanName(document.getElementById('name-input').value);
    if (!name) {
        setMessage('name-msg', 'Your name can not be empty.', 'bad');
        return;
    }
    playerName = name;
    document.getElementById('name-input').value = name;
    showName();
    unsaved = true;
    boardForce = true;
    saveSoon();
    setMessage('name-msg', 'Saved!', 'good');
}

document.getElementById('name-save').addEventListener('click', saveName);
document.getElementById('name-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        saveName();
    }
});

document.getElementById('settings-back').addEventListener('click', function () {
    showScreen(settingsReturn);
});

// ---- Redeem codes
// Codes live in Firestore: collection "Codes", document id = the code (UPPERCASE).
// A code document can have:
//   points: 500            chopsticks: 2
//   items: { belt: 10, golden_soy_sauce: 1 }      message: "Welcome!"
// Each account can use each code once: that is stored in users/{uid}/redeemed/{CODE},
// and the Firestore rules refuse to create that document twice.
function normalizeCode(raw) {
    const code = String(raw || '').trim().toUpperCase();
    return /^[A-Z0-9_-]{1,40}$/.test(code) ? code : '';
}

// Reads and checks the reward in a code document. Returns null if it makes no sense.
function readReward(data) {
    const reward = { points: 0, chopsticks: 0, items: [], message: '' };
    const whole = function (value, max) {
        const n = Math.floor(Number(value));
        return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
    };
    reward.points = whole(data.points, 1e12);
    reward.chopsticks = whole(data.chopsticks, 100000);
    if (typeof data.message === 'string') {
        reward.message = data.message.slice(0, 120);
    }
    if (data.items && typeof data.items === 'object') {
        for (const id of Object.keys(data.items)) {
            if (!ITEM_BY_ID[id]) {
                console.warn('Code has an unknown item:', id);
                return null; // do not burn the code on a typo
            }
            const n = whole(data.items[id], MAX_STACK);
            if (n > 0) {
                reward.items.push({ id: id, n: n });
            }
        }
    }
    if (reward.points === 0 && reward.chopsticks === 0 && reward.items.length === 0) {
        return null;
    }
    return reward;
}

function rewardText(reward) {
    const parts = [];
    if (reward.points > 0) {
        parts.push(format(reward.points) + ' points');
    }
    if (reward.chopsticks > 0) {
        parts.push(reward.chopsticks + ' chopsticks');
    }
    for (const item of reward.items) {
        parts.push(item.n + ' x ' + ITEM_BY_ID[item.id].name);
    }
    return parts.join(', ');
}

let redeeming = false;

async function redeemCode() {
    if (redeeming || !currentUser) {
        return;
    }
    const input = document.getElementById('code-input');
    const code = normalizeCode(input.value);
    if (!code) {
        setMessage('code-msg', 'Type a code first.', 'bad');
        return;
    }

    redeeming = true;
    document.getElementById('code-btn').disabled = true;
    setMessage('code-msg', 'Checking...', '');
    try {
        const uid = currentUser.uid;
        const usedRef = doc(db, 'users', uid, 'redeemed', code);
        const results = await Promise.all([getDoc(doc(db, 'Codes', code)), getDoc(usedRef)]);
        const codeSnap = results[0];
        const usedSnap = results[1];

        if (!codeSnap.exists()) {
            setMessage('code-msg', "That code doesn't exist.", 'bad');
            return;
        }
        if (usedSnap.exists()) {
            setMessage('code-msg', 'You already used that code.', 'bad');
            return;
        }
        const reward = readReward(codeSnap.data());
        if (!reward) {
            setMessage('code-msg', "That code doesn't work right now.", 'bad');
            return;
        }

        // Work out the new state on copies first
        const newSlots = cloneSlots(inventory);
        for (const item of reward.items) {
            if (!addToSlots(newSlots, item.id, item.n)) {
                setMessage('code-msg', 'Your inventory is too full for this code. Make some room and try again.', 'bad');
                return;
            }
        }
        const newPoints = points + reward.points;
        const newChopsticks = Math.min(chopsticks + reward.chopsticks, 100000);

        // One batch: the "you used this" marker and your new save go in together or not at all
        const batch = writeBatch(db);
        batch.set(usedRef, { redeemedAt: serverTimestamp() });
        batch.set(doc(db, 'users', uid), saveData(newPoints, newChopsticks, newSlots));
        await batch.commit();

        // It worked: give the reward in the game
        points = points + reward.points;
        chopsticks = Math.min(chopsticks + reward.chopsticks, 100000);
        for (const item of reward.items) {
            if (!addToSlots(inventory, item.id, item.n)) {
                inventory = newSlots; // (only if the bag changed while we were waiting)
                break;
            }
        }
        unsaved = true;
        displayDirty = true;
        saveSoon();
        input.value = '';
        setMessage('code-msg', 'Code redeemed! You got ' + rewardText(reward) + '.' +
            (reward.message ? ' ' + reward.message : ''), 'good');
    } catch (error) {
        console.error('Redeem failed:', error);
        if (error.code === 'permission-denied') {
            setMessage('code-msg', 'That code could not be redeemed. Did you already use it?', 'bad');
        } else {
            setMessage('code-msg', 'Something went wrong. Try again in a moment.', 'bad');
        }
    } finally {
        redeeming = false;
        document.getElementById('code-btn').disabled = false;
    }
}

document.getElementById('code-btn').addEventListener('click', redeemCode);
document.getElementById('code-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        redeemCode();
    }
});

// =====================================================================
//  LEADERBOARD: top 10 by points
// =====================================================================
let boardLoading = false;

// quiet = an automatic refresh: no "Loading..." text and no extra save
async function loadLeaderboard(quiet) {
    if (boardLoading) {
        return;
    }
    boardLoading = true;
    const list = document.getElementById('board-list');
    const status = document.getElementById('board-status');
    try {
        if (quiet !== true) {
            status.innerText = 'Loading...';
            // Make sure your own latest points are on the board first
            boardForce = true;
            unsaved = true;
            await save();
        }

        const snap = await getDocs(query(collection(db, 'leaderboard'), orderBy('points', 'desc'), limit(10)));
        list.innerHTML = '';
        let rank = 0;
        snap.forEach(function (entry) {
            rank = rank + 1;
            const data = entry.data();
            const row = document.createElement('div');
            row.className = 'item board-row' + (rank <= 3 ? ' top' + rank : '') + (currentUser && entry.id === currentUser.uid ? ' me' : '');
            const place = document.createElement('span');
            place.className = 'board-rank';
            place.innerText = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
            const name = document.createElement('span');
            name.className = 'item-name board-name';
            name.innerText = cleanName(data.name) || 'Player';
            const score = document.createElement('span');
            score.className = 'points-text';
            score.innerText = format(Number(data.points) || 0);
            row.append(place, name, score);
            list.appendChild(row);
        });
        status.innerText = rank === 0 ? 'Nobody is on the board yet.' : 'Your points: ' + format(points);
    } catch (error) {
        console.error('Leaderboard failed:', error);
        status.innerText = 'Could not load the leaderboard.';
    } finally {
        boardLoading = false;
    }
}

document.getElementById('board-refresh').addEventListener('click', function () {
    loadLeaderboard(false);
});

// While the leaderboard is open it updates itself every 10 seconds
setInterval(function () {
    if (currentScreen === 'leaderboard-screen' && document.visibilityState === 'visible') {
        loadLeaderboard(true);
    }
}, 10000);

// =====================================================================
//  THE WEIRDNESS: fill a whole factory with diamonds...
// =====================================================================
// When every square of the floor you are on holds a diamond, something weird happens. You can say
// "Stop the weirdness" (it asks again when you place a diamond again, or when you come back later), or
// "Let me see then!": the diamonds are pulled together and turn into a Chopping table in your inventory.
// This works on any floor: the main factory, or the inside of a chopping table.

function isAllDiamonds(layer) {
    return layer.grid.every(function (cell) {
        return cell && cell.kind === 'diamond';
    });
}

// Is there room in the inventory for the table, and for the upgrades that sat on the diamonds?
function weirdRoom(layer) {
    const copy = cloneSlots(inventory, false);
    if (!addToSlots(copy, TABLE_ID, 1)) {
        return false;
    }
    for (const cell of layer.grid) {
        for (const id of cell.mods) {
            if (!addToSlots(copy, id, 1)) {
                return false;
            }
        }
    }
    return true;
}

function checkWeirdness() {
    if (weirdBusy || !currentUser || currentScreen !== 'game-screen') {
        return;
    }
    const layer = viewLayer();
    if (!isAllDiamonds(layer)) {
        weirdDeclined = false; // the diamonds are gone: next time it is allowed to ask again
        return;
    }
    if (weirdDeclined) {
        return;
    }
    if (!weirdRoom(layer)) {
        showMessage('Something weird is going on... but your inventory is full. Make some room!');
        return;
    }
    weirdBusy = true;
    document.getElementById('weird-popup').classList.remove('hidden');
    document.getElementById('weird-go').focus();
}

function weirdAfter(ms, fn) {
    weirdTimers.push(setTimeout(fn, ms));
}

// Hides the popup and the event, and stops the event if it was running
function cancelWeird() {
    for (const t of weirdTimers) {
        clearTimeout(t);
    }
    weirdTimers = [];
    weirdBusy = false;
    document.getElementById('weird-popup').classList.add('hidden');
    document.getElementById('weird-scene').classList.add('hidden');
}

function weirdLine(text) {
    document.getElementById('weird-line').innerText = text;
}

// The diamonds turn into a table: this is the moment the factory really changes
function makeTableFromDiamonds(layer) {
    const upgrades = [];
    for (const cell of layer.grid) {
        for (const id of cell.mods) {
            upgrades.push(id);
        }
    }
    addToSlots(inventory, TABLE_ID, 1);
    for (const id of upgrades) {
        addToSlots(inventory, id, 1); // the soy sauce etc. that was on the diamonds comes back
    }
    for (let i = 0; i < layer.grid.length; i++) {
        layer.grid[i] = null;
    }
    layer.sushi = [];
    layer.timers = {};
    layer.effects = [];
    unsaved = true;
    displayDirty = true;
    saveSoon();
}

function startWeirdScene() {
    const layer = viewLayer(); // the floor that is full of diamonds
    const scene = document.getElementById('weird-scene');
    const field = document.getElementById('weird-field');

    // 48 diamonds in the same places as on the factory floor
    field.innerHTML = '';
    for (let i = 0; i < CELLS; i++) {
        const gem = document.createElement('div');
        gem.className = 'weird-gem';
        gem.innerText = '💎';
        gem.style.setProperty('--cx', String((COLS - 1) / 2 - (i % COLS)));
        gem.style.setProperty('--cy', String((ROWS - 1) / 2 - Math.floor(i / COLS)));
        field.appendChild(gem);
    }
    document.getElementById('weird-table').classList.add('hidden');
    document.getElementById('weird-done').classList.add('hidden');
    scene.className = 'overlay phase-hum';
    weirdLine('The diamonds are humming...');

    weirdAfter(1800, function () {
        scene.className = 'overlay phase-pull';
        weirdLine('They are pulling together...');
    });
    weirdAfter(3300, function () {
        // Check again: it must still be the same full floor, with room for the table
        if (!isAllDiamonds(layer) || !weirdRoom(layer)) {
            cancelWeird();
            return;
        }
        makeTableFromDiamonds(layer);
        scene.className = 'overlay phase-flash';
        weirdLine('');
    });
    weirdAfter(3900, function () {
        scene.className = 'overlay phase-table';
        document.getElementById('weird-table').classList.remove('hidden');
        weirdLine('A Chopping Table appeared! It is in your Inventory.');
        const done = document.getElementById('weird-done');
        done.classList.remove('hidden');
        done.focus();
    });
}

document.getElementById('weird-stop').addEventListener('click', function () {
    cancelWeird();
    weirdDeclined = true;
    showMessage('The weirdness fades... for now.');
});

document.getElementById('weird-go').addEventListener('click', function () {
    document.getElementById('weird-popup').classList.add('hidden');
    document.getElementById('weird-scene').classList.remove('hidden');
    startWeirdScene();
});

document.getElementById('weird-done').addEventListener('click', function () {
    cancelWeird();
    weirdDeclined = false;
});

// =====================================================================
//  TRADING lives in trade.js. This is everything it may use from here.
// =====================================================================
initTrade({
    TABLE_ID: TABLE_ID,
    setMessage: setMessage,
    format: format,
    cloneSlots: cloneSlots,
    countInSlots: countInSlots,
    addToSlots: addToSlots,
    getUser: function () { return currentUser; },
    getPlayerName: function () { return playerName; },
    getScreen: function () { return currentScreen; },
    getPoints: function () { return points; },
    getChopsticks: function () { return chopsticks; },
    getInventory: function () { return inventory; },
    getAnvilIn: function () { return anvilIn; },
    inventoryForSave: inventoryForSave,
    buildSave: saveData,
    addPoints: function (n) {
        points = points + n;
        displayDirty = true;
    },
    markUnsaved: function () {
        unsaved = true;
        saveSoon();
    }
});

// =====================================================================
//  BUTTONS
// =====================================================================
// Every button with data-goto="..." switches to that screen
for (const button of document.querySelectorAll('[data-goto]')) {
    button.addEventListener('click', function () {
        showScreen(button.dataset.goto);
    });
}

document.getElementById('click-btn').addEventListener('click', pointsButton);
document.getElementById('chopsticks-btn').addEventListener('click', buyChopsticks);
