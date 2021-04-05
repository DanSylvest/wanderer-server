/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/12/20.
 */

var classCreator = require("./class");

var Emitter = classCreator("Emitter", null, {
    constructor: function () {
        this._counter = 0;
        this._handlers = Object.create(null);
        this._types = Object.create(null);
    },
    destructor: function(){
        this._handlers = Object.create(null);
        this._types = Object.create(null);
        this._counter = 0;
    },
    on: function (_type, _func) {
        if(!(_func instanceof Function))
            throw "_func in not a function";

        var hid = this._counter++;
        this._handlers[hid] = {
            type: _type,
            func: _func
        };

        if(!this._types[_type])
            this._types[_type] = [];

        this._types[_type].push(hid);

        return hid;
    },
    off: function (_hid) {
        if(this._handlers[_hid]){
            var info = this._handlers[_hid];
            var index = this._types[info.type].indexOf(_hid);
            this._types[info.type].splice(index, 1);
        }
    },
    emit: function () {
        var type = arguments[0];
        var args = Array.prototype.slice.call(arguments, 1);

        if(this._types[type]) {
            let safe = this._types[type].slice(0);
            for (var a = 0; a < safe.length; a++)
                this._handlers[safe[a]].func.apply(null, args);
        }
    },
    emitByHandler: function () {
        var handler = arguments[0];
        var args = Array.prototype.slice.call(arguments, 1);

        this._handlers[handler].func.apply(null, args);
    }
});

module.exports = Emitter;