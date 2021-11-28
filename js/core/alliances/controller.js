/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const Emitter = require("./../../env/_new/tools/emitter");
const NodeCache = require("node-cache");

class AlliancesController extends Emitter {
    constructor() {
        super();

        this.infoCache = new NodeCache({
            stdTTL: 60 * 60,
            checkperiod: 60 * 10,
            useClones: false,
        });
    }
    async searchInEve(_match) {
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
            name: x.name,
        }));

        out.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));

        return out;
    }

    async getPublicAllianceInfo(allianceId) {
        if (this.infoCache.has(allianceId)) {
            return this.infoCache.get(allianceId);
        } else {
            let info = await core.esiApi.alliance.info(allianceId);
            this.infoCache.set(allianceId, info);
            return info;
        }
    }

    fastSearch(_options) {
        return this.searchInEve(_options.match);
    }
}

module.exports = AlliancesController;