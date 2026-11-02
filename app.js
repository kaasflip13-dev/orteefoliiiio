
'use strict';

// ======================================================
// FACTORY TYCOON
// Real moving products + real sell destination
// ======================================================

const canvas = document.getElementById('factoryCanvas');
const ctx = canvas.getContext('2d');

const COLS = 16;
const ROWS = 10;
const BELT_TIME = 0.8;
const SAVE_KEY = 'factoryTycoon_clear_v1';

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
    time: 2.4,
    output: 'ore',
    description: 'Creates ore automatically. Connect a conveyor to its output.'
  },

  smelter: {
    name: 'Smelter',
    icon: '🔥',
    price: 220,
    color: '#b96143',
    time: 3,
    input: 'ore',
    output: 'metal',
    description: 'Takes ore from a conveyor and melts it into metal.'
  },

  assembler: {
    name: 'Assembler',
    icon: '⚙',
    price: 320,
    color: '#477da4',
    time: 3.4,
    input: 'metal',
    output: 'gear',
    description: 'Uses metal to make gears for your Sell Station.'
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
    description: 'FINAL DESTINATION. Each gear delivered here earns $50.'
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
// CREATE BUILDING
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
    output: 0,

    input: {
      ore: 0,
      metal: 0
    },

    item: null,

    produced: 0,
    received: 0,
    sold: 0
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
// MESSAGE
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
    showToast('New conveyor direction: ' + DIRS[beltDirection].name);
  }
}

$('rotateBtn').addEventListener(
  'click',
  rotateSelectedBelt
);

// ======================================================
// PLACE BUILDING
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
  updateRouteGuide();

  showToast(MACHINES[type].name + ' placed!');

  saveGame(false);
}

// ======================================================
// GRID INPUT
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
// MACHINE OUTPUT -> BELT
// ======================================================

function sendOutputsToBelts() {
  for (const machine of machines) {
    if (
      machine.type === 'belt' ||
      machine.type === 'seller' ||
      machine.output <= 0
    ) {
      continue;
    }

    const belts = getAdjacentBelts(machine);

    for (const belt of belts) {
      if (belt.item) continue;

      const d = direction(belt);

      const nextX = belt.x + d.x;
      const nextY = belt.y + d.y;

      // Do not send a product onto a belt
      // that points straight back into its machine.
      if (
        nextX === machine.x &&
        nextY === machine.y
      ) {
        continue;
      }

      // Put one real product onto the belt.
      belt.item = {
        type: MACHINES[machine.type].output,
        progress: 0
      };

      machine.output--;

      break;
    }
  }
}

// ======================================================
// WHAT EACH MACHINE ACCEPTS
// ======================================================

function acceptProduct(machine, product) {
  if (
    machine.type === 'smelter' &&
    product === 'ore'
  ) {
    // Maximum input buffer: 10 ore.
    if (machine.input.ore >= 10) {
      return false;
    }

    machine.input.ore++;
    machine.received++;

    createEffect(machine.x, machine.y, '#d49a5a', '+ORE');

    return true;
  }

  if (
    machine.type === 'assembler' &&
    product === 'metal'
  ) {
    // Maximum input buffer: 10 metal.
    if (machine.input.metal >= 10) {
      return false;
    }

    machine.input.metal++;
    machine.received++;

    createEffect(machine.x, machine.y, '#b5c9d8', '+METAL');

    return true;
  }

  if (
    machine.type === 'seller' &&
    product === 'gear'
  ) {
    // MONEY IS ONLY AWARDED HERE!
    const earnings = 50 * machine.level;

    money += earnings;
    machine.sold++;
    machine.received++;

    production.cash += earnings;

    createEffect(machine.x, machine.y, '#77dfab', '+$' + earnings);

    showToast('SOLD! +$' + earnings);

    return true;
  }

  // Wrong product or wrong destination.
  // Keep the product on the conveyor.
  return false;
}

// ======================================================
// PRODUCTS MOVING BETWEEN BELTS
// ======================================================

