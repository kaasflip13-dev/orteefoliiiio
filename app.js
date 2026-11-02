
'use strict';

// ============================================================
// FACTORY TYCOON — complete factory simulation
// Machines create / process goods. Belts carry real items.
// Press R or use ROTATE to change the direction of new belts.
// ============================================================

const canvas = document.getElementById('factoryCanvas');
const ctx = canvas.getContext('2d');

const COLS = 16;
const ROWS = 10;
const SAVE_KEY = 'factoryTycoon_v2_save';
const BELT_STEP = 0.58;

const DIRS = [
  { x: 1, y: 0, arrow: '→', name: 'Naar rechts →' },
  { x: 0, y: 1, arrow: '↓', name: 'Naar beneden ↓' },
  { x: -1, y: 0, arrow: '←', name: 'Naar links ←' },
  { x: 0, y: -1, arrow: '↑', name: 'Naar boven ↑' }
];

const DEFINITIONS = {
  miner: {
    name: 'Mijnmachine',
    icon: '⛏',
    cost: 100,
    color: '#9a7047',
    description: 'Wint erts uit de grond en stuurt het over een transportband.',
    makes: 'ORE',
    interval: 2.4,
    input: null,
    output: 'ore'
  },
  smelter: {
    name: 'Smelterij',
    icon: '♨',
    cost: 220,
    color: '#b65e42',
    description: 'Smelt aangevoerd erts om tot stevig metaal.',
    makes: 'METAL',
    interval: 3.0,
    input: 'ore',
    output: 'metal'
  },
  assembler: {
    name: 'Assembler',
    icon: '⚙',
    cost: 320,
    color: '#467ca5',
    description: 'Bouwt tandwielen van aangevoerd metaal.',
    makes: 'GEARS',
    interval: 3.4,
    input: 'metal',
    output: 'gear'
  },
  seller: {
    name: 'Verzendstation',
    icon: '▣',
    cost: 180,
    color: '#43866a',
    description: 'Verpakt en verkoopt tandwielen zodra ze binnenkomen.',
    makes: 'CASH',
    interval: 0,
    input: 'gear',
    output: null
  },
  belt: {
    name: 'Transportband',
    icon: '➜',
    cost: 20,
    color: '#697b89',
    description: 'Verplaatst één product per keer in de ingestelde richting.',
    makes: 'TRANSPORT',
    interval: 0,
    input: null,
    output: null
  }
};

let money = 1200;
let machines = [];
let selectedTool = 'select';
let selectedMachineId = null;
let beltDirection = 0;
let gameSpeed = 1;
let paused = false;
let animationTime = 0;
let totalPlayTime = 0;
let lastFrame = 0;
let uiTimer = 0;
let rateTimer = 0;

let productionCounts = {
  ore: 0,
  metal: 0,
  gear: 0,
  income: 0
};

let rates = {
  ore: 0,
  metal: 0,
  gear: 0,
  income: 0
};

let goal = 1500;
let pointerCell = null;
let cellSize = 40;
let offsetX = 0;
let offsetY = 0;
let toastTimeout = null;
let lastSaveLabel = 'Automatisch';
let particles = [];
let autosaveElapsed = 0;

const moneyEl = document.getElementById('money');
const oreEl = document.getElementById('ore');
const metalEl = document.getElementById('metal');
const gearsEl = document.getElementById('gears');
const toolButtons = [...document.querySelectorAll('.tool-button')];

// ============================================================
// MACHINE DATA
// ============================================================

function makeMachine(type, x, y, dir = 0) {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type,
    x,
    y,
    dir,
    level: 1,
    timer: 0,
    output: 0,
    input: {
      ore: 0,
      metal: 0,
      gear: 0
    },
    produced: 0,
    received: 0,
    sold: 0
  };
}

function getMachineAt(x, y) {
  return machines.find(m => m.x === x && m.y === y) || null;
}

function getSelectedMachine() {
  return machines.find(m => m.id === selectedMachineId) || null;
}

function formatNumber(value) {
  return Math.floor(value).toLocaleString('nl-NL');
}

// ============================================================
// NOTIFICATIONS
// ============================================================

function showToast(message) {
  const toast = document.getElementById('toast');

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2100);
}

// ============================================================
// BUILD MENU
// ============================================================

function setTool(type) {
  if (!DEFINITIONS[type] && type !== 'select') return;

  selectedTool = type;
  selectedMachineId = null;

  toolButtons.forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.type === type
    );
  });

  document.getElementById('selectedInfo').textContent =
    type === 'select'
      ? 'Selecteren — klik op een machine om details te bekijken'
      : `${DEFINITIONS[type].name} geselecteerd — klik op een leeg vakje`;

  canvas.style.cursor =
    type === 'select' ? 'default' : 'crosshair';

  updateInspector();
  draw();
}

toolButtons.forEach(button => {
  button.addEventListener('click', () => {
    setTool(button.dataset.type);
  });
});

// ============================================================
// BELT DIRECTION
// ============================================================

function rotateBelt() {
  beltDirection = (beltDirection + 1) % 4;

  document.getElementById('directionLabel').textContent =
    DIRS[beltDirection].name;

  showToast(
    `Transportband draait ${DIRS[beltDirection].name.toLowerCase()}`
  );

  draw();
}

