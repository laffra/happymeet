import { Job } from "./util";

console.log("Loaded HappyMeet");

interface String {    
    startsWith(searchString: string, endPosition?: number): boolean;
};

const VERBOSE = true;
const tabIds = {};

var socket: WebSocket;

function openSocket(): WebSocket {
    if (socket && socket.readyState != socket.CLOSED && socket.readyState != socket.CLOSING) {
        return
    }
    socket = new WebSocket("wss://aheadinthecloudcomputing.com/happymeet");
    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        if (message.type != "pong") {
            broadCastToTabs(message);
        }
    };
}

function broadCastToTabs(message: any) {
    for (const tabId in tabIds) {
        sendToTab(parseInt(tabId), message);
    }
}

function sendToTab(tabId: number, message: any) {
    chrome.tabs.sendMessage(tabId, message);
    log(`<=  [tab:${tabId} type:${tabIds[tabId]}]`, message);
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (!tabIds[sender.tab.id]) {
        tabIds[sender.tab.id] = sender.tab.url;
        sendToTab(sender.tab.id, { type: "verbose", verbose: VERBOSE });
    }
    sendToServer(message);
    sendResponse("OK");
});

function sendToServer(message) {
    openSocket();
    switch (socket.readyState) {
        case socket.OPEN:
            var event = JSON.stringify(message);
            socket.send(event);
            if (message.type != "ping") {
                log(`  =>`, message)
            }
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
        const meetUrl = "https://meet.google.com/";
        for (const tab of tabs) {
            if (tab.url && tab.url.slice(0, meetUrl.length) == meetUrl) {
                chrome.tabs.reload(tab.id);
            }
        }
    });
} catch(error) {
    console.log(error);
    // igore error as this feature is only active during development
}

function log(tag: string, message) {
    if (!VERBOSE) return;
    if (message.type == "log") return;
    console.log(tag, JSON.stringify(message, undefined, 4));
}

new Job("Keep alive", () => {
    sendToServer({ type: "ping" })
}).repeat(10000);

openSocket();