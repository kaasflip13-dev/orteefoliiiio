
'use strict';

// ======================================================
// FACTORY TYCOON
// Instant processing • More products • Optional machines
// ======================================================

const canvas = document.getElementById('factoryCanvas');
const ctx = canvas.getContext('2d');

const COLS = 16;
const ROWS = 10;

const BELT_TIME = 0.55;
const MAX_BUFFER = 100;
const SAVE_KEY = 'factoryTycoon_clear_v2';
const OLD_SAVE_KEY = 'factoryTycoon_clear_v1';

const SMELT_YIELD = 5;
const ASSEMBLE_YIELD = 6;

const SELL_PRICES = {
  ore: 5,
  metal: 15,
  gear: 40
};

const DIRS = [
  { x: 1, y: 0, name: 'Right →', arrow: '→' },
  { x: 0, y: 1, name: 'Down ↓', arrow: '↓' },
  { x: -1, y: 0, name: 'Left ←', arrow: '←' },
  { x: 0, y: -1, name: 'Up ↑', arrow: '↑' }
];

const MACHINES = {
  miner: {
    name: 'Ore Miner',
    icon: '⛏',
    price: 100,
    color: '#a57a4c',
    time: 2,
    output: 'ore',
    description: 'Mines ore automatically. The ore can be sold directly or processed.'
  },

  smelter: {
    name: 'Smelter',
    icon: '🔥',
    price: 220,
    color: '#b96143',
    input: 'ore',
    output: 'metal',
    description: 'INSTANT PROCESSING. One ore becomes five metal.'
  },

  assembler: {
    name: 'Assembler',
    icon: '⚙',
    price: 320,
    color: '#477da4',
    input: 'metal',
    output: 'gear',
    description: 'INSTANT PROCESSING. One metal becomes six gears.'
  },

  belt: {
    name: 'Conveyor Belt',
    icon: '➜',
    price: 20,
    color: '#667d8c',
    description: 'Moves individual products in the direction of its arrow.'
  },

  seller: {
    name: 'Sell Station',
    icon: '💰',
    price: 180,
    color: '#428665',
    description: 'FINAL DESTINATION. Accepts ore, metal and gears and turns them into cash.'
  }
};

// ======================================================
// GAME STATE
// ======================================================

let money = 1200;
let goal = 1500;

let machines = [];
let selectedTool = 'select';
let selectedId = null;

let beltDirection = 0;
let gameSpeed = 1;
let paused = false;

let animationTime = 0;
let playTime = 0;
let lastTime = 0;

let uiTimer = 0;
let rateTimer = 0;
let saveTimer = 0;

let cellSize = 40;
let offsetX = 0;
let offsetY = 0;

let pointerCell = null;
let particles = [];
let toastTimer = null;

const production = {
  ore: 0,
  metal: 0,
  gear: 0,
  cash: 0
};

const rates = {
  ore: 0,
  metal: 0,
  gear: 0,
  cash: 0
};

const $ = id => document.getElementById(id);

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

const number = v =>
  Math.floor(v).toLocaleString('en-US');

// ======================================================
// CREATE MACHINE
// ======================================================

function createMachine(type, x, y, direction = 0) {
  return {
    id: `${Date.now()}_${Math.random()}`,
    type,
    x,
    y,
    dir: direction,
    level: 1,
    timer: 0,

    // Number of products waiting to leave this machine.
    output: 0,

    produced: 0,
    received: 0,
    sold: 0,
    revenue: 0,

    // A belt contains one visible moving product.
    item: null
  };
}

function machineAt(x, y) {
  return machines.find(
    m => m.x === x && m.y === y
  ) || null;
}

function selectedMachine() {
  return machines.find(
    m => m.id === selectedId
  ) || null;
}

function direction(machine) {
  return DIRS[machine.dir];
}

// ======================================================
// NOTIFICATIONS
// ======================================================

function showToast(message) {
  const el = $('toast');

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2200);
}

// ======================================================
// BUILD MENU
// ======================================================

function setTool(type) {
  if (type !== 'select' && !MACHINES[type]) return;

  selectedTool = type;
  selectedId = null;

  document.querySelectorAll('.tool-button').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.type === type
    );
  });

  $('selectedInfo').textContent =
    type === 'select'
      ? 'SELECT: Click on a building to inspect it'
      : `BUILD: ${MACHINES[type].name} — click an empty tile`;

  canvas.style.cursor =
    type === 'select' ? 'default' : 'crosshair';

  updateInspector();
  draw();
}

document.querySelectorAll('.tool-button').forEach(button => {
  button.addEventListener('click', () => {
    setTool(button.dataset.type);
  });
});

// ======================================================
// BELT DIRECTION
// ======================================================

function rotateDirection() {
  beltDirection = (beltDirection + 1) % 4;

  $('directionLabel').textContent =
    DIRS[beltDirection].name;

  draw();
}

