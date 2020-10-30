/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/28/20.
 */

var levelup       = require('levelup');
var leveldown     = require('leveldown');
var CustomPromise = require("./env/promise");

var test = async function () {
    var db = levelup(leveldown("./kek"));

    var prarr = [];
    prarr.push(db.put("kek", "wrek"));
    prarr.push(db.put("kek1", "wrek1"));
    prarr.push(db.put("kek2", "wrek2"));
    prarr.push(db.put("kek3", "wrek3"));
    prarr.push(db.put("kek4", "wrek4"));

    await Promise.all(prarr);


    var prarr2 = [];
    prarr2.push(db.get("kek", {asBuffer: false}));
    prarr2.push(db.get("kek1", {asBuffer: false}));
    prarr2.push(db.get("kek2", {asBuffer: false}));
    prarr2.push(db.get("kek3", {asBuffer: false}));
    prarr2.push(db.get("kek4", {asBuffer: false}));

    var iter = new IteratorWrapper(db, {gte: "", keyAsBuffer: false, valueAsBuffer: false});

    var res = null;
    while((res = await iter.next())) {
        console.log(JSON.stringify(res));
    }


};


var IteratorWrapper = function (_db, _options) {
    this._itr = _db.iterator(_options);
};

IteratorWrapper.prototype = {
    next: function () {
        var pr = new CustomPromise();

        this._itr.next(function (_err, _key, _val) {
            if(_key === undefined) {
                pr.resolve(null);
            } else {
                pr.resolve({
                    key: _key,
                    val: _val,
                });
            }
        });

        return pr.native;
    }
};

// test();