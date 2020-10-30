/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 3/4/20.
 */

var classCreator = require("./class");
var exist        = require("./exist");

var Path = classCreator("Path", null, {
    constructor: function (_path, _isRelative) {
        this._data = [];
        this._isRelative = exist(_isRelative) ? _isRelative : false;

        if (exist(_path)) {
            if (typeof _path === "string" && _path !== "") {
                this._data = _path.split("/");
            } else if (_path instanceof Array) {
                this._data = _path;
            } else if (_path instanceof Path) {
                this["+="](_path);
            }
        }
    },
    "+=": function (_path) {
        if (_path instanceof Path) {
            this._data = this._data.concat(_path._data);
        } else if (typeof _path === "string") {
            this._data.push(_path);
        } else if (_path instanceof Array) {
            this._data = this._data.concat(_path);
        }

        return this;
    },
    "+": function (_path) {
        return this.copy()["+="](_path);
    },
    copy: function () {
        return new Path(this._data.join("/"));
    },
    valueOf: function () {
        return this.toString();
    },
    toString: function () {
        if(this._isRelative) {
            return "./" + this._data.join("/");
        } else {
            return this._data.join("/");
        }
    },
    slice: function (_index, _count) {
        return new Path(this._data.slice(_index, _count));
    },
    pop: function () {
        var last = this.last();
        this._data = this._data.slice(0, this.size() - 1);
        return last;
    },
    size: function () {
        return this._data.length;
    },
    last: function () {
        return this._data[this._data.length - 1];
    },
    at: function (_index) {
        return this._data[_index];
    },
    getRelativeBy: function (_path) {
        var out = new Path(null, true);

        var _pathA = this.slice(0, this.size() - 1);
        var _pathB = _path.slice(0, _path.size() - 1);

        var state = 0;
        var a = 0;
        var isBreak = false;
        while(true) {
            switch (state) {
                case 0:
                    var hopA = _pathA.at(a);
                    var hopB = _pathB.at(a);

                    if (hopA !== hopB) {
                        state = 1;
                    } else {
                        if (a === _pathA.size() - 1)
                            state = 1;

                        a++;
                    }
                    break;
                case 1:
                    var count = _pathA.size() - a;

                    for (var b = 0; b < count; b++)
                        out["+="]("..");

                    var pathB = _pathB.slice(a, _pathB.size());
                    out["+="](pathB);
                    out["+="](_path.last());

                    isBreak = true;
                    break;
            }

            if(isBreak)
                break;
        }

        return out;
    }
}, {
    fromBackSlash: function (_path) {
        return new Path(_path.split("\\").join("/"));
    }
});

module.exports = Path;