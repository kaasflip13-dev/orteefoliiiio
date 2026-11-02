
'use strict';

// ======================================================
// FACTORY TYCOON - EXPANDED FACTORY
// 13 BUILDINGS, 10 PRODUCTS, INSTANT PROCESSING
// ======================================================

const canvas = document.getElementById('factoryCanvas');
const ctx = canvas.getContext('2d');

const COLS = 16;
const ROWS = 10;
const MAX_BUFFER = 100;
const BELT_TIME = 0.55;
const STORAGE_BASE = 500;
const SAVE_KEY = 'factoryTycoon_clear_v2';

const DIRS = [
  {x:1,y:0,name:'Right →'},
  {x:0,y:1,name:'Down ↓'},
  {x:-1,y:0,name:'Left ←'},
  {x:0,y:-1,name:'Up ↑'}
];

// ======================================================
// PRODUCTS AND SELL PRICES
// ======================================================

const PRODUCTS = {
  ore:     {name:'Ore',icon:'◆',color:'#d49a5a',price:5},
  crystal: {name:'Crystal',icon:'💎',color:'#b99aff',price:12},
  stone:   {name:'Stone',icon:'🪨',color:'#aab7c2',price:3},
  metal:   {name:'Metal',icon:'▰',color:'#b5c9d8',price:15},
  brick:   {name:'Bricks',icon:'🧱',color:'#ca8563',price:12},
  plate:   {name:'Metal Plates',icon:'▱',color:'#a4bfd2',price:25},
  gear:    {name:'Gears',icon:'⚙',color:'#ffbd54',price:40},
  circuit: {name:'Circuits',icon:'▦',color:'#66e1ce',price:65},
  battery: {name:'Batteries',icon:'🔋',color:'#9be77e',price:55},
  tool:    {name:'Tools',icon:'🛠',color:'#e6c07a',price:90}
};

// ======================================================
// BUILDINGS
// ======================================================