document.getElementById('rotateBtn').addEventListener(
  'click',
  rotateBelt
);

// ============================================================
// PLACE MACHINES
// ============================================================

function place(type, x, y) {
  if (getMachineAt(x, y)) {
    showToast('Dit vakje is al bezet.');
    return;
  }

  const cost = DEFINITIONS[type].cost;

  if (money < cost) {
    showToast(`Niet genoeg geld. Je hebt $${cost} nodig.`);
    return;
  }

  money -= cost;

  const machine = makeMachine(
    type,
    x,
    y,
    beltDirection
  );

  machines.push(machine);
  selectedMachineId = machine.id;

  updateAllUI();
  updateInspector();

  showToast(`${DEFINITIONS[type].name} geplaatst!`);

  saveGame(false);
}

// ============================================================
// CANVAS INPUT
// ============================================================

function canvasToCell(event) {
  const rect = canvas.getBoundingClientRect();

  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;

  const x = Math.floor((px - offsetX) / cellSize);
  const y = Math.floor((py - offsetY) / cellSize);

  if (
    x < 0 ||
    y < 0 ||
    x >= COLS ||
    y >= ROWS
  ) {
    return null;
  }

  return { x, y };
}

canvas.addEventListener('pointermove', event => {
  pointerCell = canvasToCell(event);

  if (pointerCell) {
    document.getElementById('coordsInfo').textContent =
      `X: ${String(pointerCell.x + 1).padStart(2, '0')}   Y: ${String(pointerCell.y + 1).padStart(2, '0')}`;
  } else {
    document.getElementById('coordsInfo').textContent =
      'X: --   Y: --';
  }
});

canvas.addEventListener('pointerleave', () => {
  pointerCell = null;

  document.getElementById('coordsInfo').textContent =
    'X: --   Y: --';
});

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;

  const cell = canvasToCell(event);
  if (!cell) return;

  const existing = getMachineAt(cell.x, cell.y);

  if (selectedTool === 'select') {
    selectedMachineId = existing ? existing.id : null;

    updateInspector();

    document.getElementById('selectedInfo').textContent =
      existing
        ? `${DEFINITIONS[existing.type].name} geselecteerd op X ${existing.x + 1}, Y ${existing.y + 1}`
        : 'Geen machine op dit vakje';

    draw();
    return;
  }

  if (existing) {
    selectedMachineId = existing.id;

    updateInspector();

    showToast('Vakje bezet — machine geselecteerd.');

    draw();
    return;
  }

  place(selectedTool, cell.x, cell.y);
});

// ============================================================
// SELECTED MACHINE ACTIONS
// ============================================================

function rotateSelectedBelt() {
  const selected = getSelectedMachine();

  if (selected && selected.type === 'belt') {
    selected.dir = (selected.dir + 1) % 4;

    updateInspector();
    draw();

    showToast('Deze transportband is gedraaid.');
  } else {
    rotateBelt();
  }
}

function upgradeSelected() {
  const machine = getSelectedMachine();

  if (!machine || machine.type === 'belt') return;

  const cost = Math.round(
    DEFINITIONS[machine.type].cost *
    machine.level *
    0.72
  );

  if (money < cost) {
    showToast(
      `Upgrade kost $${cost}. Je hebt niet genoeg geld.`
    );
    return;
  }

  money -= cost;
  machine.level += 1;

  updateAllUI();
  updateInspector();

  showToast(
    `${DEFINITIONS[machine.type].name} is nu level ${machine.level}!`
  );

  saveGame(false);
}

function removeSelected() {
  const machine = getSelectedMachine();

  if (!machine) return;

  const refund = Math.floor(
    DEFINITIONS[machine.type].cost * 0.45
  );

  machines = machines.filter(
    item => item.id !== machine.id
  );

  money += refund;
  selectedMachineId = null;

  updateAllUI();
  updateInspector();

  showToast(
    `Gebouw verwijderd. $${refund} teruggekregen.`
  );

  saveGame(false);
}

// ============================================================
// MACHINE INSPECTOR
// ============================================================

