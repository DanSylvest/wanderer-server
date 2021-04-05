/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const Emitter       = require("./../../env/tools/emitter");
const classCreator  = require("./../../env/tools/class");
const CustomPromise = require("./../../env/promise");
const SEARCH_LIMIT = 12;

const Controller = classCreator("CorporationsController", Emitter, {
    constructor: function CorporationsController() {
        Emitter.prototype.constructor.call(this);
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

        let ids = result.corporation || [];

        if(ids.length > SEARCH_LIMIT)
            ids = ids.slice(0, SEARCH_LIMIT);

        let infoArr = await Promise.all(ids.map(x => core.esiApi.corporation.info(x)));

        let out = infoArr.map((x, index) => ({
            id: ids[index],
            name: x.name
        }));

        out.sort((a, b) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
        });

        return out;
    },

    getCorporationInfo: function (_corporationId) {
        var pr = new CustomPromise();

        core.esiApi.corporation.info(_corporationId).then(function(_result){
            pr.resolve({name: _result.name});
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },

    fastSearch: function (_options) {
        return this.searchInEve(_options.match);
    }
});


module.exports = Controller;