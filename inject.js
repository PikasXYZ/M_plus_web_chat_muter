(function () {
    console.log("M+ Extension: Injector loaded");
    let mutedChats = {};

    // 1. Listen for updates from the content script
    window.addEventListener('MPlusExtension_StateUpdate', (e) => {
        mutedChats = e.detail || {};
        // console.log('M+ Extension Check:', mutedChats);
    });

    // Flag to track if a muted event is processing
    let pendingMuteExpiry = 0;
    const MUTE_WINDOW_MS = 2000; // Block sounds for 2 seconds after receiving data for a muted chat

    // Helper to check if data contains muted keywords (handling Unicode/URL encoding)
    function containsMutedKeyword(dataStr) {
        if (!dataStr || typeof dataStr !== 'string') return false;

        // 1. Direct match (Name)
        if (Object.keys(mutedChats).some(name => dataStr.includes(name))) return true;

        // 2. Try URL Decode
        try {
            const decoded = decodeURIComponent(dataStr);
            if (Object.keys(mutedChats).some(name => decoded.includes(name))) return true;
        } catch (e) { }

        // 3. Try Unicode Unescape (e.g. \uXXXX)
        try {
            if (dataStr.startsWith('{') || dataStr.startsWith('[')) {
                const jsonStr = JSON.stringify(JSON.parse(dataStr));
                if (Object.keys(mutedChats).some(name => jsonStr.includes(name))) return true;
            }
        } catch (e) { }

        return false;
    }


    // 0a. Intercept WebSocket (Real-time messages often come here)
    const OriginalWebSocket = window.WebSocket;
    if (OriginalWebSocket) {
        const originalAddEventListener = OriginalWebSocket.prototype.addEventListener;
        OriginalWebSocket.prototype.addEventListener = function (type, listener, options) {
            if (type === 'message') {
                const wrappedListener = function (event) {
                    try {
                        const data = event.data;
                        // Check if data contains muted name
                        // WebSocket data is often a stringified JSON or just a string
                        if (typeof data === 'string' && containsMutedKeyword(data)) {
                            console.log("M+ Extension: WS message detected for muted chat.");
                            pendingMuteExpiry = Date.now() + MUTE_WINDOW_MS;
                        }
                    } catch (e) { }
                    return listener.call(this, event);
                };
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            return originalAddEventListener.apply(this, arguments);
        };

        // Also intercept 'onmessage' property setter just in case
        const wsProto = OriginalWebSocket.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(wsProto, 'onmessage');
        if (descriptor && descriptor.set) {
            Object.defineProperty(wsProto, 'onmessage', {
                set: function (handler) {
                    const wrappedHandler = function (event) {
                        try {
                            if (event.data && typeof event.data === 'string' && containsMutedKeyword(event.data)) {
                                console.log("M+ Extension: WS onmessage detected for muted chat.");
                                pendingMuteExpiry = Date.now() + MUTE_WINDOW_MS;
                            }
                        } catch (e) { }
                        return handler.call(this, event);
                    };
                    descriptor.set.call(this, wrappedHandler);
                }
            });
        }
    }

    // 0b. Intercept AJAX (XHR) - Existing logic...
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            try {
                // Check if this is a message update API
                // Based on screenshots: /msg/pinchchatroom.do seems relevant
                if (this._url && (this._url.includes('/msg/') || this._url.includes('pinchchatroom'))) {
                    // const response = JSON.parse(this.responseText); // No longer need to parse here
                    // Inspect response for muted chat names
                    // We assume response structure contains chat info. 
                    // Since we don't know the exact JSON structure, we do a deep search for the name.
                    const responseStr = this.responseText;

                    if (responseStr && typeof responseStr === 'string' && containsMutedKeyword(responseStr)) {
                        console.log("M+ Extension: XHR detected update for muted chat. Blocking effects.");
                        pendingMuteExpiry = Date.now() + MUTE_WINDOW_MS;
                    }
                }
            } catch (e) {
                // JSON parse error or structure mismatch, ignore
            }
        });
        return originalSend.apply(this, arguments);
    };

    // Helper to check if we are in a "muted window"
    function isMutedContext() {
        return Date.now() < pendingMuteExpiry;
    }

    // 2. Intercept Audio (HTML5 <audio>)
    if (typeof HTMLAudioElement !== 'undefined') {
        const originalAudioPlay = HTMLAudioElement.prototype.play;
        HTMLAudioElement.prototype.play = function () {
            try {
                // Priority 1: Check the XHR/WS flag
                if (isMutedContext()) {
                    console.log("M+ Extension: Blocked Audio (XHR Context)");
                    return Promise.resolve();
                }

                // Priority 2: DOM Check (Fallback)
                // If XHR missed it, but the UI *is* updating or already updated
                const topChat = document.querySelector('.scroll_content li[class*="chatprev"]');
                if (topChat) {
                    const nameEl = topChat.querySelector('.name, .title, strong, h3, h4, .name01');
                    const chatName = nameEl ? nameEl.innerText.trim() : null;
                    if (chatName && mutedChats[chatName]) {
                        console.log("M+ Extension: Blocked Audio (Top Chat DOM is Muted)");
                        return Promise.resolve();
                    }
                }
            } catch (err) {
                // Silently fail to avoid console spam
            }

            // Call original play
            const result = originalAudioPlay.apply(this, arguments);

            // If the original play returns a promise (modern browsers),
            // and it gets rejected (e.g. strict autoplay policy), we can catch it here if we wanted to suppress browser errors
            // but usually we strictly want to suppress *our* blocking errors.
            return result;
        };
    }

    // 2b. Intercept Web Audio API (AudioContext)
    // Some apps use this for notification beeps
    if (typeof AudioBufferSourceNode !== 'undefined') {
        const originalStart = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function () {
            if (isMutedContext()) {
                console.log("M+ Extension: Blocked Web Audio API (AudioBufferSourceNode.start)");
                return; // Do nothing, sound blocked
            }
            return originalStart.apply(this, arguments);
        };
    }

    // 2c. Intercept legacy noteOn (just in case)
    if (typeof AudioBufferSourceNode !== 'undefined' && AudioBufferSourceNode.prototype.noteOn) {
        const originalNoteOn = AudioBufferSourceNode.prototype.noteOn;
        AudioBufferSourceNode.prototype.noteOn = function () {
            if (isMutedContext()) {
                console.log("M+ Extension: Blocked Web Audio API (noteOn)");
                return;
            }
            return originalNoteOn.apply(this, arguments);
        };
    }

    // 3. Intercept Notifications (Main Thread)
    if (typeof window.Notification !== 'undefined') {
        const OriginalNotification = window.Notification;
        window.Notification = function (title, options) {
            try {
                // mutedChats is { "Name": true }
                // We check if the notification TITLE contains any of the muted names
                const isMuted = Object.keys(mutedChats).some(mutedName => {
                    return title && title.includes(mutedName);
                });

                if (isMuted) {
                    console.log("M+ Extension: Blocked Notification (Main):", title);
                    return { close: () => { }, addEventListener: () => { } }; // Dummy object
                }
            } catch (err) { }

            return new OriginalNotification(title, options);
        };
        Object.assign(window.Notification, OriginalNotification);
        window.Notification.prototype = OriginalNotification.prototype;
        window.Notification.permission = OriginalNotification.permission;
        window.Notification.requestPermission = OriginalNotification.requestPermission;
    }

    // 4. Intercept ServiceWorker Notifications (if used)
    if (typeof ServiceWorkerRegistration !== 'undefined' && ServiceWorkerRegistration.prototype.showNotification) {
        const originalShowNotification = ServiceWorkerRegistration.prototype.showNotification;
        ServiceWorkerRegistration.prototype.showNotification = function (title, options) {
            try {
                const isMuted = Object.keys(mutedChats).some(mutedName => {
                    return title && title.includes(mutedName);
                });

                if (isMuted) {
                    console.log("M+ Extension: Blocked Notification (SW):", title);
                    return Promise.resolve();
                }
            } catch (err) { }
            return originalShowNotification.apply(this, arguments);
        };
    }
    // 6. Hardened Title Interception: Prototype Patching
    // We patch the underlying setters on the prototypes to catch ALL modification vectors.

    // A. Patch HTMLTitleElement.prototype.text
    try {
        const titleProto = HTMLTitleElement.prototype;
        const confirmTitleDesc = Object.getOwnPropertyDescriptor(titleProto, 'text');
        if (confirmTitleDesc && confirmTitleDesc.set) {
            const originalSet = confirmTitleDesc.set;
            Object.defineProperty(titleProto, 'text', {
                get: function () { return confirmTitleDesc.get.call(this); },
                set: function (val) {
                    if (isMutedContext() || (typeof val === 'string' && Object.keys(mutedChats).some(n => val.includes(n)))) {
                        console.log("M+ Extension: Blocked HTMLTitleElement.text update:", val);
                        return; // Block
                    }
                    originalSet.call(this, val);
                }
            });
        }
    } catch (e) { }

    // B. Patch Node.prototype.textContent (Filtered for TITLE tag)
    // This is aggressive but necessary for jQuery's .text()
    try {
        const nodeProto = Node.prototype;
        const textContentDesc = Object.getOwnPropertyDescriptor(nodeProto, 'textContent');
        if (textContentDesc && textContentDesc.set) {
            const originalSet = textContentDesc.set;
            Object.defineProperty(nodeProto, 'textContent', {
                get: function () { return textContentDesc.get.call(this); },
                set: function (val) {
                    // Only intercept if this is the <title> tag
                    if (this.nodeName === 'TITLE') {
                        if (isMutedContext() || (typeof val === 'string' && Object.keys(mutedChats).some(n => val.includes(n)))) {
                            console.log("M+ Extension: Blocked Node.textContent on <title>:", val);
                            return; // Block
                        }
                    }
                    originalSet.call(this, val);
                }
            });
        }
    } catch (e) { }

    // C. Keep the document.title proxy as a first line of defense
    const originalTitleDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
    if (originalTitleDesc && originalTitleDesc.set) {
        Object.defineProperty(document, 'title', {
            get: function () { return originalTitleDesc.get.call(this); },
            set: function (newTitle) {
                if (isMutedContext() || (newTitle && Object.keys(mutedChats).some(n => newTitle.includes(n)))) {
                    console.log("M+ Extension: Blocked document.title update:", newTitle);
                    return;
                }
                originalTitleDesc.set.call(this, newTitle);
            }
        });
    }
})();
