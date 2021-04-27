"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jqueryui");
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
            this.addEmojis();
            this.addResizeToggle();
        }
        Bubble.allBubbles[userId] = this;
    }
    Bubble.prototype.watchBubbleVolume = function (video) {
        var volumeter = util_2.findNameElementFromVideo(video).prev().children().first();
        var clip = this.node.find(".clip");
        var position = clip.position();
        var lastRing = new Date().getTime();
        function addRing() {
            var now = new Date().getTime();
            if (now - lastRing < 300)
                return;
            lastRing = now;
            $("<div>")
                .addClass("ring")
                .prependTo(this.node)
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
            }, 1000, function () { $(this).remove(); });
        }
        new MutationObserver(addRing).observe(volumeter[0], { attributes: true });
    };
    Bubble.prototype.checkIfMyBubble = function (container) {
        Bubble.showMyBubble();
        var name = container.find("div[data-self-name]").first();
        if (!this.name.length || name.attr("data-self-name") != name.text())
            return false;
        return true;
    };
    Bubble.prototype.makeDraggable = function () {
        var _this = this;
        this.node.draggable({
            scroll: false,
            containment: ".happymeet .bubbles",
            start: function (event, ui) {
                _this.node.attr("dragging", "true");
            },
            drag: function (event, ui) {
                _this.changed("User dragged bubble");
            },
            stop: function (event, ui) {
                _this.node.attr("dragging", "false");
            },
        });
    };
    Bubble.prototype.addEmojis = function () {
    };
    Bubble.sanitizeId = function (userId) {
        return "bubble-" + userId.replace(/[^a-zA-Z0-9]/g, "_");
    };
    Bubble.findUsersThatLeft = function () {
        $(".bubble").each(function () {
            var node = $(this);
            var key = node.attr("key");
            if (!$("div[" + util_1.VIDEO_KEY + "=\"" + key + "\"]").position()) {
                // user left the call....
                node.remove();
                delete Bubble.allBubbles[node.attr("id")];
            }
        });
    };
    Bubble.createBubble = function (container, video) {
        var userId = this.sanitizeId(container.attr(util_1.VIDEO_KEY));
        var node = $("#" + userId);
        if (!node.position()) {
            node = new Bubble(container, video, userId).node;
        }
        node.find(".clip").append(video);
    };
    Bubble.prototype.addResizeToggle = function () {
        try {
            var bubble_1 = this;
            bubble_1.node.append($("<div>")
                .addClass("sizetoggle")
                .mousedown(function (event) {
                try {
                    if ($(this).hasClass("large")) {
                        $(this).removeClass("large");
                    }
                    else {
                        $(this).addClass("large");
                    }
                    bubble_1.changed("User resized bubble");
                    event.stopPropagation();
                }
                catch (error) {
                    util_1.log("Cannot handle mouse down on resize toggle", error, { bubble: this });
                }
            }));
        }
        catch (error) {
            util_1.log("Cannot add resize toggle", error, { bubble: this });
        }
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
            targets: ["meet"],
            userId: this.userId,
            left: position.left / $(".bubbles").width(),
            top: position.top / $(".bubbles").height(),
            large: this.node.hasClass("large"),
        });
    };
    Bubble.getBubble = function (userId) {
        return Bubble.allBubbles[userId];
    };
    Bubble.prototype.update = function (left, top, large) {
        if (this == Bubble.myBubble)
            return;
        this.node
            .filter(function (index, element) { return $(element).attr("dragging") != "true"; })
            .css({
            left: left * $(".bubbles").width(),
            top: top * $(".bubbles").height(),
        });
        if (large) {
            this.node.addClass("large");
        }
        else {
            this.node.removeClass("large");
        }
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
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "update-bubble":
            var bubble = Bubble.getBubble(message.userId);
            if (bubble) {
                bubble.update(message.left, message.top, message.large);
            }
            sendResponse("OK");
            break;
        case "start-meeting":
            Bubble.myBubble.changed("Received start-meeting event");
            sendResponse("OK");
            break;
    }
});
