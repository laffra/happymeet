function setupHappyMeetSlides() {

    const attachment = cleanUrl(document.location.href);
    const slideIds = [];
    var verbose = true;

    log({
        message: "Loaded",
        attachment,
    })

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        switch (request.type) {
        case "get-slide":
            if (request.attachment == attachment) {
                getSlide(request);
                sendResponse("OK");
            }
            break;
        case "live-attachment":
            break;
        case "verbose":
            verbose = request.verbose;
            break;
        default:
            sendResponse("FAIL");
        }
    });

    function getSlide(message) {
        try {
            showSlide(message.index);
            const thumbnail = $(".punch-filmstrip-selected-thumbnail-pagenumber").parent();
            getSlideContents(thumbnail, (slide, width, height) => {
                if (slide.length < 25) {
                    console.log("Cannot get slide", message.index, thumbnail.position());
                    setTimeout(() => getSlide(message), 500);
                    return;
                }
                sendMessage({
                    type: "slide",
                    targets: ["meet"],
                    attachment: attachment,
                    count: slideIds.length,
                    compressedSlide: compress(slide),
                    index: message.index,
                    width,
                    height,
                });
            });
        } catch(error) {
            log({
                message: `Cannot get slide ${message.index}`,
                error: error.message,
                stack: error.stack,
            });

        }
    }

    function compress(slide) {
        const compressedSlide = LZString.compress(slide);
        if (slide == LZString.decompress(compressedSlide)) {
            console.log("send compressed slide", slide.length, "=>", compressedSlide.length);
            return compressedSlide;
        }
        console.log("could not compress slide", slide.length);
        return slide;
    }

    function sendMessage(message) {
        chrome.runtime.sendMessage(message, function(response) { });
    }

    function getSlideContents(thumbnail, callback) {
        log({ 
            message: `get-slide-contents`,
        })
        const svg = thumbnail.find("svg");
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
                attachment,
                log: entry,
            })
            if (entry.error || verbose) {
                console.log(entry.when, `HappyMeet: ${entry.error ? "ERROR: " + entry.error + " - " + entry.stack : ""} ${entry.message}"`);
            }
        } catch (error) {
            log({
                message: "Cannot log",
                error: error.message,
                stack: error.stack,
            });
        }
    }

    function cleanUrl(url) {
        return url.replace("/edit", "").replace(/[?#].*/, "").split("/").pop();
    }

    function showSlide(index) {
        if (!slideIds[index]) return;
        const baseUrl = document.location.href.replace(/#.*/, '');
        document.location = `${baseUrl}#slide=id.${slideIds[index]}`;
    }

    function findSlideIds() {
        $.get(document.location.href, (html) => {
            const notes = html.match(/"([a-z0-9_]*):notes"/g);
            const unique = new Set();
            for (const note of notes.map(note => note.slice(1).replace(":notes\"", ""))) {
                if (unique.has(note)) continue;
                unique.add(note);
                slideIds.push(note);
            } 
        })
    }

    findSlideIds();
}
