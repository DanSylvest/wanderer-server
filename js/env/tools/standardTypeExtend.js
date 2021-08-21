/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/23/20.
 */

Array.prototype.removeByIndex = function removeByIndex(index) {
    this[index] = this[this.length - 1];
    this.pop();
};

Array.prototype.removeByValue = function removeByValue(value) {
    let index = this.indexOf(value);
    index !== -1 && this.removeByIndex(index);
}

Array.prototype.exists = function exists(value) {
    let index = this.indexOf(value);
    return index !== -1 ? value : undefined;
}

Array.prototype.searchByObjectKey = function (_key, _value) {
    for (var a = 0; a < this.length; a++) {
        if (this[a][_key] && this[a][_key] === _value)
            return this[a];
    }

    return null;
};

Array.prototype.eraseByObjectKey = function (_key, _value) {
    for (var a = 0; a < this.length; a++) {
        if (exists(this[a][_key]) && this[a][_key] === _value) {
            this.splice(a, 1);
            return true;
        }
    }

    return false;
};

Array.prototype.merge = function (_arr) {
    // let map = this.convertToMap();

    for (var a = 0; a < _arr.length; a++) {
        if (this.indexOf(_arr[a]) === -1)
            this.push(_arr[a]);
    }

    return this;
};

Array.prototype.convertToMap = function (callback) {
    let out = Object.create(null);

    if (!callback) {
        for (let a = 0; a < this.length; a++)
            out[this[a]] = true;
    } else {
        for (let a = 0; a < this.length; a++)
            out[callback(this[a], a)] = true;
    }

    return out;
}

Array.cross = function (_a, _b) {
    let arrMap = _a.convertToMap();
    let out = [];
    for (let a = 0; a < _b.length; a++)
        arrMap[_b[a]] && out.push(_b[a]);

    return out;
};

Array.prototype.subtract = function (arr) {
    let arrMap = arr.convertToMap();

    for (let a = 0; a < this.length; a++)
        if (arrMap[this[a]])
            delete arrMap[this[a]];
        else
            arrMap[this[a]] = true;

    return Object.keys(arrMap);
}

var exists = function (_var) {
    var cond0 = _var !== undefined;
    var cond1 = _var !== null;
    var cond3 = _var === _var;
    return cond1 && cond0 && cond3;
};


Array.prototype.diff = function (arr) {
    let removed = this.filter(x => !arr.includes(x));
    let added = arr.filter(x => !this.includes(x));
    return {removed: removed, added: added};
}
