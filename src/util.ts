export const VIDEO_KEY = "data-initial-participant-id";

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

export function showMessage(message) {
    $(".happymeet .message")
        .empty()
        .append(
            $(`<message>${message}</message>`),
        );
}

export function sendMessage(message) {
    message.meetingId = meetingId;
    chrome.runtime.sendMessage(message, function (response) {
        // OK
    });
}

export function findNameElementFromVideo(video) {
    try {
        // this function is fragile as it assumes certain DOM structure
        const nameBar = video.parent().parent().next();
        const nameElement = nameBar.children().first().children().last();
        return nameElement;
    } catch (error) {
        log("Cannot find name element from video", error, { video });
    }
}

export function getPreviewVideo() {
    return $("video").filter((index, element) => $(element).height() <= 50).first();
}

export function sanitizeId(userId) {
    return "bubble-" + userId.replace(/[^a-zA-Z0-9]/g, "_");
}
    