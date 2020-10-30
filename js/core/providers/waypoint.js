/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Provider        = require("./../../utils/provider");
var classCreator    = require("./../../env/tools/class");
var extend          = require("./../../env/tools/extend");
var log             = require("./../../utils/log");

var Waypoint = classCreator("Waypoint", Provider, {
    constructor: function Location(_options) {
        var base = extend({
            /** @type Number - this is a destinationSolarSystem identifier */
            destinationId: null,
            clearOtherWaypoints: null,
            addToBeginning: null,
            name: "locationObserver",
            timeout: 500,
            isOnce: true
        }, _options);

        Provider.prototype.constructor.call(this, base);
    },
    _sendRequest: function () {
        core.esiApi.uiapi.waypoint(this._token, this.options.addToBeginning, this.options.clearOtherWaypoints, this.options.destinationId).then(function(){
            this._notify();
        }.bind(this), function(_err){
            log(log.INFO, "Was next in Waypoint for %s", this.options.destinationId);
            this._next();
        }.bind(this));
    }
});

module.exports = Waypoint;