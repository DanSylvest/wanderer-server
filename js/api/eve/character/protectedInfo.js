/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveCharacterInfo";

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

    const info = await core.charactersController.getProtectedCharacterInfo(
      _event.characterId,
    );

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

    info.isOwn = await core.userController.isCharacterAttachedToUser(
      _event.characterId,
      userId,
    );

    api.send(_connectionId, _responseId, {
      result: info,
      success: true,
      eventType: responseName,
    });
  } catch (_err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on load character info",
      {
        code: 0,
        handledError: _err,
      },
    );
  }
};

module.exports = request;
