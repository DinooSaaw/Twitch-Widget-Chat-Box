fetch("config.json")
  .then((response) => response.json())
  .then((data) => {
    config = data;
    initializeTwitchClient();
  })
  .catch((err) => console.error("Error loading config.json:", err));

const initializeTwitchClient = () => {
  if (config.twitch.channel !== "") {
    const client = new tmi.client({
      connection: {
        reconnect: true,
        secure: true,
      },
      channels: [config.twitch.channel],
    });

    client.connect();
    logMessage("Twitch", `Client Connected to "${config.twitch.channel}"!"`);

    client.on("message", async (channel, tags, message, self) => {
    console.log(`[DEBUG] (twitch.js:22:42) tags`, tags);
      if (message.startsWith(config.twitch.commandPrefix)) return;

      let displayName = tags["display-name"];
      let badges = tags.badges ? Object.keys(tags.badges) : [];

      console.log(`[${displayName}] ${message} | Badges:`, badges);

      displayMessage(tags, message);
    });
  }
};
