function setupHappyMeetSlides() {
    console.log("HappyMeet loaded for Google Slides.");

    const documentUrl = cleanUrl(document.location.href);
    const debug = false;

    var selectedPageNumber = 0;
    var isHappySlides = false;

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (debug) console.log(`HappyMeet: <==== ` + JSON.stringify(request, undefined, 4));
        switch (request.type) {
        case "previous-slide":
            previousSlide();
            sendResponse("OK");
            break;
        case "first-slide":
            firstSlide();
            sendResponse("OK");
            break;
        case "last-slide":
            lastSlide();
            sendResponse("OK");
            break;
        case "next-slide":
            nextSlide();
            sendResponse("OK");
            break;
        case "is-happy-attachment":
            isHappySlides = request.happy;
            break;
        default:
            sendResponse("FAIL");
        }
    });

    function checkIsHappy() {
        sendMessage({
            type: "is-happy-attachment",
            attachment: documentUrl,
        });
    }

    function cleanUrl(url) {
        return url.replace(/[#?].*/, "");
    }

    function previousSlide() {
        gotoSlide(thumbnail => thumbnail.prev());
    }

    function nextSlide() {
        gotoSlide(thumbnail => thumbnail.next());
    }

    function firstSlide() {
        gotoSlide(thumbnail => thumbnail.closest("svg").children("g").first());
    }

    function lastSlide() {
        gotoSlide(thumbnail => thumbnail.closest("svg").children("g").last());
    }

    function gotoSlide(getTarget) {
        const currentThumbnail = $(".punch-filmstrip-selected-thumbnail-pagenumber").parent();
        const targetThumbnail = getTarget(currentThumbnail);
        const id = targetThumbnail.find("g[id]").attr("id").split("-").pop();
        const location = document.location.href.replace(/#.*/, "");
        document.location = `${location}#slide=id.${id}`;
    }

    function sendMessage(message) {
        if (debug) console.log(`HappyMeet: ====> ` + JSON.stringify(message, undefined, 4));
        chrome.runtime.sendMessage(message, function(response) { });
    }

    function checkPageNumber() {
        const pageNumber = parseInt($(".punch-filmstrip-selected-thumbnail-pagenumber").text());
        if (isNaN(pageNumber)) return;
        if (pageNumber != selectedPageNumber) {
            selectedPageNumber = pageNumber;
            sendCurrentSlide();
        }
    }

    function sendCurrentSlide() {
        if (!isHappySlides) return;
        getSlide(selectedPageNumber, (html, width, height) => {
            if (html) {
                sendMessage({
                    type: "slide",
                    html: html,
                    width,
                    height,
                });
            } else {
                setTimeout(sendCurrentSlide, 1000);
            }
        });
    }

    function getSlide(pageNumber, callback) {
        const svg = $(".punch-filmstrip-selected-thumbnail-pagenumber").next().find("svg");
        const copy = svg.clone();
        const images = copy.find("image");
        if (images.length == 0) {
            return callback($("<div>").append(copy).html());
        }
        var loadCount = 0;
        copy.find("image").each(function() {
            loadCount++;
            const image = $(this);
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
                var canvas = document.createElement('CANVAS');
                var ctx = canvas.getContext('2d');
                canvas.height = this.naturalHeight;
                canvas.width = this.naturalWidth;
                ctx.drawImage(this, 0, 0);
                image.attr("href", canvas.toDataURL());
                if (--loadCount == 0) {
                    callback($("<div>").append(copy).html());
                }
            };
            img.src = image.attr("href");
        })
    }

    $("body").mousedown(checkPageNumber);
    setInterval(checkPageNumber, 500);
    setInterval(checkIsHappy, 5000);
}
