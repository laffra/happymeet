$("body")
    .on("keyup", function (event) {
    switch (event.which) {
        case 70: // f
            document.body.requestFullscreen();
            break;
    }
});
