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
    logMessage("Twitch", `Client Connected to "${config.twitch.channel}"!`);

    client.on("message", (channel, tags, message, self) => {
      if (message.startsWith(config.twitch.commandPrefix)) return logMessage("Twitch", "Ignoring command message");

      let displayName = tags["display-name"];
      let badges = tags.badges ? Object.keys(tags.badges) : [];

      console.log(`[${displayName}] ${message} | Badges:`, badges, `| Tags:`, tags);

      // Pass the badges and message to script.js for display
      displayMessage(tags, message);
    });
  }
};
