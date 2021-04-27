"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var menuHider = new util_1.Job("Menu hider", hideMenus);
var pageY = 0;
function findMenus() {
    if (exports.topMenu)
        return;
    exports.topMenu = util_1.getPreviewVideo().parent().parent().parent().parent().parent().parent().parent().parent();
    exports.bottomMenu = $("div[aria-label|='Leave call'").parent().parent().parent();
    exports.topMenu.css({
        zIndex: 100,
        position: "absolute",
    });
    if (!exports.topMenu.position())
        exports.topMenu = undefined; // too early, try again later...
}
exports.findMenus = findMenus;
function hideMenus() {
    try {
        if (pageY > 50 && pageY < $(window).height() - 100) {
            exports.topMenu.css({ top: -50 });
            exports.bottomMenu.css({ bottom: -100 });
        }
    }
    catch (error) {
        util_1.log("Cannot hide menus", error);
    }
}
$("body")
    .on("mousemove", function (event) {
    try {
        if (!exports.topMenu)
            return;
        var height = $(window).height();
        pageY = event.pageY;
        if (event.pageY < 50) {
            if (exports.topMenu)
                exports.topMenu.css({ top: 0 });
        }
        else if (event.pageY > height - 100) {
            if (exports.bottomMenu)
                exports.bottomMenu.css({ bottom: 0 });
        }
        else {
            menuHider.schedule(1000);
        }
    }
    catch (error) {
        util_1.log("Cannot handle mouse move", error);
    }
});
