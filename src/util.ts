export const VIDEO_KEY = "data-ssrc";

const meetingId = document.location.pathname.slice(1);
const nameCache: { [key:string]:string; } = {};

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

export function triggerMouseClick(node) {
    const element = node[0];
    if (!element) return;
    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent("click", true, true);
    element.dispatchEvent(clickEvent);
}

export function log(...args) {
    console.log("HappyMeet:", ...args);
}

export function debug(...args) {
    console.log("HappyMeet:", ...args);
}

export function showMessage(message) {
    $(".happymeet .message")
        .empty()
        .append(
            $(`<message>${message}</message>`),
        );
}

export function sendMessage(message) {
    message.meetingId = meetingId;
    log("sendMessage", message);
    chrome.runtime.sendMessage(message, function (response) {
        // OK
    });
}

export function findPin() {
    const pin = $(`div[data-tooltip="Pin to screen"]`);
    if (pin.position()) return pin;
    return $(`div[data-tooltip="Unpin"]`);
}

export function findName(container: JQuery, userId: string): string {
    let name = container.find("div[data-self-name]").first().text();
    if (name) {
        nameCache[userId] = name;
    } else {
        name = nameCache[userId];
    }
    return name || "";
}

export function getPreviewVideo() {
    return $("video").filter((index, element) => $(element).height() <= 50).first();
}
