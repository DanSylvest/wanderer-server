const Emitter = require('./../../env/tools/emitter');
const CustomPromise = require('./../../env/promise');
const TheraProvider = require('./../providers/thera');

class Thera extends Emitter{
  constructor () {
    super();

    this.isReady = false;
    this.isBroken = false;
    this._readyPromise = new CustomPromise();

    Object.defineProperty(this, 'readyPromise', {
      get: () => {
        return this._readyPromise.native;
      },
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
    this.theraProvider.start();
  }

  _createTheraProvider () {
    this.theraProvider = new TheraProvider();
    this.theraProvider.on('change', this._onData.bind(this));
    this.theraProvider.on('broken', this._onBroken.bind(this));
  }

  _destroyTheraProvider () {
    this.theraProvider.destructor();
    delete this.theraProvider;
  }

  _onData (data) {
    if (this.isBroken) {
      this.isBroken = false;
    }

    if (!this.isReady) {
      this._readyPromise.resolve();
      this.isReady = true;
    }

    this._data = this._processData(data);
  }

  _processData (data) {
    let out = data.map(x => {
      let shipSizeType = 1;
      switch (x.max_ship_size) {
        case 'small':
          shipSizeType = 0; // S
          break;
        case 'medium':
          shipSizeType = 1; // M
          break;
        case 'large':
          shipSizeType = 1; // L
          break;
        case 'xlarge':
          shipSizeType = 2; // XL
          break;
      }

      return {
        sourceSolarSystemId: x.in_system_id,
        destinationSolarSystemId: x.out_system_id,
        massStatus: 0,
        timeStatus: x.remaining_hours < 2 ? 0 : 1,
        shipSizeType: shipSizeType,
      };
    });

    return out;
  }

  _onBroken () {
    this.isBroken = true;
  }

  getChainPairs (includeFrig, includeEol, includeMassCrit) {
    if (!this._data) {
      return [];
    }

    return this._data.filter(x => {
      if (!includeFrig && x.shipSizeType === 0) {
        return false;
      }

      if (!includeEol && x.timeStatus === 1) {
        return false;
      }

      if (!includeMassCrit && x.massStatus === 2) {
        return false;
      }

      return true;
    }).map(x => ({ first: x.sourceSolarSystemId, second: x.destinationSolarSystemId }));
  }
}

module.exports = Thera;