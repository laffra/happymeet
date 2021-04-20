const VERBOSE = true;
const tabIds = {};
const domains = {
    "https://docs.google.com/spreadsheets/": "sheet",
    "https://docs.google.com/presentation/": "slides",
    "https://docs.google.com/document/": "doc",
    "https://calendar.google.com/": "calendar",
    "https://meet.google.com/": "meet",
};
var socket;
var cachedSlides = {};

function openSocket() {
    if (socket && socket.readyState != socket.CLOSED && socket.readyState != socket.CLOSING) {
        return
    }
    socket = new WebSocket("wss://aheadinthecloudcomputing.com/happymeet");
    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        broadCastToTabs(message);
        if (message.type == "slide") {
            cachedSlides[`${message.attachment}-${message.index}`] = message;
        }
    };
}

function broadCastToTabs(message) {
    for (const tabId in tabIds) {
        if (isTarget(tabId, message)) {
            sendToTab(parseInt(tabId), message);
        }
    }
}

function isTarget(tabId, message) {
    if (!message.targets) return true;
    const targetType = tabIds[tabId];
    for (target of message.targets) {
        if (target == targetType) {
            return true;
        }
    }
    return false;
}

function getTargetType(url) {
    for (const domain in domains) {
        if (url.startsWith(domain)) {
            return domains[domain];
        }
    }
    return "???";
}

function sendToTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message);
    log(`<=  [tab:${tabId} type:${tabIds[tabId]}]`, message);
    
}

function getSlideCacheKey(message) {
    return `${message.attachment}-${message.index}`;
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (!tabIds[sender.tab.id]) {
        tabIds[sender.tab.id] = getTargetType(sender.tab.url);
        sendToTab(sender.tab.id, { type: "verbose", verbose: VERBOSE });
    }
    switch (message.type) {
        case "get-slide":
            const key = getSlideCacheKey(message);
            const slide = cachedSlides[key];
            if (false && slide) {
                console.log("Slide cache hit", message);
                sendToTab(sender.tab.id, slide);
            } else {
                console.log("Slide cache miss", message);
                sendToServer(message);
                sendToTab(sender.tab.id, cachedSlides[key] = {
                    type: "slide",
                    targets: [ "meet" ],
                    attachment: message.attachment,
                    count: 0,
                    compressedSlide: LZString.compress(`
                        <message>
                            Slow network. Still loading slide ${message.index+1}...
                        </message>
                    `),
                    index: message.index,
                })
            }
            break;
        case "slide":
            broadCastToTabs(message);
            sendToServer(message);
            break;
        default:
            sendToServer(message);
            break
    }
    sendResponse("OK");
});

function sendToServer(message) {
    openSocket();
    switch (socket.readyState) {
        case socket.OPEN:
            var event = JSON.stringify(message);
            socket.send(event);
            log(`  =>`, message)
            break;
        case socket.CLOSED:
        case socket.CLOSING:
            openSocket();
        case socket.CONNECTING:
            setTimeout(() => sendToServer(message), 1000);
            break;
    }
}

try {
    chrome.tabs.query({}, function(tabs) {
        for (const tab of tabs) {
            for (const domain in domains) {
                if (tab.url.startsWith(domain)) {
                    chrome.tabs.reload(tab.id);
                }
            }
        }
    });
} catch(error) {
    // igore error as this feature is only active during development
}

function log(tag, message) {
    if (!VERBOSE) return;
    if (message.type == "log") return;
    if (message.compressedSlide) {
        const tmp = JSON.parse(JSON.stringify(message));
        tmp.compressedSlide = `... ${message.compressedSlide.length} characters ...`;
        console.log(tag, JSON.stringify(tmp, undefined, 4));
    } else {
        console.log(tag, JSON.stringify(message, undefined, 4));
    }
}

openSocket();