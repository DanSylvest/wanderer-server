/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const Emitter       = require("./../../env/tools/emitter");
const classCreator  = require("./../../env/tools/class");
const NodeCache     = require( "node-cache" );
// const SEARCH_LIMIT = 12;

const Controller = classCreator("CorporationsController", Emitter, {
    constructor: function CorporationsController() {
        Emitter.prototype.constructor.call(this);

        this.infoCache = new NodeCache({
            stdTTL: 60 * 60,
            checkperiod: 60 * 10,
            useClones: false
        });
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    async searchInEve (_match) {
        let result = Object.create(null);

        try {
            result = await core.esiApi.search(["corporation"], _match);
        } catch (e) {
            return [];
        }

        let ids = result.corporation && result.corporation.slice(0, 15) || [];
        let infoArr = await Promise.all(ids.map(x => this.getPublicCorporationInfo(x)));
        let out = infoArr.map((x, index) => ({
            id: ids[index],
            name: x.name
        }));

        out.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));

        return out;
    },

    async getPublicCorporationInfo (corporationId) {
        if(this.infoCache.has(corporationId)) {
            return this.infoCache.get(corporationId);
        } else {
            let info = await core.esiApi.corporation.info(corporationId);
            this.infoCache.set(corporationId, info);
            return info;
        }
    },

    fastSearch: function (_options) {
        return this.searchInEve(_options.match);
    }
});


module.exports = Controller;