function rotateSelectedBelt() {
  const machine = selectedMachine();

  if (machine && machine.type === 'belt') {
    machine.dir = (machine.dir + 1) % 4;

    updateInspector();
    draw();

    showToast('Conveyor direction changed!');
  } else {
    rotateDirection();
    showToast('New belt direction: ' + DIRS[beltDirection].name);
  }
}

$('rotateBtn').addEventListener(
  'click',
  rotateSelectedBelt
);

// ======================================================
// PLACE MACHINE
// ======================================================

function placeMachine(type, x, y) {
  if (machineAt(x, y)) {
    showToast('This tile is already occupied!');
    return;
  }

  const price = MACHINES[type].price;

  if (money < price) {
    showToast(`Not enough cash! You need $${price}.`);
    return;
  }

  money -= price;

  const machine = createMachine(
    type,
    x,
    y,
    beltDirection
  );

  machines.push(machine);
  selectedId = machine.id;

  updateUI();
  showToast(MACHINES[type].name + ' placed!');

  saveGame(false);
}

// ======================================================
// CANVAS INPUT
// ======================================================

function getCell(event) {
  const rect = canvas.getBoundingClientRect();

  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;

  const x = Math.floor((px - offsetX) / cellSize);
  const y = Math.floor((py - offsetY) / cellSize);

  if (
    x < 0 || x >= COLS ||
    y < 0 || y >= ROWS
  ) {
    return null;
  }

  return { x, y };
}

canvas.addEventListener('pointermove', event => {
  pointerCell = getCell(event);

  if (pointerCell) {
    $('coordsInfo').textContent =
      `X: ${pointerCell.x + 1} · Y: ${pointerCell.y + 1}`;
  } else {
    $('coordsInfo').textContent = 'X: -- · Y: --';
  }
});

canvas.addEventListener('pointerleave', () => {
  pointerCell = null;
  $('coordsInfo').textContent = 'X: -- · Y: --';
});

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;

  const cell = getCell(event);
  if (!cell) return;

  const existing = machineAt(cell.x, cell.y);

  if (selectedTool === 'select') {
    selectedId = existing ? existing.id : null;

    $('selectedInfo').textContent = existing
      ? `${MACHINES[existing.type].name} selected`
      : 'No building on this tile';

    updateInspector();
    draw();
    return;
  }

  if (existing) {
    selectedId = existing.id;
    updateInspector();
    draw();

    showToast('Tile occupied. Building selected.');
    return;
  }

  placeMachine(selectedTool, cell.x, cell.y);
});

// ======================================================
// ADJACENT BELTS
// ======================================================

function getAdjacentBelts(machine) {
  return DIRS.map(d =>
    machineAt(
      machine.x + d.x,
      machine.y + d.y
    )
  ).filter(m => m && m.type === 'belt');
}

// ======================================================
// MACHINE OUTPUT TO BELTS
// ======================================================

function sendOutputsToBelts() {
  for (const machine of machines) {
    if (
      machine.type === 'belt' ||
      machine.output <= 0
    ) {
      continue;
    }

    for (const belt of getAdjacentBelts(machine)) {
      if (belt.item) continue;

      const d = direction(belt);

      // A belt must point away from its producer.
      if (
        belt.x + d.x === machine.x &&
        belt.y + d.y === machine.y
      ) {
        continue;
      }

      belt.item = {
        type: MACHINES[machine.type].output,
        progress: 0,
        blocked: false
      };

      machine.output--;
      break;
    }
  }
}

// ======================================================
// INSTANT PROCESSING AND SELLING
// ======================================================

function acceptProduct(machine, product) {
  // ------------------------------
  // SMELTER
  // One ore = five metal.
  // NO TIMER.
  // ------------------------------

  if (
    machine.type === 'smelter' &&
    product === 'ore'
  ) {
    const amount =
      SMELT_YIELD + (machine.level - 1) * 2;

    if (machine.output + amount > MAX_BUFFER) {
      return false;
    }

    machine.output += amount;
    machine.received++;
    machine.produced += amount;

    production.metal += amount;

    createEffect(
      machine.x,
      machine.y,
      '#b5c9d8',
      '+' + amount + ' METAL'
    );

    showToast(
      '🔥 SMELTED! +' + amount + ' METAL'
    );

    return true;
  }

  // ------------------------------
  // ASSEMBLER
  // One metal = six gears.
  // NO TIMER.
  // ------------------------------

  if (
    machine.type === 'assembler' &&
    product === 'metal'
  ) {
    const amount =
      ASSEMBLE_YIELD + (machine.level - 1) * 3;

    if (machine.output + amount > MAX_BUFFER) {
      return false;
    }

    machine.output += amount;
    machine.received++;
    machine.produced += amount;

    production.gear += amount;

    createEffect(
      machine.x,
      machine.y,
      '#ffbd54',
      '+' + amount + ' GEARS'
    );

    showToast(
      '⚙ ASSEMBLED! +' + amount + ' GEARS'
    );

    return true;
  }

  // ------------------------------
  // SELL STATION
  // All three products can be sold.
  // No other machine is required.
  // ------------------------------

  if (
    machine.type === 'seller' &&
    Object.hasOwn(SELL_PRICES, product)
  ) {
    const value = SELL_PRICES[product];
    const earned = value * machine.level;

    money += earned;

    machine.received++;
    machine.sold++;
    machine.revenue += earned;

    production.cash += earned;

    createEffect(
      machine.x,
      machine.y,
      '#77dfab',
      '+$' + earned
    );

    showToast(
      '💰 SOLD ' +
      product.toUpperCase() +
      '! +$' + earned
    );

    return true;
  }

  // Wrong product: it remains on the belt.
  return false;
}

