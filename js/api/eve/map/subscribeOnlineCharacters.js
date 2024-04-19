const helpers = require("../../../utils/helpers");

const responseName = "responseSubscribeOnlineCharacters";
const {
  checkAccessToMapByUser,
} = require("../../../core/maps/utils/checkAccessToMapByUser");

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param event
 * @param event.mapId {string}
 * @returns {Promise<void>}
 */
const subscriber = async function (_connectionId, _responseId, event) {
  // we need get token by connection
  const token = core.connectionStorage.get(_connectionId);
  const { mapId } = event;

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
      .subscribers.subscribeOnlineCharacters(
        _connectionId,
        _responseId,
        userId,
      );
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on subscribe allowed characters",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

subscriber.unsubscribe = async function (_connectionId, _responseId, event) {
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
    await core.mapController
      .get(event.mapId)
      .subscribers.unsubscribeOnlineCharacters(
        _connectionId,
        _responseId,
        userId,
      );
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on unsubscribe allowed characters",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = subscriber;
