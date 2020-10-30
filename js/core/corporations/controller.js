/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/21/20.
 */

var Emitter       = require("./../../env/tools/emitter");
var classCreator  = require("./../../env/tools/class");
var CustomPromise = require("./../../env/promise");

var Controller = classCreator("CorporationsController", Emitter, {
    constructor: function CorporationsController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    searchInEve: function (_match) {
        var pr = new CustomPromise();

        var countForShow = 12;
        var corporationIds = [];

        core.esiApi.search(["corporation"], _match).then(function(_event){
            corporationIds = _event.corporation || [];

            var prarr = [];
            for (var a = 0; a < countForShow && a < corporationIds.length; a++) {
                prarr.push(core.esiApi.corporation.info(corporationIds[a]));
            }

            return Promise.all(prarr);
        }.bind(this), function(_err){
            debugger;
        }.bind(this)).then(function(_arr){
            var out = [];
            for (var a = 0; a < _arr.length; a++) {
                if(_arr[a].name.indexOf(_match) === -1)
                    continue;

                out.push({
                    id: corporationIds[a],
                    name: _arr[a].name
                });
            }

            out.sort(function(a, b) {
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0
            });

            pr.resolve(out);
        }.bind(this), function(_err){
            debugger;
        }.bind(this));

        return pr.native;
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