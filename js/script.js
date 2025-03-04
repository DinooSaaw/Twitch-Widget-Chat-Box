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
    // generateFakeMessages(); // Start generating fake messages
  })
  .catch((err) => console.error("Error loading config.json:", err));

// Fetch global Twitch chat badges
const fetchGlobalBadges = async () => {
  const cachedBadges = localStorage.getItem("twitchBadges");

  if (cachedBadges) {
    globalBadges = JSON.parse(cachedBadges);
    console.log("[CACHE] Loaded global badges:", globalBadges);
    return;
  }

  try {
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
    console.log("[FETCH] Cached global badges:", globalBadges);
  } catch (error) {
    console.error("[ERROR] Fetching global badges:", error);
  }
};


// Fetch channel-specific badges
const fetchChannelBadges = async () => {
  const cachedChannelBadges = localStorage.getItem(`channelBadges_${config.twitch.channel}`);

  if (cachedChannelBadges) {
    channelBadges = JSON.parse(cachedChannelBadges);
    console.log("[CACHE] Loaded channel badges:", channelBadges);
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

    return; // If channel_id cannot be fetched, stop further processing
  }

  if (config.twitch.channel_id == "" && config.twitch.channel == "") return;
  try {
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
    console.log("[FETCH] Cached channel badges:", channelBadges);
  } catch (error) {
    console.error("[ERROR] Fetching channel badges:", error);
  }
};

// Merge global and channel badges (channel badges override global)
const getMergedBadges = () => {
  return { ...globalBadges, ...channelBadges };
};
// Display messages with badges
window.displayMessage = (tags, message) => {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) {
    console.error("[ERROR] Chat box not found!");
    return;
  }

  const messageContainer = document.createElement("div");
  messageContainer.classList.add("chat-message");

  // Get display name and color
  let displayName = tags["display-name"] || tags.username;
  let userColor = tags.color ? tags.color : "#000000";

  // Get merged badges (global + channel)
  let badges = tags.badges ? Object.keys(tags.badges) : [];

  // Create badge icons dynamically
  let badgeHTML = "";

  // Loop through the badges to display sub badges and bit badges
  badges.forEach((badge) => {
    const mergedBadges = getMergedBadges();

    // If it's a subscriber badge
    if (badge === "subscriber" && tags["badges"][badge]) {
      const subBadge = tags["badges"][badge];
      if (mergedBadges.subscriber[subBadge]) {
        badgeHTML += `<img src="${mergedBadges.subscriber[subBadge]}" class="badge-icon" id="sub_badge"> `;
      }
    }

    // If it's a bits badge
    if (badge === "bits" && tags["badges"][badge]) {
      const bitsBadge = tags["badges"][badge];
      if (mergedBadges[badge]) {
        badgeHTML += `<img src="${mergedBadges.bits[bitsBadge]}" class="badge-icon" id="bit_badge"> `;
      }
    }

    // Handle other badges
    else if (mergedBadges[badge] && badge !== "bits" && badge !== "subscriber") {
      badgeHTML += `<img src="${mergedBadges[badge]}" class="badge-icon" id="other_badge"> `;
    }
  });

  // Set message content
  messageContainer.innerHTML = ` 
    <div class="chat-user">
      ${badgeHTML} <strong style="color: ${userColor};">${displayName}</strong>
    </div>
    <div class="chat-text">${message}</div>
  `;

  // Append message to chat
  chatBox.appendChild(messageContainer);

  // Auto-scroll
  chatBox.scrollTop = chatBox.scrollHeight;

  // Remove old messages (optional)
  if (chatBox.children.length > 10) {
    chatBox.removeChild(chatBox.firstChild);
  }
};

// Generate fake messages for testing
const generateFakeMessages = () => {
  const fakeUsers = [
    { username: "User1", badges: ["subscriber"], color: "#FF5733" },
    { username: "User2", badges: ["vip"], color: "#33FF57" },
    { username: "User3", badges: ["moderator"], color: "#5733FF" },
    { username: "User4", badges: [], color: "#000000" },
  ];

  const fakeMessages = [
    "Hello, how's everyone doing?",
    "This is a test message!",
    "I love this stream!",
    "Just passing by, great stream!",
    "Can't wait for the next game!",
  ];

  setInterval(() => {
    const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
    const randomMessage = fakeMessages[Math.floor(Math.random() * fakeMessages.length)];

    const tags = {
      "display-name": randomUser.username,
      badges: randomUser.badges.reduce((acc, badge) => {
        acc[badge] = "7";
        return acc;
      }, {}),
      color: randomUser.color,
    };

    window.displayMessage(tags, randomMessage);
  }, 2000); // Send a fake message every 2 seconds
};
