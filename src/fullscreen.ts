$("body")
    .on("keyup", event => {
        if ($(event.target).hasClass("happymeet-emoji-filter")) return;
        switch (event.which) {
            case 70: // f
                document.body.requestFullscreen();
                break;
        }
    });