const DATA = {
  miner: {
    name:'Ore Miner',
    icon:'⛏️',
    price:100,
    color:'#a57a4c',
    description:'Mines ore automatically.',
    output:'ore',
    time:2,
    amount:1,
    category:'mining'
  },

  crystalMiner: {
    name:'Crystal Miner',
    icon:'💎',
    price:250,
    color:'#795daf',
    description:'Extracts valuable crystals from underground.',
    output:'crystal',
    time:3.5,
    amount:1,
    category:'mining'
  },

  quarry: {
    name:'Stone Quarry',
    icon:'🪨',
    price:150,
    color:'#697a89',
    description:'Extracts stone for your brick factory.',
    output:'stone',
    time:2.8,
    amount:2,
    category:'mining'
  },

  smelter: {
    name:'Smelter',
    icon:'🔥',
    price:220,
    color:'#b96143',
    description:'Instantly turns 1 ore into 5 metal.',
    input:'ore',
    output:'metal',
    amount:5,
    bonus:2,
    category:'processing'
  },

  crusher: {
    name:'Crusher',
    icon:'🪓',
    price:200,
    color:'#8b745b',
    description:'Instantly crushes 1 stone into 4 bricks.',
    input:'stone',
    output:'brick',
    amount:4,
    bonus:1,
    category:'processing'
  },

  press: {
    name:'Metal Press',
    icon:'🏗️',
    price:280,
    color:'#607e91',
    description:'Instantly presses 1 metal into 4 metal plates.',
    input:'metal',
    output:'plate',
    amount:4,
    bonus:2,
    category:'processing'
  },

  assembler: {
    name:'Assembler',
    icon:'⚙️',
    price:320,
    color:'#477da4',
    description:'Instantly turns 1 metal into 6 gears.',
    input:'metal',
    output:'gear',
    amount:6,
    bonus:3,
    category:'processing'
  },

  circuit: {
    name:'Circuit Factory',
    icon:'💻',
    price:450,
    color:'#368a83',
    description:'Builds 4 electronic circuits from 1 metal.',
    input:'metal',
    output:'circuit',
    amount:4,
    bonus:2,
    category:'processing'
  },

  battery: {
    name:'Battery Factory',
    icon:'🔋',
    price:400,
    color:'#648d52',
    description:'Turns 1 crystal into 5 batteries.',
    input:'crystal',
    output:'battery',
    amount:5,
    bonus:2,
    category:'processing'
  },

  toolmaker: {
    name:'Tool Workshop',
    icon:'🛠️',
    price:500,
    color:'#997b48',
    description:'Turns 1 gear into 3 valuable tools.',
    input:'gear',
    output:'tool',
    amount:3,
    bonus:2,
    category:'processing'
  },

  belt: {
    name:'Conveyor Belt',
    icon:'➡️',
    price:20,
    color:'#667d8c',
    description:'Transports individual products to the next building.',
    category:'transport'
  },

  storage: {
    name:'Warehouse',
    icon:'📦',
    price:300,
    color:'#95764c',
    description:'Stores products automatically. Sell stored products whenever you want.',
    category:'storage'
  },

  seller: {
    name:'Sell Station',
    icon:'💰',
    price:180,
    color:'#428665',
    description:'Sells all products delivered to it and pays you immediately.',
    category:'selling'
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

let totalSold = 0;

let cellSize = 40;
let offsetX = 0;
let offsetY = 0;

let pointerCell = null;
let particles = [];
let toastTimer = null;

let autoSaveMessage = false;

const production = {
  ore:0,
  crystal:0,
  stone:0,
  metal:0,
  brick:0,
  plate:0,
  gear:0,
  circuit:0,
  battery:0,
  tool:0,
  cash:0
};

const rates = {
  ore:0,
  crystal:0,
  stone:0,
  metal:0,
  brick:0,
  plate:0,
  gear:0,
  circuit:0,
  battery:0,
  tool:0,
  cash:0
};

const $ = id => document.getElementById(id);

const clamp = (v,min,max) =>
  Math.max(min,Math.min(max,v));

const fmt = v =>
  Math.floor(v).toLocaleString('en-US');

// ======================================================
// MACHINE CREATION
// ======================================================

function createMachine(type,x,y,dir=0) {
  return {
    id:`${Date.now()}_${Math.random()}`,
    type,
    x,
    y,
    dir,
    level:1,
    timer:0,
    output:0,
    item:null,

    storage:Object.fromEntries(
      Object.keys(PRODUCTS).map(k=>[k,0])
    ),

    produced:0,
    received:0,
    sold:0,
    revenue:0
  };
}

function machineAt(x,y) {
  return machines.find(m=>m.x===x && m.y===y) || null;
}

function getSelected() {
  return machines.find(m=>m.id===selectedId) || null;
}

function getDirection(machine) {
  return DIRS[machine.dir];
}

// ======================================================
// NOTIFICATIONS
// ======================================================

function toast(message) {
  const el = $('toast');

  el.textContent = message;
  el.classList.add('show');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(()=>{
    el.classList.remove('show');
  },2200);
}

// ======================================================
// BUILD MENU
// ======================================================

document.querySelectorAll('.tool-button').forEach(button=>{
  button.addEventListener('click',()=>{
    setTool(button.dataset.type);
  });
});

function setTool(type) {
  if(type!=='select' && !DATA[type]) return;

  selectedTool = type;
  selectedId = null;

  document.querySelectorAll('.tool-button').forEach(button=>{
    button.classList.toggle(
      'active',
      button.dataset.type===type
    );
  });

  $('selectedInfo').textContent =
    type==='select'
      ? 'SELECT: Click a building to inspect it'
      : `BUILD: ${DATA[type].name} — click an empty tile`;

  canvas.style.cursor =
    type==='select' ? 'default':'crosshair';

  updateInspector();
  draw();
}

// ======================================================
// BELT DIRECTION
// ======================================================

function rotateDirection() {
  beltDirection = (beltDirection+1)%4;

  $('directionLabel').textContent =
    DIRS[beltDirection].name;

  draw();
}

function rotateBelt() {
  const machine = getSelected();

  if(machine && machine.type==='belt') {
    machine.dir=(machine.dir+1)%4;
    updateInspector();
    draw();
    toast('Belt rotated!');
  } else {
    rotateDirection();
  }
}

$('rotateBtn').addEventListener('click',rotateBelt);

// ======================================================
// PLACING BUILDINGS
// ======================================================

function placeMachine(type,x,y) {
  if(machineAt(x,y)) {
    toast('This tile is occupied!');
    return;
  }

  const price=DATA[type].price;

  if(money<price) {
    toast(`Not enough cash! You need $${price}.`);
    return;
  }

  money-=price;

  const machine=createMachine(
    type,x,y,beltDirection
  );

  machines.push(machine);
  selectedId=machine.id;

  updateUI();
  toast(DATA[type].name+' placed!');

  saveGame(false);
}

// ======================================================
// CANVAS INPUT
// ======================================================

function getCell(event) {
  const rect=canvas.getBoundingClientRect();

  const px=event.clientX-rect.left;
  const py=event.clientY-rect.top;

  const x=Math.floor((px-offsetX)/cellSize);
  const y=Math.floor((py-offsetY)/cellSize);

  if(x<0 || x>=COLS || y<0 || y>=ROWS) {
    return null;
  }

  return {x,y};
}

canvas.addEventListener('pointermove',event=>{
  pointerCell=getCell(event);

  if(pointerCell) {
    $('coordsInfo').textContent=
      `X: ${pointerCell.x+1} · Y: ${pointerCell.y+1}`;
  } else {
    $('coordsInfo').textContent='X: -- · Y: --';
  }
});

canvas.addEventListener('pointerleave',()=>{
  pointerCell=null;
  $('coordsInfo').textContent='X: -- · Y: --';
});

canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0) return;

  const cell=getCell(event);
  if(!cell) return;

  const existing=machineAt(cell.x,cell.y);

  if(selectedTool==='select') {
    selectedId=existing ? existing.id:null;

    $('selectedInfo').textContent=existing
      ? DATA[existing.type].name+' selected'
      : 'Nothing selected';

    updateInspector();
    draw();
    return;
  }

  if(existing) {
    selectedId=existing.id;
    updateInspector();
    draw();
    toast('Tile occupied. Building selected.');
    return;
  }

  placeMachine(selectedTool,cell.x,cell.y);
});

// ======================================================
// ADJACENT BELTS
// ======================================================

function adjacentBelts(machine) {
  return DIRS.map(d=>
    machineAt(
      machine.x+d.x,
      machine.y+d.y
    )
  ).filter(m=>m && m.type==='belt');
}

// ======================================================
// STORAGE CAPACITY
// ======================================================

function storageCapacity(machine) {
  return STORAGE_BASE+(machine.level-1)*250;
}

function storageUsed(machine) {
  return Object.values(machine.storage).reduce(
    (sum,v)=>sum+v,0
  );
}

// ======================================================
// PRODUCT ACCEPTANCE
// ======================================================

