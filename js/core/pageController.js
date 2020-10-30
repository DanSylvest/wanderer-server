var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");
var Path         = require("./../env/tools/path");
var fs           = require("fs");

var PageController = classCreator("PageController", Emitter, {
    constructor: function PageController() {
        Emitter.prototype.constructor.call(this);

        var path = Path.fromBackSlash(__dirname);
        path.pop();
        path["+="](["pages", "dir.json"]);

        this._pagesDescription = JSON.parse(fs.readFileSync(path.toString(), 'utf8'));
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    get: function (_pageName) {
        var cDesc = this.find(_pageName);

        if(cDesc === -1)
            return null;

        var path = Path.fromBackSlash(__dirname);
        path.pop();
        path["+="](["pages", _pageName + ".js"]);

        return fs.readFileSync(path.toString(), 'utf8');
    },
    isProtected: function (_pageName) {
        var cDesc = this.find(_pageName);

        return !cDesc.public;
    },
    find: function (_pageName) {
        for (var a = 0; a < this._pagesDescription.length; a++) {
            if(this._pagesDescription[a].pageName === _pageName) {
                return this._pagesDescription[a];
            }
        }

        return -1;
    }
});

module.exports = PageController;