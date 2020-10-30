var round = function (_value) {
    var d = (_value % 1);
    if(d >= 0.5)
        return 1 - d + _value;
    else
        return _value - d;
};

module.exports = round;