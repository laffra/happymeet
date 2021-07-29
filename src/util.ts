export const VIDEO_KEY = "data-ssrc";

const meetingId = document.location.pathname.slice(1);

export class Job {
    name: string;
    callback: () => void;
    timeout: number;
    interval: number;

    constructor(name: string, callback: () => void) {
        this.name = name;
        this.callback = callback;
        this.timeout = setTimeout(() => {}, 1);
        this.interval = setInterval(() => {}, Number.MAX_VALUE);
    }

    schedule(timeout: number = 1) {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.callback, timeout);
    }

    repeat(timeout: number = 1000) {
        clearInterval(this.interval);
        this.interval = setInterval(this.callback, timeout);
    }

    cancel() {
        clearTimeout(this.timeout);
        clearInterval(this.interval);
    }
};

export function getUserId() {
    const fullscreen = $(`i:contains("close_fullscreen")`);
    const container = fullscreen.closest("div[jsmodel]");
    const videoParent = container.find("div[data-ssrc]");
    return videoParent.attr("data-ssrc");
}

export function log(...args) {
    console.log("HappyMeet:", ...args);
}

export function debug(...args) {
    // console.log("HappyMeet:", ...args);
}

export function findAdjacent(node, target) {
    var result = $("");
    var div = node.parent();
    while (div.position() && !result.position()) {
        result = div.find(target);
        div = div.parent();
    }
    return result;
}

export function sendMessage(message) {
    message.meetingId = meetingId;
    log("sendMessage", message);
    chrome.runtime.sendMessage(message, function (response) {
        // OK
    });
}