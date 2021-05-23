/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

var Emitter       = require("./../../env/tools/emitter");
var classCreator  = require("./../../env/tools/class");
const NodeCache   = require( "node-cache" );

var Controller = classCreator("AlliancesController", Emitter, {
    constructor: function AlliancesController() {
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
    searchInEve: async function (_match) {
        let result = Object.create(null);

        try {
            result = await core.esiApi.search(["alliance"], _match);
        } catch (e) {
            return [];
        }

        let ids = result.alliance && result.alliance.slice(0, 15) || [];
        let infoArr = await Promise.all(ids.map(x => this.getPublicAllianceInfo(x)));

        let out = infoArr.map((x, index) => ({
            id: ids[index],
            name: x.name
        }));

        out.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));

        return out;
    },

    async getPublicAllianceInfo (allianceId) {
        if(this.infoCache.has(allianceId)) {
            return this.infoCache.get(allianceId);
        } else {
            let info = await core.esiApi.alliance.info(allianceId);
            this.infoCache.set(allianceId, info);
            return info;
        }
    },

    fastSearch: function (_options) {
        return this.searchInEve(_options.match);
    }
});


module.exports = Controller;