const commands = {
  menu: (m, sock) => {
    sock.sendMessage(m.key.remoteJid, {
      text: `🤖 *EGZILE BOT v2.0*\n\nAvailable Commands:\n.say <msg>\n.menu\n.warn @user\n.kick @user\n.save\n.sticker`,
    });
  },

  say: (m, sock, args) => {
    const text = args.join(" ");
    sock.sendMessage(m.key.remoteJid, { text });
  },

  sticker: async (m, sock) => {
    if (!m.message.imageMessage) {
      return sock.sendMessage(m.key.remoteJid, { text: "Please send an image with .sticker" });
    }
    const stream = await downloadMediaMessage(m, "buffer");
    sock.sendMessage(m.key.remoteJid, { sticker: stream });
  },

  // Add more commands here...

};

module.exports = commands;
