const promise = function () {
  const data = {
    is_cancel: false,
  };

  this.__resolve = null;
  this.__reject = null;
  this.native = new Promise((_resolve, _reject) => {
    this.__resolve = _resolve;
    this.__reject = _reject;
  });

  this.native.cancel = this._cancel.bind(this, data);

  this.native.then = this._then.bind(this, data);
  this.native.catch = this._catch.bind(this, data);

  this.resolve = function () {
    !data.is_cancel && this.__resolve.apply(this.native, arguments);
  };

  this.reject = function () {
    !data.is_cancel && this.__reject.apply(this.native, arguments);
  };

  this.cancel = () => this._cancel(data);
};

promise.prototype = {
  _canceled_promise() {
    const pr = new promise();
    pr.native.cancel();
    return pr.native;
  },
  _process_callback(_data, _callback, _event) {
    if (!_data.is_cancel) {
      return _callback(_event);
    }
    return this._canceled_promise();
  },
  _then(_data, _a, _b) {
    if (_data.is_cancel) {
      return this._canceled_promise();
    }

    if (_data.is_catched) {
      _data.is_catched = false;
      return Promise.prototype.then.call(
        this.native,
        this._process_callback.bind(this, _data, _b),
      );
    }

    return Promise.prototype.then.call(
      this.native,
      this._process_callback.bind(this, _data, _a),
      this._process_callback.bind(this, _data, _b),
    );
  },
  _catch(_data, _a) {
    if (_data.is_cancel) {
      return this._canceled_promise();
    }

    _data.is_catched = true;
    return Promise.prototype.catch.call(
      this.native,
      this._process_callback.bind(this, _data, _a),
    );
  },

  _cancel(_data) {
    _data.is_cancel = true;
  },
};

Promise.queue = function (_arr) {
  const out_pr = new promise();
  const q = _arr.concat();
  const result = [];

  const success = function (_result) {
    result.push(_result);
    exec();
  };

  const failure = function (_err) {
    out_pr.reject(_err);
  };

  const exec = function () {
    if (q.length === 0) {
      out_pr.resolve(result);
      return;
    }

    const el = q.shift();
    if (el instanceof Promise) el.then(success, failure);
    else {
      result.push(el);
      exec();
    }
  };

  exec();

  return out_pr.native;
};

module.exports = promise;