function moveProducts(dt) {
  const belts = machines.filter(
    m => m.type === 'belt'
  );

  const transfers = [];
  const reserved = new Set();

  // First: animate every product on its own belt.
  for (const belt of belts) {
    if (!belt.item) continue;

    belt.item.progress = Math.min(
      1,
      belt.item.progress + dt / BELT_TIME
    );

    if (belt.item.progress < 1) continue;

    // Find the next tile in the arrow direction.
    const d = direction(belt);

    const next = machineAt(
      belt.x + d.x,
      belt.y + d.y
    );

    // No next building: product waits at the end.
    if (!next) continue;

    // Next tile is another conveyor.
    if (next.type === 'belt') {
      if (next.item || reserved.has(next.id)) {
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

    // Next tile is a machine.
    // The machine must accept this exact product.
    if (acceptProduct(next, belt.item.type)) {
      belt.item = null;
    }
  }

  // Second: perform belt-to-belt transfers.
  // This prevents products jumping across several
  // tiles in a single game frame.
  for (const transfer of transfers) {
    if (!transfer.target.item) {
      transfer.target.item = {
        type: transfer.product.type,
        progress: 0
      };

      transfer.source.item = null;
    }
  }
}

// ======================================================
// MACHINE PRODUCTION
// ======================================================

function processMachines(dt) {
  for (const machine of machines) {
    if (
      machine.type === 'belt' ||
      machine.type === 'seller'
    ) {
      continue;
    }

    const data = MACHINES[machine.type];

    // Maximum output buffer: 10 products.
    if (machine.output >= 10) continue;

    const interval = data.time / machine.level;

    // MINER: creates ore without input.
    if (machine.type === 'miner') {
      machine.timer += dt;

      while (
        machine.timer >= interval &&
        machine.output < 10
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

      continue;
    }

    // SMELTER and ASSEMBLER:
    // They can only produce with the right input.
    const required = data.input;

    if (machine.input[required] <= 0) continue;

    machine.timer += dt;

    while (
      machine.timer >= interval &&
      machine.input[required] > 0 &&
      machine.output < 10
    ) {
      machine.timer -= interval;

      machine.input[required]--;
      machine.output++;
      machine.produced++;

      production[data.output]++;

      createEffect(
        machine.x,
        machine.y,
        data.output === 'metal' ? '#b5c9d8' : '#ffbd54',
        '+ ' + data.output.toUpperCase()
      );
    }
  }
}

// ======================================================
// PRODUCTION ROUTE STATUS
// ======================================================

function updateRouteGuide() {
  const count = type =>
    machines.filter(m => m.type === type).length;

  const miner = count('miner') > 0;
  const smelter = count('smelter') > 0;
  const assembler = count('assembler') > 0;
  const seller = count('seller') > 0;

  $('stepMiner').classList.toggle('done', miner);
  $('stepSmelter').classList.toggle('done', smelter);
  $('stepAssembler').classList.toggle('done', assembler);
  $('stepSeller').classList.toggle('done', seller);

  const belts = count('belt');

  let message = 'Place an Ore Miner to get started.';

  if (miner && !smelter) {
    message = 'Good! Now place a Smelter for your ore.';
  } else if (miner && smelter && !assembler) {
    message = 'Great! Place an Assembler to make gears.';
  } else if (miner && smelter && assembler && !seller) {
    message = 'Almost there! Place your Sell Station.';
  } else if (miner && smelter && assembler && seller && belts === 0) {
    message = 'Machines ready! Now connect them with conveyor belts.';
  } else if (miner && smelter && assembler && seller) {
    message = 'Production chain built! Check that every arrow points to the next machine.';
  }

  $('routeMessage').textContent = message;
}

// ======================================================
// DESTINATION STATUS
// ======================================================

function updateDestination() {
  const sellers = machines.filter(
    m => m.type === 'seller'
  );

  const card = $('destinationCard');

  const sold = sellers.reduce(
    (total, m) => total + m.sold,
    0
  );

  if (sellers.length === 0) {
    card.classList.remove('active');

    $('destinationTitle').textContent = 'Not built yet';
    $('destinationDescription').textContent =
      'Place a Sell Station to earn cash.';

  } else {
    card.classList.add('active');

    $('destinationTitle').textContent =
      sellers.length === 1
        ? 'Sell Station active'
        : sellers.length + ' Sell Stations active';

    $('destinationDescription').textContent =
      'Each delivered gear earns $50 per level.';
  }

  $('soldCount').textContent = number(sold);
}

// ======================================================
// CASH MILESTONES
// ======================================================

function checkGoal() {
  if (money < goal) return;

  const completed = goal;

  if (goal < 5000) {
    goal = 5000;
  } else if (goal < 15000) {
    goal = 15000;
  } else if (goal < 50000) {
    goal = 50000;
  } else {
    goal += 50000;
  }

  showToast('MILESTONE REACHED! $' + number(completed));
}

// ======================================================
// PRODUCTION RATE
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
// INSPECTOR
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

  let inputText = 'None';
  let bufferText = machine.output;

  if (machine.type === 'smelter') {
    inputText = machine.input.ore + ' / 10 ore';
  }

  if (machine.type === 'assembler') {
    inputText = machine.input.metal + ' / 10 metal';
  }

  if (machine.type === 'seller') {
    inputText = 'Gears';
    bufferText = machine.sold + ' sold';
  }

  if (machine.type === 'belt') {
    inputText = DIRS[machine.dir].name;
    bufferText = machine.item
      ? machine.item.type.toUpperCase()
      : 'Empty';
  }

  const speed = data.time
    ? (1 / (data.time / machine.level)).toFixed(2) + ' / sec'
    : 'Continuous';

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
        <small>PRODUCTION SPEED</small>
        <b>${speed}</b>
      </div>
      <div class="machine-metric">
        <small>INPUT / DIRECTION</small>
        <b>${inputText}</b>
      </div>
      <div class="machine-metric">
        <small>OUTPUT BUFFER</small>
        <b>${bufferText}</b>
      </div>
      <div class="machine-metric">
        <small>TOTAL PRODUCED</small>
        <b>${machine.produced}</b>
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

    $('upgradeMachine').addEventListener('click', upgradeMachine);
  }

  $('removeMachine').addEventListener('click', removeMachine);
}

function upgradeMachine() {
  const machine = selectedMachine();

  if (!machine || machine.type === 'belt') return;

  const price = Math.round(
    MACHINES[machine.type].price * machine.level * .72
  );

  if (money < price) {
    showToast('Not enough cash for upgrade!');
    return;
  }

  money -= price;
  machine.level++;

  updateUI();
  showToast('Machine upgraded to level ' + machine.level);
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
  updateRouteGuide();

  showToast('Building removed. Refund: $' + refund);
  saveGame(false);
}

// ======================================================
// INVENTORY DISPLAY
// ======================================================

function inventory() {
  const stock = {
    ore: 0,
    metal: 0,
    gear: 0
  };

  for (const m of machines) {
    if (m.type === 'miner') {
      stock.ore += m.output;
    }

    if (m.type === 'smelter') {
      stock.ore += m.input.ore;
      stock.metal += m.output;
    }

    if (m.type === 'assembler') {
      stock.metal += m.input.metal;
      stock.gear += m.output;
    }

    if (m.type === 'belt' && m.item) {
      stock[m.item.type]++;
    }
  }

  return stock;
}

// ======================================================
// VISUAL PARTICLES
// ======================================================

function createEffect(x, y, color, text) {
  particles.push({
    x: offsetX + (x + .5) * cellSize,
    y: offsetY + (y + .5) * cellSize,
    color,
    text,
    life: .8
  });

  if (particles.length > 45) {
    particles.shift();
  }
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
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fillText(p.text, p.x, p.y);

    ctx.restore();
  }
}

