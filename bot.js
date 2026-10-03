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
  /invalid\s+password/i,
  /successful login/i
];

let authHandled = false;
let reconnectDelay = 3000;
const MAX_RECONNECT_DELAY = 60000;

let bot;
let keepAliveTimer = null;

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
  const isLoginPrompt = /login|log in|sign in|password|authenticate|account|successful login/.test(text);

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

function startKeepAlive() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  
  keepAliveTimer = setInterval(() => {
    if (bot && bot.entity) {
      try {
        // Rotate head slightly to keep connection alive
        // This doesn't send movement packets, just updates player rotation
        bot.look(Math.random() * 360, 0, false);
        console.log('👀 Keep-alive look sent');
      } catch (e) {
        console.log('⚠️ Keep-alive error:', e.message);
      }
    }
  }, 25000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function onSpawn() {
  reconnectDelay = 3000;
  authHandled = false;

  console.log(`✅ ${config.botUsername} spawned! Authenticating...`);

  setTimeout(() => {
    sendLogin();
  }, 500);

  setTimeout(() => {
    sendRegister();
  }, 1500);

  // Start keep-alive after auth window
  setTimeout(() => {
    startKeepAlive();
    console.log('🚶 Standing idle with keep-alive to prevent timeout');
  }, 3000);
}

function onMessage(jsonMsg) {
  const text = jsonMsg.toString();
  const promptMatch = AUTH_PROMPT_PATTERNS.some((pattern) => pattern.test(text));

  if (promptMatch) {
    console.log(`🔔 Auth prompt: ${text}`);
    handleAuthPrompt(text);
  }
}

function onError(err) {
  console.error('⚠️ Error:', err.message);
}

function onEnd() {
  console.log('⛔️ Bot Disconnected!');
  authHandled = false;
  stopKeepAlive();

  console.log(`🔄 Reconnecting in ${reconnectDelay}ms...`);
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
    createBot();
  }, reconnectDelay);
}

createBot();
