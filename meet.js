function setupHappyMeetMeet() {
    const HAPPYMEET_ENABLED = "happymeet-enabled";
    const VIDEO_KEY = "data-initial-participant-id";
    const EMOJIS = ["😜", "😂", "😍", "👏", "👍", "🙌", "🙈", "😄", "🎉", "💜"];

    const state = {
        verbose: false,
        inMeeting: false,
        meetingId: getMeetingId(),
        initialized: false,
        attachment: undefined,
        checkErrorCount: 0,
        enabled: false,
        index: -1,
        slideCount: 100,
    };

    var checker = setTimeout(() => { }, 1);
    var menuHider = setTimeout(() => { }, 1);
    var topMenu, bottomMenu;
    var installedFonts = {};
    var pageY;
    var retryInstalls = 5;
    var videoParent = {};
    var imageParent = {};

    log({ message: "Loaded." });

    function getMeetingId() {
        return document.location.pathname.slice(1);
    }

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        try {
            switch (message.type) {
                case "emoji":
                    animateEmoji(message.userId, message.emoji);
                    sendResponse("OK");
                    break;
                case "update-bubble":
                    updateBubble(message.userId, message.left, message.top, message.large);
                    sendResponse("OK");
                    break;
                case "slide":
                    renderSlide(message);
                    sendResponse("OK");
                    break;
                case "live-attachment":
                    liveAttachment(message);
                    sendResponse("OK");
                    break;
                case "show-slide":
                    showSlide(message);
                    sendResponse("OK");
                    break;
                case "start-meeting":
                    handleBubbleChanged($(".bubble.me"), "Received start-meeting event");
                    sendResponse("OK");
                    break;
                case "verbose":
                    state.verbose = message.verbose;
                    sendResponse("OK");
                    break;
                default:
                    sendResponse("FAIL");
            }
            message.message = `<=  ${message.type}`;
            log(message);
        } catch (error) {
            logError("Cannot handle runtime message", error, {
                runtimeMessage: message,
            });
        }
    });

    function sendMessage(message) {
        try {
            message.meetingId = state.meetingId;
            chrome.runtime.sendMessage(message, function (response) {
                if (message.type != "log") {
                    message.message = `  => ${message.type}`;
                    log(message);
                }
            });
        } catch (error) {
            logError("Cannot send runtime message", error, {
                runtimeMessage: message,
            });
        }
    }

    function findNewVideos() {
        try {
            if (!bottomMenu.position()) return;
            $(`div[${VIDEO_KEY}]`).each(function () {
                const originalVideoContainer = $(this);
                const video = originalVideoContainer.find("video");
                if (video.length == 0) return;
                const userId = sanitizeId(originalVideoContainer.attr(VIDEO_KEY));
                originalVideoContainer.attr("bubble", userId);
                videoParent[userId] = video.parent();
                var bubble = $("#" + userId);
                if (!bubble.position()) {
                    const picture = originalVideoContainer.find("img");
                    imageParent[userId] = picture.parent();
                    bubble = createNewBubble(video, picture, userId);
                    bubble.attr("key", originalVideoContainer.attr(VIDEO_KEY))
                    watchBubbleVolume(bubble, video);
                    if (checkIfMyBubble(bubble, originalVideoContainer)) {
                        makeDraggable(bubble);
                        addResizeToggle(bubble);
                        addEmojis(bubble);
                    }
                    logBubbles(`Found new video for "${bubble.find(".name").text()}`);
                }
                bubble.find(".clip").append(video);
                hideMeetUI();
            });
        } catch (error) {
            logError("Cannot find new videos", error);
        }
    }

    function createNewBubble(video, picture, userId) {
        try {
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
        } catch (error) {
            logError("Cannot create new bubble", error, {
                video,
                picture,
                userId,
            });
        }
    }

    function makeDraggable(bubble) {
        try {
            bubble.draggable({
                scroll: false,
                containment: ".happymeet .bubbles",
                start: (event, ui) => {
                    bubble.attr("dragging", true);
                },
                drag: (event, ui) => {
                    handleBubbleChanged(bubble, "User dragged bubble");
                },
                stop: (event, ui) => {
                    bubble.attr("dragging", false);
                },
            });
        } catch (error) {
            logError("Cannot make draggable", error, { bubble });
        }
    }

    function findNameElementFromVideo(video) {
        try {
            // this function is fragile as it assumes certain DOM structure
            const nameBar = video.parent().parent().next();
            const nameElement = nameBar.children().first().children().last();
            return nameElement;
        } catch (error) {
            logError("Cannot find name element from video", error, { video });
        }
    }

    function watchBubbleVolume(bubble, video) {
        try {
            if (!bubble.position()) return;
            const volumeter = findNameElementFromVideo(video).prev().children().first();
            const clip = bubble.find(".clip");
            const position = clip.position();
            var lastRing = new Date().getTime();
            var ringError = 0;
            function addRing() {
                try {
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
                        }, 1000, function () { $(this).remove(); });
                } catch (error) {
                    if (bubble) {
                        bubble.attr("ring-error-count", ++ringError); if (ringError == 1) {
                            bubble.attr("ring-error", error.message);
                            log({
                                message: "Cannot add ring",
                                bubble,
                                video,
                                error: error.message,
                                stack: error.stack,
                            });
                        }
                    }
                }
            }
            new MutationObserver(addRing).observe(volumeter[0], { attributes: true });
        } catch (error) {
            logError("Cannot watch bubble volume", error, { bubble, video });
        }
    }

    function getMeetUI() {
        try {
            return $(`div[${VIDEO_KEY}]`).parent().parent();
        } catch (error) {
            logError("Cannot get Meet UI", error);
        }
    }

    function hideMeetUI() {
        try {
            getMeetUI().css("opacity", "0");
        } catch (error) {
            logError("Cannot hide Meet UI", error);
        }
    }

    function checkIfMyBubble(bubble, originalVideoContainer) {
        try {
            const name = originalVideoContainer.find("div[data-self-name]").first();
            if (!name.length || name.attr("data-self-name") != name.text()) return false;
            bubble.addClass("me");
            handleBubbleChanged(bubble, "Found my bubble");
            return true;
        } catch (error) {
            logError("Cannot check if this is my bubble", error, { bubble });
        }
    }

    function handleBubbleChanged(bubble, reason) {
        try {
            if (!bubble.position()) return;
            checkBubbleLeftRight(bubble);
            const position = bubble.position();
            sendMessage({
                type: "update-bubble",
                targets: ["meet"],
                userId: bubble.attr("id"),
                left: position.left / $(".bubbles").width(),
                top: position.top / $(".bubbles").height(),
                large: bubble.hasClass("large"),
            });
            logBubbles(reason);
        } catch (error) {
            logError("Cannot handle bubble changed", error, { bubble, reason });
        }
    }

    function logBubbles(reason) {
        log({
            bubbles: $(".bubble").map((index, element) => {
                const bubble = $(element);
                const position = bubble.position();
                return {
                    userId: bubble.attr("id"),
                    left: position.left,
                    top: position.top,
                    width: bubble.width(),
                    height: bubble.height(),
                    me: bubble.hasClass("me"),
                    large: bubble.hasClass("large"),
                    key: bubble.attr("key"),
                    video: $(element).find("video").filter(function () { return !$(this).css("display") != "none"; }).position() ? "present" : "missing",
                    img: $(element).find("img").position() ? "present" : "missing",
                    rings: $(element).find(".ring").length ? "present" : "missing",
                    emojis: $(element).find(".emojis").position() ? "present" : "missing",
                    resizeToggle: $(element).find(".sizetoggle").position() ? "present" : "missing",
                    name: $(element).find(".name").text(),
                }
            }).get(),
            message: reason,
        })
    }

    function findOrphanVideos() {
        try {
            $("video")
                .filter(function () { return $(this).css("display") != "none" && !$(this).closest(".bubble").position(); })
                .each(function () {
                })
        } catch (error) {
            logError("Cannot find orphan videos", error);
        }
    }

    function findUsersThatLeft() {
        try {
            $(".bubble").each(function () {
                const bubble = $(this);
                const key = bubble.attr("key");
                if (!$(`div[${VIDEO_KEY}="${key}"]`).position()) {
                    // user left the call....
                    bubble.remove();
                }
            });
        } catch (error) {
            logError("Cannot find users that left", error);
        }
    }

    function addResizeToggle(bubble) {
        try {
            bubble.append($("<div>")
                .addClass("sizetoggle")
                .mousedown(function (event) {
                    try {
                        if (bubble.hasClass("large")) {
                            bubble.removeClass("large");
                        } else {
                            bubble.addClass("large");
                        }
                        handleBubbleChanged(bubble, "User resized bubble");
                        event.stopPropagation();
                    } catch (error) {
                        logError("Cannot handle mouse down on resize toggle", error, { bubble });
                    }
                })
            );
        } catch (error) {
            logError("Cannot add resize toggle", error, { bubble });
        }
    }

    function addEmojis(bubble) {
        try {
            const emojiTray = $("<div>").addClass("emojis").appendTo(bubble);
            for (const emoji of EMOJIS) {
                $("<div>")
                    .text(emoji)
                    .mouseup(() => sendMessage({
                        type: "emoji",
                        targets: ["meet"],
                        userId: bubble.attr("id"),
                        emoji,
                    }))
                    .appendTo(emojiTray);
            }
        } catch (error) {
            logError("Cannot add emojis", error, { bubble });
        }
    }

    function animateEmoji(userId, emoji) {
        try {
            const bubble = $(`#${userId}`);
            const clip = bubble.find(".clip");
            if (!clip.offset()) return;
            const middle = clip.offset().left + clip.width() / 2 - 20;
            const center = clip.offset().top + clip.height() / 2 - 30;
            for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
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
                    }, 3000, "linear", function () { $(this.remove()) });
            }
        } catch (error) {
            logError("Cannot animate emojies", error, { userId, emoji });
        }
    }

    function checkBubbleLeftRight(bubble) {
        try {
            if (!bubble.position()) return;
            if (bubble.position().left > $(".happymeet").width() / 2) {
                bubble.addClass("left");
                bubble.removeClass("right");
            } else {
                bubble.addClass("right");
                bubble.removeClass("left");
            }
        } catch (error) {
            logError("Cannot check bubble left/right", error, { bubble });
        }
    }

    function updateBubble(userId, left, top, large) {
        try {
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
        } catch (error) {
            logError("Cannot update bubble", error, { userId, top, left, large });
        }
    }

    function sanitizeId(userId) {
        return "bubble-" + userId.replace(/[^a-zA-Z0-9]/g, "_");
    }

    function showMyBubble() {
        if ($(".bubble.me").position()) return;
        // force my video to show up as a tile, so HappyMeet can discover it
        triggerMouseClick($("div[aria-label|='Show in a tile']"));
    }

    function addHappyMeet() {
        try {
            if ($(".happymeet").position()) return;
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
        } catch (error) {
            logError("Cannot add happymeet", error);
        }
    }

    function liveAttachment(message) {
        try {
            if (message.meetingId != state.meetingId) {
                return;
            }
            state.attachment = message.attachment;
            gotoSlide(message.index);
        } catch (error) {
            logError("Cannot save live attachment", error, {
                meetingId: message.meetingId,
                attachment: message.attachment,
            });
        }
    }

    function showMessage(message) {
        $(".happymeet .slide")
            .empty()
            .append($(`<message>${message}</message>`));
    }

    function gotoSlide(index) {
        showMessage(`Loading slide ${index + 1}...`);
        state.index = index;
        sendMessage({
            type: "show-slide",
            targets: ["meet"],
            attachment: state.attachment,
            index: index,
        });
        sendMessage({
            type: "get-slide",
            targets: ["slides"],
            attachment: state.attachment,
            index: index,
        });
    }

    function showSlide(message) {
        try {
            if (message.meetingId != state.meetingId) {
                return;
            }
            if (message.index == state.index) {
                console.log("Already showing index", message.index, state.index);
                return;
            }
            state.index = message.index;
            showMessage(`Loading slide ${message.index}...`);
        } catch (error) {
            logError("Cannot show slide", error, {
                meetingId: message.meetingId,
                attachment: message.attachment,
                index: message.index,
            });
        }
    }

    function renderSlide(message) {
        try {
            if (false && message.attachment != state.attachment) {
                console.log("bad attachment ID", message.attachment);
                return;
            }
            if (message.index != state.index) {
                console.log("Unexpected index", message.index, state.index);
                return;
            }
            var slide = LZString.decompress(message.compressedSlide);
            console.log("Slide length ", message.compressedSlide.length, slide.length);
            $(".happymeet .slide")
                .empty()
                .append($(slide))
                .find("svg")
                .css({
                    position: "static",
                });
            $(".happymeet .slide text")
                .css("font-family", function () {
                    try {
                        const fontName = $(this).css("font-family").replace("docs-", "");
                        installFont(fontName);
                        return fontName;
                    } catch (error) {
                        logError("Cannot get font name", error, { text: $(this) });
                        return "arial";
                    }
                });
        } catch (error) {
            logError("Cannot render slide", error, {
                meetingId: message.meetingId,
                attachment: message.attachment,
                index: message.index,
            });
        }
    }

    function removePins() {
        try {
            $("div[aria-label|='Pin']").remove();
            $("div[aria-label|='Remove']").remove();
            $("div[aria-label|='Mute']").remove();
        } catch (error) {
            logError("Cannot remove pins", error);
        }
    }

    function getPreviewVideo() {
        try {
            var video;
            $("video").each(function () {
                if ($(this).height() <= 50) video = $(this);
            });
            return video;
        } catch (error) {
            logError("Cannot get preview video", error);
        }
    }

    function findMenus() {
        try {
            if (!state.enabled) return;
            topMenu = getPreviewVideo().parent().parent().parent().parent().parent().parent().parent().parent();
            bottomMenu = $("div[aria-label|='Leave call'").parent().parent().parent();
            topMenu.css("z-index", 6);
            if (!topMenu.position() || !bottomMenu.position()) {
                if (retryInstalls-- > 0) {
                    setTimeout(findMenus, 1000);
                } else if (retryInstalls == 0) {
                    alert("HappyMeet could not install itself into this meeting. Try reloading the window.");
                }
            } else {
                state.inMeeting = true;
                addHappyMeet();
            }
        } catch (error) {
            if (retryInstalls-- > 0) { setTimeout(findMenus, 1000); } else if (retryInstalls == 0) {
                logError({
                    message: "Cannot find menus",
                    error: error.message,
                    stack: error.stack,
                });
                alert("HappyMeet could not install itself into this meeting. Try reloading the window.");
            }
        }
    }

    function checkMeetingStatus() {
        try {
            $("div[role='button'] i:contains('present_to_all')").each(function () {
                try {
                    const presentNowButton = $(this).closest("div[role='button']");
                    if (presentNowButton.height() >= 80) {
                        if (!state.inMeeting) {
                            sendMessage({ type: "start-meeting" });
                        }
                        state.inMeeting = true;
                        findMenus();
                    } else {
                        if (state.inMeeting) {
                            sendMessage({ type: "stop-meeting" });
                        }
                        state.inMeeting = false;
                    }
                    if (presentNowButton.height() < 80 && !$(".joinhappymeet").position()) {
                        presentNowButton
                            .parent()
                            .parent()
                            .append($("<button>")
                                .addClass("joinhappymeet")
                                .text("Join with HappyMeet")
                            )
                            .click(() => {
                                if (state.enabled) return;
                                state.enabled = true;
                                triggerMouseClick(presentNowButton.parent().children().first().find("span"));
                            });
                    }
                    if (bottomMenu) {
                        bottomMenu.find(".joinhappymeet").remove();
                    }
                } catch (error) {
                    logError("Cannot check present button", error);
                }
            });
        } catch (error) {
            logError("Cannot check meeting status", error);
        }
    }

    function triggerMouseClick(node) {
        const element = node[0];
        if (!element) return;
        var clickEvent = document.createEvent('MouseEvents');
        clickEvent.initEvent("click", true, true);
        element.dispatchEvent(clickEvent);
    }

    function check() {
        try {
            if (state.checkErrorCount > 10) return;
            checkMeetingStatus();
            findUsersThatLeft();
            if (state.enabled && state.inMeeting) {
                findNewVideos();
                findOrphanVideos();
                removePins();
            }
        } catch (error) {
            state.checkErrorCount++;
            logError("Cannot check", error);
        }
    }

    function showTopMenu() {
        try {
            if (!topMenu) return;
            topMenu.css({ top: 0 });
        } catch (error) {
            logError("Cannot show top menu", error);
        }
    }

    function showBottomMenu() {
        try {
            if (!bottomMenu) return;
            bottomMenu.css({ bottom: 0 });
        } catch (error) {
            logError("Cannot show bottom menu", error);
        }
    }

    function hideMenus() {
        try {
            const height = $(window).height();
            if (pageY < 50 || pageY > height - 100) {
                return;
            }
            if (!topMenu) return;
            topMenu.css({ top: -50 });
            bottomMenu.css({ bottom: -100 });
        } catch (error) {
            logError("Cannot hide menus", error);
        }
    }

    function setupDoodle() {
        try {
            $(".happymeet .bubbles").before($("<canvas>")
                .addClass("drawing")
                .prop("width", $("body").width())
                .prop("height", $("body").height())
            );
            $(".happymeet").resize(() => {
                $(".happymeet .drawing")
                    .prop("width", $("body").width())
                    .prop("height", $("body").height())
            });
            var lastX, lastY;
            $("body")
                .mousemove(function (event) {
                    const canvas = $(".happymeet .drawing")[0];
                    if (!canvas) return;
                    if (event.which == 1) {
                        if (lastX != -1) {
                            const context = canvas.getContext("2d");
                            context.beginPath();
                            context.moveTo(lastX, event.pastY);
                            context.lineTo(pageX, event.pageY);
                            context.lineWidth = 10;
                            context.strokeStyle = 'green';
                            context.stroke();
                        }
                        lastX = event.pageX;
                        lastY = event.pageY;
                    } else {
                        lastX = lastY = -1;
                    }
                });
        } catch (error) {
            logError("Cannot setup doodle", error);
        }
    }

    function setupMenuHider() {
        try {
            $("body")
                .mousemove(function (event) {
                    try {
                        const height = $(window).height();
                        pageX = event.pageX;
                        pageY = event.pageY;
                        if (pageY < 50) {
                            showTopMenu();
                        } else if (pageY > height - 100) {
                            showBottomMenu();
                        } else {
                            clearTimeout(menuHider);
                            menuHider = setTimeout(hideMenus, 2000);
                        }
                        showMyBubble();
                    } catch (error) {
                        logError("Cannot handle mouse move", error);
                    }
                })
        } catch (error) {
            logError("Cannot setup menu hider", error);
        }
    }

    function setupSlideNavigator() {
        try {
            $("body")
                .keyup(function (event) {
                    try {
                        switch (event.which) {
                            case 33: // page up
                            case 37: // arrow left
                            case 38: // arrow up
                            case 75: // k
                            case 72: // h
                                gotoSlide(Math.max(0, state.index - 1));
                                break;
                            case 32: // space
                            case 34: // page down
                            case 39: // arrow right
                            case 40: // arrow down
                            case 74: // j
                            case 76: // l
                                gotoSlide(Math.min(state.slideCount, state.index + 1));
                                break;
                            case 36: // home
                                gotoSlide(0);
                                break;
                            case 35: // end
                                gotoSlide(state.slideCount);
                                break;
                            case 70: // f
                                fullscreen();
                                break;
                            default:
                            // log({ message: `Unhandled key press: keyCode=${event.which}` });
                        }
                    } catch (error) {
                        logError("Cannot handle keyup for slide navigation", error);
                    }
                });
        } catch (error) {
            logError("Cannot setup slide navigator", error);
        }
    }

    function fullscreen() {
        try {
            document.body.requestFullscreen();
        } catch (error) {
            logError("Cannot fullscreen", error);
        }
    }

    function installFont(fontName) {
        try {
            fontName = fontName.replace('"', '').replace(" ", "+");
            if (!installedFonts[fontName]) {
                $("head").prepend(`<link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=${fontName}"/>`);
                installedFonts[fontName] = true;
            }
        } catch (error) {
            logError("Cannot install font", error, { fontName });
        }
    }

    function postSetup() {
        log({
            message: `Post setup. Enabled=${state.enabled}`,
            state,
        });
    }

    function setup() {
        try {
            setupMenuHider();
            $("body").bind("DOMSubtreeModified", function () {
                try {
                    clearTimeout(checker);
                    checker = setTimeout(check, 1);
                } catch (error) {
                    logError("Cannot handle DOM change", error);
                }
            });
            setupSlideNavigator();
        } catch (error) {
            logError("Cannot setup", error);
        }
    }

    function log(entry) {
        try {
            var now = new Date();
            entry.when = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
            if (entry.compressedSlide) {
                entry.compressedSlide = `... ${entry.compressedSlide.length} characters ...`;
            }
            sendMessage({
                type: "log",
                targets: ["monitor"],
                userId: $(".bubble.me").attr("userId"),
                log: entry,
            })
            if (entry.error || state.verbose) {
                console.log(entry.when, `HappyMeet: ${entry.error ? "ERROR: " + entry.error + " - " + entry.stack : ""} ${entry.message}"`);
            }
        } catch (error) {
            logError("Cannot log", error);
        }
    }

    function logError(message, error, extraFields) {
        const entry = {
            message,
            error: error.message,
            stack: error.stack,
        };
        if (extraFields) {
            for (const key in extraFields) {
                entry[key] = extraFields[key];
            }
        }
        log(entry);
    }

    setup();
    postSetup();
}
