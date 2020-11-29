var log       = require("./../utils/log");
var user      = require("./user/_dir");
var eve       = require("./eve/_dir");

module.exports = {
    echo: function (_connectionId, _responseId, _event) {
        log(log.INFO, "echo HANDLER");

        server.send(_connectionId, _responseId, {
            eventType: "echoResponse",
            echo: _event
        });
    },
    user: user,
    eve: eve,
};
