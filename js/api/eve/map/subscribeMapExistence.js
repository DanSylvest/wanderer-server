const helpers = require("../../../utils/helpers");

const responseName = "responseEveMapExistence";
const {
  checkAccessToMapByUser,
} = require("../../../core/maps/utils/checkAccessToMapByUser");

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId {string}
 * @returns {Promise<void>}
 */
const subscriber = async function (_connectionId, _responseId, _event) {
  const { mapId } = _event;

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
    const userId = await core.tokenController.checkToken(token);

    const hasAccess = await checkAccessToMapByUser(userId, mapId);
    if (!hasAccess) {
      helpers.errResponse(
        _connectionId,
        _responseId,
        responseName,
        `User '${userId}' has no access to map '${mapId}'`,
        { code: 2 },
      );
      return;
    }

    core.mapController
      .get(mapId)
      .subscribers.subscribeExistence(_connectionId, _responseId);
    api.send(_connectionId, _responseId, {
      data: true,
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on subscribe map existence",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

subscriber.unsubscribe = function (_connectionId, _responseId, _event) {
  core.mapController
    .get(_event.mapId)
    .subscribers.unsubscribeExistence(_connectionId, _responseId);
};

module.exports = subscriber;
