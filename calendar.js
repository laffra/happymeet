function setupHappyMeetCalendar() {
    log("HappyMeet loaded for Google Calendar.")

    var debug = false;
    var checker = setTimeout(() => {}, 1);
    var attachments = {};

    function checkAttachments() {
        const meetingId = findMeetId();
        if (!meetingId) return;
        const currentAttachments = new Set($("a[data-text]").toArray().map(node => cleanUrl($(node).attr("href"))));
        if (!currentAttachments.isEqual(attachments[meetingId])) {
            updateAttachments(meetingId, currentAttachments);
        }
    }

    function updateAttachments(meetingId, newAttachments) {
        sendMessage(
            {
                type: "set-attachments",
                meetingId,
                attachments: Array.from(newAttachments),
            },
            response => {
                if (response.type == "FAIL") {
                    console.error(`Could not set attachments: ${JSON.stringify(response)}`)
                }
            }
        );
        attachments[meetingId] = newAttachments;
    }

    function findMeetId() {
        const url = $('a[href^="https://meet.google.com/"').attr("href");
        return url && url.replace(/\?.*/, "").replace(/.*\//, "");
    }

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.meetingId != findMeetId()) return;
        log(`HappyMeet: <==== ` + JSON.stringify(request, undefined, 4));
        switch (request.type) {
            case "debug":
                debug = request.debug;
                break;
            default:
                sendResponse("FAIL");
        }
    });

    function sendMessage(message) {
        log(`HappyMeet: ====> ` + JSON.stringify(message, undefined, 4));
        message.calendar = cleanUrl(document.location.href);
        chrome.runtime.sendMessage(message, function(response) { });
    }

    function log() {
        if (debug) console.log.apply(console, arguments);
    }

    function cleanUrl(url) {
        return url.replace("/edit", "").replace(/[?#].*/, "").split("/").pop();
    }

    Set.prototype.isEqual = function(otherSet) {
        if (!(otherSet instanceof Set) || this.size !== otherSet.size) {
            return false;
        }
        for (let item of this) {
            if (!otherSet.has(item)) {
                return false;
            }
        }
        return true;
    }

    function setup() {
        $("body").bind("DOMSubtreeModified", function() {
            clearTimeout(checker);
            checker = setTimeout(checkAttachments, 1);
        });
    }

    setup();
}