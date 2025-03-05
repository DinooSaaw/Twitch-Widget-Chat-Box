let config;
let globalBadges = {};
let channelBadges = {};

// Fetch configuration
fetch("config.json")
  .then((response) => response.json())
  .then((data) => {
    config = data;
    fetchGlobalBadges();
    fetchChannelBadges();
  })
  .catch((err) => console.error("Error loading config.json:", err));

// Fetch global Twitch chat badges
const fetchGlobalBadges = async () => {
  const cachedBadges = localStorage.getItem("twitchBadges");

  if (cachedBadges) {
    globalBadges = JSON.parse(cachedBadges);
    logMessage("CACHE", "Loaded global badges");
    return;
  }

  try {
    logMessage("FETCH", "Fetching global badges");
    const response = await fetch("https://api.twitch.tv/helix/chat/badges/global", {
      headers: {
        "Client-Id": config.twitch.client_ID,
        Authorization: `Bearer ${config.twitch.access_token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch global badges");

    const data = await response.json();
    data.data.forEach((badge) => {
      globalBadges[badge.set_id] = badge.versions[0].image_url_4x;
    });

    localStorage.setItem("twitchBadges", JSON.stringify(globalBadges));
    logMessage("FETCH", "Loaded global badges");
  } catch (error) {
    console.error("[ERROR] Fetching global badges:", error);
  }
};

// Fetch channel-specific badges
const fetchChannelBadges = async () => {
  const cachedChannelBadges = localStorage.getItem(`channelBadges_${config.twitch.channel}`);

  if (cachedChannelBadges) {
    channelBadges = JSON.parse(cachedChannelBadges);
    logMessage("CACHE", "Loaded channel badges");
    return;
  }

  if (!config.twitch.channel_id && config.twitch.channel !== "") {
    try {
      const response = await fetch(`https://api.twitch.tv/helix/users?login=${config.twitch.channel}`, {
        headers: {
          "Client-Id": config.twitch.client_ID,
          Authorization: `Bearer ${config.twitch.access_token}`,
        },
      });

      const data = await response.json();
      const userId = data.data?.[0]?.id;

      if (userId) {
        config.twitch.channel_id = userId;
        console.log("[FETCH] Channel ID fetched:", userId);
        return fetchChannelBadges(); // Retry fetching badges after setting the channel_id
      }
    } catch (error) {
      console.error("Error fetching channel ID:", error);
    }
    return; // Stop further processing if channel_id can't be fetched
  }

  if (config.twitch.channel_id == "" && config.twitch.channel == "") return;
  try {
    logMessage("FETCH", "Fetching global badges");
    const response = await fetch(
      `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${config.twitch.channel_id}`,
      {
        headers: {
          "Client-Id": config.twitch.client_ID,
          Authorization: `Bearer ${config.twitch.access_token}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch channel badges");

    const data = await response.json();
    data.data.forEach((badge) => {
      channelBadges[badge.set_id] = badge.versions.reduce((acc, version) => {
        acc[version.id] = version.image_url_4x;
        return acc;
      }, {});
    });

    localStorage.setItem(`channelBadges_${config.twitch.channel}`, JSON.stringify(channelBadges));
    logMessage("FETCH", "Loaded channel badges");
  } catch (error) {
    console.error("[ERROR] Fetching channel badges:", error);
  }
};

// Merge global and channel badges (channel badges override global)
const getMergedBadges = () => {
  return { ...globalBadges, ...channelBadges };
};

// **Replace emote text with images**
const replaceEmotes = (message, emotes) => {
  if (!emotes) return message; // No emotes in message

  let emoteMap = {};
  Object.keys(emotes).forEach((emoteId) => {
    emotes[emoteId].forEach((range) => {
      logMessage("EMOTE", `Emote ID: ${emoteId} | Range: ${range}`);
      const [start, end] = range.split("-").map(Number);
      const emoteText = message.substring(start, end + 1);
      emoteMap[emoteText] = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/4.0`;
    });
  });

  // Replace text emotes with images
  let words = message.split(" ");
  words = words.map((word) => (emoteMap[word] ? `<img src="${emoteMap[word]}" class="chat-emote">` : word));

  return words.join(" ");
};

// Display messages with badges and emotes
window.displayMessage = (tags, message) => {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) {
    console.error("[ERROR] Chat box not found!");
    return;
  }

  const messageContainer = document.createElement("div");
  messageContainer.classList.add("chat-message");

  let displayName = tags["display-name"] || tags.username;
  let userColor = tags.color ? tags.color : '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');

  let badges = tags.badges ? Object.keys(tags.badges) : [];
  let badgeHTML = "";

  badges.forEach((badge) => {
    const mergedBadges = getMergedBadges();

    if (badge === "subscriber" && tags["badges"][badge]) {
      const subBadge = tags["badges"][badge];
      if (mergedBadges.subscriber[subBadge]) {
        badgeHTML += `<img src="${mergedBadges.subscriber[subBadge]}" class="badge-icon"> `;
      }
    }

    if (badge === "bits" && tags["badges"][badge]) {
      const bitsBadge = tags["badges"][badge];
      if (mergedBadges[badge]) {
        badgeHTML += `<img src="${mergedBadges.bits[bitsBadge]}" class="badge-icon"> `;
      }
    } else if (mergedBadges[badge] && badge !== "bits" && badge !== "subscriber") {
      badgeHTML += `<img src="${mergedBadges[badge]}" class="badge-icon"> `;
    }
  });

  // **Process emotes in message**
  let emoteMessage = replaceEmotes(message, tags.emotes);

  messageContainer.innerHTML = `
    <div class="chat-user">
      ${badgeHTML} <strong style="color: ${userColor};">${displayName}</strong>
    </div>
    <div class="chat-text">${emoteMessage}</div>
  `;

  chatBox.appendChild(messageContainer);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (chatBox.children.length > 10) {
    chatBox.removeChild(chatBox.firstChild);
  }
};

// Error message if Twitch channel is not configured
setTimeout(() => {
  if (config.twitch.channel == "") {
    setInterval(() => {
      logMessage("error", "Please configure your Twitch channel in the config.json file.");
      const tags = {
        warning: true,
        "display-name": "Twitch",
        badges: { broadcaster: "1", staff: "1", partner: "1" },
        color: "#6441a5",
      };
      window.displayMessage(tags, "Please configure your Twitch channel in the config.json file.");
    }, 10000);
  }
}, 10000);
