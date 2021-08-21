/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 3/3/21.
 */
const Emitter       = require("./../../../env/_new/tools/emitter");
const mapSqlActions = require("./../sql/mapSqlActions.js");

const DELAY = 1000 * 60;         // 1 minute - this delay for pass
const LINK_EOL_DELTA = 10800000; // 3 hours
const LINK_LIFETIME = 86400000;  // 24 hours
const LINK_EOL = LINK_LIFETIME - LINK_EOL_DELTA;

class ChainsManager extends Emitter {
    constructor(mapId) {
        super();

        this._mapId = mapId;
        this._timeoutId = -1;
    }

    destructor() {
        if(this._timeoutId === -1) {
            clearTimeout(this._timeoutId);
            this._timeoutId = -1;
        }

        super.destructor();
    }

    start() {
        this._startTimeout();
    }

    _startTimeout() {
        this._timeoutId = setTimeout(this._tick.bind(this), DELAY);
    }

    async _tick() {
        let links = await mapSqlActions.getLinksWithData(this._mapId, ["timeStatus", "created", "updated"]);
        let changedChains = [];
        const currentTime = +new Date;

        for (let a = 0; a < links.length; a++) {
            let lastUpdate = +new Date(links[a].updated);

            if (links[a].timeStatus === 0) {
                let isEOL = currentTime > lastUpdate + LINK_EOL && currentTime < lastUpdate + LINK_LIFETIME;
                let isExpire = currentTime > lastUpdate + LINK_LIFETIME;

                if (isEOL) {
                    changedChains.push({id: links[a].id, newState: "EOL"});
                } else if (isExpire) {
                    changedChains.push({id: links[a].id, newState: "Expired"});
                }
            } else {
                let isExpire = currentTime > lastUpdate + LINK_EOL_DELTA;
                if (isExpire)
                    changedChains.push({id: links[a].id, newState: "Expired"});
            }
        }

        if (changedChains.length > 0)
            this.emit("changedChains", changedChains);

        this._startTimeout();
    }
}

module.exports = ChainsManager;