// ======================================================
// MOVE PRODUCTS ALONG THE CONVEYOR BELTS
// ======================================================

function moveProducts(dt) {
  const belts = machines.filter(
    m => m.type === 'belt'
  );

  const transfers = [];
  const reserved = new Set();

  for (const belt of belts) {
    if (!belt.item) continue;

    belt.item.blocked = false;

    belt.item.progress = Math.min(
      1,
      belt.item.progress + dt / BELT_TIME
    );

    if (belt.item.progress < 1) continue;

    const d = direction(belt);

    const next = machineAt(
      belt.x + d.x,
      belt.y + d.y
    );

    // No building at the end of the belt.
    // Keep the product visible and waiting.
    if (!next) {
      belt.item.blocked = true;
      continue;
    }

    // Next building is another belt.
    if (next.type === 'belt') {
      if (next.item || reserved.has(next.id)) {
        belt.item.blocked = true;
        continue;
      }

      reserved.add(next.id);

      transfers.push({
        source: belt,
        target: next,
        product: belt.item
      });

      continue;
    }

    // Next building is a processing machine or seller.
    const accepted = acceptProduct(
      next,
      belt.item.type
    );

    if (accepted) {
      belt.item = null;
    } else {
      // Incorrect product or full output buffer:
      // keep the item at the end of this belt.
      belt.item.blocked = true;
    }
  }

  // Transfer after checking all belts.
  // Products can only move one tile per step.
  for (const transfer of transfers) {
    if (!transfer.target.item) {
      transfer.target.item = {
        type: transfer.product.type,
        progress: 0,
        blocked: false
      };

      transfer.source.item = null;
    }
  }
}

// ======================================================
// MACHINE PRODUCTION
// ONLY THE MINER HAS A TIMER.
// SMELTER AND ASSEMBLER PROCESS IMMEDIATELY
// WHEN A PRODUCT ARRIVES ON THE BELT.
// ======================================================

function processMachines(dt) {
  for (const machine of machines) {
    if (machine.type !== 'miner') continue;

    if (machine.output >= MAX_BUFFER) continue;

    const interval =
      MACHINES.miner.time / machine.level;

    machine.timer += dt;

    while (
      machine.timer >= interval &&
      machine.output < MAX_BUFFER
    ) {
      machine.timer -= interval;

      machine.output++;
      machine.produced++;

      production.ore++;

      createEffect(
        machine.x,
        machine.y,
        '#d49a5a',
        '+ORE'
      );
    }
  }
}

// ======================================================
// ROUTE GUIDE
// SMELTER AND ASSEMBLER ARE OPTIONAL
// ======================================================

function updateRouteGuide() {
  const hasMiner = machines.some(m => m.type === 'miner');
  const hasSmelter = machines.some(m => m.type === 'smelter');
  const hasAssembler = machines.some(m => m.type === 'assembler');
  const hasSeller = machines.some(m => m.type === 'seller');

  $('stepMiner').classList.toggle('done', hasMiner);
  $('stepSmelter').classList.toggle('done', hasSmelter);
  $('stepAssembler').classList.toggle('done', hasAssembler);
  $('stepSeller').classList.toggle('done', hasSeller);

  const smelterLabel = $('stepSmelter').querySelector('b');
  const assemblerLabel = $('stepAssembler').querySelector('b');

  smelterLabel.textContent = hasSmelter
    ? 'SMELTER'
    : 'SMELTER OPTIONAL';

  assemblerLabel.textContent = hasAssembler
    ? 'ASSEMBLER'
    : 'ASSEMBLER OPTIONAL';

  let message;

  if (!hasMiner) {
    message = 'Start with a Miner. You can sell ore directly!';
  } else if (!hasSeller) {
    message = 'Place a Sell Station. The Miner can sell ore directly.';
  } else if (!hasSmelter && !hasAssembler) {
    message = 'Ready! You can earn cash by selling ore. Extra machines increase its value.';
  } else if (hasSmelter && !hasAssembler) {
    message = 'Your Smelter creates 5 metal instantly. You can sell metal directly.';
  } else if (hasAssembler) {
    message = 'Your Assembler creates 6 gears instantly. Connect them to the Sell Station!';
  } else {
    message = 'Your production line is ready!';
  }

  $('routeMessage').textContent = message;
}

