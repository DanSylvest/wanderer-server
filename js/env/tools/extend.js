const extend = function (_left, _right) {
  const target = _left || {};

  if (_right === undefined) return target;

  for (const key in _right) {
    // eslint-disable-next-line no-prototype-builtins
    if (!_right.hasOwnProperty || _right.hasOwnProperty(key)) {
      if (
        _right[key] instanceof Object &&
        _right[key] &&
        _right[key].constructor === Object
      ) {
        if (_left[key] && _left[key] instanceof Object)
          target[key] = extend(_left[key], _right[key]);
        else target[key] = extend({}, _right[key]);
      } else target[key] = _right[key];
    }
  }

  return target;
};

module.exports = extend;
