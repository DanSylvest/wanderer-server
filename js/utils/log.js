/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 4/11/20.
 */

global.logging = true;
global._ = {
    // trace : false,
    // err : false,
    // warn : true,
    // info : false,
    // debug : false,

    trace : true,
    err : true,
    warn : true,
    info : true,
    debug : true,
}
var log_level = 0;
var show_time = true;
var log = function () {
    if(!logging)
        return;

    var args = Array.prototype.slice.call(arguments);
    var level = args.shift();
    if (level < log_level) return;
    var status = "";
    var command = "";
    var color = "";

    var enable = true;

    switch (level) {
        case log.TRACE:
            status = "TRACE";
            command = "trace";
            color = "magenta";
            enable = global._.trace === true;
            break;
        case log.ERR:
            status = "ERROR";
            command = "error";
            color = "red";
            enable = global._.err === true;
            break;
        case log.WARN:
            status = "WARNING";
            command = "warn";
            color = "orange";
            enable = global._.warn === true;
            break;
        case log.INFO:
            status = "INFO";
            command = "info";
            color = "yellow";
            enable = global._.info === true;
            break;
        case log.DEBUG:
            status = "DEBUG";
            command = "log";
            color = "blue";
            enable = global._.debug === true;
            break;
    }

    if(!enable)
        return;

    var time = new Date();

    var h = convert(2, time.getHours());
    var m = convert(2, time.getMinutes());
    var s = convert(2, time.getSeconds());
    var ms = convert(4, time.getMilliseconds());

    var time_string = h + ":" + m + ":" + s + ":" + ms;
    var left = "[";
    var right = "]";
    var left_2 = "(";
    var right_2 = ")";
    var space = "  ";

    var res_time_string = left + (show_time ? ColorRGB.green(time_string) : "") + right;
    var info_string = left_2 + ColorRGB[color](status) + right_2;

    args[0] = res_time_string + info_string + space + args[0];
    console[command].apply(console, args);
};

var convert = function (_count, _num) {
    var result = _num.toString();
    var diff = _count - result.length;
    if(diff == 0) return result;
    var a = 0;
    while ( a++ < diff) result = "0" + result;
    return result;
};

log.TRACE = 0;
log.ERR = 1;
log.WARN = 2;
log.INFO = 3;
log.DEBUG = 4;

var to_rgb = function (_text, _r, _g, _b) {
    return "\x1b[38;2;" + _r + ";" + _g + ";" + _b + "m" + _text + "\x1b[0m";
};

var ColorRGB = {
    white: function (_text) {
        return to_rgb(_text, 255, 255, 255);
    },
    red: function (_text) {
        return to_rgb(_text, 255, 55, 55);
    },
    green: function (_text) {
        return to_rgb(_text, 55, 255, 55);
    },
    magenta: function (_text) {
        return to_rgb(_text, 155, 55, 255);
    },
    blue: function (_text) {
        return to_rgb(_text, 55, 200, 255);
    },
    cyan: function (_text) {
        return to_rgb(_text, 155, 255, 225);
    },
    purple: function (_text) {
        return to_rgb(_text, 155, 0, 225);
    },
    pink: function (_text) {
        return to_rgb(_text, 255, 55, 225);
    },
    orange: function (_text) {
        return to_rgb(_text, 255, 155, 55);
    },
    yellow: function (_text) {
        return to_rgb(_text, 255, 255, 55);
    }
};

module.exports = log;