// ======================================================
// DESTINATION INFORMATION
// ======================================================

function updateDestination() {
  const sellers = machines.filter(
    m => m.type === 'seller'
  );

  const card = $('destinationCard');

  const totalSold = sellers.reduce(
    (sum, m) => sum + m.sold,
    0
  );

  if (sellers.length === 0) {
    card.classList.remove('active');

    $('destinationTitle').textContent = 'Not built yet';
    $('destinationDescription').textContent =
      'Build a Sell Station to earn cash.';

  } else {
    card.classList.add('active');

    $('destinationTitle').textContent =
      sellers.length === 1
        ? 'Sell Station active'
        : sellers.length + ' Sell Stations active';

    $('destinationDescription').textContent =
      'ORE $5 · METAL $15 · GEARS $40';
  }

  $('soldCount').textContent = number(totalSold);
}

// ======================================================
// INVENTORY
// ======================================================

function inventory() {
  const stock = {
    ore: 0,
    metal: 0,
    gear: 0
  };

  for (const machine of machines) {
    if (
      machine.type === 'miner' ||
      machine.type === 'smelter' ||
      machine.type === 'assembler'
    ) {
      stock[MACHINES[machine.type].output] += machine.output;
    }

    if (machine.type === 'belt' && machine.item) {
      stock[machine.item.type]++;
    }
  }

  return stock;
}

// ======================================================
// PRODUCTION STATISTICS
// ======================================================

function updateRates(dt) {
  rateTimer += dt;

  if (rateTimer < 5) return;

  const factor = 60 / rateTimer;

  rates.ore = Math.round(production.ore * factor);
  rates.metal = Math.round(production.metal * factor);
  rates.gear = Math.round(production.gear * factor);
  rates.cash = Math.round(production.cash * factor);

  production.ore = 0;
  production.metal = 0;
  production.gear = 0;
  production.cash = 0;

  rateTimer = 0;
}

// ======================================================
// CASH MILESTONES
// ======================================================

function checkGoal() {
  if (money < goal) return;

  const reached = goal;

  goal = goal < 5000
    ? 5000
    : goal < 15000
      ? 15000
      : goal < 50000
        ? 50000
        : goal + 50000;

  showToast('🏆 MILESTONE REACHED: $' + number(reached));
}

// ======================================================
// UPDATE UI
// ======================================================

function updateUI() {
  const stock = inventory();

  $('money').textContent = '$' + number(money);
  $('cashRate').textContent = '+$' + number(rates.cash) + ' / min';

  $('ore').textContent = number(stock.ore);
  $('metal').textContent = number(stock.metal);
  $('gears').textContent = number(stock.gear);

  $('oreRate').textContent = rates.ore + ' / min';
  $('metalRate').textContent = rates.metal + ' / min';
  $('gearRate').textContent = rates.gear + ' / min';
  $('incomeRate').textContent = '$' + number(rates.cash) + ' / min';

  const percent = clamp(money / goal * 100, 0, 100);

  $('goalProgress').style.width = percent + '%';
  $('goalPercent').textContent = Math.floor(percent) + '%';
  $('goalText').textContent = '$' + number(goal) + ' cash';

  const total = machines.reduce(
    (sum, m) => sum + (m.type === 'seller' ? m.sold : 0),
    0
  );

  $('soldCount').textContent = number(total);
  $('clockLabel').textContent = formatClock(playTime);

  updateInspector();
  updateDestination();
  updateRouteGuide();
}

function formatClock(seconds) {
  const t = Math.floor(seconds);

  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor(t / 60) % 60).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');

  return `${h}:${m}:${s}`;
}

// ======================================================
// MACHINE INSPECTOR
// ======================================================

