function setupHappyMeetMeet() {
    const HAPPYMEET_ENABLED = "happymeet-enabled";
    const EMOJIS = [ "😜", "😂", "😍", "👏", "👍", "🙌", "🙈", "😄", "🎉", "💜" ];

    var state = {
        debug: false,
        inMeeting: false,
        meetingId: "???",
        initialized: false,
        attachment: undefined,
        enabled: localStorage.getItem(HAPPYMEET_ENABLED, "true") == "true",
    };
    var checker = setTimeout(() => {}, 1);
    var topMenu, bottomMenu;
    var installedFonts = {};
    var pageY;
    var retryInstalls = 5;

    log("HappyMeet loaded for Google Meet.")

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        switch (request.type) {
            case "emoji":
                animateEmoji(request.userId, request.emoji);
                sendResponse("OK");
                break;
            case "update-bubble":
                updateBubble(request.userId, request.left, request.top, request.large);
                sendResponse("OK");
                break;
            case "slide":
                showSlide(request.meetingId, request.attachment, request.slide);
                sendResponse("OK");
                break;
            case "start-meeting":
                handleBubbleChanged($(".bubble.me"));
                sendResponse("OK");
                break;
            case "debug":
                state.debug = request.debug;
                sendResponse("OK");
                break;
            default:
                sendResponse("FAIL");
        }
        if (request.slide) {
            request.slide = `... ${request.slide.length} bytes ...`;
        }
        log("HappyMeet <===", request);
    });

    function sendMessage(message) {
        message.meetingId = state.meetingId;
        chrome.runtime.sendMessage(message, function (response) {
            log("HappyMeet ===>", message);
        });
    }

    function findNewVideos() {
        if (!bottomMenu.position()) return;
        $("div[data-initial-participant-id]").each(function () {
            const originalVideoContainer = $(this);
            const video = originalVideoContainer.find("video");
            if (video.length == 0) return;
            const userId = sanitizeId(originalVideoContainer.attr("data-initial-participant-id"));
            var bubble = $("#" + userId);
            if (bubble.length == 0) {
                const picture = originalVideoContainer.find("img");
                bubble = createNewBubble(video, picture, userId);
                watchBubbleVolume(bubble, video);
                if (checkIfMyBubble(bubble, originalVideoContainer)) {
                    makeDraggable(bubble);
                    addResizeToggle(bubble);
                    addEmojis(bubble);
                }
            }
            bubble.find(".clip").append(video);
            hideMeetUI(originalVideoContainer);
        });
    }

    function createNewBubble(video, picture, userId) {
        return $("<div>")
            .attr("id", userId)
            .addClass("bubble")
            .prependTo(".happymeet .bubbles")
            .css({
                position: "absolute",
                top: 200 + Math.random() * 200,
                left: Math.random() * 200,
            })
            .append(
                $("<div>")
                    .text(findNameElementFromVideo(video).text())
                    .addClass("name"),
                $("<div>")
                    .addClass("clip")
                    .append(picture)
            );
    }

    function makeDraggable(bubble) {
        bubble.draggable({
            scroll: false,
            containment: ".happymeet .bubbles",
            start: (event, ui) => {
                bubble.attr("dragging", true);
            },
            drag: (event, ui) => {
                handleBubbleChanged(bubble, ui.helper.position().left, ui.helper.position().top);
            },
            stop: (event, ui) => {
                bubble.attr("dragging", false);
            },
        });
    }

    function findNameElementFromVideo(video) {
        // this function is fragile as it assumes certain DOM structure
        const nameBar = video.parent().parent().next();
        const nameElement = nameBar.children().first().children().last();
        return nameElement;
    }

    function watchBubbleVolume(bubble, video) {
        if (!bubble.position()) return;
        const volumeter = findNameElementFromVideo(video).prev().children().first();
        const clip = bubble.find(".clip");
        const position = clip.position();
        var lastRing = new Date().getTime();
        function addRing() {
            const now = new Date().getTime();
            if (now - lastRing < 300) return;
            lastRing = now;
            $("<div>")
                .addClass("ring")
                .prependTo(bubble)
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
                }, 1000, function() { $(this).remove(); });
        }
        new MutationObserver(addRing).observe(volumeter[0], { attributes: true });
    }

    function hideMeetUI(parent) {
        // parent.parent().parent().css("opacity", "0");
    }

    function checkIfMyBubble(bubble, originalVideoContainer) {
        const name = originalVideoContainer.find("div[data-self-name]").first();
        if (!name.length || name.attr("data-self-name") != name.text()) return false;
        bubble.addClass("me");
        handleBubbleChanged(bubble);
        return true;
    }

    function handleBubbleChanged(bubble) {
        if (!bubble.position()) return;
        checkBubbleLeftRight(bubble);
        sendMessage({
            type: "update-bubble",
            userId: bubble.attr("id"),
            left: bubble.position().left / $(".bubbles").width(),
            top: bubble.position().top / $(".bubbles").height(),
            large: bubble.hasClass("large"),
        });
    }

    function addResizeToggle(bubble) {
        bubble.append($("<div>")
            .addClass("sizetoggle")
            .mousedown(function(event) {
                if (bubble.hasClass("large")) {
                    bubble.removeClass("large");
                } else {
                    bubble.addClass("large");
                }
                handleBubbleChanged(bubble);
                event.stopPropagation();
            })
        );
    }

    function addEmojis(bubble) {
        const emojiTray = $("<div>").addClass("emojis").appendTo(bubble);
        for (const emoji of EMOJIS) {
            $("<div>")
                .text(emoji)
                .mouseup(() => sendMessage({
                    type: "emoji",
                    userId: bubble.attr("id"),
                    emoji,
                }))
                .appendTo(emojiTray);
        }
    }

    function animateEmoji(userId, emoji) {
        const bubble = $(`#${userId}`);
        const clip = bubble.find(".clip");
        const middle = clip.offset().left + clip.width() / 2 - 20;
        const center = clip.offset().top + clip.height() / 2 - 30;
        for (var angle=0; angle < Math.PI * 2; angle += Math.PI / 6) {
            const left = middle + Math.cos(angle) * 500;
            const top = center + Math.sin(angle) * 500;
            $("<div>")
                .addClass("emoji")
                .appendTo($(".happymeet"))
                .text(emoji)
                .css({
                    fontSize: 62,
                    left: middle,
                    top: center,
                })
                .animate({
                    fontSize: 22,
                    left,
                    top,
                    opacity: 0,
                }, 3000, "linear", function() { $(this.remove() )});
        }
    }

    function checkBubbleLeftRight(bubble) {
        if (!bubble.position()) return;
        if (bubble.position().left > $(".happymeet").width() / 2) {
            bubble.addClass("left");
            bubble.removeClass("right");
        } else {
            bubble.addClass("right");
            bubble.removeClass("left");
        }
    }

    function updateBubble(userId, left, top, large) {
        const bubble = $(`#${userId}`);
        if (bubble.hasClass("me")) return;
        if (bubble.length == 0) {
            // HappyMeet was faster than Google Meet. Try again in a second.
            return setTimeout(() => updateBubble(userId, left, top, large), 1000);
        }
        bubble
            .filter((index, element) => $(element).attr("dragging") != "true")
            .css({
                left: left * $(".bubbles").width(),
                top: top * $(".bubbles").height(),
            });
        if (large) {
            bubble.addClass("large");
        } else {
            bubble.removeClass("large");
        }
        checkBubbleLeftRight(bubble);
    }

    function sanitizeId(userId) {
        return "bubble-" + userId.replace(/[^a-zA-Z0-9]/g, "_");
    }

    function addHappyMeet() {
        $("<div>")
            .addClass("happymeet")
            .append($("<div>")
                .addClass("slide")
                .append($("<message>To show slides:<ul><li>Edit the Calender event for this meeting<li>Add a Google Slides attachment<li>Open it and it will render here</ul></message>"))
            )
            .append($("<div>")
                .addClass("bubbles")
            )
            .prependTo(bottomMenu.parent());
    }

    function showSlide(meetingId, attachment, slide) {
        if (meetingId != state.meetingId) {
            return;
        }
        state.attachment = attachment;
        $(".happymeet .slide")
            .empty()
            .append($(slide))
            .find("svg")
                .css({
                    position: "static",
                });
        $(".happymeet .slide text")
            .css("font-family", function() {
                const fontName = $(this).css("font-family").replace("docs-", "");
                installFont(fontName);
                return fontName;
            });
    }

    function removePins() {
        $("div[aria-label|='Pin']").remove();
        $("div[aria-label|='Remove']").remove();
        $("div[aria-label|='Mute']").remove();
    }

    function getPreviewVideo() {
        var video;
        $("video").each(function () {
            if ($(this).height() <= 50) video = $(this);
        });
        return video;
    }

    function findMenus() {
        try {
            topMenu = getPreviewVideo().parent().parent().parent().parent().parent().parent().parent().parent();
            bottomMenu = $("div[aria-label|='Leave call'").parent().parent().parent();
            meetButton = $(".meetButton");
        } catch(e) {
            log(e);
        }
        if (!topMenu.position() || !bottomMenu.position()) {
            if (retryInstalls-- > 0) {
                setTimeout(findMenus, 1000);
            } else {
                alert("HappyMeet could not install itself into this meeting. Try reloading the window.");
            }
        } else {
            state.inMeeting = true;
            addHappyMeet();
            $(".meetButton").css({ top: 0 });
        }
    }

    function checkMeetingStatus() {
        $("div[role='button'] i:contains('present_to_all')").each(function () {
            const presentNowButton = $(this).closest("div[role='button']");
            if (presentNowButton.height() >= 80) {
                if (!state.inMeeting) {
                    sendMessage({ type: "start-meeting" });
                }
                findMenus();
            } else {
                if (state.inMeeting) {
                    sendMessage({ type: "stop-meeting" });
                }
                state.inMeeting = false;
            }
            if (state.enabled) {
                presentNowButton.remove();
            }
        });
    }

    function check() {
        checkMeetingStatus();
        if (state.enabled && state.inMeeting) {
            findNewVideos();
            removePins();
        }
    }

    function showTopMenu() {
        $(".meetButton").css({ top: 0 });
        if (!topMenu) return;
        topMenu.css({ top: 0 });
    }

    function showBottomMenu() {
        if (!bottomMenu) return;
        bottomMenu.css({ bottom: 0 });
    }

    function hideMenus() {
        const height = $(window).height();
        if (pageY < 50 || pageY > height - 100) {
            return;
        }
        $(".meetButton").css({ top: -50 });
        if (!topMenu) return;
        topMenu.css({ top: -50 });
        bottomMenu.css({ bottom: -100 });
    }

    function setupMenus() {
        setupSlideNavigator();
    }

    function setupMenuHider() {
        $("body")
            .mousemove(function (event) {
                const height = $(window).height();
                pageX = event.pageX;
                pageY = event.pageY;
                if (pageY < 50) {
                    showTopMenu();
                } else if (pageY > height - 100) {
                    showBottomMenu();
                } else {
                    setTimeout(hideMenus, 2000);
                }
            })
    }
  
    function setupSlideNavigator() {
        $("body")
            .keyup(function (event) {
                switch (event.which) {
                    case 33: // page up
                    case 37: // arrow left
                    case 38: // arrow up
                    case 75: // k
                    case 72: // h
                        if (state.attachment) {
                            sendMessage({ type: "previous-slide", attachment: state.attachment });
                        }
                        break;
                    case 32: // space
                    case 34: // page down
                    case 39: // arrow right
                    case 40: // arrow down
                    case 74: // j
                    case 76: // l
                        if (state.attachment) {
                            sendMessage({ type: "next-slide", attachment: state.attachment });
                        }
                        break;
                    case 36: // home
                        if (state.attachment) {
                            sendMessage({ type: "first-slide", attachment: state.attachment });
                        }
                        break;
                    case 35: // end
                        if (state.attachment) {
                            sendMessage({ type: "last-slide", attachment: state.attachment });
                        }
                        break;
                    case 70: // f
                        fullscreen();
                        break;
                    default:
                        log(event.target.tagName, event.which)
                    }
            });
    }

    function addButton() {
        $("<button>")
            .addClass("meetButton")
            .text(state.enabled ? "Disable HappyMeet" : "Enable HappyMeet")
            .click(() => {
                localStorage.setItem(HAPPYMEET_ENABLED, !state.enabled);
                location.reload();
            })
            .appendTo($("body"));
    }

    function fullscreen() {
        document.body.requestFullscreen();
    }

    function installFont(fontName) {
        fontName = fontName.replace('"', '').replace(" ","+");
        if (!installedFonts[fontName]) {
            $("head").prepend(`<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=${fontName}"/>`);
            installedFonts[fontName] = true;
        }
    }

    function setup() {
        addButton();
        setupMenuHider();
        if (!state.enabled) return;
        $("body").bind("DOMSubtreeModified", function() {
            clearTimeout(checker);
            checker = setTimeout(check, 1);
        });
        setupMenus();
        state.meetingId = document.location.pathname.slice(1);
    }

    function log() {
        if (state.debug) console.log.apply(console, arguments);
    }

    setup();
}
