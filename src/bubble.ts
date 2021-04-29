import "jqueryui";
import { addEmojis, checkEmojis } from "./emojis";
import { makeResizable, resize } from "./resizer";
import { log, VIDEO_KEY, sanitizeId, triggerMouseClick } from './util';
import { findNameElementFromVideo, sendMessage } from './util';

export class Bubble {
    static myBubble: Bubble;
    static allBubbles: { [key:string]:Bubble; } = {};

    userId: string;
    node: JQuery;
    picture: JQuery;
    video: JQuery;
    name: string;
  
    constructor(container: JQuery, video: JQuery, userId: string) {
        this.userId = userId;
        this.video = video;
        this.picture  = container.find("img");
        this.name = findNameElementFromVideo(this.video).text();
        this.node = this.createNode(container, video);
        this.watchBubbleVolume(video);
        if (this.checkIfMyBubble(container)) {
            this.node.addClass("me");
            this.changed("Found my bubble");
            this.makeDraggable();
            makeResizable(this);
            addEmojis(this);
        }
        Bubble.allBubbles[userId] = this;
    }

    watchBubbleVolume(video: JQuery) {
        const bubble = this;
        const volumeter = findNameElementFromVideo(video).prev().children().first();
        const clip = bubble.node.find(".clip");
        const position = clip.position();
        var lastRingShown = new Date().getTime();
        var lastClass = "";
        function addRing() {
            const now = new Date().getTime();
            if (now - lastRingShown < 300) return;
            lastRingShown = now;
            const currentClass = volumeter.attr("class");
            if (currentClass == lastClass) return;
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
                }, 1500, function() { $(this).remove(); });
        }
        new MutationObserver(addRing).observe(volumeter[0], { attributes: true });
    }

    checkIfMyBubble(container: JQuery): boolean {
        Bubble.showMyBubble();
        const name = container.find("div[data-self-name]").first();
        if (!this.name.length || name.attr("data-self-name") != name.text()) return false;
        Bubble.myBubble = this;
        this.node.appendTo(".happymeet .bubbles");
        return true;
    }

    makeDraggable() {
        this.node.draggable({
            scroll: false,
            containment: ".happymeet .bubbles",
            drag: (event, ui) => {
                this.changed("User dragged bubble");
            },
        });
    }

    static findUsersThatLeft() {
        $(".bubble").each(function () {
            const node = $(this);
            const key = node.attr("key");
            if (!node.hasClass("me") && !$(`div[${VIDEO_KEY}="${key}"]`).position()) {
                // user left the call....
                node.remove();
                delete Bubble.allBubbles[node.attr("id")];
            }
        });
    }

    static createBubble(container: JQuery, video: JQuery) {
        const userId = sanitizeId(container.attr(VIDEO_KEY));
        var node = $("#" + userId);
        if (!node.position()) {
            node = new Bubble(container, video, userId).node;
        }
        node.find(".clip").append(video);
    }

    createNode(container: JQuery, video: JQuery): JQuery<HTMLElement> {
        return $("<div>")
            .attr("id", this.userId)
            .attr("key", container.attr(VIDEO_KEY))
            .addClass("bubble")
            .prependTo(".happymeet .bubbles")
            .css({
                    position: "absolute",
                    top: 200 + Math.random() * 200,
                    left: Math.random() * 200,
                })
                .append(
                    $("<div>")
                        .text(this.name)
                        .addClass("name"),
                    $("<div>")
                        .addClass("clip")
                        .append(this.picture)
                );
    }

    changed(reason: string): void {
        const position = this.node.position();
        sendMessage({
            type: "update-bubble",
            userId: this.userId, 
            reason,
            leftRatio: position.left / $(".bubbles").width(),
            topRatio: position.top / $(".bubbles").height(),
            sizeRatio: this.node.width() / $(".bubbles").width(),
        });
        checkEmojis(this);
    }

    static getBubble(userId: string): Bubble {
        return Bubble.allBubbles[userId];
    }

    update(leftRatio: number, topRatio: number, sizeRatio: number): void {
        if (this == Bubble.myBubble) return;
        this.node
            .css({
                left: leftRatio * $(".bubbles").width(),
                top: topRatio * $(".bubbles").height(),
            });
        resize(this, sizeRatio * $(".bubbles").width());
        checkEmojis(this);
    }

    static showMyBubble() {
        if ($(".bubble.me").position()) return;
        // force my video to show up as a tile, so HappyMeet can discover it
        triggerMouseClick($("div[aria-label|='Show in a tile']"));
    }
};

function updateBubble(message) {
    const bubble = Bubble.getBubble(message.userId);
    if (bubble) {
        bubble.update(message.leftRatio, message.topRatio, message.sizeRatio);
    } else {
        setTimeout(() => updateBubble(message), 1000);
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
