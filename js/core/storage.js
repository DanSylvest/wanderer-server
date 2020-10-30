/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/17/20.
 */

var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");

var Storage = classCreator("Storage", Emitter, {
    constructor: function Storage() {
        Emitter.prototype.constructor.call(this);

        // this is temp data. it will clear each restart or when token expired
        this._bindings = Object.create(null);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    set: function (_key, _value) {
        this._bindings[_key] = _value;
    },
    get: function (_key) {
        return this._bindings[_key];
    },
    has: function (_key) {
        return !!this._bindings[_key];
    },
    del: function (_key) {
        delete this._bindings[_key];
    }
});

module.exports = Storage;