function updateInspector() {
  const info = document.getElementById('machineInfo');
  const actions = document.getElementById('machineActions');
  const machine = getSelectedMachine();

  if (!machine) {
    info.className = 'machine-inspector empty-inspector';

    info.innerHTML = `
      <div class="empty-machine-icon"><span>＋</span></div>
      <h3>Niets geselecteerd</h3>
      <p>Klik op een machine op de productievloer om de instellingen en productie te bekijken.</p>
    `;

    actions.innerHTML = '';
    return;
  }

  const def = DEFINITIONS[machine.type];

  const speed = machine.type === 'belt'
    ? 'Doorvoerband'
    : `${(1 / (def.interval / machine.level)).toFixed(2)} / sec`;

  let stockLabel = 'BUFFER';

  let stockValue =
    machine.type === 'seller'
      ? machine.sold
      : machine.type === 'belt'
        ? (machine.item ? 1 : 0)
        : machine.output;

  let inputLabel = 'INPUT';

  let inputValue =
    machine.type === 'smelter'
      ? machine.input.ore
      : machine.type === 'assembler'
        ? machine.input.metal
        : machine.type === 'seller'
          ? 'Direct'
          : machine.type === 'miner'
            ? 'Geen'
            : DIRS[machine.dir].arrow;

  info.className = 'machine-inspector filled';

  info.innerHTML = `
    <div class="machine-hero">
      <div class="machine-hero-icon" style="color:${def.color}">${def.icon}</div>
      <div class="machine-hero-copy">
        <h3>${def.name}</h3>
        <small>${machine.type.toUpperCase()} · LVL ${machine.level}</small>
      </div>
    </div>
    <p class="machine-description">${def.description}</p>
    <div class="machine-metrics">
      <div class="machine-metric">
        <small>PRODUCTIE</small>
        <b>${speed}</b>
      </div>
      <div class="machine-metric">
        <small>${inputLabel}</small>
        <b>${inputValue}</b>
      </div>
      <div class="machine-metric">
        <small>${stockLabel}</small>
        <b>${stockValue}</b>
      </div>
      <div class="machine-metric">
        <small>GEPRODUCEERD</small>
        <b>${machine.produced}</b>
      </div>
    </div>
  `;

  if (machine.type === 'belt') {
    actions.innerHTML = `
      <button class="action-button" id="rotateSelectedBtn">
        ↻ DRAAI BAND
      </button>
      <button class="action-button danger" id="removeSelectedBtn">
        VERWIJDER
      </button>
    `;

    document
      .getElementById('rotateSelectedBtn')
      .addEventListener('click', rotateSelectedBelt);

  } else {
    const upgradeCost = Math.round(
      def.cost * machine.level * 0.72
    );

    actions.innerHTML = `
      <button class="action-button" id="upgradeSelectedBtn">
        ⬆ UPGRADE $${formatNumber(upgradeCost)}
      </button>
      <button class="action-button danger" id="removeSelectedBtn">
        VERWIJDER
      </button>
    `;

    document
      .getElementById('upgradeSelectedBtn')
      .addEventListener('click', upgradeSelected);
  }

  document
    .getElementById('removeSelectedBtn')
    .addEventListener('click', removeSelected);
}

// ============================================================
// REAL CONVEYOR LOGIC
// ============================================================

function itemColor(kind) {
  return kind === 'ore'
    ? '#d49a5a'
    : kind === 'metal'
      ? '#b5c9d8'
      : '#ffbd54';
}

function acceptedItem(machine, kind) {
  if (machine.type === 'smelter' && kind === 'ore') {
    return 'ore';
  }

  if (machine.type === 'assembler' && kind === 'metal') {
    return 'metal';
  }

  if (machine.type === 'seller' && kind === 'gear') {
    return 'gear';
  }

  return null;
}

function deliverToMachine(machine, kind) {
  const accepted = acceptedItem(machine, kind);

  if (!accepted) return false;

  if (machine.type === 'seller') {
    const earnings = 45 * machine.level;

    money += earnings;
    machine.sold += 1;
    machine.received += 1;

    productionCounts.income += earnings;

    spawnParticles(
      machine.x,
      machine.y,
      '#77dfab',
      '+$' + earnings
    );

  } else {
    machine.input[accepted] += 1;
    machine.received += 1;

    spawnParticles(
      machine.x,
      machine.y,
      itemColor(kind),
      '+1'
    );
  }

  return true;
}

function adjacentBelts(machine) {
  const preferred = [0, 1, 2, 3];

  return preferred
    .map(index => {
      const d = DIRS[index];

      return getMachineAt(
        machine.x + d.x,
        machine.y + d.y
      );
    })
    .filter(candidate => candidate && candidate.type === 'belt');
}

function canBeltCarryAway(belt, sourceMachine) {
  const d = DIRS[belt.dir];

  const targetX = belt.x + d.x;
  const targetY = belt.y + d.y;

  return !(
    targetX === sourceMachine.x &&
    targetY === sourceMachine.y
  );
}

function pushMachineOutputs() {
  for (const machine of machines) {
    if (
      !machine.output ||
      machine.type === 'seller' ||
      machine.type === 'belt'
    ) {
      continue;
    }

    if (machine.output <= 0) continue;

    const belts = adjacentBelts(machine);

    for (const belt of belts) {
      if (belt.item || !canBeltCarryAway(belt, machine)) {
        continue;
      }

      belt.item = {
        kind: DEFINITIONS[machine.type].output,
        progress: 0
      };

      machine.output -= 1;
      break;
    }
  }
}

function moveConveyors(dt) {
  // Each belt holds one visible item.
  // Items move one grid tile at a time.

  const beltList = machines.filter(
    m => m.type === 'belt'
  );

  for (const belt of beltList) {
    if (!belt.item) continue;

    belt.item.progress += dt;

    if (belt.item.progress < BELT_STEP) {
      continue;
    }

    const direction = DIRS[belt.dir];

    const target = getMachineAt(
      belt.x + direction.x,
      belt.y + direction.y
    );

    if (!target) {
      // Item waits until a connected tile is available.
      belt.item.progress = BELT_STEP;
      continue;
    }

    if (target.type === 'belt') {
      if (target.item) {
        belt.item.progress = BELT_STEP;
        continue;
      }

      target.item = {
        kind: belt.item.kind,
        progress: 0
      };

      belt.item = null;
      continue;
    }

    if (
      deliverToMachine(target, belt.item.kind)
    ) {
      belt.item = null;
    } else {
      belt.item.progress = BELT_STEP;
    }
  }
}

