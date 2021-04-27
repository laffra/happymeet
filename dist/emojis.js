"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var EMOJIS = ["😜", "😂", "😍", "👏", "👍", "🙌", "🙈", "😄", "🎉", "💜"];
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "emoji":
            animateEmoji(message.userId, message.emoji);
            sendResponse("OK");
            break;
    }
});
function checkEmojis(bubble) {
    var node = bubble.node;
    if (!node.position())
        return;
    var left = node.position().left < $(".happymeet").width() / 2;
    node.find(".emojis")
        .css({
        left: left ? node.width() : -node.find(".emojis").width() + 30,
        top: -node.width() / 8,
    });
}
exports.checkEmojis = checkEmojis;
function addEmojis(bubble) {
    var emojiTray = $("<div>").addClass("emojis").appendTo(bubble.node);
    var _loop_1 = function (emoji) {
        $("<div>")
            .text(emoji)
            .on("mouseup", function () { return util_1.sendMessage({
            type: "emoji",
            userId: bubble.node.attr("id"),
            emoji: emoji,
        }); })
            .appendTo(emojiTray);
    };
    for (var _i = 0, EMOJIS_1 = EMOJIS; _i < EMOJIS_1.length; _i++) {
        var emoji = EMOJIS_1[_i];
        _loop_1(emoji);
    }
}
exports.addEmojis = addEmojis;
function animateEmoji(userId, emoji) {
    var bubble = $("#" + userId);
    var clip = bubble.find(".clip");
    if (!clip.offset())
        return;
    var middle = clip.offset().left + clip.width() / 2 - 20;
    var center = clip.offset().top + clip.height() / 2 - 30;
    for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        var left = middle + Math.cos(angle) * 800;
        var top_1 = center + Math.sin(angle) * 800;
        $("<div>")
            .addClass("emoji")
            .appendTo($(".happymeet"))
            .text(emoji)
            .css({
            fontSize: 60,
            left: middle,
            top: center,
            zIndex: 100,
        })
            .animate({
            fontSize: 22,
            left: left,
            top: top_1,
            opacity: 0.3,
        }, 3000, "linear", function () { $(this).remove(); });
    }
}
