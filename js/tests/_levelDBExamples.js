/* eslint-disable */

/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/28/20.
 */

const levelup = require('levelup');
const leveldown = require('leveldown');
const CustomPromise = require('./env/promise');

const test = async function () {
  const db = levelup(leveldown('./kek'));

  const prarr = [];
  prarr.push(db.put('kek', 'wrek'));
  prarr.push(db.put('kek1', 'wrek1'));
  prarr.push(db.put('kek2', 'wrek2'));
  prarr.push(db.put('kek3', 'wrek3'));
  prarr.push(db.put('kek4', 'wrek4'));

  await Promise.all(prarr);

  const prarr2 = [];
  prarr2.push(db.get('kek', { asBuffer: false }));
  prarr2.push(db.get('kek1', { asBuffer: false }));
  prarr2.push(db.get('kek2', { asBuffer: false }));
  prarr2.push(db.get('kek3', { asBuffer: false }));
  prarr2.push(db.get('kek4', { asBuffer: false }));

  const iter = new IteratorWrapper(db, { gte: '', keyAsBuffer: false, valueAsBuffer: false });

  let res = null;
  while ((res = await iter.next())) {
    console.log(JSON.stringify(res));
  }
};

const IteratorWrapper = function (_db, _options) {
  this._itr = _db.iterator(_options);
};

IteratorWrapper.prototype = {
  next() {
    const pr = new CustomPromise();

    this._itr.next((_err, _key, _val) => {
      if (_key === undefined) {
        pr.resolve(null);
      } else {
        pr.resolve({
          key: _key,
          val: _val,
        });
      }
    });

    return pr.native;
  },
};

// test();
