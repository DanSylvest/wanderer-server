/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 11/14/20.
 */

const exist = require("./tools/exist");

class MultiObject {
    constructor () {
        this._items = Object.create(null);
    }

    update (key, val) {
        if(!exist(this._items[key])) {
            this._items[key] = [];
        }

        this._items[key].push(val);
    }

    delete (key, val) {
        if(!exist(val))
            delete this._items[key];

        let index = this._items[key].indexOf(val);
        index !== -1 && this._items[key].removeByIndex(index);

        this._items[key].length === 0 && delete this._items[key];

        return this.count(key);
    }

    has (key, val) {
        if(!exist(val) && !exist(this._items[key]))
            return false;

        if(exist(val) && !exist(this._items[key]) || this._items[key].indexOf(val) === -1) {
            return false;
        }

        return true;
    }

    count (key) {
        let count = 0;

        if(exist(this._items[key])) {
            count = this._items[key].length;
        }

        return count;
    }

    forEach (callback) {
        for(let key in this._items) {
            callback(key, this._items[key]);
        }
    }

}

module.exports = MultiObject;