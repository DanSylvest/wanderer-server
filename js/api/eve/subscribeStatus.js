/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 2/14/21.
 */

const helpers = require("../../utils/helpers");

const subscriber = async function (_connectionId, _responseId) {
  // we need get token by connection
  const token = core.connectionStorage.get(_connectionId);

  // when token is undefined - it means what you have no rights
  if (token === undefined) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      "responseEveSubscriptionAllowedMaps",
      "You not authorized or token was expired",
      {
        error: 0,
      },
    );
    return;
  }

  await core.tokenController.checkToken(token);
  core.eveServer.subscribeStatus(_connectionId, _responseId);
};

subscriber.unsubscribe = async function (_connectionId, _responseId) {
  // we need get token by connection
  const token = core.connectionStorage.get(_connectionId);

  // when token is undefined - it means what you have no rights
  if (token === undefined) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      "responseEveSubscriptionAllowedMaps",
      "You not authorized or token was expired",
      {
        error: 0,
      },
    );
    return;
  }

  await core.tokenController.checkToken(token);
  core.eveServer.unsubscribeStatus(_connectionId, _responseId);
};

module.exports = subscriber;
