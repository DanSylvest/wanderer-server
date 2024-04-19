/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/12/20.
 */

const create_class = function (_name, _proto, _members, _static) {
  if (!_members) {
    _proto = null;
    _members = _proto;
  }

  const t = Function(
    `return function ${_name}(){${_name}.prototype.constructor.apply(this, arguments)}`,
  )();
  t.prototype = Object.create(_proto ? _proto.prototype : base.prototype);

  for (const key in _members) t.prototype[key] = _members[key];

  if (_static !== undefined && _static !== null) {
    for (const k in _static) t[k] = _static[k];
  }

  return t;
};

const base = function () {};
base.prototype = {
  __instance: true,
};

module.exports = create_class;
