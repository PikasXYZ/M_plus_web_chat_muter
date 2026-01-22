document.addEventListener('DOMContentLoaded', () => {
    const muteListEl = document.getElementById('muteList');
    const saveBtn = document.getElementById('saveBtn');
    const statusEl = document.getElementById('status');

    // Load saved settings
    chrome.storage.local.get(['muteListText'], (result) => {
        if (result.muteListText) {
            muteListEl.value = result.muteListText;
        }
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const text = muteListEl.value;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Convert array to object for faster lookup { "name": true }
        const mutedChats = {};
        lines.forEach(name => {
            mutedChats[name] = true;
        });

        chrome.storage.local.set({
            muteListText: text,
            mutedChats: mutedChats // Save the processed map for content script to use
        }, () => {
            statusEl.textContent = '設定已儲存！';
            setTimeout(() => {
                statusEl.textContent = '';
            }, 2000);
        });
    });
});
