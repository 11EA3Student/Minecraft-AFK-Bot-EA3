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

const bot = mineflayer.createBot({
  host: config.serverHost,
  port: config.serverPort,
  username: config.botUsername,
  auth: 'offline',
  version: false,
  viewDistance: config.botChunk
});

let movementPhase = 0;
const STEP_INTERVAL = 1500;
const STEP_SPEED    = 1;
const JUMP_DURATION = 500;

function sendLogin() {
  bot.chat(`/login ${BOT_PASSWORD}`);
  console.log('🔐 Login command sent');
}

function sendRegister() {
  bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
  console.log('📝 Register command sent');
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

bot.on('spawn', () => {
  // ====== AUTOMATED AUTH ======
  setTimeout(() => {
    sendLogin();
  }, 1000);

  setTimeout(() => {
    sendRegister();
  }, 3000);
  // ==========================

  setTimeout(() => {
    bot.setControlState('sneak', true);
    console.log(`✅ ${config.botUsername} is Ready!`);
  }, 5000);

  setTimeout(movementCycle, STEP_INTERVAL);
});

bot.on('message', (jsonMsg) => {
  const text = jsonMsg.toString();
  const promptMatch = AUTH_PROMPT_PATTERNS.some((pattern) => pattern.test(text));

  if (promptMatch) {
    console.log(`🔔 Auth prompt detected: ${text}`);
    handleAuthPrompt(text);
  }
});

function movementCycle() {
  if (!bot.entity) return;

  switch (movementPhase) {
    case 0:
      bot.setControlState('forward', true);
      bot.setControlState('back', false);
      bot.setControlState('jump', false);
      break;
    case 1:
      bot.setControlState('forward', false);
      bot.setControlState('back', true);
      bot.setControlState('jump', false);
      break;
    case 2:
      bot.setControlState('forward', false);
      bot.setControlState('back', false);
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.setControlState('jump', false);
      }, JUMP_DURATION);
      break;
    case 3:
      bot.setControlState('forward', false);
      bot.setControlState('back', false);
      bot.setControlState('jump', false);
      break;
  }

  movementPhase = (movementPhase + 1) % 4;

  setTimeout(movementCycle, STEP_INTERVAL);
}

bot.on('error', (err) => {
  console.error('⚠️ Error:', err);
});

bot.on('end', () => {
  console.log('⛔️ Bot Disconnected!');
  authHandled = false;
});
