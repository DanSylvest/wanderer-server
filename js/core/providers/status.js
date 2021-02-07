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
        core.esiApi.status().then(function(_event){
            this._notify({
                online: _event.online,
                players: _event.players,
                server_version: _event.server_version,
                start_time: _event.start_time,
                vip: _event.vip,
            });
        }.bind(this), function(_err){
            log(log.INFO, "Was next in StatusObserver");
            this._next();
        }.bind(this));
    }
});

module.exports = Location;