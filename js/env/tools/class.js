/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 2/12/20.
 */

var create_class = function(_name, _proto, _members, _static) {
    if (!_members) {
        _proto = null;
        _members = _proto;
    }

    var t = Function("return function " + _name + "(){"+ _name + ".prototype.constructor.apply(this, arguments)}")();
    t.prototype = Object.create(_proto ? _proto.prototype : base.prototype);

    for (var key in _members)
        t.prototype[key] = _members[key];

    if(_static !== undefined && _static !== null) {
        for(var k in _static)
            t[k] = _static[k];
    }

    return t;
};

var base = function(){};
base.prototype = {
    __instance: true
};

module.exports = create_class;