function updateInspector() {
  const machine = selectedMachine();

  const info = $('machineInfo');
  const actions = $('machineActions');

  if (!machine) {
    info.className = 'machine-inspector';

    info.innerHTML = `
      <div class="empty-icon">＋</div>
      <h3>Nothing selected</h3>
      <p>Click a machine on the factory floor.</p>
    `;

    actions.innerHTML = '';
    return;
  }

  const data = MACHINES[machine.type];

  let speed = 'Instant processing';
  let input = 'None';
  let output = machine.output;

  if (machine.type === 'miner') {
    speed = `${(1 / (data.time / machine.level)).toFixed(2)} / sec`;
  }

  if (machine.type === 'smelter') {
    input = '1 ORE';
    output = `${SMELT_YIELD + (machine.level - 1) * 2} METAL`;
  }

  if (machine.type === 'assembler') {
    input = '1 METAL';
    output = `${ASSEMBLE_YIELD + (machine.level - 1) * 3} GEARS`;
  }

  if (machine.type === 'seller') {
    input = 'ORE / METAL / GEARS';
    output = '$' + number(machine.revenue);
  }

  if (machine.type === 'belt') {
    input = DIRS[machine.dir].name;
    output = machine.item
      ? machine.item.type.toUpperCase()
      : 'EMPTY';
  }

  info.className = 'machine-inspector filled';

  info.innerHTML = `
    <div class="machine-hero">
      <div class="machine-hero-icon">${data.icon}</div>
      <div>
        <h3>${data.name}</h3>
        <small>LEVEL ${machine.level} · ${machine.type.toUpperCase()}</small>
      </div>
    </div>

    <p class="machine-description">${data.description}</p>

    <div class="machine-metrics">
      <div class="machine-metric">
        <small>PROCESSING</small>
        <b>${speed}</b>
      </div>
      <div class="machine-metric">
        <small>INPUT</small>
        <b>${input}</b>
      </div>
      <div class="machine-metric">
        <small>OUTPUT</small>
        <b>${output}</b>
      </div>
      <div class="machine-metric">
        <small>TOTAL MADE / SOLD</small>
        <b>${machine.produced + machine.sold}</b>
      </div>
    </div>
  `;

  if (machine.type === 'belt') {
    actions.innerHTML = `
      <button class="action-button" id="rotateMachine">↻ ROTATE BELT</button>
      <button class="action-button danger" id="removeMachine">REMOVE</button>
    `;

    $('rotateMachine').addEventListener('click', () => {
      machine.dir = (machine.dir + 1) % 4;

      updateInspector();
      draw();

      showToast('Belt rotated!');
    });

  } else {
    const price = Math.round(
      data.price * machine.level * .72
    );

    actions.innerHTML = `
      <button class="action-button" id="upgradeMachine">⬆ UPGRADE $${number(price)}</button>
      <button class="action-button danger" id="removeMachine">REMOVE</button>
    `;

    $('upgradeMachine').addEventListener(
      'click',
      upgradeMachine
    );
  }

  $('removeMachine').addEventListener(
    'click',
    removeMachine
  );
}

// ======================================================
// UPGRADING AND REMOVING
// ======================================================

function upgradeMachine() {
  const machine = selectedMachine();
  if (!machine || machine.type === 'belt') return;

  const price = Math.round(
    MACHINES[machine.type].price * machine.level * .72
  );

  if (money < price) {
    showToast('Not enough cash!');
    return;
  }

  money -= price;
  machine.level++;

  updateUI();

  showToast(
    `${MACHINES[machine.type].name} upgraded to level ${machine.level}!`
  );

  saveGame(false);
}

function removeMachine() {
  const machine = selectedMachine();
  if (!machine) return;

  const refund = Math.floor(
    MACHINES[machine.type].price * .45
  );

  machines = machines.filter(m => m.id !== machine.id);
  money += refund;
  selectedId = null;

  updateUI();
  showToast('Building removed. $' + refund + ' refunded.');

  saveGame(false);
}

// ======================================================
// VISUAL EFFECTS
// ======================================================

function createEffect(x, y, color, text) {
  particles.push({
    x: offsetX + (x + .5) * cellSize,
    y: offsetY + (y + .5) * cellSize,
    color,
    text,
    life: .8
  });

  if (particles.length > 50) particles.shift();
}

function updateEffects(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.y -= dt * 18;
  }

  particles = particles.filter(p => p.life > 0);
}

function drawEffects() {
  for (const p of particles) {
    ctx.save();

    ctx.globalAlpha = clamp(p.life / .8, 0, 1);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

// ======================================================
// CANVAS DRAWING HELPERS
// ======================================================

function roundedRect(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ======================================================
// DRAW FLOOR
// ======================================================

function drawFloor() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#192b39');
  gradient.addColorStop(1, '#111d28');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = offsetX + x * cellSize;
      const py = offsetY + y * cellSize;

      ctx.fillStyle =
        (x + y) % 2 === 0
          ? 'rgba(69,94,111,.25)'
          : 'rgba(36,59,76,.27)';

      ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

      ctx.strokeStyle = 'rgba(176,201,218,.13)';
      ctx.lineWidth = 1;

      ctx.strokeRect(px + .5, py + .5, cellSize, cellSize);
    }
  }
}

// ======================================================
// DRAW PRODUCTS
// ======================================================

