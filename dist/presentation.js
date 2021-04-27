"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var Presentation = /** @class */ (function () {
    function Presentation(video, userId) {
        this.userId = userId;
        this.video = video;
        $(".happymeet .presentation")
            .empty()
            .append(video);
        util_1.sendMessage({
            type: "presentation-start",
            userId: userId
        });
    }
    return Presentation;
}());
exports.Presentation = Presentation;
;
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "presentation-start":
            if (!$(".happymeet .presentation video").position()) {
                $(".happymeet .presentation")
                    .empty()
                    .append($("<div>")
                    .addClass("message")
                    .text("You are presenting now."));
            }
            sendResponse("OK");
            break;
    }
});
