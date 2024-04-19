/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 6/19/20.
 */

// var Emitter        = require("./../env/tools/emitter");
// var classCreator   = require("./../env/tools/class");
const fs = require("fs");
const axios = require("axios");
const CustomPromise = require("../env/promise");
const extend = require("../env/tools/extend");
const exist = require("../env/tools/exist");
const ESI = require("./generated/javascript-client/src/index");

const locationApi = new ESI.LocationApi();
const searchApi = new ESI.SearchApi();
// const routesApi = new ESI.RoutesApi();
const characterApi = new ESI.CharacterApi();
const corporationApi = new ESI.CorporationApi();
const allianceApi = new ESI.AllianceApi();
const userInterfaceApi = new ESI.UserInterfaceApi();
const statusApi = new ESI.StatusApi();
const universeApi = new ESI.UniverseApi();

const publicData = {
  datasource: config.eve.datasource,
};

const __esi_characters_portrait = function (_characterId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {});
  characterApi.getCharactersCharacterIdPortrait(
    _characterId,
    base,
    (error, data) => {
      if (error) pr.reject(error);
      else pr.resolve(data);
    },
  );

  return pr.native;
};

/**
 *
 * @param _characterId
 * @returns {Promise | Promise<{
 *     allianceId {number | undefined}
 *     ancestryId {number}
 *     birthday {Date}
 *     bloodlineId {number}
 *     corporationId {number | undefined}
 *     description {string}
 *     gender {string}
 *     name {string}
 *     raceId {number}
 * }>}
 * @private
 */
const __esi_characters_info = function (_characterId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {});

  characterApi.getCharactersCharacterId(_characterId, base, (error, data) => {
    if (error) pr.reject(error);
    else pr.resolve(data);
  });

  return pr.native;
};

const __esi_corporation_info = function (_corporationId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {});

  corporationApi.getCorporationsCorporationId(
    _corporationId,
    base,
    (error, data) => {
      if (error) pr.reject(error);
      else pr.resolve(data);
    },
  );

  return pr.native;
};

const __esi_alliance_info = function (_allianceId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {});

  allianceApi.getAlliancesAllianceId(_allianceId, base, (error, data) => {
    if (error) pr.reject(error);
    else pr.resolve(data);
  });

  return pr.native;
};

const __esi_location_online = function (_accessToken, _characterId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {
    token: _accessToken,
  });

  locationApi.getCharactersCharacterIdOnline(
    _characterId,
    base,
    (error, data) => {
      if (error) pr.reject(error);
      else pr.resolve(data);
    },
  );

  return pr.native;
};

const __esi_location_current = function (_accessToken, _characterId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {
    token: _accessToken,
  });

  locationApi.getCharactersCharacterIdLocation(
    _characterId,
    base,
    (error, data) => {
      if (error) pr.reject(error);
      else pr.resolve(data);
    },
  );

  return pr.native;
};

const __esi_location_ship = function (_accessToken, _characterId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {
    token: _accessToken,
  });

  locationApi.getCharactersCharacterIdShip(
    _characterId,
    base,
    (error, data) => {
      if (error) pr.reject(error);
      else pr.resolve(data);
    },
  );

  return pr.native;
};

const __esi_uiapi_waypoint = function (
  _accessToken,
  addToBeginning,
  clearOtherWaypoints,
  destinationId,
) {
  const pr = new CustomPromise();

  const base = extend(publicData, {
    token: _accessToken,
  });

  userInterfaceApi.postUiAutopilotWaypoint(
    addToBeginning,
    clearOtherWaypoints,
    destinationId,
    base,
    (error, data) => {
      if (error) pr.reject(error);
      else pr.resolve(data);
    },
  );

  return pr.native;
};

const _search = function (_accessToken, characterId, _categories, _match) {
  const pr = new CustomPromise();

  const base = extend(publicData, {
    token: _accessToken,
    strict: false,
  });

  searchApi.getCharactersCharacterIdSearch(
    _categories,
    characterId,
    _match,
    base,
    (err, data) => (err ? pr.reject(err) : pr.resolve(data)),
  );

  return pr.native;
};

const _routes = async function (
  destination,
  origin,
  flag,
  connections,
  avoidanceList,
) {
  const base = extend(publicData, {
    flag: flag || "secure",
    connections: connections || [],
    avoid: avoidanceList || [],
  });

  try {
    const response = await axios.post(
      `${config.api.routesHost}/route/${origin}/${destination}`,
      base,
    );
    return response.data;
  } catch (error) {
    return error;
  }
};

const _get_status = function () {
  const pr = new CustomPromise();
  const base = extend(publicData, {});

  // FOR TESTS
  const manualOffline = fs.existsSync(`${projectPath}/esi/offline`);
  if (manualOffline) {
    pr.resolve({
      online: false,
      vip: false,
      players: 0,
      server_version: "",
      start_time: "",
    });
    return pr.native;
  }
  // FOR TESTS

  statusApi.getStatus(base, (error, data) => {
    // so...
    if (
      exist(error) &&
      exist(error.status) &&
      error.status === 504 &&
      error.message === "Timeout contacting tranquility"
    ) {
      pr.resolve({
        online: false,
        vip: false,
        players: 0,
        server_version: "",
        start_time: "",
      });
    } else if (!exist(error)) {
      // if vip status - offline
      if (data.vip) {
        pr.resolve(extend(data, { online: false }));
      } else {
        pr.resolve(extend(data, { online: true }));
      }
    } else {
      pr.reject(error);
    }
  });

  return pr.native;
};

const __esi_universeApi_system = function (systemId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {});

  universeApi.getUniverseSystemsSystemId(systemId, base, (error, data) => {
    if (error) pr.reject(error);
    else pr.resolve(data);
  });

  return pr.native;
};

const __esi_universeApi_constellation = function (constellationId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {});

  universeApi.getUniverseConstellationsConstellationId(
    constellationId,
    base,
    (error, data) => {
      if (error) pr.reject(error);
      else pr.resolve(data);
    },
  );

  return pr.native;
};

const __esi_universeApi_region = function (regionId) {
  const pr = new CustomPromise();

  const base = extend(publicData, {});

  universeApi.getUniverseRegionsRegionId(regionId, base, (error, data) => {
    if (error) pr.reject(error);
    else pr.resolve(data);
  });

  return pr.native;
};

module.exports = {
  uiapi: {
    waypoint: __esi_uiapi_waypoint,
  },
  location: {
    current: __esi_location_current,
    online: __esi_location_online,
    ship: __esi_location_ship,
  },
  corporation: {
    info: __esi_corporation_info,
  },
  alliance: {
    info: __esi_alliance_info,
  },
  characters: {
    portrait: __esi_characters_portrait,
    info: __esi_characters_info,
  },

  universe: {
    system: __esi_universeApi_system,
    constellation: __esi_universeApi_constellation,
    region: __esi_universeApi_region,
  },
  status: _get_status,
  search: _search,
  routes: _routes,
};
