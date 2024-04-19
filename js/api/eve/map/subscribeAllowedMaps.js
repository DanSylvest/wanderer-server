const helpers = require("../../../utils/helpers");

const responseName = "responseEveSubscriptionAllowedMaps";

const subscriber = async function (_connectionId, _responseId) {
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
    await core.mapController.subscribeAllowedMaps(
      userId,
      _connectionId,
      _responseId,
    );
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on subscribe allowed maps",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

subscriber.unsubscribe = async function (_connectionId, _responseId) {
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

    await core.mapController.unsubscribeAllowedMaps(
      userId,
      _connectionId,
      _responseId,
    );
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on unsubscribe allowed maps",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = subscriber;