// ============================================================
// MACHINE PRODUCTION
// ============================================================

function processMachines(dt) {
  for (const machine of machines) {
    const def = DEFINITIONS[machine.type];

    if (
      machine.type === 'belt' ||
      machine.type === 'seller'
    ) {
      continue;
    }

    if (machine.output >= 20) continue;

    if (machine.type === 'miner') {
      machine.timer += dt;

      const interval = def.interval / machine.level;

      while (
        machine.timer >= interval &&
        machine.output < 20
      ) {
        machine.timer -= interval;
        machine.output += 1;
        machine.produced += 1;

        productionCounts.ore += 1;

        spawnParticles(
          machine.x,
          machine.y,
          '#d49a5a',
          '+ORE'
        );
      }

    } else {
      const inputKind = def.input;

      if (machine.input[inputKind] <= 0) {
        machine.timer = Math.min(
          machine.timer,
          def.interval / machine.level
        );

        continue;
      }

      machine.timer += dt;

      const interval = def.interval / machine.level;

      while (
        machine.timer >= interval &&
        machine.input[inputKind] > 0 &&
        machine.output < 20
      ) {
        machine.timer -= interval;

        machine.input[inputKind] -= 1;
        machine.output += 1;
        machine.produced += 1;

        productionCounts[def.output] += 1;

        spawnParticles(
          machine.x,
          machine.y,
          itemColor(def.output),
          `+${def.makes}`
        );
      }
    }
  }
}

// ============================================================
// DRAWING HELPERS
// ============================================================

function roundedRect(
  context,
  x,
  y,
  width,
  height,
  radius
) {
  const r = Math.min(
    radius,
    width / 2,
    height / 2
  );

  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    r
  );
  context.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    r
  );
  context.arcTo(
    x,
    y + height,
    x,
    y,
    r
  );
  context.arcTo(
    x,
    y,
    x + width,
    y,
    r
  );
  context.closePath();
}

// ============================================================
// FACTORY FLOOR
// ============================================================

function drawFloor() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const bg = ctx.createLinearGradient(
    0, 0,
    width, height
  );

  bg.addColorStop(0, '#142330');
  bg.addColorStop(1, '#101a24');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = offsetX + x * cellSize;
      const py = offsetY + y * cellSize;

      ctx.fillStyle =
        (x + y) % 2 === 0
          ? 'rgba(49,69,83,.30)'
          : 'rgba(35,53,67,.30)';

      ctx.fillRect(
        px + 1,
        py + 1,
        cellSize - 2,
        cellSize - 2
      );

      ctx.strokeStyle = 'rgba(139,165,187,.13)';
      ctx.lineWidth = 1;

      ctx.strokeRect(
        px + .5,
        py + .5,
        cellSize,
        cellSize
      );

      if ((x * 7 + y * 11) % 23 === 0) {
        ctx.fillStyle = 'rgba(173,195,212,.15)';

        ctx.fillRect(
          px + cellSize * .18,
          py + cellSize * .18,
          2,
          2
        );
      }
    }
  }

  // Subtle safety markings around the factory floor.
  ctx.save();

  ctx.strokeStyle = 'rgba(255,184,77,.12)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 8]);

  ctx.strokeRect(
    offsetX + 4,
    offsetY + 4,
    COLS * cellSize - 8,
    ROWS * cellSize - 8
  );

  ctx.restore();
}

// ============================================================
// DRAW TRANSPORT BELTS
// ============================================================