function drawProduct(belt) {
  if (!belt.item) return;

  const d = direction(belt);
  const t = clamp(belt.item.progress, 0, 1);

  const cx = offsetX + (belt.x + .5) * cellSize;
  const cy = offsetY + (belt.y + .5) * cellSize;

  const distance = cellSize * .36;

  const x = cx + d.x * (t * 2 - 1) * distance;
  const y = cy + d.y * (t * 2 - 1) * distance;

  const color = {
    ore: '#dc9a53',
    metal: '#c8d8e3',
    gear: '#ffbd54'
  }[belt.item.type];

  const size = Math.max(8, cellSize * .23);

  ctx.save();

  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  roundedRect(
    x - size / 2,
    y - size / 2,
    size,
    size,
    3
  );

  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.8)';

  ctx.fillRect(
    x - size * .23,
    y - size * .23,
    size * .23,
    size * .2
  );

  ctx.fillStyle = '#263440';
  ctx.font = `bold ${Math.max(6, size * .4)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(
    belt.item.type === 'ore'
      ? 'O'
      : belt.item.type === 'metal'
        ? 'M'
        : 'G',
    x,
    y
  );

  // Red warning ring means a product is blocked.
  if (belt.item.blocked) {
    ctx.strokeStyle = '#ff7777';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size * .75, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ======================================================
// DRAW CONVEYOR BELTS
// ======================================================

function drawBelt(machine) {
  const px = offsetX + machine.x * cellSize;
  const py = offsetY + machine.y * cellSize;
  const s = cellSize;

  const horizontal = machine.dir === 0 || machine.dir === 2;

  ctx.save();

  roundedRect(px + 3, py + 3, s - 6, s - 6, 6);
  ctx.fillStyle = '#435967';
  ctx.fill();

  if (horizontal) {
    ctx.fillStyle = '#172936';
    ctx.fillRect(px + 4, py + s * .3, s - 8, s * .4);
  } else {
    ctx.fillStyle = '#172936';
    ctx.fillRect(px + s * .3, py + 4, s * .4, s - 8);
  }

  // Rails.
  ctx.strokeStyle = '#a6b8c4';
  ctx.lineWidth = 2;

  if (horizontal) {
    ctx.beginPath();
    ctx.moveTo(px + 4, py + s * .22);
    ctx.lineTo(px + s - 4, py + s * .22);
    ctx.moveTo(px + 4, py + s * .78);
    ctx.lineTo(px + s - 4, py + s * .78);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(px + s * .22, py + 4);
    ctx.lineTo(px + s * .22, py + s - 4);
    ctx.moveTo(px + s * .78, py + 4);
    ctx.lineTo(px + s * .78, py + s - 4);
    ctx.stroke();
  }

  // Direction arrow.
  ctx.save();

  ctx.translate(px + s / 2, py + s / 2);
  ctx.rotate(machine.dir * Math.PI / 2);

  ctx.fillStyle = '#ffd17d';
  ctx.font = `bold ${Math.max(13, s * .38)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText('→', 0, 0);

  ctx.restore();
  ctx.restore();

  // Draw product over the belt.
  drawProduct(machine);
}

// ======================================================
// DRAW MACHINES
// ======================================================

function drawMachine(machine) {
  if (machine.type === 'belt') {
    drawBelt(machine);
    return;
  }

  const px = offsetX + machine.x * cellSize;
  const py = offsetY + machine.y * cellSize;
  const s = cellSize;

  const data = MACHINES[machine.type];

  ctx.save();

  ctx.shadowColor = '#0009';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  roundedRect(px + 3, py + 3, s - 6, s - 6, 6);

  const gradient = ctx.createLinearGradient(px, py, px + s, py + s);
  gradient.addColorStop(0, data.color);
  gradient.addColorStop(1, darken(data.color, -45));

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Roof.
  ctx.fillStyle = '#ffffff25';

  roundedRect(
    px + 7,
    py + 6,
    s - 14,
    s * .17,
    3
  );

  ctx.fill();

  // Status lights.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? '#77dfab' : '#dbe5ea66';

    ctx.beginPath();

    ctx.arc(
      px + s * (.32 + i * .17),
      py + s * .25,
      Math.max(1.3, s * .035),
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // Main icon.
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(16, s * .42)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(
    data.icon,
    px + s / 2,
    py + s * .57
  );

  // Buffer bar.
  let amount = machine.output / MAX_BUFFER;

  if (machine.type === 'seller') {
    amount = Math.min(1, machine.sold / 30);
  }

  ctx.fillStyle = '#101e2a';
  ctx.fillRect(px + 7, py + s * .83, s - 14, 3);

  ctx.fillStyle = '#ffd17d';
  ctx.fillRect(px + 7, py + s * .83, (s - 14) * amount, 3);

  // Sell station border.
  if (machine.type === 'seller') {
    ctx.strokeStyle = '#a5f4be';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 4, py + 4, s - 8, s - 8);
  }

  // Upgrade level.
  if (machine.level > 1) {
    ctx.fillStyle = '#ffd17e';

    ctx.beginPath();
    ctx.arc(px + s - 9, py + 9, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#342719';
    ctx.font = 'bold 9px sans-serif';

    ctx.fillText(
      machine.level,
      px + s - 9,
      py + 9
    );
  }

  ctx.restore();
}

function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);

  const r = clamp((n >> 16) + amount, 0, 255);
  const g = clamp(((n >> 8) & 255) + amount, 0, 255);
  const b = clamp((n & 255) + amount, 0, 255);

  return `rgb(${r},${g},${b})`;
}

