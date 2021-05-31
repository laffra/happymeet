import { log, getPreviewVideo, Job } from "./util";

export var bottomMenu: JQuery;

export function findMenus() {
    if (bottomMenu) return;
    bottomMenu = $("i:contains('call_end')");
    while (bottomMenu.width() < 100) bottomMenu = bottomMenu.parent();
}