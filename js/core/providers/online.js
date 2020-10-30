/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Provider        = require("./../../utils/provider");
var classCreator    = require("./../../env/tools/class");
var extend          = require("./../../env/tools/extend");
var log             = require("./../../utils/log");

var Online = classCreator("Online", Provider, {
    constructor: function Online(_options) {
        var base = extend({
            /** @type Number - this is a character identifier */
            characterId: null,
            name: "onlineObserver",
            timeout: 10000
        }, _options);

        Provider.prototype.constructor.call(this, base);
    },
    _sendRequest: function () {
        core.esiApi.location.online(this._token, this.options.characterId).then(function(_event){
            this._notify(_event.online);
        }.bind(this), function(_err){
            log(log.INFO, "Was next in Online for %s", this.options.characterId);
            this._next();
        }.bind(this));
    }
});

module.exports = Online;