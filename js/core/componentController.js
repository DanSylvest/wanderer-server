var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");
var Path         = require("./../env/tools/path");
var fs           = require("fs");

var ComponentController = classCreator("ComponentController", Emitter, {
    constructor: function ComponentController() {
        Emitter.prototype.constructor.call(this);

        var path = Path.fromBackSlash(__dirname);
        path.pop();
        path["+="](["components", "dir.json"]);

        this._componentsDescription = JSON.parse(fs.readFileSync(path.toString(), 'utf8'));

        this._prepare();
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    _prepare: function () {

    },
    get: function (_name) {
        var cDesc = this.find(_name);

        if(cDesc === -1)
            return null;

        var path = Path.fromBackSlash(__dirname);
        path.pop();
        path["+="](["components", cDesc.path + ".js"]);

        return fs.readFileSync(path.toString(), 'utf8');
    },
    isProtected: function () {

    },
    find: function (_name) {
        for (var a = 0; a < this._componentsDescription.length; a++) {
            if(this._componentsDescription[a].name === _name) {
                return this._componentsDescription[a];
            }
        }

        return -1;
    },
    getPath: function (_name) {
        var cDesc = this.find(_name);

        if(cDesc === -1)
            return null;

        return new Path(["components", cDesc.path]).toString();
    }
});

module.exports = ComponentController;