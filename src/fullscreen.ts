$("body")
    .on("keyup", event => {
        switch (event.which) {
            case 70: // f
                document.body.requestFullscreen();
                break;
        }
    });
