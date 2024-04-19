const helpers = require("../../../../utils/helpers");

const responseName = "responseEveMapSolarSystemData";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @param _event.solarSystemId
 * @returns {Promise<void>}
 */
const subscriber = async function (_connectionId, _responseId, _event) {
  // we need get token by connection
  const token = core.connectionStorage.get(_connectionId);

  // when token is undefined - it means what you have no rights
  if (token === undefined) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "You not authorized or token was expired",
      { code: 1 },
    );
    return;
  }

  try {
    // const userId = await core.tokenController.checkToken(token);

    const ss = core.mapController
      .get(_event.mapId)
      .getSolarSystem(_event.solarSystemId);
    await ss.subscribeDynamicInfo(_connectionId, _responseId);
    // await core.mapController.subscribeAllowedMaps(userId, _connectionId, _responseId);
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on subscribe solar system data",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

subscriber.unsubscribe = async function (_connectionId, _responseId, _event) {
  // we need get token by connection
  const token = core.connectionStorage.get(_connectionId);

  // when token is undefined - it means what you have no rights
  if (token === undefined) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "You not authorized or token was expired",
      { code: 1 },
    );
    return;
  }

  try {
    await core.tokenController.checkToken(token);
    const map = core.mapController.get(_event.mapId);

    if (!map.hasSolarSystem(_event.solarSystemId)) {
      return;
    }

    const sys = map.getSolarSystem(_event.solarSystemId);
    await sys.unsubscribeDynamicInfo(_connectionId, _responseId);
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on unsubscribe solar system data",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = subscriber;
