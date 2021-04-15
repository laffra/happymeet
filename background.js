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

function openSocket() {
    if (socket && socket.readyState != socket.CLOSED && socket.readyState != socket.CLOSING) {
        return
    }
    socket = new WebSocket("wss://aheadinthecloudcomputing.com/happymeet");
    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        for (tabId in tabIds) {
            if (isTarget(tabId, message)) {
                sendMessage(parseInt(tabId), message);
            }
        }
    };
}

function isTarget(tabId, message) {
    if (!message.target) return true;
    const targetType = tabIds[tabId];
    for (target of message.target) {
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

function sendMessage(tabId, message) {
    chrome.tabs.sendMessage(tabId, message);
    log(`<=  ${tabId} `, message);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!tabIds[sender.tab.id]) {
        tabIds[sender.tab.id] = getTargetType(sender.tab.url);
        sendMessage(sender.tab.id, { type: "verbose", verbose: VERBOSE });
    }
    sendSocket(request);
    sendResponse("OK");
});

function sendSocket(message) {
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
            setTimeout(() => sendSocket(message), 1000);
            break;
    }
}

chrome.tabs.query({}, function(tabs) {
    for (const tab of tabs) {
        for (const domain in domains) {
            if (tab.url.startsWith(domain)) {
                chrome.tabs.reload(tab.id);
            }
        }
    }
});

function log(tag, message) {
    if (!VERBOSE) return;
    if (message.slide) {
        const tmp = JSON.parse(JSON.stringify(message));
        tmp.slide = `... ${message.slide.length} characters ...`;
        console.log(tag, JSON.stringify(tmp, undefined, 4));
    } else {
        console.log(tag, JSON.stringify(message, undefined, 4));
    }
}

openSocket();