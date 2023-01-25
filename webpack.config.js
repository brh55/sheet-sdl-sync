const path = require("path");

module.exports = {
    mode: "production",
    entry: {
        main: path.resolve("./src", "Modules.js")
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "Bundle-Modules.js",
        library: {
            name: "Modules",
            type: "var"
        }
    }
}