function acceptProduct(machine,product) {
  if(!PRODUCTS[product]) return false;

  // WAREHOUSE
  // Any product can be stored.

  if(machine.type==='storage') {
    if(storageUsed(machine)>=storageCapacity(machine)) {
      return false;
    }

    machine.storage[product]++;
    machine.received++;

    createEffect(
      machine.x,machine.y,
      PRODUCTS[product].color,
      '+STORED'
    );

    return true;
  }

  // SELL STATION
  // Any product can be sold.

  if(machine.type==='seller') {
    const price=PRODUCTS[product].price;
    const earned=price*machine.level;

    money+=earned;
    machine.received++;
    machine.sold++;
    machine.revenue+=earned;
    totalSold++;

    production.cash+=earned;

    createEffect(
      machine.x,machine.y,
      '#77dfab',
      '+$'+earned
    );

    toast(
      'SOLD '+PRODUCTS[product].name.toUpperCase()+
      '! +$'+earned
    );

    return true;
  }

  // PROCESSING MACHINES
  // All processing is instant.

  if(!['smelter','crusher','press','assembler',
       'circuit','battery','toolmaker'].includes(machine.type)) {
    return false;
  }

  const data=DATA[machine.type];

  if(product!==data.input) return false;

  const amount=
    data.amount+(machine.level-1)*data.bonus;

  if(machine.output+amount>MAX_BUFFER) {
    return false;
  }

  machine.output+=amount;
  machine.received++;
  machine.produced+=amount;

  production[data.output]+=amount;

  createEffect(
    machine.x,machine.y,
    PRODUCTS[data.output].color,
    '+'+amount+' '+PRODUCTS[data.output].name.toUpperCase()
  );

  toast(
    data.icon+' '+DATA[machine.type].name+
    ': +'+amount+' '+PRODUCTS[data.output].name
  );

  return true;
}

// ======================================================
// MACHINE PRODUCTION
// Only raw material producers need time.
// Processing buildings work instantly on arrival.
// ======================================================

function processMachines(dt) {
  for(const machine of machines) {
    const data=DATA[machine.type];

    if(!data.output || !data.time) continue;
    if(machine.output>=MAX_BUFFER) continue;

    machine.timer+=dt;

    const interval=data.time/machine.level;

    while(
      machine.timer>=interval &&
      machine.output+data.amount<=MAX_BUFFER
    ) {
      machine.timer-=interval;

      machine.output+=data.amount;
      machine.produced+=data.amount;

      production[data.output]+=data.amount;

      createEffect(
        machine.x,machine.y,
        PRODUCTS[data.output].color,
        '+'+data.amount+' '+data.output.toUpperCase()
      );
    }
  }
}

// ======================================================
// MACHINE OUTPUT TO CONVEYOR
// ======================================================

function sendOutputs() {
  for(const machine of machines) {
    if(
      machine.type==='belt' ||
      machine.type==='storage' ||
      machine.type==='seller' ||
      machine.output<=0
    ) continue;

    const product=DATA[machine.type].output;

    for(const belt of adjacentBelts(machine)) {
      if(belt.item) continue;

      const d=getDirection(belt);

      // The belt must point away from its producer.
      if(
        belt.x+d.x===machine.x &&
        belt.y+d.y===machine.y
      ) continue;

      belt.item={
        type:product,
        progress:0,
        blocked:false
      };

      machine.output--;
      break;
    }
  }
}

// ======================================================
// MOVE ITEMS ON CONVEYORS
// ======================================================

function moveBelts(dt) {
  const belts=machines.filter(m=>m.type==='belt');

  const transfers=[];
  const reserved=new Set();

  for(const belt of belts) {
    if(!belt.item) continue;

    belt.item.blocked=false;

    belt.item.progress=Math.min(
      1,
      belt.item.progress+dt/BELT_TIME
    );

    if(belt.item.progress<1) continue;

    const d=getDirection(belt);

    const next=machineAt(
      belt.x+d.x,
      belt.y+d.y
    );

    // No connected building.
    // The product remains visible at the end.

    if(!next) {
      belt.item.blocked=true;
      continue;
    }

    // Another belt.
    if(next.type==='belt') {
      if(next.item || reserved.has(next.id)) {
        belt.item.blocked=true;
        continue;
      }

      reserved.add(next.id);

      transfers.push({
        from:belt,
        to:next,
        item:belt.item
      });

      continue;
    }

    // Machine, warehouse or selling destination.

    if(acceptProduct(next,belt.item.type)) {
      belt.item=null;
    } else {
      belt.item.blocked=true;
    }
  }

  // Apply transfers after checking all belts.
  for(const transfer of transfers) {
    if(!transfer.to.item) {
      transfer.to.item={
        type:transfer.item.type,
        progress:0,
        blocked:false
      };

      transfer.from.item=null;
    }
  }
}

// ======================================================
// WAREHOUSE: SELL STORED STOCK
// ======================================================

function sellWarehouseStock() {
  const machine=getSelected();

  if(!machine || machine.type!=='storage') return;

  let earned=0;
  let amount=0;

  for(const product of Object.keys(PRODUCTS)) {
    const quantity=machine.storage[product]||0;

    earned+=quantity*PRODUCTS[product].price*machine.level;
    amount+=quantity;

    machine.storage[product]=0;
  }

  if(amount===0) {
    toast('Warehouse is empty!');
    return;
  }

  money+=earned;
  machine.sold+=amount;
  machine.revenue+=earned;
  totalSold+=amount;
  production.cash+=earned;

  updateUI();

  toast(
    'WAREHOUSE SOLD '+amount+' PRODUCTS! +$'+number(earned)
  );

  saveGame(false);
}

// ======================================================
// INVENTORY
// ======================================================

