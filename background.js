const DEBUG = true;
const tabIds = new Set();
const domains = [
    "https://docs.google.com/spreadsheets/",
    "https://docs.google.com/presentation/",
    "https://docs.google.com/document/",
    "https://calendar.google.com/",
    "https://meet.google.com/",
];
var socket;

function openSocket() {
    if (socket && socket.readyState != socket.CLOSED && socket.readyState != socket.CLOSING) {
        return
    }
    socket = new WebSocket("wss://aheadinthecloudcomputing.com/happymeet");
    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        for (tabId of tabIds) {
            sendMessage(tabId, message);
        }
    };
}

function sendMessage(tabId, message) {
    log(`  <== ${tabId} ${message.type}`);
    chrome.tabs.sendMessage(tabId, message);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!tabIds.has(sender.tab.id)) {
        tabIds.add(sender.tab.id);
        sendMessage(sender.tab.id, { type: "debug", debug: DEBUG });
    }
    sendSocket(request);
});

function sendSocket(message) {
    openSocket();
    switch (socket.readyState) {
        case socket.OPEN:
            var event = JSON.stringify(message);
            socket.send(event);
            if (DEBUG) {
                if (message.slide) {
                    message.slide = `... ${message.slide.length} bytes ...`;
                    event = JSON.stringify(message);
                }
                log(`====> ${event}`);
            }
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
        for (const domain of domains) {
            if (tab.url.startsWith(domain)) {
                chrome.tabs.reload(tab.id);
            }
        }
    }
});

function log() {
    if (DEBUG) console.log.apply(console, arguments);
}

openSocket();