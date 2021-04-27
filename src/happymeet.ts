import { Job, VIDEO_KEY, sanitizeId, log } from './util';
import { triggerMouseClick, findNameElementFromVideo, sendMessage } from './util';
import { Bubble } from './bubble';
import { bottomMenu, findMenus } from './menus';
import { Presentation } from './presentation';

type Message = any;

class HappyMeet {
    static enabled = false;
    inMeeting = false;
    domChecker = new Job("DOM Checker", this.check.bind(this));

    constructor() {
        log("Loading.");
        const happymeet = this;
        $("body").on("DOMSubtreeModified", function() {
            happymeet.domChecker.schedule();
        });
        chrome.runtime.onMessage.addListener((message: Message, sender: chrome.runtime.MessageSender, sendResponse: (Message) => void) => {
            switch (message.type) {
                case "start-meeting":
                    if (Bubble.myBubble) {
                        Bubble.myBubble.changed("Received start-meeting event");
                    }
                    sendResponse("OK");
                    break;
            }
        });
        $(window).on("resize", this.centerButton);
    }

    check() {
        this.checkMeetingStatus();
        if (!HappyMeet.enabled || !this.inMeeting) return;
        Bubble.findUsersThatLeft();
        this.findNewVideos();
    }

    checkMeetingStatus() {
        $("div[role='button'] i:contains('present_to_all')").each(this.checkPresentButton.bind(this));
    }

    findNewVideos() {
        if (!this.inMeeting) return;
        $(`div[${VIDEO_KEY}]`).each(function () {
            const container = $(this);
            const video = container.find("video");
            if (video.length == 0) return;
            const name = findNameElementFromVideo(video).text();
            if (name == "" || name.startsWith("Presentation (")) {
                const userId = sanitizeId(container.attr(VIDEO_KEY));
                new Presentation(video, userId);
            } else {
                Bubble.createBubble(container, video);
            }
            HappyMeet.hideMeetUI();
        });
    }

    static getMeetUI() {
        return $(`div[${VIDEO_KEY}]`).parent().parent();
    }

    static hideMeetUI() {
        HappyMeet.getMeetUI().css("opacity", "0");
    }

    addHappyMeet() {
        if ($(".happymeet").position() || !bottomMenu) return;
        $("<div>")
            .addClass("happymeet")
            .append($("<div>")
                .addClass("presentation")
                .append($("<div class='message'>Waiting for someone to present...</div>"))
            )
            .append($("<div>")
                .addClass("bubbles")
            )
            .prependTo(bottomMenu.parent());
    }

    showCaptionDivs() {
        $("div")
            .filter((index, element) => {
                const div = $(element);
                return (div.height() > 100 && parseInt(div.css("bottom")) > 50);
            })
            .css({
                bottom: 8,
                zIndex: 100,
            })
    }

    checkPresentButton(index: number, element: Element) {
        const node = $(element);
        const presentNowButton = node.closest("div[role='button']");
        const joinButton = presentNowButton.parent().children().first();
        if (presentNowButton.height() >= 80) {
            if (!this.inMeeting) {
                sendMessage({ type: "start-meeting" });
            }
            this.inMeeting = true;
            if (HappyMeet.enabled) {
                findMenus();
            }
        } else {
            if (this.inMeeting) {
                sendMessage({ type: "stop-meeting" });
            }
            this.inMeeting = false;
        }
        if (presentNowButton.height() < 80 && !$(".joinhappymeet").position()) {
            $("<button>")
                .addClass("joinhappymeet")
                .text("Join with HappyMeet")
                .on("click", () => {
                    if (HappyMeet.enabled) return;
                    HappyMeet.enabled = true;
                    triggerMouseClick(joinButton.find("span"));
                    $(".joinhappymeet").remove();
                })
                .appendTo($("body"));
        }
        this.centerButton();
        if (HappyMeet.enabled) {
            this.addHappyMeet();
            this.showCaptionDivs();
        }
    }

    centerButton() {
        $(".joinhappymeet")
            .css({
                top: 10,
                left: $("body").width()/2 - 60,
            })
    }

}

new HappyMeet();