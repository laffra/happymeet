"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function resize(bubble, size) {
    bubble.node
        .css({
        width: size,
        height: size,
        fontSize: 10 + size / 11,
    });
    bubble.node.find(".clip")
        .css({
        width: size,
        height: size,
    });
}
exports.resize = resize;
function makeResizable(bubble) {
    var x;
    var width;
    var down;
    function startResize(resizer, size) {
        resizer.css({
            top: -100 * size,
            left: -100 * size,
            width: 200 * size,
            height: 200 * size,
            zIndex: 1,
        });
    }
    function endResize() {
        down = false;
        bubble.node.find(".resizer").css({
            top: -9,
            left: -9,
            width: bubble.node.width(),
            height: bubble.node.width(),
            zIndex: 0,
        });
    }
    bubble.node.find(".clip").before($("<div>")
        .addClass("resizer")
        .on("mousedown", function (event) {
        x = event.clientX;
        width = bubble.node.width();
        down = event.which == 1;
        startResize($(this), bubble.node.width());
        event.stopPropagation();
    })
        .on("mousemove", function (event) {
        if (!down)
            return;
        resize(bubble, Math.max(100, width + event.clientX - x));
        bubble.changed("User resized bubble");
        event.stopPropagation();
    })
        .on("mouseleave", endResize)
        .on("mouseup", endResize));
    resize(bubble, bubble.node.width());
}
exports.makeResizable = makeResizable;
