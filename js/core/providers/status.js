/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Provider        = require("./../../utils/provider");
var classCreator    = require("./../../env/tools/class");
var extend          = require("./../../env/tools/extend");
var log             = require("./../../utils/log");

// {"error":"Timeout contacting tranquility","timeout":10}
var Location = classCreator("Location", Provider, {
    constructor: function Location(_options) {
        var base = extend({
            name: "statusObserver",
            timeout: 20000
        }, _options);

        Provider.prototype.constructor.call(this, base);
    },
    _sendRequest: function () {
        core.esiApi.status()
            .then(
                event => {
                    this._notify({
                        online: event.online,
                        players: event.players,
                        server_version: event.server_version,
                        start_time: event.start_time,
                        vip: event.vip,
                    });
                },
                err => {
                    if(err.errno === -3001) { // when EAI_AGAIN
                        this._notify({
                            online: false,
                            players: 0,
                            server_version: "",
                            start_time: "",
                            vip: false,
                        });
                    } else {
                        log(log.INFO, "Was next in StatusObserver");
                        this._next();
                    }
                }
            );
    }
});

module.exports = Location;