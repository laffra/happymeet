function setup() {
    switch (document.location.hostname) {
        case "meet.google.com":
            setupHappyMeetMeet();
            break;
        case "calendar.google.com":
            setupHappyMeetCalendar();
            break;
        case "docs.google.com":
            setupHappyMeetSlides();
            break;
    }
}

setup();