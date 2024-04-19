/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 3/4/20.
 */

const classCreator = require("./class");
const exist = require("./exist");

const Path = classCreator(
  "Path",
  null,
  {
    constructor(_path, _isRelative) {
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
    copy() {
      return new Path(this._data.join("/"));
    },
    valueOf() {
      return this.toString();
    },
    toString() {
      if (this._isRelative) {
        return `./${this._data.join("/")}`;
      }
      return this._data.join("/");
    },
    slice(_index, _count) {
      return new Path(this._data.slice(_index, _count));
    },
    pop(returnThis) {
      const last = this.last();
      this._data = this._data.slice(0, this.size() - 1);
      return returnThis ? this : last;
    },
    size() {
      return this._data.length;
    },
    last() {
      return this._data[this._data.length - 1];
    },
    at(_index) {
      return this._data[_index];
    },
    getRelativeBy(_path) {
      const out = new Path(null, true);

      const _pathA = this.slice(0, this.size() - 1);
      const _pathB = _path.slice(0, _path.size() - 1);

      let state = 0;
      let a = 0;
      let isBreak = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        switch (state) {
          case 0:
            const hopA = _pathA.at(a);
            const hopB = _pathB.at(a);

            if (hopA !== hopB) {
              state = 1;
            } else {
              if (a === _pathA.size() - 1) state = 1;

              a++;
            }
            break;
          case 1:
            const count = _pathA.size() - a;

            for (let b = 0; b < count; b++) out["+="]("..");

            const pathB = _pathB.slice(a, _pathB.size());
            out["+="](pathB);
            out["+="](_path.last());

            isBreak = true;
            break;
        }

        if (isBreak) break;
      }

      return out;
    },
  },
  {
    fromBackSlash(_path) {
      return new Path(_path.split("\\").join("/"));
    },
  },
);

module.exports = Path;
