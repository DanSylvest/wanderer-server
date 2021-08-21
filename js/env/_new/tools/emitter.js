/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/12/20.
 */

class Emitter {
    _handlers = Object.create(null);
    _types = Object.create(null);
    _counter = 0;

    destructor() {
        this._handlers = Object.create(null);
        this._types = Object.create(null);
        this._counter = 0;
    }

    on(_type, _func) {
        if (!(_func instanceof Function))
            throw "_func in not a function";

        const hid = this._counter++;
        this._handlers[hid] = {
            type: _type,
            func: _func
        };

        if (!this._types[_type])
            this._types[_type] = [];

        this._types[_type].push(hid);

        return hid;
    }

    off(_hid) {
        if (this._handlers[_hid]) {
            const info = this._handlers[_hid];
            const index = this._types[info.type].indexOf(_hid);
            this._types[info.type].splice(index, 1);
        }
    }

    emit() {
        const type = arguments[0];
        if (this._types[type]) {
            let safe = this._types[type].slice(0);
            for (var a = 0; a < safe.length; a++)
                this._handlers[safe[a]].func.apply(null, Array.prototype.slice.call(arguments, 1));
        }
    }

    emitByHandler() {
        const handler = arguments[0];
        this._handlers[handler].func.apply(null, Array.prototype.slice.call(arguments, 1));
    }
}

module.exports = Emitter;