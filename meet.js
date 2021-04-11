function setupHappyMeetMeet() {
    const HAPPYMEET_ENABLED = "happymeet-enabled";

    var state = {
        debug: false,
        inMeeting: false,
        initialized: false,
        enabled: localStorage.getItem(HAPPYMEET_ENABLED, "true") == "true",
    };
    var topMenu, bottomMenu;
    var installedFonts = {};
    var myBubble;

    log("HappyMeet loaded for Google Meet.")

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        switch (request.type) {
            case "position":
                moveBubble(request.moveId, request.position);
                sendResponse("OK");
                break;
            case "slide":
                showSlide(request.html);
                sendResponse("OK");
                break;
            case "debug":
                state.debug = request.debug;
                sendResponse("OK");
                break;
            default:
                sendResponse("FAIL");
        }
    });

    function sendMessage(message) {
        chrome.runtime.sendMessage(message, function (response) {
            if (debug) {
                log("===>", message);
                log("<===", response);
            }
        });
    }

    function layoutVideos() {
        $("video").each(function () {
            const video = $(this);
            const bubble = video.closest("div[data-initial-participant-id]");
            if (!bubble.length) return;
            const userId = sanitizeId(bubble.attr("data-initial-participant-id"));
            resizeVideo(bubble, video, userId);
            checkIfMyBubble(bubble);
        });
    }

    function checkIfMyBubble(bubble) {
        const name = bubble.find("div[data-self-name]").first();
        if (myBubble || !name.length || name.attr("data-self-name") != name.text()) return;
        myBubble = bubble;
        sendMessage({
            type: "position",
            moveId: bubble.attr("id"),
            position: bubble.position(),
        });
    }

    function resizeVideo(bubble, video, userId) {
        bubble
            .attr("id", userId)
            .addClass("bubble")
            .draggable({
                scroll: false,
                start: (event, ui) => {
                },
                drag: (event, ui) => {
                    bubble.attr("left", bubble.css("left"));
                    bubble.attr("top", bubble.css("top"));
                },
                stop: (event, ui) => {
                    sendMessage({
                        type: "position",
                        moveId: userId,
                        position: ui.helper.position(),
                    });
                },
            })
            .css({
                background: "transparent",
                transition: "none",
                animation: "none",
                width: 100,
                height: 100,
                margin: "0 0 0 -50px",
                position: "absolute"
            });

        if (!bubble.attr("left")) {
            bubble.css({
                left: $(window).width() / 2 - 300 + Math.random() * 600,
                top: $(window).height() / 2 - 300 + Math.random() * 600,
            });
            bubble.attr("left", bubble.css("left"));
            bubble.attr("top", bubble.css("top"));
        }

        video
            .css({
                width: 200,
                height: 200,
                marginTop: -50,
                marginLeft: -50,
                curser: "hand"
            });

        video.parent()
            .addClass("video-parent")
            .css({
                background: "black",
                overflow: "hidden",
                margin: "0 0 0 50px",
                width: 100,
                height: 100,
                left: -50,
                top: 5,
                borderRadius: "50%",
            });

        video.parent().parent()
            .css({
                background: "transparent",
                cursor: "pointer",
                height: 120,
                width: 120,
            })
            .next()
            .css({
                // the microphone status and name
                background: "transparent",
                width: 200,
                top: 120,
                left: -10,
            })
            .next()
            .css({
                top: -10000,
            });

        bubble
            .find("img")
            .css({
                width: 90,
                height: 90,
                marginTop: -20,
                marginLeft: -30,
            });

        var parent = video.parent().parent();
        while (parent.length) {
            parent.css("background", "transparent");
            parent = parent.parent();
        }

    }

    function moveBubble(userId, position) {
        const bubble = $(`#${userId}`);
        if (bubble.length) {
            bubble.css({ left: position.left, top: position.top });
        } else {
            setTimeout(() => moveBubble(userId, position), 1000);
        }
    }

    function sanitizeId(userId) {
        return "happymeet_" + userId.replace(/[^a-zA-Z0-9]/g, "_");
    }

    function showSlide(html) {
        $(".slide").remove();
        const height = $(window).height() - 400;
        const width = height * 16.0 / 9.0;
        $("<div>")
            .addClass("slide")
            .html(html)
            .prependTo("body")
            .find("svg")
                .css({
                    position: "static",
                    width,
                    height,
                });
        $(".slide text")
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

    function hideMenus() {
        if (!state.enabled || topMenu) return;
        try {
            topMenu = getPreviewVideo().parent().parent().parent().parent().parent().parent().parent().parent()
                .animate({ "top": -50 }, 1000);
            bottomMenu = $("div[aria-label|='Meeting details'").parent().parent().parent()
                .animate({ "bottom": -100 }, 1000);
            meetButton = $(".meetButton")
                .animate({ top: -50 }, 1000);
        } catch(e) {
            log(e);
        }
        setTimeout(hideMenus, 1000);
    }

    function layout() {
        $("div[role='button'] i:contains('present_to_all')").each(function () {
            const presentNowButton = $(this).closest("div[role='button']");
            if (presentNowButton.height() >= 80) {
                state.inMeeting = true;
                $(".meetButton").css({ top: 0 });
                sendMessage({ type: "user-connected" });
                setTimeout(hideMenus, 3000);
            }
            if (state.enabled) {
                presentNowButton.remove();
            }
        });
        if (state.enabled && state.inMeeting) {
            layoutVideos();
            removePins();
        }
    }

    function setupMenus() {
        $("body")
            .mousemove(function (event) {
                if (!state.inMeeting) return;
                const height = $(window).height();
                if (event.pageY < 50) {
                    topMenu.css({ top: 0 });
                    $(".meetButton").css({ top: 0 });
                } else if (event.pageY > height - 100) {
                    bottomMenu.css({ bottom: 0 });
                } else {
                    topMenu.css({ top: -50 });
                    $(".meetButton").css({ top: -50 });
                    bottomMenu.css({ bottom: -100 });
                }
                layoutVideos();
            })
            .keyup(function (event) {
                switch (event.which) {
                    case 33: // page up
                    case 37: // arrow left
                    case 38: // arrow up
                    case 75: // k
                    case 72: // h
                        sendMessage({ type: "previous-slide" });
                        break;
                    case 32: // space
                    case 34: // page down
                    case 39: // arrow right
                    case 40: // arrow down
                    case 74: // j
                    case 76: // l
                        sendMessage({ type: "next-slide" });
                        break;
                    case 36: // home
                        sendMessage({ type: "first-slide" });
                        break;
                    case 35: // end
                        sendMessage({ type: "last-slide" });
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
        $("document")[0].requestFullscreen();
    }

    function installFont(fontName) {
        fontName = fontName.replace('"', '').replace(" ","+");
        if (!installedFonts[fontName]) {
            $("head").prepend(`<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=${fontName}"/>`);
            installedFonts[fontName] = true;
        }
    }

    function setup() {
        if (state.initialized) return;
        addButton();
        showSlide("<message>Google Slides has not yet connected...</message>");
        setInterval(layout, 500);
        setupMenus();
        state.initialized = true;
    }

    function log() {
        if (state.debug) console.log.apply(console, arguments);
    }

    setup();
}
