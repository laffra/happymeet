"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var util_2 = require("./util");
var bubble_1 = require("./bubble");
var menus_1 = require("./menus");
var presentation_1 = require("./presentation");
var HappyMeet = /** @class */ (function () {
    function HappyMeet() {
        this.inMeeting = false;
        this.domChecker = new util_1.Job("DOM Checker", this.check.bind(this));
        util_1.log("Loading.");
        var happymeet = this;
        $("body").on("DOMSubtreeModified", function () {
            happymeet.domChecker.schedule();
        });
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            switch (message.type) {
                case "start-meeting":
                    if (bubble_1.Bubble.myBubble) {
                        bubble_1.Bubble.myBubble.changed("Received start-meeting event");
                    }
                    sendResponse("OK");
                    break;
            }
        });
        $(window).on("resize", this.centerButton);
    }
    HappyMeet.prototype.check = function () {
        this.checkMeetingStatus();
        if (!HappyMeet.enabled || !this.inMeeting)
            return;
        bubble_1.Bubble.findUsersThatLeft();
        this.findNewVideos();
    };
    HappyMeet.prototype.checkMeetingStatus = function () {
        $("div[role='button'] i:contains('present_to_all')").each(this.checkPresentButton.bind(this));
    };
    HappyMeet.prototype.findNewVideos = function () {
        if (!this.inMeeting)
            return;
        $("div[" + util_1.VIDEO_KEY + "]").each(function () {
            var container = $(this);
            var video = container.find("video");
            if (video.length == 0)
                return;
            var name = util_2.findNameElementFromVideo(video).text();
            if (name == "" || name.startsWith("Presentation (")) {
                var userId = util_1.sanitizeId(container.attr(util_1.VIDEO_KEY));
                new presentation_1.Presentation(video, userId);
            }
            else {
                bubble_1.Bubble.createBubble(container, video);
            }
            HappyMeet.hideMeetUI();
        });
    };
    HappyMeet.getMeetUI = function () {
        return $("div[" + util_1.VIDEO_KEY + "]").parent().parent();
    };
    HappyMeet.hideMeetUI = function () {
        HappyMeet.getMeetUI().css("opacity", "0");
    };
    HappyMeet.prototype.addHappyMeet = function () {
        if ($(".happymeet").position() || !menus_1.bottomMenu)
            return;
        $("<div>")
            .addClass("happymeet")
            .append($("<div>")
            .addClass("presentation")
            .append($("<div class='message'>Waiting for someone to present...</div>")))
            .append($("<div>")
            .addClass("bubbles"))
            .prependTo(menus_1.bottomMenu.parent());
    };
    HappyMeet.prototype.showCaptionDivs = function () {
        $("div")
            .filter(function (index, element) {
            var div = $(element);
            return (div.height() > 100 && parseInt(div.css("bottom")) > 50);
        })
            .css({
            bottom: 8,
            zIndex: 100,
        });
    };
    HappyMeet.prototype.checkPresentButton = function (index, element) {
        var node = $(element);
        var presentNowButton = node.closest("div[role='button']");
        var joinButton = presentNowButton.parent().children().first();
        if (presentNowButton.height() >= 80) {
            if (!this.inMeeting) {
                util_2.sendMessage({ type: "start-meeting" });
            }
            this.inMeeting = true;
            if (HappyMeet.enabled) {
                menus_1.findMenus();
            }
        }
        else {
            if (this.inMeeting) {
                util_2.sendMessage({ type: "stop-meeting" });
            }
            this.inMeeting = false;
        }
        if (presentNowButton.height() < 80 && !$(".joinhappymeet").position()) {
            $("<button>")
                .addClass("joinhappymeet")
                .text("Join with HappyMeet")
                .on("click", function () {
                if (HappyMeet.enabled)
                    return;
                HappyMeet.enabled = true;
                util_2.triggerMouseClick(joinButton.find("span"));
                $(".joinhappymeet").remove();
            })
                .appendTo($("body"));
        }
        this.centerButton();
        if (HappyMeet.enabled) {
            this.addHappyMeet();
            this.showCaptionDivs();
        }
    };
    HappyMeet.prototype.centerButton = function () {
        $(".joinhappymeet")
            .css({
            top: 10,
            left: $("body").width() / 2 - 60,
        });
    };
    HappyMeet.enabled = false;
    return HappyMeet;
}());
new HappyMeet();