function drawBelt(machine) {
  const px = offsetX + machine.x * cellSize;
  const py = offsetY + machine.y * cellSize;

  const s = cellSize;
  const cx = px + s / 2;
  const cy = py + s / 2;
  const d = DIRS[machine.dir];

  ctx.save();

  ctx.shadowColor = 'rgba(0,0,0,.28)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 3;

  roundedRect(
    ctx,
    px + 3,
    py + 3,
    s - 6,
    s - 6,
    Math.max(4, s * .12)
  );

  ctx.fillStyle = '#394b59';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Belt rails and moving rollers.
  ctx.strokeStyle = '#91a4b1';
  ctx.lineWidth = Math.max(2, s * .065);
  ctx.lineCap = 'round';

  if (d.x !== 0) {
    ctx.beginPath();
    ctx.moveTo(
      px + s * .18,
      cy - s * .19
    );
    ctx.lineTo(
      px + s * .82,
      cy - s * .19
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      px + s * .18,
      cy + s * .19
    );
    ctx.lineTo(
      px + s * .82,
      cy + s * .19
    );
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const roller =
        ((animationTime * .9 + i / 4) % 1);

      const rx =
        px + s * (.2 + roller * .6);

      ctx.fillStyle = '#c0ccd4';
      ctx.beginPath();

      ctx.arc(
        rx,
        cy,
        Math.max(1.5, s * .045),
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

  } else {
    ctx.beginPath();
    ctx.moveTo(
      cx - s * .19,
      py + s * .18
    );
    ctx.lineTo(
      cx - s * .19,
      py + s * .82
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      cx + s * .19,
      py + s * .18
    );
    ctx.lineTo(
      cx + s * .19,
      py + s * .82
    );
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const roller =
        ((animationTime * .9 + i / 4) % 1);

      const ry =
        py + s * (.2 + roller * .6);

      ctx.fillStyle = '#c0ccd4';
      ctx.beginPath();

      ctx.arc(
        cx,
        ry,
        Math.max(1.5, s * .045),
        0,
        Math.PI * 2
      );

      ctx.fill();
    }
  }

  // Direction arrow.
  ctx.translate(cx, cy);
  ctx.rotate(machine.dir * Math.PI / 2);

  ctx.fillStyle = '#f2c16f';
  ctx.beginPath();

  ctx.moveTo(s * .20, 0);
  ctx.lineTo(-s * .10, -s * .16);
  ctx.lineTo(-s * .10, -s * .055);
  ctx.lineTo(-s * .25, -s * .055);
  ctx.lineTo(-s * .25, s * .055);
  ctx.lineTo(-s * .10, s * .055);
  ctx.lineTo(-s * .10, s * .16);

  ctx.closePath();
  ctx.fill();

  ctx.restore();

  if (machine.item) {
    drawProduct(
      cx,
      cy,
      machine.item.kind,
      machine.item.progress
    );
  }
}

// ============================================================
// DRAW PRODUCTS
// ============================================================

