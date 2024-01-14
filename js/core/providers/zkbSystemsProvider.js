// link example https://zkillboard.com/api/w-space/systemID/31002041/pastSeconds/3600/
const Emitter = require('./../../env/_new/tools/emitter');
const { random } = require('./../../env/_new/tools/random');
const axios = require('axios');
const log = require("./../../utils/log");

const REQUEST_TIMEOUT_MS = 1000 * 20;

class ZkbSystemsProvider extends Emitter{
  systemIds = new Map();
  tid = -1;

  constructor (systemIds) {
    super();

    this.systemIds = new Map();
    systemIds.map(x => {
      this.systemIds.set(parseInt(x), []);
    });
  }

  destructor () {
    this.systemIds.clear();

    if (this.tid !== -1) {
      clearTimeout(this.tid);
      this.tid = -1;
    }

    super.destructor();
  }

  start () {
    this.tid = setTimeout(async () => {
      this.tid = -1;
      await this.loadSystemData();
    }, random(0, REQUEST_TIMEOUT_MS));
  }

  stop () {
    if (this.tid !== -1) {
      clearTimeout(this.tid);
      this.tid = -1;
    }
  }

  tick () {
    this.tid = setTimeout(async () => {
      await this.loadSystemData();
    }, random(0, REQUEST_TIMEOUT_MS));
  }

  addSystem (systemId) {
    this.systemIds.set(parseInt(systemId), []);
  }

  removeSystem (systemId) {
    this.systemIds.delete(Number.isInteger(systemId) ? systemId : parseInt(systemId));
  }

  async loadSystemData () {
    let res;
    try {
      res = await this.fetchData();
    } catch (err) {
      this.tick();
      return;
    }

    log(log.DEBUG, 'loadSystemData res', res.status);

    if (res.status === axios.HttpStatusCode.BadRequest) {
      this.tick();
      return;
    }

    log(log.DEBUG, 'loadSystemData Not bad request', res.status);


    if (res.status !== axios.HttpStatusCode.Ok) {
      this.tick();
      return;
    }


    log(log.DEBUG, 'loadSystemData OK request', res.status);

    res.data.forEach(({ systemId, kills }) => {
      this.systemIds.has(systemId) && this.systemIds.set(systemId, kills);
    });

    this.emit('loaded', this.info());
    this.tick();
  }

  getActivityType (kills = []) {
    if (kills.length === 0) {
      return 'noActivity';
    }

    if (kills.length <= 5) {
      return 'active';
    }

    if (kills.length <= 30) {
      return 'warn';
    }

    return 'danger';
  }

  getKillInfo (systemId, kills) {
    return {
      systemId: parseInt(systemId),
      kills,
      type: this.getActivityType(kills),
    };
  }

  info () {
    return [...this.systemIds.entries()].map(([systemId, kills]) => this.getKillInfo(systemId, kills));
  }

  async fetchData () {
    log(log.DEBUG, 'fetchData TRY', [...this.systemIds.keys()].toString())


    if (!config.api.zkbKillsHost) {
      return { res: axios.HttpStatusCode.BadRequest };
    }

    log(log.DEBUG, 'fetchData URL', `${ config.api.zkbKillsHost }/kills/systems`)
    log(log.DEBUG, 'fetchData BEFORE CALL', [...this.systemIds.keys()].toString())


    return axios.post(`${ config.api.zkbKillsHost }/kills/systems`, { systemIds: [...this.systemIds.keys()] });
  }
}

module.exports = { ZkbSystemsProvider };