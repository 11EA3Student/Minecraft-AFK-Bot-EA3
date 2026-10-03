// ====== RENDER LIVE PORT BINDING ======
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("Bot Engine Live");
  res.end();
}).listen(process.env.PORT || 3000);

// ====== ORIGINAL REPOSITORY CODE ======
const mineflayer = require('mineflayer');
const config = require('./config.json');

const BOT_PASSWORD = 'ChooseABotPassword123';

let reconnectDelay = 3000;
const MAX_RECONNECT_DELAY = 60000;

let bot;
let movementPhase = 0;
const STEP_INTERVAL = 1500;
const JUMP_DURATION = 500;
let movementTimer = null;
let isMoving = false;

function createBot() {
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    auth: 'offline',
    version: false,
    viewDistance: config.botChunk
  });

  bot.on('spawn', onSpawn);
  bot.on('message', onMessage);
  bot.on('error', onError);
  bot.on('end', onEnd);
}

function onSpawn() {
  reconnectDelay = 3000;
  isMoving = false;
  movementPhase = 0;

  console.log(`✅ ${config.botUsername} spawned! Sending auth commands...`);

  // Send login immediately
  setTimeout(() => {
    if (bot && bot.entity) {
      bot.chat(`/login ${BOT_PASSWORD}`);
      console.log('🔐 Login command sent');
    }
  }, 500);

  // Send register fallback
  setTimeout(() => {
    if (bot && bot.entity) {
      bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
      console.log('📝 Register command sent');
    }
  }, 1500);

  // WAIT 12 FULL SECONDS before enabling any movement
  setTimeout(() => {
    if (bot && bot.entity && !isMoving) {
      console.log('🚶 Starting AFK movement cycle');
      isMoving = true;
      startMovementCycle();
    }
  }, 12000);
}

function onMessage(jsonMsg) {
  const text = jsonMsg.toString().toLowerCase();
  
  if (/password|login|register/.test(text) && !isMoving) {
    console.log(`🔔 Auth prompt: ${jsonMsg.toString()}`);
    if (bot && bot.entity) {
      bot.chat(`/login ${BOT_PASSWORD}`);
    }
  }
}

function startMovementCycle() {
  if (movementTimer) clearTimeout(movementTimer);
  if (isMoving) {
    movementCycle();
  }
}

function movementCycle() {
  if (!bot || !bot.entity || !isMoving) return;

  // Clear all controls
  bot.setControlState('forward', false);
  bot.setControlState('back', false);
  bot.setControlState('left', false);
  bot.setControlState('right', false);
  bot.setControlState('jump', false);

  switch (movementPhase) {
    case 0:
      bot.setControlState('forward', true);
      break;
    case 1:
      bot.setControlState('back', true);
      break;
    case 2:
      bot.setControlState('jump', true);
      setTimeout(() => {
        if (bot) bot.setControlState('jump', false);
      }, JUMP_DURATION);
      break;
    case 3:
      // Idle
      break;
  }

  movementPhase = (movementPhase + 1) % 4;
  movementTimer = setTimeout(movementCycle, STEP_INTERVAL);
}

function onError(err) {
  console.error('⚠️ Error:', err.message);
}

function onEnd() {
  console.log('⛔️ Bot Disconnected!');
  isMoving = false;
  movementPhase = 0;

  if (movementTimer) {
    clearTimeout(movementTimer);
    movementTimer = null;
  }

  console.log(`🔄 Reconnecting in ${reconnectDelay}ms...`);
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
    createBot();
  }, reconnectDelay);
}

createBot();
