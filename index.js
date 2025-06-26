const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const pino = require('pino');
const commands = require('./commands'); // Custom commands stored here

// Auth setup
const authFile = './sessions/egzile_auth.json';
const { state, saveState } = useSingleFileAuthState(authFile);

// Bot start function
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true, // Can disable if you only want pairing
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: ['EgzileBOT', 'Chrome', '121.0.0.1']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ Egzile BOT Connected.');
    } else if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('⛔ Session expired. Please delete auth file and re-pair.');
      } else {
        console.log('🔁 Reconnecting...');
        startBot();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!messages[0].message) return;
    const msg = messages[0];
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const body = msg.message.conversation || msg.message?.extendedTextMessage?.text || '';

    if (!body) return;

    const prefix = '.';
    if (body.startsWith(prefix)) {
      const args = body.slice(1).trim().split(' ');
      const command = args.shift().toLowerCase();

      if (commands[command]) {
        await commands[command](sock, msg, args);
      }
    }
  });
}

startBot();
