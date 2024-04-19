/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/17/20.
 */

class Storage {
  _bindings = Object.create(null);

  set(_key, _value) {
    this._bindings[_key] = _value;
  }

  get(_key) {
    return this._bindings[_key];
  }

  has(_key) {
    return !!this._bindings[_key];
  }

  del(_key) {
    delete this._bindings[_key];
  }
}

module.exports = Storage;
