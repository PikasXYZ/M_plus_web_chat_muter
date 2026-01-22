console.log("M+ Web Chat Muter extension loaded (No UI Mode)");

// --- Configuration & State ---
let mutedChats = {};

// Load settings
chrome.storage.local.get(['mutedChats'], (result) => {
    if (result.mutedChats) {
        mutedChats = result.mutedChats;
        // Notify injected script after load
        dispatchUpdate();
    }
});

// Listen for storage changes (when user updates popup)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.mutedChats) {
        mutedChats = changes.mutedChats.newValue;
        dispatchUpdate();
    }
});

// Send state to inject.js
function dispatchUpdate() {
    // Convert keys-only matching if needed, but here we just pass the map
    // The map is now { "ChatName": true } instead of { "ChatId": ... }
    // We need to support both or verify how inject.js uses it.
    // Since popup saves { "Name": true }, inject.js needs to check against NAME now.
    window.dispatchEvent(new CustomEvent('MPlusExtension_StateUpdate', { detail: mutedChats }));
}

// --- Injection ---
// Inject the interceptor into the MAIN world
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function () {
    this.remove();
    dispatchUpdate();
};
(document.head || document.documentElement).appendChild(script);
