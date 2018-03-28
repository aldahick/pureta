const pureta = require("./lib/index");
for (var key in pureta) {
    if (!exports.hasOwnProperty(key)) {
        exports[key] = pureta[key];
    }
}
