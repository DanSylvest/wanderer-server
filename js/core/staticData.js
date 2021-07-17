const Path        = require('./../env/tools/path');
const fs          = require('fs');

class StaticData  {
    constructor () {
        const dirPath  = Path.fromBackSlash(__dirname);
        dirPath.pop();
        let path =  dirPath["+"](["db", "json"]);

        this.effects = JSON.parse(fs.readFileSync(path["+"]("effects.json").toString(), "utf8"));
        this.wormholeClasses = JSON.parse(fs.readFileSync(path["+"]("wormholeClasses.json").toString(), "utf8"));
        this.wormholes = JSON.parse(fs.readFileSync(path["+"]("wormholes.json").toString(), "utf8"));
        this.wormholeSystems = JSON.parse(fs.readFileSync(path["+"]("wormholeSystems.json").toString(), "utf8"));
        this.triglavianSystems = JSON.parse(fs.readFileSync(path["+"]("triglavianSystems.json").toString(), "utf8"));
    }
}
module.exports = StaticData;