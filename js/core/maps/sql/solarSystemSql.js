/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 3/2/21.
 */

const { systemClasses } = require("../../helpers/environment");
const SystemsCacheStates = {
  WAITING: 0,
  DONE: 1,
};

class SystemsCache {
  keys = {};

  add(key) {
    this.keys[key] = {
      queue: [],
      state: SystemsCacheStates.WAITING,
      value: null,
    };
  }

  has(key) {
    return this.keys[key] != null;
  }

  isDone(key) {
    return this.keys[key].state === SystemsCacheStates.DONE;
  }

  isWaiting(key) {
    return this.keys[key].state === SystemsCacheStates.WAITING;
  }

  get(key) {
    return this.keys[key].value;
  }

  addWaiter(key) {
    return new Promise((resolve, reject) => {
      this.keys[key].queue.push({ resolve, reject });
    });
  }

  update(key, value) {
    this.keys[key].value = value;
  }

  resolve(key) {
    this.keys[key].queue.map((pr) => pr.resolve());
    this.keys[key].state = SystemsCacheStates.DONE;
    this.keys[key].queue = [];
  }
}

const sc = new SystemsCache();

/**
 *
 * @param solarSystemId
 * @param attrs
 * @return {Promise<{systemClass: number}|null>}
 */
const getSolarSystemInfo = async function (
  solarSystemId,
  attrs = core.dbController.solarSystemsTable.attributes(),
) {
  const solarSystemInfo =
    await core.dbController.solarSystemsTable.getByCondition(
      {
        name: "solarSystemId",
        operator: "=",
        value: solarSystemId,
      },
      attrs,
    );

  if (solarSystemInfo.length > 0) {
    return solarSystemInfo[0];
  }

  if (sc.has(solarSystemId) && sc.isDone(solarSystemId)) {
    return sc.get(solarSystemId);
  }

  if (sc.has(solarSystemId) && sc.isWaiting(solarSystemId)) {
    await sc.addWaiter(solarSystemId);
    return sc.get(solarSystemId);
  }

  sc.add(solarSystemId);

  // TODO here can down... because system can be not exists in API.
  // it's crazy but... why not?
  const systemInfo = await core.esiApi.universe.system(solarSystemId);
  const constellationInfo = await core.esiApi.universe.constellation(
    systemInfo.constellationId,
  );
  const regionInfo = await core.esiApi.universe.region(
    constellationInfo.regionId,
  );

  const { constellationId, name: solarSystemName, securityStatus } = systemInfo;

  const { regionId, name: constellationName } = constellationInfo;

  const { name: regionName } = regionInfo;

  const security = (
    parseInt(securityStatus) === -0.99 ? -1.0 : parseInt(securityStatus)
  ).toFixed(1);
  const out = {
    // solar system info found in ESI
    constellationId,
    solarSystemName,
    security,
    solarSystemId,

    // constellation info found in ESI
    regionId,
    constellationName,

    // region info found in ESI
    regionName,

    // all other what need for compatibility
    systemClass: systemClasses.unknown,
    typeDescription: solarSystemName,
    classTitle: security.toString(),
    isShattered: false,

    // if not exists effect, power can not be set
    // also some nullsec systems and Zarzakh have an effect.
    effectName: "",
    effectPower: 0,
    statics: [],
    wanderers: [],
    solarSystemNameLC: solarSystemName.toLowerCase(),
    triglavianInvasionStatus: "Normal",
  };

  sc.update(solarSystemId, out);
  sc.resolve(solarSystemId);
  return sc.get(solarSystemId);
};

module.exports = {
  getSolarSystemInfo,
};
