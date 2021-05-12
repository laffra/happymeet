"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
console.log("Loaded HappyMeet");
;
var VERBOSE = true;
var tabIds = {};
var socket;
function openSocket() {
    if (socket && socket.readyState != socket.CLOSED && socket.readyState != socket.CLOSING) {
        return;
    }
    socket = new WebSocket("wss://aheadinthecloudcomputing.com/happymeet");
    socket.onmessage = function (event) {
        var message = JSON.parse(event.data);
        if (message.type != "pong") {
            broadCastToTabs(message);
        }
    };
}
function broadCastToTabs(message) {
    for (var tabId in tabIds) {
        sendToTab(parseInt(tabId), message);
    }
}
function sendToTab(tabId, message) {
    chrome.tabs.sendMessage(tabId, message);
    log("<=  [tab:" + tabId + " type:" + tabIds[tabId] + "]", message);
}
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
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
                log("  =>", message);
            }
            break;
        case socket.CLOSED:
        case socket.CLOSING:
            openSocket();
        case socket.CONNECTING:
            setTimeout(function () { return sendToServer(message); }, 1000);
            break;
    }
}
try {
    chrome.tabs.query({}, function (tabs) {
        var meetUrl = "https://meet.google.com/";
        for (var _i = 0, tabs_1 = tabs; _i < tabs_1.length; _i++) {
            var tab = tabs_1[_i];
            if (tab.url && tab.url.slice(0, meetUrl.length) == meetUrl) {
                chrome.tabs.reload(tab.id);
            }
        }
    });
}
catch (error) {
    console.log(error);
    // igore error as this feature is only active during development
}
function log(tag, message) {
    if (!VERBOSE)
        return;
    if (message.type == "log")
        return;
    console.log(tag, JSON.stringify(message, undefined, 4));
}
new util_1.Job("Keep alive", function () {
    sendToServer({ type: "ping" });
}).repeat(10000);
openSocket();
