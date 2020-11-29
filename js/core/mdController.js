var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var CustomPromise = require("./../env/promise");
const counterLog  = require("./../utils/counterLog")

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

            counterLog("SQL", query);

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

            counterLog("SQL", query);

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
                    type: core.fdController.wormholeClassesInfo[_info.in_class].shortName,
                    fullName: core.fdController.wormholeClassesInfo[_info.in_class].fullName,
                    class: _info.in_class
                };
            });
        }

        return info;
    },

    getSolarSystemEffectInfo: async function (_effectName, _wormholeClass) {
        var pr = new CustomPromise();

        try {
            var query = `SELECT t.id
             , t.positive
             , t.id_type
             , t.hole
             , t.effect
             , t.icon
             , t.c1
             , t.c2
             , t.c3
             , t.c4
             , t.c5
             , t.c6
        FROM public.effects_new t
        WHERE t.hole='${_effectName}'
        ORDER BY t.id`;

            counterLog("SQL", query);
            var result = await core.dbController.mdDB.custom(query);

            let out = [];
            for (var a = 0; a < result.rows.length; a++) {
                let rowData = result.rows[a];

                let effectName = rowData.effect;
                let effectStrength;
                switch (_wormholeClass) {
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                        effectStrength = rowData["c" + _wormholeClass];
                        break;
                }

                if(effectStrength[0] !== "-")
                    effectStrength = "+" + effectStrength;

                out.push({description: `${effectName}: ${effectStrength}`, positive: rowData.positive});
            }

            pr.resolve(out);
        } catch (_err) {
            debugger;
            pr.reject(_err);
        }

        return pr.native;
    }
});

module.exports = SdeController;