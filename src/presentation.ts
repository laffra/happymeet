import { sendMessage } from "./util";

export class Presentation {
    userId: string;
    video: JQuery;
  
    constructor(video: JQuery, userId: string) {
        this.userId = userId;
        this.video = video;
        $(".happymeet .presentation")
            .empty()
            .append(video);
        sendMessage({
            type: "presentation-start",
            userId
        });
    }
};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case "presentation-start":
            if (!$(".happymeet .presentation video").position()) {
                $(".happymeet .presentation")
                    .empty()
                    .append($("<div>")
                        .addClass("message")
                        .text(`You are presenting now.`));
            }
            sendResponse("OK");
            break;
    }
});
