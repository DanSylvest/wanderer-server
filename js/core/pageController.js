const fs = require("fs");
const Emitter = require("../env/tools/emitter");
const classCreator = require("../env/tools/class");
const Path = require("../env/tools/path");

const PageController = classCreator("PageController", Emitter, {
  constructor: function PageController() {
    Emitter.prototype.constructor.call(this);

    const path = Path.fromBackSlash(__dirname);
    path.pop();
    path["+="](["pages", "dir.json"]);

    this._pagesDescription = JSON.parse(
      fs.readFileSync(path.toString(), "utf8"),
    );
  },
  destructor() {
    Emitter.prototype.destructor.call(this);
  },
  get(_pageName) {
    const cDesc = this.find(_pageName);

    if (cDesc === -1) return null;

    const path = Path.fromBackSlash(__dirname);
    path.pop();
    path["+="](["pages", `${_pageName}.js`]);

    return fs.readFileSync(path.toString(), "utf8");
  },
  isProtected(_pageName) {
    const cDesc = this.find(_pageName);

    return !cDesc.public;
  },
  find(_pageName) {
    for (let a = 0; a < this._pagesDescription.length; a++) {
      if (this._pagesDescription[a].pageName === _pageName) {
        return this._pagesDescription[a];
      }
    }

    return -1;
  },
});

module.exports = PageController;
