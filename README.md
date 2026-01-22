# M+ Web Chat Muter

A Chrome extension to mute notifications and sounds for specific chat rooms on the [M+ Messenger Web](https://web.mplusapp.com/) version.

## Features

- **Keyword-based Muting**: Specify a list of chat room names to mute.
- **Audio Blocking**: Intercepts and blocks Web Audio API (`AudioContext`) and HTML5 Audio elements for matched chat rooms.
- **Notification Blocking**: Prevents desktop notifications (`Notification` API) from appearing for muted chats.
- **Title Blinking Prevention**: Stops the browser tab title from flashing or changing when a new message arrives in a muted chat.
- **Stealth Mode**: Updates are intercepted at the script injection level, ensuring a quiet experience without breaking the app.

## Installation

### Manual Installation (Developer Mode)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the directory containing this repository.

## Usage

1. Click the M+ Muter extension icon in your browser toolbar.
2. Enter the exact names of the chat rooms you want to mute in the text area (one name per line).
3. Click **Save Settings**.
4. Refresh the M+ Web Chat page for changes to take effect.

## Development

### Project Structure

- `manifest.json`: Extension configuration.
- `content.js`: Main logic for DOM manipulation and script injection.
- `inject.js`: Injected script to override window objects (Audio, Notification) in the page context.
- `popup.html` / `popup.js`: The extension's settings interface.
- `icons/`: Extension icons.

### Helper Scripts

Required when preparing for the Chrome Web Store or generating assets:

- `package_extension.py`: A Python script to zip the extension for build/release.
- `generate_assets.py`: A Python script to generate placeholder assets (promos, screenshots).

## Disclaimer

This project is a third-party extension and is not affiliated with, associated with, authorized by, endorsed by, or in any way officially connected with M+ Messenger or keyMessage.