function drawProduct(cx, cy, kind, progress) {
  const color = itemColor(kind);

  const bob =
    Math.sin(animationTime * 8 + progress * 5) * 1.2;

  ctx.save();

  ctx.shadowColor = color;
  ctx.shadowBlur = 11;
  ctx.fillStyle = color;

  ctx.beginPath();

  ctx.arc(
    cx,
    cy + bob,
    Math.max(4, cellSize * .105),
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.7)';

  ctx.beginPath();

  ctx.arc(
    cx - cellSize * .025,
    cy + bob - cellSize * .025,
    Math.max(1, cellSize * .025),
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();
}

// ============================================================
// DRAW MACHINES
// ============================================================

function drawMachine(machine) {
  if (machine.type === 'belt') {
    drawBelt(machine);
    return;
  }

  const px = offsetX + machine.x * cellSize;
  const py = offsetY + machine.y * cellSize;

  const s = cellSize;
  const def = DEFINITIONS[machine.type];
  const pad = Math.max(3, s * .075);
  const selected = machine.id === selectedMachineId;

  ctx.save();

  ctx.shadowColor = selected
    ? 'rgba(255,184,77,.26)'
    : 'rgba(0,0,0,.35)';

  ctx.shadowBlur = selected ? 13 : 8;
  ctx.shadowOffsetY = 3;

  roundedRect(
    ctx,
    px + pad,
    py + pad,
    s - pad * 2,
    s - pad * 2,
    Math.max(5, s * .14)
  );

  const gradient = ctx.createLinearGradient(
    px,
    py,
    px + s,
    py + s
  );

  gradient.addColorStop(0, def.color);
  gradient.addColorStop(
    1,
    shadeColor(def.color, -38)
  );

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Machine roof panel.
  roundedRect(
    ctx,
    px + pad + 3,
    py + pad + 3,
    s - pad * 2 - 6,
    s * .19,
    3
  );

  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.fill();

  ctx.fillStyle = 'rgba(14,23,32,.34)';

  ctx.fillRect(
    px + pad + 4,
    py + s - pad - s * .12,
    s - pad * 2 - 8,
    s * .07
  );

  // Glowing status lamps.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle =
      i === 0
        ? '#77dfab'
        : 'rgba(220,235,244,.38)';

    ctx.beginPath();

    ctx.arc(
      px + s * (.29 + i * .18),
      py + s * .25,
      Math.max(1.3, s * .025),
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font =
    `${Math.max(15, Math.floor(s * .43))}px "Segoe UI Symbol", sans-serif`;

  ctx.fillStyle = '#fff';

  ctx.fillText(
    def.icon,
    px + s / 2,
    py + s * .57
  );

  // Level badge.
  if (machine.level > 1) {
    ctx.fillStyle = '#ffd17e';

    roundedRect(
      ctx,
      px + s * .66,
      py + s * .08,
      s * .24,
      s * .19,
      3
    );

    ctx.fill();

    ctx.fillStyle = '#392815';
    ctx.font = `bold ${Math.max(7, s * .12)}px sans-serif`;

    ctx.fillText(
      machine.level,
      px + s * .78,
      py + s * .175
    );
  }

  // Small input/output activity bar.
  const fillValue =
    machine.type === 'miner'
      ? machine.output / 20
      : machine.type === 'seller'
        ? Math.min(1, machine.sold / 20)
        : machine.input[def.input] / 20;

  ctx.fillStyle = 'rgba(8,15,22,.45)';

  roundedRect(
    ctx,
    px + s * .17,
    py + s * .83,
    s * .66,
    Math.max(2, s * .055),
    3
  );

  ctx.fill();

  ctx.fillStyle = '#f6c16b';

  roundedRect(
    ctx,
    px + s * .17,
    py + s * .83,
    s * .66 * Math.max(0, Math.min(1, fillValue)),
    Math.max(2, s * .055),
    3
  );

  ctx.fill();

  ctx.restore();
}

function shadeColor(hex, amount) {
  const value = hex.replace('#', '');
  const num = parseInt(value, 16);

  const r = Math.max(
    0,
    Math.min(255, (num >> 16) + amount)
  );

  const g = Math.max(
    0,
    Math.min(255, ((num >> 8) & 255) + amount)
  );

  const b = Math.max(
    0,
    Math.min(255, (num & 255) + amount)
  );

  return `rgb(${r},${g},${b})`;
}

// ============================================================
// PARTICLE EFFECTS
// ============================================================

function spawnParticles(gridX, gridY, color, label) {
  const px =
    offsetX + (gridX + .5) * cellSize;

  const py =
    offsetY + (gridY + .5) * cellSize;

  particles.push({
    x: px,
    y: py,
    color,
    label,
    life: .85,
    maxLife: .85,
    vy: -18
  });

  if (particles.length > 45) {
    particles.splice(
      0,
      particles.length - 45
    );
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.y += p.vy * dt;
  }

  particles = particles.filter(
    p => p.life > 0
  );
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();

    ctx.globalAlpha = Math.max(
      0,
      p.life / p.maxLife
    );

    ctx.font =
      `bold ${Math.max(8, cellSize * .17)}px Manrope, sans-serif`;

    ctx.textAlign = 'center';
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;

    ctx.fillText(
      p.label,
      p.x,
      p.y
    );

    ctx.restore();
  }
}

// ============================================================
// MAIN DRAW FUNCTION
// ============================================================

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);

  drawFloor();

  // Belts first, then machines.
  for (const machine of machines) {
    if (machine.type === 'belt') {
      drawMachine(machine);
    }
  }

  for (const machine of machines) {
    if (machine.type !== 'belt') {
      drawMachine(machine);
    }
  }

  // Placement preview.
  if (
    pointerCell &&
    selectedTool !== 'select' &&
    !getMachineAt(pointerCell.x, pointerCell.y)
  ) {
    const x =
      offsetX + pointerCell.x * cellSize;

    const y =
      offsetY + pointerCell.y * cellSize;

    ctx.save();

    ctx.strokeStyle =
      money >= DEFINITIONS[selectedTool].cost
        ? 'rgba(255,190,91,.85)'
        : 'rgba(244,105,105,.85)';

    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);

    ctx.strokeRect(
      x + 2,
      y + 2,
      cellSize - 4,
      cellSize - 4
    );

    if (selectedTool === 'belt') {
      ctx.translate(
        x + cellSize / 2,
        y + cellSize / 2
      );

      ctx.rotate(beltDirection * Math.PI / 2);

      ctx.fillStyle = 'rgba(255,190,91,.8)';
      ctx.font = `bold ${cellSize * .35}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText('→', 0, 0);
    }

    ctx.restore();
  }

  // Selected machine outline.
  const selected = getSelectedMachine();

  if (selected) {
    const x = offsetX + selected.x * cellSize;
    const y = offsetY + selected.y * cellSize;

    ctx.save();

    ctx.strokeStyle = '#ffd078';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255,184,77,.8)';
    ctx.shadowBlur = 10;

    roundedRect(
      ctx,
      x + 1.5,
      y + 1.5,
      cellSize - 3,
      cellSize - 3,
      7
    );

    ctx.stroke();
    ctx.restore();
  }

  drawParticles();
}

// ============================================================
// CANVAS SIZE
// ============================================================

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    2
  );

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  cellSize = Math.min(
    rect.width / COLS,
    rect.height / ROWS
  );

  offsetX = (rect.width - cellSize * COLS) / 2;
  offsetY = (rect.height - cellSize * ROWS) / 2;

  draw();
}

if ('ResizeObserver' in window) {
  new ResizeObserver(resizeCanvas).observe(
    canvas.parentElement
  );
} else {
  window.addEventListener('resize', resizeCanvas);
}

// ============================================================
// INVENTORY
// ============================================================

function getInventory() {
  const inventory = {
    ore: 0,
    metal: 0,
    gear: 0
  };

  for (const machine of machines) {
    if (machine.type === 'miner') {
      inventory.ore += machine.output;
    }

    if (machine.type === 'smelter') {
      inventory.ore += machine.input.ore;
      inventory.metal += machine.output;
    }

    if (machine.type === 'assembler') {
      inventory.metal += machine.input.metal;
      inventory.gear += machine.output;
    }

    if (machine.type === 'seller') {
      inventory.gear += machine.input.gear;
    }

    if (machine.type === 'belt' && machine.item) {
      inventory[machine.item.kind] += 1;
    }
  }

  return inventory;
}

// ============================================================
// PRODUCTION STATISTICS
// ============================================================

function updateRates(dt) {
  rateTimer += dt;

  if (rateTimer < 5) return;

  const factor = 60 / rateTimer;

  rates = {
    ore: Math.round(productionCounts.ore * factor),
    metal: Math.round(productionCounts.metal * factor),
    gear: Math.round(productionCounts.gear * factor),
    income: Math.round(productionCounts.income * factor)
  };

  productionCounts = {
    ore: 0,
    metal: 0,
    gear: 0,
    income: 0
  };

  rateTimer = 0;

  document.getElementById('oreRate').textContent =
    `${rates.ore} / min`;

  document.getElementById('metalRate').textContent =
    `${rates.metal} / min`;

  document.getElementById('gearRate').textContent =
    `${rates.gear} / min`;

  document.getElementById('incomeRate').textContent =
    `$${formatNumber(rates.income)} / min`;
}

// ============================================================
// UPDATE USER INTERFACE
// ============================================================

function updateAllUI() {
  const inventory = getInventory();

  moneyEl.textContent = formatNumber(money);
  oreEl.textContent = formatNumber(inventory.ore);
  metalEl.textContent = formatNumber(inventory.metal);
  gearsEl.textContent = formatNumber(inventory.gear);

  const percent = Math.min(
    100,
    money / goal * 100
  );

  document.getElementById('goalProgress').style.width =
    `${percent}%`;

  document.getElementById('goalPercent').textContent =
    `${Math.floor(percent)}%`;

  document.getElementById('goalText').textContent =
    `$${formatNumber(goal)} verdienen`;

  document.getElementById('clockLabel').textContent =
    formatClock(totalPlayTime);

  updateInspector();
}

function formatClock(seconds) {
  const whole = Math.floor(seconds);

  const h = String(
    Math.floor(whole / 3600)
  ).padStart(2, '0');

  const m = String(
    Math.floor((whole % 3600) / 60)
  ).padStart(2, '0');

  const s = String(
    whole % 60
  ).padStart(2, '0');

  return `${h}:${m}:${s}`;
}

// ============================================================
// MILESTONES
// ============================================================

function checkMilestone() {
  if (money >= goal) {
    const reached = goal;

    goal =
      goal < 5000
        ? 5000
        : goal < 15000
          ? 15000
          : goal < 50000
            ? 50000
            : goal + 50000;

    showToast(
      `✦ Mijlpaal bereikt: $${formatNumber(reached)}! Volgende doel: $${formatNumber(goal)}.`
    );
  }
}

// ============================================================
// SAVE SYSTEM
// ============================================================

function saveGame(showMessage = true) {
  const data = {
    version: 2,
    money,
    goal,
    totalPlayTime,
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
      input: m.input,
      produced: m.produced,
      received: m.received,
      sold: m.sold,

      item: m.item
        ? {
            kind: m.item.kind,
            progress: m.item.progress
          }
        : null
    }))
  };

  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(data)
    );

    lastSaveLabel = 'Opgeslagen';

    document.getElementById('saveStatus').innerHTML =
      '<i class="tiny-led"></i> Opgeslagen';

    if (showMessage) {
      showToast('Fabriek opgeslagen!');
    }

    return true;

  } catch (error) {
    document.getElementById('saveStatus').textContent =
      'Opslaan mislukt';

    if (showMessage) {
      showToast(
        'Opslaan mislukt. Controleer je browserinstellingen.'
      );
    }

    return false;
  }
}

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
      !data ||
      data.version !== 2 ||
      !Array.isArray(data.machines) ||
      !Number.isFinite(data.money)
    ) {
      throw new Error('Invalid save');
    }

    const seen = new Set();
    const loaded = [];

    for (const item of data.machines) {
      if (
        !DEFINITIONS[item.type] ||
        !Number.isInteger(item.x) ||
        !Number.isInteger(item.y) ||
        item.x < 0 ||
        item.x >= COLS ||
        item.y < 0 ||
        item.y >= ROWS
      ) {
        continue;
      }

      const cell = `${item.x},${item.y}`;

      if (seen.has(cell)) continue;

      seen.add(cell);

      const m = makeMachine(
        item.type,
        item.x,
        item.y,
        Number.isInteger(item.dir)
          ? ((item.dir % 4) + 4) % 4
          : 0
      );

      m.id =
        typeof item.id === 'string'
          ? item.id
          : m.id;

      m.level = Math.max(
        1,
        Math.min(
          99,
          Math.floor(Number(item.level) || 1)
        )
      );

      m.timer = Math.max(
        0,
        Math.min(20, Number(item.timer) || 0)
      );

      m.output = Math.max(
        0,
        Math.min(20, Math.floor(Number(item.output) || 0))
      );

      m.input = {
        ore: Math.max(
          0,
          Math.min(999, Math.floor(Number(item.input?.ore) || 0))
        ),
        metal: Math.max(
          0,
          Math.min(999, Math.floor(Number(item.input?.metal) || 0))
        ),
        gear: Math.max(
          0,
          Math.min(999, Math.floor(Number(item.input?.gear) || 0))
        )
      };

      m.produced = Math.max(
        0,
        Math.floor(Number(item.produced) || 0)
      );

      m.received = Math.max(
        0,
        Math.floor(Number(item.received) || 0)
      );

      m.sold = Math.max(
        0,
        Math.floor(Number(item.sold) || 0)
      );

      if (
        item.item &&
        ['ore', 'metal', 'gear'].includes(item.item.kind)
      ) {
        m.item = {
          kind: item.item.kind,
          progress: Math.max(
            0,
            Math.min(
              BELT_STEP,
              Number(item.item.progress) || 0
            )
          )
        };
      }

      loaded.push(m);
    }

    machines = loaded;

    money = Math.max(
      0,
      Math.floor(data.money)
    );

    goal = Math.max(
      1500,
      Math.floor(Number(data.goal) || 1500)
    );

    totalPlayTime = Math.max(
      0,
      Number(data.totalPlayTime) || 0
    );

    beltDirection = Number.isInteger(data.beltDirection)
      ? ((data.beltDirection % 4) + 4) % 4
      : 0;

    document.getElementById('directionLabel').textContent =
      DIRS[beltDirection].name;

    return true;

  } catch (error) {
    console.warn(
      'Save kon niet worden geladen:',
      error
    );

    return false;
  }
}

// ============================================================
// SAVE BUTTON AND NEW FACTORY
// ============================================================

document.getElementById('saveBtn').addEventListener(
  'click',
  () => saveGame(true)
);

document.getElementById('resetBtn').addEventListener(
  'click',
  () => {
    const confirmed = window.confirm(
      'Weet je zeker dat je een nieuwe fabriek wilt starten? Je huidige save wordt overschreven.'
    );

    if (!confirmed) return;

    machines = [];
    money = 1200;
    goal = 1500;
    totalPlayTime = 0;

    selectedMachineId = null;
    beltDirection = 0;

    productionCounts = {
      ore: 0,
      metal: 0,
      gear: 0,
      income: 0
    };

    rates = {
      ore: 0,
      metal: 0,
      gear: 0,
      income: 0
    };

    document.getElementById('directionLabel').textContent =
      DIRS[0].name;

    setTool('select');

    saveGame(false);
    updateAllUI();

    showToast(
      'Nieuwe fabriek gestart. Veel succes!'
    );
  }
);

// ============================================================
// SPEED CONTROL
// ============================================================

document.getElementById('speedBtn').addEventListener(
  'click',
  () => {
    gameSpeed =
      gameSpeed === 1
        ? 2
        : gameSpeed === 2
          ? 3
          : 1;

    document.getElementById('speedBtn').innerHTML =
      `${gameSpeed}× <span>⌄</span>`;

    showToast(
      `Productiesnelheid: ${gameSpeed}×`
    );
  }
);

// ============================================================
// PAUSE BUTTON
// ============================================================

document.getElementById('pauseBtn').addEventListener(
  'click',
  () => {
    paused = !paused;

    const button =
      document.getElementById('pauseBtn');

    button.innerHTML = paused
      ? '▶ <span>VERDER</span>'
      : 'Ⅱ <span>PAUZE</span>';

    showToast(
      paused
        ? 'Fabriek gepauzeerd.'
        : 'Fabriek draait weer.'
    );
  }
);

// ============================================================
// KEYBOARD CONTROLS
// ============================================================

window.addEventListener('keydown', event => {
  if (
    event.key.toLowerCase() === 'r'
  ) {
    event.preventDefault();
    rotateSelectedBelt();

  } else if (
    event.key.toLowerCase() === 'v' &&
    !['INPUT', 'TEXTAREA'].includes(
      document.activeElement.tagName
    )
  ) {
    setTool('select');

  } else if (
    event.key === 'Escape'
  ) {
    selectedMachineId = null;

    updateInspector();
    draw();
  }
});

// ============================================================
// AUTOMATIC SAVE
// ============================================================

window.addEventListener(
  'beforeunload',
  () => saveGame(false)
);

document.addEventListener(
  'visibilitychange',
  () => {
    if (document.visibilityState === 'hidden') {
      saveGame(false);
    }
  }
);

// ============================================================
// MAIN GAME LOOP
// ============================================================

function simulationStep(dt) {
  processMachines(dt);
  pushMachineOutputs();
  moveConveyors(dt);
  checkMilestone();
}

function gameLoop(timestamp) {
  const rawDt = lastFrame
    ? Math.min(
        (timestamp - lastFrame) / 1000,
        0.05
      )
    : 0;

  lastFrame = timestamp;

  const dt = paused
    ? 0
    : rawDt * gameSpeed;

  if (dt > 0) {
    animationTime += dt;
    totalPlayTime += dt;

    updateParticles(dt);
    simulationStep(dt);
    updateRates(dt);

    autosaveElapsed += dt;

    if (autosaveElapsed >= 15) {
      saveGame(false);
      autosaveElapsed = 0;
    }

    uiTimer += dt;

    if (uiTimer >= .18) {
      updateAllUI();
      uiTimer = 0;
    }
  }

  draw();

  requestAnimationFrame(gameLoop);
}

// ============================================================
// START GAME
// ============================================================

const hadSave = loadGame();

resizeCanvas();
updateAllUI();

if (hadSave) {
  showToast('Je fabriek is geladen.');
} else {
  showToast(
    'Welkom! Bouw een productielijn om geld te verdienen.'
  );
}

requestAnimationFrame(gameLoop);
