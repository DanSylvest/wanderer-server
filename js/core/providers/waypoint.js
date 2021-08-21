/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const Provider = require("./../../utils/_new/provider");
const extend = require("./../../env/tools/extend");
const log = require("./../../utils/log");

class Waypoint extends Provider {
    constructor(_options) {
        super(extend({
            /** @type Number - this is a destinationSolarSystem identifier */
            destinationId: null,
            clearOtherWaypoints: null,
            addToBeginning: null,
            name: "locationObserver",
            timeout: 500,
            isOnce: true
        }, _options));
    }

    _sendRequest() {
        core.esiApi.uiapi.waypoint(
            this._token,
            this.options.addToBeginning,
            this.options.clearOtherWaypoints,
            this.options.destinationId
        )
            .then(
                () => this._notify(),
                () => {
                    log(log.INFO, "Was next in Waypoint for %s", this.options.destinationId);
                    this._next();
                }
            );
    }
}

module.exports = Waypoint;