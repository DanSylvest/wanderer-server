// link example https://zkillboard.com/api/w-space/systemID/31002041/pastSeconds/3600/

const { getSolarSystemInfo } = require('../maps/sql/solarSystemSql');

const Emitter = require('./../../env/_new/tools/emitter');
const { random } = require('./../../env/_new/tools/random');
const { systemClasses, whSpace, knownSpace } = require('../helpers/environment');
const axios = require('axios');

const TIME_IN_PAST = 60 * 60 * 1;
const DELAY_RANDOM_MAX_MS = 1000 * 60 * 5;
const REQUEST_TIMEOUT_MS = 1000 * 60 * 5;

// const DELAY_RANDOM_MAX_MS = 1000 * 10;
// const REQUEST_TIMEOUT_MS = 1000 * 10;

class ZkbDataProvider extends Emitter{
  systemId;
  data = [];
  systemClass;
  tid = -1;

  constructor (systemId) {
    super();

    this.systemId = systemId;
  }

  destructor () {
    this.data = [];
    this.systemId = undefined;

    if (this.tid !== -1) {
      clearTimeout(this.tid);
      this.tid = -1;
    }

    super.destructor();
  }

  async start () {
    const { systemClass } = await getSolarSystemInfo(this.systemId);
    this.systemClass = systemClass;
    if (!this.availableSpaces(systemClass)) {
      return;
    }

    this.tid = setTimeout(async () => {
      this.tid = -1;
      await this.loadSystemData();
    }, random(0, DELAY_RANDOM_MAX_MS));
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

  async loadSystemData () {
    const res = await this.fetchSystemData();
    if (res.status === axios.HttpStatusCode.BadRequest) {
      this.tick();
      return;
    }

    if (res.status !== axios.HttpStatusCode.Ok) {
      this.tick();
      return;
    }

    if (this.data.length === res.data.length) {
      this.tick();
      return;
    }

    this.data = res.data;
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

  info () {
    return {
      systemId: this.systemId,
      kills: this.data,
      type: this.getActivityType(this.data),
    };
  }

  availableSpaces (systemClass) {
    return whSpace.includes(systemClass)
      || knownSpace.includes(systemClass)
      || systemClasses.pochven === systemClass;
  }

  async fetchSystemData () {
    const type = whSpace.includes(this.systemClass) ? 'w-space/' : '';

    return axios.get(
      `https://zkillboard.com/api/${ type }systemID/${ this.systemId }/pastSeconds/${ TIME_IN_PAST }/`,
      {
        headers: {
          'Accept-Encoding': 'gzip',
          'User-Agent': 'https://wanderer.deadly-w.space/ Maintainer: Dan Sylvest cublakhan257@gmail.com',
        },
      },
    );
  }
}

module.exports = { ZkbDataProvider };