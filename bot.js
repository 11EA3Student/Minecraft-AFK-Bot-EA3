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
const AUTH_PROMPT_PATTERNS = [
  /please\s+(log\s+in|register|sign\s+in)/i,
  /type\s+\/login\b/i,
  /type\s+\/register\b/i,
  /\/login\b/i,
  /\/register\b/i,
  /password\b/i,
  /authenticate/i,
  /account\b/i,
  /new\s+account/i,
  /login\s+required/i,
  /register\s+required/i,
  /wrong\s+password/i,
  /invalid\s+password/i
];

let authHandled = false;
let reconnectDelay = 3000;
const MAX_RECONNECT_DELAY = 60000;

let bot;

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

let movementPhase = 0;
const STEP_INTERVAL = 2000;
const STEP_SPEED    = 1;
const JUMP_DURATION = 500;
let movementTimer = null;

function sendLogin() {
  if (bot && bot.entity) {
    bot.chat(`/login ${BOT_PASSWORD}`);
    console.log('🔐 Login command sent');
  }
}

function sendRegister() {
  if (bot && bot.entity) {
    bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
    console.log('📝 Register command sent');
  }
}

function handleAuthPrompt(rawText) {
  const text = String(rawText || '').toLowerCase();
  if (!text || authHandled) return;

  const isRegisterPrompt = /register|new account|create account|sign up/.test(text);
  const isLoginPrompt = /login|log in|sign in|password|authenticate|account/.test(text);

  if (!isRegisterPrompt && !isLoginPrompt) return;

  authHandled = true;

  setTimeout(() => {
    if (isRegisterPrompt) {
      sendRegister();
    } else {
      sendLogin();
    }
  }, 400);
}

function onSpawn() {
  // Reset reconnect delay on successful spawn
  reconnectDelay = 3000;
  
  console.log(`✅ ${config.botUsername} spawned!`);
  
  // ====== AUTOMATED AUTH ======
  setTimeout(() => {
    sendLogin();
  }, 500);

  setTimeout(() => {
    sendRegister();
  }, 1500);
  // ==========================

  // Wait much longer before starting movement (give server time to register player fully)
  setTimeout(() => {
    console.log('🚶 Starting AFK movement cycle');
    movementPhase = 0;
    startMovementCycle();
  }, 5000);
}

function onMessage(jsonMsg) {
  const text = jsonMsg.toString();
  const promptMatch = AUTH_PROMPT_PATTERNS.some((pattern) => pattern.test(text));

  if (promptMatch) {
    console.log(`🔔 Auth prompt detected: ${text}`);
    handleAuthPrompt(text);
  }
}

function startMovementCycle() {
  if (movementTimer) clearTimeout(movementTimer);
  movementCycle();
}

function movementCycle() {
  if (!bot || !bot.entity) {
    console.log('⚠️ Bot not ready, stopping movement');
    return;
  }

  // Release all controls first
  bot.setControlState('forward', false);
  bot.setControlState('back', false);
  bot.setControlState('left', false);
  bot.setControlState('right', false);
  bot.setControlState('jump', false);

  switch (movementPhase) {
    case 0:
      bot.setControlState('forward', true);
      console.log('→ Moving forward');
      break;
    case 1:
      bot.setControlState('back', true);
      console.log('← Moving backward');
      break;
    case 2:
      bot.setControlState('jump', true);
      console.log('↑ Jumping');
      setTimeout(() => {
        if (bot) bot.setControlState('jump', false);
      }, JUMP_DURATION);
      break;
    case 3:
      // Idle/stand still
      console.log('⏸ Standing still');
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
  authHandled = false;
  movementPhase = 0;
  
  if (movementTimer) clearTimeout(movementTimer);
  
  console.log(`🔄 Reconnecting in ${reconnectDelay}ms...`);
  setTimeout(() => {
    // Increase delay for next reconnect attempt (exponential backoff)
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
    createBot();
  }, reconnectDelay);
}

// Start the bot
createBot();
