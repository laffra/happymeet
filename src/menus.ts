import { log, getPreviewVideo, Job } from "./util";

export var topMenu: JQuery;
export var bottomMenu: JQuery;

var menuHider = new Job("Menu hider", hideMenus);
var pageY = 0;

export function findMenus() {
    if (topMenu) return;
    topMenu = getPreviewVideo().parent().parent().parent().parent().parent().parent().parent().parent();
    bottomMenu = $("div[aria-label|='Leave call'").parent().parent().parent();
    topMenu.css({
        zIndex: 100,
        position: "absolute",
    });
    if (!topMenu.position()) topMenu = undefined; // too early, try again later...
}

function hideMenus() {
    try {
        if (pageY > 50 && pageY < $(window).height() - 100) {
            topMenu.css({ top: -50 });
            bottomMenu.css({ bottom: -100 });
        }
    } catch (error) {
        log("Cannot hide menus", error);
    }
}

$("body")
    .on("mousemove", function (event) {
        try {
            if (!topMenu) return;
            const height = $(window).height();
            pageY = event.pageY;
            if (event.pageY < 50) {
                if (topMenu) topMenu.css({ top: 0 });
            } else if (event.pageY > height - 100) {
                if (bottomMenu) bottomMenu.css({ bottom: 0 });
            } else {
                menuHider.schedule(1000);
            }
        } catch (error) {
            log("Cannot handle mouse move", error);
        }
    });