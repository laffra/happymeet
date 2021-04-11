function setup() {
    $(document).ready(function () {
        switch (document.location.hostname) {
            case "meet.google.com":
                setupHappyMeetMeet();
                break;
            case "calendar.google.com":
                setupHappyMeetCalendar();
                break;
            case "docs.google.com":
                if (document.location.href.startsWith("https://docs.google.com/presentation")) {
                    setupHappyMeetSlides();
                }
                break;
        }
    });
}

setup();