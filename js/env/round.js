const round = function (_value) {
  const d = _value % 1;
  if (d >= 0.5) return 1 - d + _value;
  return _value - d;
};

module.exports = round;
