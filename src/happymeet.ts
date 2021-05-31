import { Job, VIDEO_KEY, debug } from './util';
import { triggerMouseClick, sendMessage } from './util';
import { Bubble } from './bubble';
import { bottomMenu, findMenus } from './menus';
import { findPresentationPreview, Presentation } from './presentation';

type Message = any;

class HappyMeet {
    static enabled = false;
    inMeeting = false;
    noBubbles = true;
    domChecker = new Job("DOM Checker", this.check.bind(this));

    constructor() {
        const happymeet = this;
        $("body").on("DOMSubtreeModified", function() {
            happymeet.domChecker.schedule(100);
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
        this.findNewVideos();
        findPresentationPreview();
        Presentation.check();
        this.showCaptionDivs();
    }

    checkMeetingStatus() {
        $("div[role='button'] i:contains('present_to_all')").each(this.checkPresentButton.bind(this));
        $("button i:contains('present_to_all')").each(this.checkPresentButton.bind(this));
        $("body").each(this.checkPresentButton.bind(this));
    }

    findNewVideos() {
        if (!this.inMeeting || this.noBubbles) return;
        $("video").each(function () {
            const video = $(this);
            if (video.hasClass("happymeet")) return;
            const container = video.closest("div[jsmodel]");
            video.addClass("happymeet");
            const img = container.find("img");
            const userId = $(this).parent().attr(VIDEO_KEY);
            if (Presentation.isPresentation(container, video, userId)) {
                debug("Found a new presentation")
                new Presentation(video, userId);
            }
            if (Bubble.isPerson(container, userId)) {
                debug("Found a new person")
                Bubble.createBubble(container, video, img, userId);
            }
            HappyMeet.hideMeetUI();
        });
    }

    static getMeetUI() {
        return $(`div[${VIDEO_KEY}]`).parent().parent();
    }

    static hideMeetUI() {
        HappyMeet.getMeetUI().css({
            opacity: 0,
        });
        $(".happymeet").css({
            opacity: 1,
        });
    }

    static showMeetUI() {
        HappyMeet.getMeetUI().css({
            opacity: 1,
        });
        $(".happymeet").css({
            opacity: 0,
        });
    }

    addHappyMeet() {
        if ($(".happymeet").position()) return;
        $("<div>")
            .addClass("happymeet")
            .append($("<div>")
                .addClass("presentation")
                .append($("<div class='message'>Waiting for someone to present...</div>"))
            )
            .append($("<div>")
                .addClass("bubbles")
            )
            .prependTo(bottomMenu.parent().parent().parent());
    }

    showCaptionDivs() {
        $(`div[style^="bottom"]`)
            .filter((index, element) => {
                return ($(element).css("bottom") === "88px");
            })
            .css({
                bottom: 8,
                zIndex: 110,
            })
    }

    meetingActive() {
        const closedCaptionButton = $("button span:contains('closed_caption')");
        return closedCaptionButton.height() > 0;
    }

    checkPresentButton(index: number, element: Element) {
        const node = $(element);
        const presentNowButton = node.closest("div[role='button']");
        const joinButton = presentNowButton.parent().children().first();
        if (this.meetingActive()) {
            if (!this.inMeeting) {
                sendMessage({
                    type: "start-meeting",
                });
            }
            this.inMeeting = true;
            if (HappyMeet.enabled) {
                findMenus();
            }
        } else {
            if (this.inMeeting) {
                sendMessage({ type:
                    "leave-meeting",
                    userId: Bubble.myBubble.userId,
                });
            }
            this.inMeeting = false;
        }
        if (HappyMeet.enabled) {
            this.addHappyMeet();
        }
        if (!joinButton.position()) return;
        if (!this.inMeeting && !$(".joinhappymeet").position()) {
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
        if (this.inMeeting) {
            $(".joinhappymeet").remove();
        }
        this.centerButton();
    }

    centerButton() {
        const logoOffset = $("img[alt='Meet logo']").offset();
        if (!logoOffset) return;
        $(".joinhappymeet")
            .css({
                top: logoOffset.top,
                left: $("body").width()/2 - 60,
            })
    }

    static disable() {
        HappyMeet.showMeetUI();
        HappyMeet.enabled = false;
        Bubble.reparentVideos();
        Presentation.reparentVideos();
    }

    static enable() {
        HappyMeet.hideMeetUI();
        HappyMeet.enabled = true;
    }
}

$("body")
    .on("keyup", event => {
        switch (event.which) {
            case 77: // m
                HappyMeet.disable();
                break;
            case 72: // h
                HappyMeet.enable();
                break;
        }
    });


new HappyMeet();