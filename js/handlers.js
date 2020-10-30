var log       = require("./utils/log");
var page      = require("./api/page");
var component = require("./api/component");
var user      = require("./api/user");
var eve       = require("./api/eve");

module.exports = {
    echo: function (_connectionId, _responseId, _event) {
        log(log.INFO, "echo HANDLER");

        server.send(_connectionId, _responseId, {
            eventType: "echoResponse",
            echo: _event
        });
    },
    page: page,
    component: component,
    user: user,
    eve: eve,
};
