/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

var Emitter       = require("./../../env/tools/emitter");
var classCreator  = require("./../../env/tools/class");

const SEARCH_LIMIT = 12;

var Controller = classCreator("AlliancesController", Emitter, {
    constructor: function AlliancesController() {
        Emitter.prototype.constructor.call(this);
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

        let ids = result.alliance || [];

        if(ids.length > SEARCH_LIMIT)
            ids = ids.slice(0, SEARCH_LIMIT);

        let infoArr = await Promise.all(ids.map(x => core.esiApi.alliance.info(x)));

        let out = infoArr.map((x, index) => ({
            id: ids[index],
            name: x.name
        }));

        out.sort((a, b) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
        });

        return out;
    },

    async getInfo (_allianceId) {
        let result = await core.esiApi.alliance.info(_allianceId);
        return {name: result.name};
    },

    fastSearch: function (_options) {
        return this.searchInEve(_options.match);
    }
});


module.exports = Controller;