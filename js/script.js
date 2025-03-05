let config;
let globalBadges = {};
let channelBadges = {};
let sevenTVGlobalEmotes = {};
let sevenTVChannelEmotes = {};

// Fetch configuration
fetch("config.json")
  .then((response) => response.json())
  .then(async (data) => {
    config = data;
    fetchGlobalBadges();
    await fetchChannelBadges();
    fetchSevenTVGlobalEmotes();
    await fetchSevenTVChannelEmotes();
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
    const response = await fetch(
      "https://api.twitch.tv/helix/chat/badges/global",
      {
        headers: {
          "Client-Id": config.twitch.client_ID,
          Authorization: `Bearer ${config.twitch.access_token}`,
        },
      }
    );

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
  const cachedChannelBadges = localStorage.getItem(
    `channelBadges_${config.twitch.channel}`
  );

  if (cachedChannelBadges) {
    channelBadges = JSON.parse(cachedChannelBadges);
    logMessage("CACHE", "Loaded channel badges");
    return;
  }

  if (!config.twitch.channel_id && config.twitch.channel !== "") {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/users?login=${config.twitch.channel}`,
        {
          headers: {
            "Client-Id": config.twitch.client_ID,
            Authorization: `Bearer ${config.twitch.access_token}`,
          },
        }
      );

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
    logMessage("FETCH", "Fetching channel badges");
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

    localStorage.setItem(
      `channelBadges_${config.twitch.channel}`,
      JSON.stringify(channelBadges)
    );
    logMessage("FETCH", "Loaded channel badges");
  } catch (error) {
    console.error("[ERROR] Fetching channel badges:", error);
  }
};

// Merge global and channel badges (channel badges override global)
const getMergedBadges = () => {
  return { ...globalBadges, ...channelBadges };
};

// Fetch 7TV global emotes
const fetchSevenTVGlobalEmotes = async () => {
  const cachedGlobalEmotes = localStorage.getItem("sevenTVGlobalEmotes");

  if (cachedGlobalEmotes) {
    sevenTVGlobalEmotes = JSON.parse(cachedGlobalEmotes);
    logMessage("CACHE", "Loaded 7TV global emotes");
    return;
  }

  if (!config["7tv"]?.enabled) return;

  try {
    logMessage("FETCH", "Fetching 7TV global emotes");
    const response = await fetch("https://7tv.io/v3/emote-sets/global");

    if (!response.ok) throw new Error("Failed to fetch 7TV global emotes");

    const data = await response.json();
    data.emotes.forEach((emote) => {
      sevenTVGlobalEmotes[emote.name] = `https://cdn.7tv.app/emote/${emote.id}/3x.webp`;
    });

    localStorage.setItem("sevenTVGlobalEmotes", JSON.stringify(sevenTVGlobalEmotes));
    logMessage(
      "FETCH",
      `Loaded ${Object.keys(sevenTVGlobalEmotes).length} 7TV global emotes`
    );
  } catch (error) {
    console.error("[ERROR] Fetching 7TV global emotes:", error);
  }
};

// Fetch 7TV channel emotes
const fetchSevenTVChannelEmotes = async () => {
  const cachedChannelEmotes = localStorage.getItem(`sevenTVChannelEmotes_${config.twitch.channel}`);

  if (cachedChannelEmotes) {
    sevenTVChannelEmotes = JSON.parse(cachedChannelEmotes);
    logMessage("CACHE", `Loaded 7TV emotes for ${config.twitch.channel}`);
    return;
  }

  if (!config["7tv"]?.enabled || !config.twitch.channel) return;

  if (!config.twitch.channel_id && config.twitch.channel !== "") {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/users?login=${config.twitch.channel}`,
        {
          headers: {
            "Client-Id": config.twitch.client_ID,
            Authorization: `Bearer ${config.twitch.access_token}`,
          },
        }
      );

      const data = await response.json();
      const userId = data.data?.[0]?.id;

      if (userId) {
        config.twitch.channel_id = userId;
        console.log("[FETCH] Channel ID fetched:", userId);
        return fetchSevenTVChannelEmotes(); // Retry fetching 7TV emotes after setting channel_id
      }
    } catch (error) {
      console.error("Error fetching channel ID:", error);
    }
    return; // Stop further processing if channel_id can't be fetched
  }

  try {
    logMessage("FETCH", `Fetching 7TV emotes for ${config.twitch.channel}`);

    const response = await fetch(
      `https://7tv.io/v3/users/twitch/${config.twitch.channel_id}`
    );

    if (!response.ok) throw new Error("Failed to fetch 7TV channel emotes");

    const data = await response.json();
    if (data.emote_set && data.emote_set.emotes) {
      data.emote_set.emotes.forEach((emote) => {
        sevenTVChannelEmotes[emote.name] = `https://cdn.7tv.app/emote/${emote.id}/3x.webp`;
      });
    }

    localStorage.setItem(
      `sevenTVChannelEmotes_${config.twitch.channel}`,
      JSON.stringify(sevenTVChannelEmotes)
    );
    logMessage(
      "FETCH",
      `Loaded ${Object.keys(sevenTVChannelEmotes).length} 7TV emotes for ${config.twitch.channel}`
    );
  } catch (error) {
    console.error("[ERROR] Fetching 7TV channel emotes:", error);
  }
};

// **Replace emote text with images**
const replaceEmotes = (message, emotes) => {
  let emoteMap = {};

  // Check for 7TV global emotes
  Object.keys(sevenTVGlobalEmotes).forEach((emoteName) => {
    if (message.includes(emoteName)) {
      emoteMap[emoteName] = sevenTVGlobalEmotes[emoteName];
    }
  });

  // Check for 7TV channel-specific emotes
  Object.keys(sevenTVChannelEmotes).forEach((emoteName) => {
    if (message.includes(emoteName)) {
      emoteMap[emoteName] = sevenTVChannelEmotes[emoteName];
    }
  });

  // Check for Twitch emotes
  if (emotes) {
    Object.keys(emotes).forEach((emoteId) => {
      emotes[emoteId].forEach((range) => {
        const [start, end] = range.split("-").map(Number);
        const emoteText = message.substring(start, end + 1);
        emoteMap[emoteText] = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/4.0` ||
                              sevenTVGlobalEmotes[emoteText] ||
                              sevenTVChannelEmotes[emoteText];
      });
    });
  }

  // Replace emote text with images
  let words = message.split(" ");
  words = words.map((word) =>
    emoteMap[word] ? `<img src="${emoteMap[word]}" class="chat-emote">` : word
  );

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
  let userColor = tags.color
    ? tags.color
    : "#" + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0");

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
    } else if (
      mergedBadges[badge] &&
      badge !== "bits" &&
      badge !== "subscriber"
    ) {
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

  if(tags.warning) {
    messageContainer.style.backgroundColor = "rgba(255,69,69, 0.6)";
  }
  if(tags["first-message"]) {
    messageContainer.style.backgroundColor = "rgba(100,65,165, 0.6)";
  }
  if(tags["returning-message"]) {
    messageContainer.style.backgroundColor = "rgba(144,213,255, 0.6)";
  }

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
      logMessage(
        "error",
        "Please configure your Twitch channel in the config.json file."
      );
      const tags = {
        warning: true,
        "display-name": "Twitch",
        badges: { broadcaster: "1", staff: "1", partner: "1" },
        color: "#6441a5",
      };
      window.displayMessage(
        tags,
        "Please configure your Twitch channel in the config.json file."
      );
    }, 10000);
  }
}, 10000);
