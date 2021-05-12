import { sendMessage, findPin, triggerMouseClick, findNameElementFromVideo } from "./util";

export class Presentation {
    userId: string;
    video: JQuery;
    videoParent: JQuery;
    live: boolean;
    static singleton: Presentation;
  
    constructor(video: JQuery, userId: string) {
        this.userId = userId;
        this.video = video;
        this.live = !(video.css("display") === "none");
        this.videoParent = video.parent();
        Presentation.singleton = this;
        $(".happymeet .presentation")
            .append(
                video.addClass("happymeet")
            );
    }

    reparentVideo() {
        this.video
            .css("opacity", 1)
            .removeClass("happymeet")
            .appendTo(this.videoParent);
    }

    static reparentVideos() {
        if (Presentation.singleton) {
            Presentation.singleton.reparentVideo();
        }
    }

    static check() {
        if (!Presentation.singleton) return;
        if (Presentation.singleton.video.css("display") !== "none") {
            if (!Presentation.singleton.live) {
                sendMessage({
                    type: "presentation-start",
                    userId: Presentation.singleton.userId,
                });
            }
            Presentation.singleton.live = true;
        }
        if (!Presentation.singleton.live) return;
        if (Presentation.singleton.video.css("display") === "none") {
            Presentation.singleton.live = false;
            sendMessage({
                type: "presentation-stop",
                userId: Presentation.singleton.userId,
            });
        }
    }

    static isPresentation(container: JQuery, video: JQuery): boolean {
        if (container.find("svg").length >= 10) return false;
        const name = findNameElementFromVideo(video).text();
        if (name.startsWith("Presentation (")) return true;
        return false;
    }
};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "start-meeting":
            if (!Presentation.singleton) break;
            if (!Presentation.singleton.video) break;
            if (Presentation.singleton.video.css("display") !== "none") {
                sendMessage({
                    type: "presentation-start",
                    userId: Presentation.singleton.userId,
                });
            }
            sendResponse("OK");
            break;
        case "presentation-stop":
            $(".presentation .message")
                .empty()
                .append(
                    $("<div>").text("Waiting for someone to present..."),
                )
            sendResponse("OK");
            break;
        case "presentation-start":
            $(".presentation .message")
                .empty()
                .append(
                    $("<div>").text("Presentation should appear here."),
                    $("<div>").text("This may take a few seconds."),
                    $("<div>").text("In case of problems, refresh the window."),
                )
            sendResponse("OK");
            break;
    }
});

export function findPresentationPreview() {
    $("div[data-fps-request-cap] video").each((n, element) => {
        const video = $(element);
        const div = video.closest("div[data-fps-request-cap]");
        if (div.parent().text().slice(0, 18) == "Presentation (You)") {
            new Presentation(video, "");
        }
    });
}