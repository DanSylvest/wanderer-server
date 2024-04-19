/* eslint-disable */
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

  trace: true,
  err: true,
  warn: true,
  info: true,
  debug: true,
};

const convert = function (_count, _num) {
  let result = _num.toString();
  const diff = _count - result.length;
  if (diff == 0) return result;
  let a = 0;
  while (a++ < diff) result = `0${result}`;
  return result;
};

const log_level = 0;
const show_time = true;
const log = function () {
  if (!logging) return;

  const args = Array.prototype.slice.call(arguments);
  const level = args.shift();
  if (level < log_level) return;
  let status = '';
  let command = '';
  let color = '';

  let enable = true;

  switch (level) {
    case log.TRACE:
      status = 'TRACE';
      command = 'trace';
      color = 'magenta';
      enable = global._.trace === true;
      break;
    case log.ERR:
      status = 'ERROR';
      command = 'error';
      color = 'red';
      enable = global._.err === true;
      break;
    case log.WARN:
      status = 'WARNING';
      command = 'warn';
      color = 'orange';
      enable = global._.warn === true;
      break;
    case log.INFO:
      status = 'INFO';
      command = 'info';
      color = 'yellow';
      enable = global._.info === true;
      break;
    case log.DEBUG:
      status = 'DEBUG';
      command = 'log';
      color = 'blue';
      enable = global._.debug === true;
      break;
  }

  if (!enable) return;

  const time = new Date();

  const h = convert(2, time.getHours());
  const m = convert(2, time.getMinutes());
  const s = convert(2, time.getSeconds());
  const ms = convert(4, time.getMilliseconds());

  const time_string = `${h}:${m}:${s}:${ms}`;
  const left = '[';
  const right = ']';
  const left_2 = '(';
  const right_2 = ')';
  const space = '  ';

  const res_time_string = left + (show_time ? ColorRGB.green(time_string) : '') + right;
  const info_string = left_2 + ColorRGB[color](status) + right_2;

  args[0] = res_time_string + info_string + space + args[0];
  console[command].apply(console, args);
};

log.TRACE = 0;
log.ERR = 1;
log.WARN = 2;
log.INFO = 3;
log.DEBUG = 4;

const to_rgb = function (_text, _r, _g, _b) {
  return `\x1b[38;2;${_r};${_g};${_b}m${_text}\x1b[0m`;
};

var ColorRGB = {
  white(_text) {
    return to_rgb(_text, 255, 255, 255);
  },
  red(_text) {
    return to_rgb(_text, 255, 55, 55);
  },
  green(_text) {
    return to_rgb(_text, 55, 255, 55);
  },
  magenta(_text) {
    return to_rgb(_text, 155, 55, 255);
  },
  blue(_text) {
    return to_rgb(_text, 55, 200, 255);
  },
  cyan(_text) {
    return to_rgb(_text, 155, 255, 225);
  },
  purple(_text) {
    return to_rgb(_text, 155, 0, 225);
  },
  pink(_text) {
    return to_rgb(_text, 255, 55, 225);
  },
  orange(_text) {
    return to_rgb(_text, 255, 155, 55);
  },
  yellow(_text) {
    return to_rgb(_text, 255, 255, 55);
  },
};

module.exports = log;
