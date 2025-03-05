# Twitch Chat Box Widget

This Twitch chat box widget was created to display chat messages with dynamic user roles and custom styling for use in OBS.

## Description

A real-time chat box widget that displays Twitch chat messages and user roles (such as Sub, VIP, Mod, and Broadcaster) within OBS. The widget is fully customizable through a `config.json` file for personal preferences and uses a `tmi.js` client to fetch messages and display them.

## Features

- **Real-time Chat Display**: Displays Twitch chat messages in real-time.
- **Customizable Appearance**: Customize the chat box, including font size, background color, text color, and more through CSS.
- **Embedded in OBS**: Easy integration into OBS using a browser source.
- **Configurable**: The widget can be customized via the `config.json` file to adjust settings like the position, font size, and role icon paths.

## Add To OBS

To add the Twitch chat box widget to OBS, follow these steps:

1. Open OBS and add a new **Browser Source**.
2. In the **URL** field, point it to the location of the `index.html` file for the widget.
3. Adjust the size and position of the widget to fit within your stream layout.

## Customization

You can customize the chat widget by modifying the following files:

- **`config.json`**: Modify the configuration settings such as the Twitch channel name, roles, and other display preferences.
- **`style.css`**: Change the visual appearance of the chat box, including font size, colors, and layout.
