/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveCharacterFastSearch";

const request = async function (_connectionId, _responseId, _event) {
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

    if (!core.eveServer.isOnline()) {
      helpers.errResponse(
        _connectionId,
        _responseId,
        responseName,
        "TQ is offline",
        { code: 1001 },
      );
      return;
    }

    const result = await core.charactersController.fastSearch({
      userId,
      match: _event.match,
      type: _event.type,
    });

    api.send(_connectionId, _responseId, {
      result,
      eventType: responseName,
      success: true,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on fast search",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
