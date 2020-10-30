var print_f = function () {
    var r_str = "";
    var next = arguments[0];

    var rx = /(%[a-zA-Z]{1})/;
    var a = 1, match;
    while (match = rx.exec(next)) {
        var prev = next.substring(0, match.index);
        var macro = next.substring(match.index + 1, match.index + 2);
        next = next.substring(match.index + 2, next.length);
        r_str += prev;

        var arg = arguments[a];

        if(arg !== undefined) {
            switch (macro) {
                case "s":
                    if(arg.toString) r_str += arg.toString();
                    break;
                case "b":
                    r_str += arg.toString();
                    break;
                default:
                    r_str += "%" + macro;
                    break;
            }
        } else {
            r_str += "%" + macro;
        }
        a++;
    }

    r_str += next;

    return r_str;
};

module.exports = print_f;