function inventory() {
  const stock=Object.fromEntries(
    Object.keys(PRODUCTS).map(k=>[k,0])
  );

  for(const machine of machines) {
    if(machine.type!=='belt' &&
       machine.type!=='storage' &&
       machine.type!=='seller') {
      stock[DATA[machine.type].output]+=machine.output;
    }

    if(machine.type==='belt' && machine.item) {
      stock[machine.item.type]++;
    }

    if(machine.type==='storage') {
      for(const product of Object.keys(PRODUCTS)) {
        stock[product]+=machine.storage[product]||0;
      }
    }
  }

  return stock;
}

// ======================================================
// DYNAMIC RESOURCE DISPLAY
// ======================================================

function updateResources() {
  const stock=inventory();

  $('resources').innerHTML=Object.keys(PRODUCTS).map(product=>{
    const data=PRODUCTS[product];

    return `
      <div class="resource" title="${data.name}">
        <span style="color:${data.color}">${data.icon}</span>
        <div>
          <small>${data.name.toUpperCase()}</small>
          <b>${number(stock[product])}</b>
        </div>
      </div>
    `;
  }).join('');
}

// ======================================================
// PRODUCTION RATES
// ======================================================

function updateRates(dt) {
  rateTimer+=dt;

  if(rateTimer<5) return;

  const factor=60/rateTimer;

  for(const product of Object.keys(PRODUCTS)) {
    rates[product]=Math.round(
      production[product]*factor
    );

    production[product]=0;
  }

  rates.cash=Math.round(production.cash*factor);
  production.cash=0;

  rateTimer=0;
}

// ======================================================
// UI UPDATES
// ======================================================

function updateUI() {
  $('money').textContent='$'+number(money);
  $('cashRate').textContent='+$'+number(rates.cash)+' / min';

  updateResources();

  $('oreRate').textContent=rates.ore+' / min';
  $('crystalRate').textContent=rates.crystal+' / min';
  $('metalRate').textContent=rates.metal+' / min';
  $('gearRate').textContent=rates.gear+' / min';

  const otherRate=
    rates.stone+
    rates.brick+
    rates.plate+
    rates.circuit+
    rates.battery+
    rates.tool;

  $('otherRate').textContent=otherRate+' / min';
  $('incomeRate').textContent='$'+number(rates.cash)+' / min';

  const progress=clamp(money/goal*100,0,100);

  $('goalProgress').style.width=progress+'%';
  $('goalPercent').textContent=Math.floor(progress)+'%';
  $('goalText').textContent='$'+number(goal)+' cash';

  $('clockLabel').textContent=formatClock(playTime);

  $('soldCount').textContent=number(totalSold);

  updateDestination();
  updateRouteGuide();
  updateInspector();
}

function formatClock(seconds) {
  const t=Math.floor(seconds);

  const h=String(Math.floor(t/3600)).padStart(2,'0');
  const m=String(Math.floor(t/60)%60).padStart(2,'0');
  const s=String(t%60).padStart(2,'0');

  return `${h}:${m}:${s}`;
}

// ======================================================
// ROUTE GUIDE
// ======================================================

function updateRouteGuide() {
  const hasMiner=machines.some(m=>
    ['miner','crystalMiner','quarry'].includes(m.type)
  );

  const hasProcessing=machines.some(m=>
    DATA[m.type]?.category==='processing'
  );

  const hasStorage=machines.some(m=>m.type==='storage');
  const hasSeller=machines.some(m=>m.type==='seller');

  $('stepMiner').classList.toggle('done',hasMiner);
  $('stepProcessing').classList.toggle('done',hasProcessing);
  $('stepStorage').classList.toggle('done',hasStorage);
  $('stepSeller').classList.toggle('done',hasSeller);

  let message='Start by placing a mining machine.';

  if(hasMiner && !hasSeller) {
    message='Mining is ready! Place a Sell Station to earn cash.';
  } else if(hasMiner && hasSeller && !hasProcessing) {
    message='You can already sell raw materials. Processing machines are optional.';
  } else if(hasProcessing && hasSeller) {
    message='Your production chain is ready. Build more machines to expand!';
  } else if(hasStorage) {
    message='You have storage! Send products there and sell them later.';
  }

  $('routeMessage').textContent=message;
}

// ======================================================
// DESTINATION STATUS
// ======================================================

function updateDestination() {
  const sellers=machines.filter(m=>m.type==='seller');

  const card=$('destinationCard');

  if(sellers.length===0) {
    card.classList.remove('active');

    $('destinationTitle').textContent='Not built yet';
    $('destinationDescription').textContent=
      'Place a Sell Station to receive cash.';

  } else {
    card.classList.add('active');

    $('destinationTitle').textContent=
      sellers.length===1
        ? 'Sell Station active'
        : sellers.length+' Sell Stations active';

    $('destinationDescription').textContent=
      'Ore $5 · Metal $15 · Gears $40 · Tools $90';
  }
}

// ======================================================
// MACHINE INSPECTOR
// ======================================================

