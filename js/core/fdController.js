var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var CustomPromise = require("./../env/promise");
var fs            = require("fs");
var Path          = require('./../env/tools/path');

/**
 * EVE REGIONS
 * WH C1: 11000001-11000003
 *      ShatteredConstellation - 21000325
 * WH C2: 11000004-11000008
 *      ShatteredConstellation - 21000326
 * WH C3: 11000009-11000015
 *      ShatteredConstellation - 21000327
 * WH C4: 11000016-11000023
 *      ShatteredConstellation - 21000328
 * WH C5: 11000024-11000029
 *      ShatteredConstellation - 21000329
 * WH C6: 11000030
 *      ShatteredConstellation - 21000330
 * WH C12: 11000031 - this is Thera
 * WH C13: 11000032 - frig size shattered
 * WH C1: 11000033 - Drifters
 */

var FastDataController = classCreator("FastDataController", Emitter, {
    constructor: function SdeController() {
        Emitter.prototype.constructor.call(this);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    init: function () {
        var pr = new CustomPromise();

        var path = Path.fromBackSlash(projectPath);
        path["+="](["db", "json"]);

        this.shatteredConstellations = JSON.parse(fs.readFileSync(path["+"]("shatteredConstellations.json").toString(), "utf8"));
        this.wormholeClassesInfo = JSON.parse(fs.readFileSync(path["+"]("wormholeClassesInfo.json").toString(), "utf8"));
        this.effectNames = JSON.parse(fs.readFileSync(path["+"]("effectNames.json").toString(), "utf8"));

        pr.resolve();

        return pr.native;
    }

});

module.exports = FastDataController;