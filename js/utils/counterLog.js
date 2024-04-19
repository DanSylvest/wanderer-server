/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 11/29/20.
 */

const log = require("./log");

const counters = Object.create(null);
const counterLog = function (tag, text) {
  if (!counters[tag]) {
    counters[tag] = 0;
  }

  log(log.INFO, `[${tag}:${counters[tag]}]`, text);

  counters[tag]++;
};

module.exports = counterLog;
