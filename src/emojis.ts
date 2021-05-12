import { sendMessage } from "./util";

const EMOJIS = ["😜", "😂", "😍", "👏", "👍", "🙌", "🙈", "😄", "🎉", "💜"];

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "emoji":
            animateEmoji(message.userId, message.emoji);
            sendResponse("OK");
            break;
    }
});

export function checkEmojis(bubble) {
    const node = bubble.node;
    if (!node.position()) return;
    const left = node.position().left < $(".happymeet").width() / 2;
    node.find(".emojis")
        .css({
            left: left ? node.width() : -node.find(".emojis").width() + 30,
            top: -node.width() / 8,
        })
}

export function addEmojis(bubble) {
    const emojiTray = $("<div>").addClass("emojis").appendTo(bubble.node);
    for (const emoji of EMOJIS) {
        $("<div>")
            .text(emoji)
            .on("mouseup", () => sendMessage({
                type: "emoji",
                userId: bubble.node.attr("id"),
                emoji,
            }))
            .appendTo(emojiTray);
    }
}

function animateEmoji(userId, emoji) {
    const bubble = $(`#${userId}`);
    const clip = bubble.find(".clip");
    if (!clip.offset()) return;
    const middle = clip.offset().left + clip.width() / 2 - 20;
    const center = clip.offset().top + clip.height() / 2 - 30;
    for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const left = middle + Math.cos(angle) * 800;
        const top = center + Math.sin(angle) * 800;
        $("<div>")
            .addClass("emoji")
            .appendTo($(".happymeet"))
            .text(emoji)
            .css({
                fontSize: 60,
                left: middle,
                top: center,
            })
            .animate({
                fontSize: 22,
                left,
                top,
                opacity: 0.3,
            }, 3000, "linear", function () { $(this).remove() });
    }
}