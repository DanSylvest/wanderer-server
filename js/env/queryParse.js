var parseQuery = function (_query) {
    var out = Object.create(null);

    var variablesArr = _query.split("&");
    for (var a = 0; a < variablesArr.length; a++) {
        var keyValuesArr = variablesArr[a].split("=");
        out[keyValuesArr[0]] = keyValuesArr[1];
    }

    return out;
};

module.exports = parseQuery;