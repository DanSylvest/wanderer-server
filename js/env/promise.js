var promise = function ( ){
    var data = {
        is_cancel: false
    };

    this.__resolve = null;
    this.__reject = null;
    this.native = new Promise(function (_resolve, _reject) {
        this.__resolve = _resolve;
        this.__reject = _reject;
    }.bind(this));

    this.native.cancel = this._cancel.bind(this, data);

    this.native.then = this._then.bind(this, data);
    this.native.catch = this._catch.bind(this, data);

    this.resolve = function () {
        !data.is_cancel && this.__resolve.apply(this.native, arguments)
    };

    this.reject = function () {
        !data.is_cancel && this.__reject.apply(this.native, arguments)
    }
};

promise.prototype =  {
    _canceled_promise: function () {
        var pr = new promise();
        pr.native.cancel();
        return pr.native;
    },
    _process_callback : function (_data, _callback, _event) {
        if(!_data.is_cancel) {
            return _callback(_event);
        } else {
            return this._canceled_promise();
        }
    },
    _then: function (_data, _a, _b) {
        if(_data.is_cancel) {
            return this._canceled_promise();
        }

        if(_data.is_catched){
            _data.is_catched = false;
            return Promise.prototype.then.call(this.native, this._process_callback.bind(this, _data, _b));
        }

        return Promise.prototype.then.call(this.native, this._process_callback.bind(this, _data, _a), this._process_callback.bind(this, _data, _b));
    },
    _catch: function (_data, _a) {
        if(_data.is_cancel) {
            return this._canceled_promise();
        }

        _data.is_catched = true;
        return Promise.prototype.catch.call(this.native, this._process_callback.bind(this, _data, _a));
    },

    _cancel: function (_data) {
        _data.is_cancel = true;
    }
};

Promise.queue = function(_arr) {
    var out_pr = new promise();
    var q = _arr.concat();
    var result = [];

    var success = function (_result) {
        result.push(_result);
        exec();
    };

    var failure = function (_err) {
        out_pr.reject(_err);
    };

    var exec = function () {
        if (q.length === 0) {
            out_pr.resolve(result);
            return;
        }

        var el = q.shift();
        if(el instanceof Promise)
            el.then(success, failure);
        else {
            result.push(el);
            exec();
        }

    };

    exec();

    return out_pr.native;
};

module.exports = promise;