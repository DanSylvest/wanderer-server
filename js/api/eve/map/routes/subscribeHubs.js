const helpers = require("../../../../utils/helpers");

const responseName = "responseSubscribeHubs";

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
    await core.tokenController.checkToken(token);
    await core.mapController
      .get(_event.mapId)
      .subscribers.subscribeHubs(_connectionId, _responseId);
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on subscribe hubs",
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
    await core.mapController
      .get(_event.mapId)
      .subscribers.unsubscribeHubs(_connectionId, _responseId);
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on unsubscribe hubs",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = subscriber;
