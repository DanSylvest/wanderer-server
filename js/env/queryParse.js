const parseQuery = function (_query) {
  const out = Object.create(null);

  const variablesArr = _query.split("&");
  for (let a = 0; a < variablesArr.length; a++) {
    const keyValuesArr = variablesArr[a].split("=");

    out[keyValuesArr[0]] = keyValuesArr[1];
  }

  return out;
};

module.exports = parseQuery;