// ======================================================
// DRAW SELECTION AND PREVIEW
// ======================================================

function drawSelection() {
  const machine = selectedMachine();
  if (!machine) return;

  const x = offsetX + machine.x * cellSize;
  const y = offsetY + machine.y * cellSize;

  ctx.save();

  ctx.strokeStyle = '#ffcf79';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#ffcf79';
  ctx.shadowBlur = 10;

  roundedRect(
    x + 2,
    y + 2,
    cellSize - 4,
    cellSize - 4,
    7
  );

  ctx.stroke();
  ctx.restore();
}

function drawPlacementPreview() {
  if (
    !pointerCell ||
    selectedTool === 'select' ||
    machineAt(pointerCell.x, pointerCell.y)
  ) return;

  const x = offsetX + pointerCell.x * cellSize;
  const y = offsetY + pointerCell.y * cellSize;

  ctx.save();

  ctx.strokeStyle =
    money >= MACHINES[selectedTool].price
      ? '#ffcf79'
      : '#ee7777';

  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);

  ctx.strokeRect(
    x + 3,
    y + 3,
    cellSize - 6,
    cellSize - 6
  );

  if (selectedTool === 'belt') {
    ctx.translate(
      x + cellSize / 2,
      y + cellSize / 2
    );

    ctx.rotate(beltDirection * Math.PI / 2);

    ctx.fillStyle = '#ffcf79';
    ctx.font = `${cellSize * .4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('→', 0, 0);
  }

  ctx.restore();
}

// ======================================================
// DRAW ALL
// ======================================================

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!w || !h) return;

  ctx.clearRect(0, 0, w, h);

  drawFloor();

  // Belts below the machines.
  for (const machine of machines) {
    if (machine.type === 'belt') {
      drawMachine(machine);
    }
  }

  // Machines on top.
  for (const machine of machines) {
    if (machine.type !== 'belt') {
      drawMachine(machine);
    }
  }

  drawPlacementPreview();
  drawSelection();
  drawEffects();
}

// ======================================================
// CANVAS RESIZE
// ======================================================

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    2
  );

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cellSize = Math.min(
    rect.width / COLS,
    rect.height / ROWS
  );

  offsetX = (rect.width - COLS * cellSize) / 2;
  offsetY = (rect.height - ROWS * cellSize) / 2;

  draw();
}

if ('ResizeObserver' in window) {
  new ResizeObserver(resizeCanvas).observe(
    canvas.parentElement
  );
} else {
  window.addEventListener('resize', resizeCanvas);
}

// ======================================================
// SAVE
// ======================================================

function saveGame(showMessage = true) {
  const data = {
    version: 2,
    money,
    goal,
    playTime,
    beltDirection,

    machines: machines.map(m => ({
      id: m.id,
      type: m.type,
      x: m.x,
      y: m.y,
      dir: m.dir,
      level: m.level,
      timer: m.timer,
      output: m.output,
      produced: m.produced,
      received: m.received,
      sold: m.sold,
      revenue: m.revenue,
      item: m.item ? { ...m.item } : null
    }))
  };

  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(data)
    );

    $('saveStatus').textContent = '● Saved';

    if (showMessage) {
      showToast('Factory saved!');
    }

    return true;

  } catch (error) {
    $('saveStatus').textContent = '● Save failed';

    if (showMessage) {
      showToast('Could not save your factory!');
    }

    return false;
  }
}

// ======================================================
// LOAD
// ======================================================

function loadGame() {
  let raw;

  try {
    raw =
      localStorage.getItem(SAVE_KEY) ||
      localStorage.getItem(OLD_SAVE_KEY);
  } catch (error) {
    return false;
  }

  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    if (
      !Array.isArray(data.machines) ||
      !Number.isFinite(data.money)
    ) {
      throw new Error('Invalid save');
    }

    machines = [];

    const occupied = new Set();

    for (const saved of data.machines) {
      if (
        !MACHINES[saved.type] ||
        !Number.isInteger(saved.x) ||
        !Number.isInteger(saved.y) ||
        saved.x < 0 ||
        saved.x >= COLS ||
        saved.y < 0 ||
        saved.y >= ROWS
      ) continue;

      const pos = `${saved.x},${saved.y}`;

      if (occupied.has(pos)) continue;
      occupied.add(pos);

      const m = createMachine(
        saved.type,
        saved.x,
        saved.y,
        clamp(Math.floor(Number(saved.dir) || 0), 0, 3)
      );

      m.id = typeof saved.id === 'string' ? saved.id : m.id;
      m.level = clamp(Math.floor(Number(saved.level) || 1), 1, 99);
      m.timer = clamp(Number(saved.timer) || 0, 0, 20);

      m.output = clamp(
        Math.floor(Number(saved.output) || 0),
        0,
        MAX_BUFFER
      );

      m.produced = Math.max(0, Math.floor(Number(saved.produced) || 0));
      m.received = Math.max(0, Math.floor(Number(saved.received) || 0));
      m.sold = Math.max(0, Math.floor(Number(saved.sold) || 0));
      m.revenue = Math.max(0, Math.floor(Number(saved.revenue) || 0));

      if (
        m.type === 'belt' &&
        saved.item &&
        ['ore', 'metal', 'gear'].includes(saved.item.type)
      ) {
        m.item = {
          type: saved.item.type,
          progress: clamp(Number(saved.item.progress) || 0, 0, 1),
          blocked: Boolean(saved.item.blocked)
        };
      }

      machines.push(m);
    }

    money = Math.max(0, Math.floor(data.money));
    goal = Math.max(1500, Math.floor(Number(data.goal) || 1500));
    playTime = Math.max(0, Number(data.playTime) || 0);

    beltDirection =
      ((Math.floor(Number(data.beltDirection) || 0) % 4) + 4) % 4;

    $('directionLabel').textContent =
      DIRS[beltDirection].name;

    return true;

  } catch (error) {
    console.warn('Save could not be loaded:', error);
    return false;
  }
}

// ======================================================
// BUTTONS
// ======================================================

$('saveBtn').addEventListener('click', () => {
  saveGame(true);
});

$('resetBtn').addEventListener('click', () => {
  if (!confirm('Start a new factory? Your current save will be replaced.')) {
    return;
  }

  money = 1200;
  goal = 1500;
  machines = [];
  particles = [];
  selectedId = null;
  beltDirection = 0;
  playTime = 0;

  for (const key of Object.keys(production)) {
    production[key] = 0;
    rates[key] = 0;
  }

  $('directionLabel').textContent = DIRS[0].name;

  setTool('select');
  updateUI();
  draw();
  saveGame(false);

  showToast('New factory started!');
});

$('speedBtn').addEventListener('click', () => {
  gameSpeed = gameSpeed === 1
    ? 2
    : gameSpeed === 2
      ? 3
      : 1;

  $('speedBtn').textContent = gameSpeed + '×';

  showToast('Production speed: ' + gameSpeed + '×');
});

$('pauseBtn').addEventListener('click', () => {
  paused = !paused;

  $('pauseBtn').textContent =
    paused ? '▶ RESUME' : 'Ⅱ PAUSE';

  showToast(paused ? 'Factory paused.' : 'Factory running.');
});

// ======================================================
// KEYBOARD
// ======================================================

window.addEventListener('keydown', event => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) return;

  if (event.key.toLowerCase() === 'r') {
    rotateSelectedBelt();
  }

  if (event.key.toLowerCase() === 'v') {
    setTool('select');
  }

  if (event.key === 'Escape') {
    selectedId = null;
    updateInspector();
    draw();
  }
});

// ======================================================
// AUTOSAVE
// ======================================================

window.addEventListener('beforeunload', () => {
  saveGame(false);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveGame(false);
  }
});

// ======================================================
// SIMULATION
// ======================================================

function simulate(dt) {
  // Only the miner waits to produce.
  processMachines(dt);

  // Products are sent from machine storage to belts.
  sendOutputsToBelts();

  // Products travel through the factory.
  moveProducts(dt);

  // Check cash milestones.
  checkGoal();
}

// ======================================================
// MAIN LOOP
// ======================================================

function gameLoop(timestamp) {
  const rawDt = lastTime
    ? Math.min((timestamp - lastTime) / 1000, 0.05)
    : 0;

  lastTime = timestamp;

  const dt = paused ? 0 : rawDt * gameSpeed;

  if (dt > 0) {
    animationTime += dt;
    playTime += dt;

    simulate(dt);
    updateEffects(dt);
    updateRates(dt);

    uiTimer += dt;
    saveTimer += dt;

    if (uiTimer >= 0.2) {
      updateUI();
      uiTimer = 0;
    }

    if (saveTimer >= 15) {
      saveGame(false);
      saveTimer = 0;
    }
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ======================================================
// START GAME
// ======================================================

const loaded = loadGame();

resizeCanvas();
updateUI();

showToast(
  loaded
    ? 'Welcome back! Factory loaded.'
    : 'Welcome! Build a Miner and a Sell Station.'
);

requestAnimationFrame(gameLoop);
