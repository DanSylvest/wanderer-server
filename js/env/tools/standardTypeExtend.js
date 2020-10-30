/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/23/20.
 */

Array.prototype.removeByIndex = function removeByIndex (index) {
    this[index] = this[this.length - 1];
    this.pop();
};

Array.prototype.searchByObjectKey = function (_key, _value) {
    for (var a = 0; a < this.length; a++) {
        if(this[a][_key] && this[a][_key] === _value)
            return this[a];
    }

    return null;
};

Array.prototype.merge = function (_arr) {
    for (var a = 0; a < _arr.length; a++) {
        if(this.indexOf(_arr[a]) === -1)
            this.push(_arr[a]);
    }

    return this;
};

Array.cross = function (_a, _b) {
    var out = [];
    for (var a = 0; a < _a.length; a++) {
        if(_b.indexOf(_a[a]) !== -1) {
            out.push(_a[a]);
        }
    }
    return out;
};