let config;
let globalBadges = {};

// Fetch configuration
fetch("config.json")
  .then((response) => response.json())
  .then((data) => {
    config = data;
    fetchGlobalBadges();
  })
  .catch((err) => console.error("Error loading config.json:", err));

// Fetch global Twitch chat badges
const fetchGlobalBadges = async () => {
  const cachedBadges = localStorage.getItem("twitchBadges");

  if (cachedBadges) {
    globalBadges = JSON.parse(cachedBadges);
    console.log("Loaded badges from cache:", globalBadges);
    return;
  }

  try {
    const response = await fetch("https://api.twitch.tv/helix/chat/badges/global", {
      headers: {
        "Client-Id": config.twitch.client_ID,
        Authorization: `Bearer ${config.twitch.access_token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch badges");

    const data = await response.json();
    data.data.forEach((badge) => {
      globalBadges[badge.set_id] = badge.versions[0].image_url_4x;
    });

    localStorage.setItem("twitchBadges", JSON.stringify(globalBadges));
    console.log("Fetched and cached Twitch badges:", globalBadges);
  } catch (error) {
    console.error("Error fetching Twitch badges:", error);
  }
};

// Display messages with badges
const displayMessage = (tags, message) => {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) {
    console.error("Chat box element not found!");
    return;
  }

  const messageContainer = document.createElement("div");
  messageContainer.classList.add("chat-message");

  // Get display name and color
  let displayName = tags["display-name"] || tags.username;
  let userColor = tags.color ? tags.color : "#000000";

  // Get user badges
  let badges = tags.badges ? Object.keys(tags.badges) : [];

  // Create badge icons dynamically
  let badgeHTML = "";
  badges.forEach((badge) => {
    if (globalBadges[badge]) {
      badgeHTML += `<img src="${globalBadges[badge]}" class="badge-icon"> `;
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