// ======================================================
// DRAWING HELPERS
// ======================================================

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);

  const r = clamp((n >> 16) + amount, 0, 255);
  const g = clamp(((n >> 8) & 255) + amount, 0, 255);
  const b = clamp((n & 255) + amount, 0, 255);

  return `rgb(${r},${g},${b})`;
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

  ctx.setLineDash([6, 7]);
  ctx.strokeStyle = 'rgba(255,184,77,.15)';
  ctx.lineWidth = 2;

  ctx.strokeRect(
    offsetX + 3,
    offsetY + 3,
    COLS * cellSize - 6,
    ROWS * cellSize - 6
  );

  ctx.setLineDash([]);
}

// ======================================================
// DRAW MOVING PRODUCT
// ======================================================

function drawProduct(belt) {
  if (!belt.item) return;

  const d = direction(belt);
  const t = clamp(belt.item.progress, 0, 1);

  const centerX = offsetX + (belt.x + .5) * cellSize;
  const centerY = offsetY + (belt.y + .5) * cellSize;

  // The object visibly travels from the entrance
  // to the exit of each single conveyor tile.
  const distance = cellSize * .36;

  const x = centerX + d.x * (t * 2 - 1) * distance;
  const y = centerY + d.y * (t * 2 - 1) * distance;

  const colors = {
    ore: '#dc9a53',
    metal: '#c8d8e3',
    gear: '#ffbd54'
  };

  const color = colors[belt.item.type];
  const size = Math.max(8, cellSize * .23);

  ctx.save();

  ctx.shadowColor = color;
  ctx.shadowBlur = 13;

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
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillRect(
    x - size * .25,
    y - size * .25,
    size * .25,
    size * .2
  );

  ctx.fillStyle = '#273440';
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
    y + size * .1
  );

  ctx.restore();
}

