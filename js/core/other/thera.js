const Emitter       = require("./../../env/tools/emitter");
const CustomPromise = require("./../../env/promise");
const TheraProvider = require("./../providers/thera");

class Thera extends Emitter {
    constructor() {
        super();

        this.isReady = false;
        this.isBroken = false;
        this._readyPromise = new CustomPromise();

        Object.defineProperty(this, "readyPromise", {
            get: () => {
                return this._readyPromise.native;
            }
        });

        this._createTheraProvider();
    }
    destructor () {
        this._destroyTheraProvider();

        this._readyPromise.cancel();
        delete this._readyPromise;

        super.destructor();
    }
    async init () {
        this.theraProvider.start()
    }

    _createTheraProvider() {
        this.theraProvider = new TheraProvider();
        this.theraProvider.on("change", this._onData.bind(this));
        this.theraProvider.on("broken", this._onBroken.bind(this));
    }

    _destroyTheraProvider() {
        this.theraProvider.destructor();
        delete this.theraProvider;
    }

    _onData(data) {
        if(this.isBroken)
            this.isBroken = false;

        if (!this.isReady) {
            this._readyPromise.resolve();
            this.isReady = true;
        }

        this._data = this._processData(data);
    }

    _processData (data) {
        let out = data.map(x => {
            let shipSizeType = 1;
            switch(x.sourceWormholeType.jumpMass) {
                case 5:
                    shipSizeType = 0; // S
                    break;
                case 20:
                    shipSizeType = 1; // M
                    break;
                case 300:
                case 1000:
                    shipSizeType = 1; // L
                    break;
                case 1350:
                case 1800:
                    shipSizeType = 2; // XL
                    break;
            }

            return {
                sourceSolarSystemId: x.solarSystemId,
                destinationSolarSystemId: x.wormholeDestinationSolarSystemId,
                massStatus: x.wormholeMass === "stable" ? 0 : 2,
                timeStatus: x.wormholeEol === "stable" ? 0 : 1,
                shipSizeType: shipSizeType
            }
        });

        return out;
    }

    _onBroken () {
        this.isBroken = true;
    }

    getChainPairs (includeFrig, includeEol, includeMassCrit) {
        return this._data.filter(x => {
            if (!includeFrig && x.shipSizeType === 0)
                return false;

            if (!includeEol && x.timeStatus === 1)
                return false;

            if (!includeMassCrit && x.massStatus === 2)
                return false;

            return true;
        }).map(x => ({first: x.sourceSolarSystemId, second: x.destinationSolarSystemId}));
    }
}

module.exports = Thera;