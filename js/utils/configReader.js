const fs = require("fs");
const Emitter = require("../env/tools/emitter");
const classCreator = require("../env/tools/class");
const extend = require("../env/tools/extend");
const Path = require("../env/tools/path");

const ConfReader = classCreator("ConfReader", Emitter, {
  constructor: function ConfReader(_folder) {
    Emitter.prototype.constructor.call(this);

    const path = Path.fromBackSlash(__dirname);
    path.pop();
    this.path = path["+"](_folder.split("/"));
  },
  build() {
    let file = fs.readFileSync(this.path["+"]("main.json").toString(), "utf8");
    const confMain = JSON.parse(file);

    const dir = fs.readdirSync(this.path.toString());

    for (let a = 0; a < dir.length; a++) {
      const filePath = dir[a];

      if (filePath === "main.json") {
        continue;
      }

      file = fs.readFileSync(this.path["+"](filePath).toString(), "utf8");
      const conf = JSON.parse(file);

      extend(confMain, conf);
    }

    return confMain;
  },
});

module.exports = ConfReader;
