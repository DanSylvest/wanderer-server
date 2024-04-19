const exist = function (_var) {
  const cond0 = _var !== undefined;
  const cond1 = _var !== null;
  const cond3 = _var === _var;
  return cond1 && cond0 && cond3;
};

module.exports = exist;
