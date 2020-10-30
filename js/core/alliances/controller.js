/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

var Emitter       = require("./../../env/tools/emitter");
var classCreator  = require("./../../env/tools/class");
var CustomPromise = require("./../../env/promise");

var countForShow = 12;

var Controller = classCreator("AlliancesController", Emitter, {
    constructor: function AlliancesController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    searchInEve: async function (_match) {
        var pr = new CustomPromise();

        try {
            var prarr = [];
            var searchResult = await core.esiApi.search(["alliance"], _match);
            var allianceIds = searchResult.alliance || [];

            for (let a = 0; a < countForShow && a < allianceIds.length; a++)
                prarr.push(core.esiApi.alliance.info(allianceIds[a]));

            var arrResults = await Promise.all(prarr);
            var out = [];
            for (let a = 0; a < arrResults.length; a++) {
                if (arrResults[a].name.indexOf(_match) === -1)
                    continue;

                out.push({id: allianceIds[a], name: arrResults[a].name});
            }

            out.sort(function (a, b) {
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0
            });

            pr.resolve(out);
        } catch (_err) {
            pr.reject(_err);
        }

        return pr.native;
    },

    getInfo: function (_allianceId) {
        var pr = new CustomPromise();

        core.esiApi.alliance.info(_allianceId).then(function(_result){
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