// ======================================================
// DRAW BELT
// ======================================================

function drawBelt(machine) {
  const px = offsetX + machine.x * cellSize;
  const py = offsetY + machine.y * cellSize;
  const s = cellSize;

  const horizontal = machine.dir === 0 || machine.dir === 2;

  ctx.save();

  // Belt foundation.
  roundedRect(px + 3, py + 3, s - 6, s - 6, 6);
  ctx.fillStyle = '#465d6d';
  ctx.fill();

  ctx.strokeStyle = '#263b4b';
  ctx.lineWidth = 2;

  if (horizontal) {
    ctx.fillStyle = '#172936';
    ctx.fillRect(px + 4, py + s * .3, s - 8, s * .4);

    ctx.beginPath();
    ctx.moveTo(px + 4, py + s * .22);
    ctx.lineTo(px + s - 4, py + s * .22);
    ctx.moveTo(px + 4, py + s * .78);
    ctx.lineTo(px + s - 4, py + s * .78);
    ctx.stroke();

  } else {
    ctx.fillStyle = '#172936';
    ctx.fillRect(px + s * .3, py + 4, s * .4, s - 8);

    ctx.beginPath();
    ctx.moveTo(px + s * .22, py + 4);
    ctx.lineTo(px + s * .22, py + s - 4);
    ctx.moveTo(px + s * .78, py + 4);
    ctx.lineTo(px + s * .78, py + s - 4);
    ctx.stroke();
  }

  // Arrow indicates exact direction.
  ctx.save();
  ctx.translate(px + s / 2, py + s / 2);
  ctx.rotate(machine.dir * Math.PI / 2);

  ctx.fillStyle = '#ffcf7b';
  ctx.font = `bold ${Math.max(13, s * .38)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('→', 0, 0);

  ctx.restore();
  ctx.restore();

  // The actual moving object is drawn on top.
  drawProduct(machine);
}

// ======================================================
// DRAW MACHINE
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

  // Top plate.
  ctx.fillStyle = '#ffffff25';
  roundedRect(px + 7, py + 6, s - 14, s * .17, 3);
  ctx.fill();

  // Small status lamps.
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

  // Main building symbol.
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(16, s * .42)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.icon, px + s / 2, py + s * .57);

  // Buffer meter.
  let amount = 0;

  if (machine.type === 'miner') {
    amount = machine.output / 10;
  } else if (machine.type === 'smelter') {
    amount = machine.input.ore / 10;
  } else if (machine.type === 'assembler') {
    amount = machine.input.metal / 10;
  } else if (machine.type === 'seller') {
    amount = Math.min(1, machine.sold / 20);
  }

  ctx.fillStyle = '#111e2a';
  ctx.fillRect(px + 7, py + s * .83, s - 14, 3);

  ctx.fillStyle = '#ffce77';
  ctx.fillRect(
    px + 7,
    py + s * .83,
    (s - 14) * amount,
    3
  );

  // Sell Station has an extra green outline.
  if (machine.type === 'seller') {
    ctx.strokeStyle = '#a5f4be';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 4, py + 4, s - 8, s - 8);
  }

  // Upgrade badge.
  if (machine.level > 1) {
    ctx.fillStyle = '#ffd17e';
    ctx.beginPath();
    ctx.arc(px + s - 9, py + 9, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#342719';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(machine.level, px + s - 9, py + 9);
  }

  ctx.restore();
}

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
    selectedTool === 'select'
  ) return;

  if (machineAt(pointerCell.x, pointerCell.y)) return;

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
// DRAW EVERYTHING
// ======================================================

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (!w || !h) return;

  ctx.clearRect(0, 0, w, h);

  drawFloor();

  // First draw conveyor foundations.
  for (const machine of machines) {
    if (machine.type === 'belt') {
      drawMachine(machine);
    }
  }

  // Then draw production buildings.
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
// MILESTONES
// ======================================================

function checkGoal() {
  if (money < goal) return;

  const completed = goal;

  goal = goal < 5000
    ? 5000
    : goal < 15000
      ? 15000
      : goal < 50000
        ? 50000
        : goal + 50000;

  showToast('MILESTONE! $' + number(completed) + ' reached!');
}

// ======================================================
// FULL INTERFACE UPDATE
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

  $('clockLabel').textContent = formatClock(playTime);

  updateInspector();
  updateDestination();
  updateRouteGuide();
}

function formatClock(seconds) {
  const t = Math.floor(seconds);

  const hours = String(Math.floor(t / 3600)).padStart(2, '0');
  const minutes = String(Math.floor(t / 60) % 60).padStart(2, '0');
  const secs = String(t % 60).padStart(2, '0');

  return `${hours}:${minutes}:${secs}`;
}

// ======================================================
// SAVE GAME
// ======================================================

function saveGame(showMessage = true) {
  const data = {
    version: 1,
    money,
    goal,
    playTime,
    beltDirection,

    machines: machines.map(m => ({
      ...m,
      input: { ...m.input },
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
      showToast('Could not save your factory.');
    }

    return false;
  }
}

// ======================================================
// LOAD GAME
// ======================================================

function loadGame() {
  let raw;

  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (error) {
    return false;
  }

  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    if (
      data.version !== 1 ||
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

      const position = `${saved.x},${saved.y}`;

      if (occupied.has(position)) continue;
      occupied.add(position);

      const m = createMachine(
        saved.type,
        saved.x,
        saved.y,
        clamp(Math.floor(Number(saved.dir) || 0), 0, 3)
      );

      m.id = typeof saved.id === 'string' ? saved.id : m.id;
      m.level = clamp(Math.floor(Number(saved.level) || 1), 1, 99);
      m.timer = clamp(Number(saved.timer) || 0, 0, 20);
      m.output = clamp(Math.floor(Number(saved.output) || 0), 0, 10);

      m.input.ore = clamp(Math.floor(Number(saved.input?.ore) || 0), 0, 10);
      m.input.metal = clamp(Math.floor(Number(saved.input?.metal) || 0), 0, 10);

      m.produced = Math.max(0, Math.floor(Number(saved.produced) || 0));
      m.received = Math.max(0, Math.floor(Number(saved.received) || 0));
      m.sold = Math.max(0, Math.floor(Number(saved.sold) || 0));

      if (
        m.type === 'belt' &&
        saved.item &&
        ['ore', 'metal', 'gear'].includes(saved.item.type)
      ) {
        m.item = {
          type: saved.item.type,
          progress: clamp(Number(saved.item.progress) || 0, 0, 1)
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
    console.warn('Save load failed:', error);
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
  if (!confirm('Start a completely new factory? Your current factory save will be replaced.')) {
    return;
  }

  money = 1200;
  goal = 1500;
  machines = [];
  particles = [];
  selectedId = null;
  beltDirection = 0;
  playTime = 0;

  production.ore = 0;
  production.metal = 0;
  production.gear = 0;
  production.cash = 0;

  rates.ore = 0;
  rates.metal = 0;
  rates.gear = 0;
  rates.cash = 0;

  $('directionLabel').textContent = DIRS[0].name;

  setTool('select');
  updateUI();
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
  // 1. Machines make products.
  processMachines(dt);

  // 2. Products leave machines and enter the first belt.
  sendOutputsToBelts();

  // 3. Products move from belt to belt.
  moveProducts(dt);

  // 4. Check money milestones.
  checkGoal();
}

// ======================================================
// MAIN GAME LOOP
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
// START
// ======================================================

const loaded = loadGame();

resizeCanvas();
updateUI();

showToast(
  loaded
    ? 'Welcome back! Your factory is loaded.'
    : 'Welcome! Build your first production line.'
);

requestAnimationFrame(gameLoop);
