function setupHappyMeetSlides() {
    console.log("Loaded.");

    const documentId = cleanUrl(document.location.href);

    var verbose = false;
    var selectedPageNumber = 0;
    var isHappySlides = false;

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        switch (request.type) {
        case "previous-slide":
            if (request.attachment == documentId) {
                isHappySlides = true;
                previousSlide();
                sendResponse("OK");
            }
            break;
        case "first-slide":
            if (request.attachment == documentId) {
                isHappySlides = true;
                firstSlide();
                sendResponse("OK");
            }
            break;
        case "last-slide":
            if (request.attachment == documentId) {
                isHappySlides = true;
                lastSlide();
                sendResponse("OK");
            }
            break;
        case "next-slide":
            if (request.attachment == documentId) {
                isHappySlides = true;
                nextSlide();
                sendResponse("OK");
            }
            break;
        case "live-attachment":
        case "is-happy-attachment":
            isHappySlides = request.attachment == documentId && request.happy;
        case "start-meeting":
            sendCurrentSlide();
            break;
        case "verbose":
            verbose = request.verbose;
            break;
        default:
            sendResponse("FAIL");
        }
        if (request.slide) {
            request.slide = `... ${request.slide.length} characters ...`;
        }
        log(`  <= ` + JSON.stringify(request, undefined, 4));
    });

    function checkIsHappy() {
        sendMessage({
            type: "is-happy-attachment",
            target: ["slides"],
            attachment: documentId,
        });
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
        chrome.runtime.sendMessage(message, function(response) { });
        if (message.slide) {
            message.slide = `... ${message.slide.length} bytes ...`;
        }
        log(`  => ` + JSON.stringify(message, undefined, 4));
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
        getSlide(selectedPageNumber, (slide, width, height) => {
            if (slide) {
                sendMessage({
                    type: "slide",
                    targets: ["meet"],
                    attachment: documentId,
                    pageNumber: selectedPageNumber,
                    slide,
                    width,
                    height,
                });
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

    function log(message) {
        if (!verbose) return;
        const now = new Date();
        const when = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        console.log(when, `HappyMeet: "${message}"`);
    }

    function cleanUrl(url) {
        return url.replace("/edit", "").replace(/[?#].*/, "").split("/").pop();
    }

    $("body").mousedown(checkPageNumber);
    setInterval(checkPageNumber, 500);
    checkIsHappy();
}
