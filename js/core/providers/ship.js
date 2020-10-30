/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Provider        = require("./../../utils/provider");
var classCreator    = require("./../../env/tools/class");
var extend          = require("./../../env/tools/extend");
var log             = require("./../../utils/log");

var Ship = classCreator("Ship", Provider, {
    constructor: function Ship(_options) {
        var base = extend({
            /** @type Number - this is a character identifier */
            characterId: null,
            name: "ShipObserver",
            timeout: 5000
        }, _options);

        Provider.prototype.constructor.call(this, base);
    },
    _sendRequest: function () {
        core.esiApi.location.ship(this._token, this.options.characterId).then(function(_event){
            this._notify(_event.shipTypeId);
        }.bind(this), function(_err){
            log(log.INFO, "Was next in Ship for %s", this.options.characterId);
            this._next();
        }.bind(this));
    }
});

module.exports = Ship;