function setupHappyMeetCalendar() {
    log("HappyMeet loaded for Google Calendar.")

    var debug = false;
    var checker = setTimeout(() => {}, 1);
    var attachments = {};

    function checkButton() {
        if ($(".happy").length) return;
        const calendarChooser = $("div[data-calendar]")
        const row = calendarChooser.parent().parent();
        row.after($("<div>")
            .addClass(row.attr("class"))
            .addClass("happy")
            .append(
                $("<div>")
                    .addClass(row.children().first().attr("class"))
            ));
        isHappy(findMeetId());
    }

    function checkAttachments() {
        const meetingId = findMeetId();
        if (!meetingId) return;
        attachments[meetingId] = attachments[meetingId] || new Set();
        $("a[data-text]").each(function() {
            const url = cleanUrl($(this).attr("href"));
            if (!attachments[meetingId].has(url)) {
                addAttachment(meetingId, url, $(this).attr("data-text"));
                attachments[meetingId].add(url);
            }
        });
    }

    function cleanUrl(url) {
        return url.replace(/[#?].*/, "");
    }

    function addHappyButton(happy) {
        $("button.happy").remove();
        $("button.unhappy").remove();
        $("div.happy")
            .append(
                $("<button>")
                    .addClass(happy ? "unhappy" : "happy")
                    .text(`Make it ${ happy ? "an Unhappy" : "a Happy"} Meeting`)
                    .click(() => {
                        if (!happy && !findMeetUrl()) {
                            return alert(`HappyMeet: Please first add a Google Meet video conference`);
                        }
                        makeHappy(findMeetId(), happy, response => {
                            addHappyButton(!happy);
                        });
                    })
            );
    } 

    function findMeetUrl() {
        return $('a[href^="https://meet.google.com/"').attr("href");
    }

    function findMeetId() {
        const url = $('a[href^="https://meet.google.com/"').attr("href");
        return url && url.replace(/\?.*/, "").replace(/.*\//, "");
    }

    function check() {
        checkAttachments();
        checkButton();
    }

    function setup() {
        $("body").bind("DOMSubtreeModified", function() {
            clearTimeout(checker);
            checker = setTimeout(check, 1);
        });
    }

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.meetingId != findMeetId()) return;
        log(`HappyMeet: <==== ` + JSON.stringify(request, undefined, 4));
        switch (request.type) {
            case "make-happy":
            case "make-un-happy":
            case "is-happy":
                addHappyButton(request.happy);
                break;
            case "debug":
                debug = request.debug;
                break;
            default:
                sendResponse("FAIL");
        }
    });

    function isHappy(meetingId, responseHandler) {
        if (!meetingId) {
            addHappyButton(false);
            return;
        }
        sendMessage(
            {
                type: "is-happy",
                meetingId,
            },
            responseHandler
        );
    }

    function makeHappy(meetingId, happy, responseHandler) {
        sendMessage(
            {
                type: happy ? "make-un-happy" : "make-happy",
                meetingId,
            },
            responseHandler
        );
    }

    function sendMessage(message) {
        log(`HappyMeet: ====> ` + JSON.stringify(message, undefined, 4));
        chrome.runtime.sendMessage(message, function(response) { });
    }

    function addAttachment(meetingId, url, description) {
        sendMessage(
            {
                type: "add-attachment",
                meetingId,
                attachment: url,
                description,
            },
            response => {
                if (response.type == "FAIL") {
                    console.error(`Could not add attachment "${description}". ${JSON.stringify(response)}`)
                }
            }
        );
    }

    function log() {
        if (debug) console.log.apply(console, arguments);
    }

    setup();
}