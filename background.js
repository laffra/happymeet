const tabIds = new Set();
const domains = [
    "https://docs.google.com/presentation/",
    "https://meet.google.com/",
    "https://calendar.google.com/",
];
var socket;

function openSocket() {
    if (socket && socket.readyState != socket.CLOSED && socket.readyState != socket.CLOSING) {
        return
    }
    socket = new WebSocket("wss://aheadinthecloudcomputing.com/happymeet");
    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        console.log(`  <== ${message.type}`);
        for (tabId of tabIds) {
            console.log(`  <== ${tabId} ${message.type}`);
            chrome.tabs.sendMessage(tabId, message);
        }
    };
    socket.onopen = function() {
        console.log("Socket open");
    };
    socket.onclose = function(event) {
        console.log("Socket closed", event);
    };
    socket.onerror = function(error) {
        console.log(`Socket error ${error.message}`);
    };
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    tabIds.add(sender.tab.id);
    sendSocket(request);
});

function sendSocket(message) {
    openSocket();
    switch (socket.readyState) {
        case socket.OPEN:
            console.log(`====> ${message.type}`);
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

openSocket();