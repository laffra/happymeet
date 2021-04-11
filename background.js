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
var plugins = [];

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
        if (message.type == "plugin") {
            plugins.push(message.src);
        }
    };
    socket.onopen = function() {
        log("Socket open");
        sendSocket({ type: "get-plugins" });
    };
    socket.onclose = function(event) {
        log("Socket closed", event);
    };
    socket.onerror = function(error) {
        log(`Socket error ${error.message}`);
    };
}

function sendMessage(tabId, message) {
    log(`  <== ${tabId} ${message.type}`);
    chrome.tabs.sendMessage(tabId, message);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!tabIds.has(sender.tab.id)) {
        tabIds.add(sender.tab.id);
        for (const src of plugins) {
            sendMessage(sender.tab.id, { type: "plugin", src });
        }
    }
    sendSocket(request);
});

function sendSocket(message) {
    openSocket();
    switch (socket.readyState) {
        case socket.OPEN:
            log(`====> ${message.type}`);
            socket.send(JSON.stringify(message));
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