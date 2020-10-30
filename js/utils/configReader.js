var Emitter         = require("./../env/tools/emitter");
var classCreator    = require("./../env/tools/class");
var extend          = require("./../env/tools/extend");
var Path            = require("./../env/tools/path");
var fs              = require("fs");


var ConfReader = classCreator("ConfReader", Emitter, {
    constructor: function ConfReader(_folder) {
        Emitter.prototype.constructor.call(this);

        this.path = Path.fromBackSlash(global.projectPath)["+"](_folder.split("/"));
    },
    build: function () {
        var file = fs.readFileSync(this.path["+"]("main.json").toString(), "utf8");
        var confMain = JSON.parse(file);

        var dir = fs.readdirSync(this.path.toString());

        for (var a = 0; a < dir.length; a++) {
            var file = dir[a];

            if(file === "main.json")
                continue;

            file = fs.readFileSync(this.path["+"](file).toString(), "utf8");
            var conf = JSON.parse(file);

            extend(confMain, conf);
        }

        return confMain;
    },
});


module.exports = ConfReader;