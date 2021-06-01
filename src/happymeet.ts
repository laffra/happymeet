import { EMOJIS } from './emojis';
import { debug, getUserId, Job, sendMessage } from './util';

class HappyMeet {
    domChecker = new Job("DOM Checker", this.check.bind(this));

    constructor() {
        const happymeet = this;
        $("body").on("DOMSubtreeModified", function() {
            happymeet.domChecker.schedule(100);
        });
        sendMessage({
            type: "start-meeting",
        });
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            switch (message.type) {
                case "emoji":
                    animateEmoji(message.userId, message.emoji);
                    sendResponse("OK");
                    break;
            }
        });
    }

    check() {
        addEmojiButton();
    }
}

export function addEmojiButton() {
    if ($(".happymeet-emojis-button").position()) return;
    addEmojiButtonNew();
    addEmojiButtonOld();
}

export function addEmojiButtonOld() {
    const button = $(`div[aria-label="Leave call"]`);
    const buttonDiv = button.parent();
    buttonDiv.after(
        $("<div>")
            .attr("class", buttonDiv.attr("class"))
            .append(
                $("<button>")
                    .attr("class", button.attr("class"))
                    .addClass("happymeet-emojis-button")
                    .css({
                        padding: 5,
                        fontSize: 36,
                    })
                    .on("mousedown", showEmojis)
                    .text("😊")
            )
    )
}

export function addEmojiButtonNew() {
    const button = $(`span:contains("closed_caption")`).closest("button");
    const buttonDiv = button.parent().parent().parent();
    buttonDiv.after(
        $("<div>")
            .attr("class", button.parent().parent().parent().attr("class"))
            .append(
                $("<div>")
                    .attr("class", button.parent().parent().attr("class"))
                    .append(
                        $("<span>")
                            .attr("class", button.parent().attr("class"))
                            .append(
                                $("<button>")
                                    .attr("class", button.attr("class"))
                                    .addClass("happymeet-emojis-button")
                                    .css("padding", 5)
                                    .on("mousedown", showEmojis)
                                    .text("😊")
                            )
                    )
            )
    )
}

function showEmojis() {
    let dialog = $(".happymeet-emojis-dialog");
    if (!dialog.position()) {
        dialogDiv.find("button").css("display", "none");
        dialog = dialogDiv.dialog({
            height: 200,
            width: 600,
            closeOnEscape: true,
            title: 'HappyMeet: Send an Emoji to all attendees...',
        });
        setTimeout(filterEmojis, 1);
    }
    dialog.dialog("open");
    $(".ui-icon-closethick")
        .text("x")
        .css({
            color: "black",
        })
}

function animateEmoji(userId, emoji) {
    const video = $(`div[data-ssrc="${userId}"]`).last().parent();
    debug("show emoji", userId, emoji, video.position());
    if (!video.offset()) return;
    video.find(".happymeet-emoji").remove();
    $("<div>")
        .addClass("happymeet-emoji")
        .appendTo(video)
        .css({
            left: 0,
            marginLeft: 12,
            marginTop: 8,
            opacity: 1,
            zIndex: 1000,
        })
        .text(emoji)
        .animate({ 
            opacity: 0,
        }, 25000, "linear", function () { $(this).remove(); });
    const middle = video.offset().left + video.width() / 2 - 20;
    const center = video.offset().top + video.height() / 2 - 30;
    for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const left = middle + Math.cos(angle) * 800;
        const top = center + Math.sin(angle) * 800;
        $("<div>")
            .addClass("happymeet-emoji")
            .appendTo($("body"))
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

const dialogDiv = createDialogDiv()

function filterEmojis() {
    const div = $(".happymeet-emojis-dialog");
    const searchString: string = $(".happymeet-emoji-filter").val() as string;
    div.find("button").css("display", "inline-block");
    div.find("button").each((index, element) => {
        const button = $(element);
        if (!button.attr("search").match(new RegExp(searchString, "i"))) {
            button.css("display", "none");
        }
    });
}

function createDialogDiv() {
    const search = $("<input>")
        .attr("placeholder", "search")
        .addClass("happymeet-emoji-filter")
        .css({
            fontSize: 18,
        })
        .on("keyup", filterEmojis)
    const emojis = $("<div>")
        .addClass("happymeet-emoji-container");
    EMOJIS.forEach(entry => {
        $("<button>")
            .text(entry.emoji)
            .attr("name", entry.name)
            .attr("category", entry.category)
            .attr("search", `${entry.name} ${entry.category}`)
            .css("display", "none")
            .on("click", () => {
                sendMessage({
                    type: "emoji",
                    userId: getUserId(),
                    emoji: entry.emoji,
                });
            })
            .appendTo(emojis);
    });
    return $("<div>")
        .addClass("happymeet-emojis-dialog")
        .css("background-color", "white")
        .on("scroll", () => {
            search.css("top", $(".happymeet-emojis-dialog").scrollTop() + 8);
        })
        .append(
            search,
            emojis,
        );
}

new HappyMeet();