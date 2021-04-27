"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIDEO_KEY = "data-initial-participant-id";
var meetingId = document.location.pathname.slice(1);
var Job = /** @class */ (function () {
    function Job(name, callback) {
        this.name = name;
        this.callback = callback;
        this.timeout = setTimeout(function () { }, 1);
        this.interval = setInterval(function () { }, Number.MAX_VALUE);
    }
    Job.prototype.schedule = function (timeout) {
        if (timeout === void 0) { timeout = 1; }
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.callback, timeout);
    };
    Job.prototype.repeat = function (timeout) {
        if (timeout === void 0) { timeout = 1000; }
        clearInterval(this.interval);
        this.interval = setInterval(this.callback, timeout);
    };
    Job.prototype.cancel = function () {
        clearTimeout(this.timeout);
        clearInterval(this.interval);
    };
    return Job;
}());
exports.Job = Job;
;
function triggerMouseClick(node) {
    var element = node[0];
    if (!element)
        return;
    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent("click", true, true);
    element.dispatchEvent(clickEvent);
}
exports.triggerMouseClick = triggerMouseClick;
function log() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    console.log.apply(console, ["HappyMeet:"].concat(args));
}
exports.log = log;
function showMessage(message) {
    $(".happymeet .message")
        .empty()
        .append($("<message>" + message + "</message>"));
}
exports.showMessage = showMessage;
function sendMessage(message) {
    message.meetingId = meetingId;
    chrome.runtime.sendMessage(message, function (response) {
        // OK
    });
}
exports.sendMessage = sendMessage;
function findNameElementFromVideo(video) {
    try {
        // this function is fragile as it assumes certain DOM structure
        var nameBar = video.parent().parent().next();
        var nameElement = nameBar.children().first().children().last();
        return nameElement;
    }
    catch (error) {
        log("Cannot find name element from video", error, { video: video });
    }
}
exports.findNameElementFromVideo = findNameElementFromVideo;
function getPreviewVideo() {
    return $("video").filter(function (index, element) { return $(element).height() <= 50; }).first();
}
exports.getPreviewVideo = getPreviewVideo;
function sanitizeId(userId) {
    return "bubble-" + userId.replace(/[^a-zA-Z0-9]/g, "_");
}
exports.sanitizeId = sanitizeId;
