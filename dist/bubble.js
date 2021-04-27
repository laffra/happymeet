"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jqueryui");
var emojis_1 = require("./emojis");
var resizer_1 = require("./resizer");
var util_1 = require("./util");
var util_2 = require("./util");
var Bubble = /** @class */ (function () {
    function Bubble(container, video, userId) {
        this.userId = userId;
        this.video = video;
        this.picture = container.find("img");
        this.name = util_2.findNameElementFromVideo(this.video).text();
        this.node = this.createNode(container, video);
        this.watchBubbleVolume(video);
        if (this.checkIfMyBubble(container)) {
            this.node.addClass("me");
            this.changed("Found my bubble");
            this.makeDraggable();
            resizer_1.makeResizable(this);
            emojis_1.addEmojis(this);
        }
        Bubble.allBubbles[userId] = this;
    }
    Bubble.prototype.watchBubbleVolume = function (video) {
        var bubble = this;
        var volumeter = util_2.findNameElementFromVideo(video).prev().children().first();
        var clip = bubble.node.find(".clip");
        var position = clip.position();
        var lastRingShown = new Date().getTime();
        var lastClass = "";
        function addRing() {
            var now = new Date().getTime();
            if (now - lastRingShown < 300)
                return;
            lastRingShown = now;
            var currentClass = volumeter.attr("class");
            if (currentClass == lastClass)
                return;
            lastClass = currentClass;
            $("<div>")
                .addClass("ring")
                .prependTo(bubble.node)
                .css({
                borderWidth: 8,
                opacity: 0.5,
                top: position.top - 4,
                left: position.left - 4,
                width: clip.width(),
                height: clip.height(),
            })
                .animate({
                borderWidth: 1,
                top: position.top - 40,
                left: position.left - 40,
                width: clip.width() + 80,
                height: clip.height() + 80,
                opacity: 0,
            }, 1500, function () { $(this).remove(); });
        }
        new MutationObserver(addRing).observe(volumeter[0], { attributes: true });
    };
    Bubble.prototype.checkIfMyBubble = function (container) {
        Bubble.showMyBubble();
        var name = container.find("div[data-self-name]").first();
        if (!this.name.length || name.attr("data-self-name") != name.text())
            return false;
        Bubble.myBubble = this;
        this.node.appendTo(".happymeet .bubbles");
        return true;
    };
    Bubble.prototype.makeDraggable = function () {
        var _this = this;
        this.node.draggable({
            scroll: false,
            containment: ".happymeet .bubbles",
            drag: function (event, ui) {
                _this.changed("User dragged bubble");
            },
        });
    };
    Bubble.findUsersThatLeft = function () {
        $(".bubble").each(function () {
            var node = $(this);
            var key = node.attr("key");
            if (!node.hasClass("me") && !$("div[" + util_1.VIDEO_KEY + "=\"" + key + "\"]").position()) {
                // user left the call....
                node.remove();
                delete Bubble.allBubbles[node.attr("id")];
            }
        });
    };
    Bubble.createBubble = function (container, video) {
        var userId = util_1.sanitizeId(container.attr(util_1.VIDEO_KEY));
        var node = $("#" + userId);
        if (!node.position()) {
            node = new Bubble(container, video, userId).node;
        }
        node.find(".clip").append(video);
    };
    Bubble.prototype.createNode = function (container, video) {
        return $("<div>")
            .attr("id", this.userId)
            .attr("key", container.attr(util_1.VIDEO_KEY))
            .addClass("bubble")
            .prependTo(".happymeet .bubbles")
            .css({
            position: "absolute",
            top: 200 + Math.random() * 200,
            left: Math.random() * 200,
        })
            .append($("<div>")
            .text(this.name)
            .addClass("name"), $("<div>")
            .addClass("clip")
            .append(this.picture));
    };
    Bubble.prototype.changed = function (reason) {
        var position = this.node.position();
        util_2.sendMessage({
            type: "update-bubble",
            userId: this.userId,
            leftRatio: position.left / $(".bubbles").width(),
            topRatio: position.top / $(".bubbles").height(),
            sizeRatio: this.node.width() / $(".bubbles").width(),
        });
        emojis_1.checkEmojis(this);
    };
    Bubble.getBubble = function (userId) {
        return Bubble.allBubbles[userId];
    };
    Bubble.prototype.update = function (leftRatio, topRatio, sizeRatio) {
        if (this == Bubble.myBubble)
            return;
        this.node
            .css({
            left: leftRatio * $(".bubbles").width(),
            top: topRatio * $(".bubbles").height(),
        });
        resizer_1.resize(this, sizeRatio * $(".bubbles").width());
        emojis_1.checkEmojis(this);
    };
    Bubble.showMyBubble = function () {
        if ($(".bubble.me").position())
            return;
        // force my video to show up as a tile, so HappyMeet can discover it
        util_1.triggerMouseClick($("div[aria-label|='Show in a tile']"));
    };
    Bubble.allBubbles = {};
    return Bubble;
}());
exports.Bubble = Bubble;
;
function updateBubble(message) {
    var bubble = Bubble.getBubble(message.userId);
    if (bubble) {
        bubble.update(message.leftRatio, message.topRatio, message.sizeRatio);
    }
    else {
        setTimeout(function () { return updateBubble(message); }, 1000);
    }
}
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "update-bubble":
            updateBubble(message);
            sendResponse("OK");
            break;
        case "start-meeting":
            if (Bubble.myBubble) {
                Bubble.myBubble.changed("Received start-meeting event");
            }
            sendResponse("OK");
            break;
    }
});
