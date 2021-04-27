var exports = {};
function require(module) {
    if (module == "jquery") return $;
    return exports;
}