const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');
const config = require('./config.json');
const commands = require('./commands');

const { state, saveState } = useSingleFileAuthState('./sessions/egzile_auth.json');

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const usePairing = config.loginMethod === 'pairing';

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state,
    browser: ['EgzileBOT', 'Chrome', '1.0.0'],
    ...(usePairing
      ? { getMessage: async () => '' }
      : { printQRInTerminal: true })
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔁 Reconnecting...');
        startBot();
      } else {
        console.log('❌ Logged out.');
      }
    } else if (connection === 'open') {
      console.log(`✅ ${config.botName} is now connected`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const text = m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      '';

    const from = m.key.remoteJid;

    if (text.startsWith('.')) {
      await commands.run(sock, m, text, from);
    }
  });
}

startBot();
