var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var CustomPromise = require("./../env/promise");

var SdeController = classCreator("SdeController", Emitter, {
    constructor: function SdeController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },

    getAdditionalSystemInfo: async function (_systemId) {
        var pr = new CustomPromise();

        try {
            var query = `SELECT t.solarsystemid ,
                   t.system ,
                   t.class ,
                   t.star ,
                   t.planets ,
                   t.moons ,
                   t.effect ,
                   t.statics
            FROM public.wormholesystems_new t
            WHERE solarsystemid='${_systemId}'
            ORDER BY t.solarsystemid`;

            var result = await core.dbController.mdDB.custom(query);

            pr.resolve(result.rowCount > 0 ? result.rows[0] : null);

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    getWormholeClassInfo: async function (_wormholeClass) {
        var pr = new CustomPromise();

        try {
            var query = `SELECT t.id
                 , t.hole
                 , t.in_class
                 , t.maxstabletime
                 , t.maxstablemass
                 , t.massregeneration
                 , t.maxjumpmass
            FROM public.wormholeclassifications t
            WHERE hole='${_wormholeClass}'
            ORDER BY t.id`;

            var result = await core.dbController.mdDB.custom(query);

            pr.resolve(result.rowCount > 0 ? result.rows[0] : null);

        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    },

    getCompiledInfo: async function (_systemId) {
        var info = await this.getAdditionalSystemInfo(_systemId);

        if(info && info.statics === null)
            info.statics = [];

        if(info && info.statics && info.statics.length > 0) {
            var staticArr = info.statics.split(",");
            var arrResults = await Promise.all(staticArr.map(_hole => this.getWormholeClassInfo(_hole)));
            info.statics = arrResults.map(function(_info, _index) {
                return {
                    id: staticArr[_index],
                    leadTo: core.fdController.wormholeClassesInfo[_info.in_class].name,
                    leadClass: _info.in_class
                };
            });
        }

        return info;
    }
});

module.exports = SdeController;