const log = require("../utils/log");
const user = require("./user/_dir");
const eve = require("./eve/_dir");

module.exports = {
  echo(_connectionId, _responseId, _event) {
    log(log.INFO, "echo HANDLER");

    server.send(_connectionId, _responseId, {
      eventType: "echoResponse",
      echo: _event,
    });
  },
  user,
  eve,
};
