// link example https://zkillboard.com/api/w-space/systemID/31002041/pastSeconds/3600/
const Emitter = require("./../../env/_new/tools/emitter");
const axios = require("axios");
const log = require("./../../utils/log");

const REQUEST_TIMEOUT_MS = 1000 * 20;

class ZkbSystemsProvider extends Emitter {
  systemIds = new Map();
  mapId;
  tid = -1;

  constructor(mapId, systemIds) {
    super();

    this.mapId = mapId;
    this.systemIds = new Map();
    systemIds.map((x) => {
      this.systemIds.set(parseInt(x), []);
    });
  }

  destructor() {
    this.systemIds.clear();

    if (this.tid !== -1) {
      clearTimeout(this.tid);
      this.tid = -1;
    }

    super.destructor();
  }

  start() {
    if (this.tid !== -1) {
      return;
    }

    this.tid = setTimeout(async () => {
      this.tid = -1;
      await this.loadSystemData();
    }, REQUEST_TIMEOUT_MS);
  }

  stop() {
    if (this.tid !== -1) {
      clearTimeout(this.tid);
      this.tid = -1;
    }
  }

  tick() {
    this.tid = setTimeout(async () => {
      await this.loadSystemData();
    }, REQUEST_TIMEOUT_MS);
  }

  addSystem(systemId) {
    this.systemIds.set(parseInt(systemId), []);
  }

  removeSystem(systemId) {
    this.systemIds.delete(
      Number.isInteger(systemId) ? systemId : parseInt(systemId),
    );
  }

  async loadSystemData() {
    if (this.systemIds.size === 0) {
      this.tick();
      return;
    }

    let res;
    try {
      res = await this.fetchData();
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      this.tick();
      return;
    }

    if (res.status === axios.HttpStatusCode.BadRequest) {
      this.tick();
      return;
    }

    if (res.status !== axios.HttpStatusCode.Ok) {
      this.tick();
      return;
    }

    res.data.forEach(({ systemId, kills }) => {
      this.systemIds.has(systemId) && this.systemIds.set(systemId, kills);
    });

    this.emit("loaded", this.info());
    this.tick();
  }

  getActivityType(kills = []) {
    if (kills.length === 0) {
      return "noActivity";
    }

    if (kills.length <= 5) {
      return "active";
    }

    if (kills.length <= 30) {
      return "warn";
    }

    return "danger";
  }

  getKillInfo(systemId, kills) {
    return {
      systemId: parseInt(systemId),
      kills,
      type: this.getActivityType(kills),
    };
  }

  info() {
    return [...this.systemIds.entries()].map(([systemId, kills]) =>
      this.getKillInfo(systemId, kills),
    );
  }

  async fetchData() {
    log(
      log.DEBUG,
      `Zkb Provider: Map - [${this.mapId}] try to fetch; Count of systems: ${this.systemIds.size}`,
    );

    if (!config.api.zkbKillsHost) {
      return { res: axios.HttpStatusCode.BadRequest };
    }

    return axios.post(`${config.api.zkbKillsHost}/kills/systems`, {
      systemIds: [...this.systemIds.keys()],
    });
  }
}

module.exports = { ZkbSystemsProvider };