function updateInspector() {
  const machine=getSelected();

  const info=$('machineInfo');
  const actions=$('machineActions');

  if(!machine) {
    info.className='machine-inspector';

    info.innerHTML=`
      <div class="empty-icon">＋</div>
      <h3>Nothing selected</h3>
      <p>Click a building on the factory floor.</p>
    `;

    actions.innerHTML='';
    return;
  }

  const data=DATA[machine.type];

  let input='None';
  let output=machine.output;
  let speed='Instant processing';

  if(data.time) {
    speed=(1/(data.time/machine.level)).toFixed(2)+' / sec';
  }

  if(data.input) {
    input='1 '+PRODUCTS[data.input].name;
    output=machine.type==='smelter'
      ? (data.amount+(machine.level-1)*data.bonus)+' metal'
      : (data.amount+(machine.level-1)*data.bonus)+' '+PRODUCTS[data.output].name;
  }

  if(machine.type==='seller') {
    input='All products';
    output='$'+number(machine.revenue);
  }

  if(machine.type==='storage') {
    input='All products';
    output=storageUsed(machine)+' / '+storageCapacity(machine);

  }

  if(machine.type==='belt') {
    input=DIRS[machine.dir].name;
    output=machine.item
      ? machine.item.type.toUpperCase()
      : 'Empty';
  }

  info.className='machine-inspector filled';

  info.innerHTML=`
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
        <small>SPEED</small>
        <b>${speed}</b>
      </div>
      <div class="machine-metric">
        <small>INPUT</small>
        <b>${input}</b>
      </div>
      <div class="machine-metric">
        <small>OUTPUT / STOCK</small>
        <b>${output}</b>
      </div>
      <div class="machine-metric">
        <small>PRODUCED / SOLD</small>
        <b>${machine.produced+machine.sold}</b>
      </div>
    </div>

    ${machine.type==='storage'
      ? `<div class="warehouse-stock">
          <small>WAREHOUSE CONTENTS</small>
          ${Object.keys(PRODUCTS).map(k=>
            `<div>${PRODUCTS[k].name}<b>${machine.storage[k]||0}</b></div>`
          ).join('')}
         </div>`
      : ''}
  `;

  if(machine.type==='belt') {
    actions.innerHTML=`
      <button class="action-button" id="rotateMachine">↻ ROTATE</button>
      <button class="action-button danger" id="removeMachine">REMOVE</button>
    `;

    $('rotateMachine').addEventListener('click',()=>{
      machine.dir=(machine.dir+1)%4;
      updateInspector();
      draw();
      toast('Belt rotated!');
    });

  } else if(machine.type==='storage') {
    actions.innerHTML=`
      <button class="action-button" id="sellStock">SELL ALL STOCK</button>
      <button class="action-button" id="upgradeMachine">UPGRADE</button>
      <button class="action-button danger" id="removeMachine">REMOVE</button>
    `;

    $('sellStock').addEventListener(
      'click',
      sellWarehouseStock
    );

    $('upgradeMachine').addEventListener(
      'click',
      upgradeMachine
    );

  } else {
    const price=Math.round(
      data.price*machine.level*.72
    );

    actions.innerHTML=`
      <button class="action-button" id="upgradeMachine">
        ⬆ UPGRADE $${number(price)}
      </button>
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
// UPGRADE
// ======================================================

function upgradeMachine() {
  const machine=getSelected();

  if(!machine || machine.type==='belt') return;

  const price=Math.round(
    DATA[machine.type].price*machine.level*.72
  );

  if(money<price) {
    toast('Not enough cash for upgrade!');
    return;
  }

  money-=price;
  machine.level++;

  updateUI();
  showToast(DATA[machine.type].name+' upgraded to level '+machine.level+'!');
  saveGame(false);
}

// ======================================================
// REMOVE MACHINE
// ======================================================

function removeMachine() {
  const machine=getSelected();
  if(!machine) return;

  const refund=Math.floor(DATA[machine.type].price*.45);

  machines=machines.filter(m=>m.id!==machine.id);
  money+=refund;
  selectedId=null;

  updateUI();
  draw();

  toast('Building removed. $'+refund+' refunded.');
  saveGame(false);
}

// ======================================================
// MILESTONES
// ======================================================

function checkGoal() {
  if(money<goal) return;

  const reached=goal;

  goal=goal<5000
    ? 5000
    : goal<15000
      ? 15000
      : goal<50000
        ? 50000
        : goal+50000;

  toast('🏆 MILESTONE REACHED: $'+number(reached));
}

// ======================================================
// VISUAL PARTICLES
// ======================================================

function createEffect(x,y,color,text) {
  particles.push({
    x:offsetX+(x+.5)*cellSize,
    y:offsetY+(y+.5)*cellSize,
    color,
    text,
    life:.8
  });

  if(particles.length>50) particles.shift();
}

function updateEffects(dt) {
  for(const p of particles) {
    p.life-=dt;
    p.y-=dt*18;
  }

  particles=particles.filter(p=>p.life>0);
}

function drawEffects() {
  for(const p of particles) {
    ctx.save();

    ctx.globalAlpha=clamp(p.life/.8,0,1);
    ctx.fillStyle=p.color;
    ctx.shadowColor=p.color;
    ctx.shadowBlur=8;
    ctx.font='bold 10px sans-serif';
    ctx.textAlign='center';

    ctx.fillText(p.text,p.x,p.y);

    ctx.restore();
  }
}

// ======================================================
// DRAW HELPERS
// ======================================================

function roundedRect(x,y,w,h,r) {
  const radius=Math.min(r,w/2,h/2);

  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.arcTo(x+w,y,x+w,y+h,radius);
  ctx.arcTo(x+w,y+h,x,y+h,radius);
  ctx.arcTo(x,y+h,x,y,radius);
  ctx.arcTo(x,y,x+w,y,radius);
  ctx.closePath();
}

function darken(hex,amount) {
  const n=parseInt(hex.slice(1),16);

  const r=clamp((n>>16)+amount,0,255);
  const g=clamp(((n>>8)&255)+amount,0,255);
  const b=clamp((n&255)+amount,0,255);

  return `rgb(${r},${g},${b})`;
}

// ======================================================
// DRAW FLOOR
// ======================================================

function drawFloor() {
  const w=canvas.clientWidth;
  const h=canvas.clientHeight;

  const gradient=ctx.createLinearGradient(0,0,w,h);
  gradient.addColorStop(0,'#192b39');
  gradient.addColorStop(1,'#111d28');

  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,w,h);

  for(let y=0;y<ROWS;y++) {
    for(let x=0;x<COLS;x++) {
      const px=offsetX+x*cellSize;
      const py=offsetY+y*cellSize;

      ctx.fillStyle=(x+y)%2===0
        ? 'rgba(69,94,111,.25)'
        : 'rgba(36,59,76,.27)';

      ctx.fillRect(
        px+1,py+1,
        cellSize-2,cellSize-2
      );

      ctx.strokeStyle='rgba(176,201,218,.13)';
      ctx.lineWidth=1;

      ctx.strokeRect(
        px+.5,py+.5,
        cellSize,cellSize
      );
    }
  }

  ctx.strokeStyle='rgba(255,184,77,.15)';
  ctx.lineWidth=2;
  ctx.setLineDash([6,7]);

  ctx.strokeRect(
    offsetX+3,
    offsetY+3,
    COLS*cellSize-6,
    ROWS*cellSize-6
  );

  ctx.setLineDash([]);
}

// ======================================================
// DRAW PRODUCTS ON BELTS
// ======================================================

function drawProduct(belt) {
  if(!belt.item) return;

  const d=getDirection(belt);
  const t=clamp(belt.item.progress,0,1);

  const cx=offsetX+(belt.x+.5)*cellSize;
  const cy=offsetY+(belt.y+.5)*cellSize;

  const distance=cellSize*.36;

  const x=cx+d.x*(t*2-1)*distance;
  const y=cy+d.y*(t*2-1)*distance;

  const product=PRODUCTS[belt.item.type];
  const size=Math.max(8,cellSize*.23);

  ctx.save();

  ctx.shadowColor=product.color;
  ctx.shadowBlur=12;

  roundedRect(
    x-size/2,
    y-size/2,
    size,
    size,
    3
  );

  ctx.fillStyle=product.color;
  ctx.fill();

  ctx.shadowBlur=0;
  ctx.fillStyle='#263440';
  ctx.font=`bold ${Math.max(6,size*.4)}px sans-serif`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';

  ctx.fillText(
    belt.item.type.slice(0,1).toUpperCase(),
    x,
    y
  );

  if(belt.item.blocked) {
    ctx.strokeStyle='#ff7777';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(x,y,size*.75,0,Math.PI*2);
    ctx.stroke();
  }

  ctx.restore();
}

// ======================================================
// DRAW BELTS
// ======================================================

function drawBelt(machine) {
  const px=offsetX+machine.x*cellSize;
  const py=offsetY+machine.y*cellSize;
  const s=cellSize;

  const horizontal=machine.dir===0||machine.dir===2;

  ctx.save();

  roundedRect(px+3,py+3,s-6,s-6,6);
  ctx.fillStyle='#435967';
  ctx.fill();

  ctx.strokeStyle='#a6b8c4';
  ctx.lineWidth=2;

  if(horizontal) {
    ctx.fillStyle='#172936';
    ctx.fillRect(px+4,py+s*.3,s-8,s*.4);

    ctx.beginPath();
    ctx.moveTo(px+4,py+s*.22);
    ctx.lineTo(px+s-4,py+s*.22);
    ctx.moveTo(px+4,py+s*.78);
    ctx.lineTo(px+s-4,py+s*.78);
    ctx.stroke();
  } else {
    ctx.fillStyle='#172936';
    ctx.fillRect(px+s*.3,py+4,s*.4,s-8);

    ctx.beginPath();
    ctx.moveTo(px+s*.22,py+4);
    ctx.lineTo(px+s*.22,py+s-4);
    ctx.moveTo(px+s*.78,py+4);
    ctx.lineTo(px+s*.78,py+s-4);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(px+s/2,py+s/2);
  ctx.rotate(machine.dir*Math.PI/2);

  ctx.fillStyle='#ffd17d';
  ctx.font=`bold ${Math.max(13,s*.38)}px sans-serif`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('→',0,0);

  ctx.restore();
  ctx.restore();

  drawProduct(machine);
}

// ======================================================
// DRAW MACHINES
// ======================================================

function drawMachine(machine) {
  if(machine.type==='belt') {
    drawBelt(machine);
    return;
  }

  const px=offsetX+machine.x*cellSize;
  const py=offsetY+machine.y*cellSize;
  const s=cellSize;

  const data=DATA[machine.type];

  ctx.save();

  ctx.shadowColor='#0009';
  ctx.shadowBlur=8;
  ctx.shadowOffsetY=3;

  roundedRect(px+3,py+3,s-6,s-6,6);

  const gradient=ctx.createLinearGradient(px,py,px+s,py+s);
  gradient.addColorStop(0,data.color);
  gradient.addColorStop(1,darken(data.color,-45));

  ctx.fillStyle=gradient;
  ctx.fill();

  ctx.shadowBlur=0;
  ctx.shadowOffsetY=0;

  ctx.fillStyle='#ffffff25';
  roundedRect(px+7,py+6,s-14,s*.17,3);
  ctx.fill();

  for(let i=0;i<3;i++) {
    ctx.fillStyle=i===0?'#77dfab':'#dbe5ea66';

    ctx.beginPath();
    ctx.arc(
      px+s*(.32+i*.17),
      py+s*.25,
      Math.max(1.3,s*.035),
      0,
      Math.PI*2
    );
    ctx.fill();
  }

  ctx.fillStyle='#fff';
  ctx.font=`${Math.max(16,s*.42)}px sans-serif`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';

  ctx.fillText(
    data.icon,
    px+s/2,
    py+s*.57
  );

  // Buffer bar
  let amount=machine.output/MAX_BUFFER;

  if(machine.type==='storage') {
    amount=storageUsed(machine)/storageCapacity(machine);
  }

  if(machine.type==='seller') {
    amount=Math.min(1,machine.sold/30);
  }

  ctx.fillStyle='#101e2a';
  ctx.fillRect(px+7,py+s*.83,s-14,3);

  ctx.fillStyle='#ffd17d';
  ctx.fillRect(px+7,py+s*.83,(s-14)*amount,3);

  if(machine.type==='seller') {
    ctx.strokeStyle='#a5f4be';
    ctx.lineWidth=2;
    ctx.strokeRect(px+4,py+4,s-8,s-8);
  }

  if(machine.type==='storage') {
    ctx.strokeStyle='#ffd17d';
    ctx.lineWidth=2;
    ctx.strokeRect(px+4,py+4,s-8,s-8);
  }

  if(machine.level>1) {
    ctx.fillStyle='#ffd17e';
    ctx.beginPath();
    ctx.arc(px+s-9,py+9,8,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle='#342719';
    ctx.font='bold 9px sans-serif';
    ctx.fillText(machine.level,px+s-9,py+9);
  }

  ctx.restore();
}

// ======================================================
// SELECTION AND BUILD PREVIEW
// ======================================================

function drawSelection() {
  const machine=getSelected();
  if(!machine) return;

  const x=offsetX+machine.x*cellSize;
  const y=offsetY+machine.y*cellSize;

  ctx.save();

  ctx.strokeStyle='#ffcf79';
  ctx.lineWidth=2.5;
  ctx.shadowColor='#ffcf79';
  ctx.shadowBlur=10;

  roundedRect(
    x+2,y+2,
    cellSize-4,cellSize-4,
    7
  );

  ctx.stroke();
  ctx.restore();
}

function drawPreview() {
  if(
    !pointerCell ||
    selectedTool==='select' ||
    machineAt(pointerCell.x,pointerCell.y)
  ) return;

  const x=offsetX+pointerCell.x*cellSize;
  const y=offsetY+pointerCell.y*cellSize;

  ctx.save();

  ctx.strokeStyle=money>=DATA[selectedTool].price
    ? '#ffcf79'
    : '#ee7777';

  ctx.lineWidth=2;
  ctx.setLineDash([5,4]);

  ctx.strokeRect(
    x+3,y+3,
    cellSize-6,cellSize-6
  );

  if(selectedTool==='belt') {
    ctx.translate(x+cellSize/2,y+cellSize/2);
    ctx.rotate(beltDirection*Math.PI/2);

    ctx.fillStyle='#ffcf79';
    ctx.font=`${cellSize*.4}px sans-serif`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('→',0,0);
  }

  ctx.restore();
}

// ======================================================
// DRAW PARTICLES
// ======================================================

function drawEffects() {
  for(const p of particles) {
    ctx.save();

    ctx.globalAlpha=clamp(p.life/.8,0,1);
    ctx.fillStyle=p.color;
    ctx.shadowColor=p.color;
    ctx.shadowBlur=8;
    ctx.font='bold 10px sans-serif';
    ctx.textAlign='center';

    ctx.fillText(p.text,p.x,p.y);
    ctx.restore();
  }
}

// ======================================================
// DRAW ALL
// ======================================================

function draw() {
  const w=canvas.clientWidth;
  const h=canvas.clientHeight;

  if(!w||!h) return;

  ctx.clearRect(0,0,w,h);

  drawFloor();

  for(const m of machines) {
    if(m.type==='belt') drawMachine(m);
  }

  for(const m of machines) {
    if(m.type!=='belt') drawMachine(m);
  }

  drawPreview();
  drawSelection();
  drawEffects();
}

// ======================================================
// CANVAS SIZE
// ======================================================

function resizeCanvas() {
  const rect=canvas.getBoundingClientRect();

  if(!rect.width||!rect.height) return;

  const dpr=Math.min(window.devicePixelRatio||1,2);

  canvas.width=Math.round(rect.width*dpr);
  canvas.height=Math.round(rect.height*dpr);

  ctx.setTransform(dpr,0,0,dpr,0,0);

  cellSize=Math.min(
    rect.width/COLS,
    rect.height/ROWS
  );

  offsetX=(rect.width-COLS*cellSize)/2;
  offsetY=(rect.height-ROWS*cellSize)/2;

  draw();
}

if('ResizeObserver' in window) {
  new ResizeObserver(resizeCanvas).observe(
    canvas.parentElement
  );
} else {
  window.addEventListener('resize',resizeCanvas);
}

// ======================================================
// SAVE GAME
// ======================================================

function saveGame(showMessage=true) {
  const data={
    version:3,
    money,
    goal,
    playTime,
    beltDirection,
    totalSold,

    machines:machines.map(m=>({
      id:m.id,
      type:m.type,
      x:m.x,
      y:m.y,
      dir:m.dir,
      level:m.level,
      timer:m.timer,
      output:m.output,
      item:m.item?{...m.item}:null,
      storage:{...m.storage},
      produced:m.produced,
      received:m.received,
      sold:m.sold,
      revenue:m.revenue
    }))
  };

  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(data)
    );

    $('saveStatus').textContent='● Saved';

    if(showMessage) toast('Factory saved!');

    return true;
  } catch(error) {
    $('saveStatus').textContent='● Save failed';

    if(showMessage) toast('Save failed!');

    return false;
  }
}

// ======================================================
// LOAD GAME
// ======================================================

function loadGame() {
  let raw;

  try {
    raw=localStorage.getItem(SAVE_KEY);
  } catch(error) {
    return false;
  }

  if(!raw) return false;

  try {
    const data=JSON.parse(raw);

    if(
      !Array.isArray(data.machines) ||
      !Number.isFinite(data.money)
    ) {
      throw new Error('Invalid save');
    }

    machines=[];
    const occupied=new Set();

    for(const saved of data.machines) {
      if(
        !DATA[saved.type] ||
        !Number.isInteger(saved.x) ||
        !Number.isInteger(saved.y) ||
        saved.x<0 || saved.x>=COLS ||
        saved.y<0 || saved.y>=ROWS
      ) continue;

      const pos=`${saved.x},${saved.y}`;

      if(occupied.has(pos)) continue;
      occupied.add(pos);

      const m=createMachine(
        saved.type,
        saved.x,
        saved.y,
        clamp(Math.floor(Number(saved.dir)||0),0,3)
      );

      m.id=typeof saved.id==='string'?saved.id:m.id;
      m.level=clamp(Math.floor(Number(saved.level)||1),1,99);
      m.timer=clamp(Number(saved.timer)||0,0,20);
      m.output=clamp(Math.floor(Number(saved.output)||0),0,MAX_BUFFER);

      m.produced=Math.max(0,Math.floor(Number(saved.produced)||0));
      m.received=Math.max(0,Math.floor(Number(saved.received)||0));
      m.sold=Math.max(0,Math.floor(Number(saved.sold)||0));
      m.revenue=Math.max(0,Math.floor(Number(saved.revenue)||0));

      for(const product of Object.keys(PRODUCTS)) {
        m.storage[product]=clamp(
          Math.floor(Number(saved.storage?.[product])||0),
          0,
          STORAGE_BASE*10
        );
      }

      if(
        m.type==='belt' &&
        saved.item &&
        PRODUCTS[saved.item.type]
      ) {
        m.item={
          type:saved.item.type,
          progress:clamp(Number(saved.item.progress)||0,0,1),
          blocked:Boolean(saved.item.blocked)
        };
      }

      machines.push(m);
    }

    money=Math.max(0,Math.floor(data.money));
    goal=Math.max(1500,Math.floor(Number(data.goal)||1500));
    playTime=Math.max(0,Number(data.playTime)||0);
    totalSold=Math.max(0,Math.floor(Number(data.totalSold)||0));

    beltDirection=
      ((Math.floor(Number(data.beltDirection)||0)%4)+4)%4;

    $('directionLabel').textContent=DIRS[beltDirection].name;

    return true;

  } catch(error) {
    console.warn('Loading failed:',error);
    return false;
  }
}

// ======================================================
// BUTTONS
// ======================================================

$('saveBtn').addEventListener('click',()=>{
  saveGame(true);
});

$('resetBtn').addEventListener('click',()=>{
  if(!confirm('Start a new factory? Your current save will be replaced.')) return;

  money=1200;
  goal=1500;
  machines=[];
  particles=[];
  selectedId=null;
  beltDirection=0;
  playTime=0;
  totalSold=0;

  for(const key of Object.keys(production)) {
    production[key]=0;
    rates[key]=0;
  }

  $('directionLabel').textContent=DIRS[0].name;

  setTool('select');
  updateUI();
  draw();
  saveGame(false);

  toast('New factory started!');
});

$('speedBtn').addEventListener('click',()=>{
  gameSpeed=gameSpeed===1?2:gameSpeed===2?3:1;
  $('speedBtn').textContent=gameSpeed+'×';
  toast('Speed: '+gameSpeed+'×');
});

$('pauseBtn').addEventListener('click',()=>{
  paused=!paused;

  $('pauseBtn').textContent=
    paused?'▶ RESUME':'Ⅱ PAUSE';

  toast(paused?'Factory paused.':'Factory running.');
});

// ======================================================
// KEYBOARD
// ======================================================

window.addEventListener('keydown',event=>{
  if(
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) return;

  if(event.key.toLowerCase()==='r') {
    rotateBelt();
  }

  if(event.key.toLowerCase()==='v') {
    setTool('select');
  }

  if(event.key==='Escape') {
    selectedId=null;
    updateInspector();
    draw();
  }
});

// ======================================================
// AUTOSAVE
// ======================================================

window.addEventListener('beforeunload',()=>{
  saveGame(false);
});

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden') {
    saveGame(false);
  }
});

// ======================================================
// MAIN SIMULATION
// ======================================================

function simulate(dt) {
  processMachines(dt);
  sendOutputs();
  moveBelts(dt);
  checkGoal();
}

function updateParticles(dt) {
  for(const p of particles) {
    p.life-=dt;
    p.y-=dt*18;
  }

  particles=particles.filter(p=>p.life>0);
}

function gameLoop(timestamp) {
  const rawDt=lastTime
    ? Math.min((timestamp-lastTime)/1000,.05)
    : 0;

  lastTime=timestamp;

  const dt=paused?0:rawDt*gameSpeed;

  if(dt>0) {
    animationTime+=dt;
    playTime+=dt;

    simulate(dt);
    updateParticles(dt);
    updateRates(dt);

    uiTimer+=dt;
    saveTimer+=dt;

    if(uiTimer>=.2) {
      updateUI();
      uiTimer=0;
    }

    if(saveTimer>=15) {
      saveGame(false);
      saveTimer=0;
    }
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ======================================================
// START GAME
// ======================================================

const loaded=loadGame();

resizeCanvas();
updateUI();

showToast(
  loaded
    ? 'Welcome back! Your factory is loaded.'
    : 'Welcome! Build your first factory.'
);

requestAnimationFrame(gameLoop);
