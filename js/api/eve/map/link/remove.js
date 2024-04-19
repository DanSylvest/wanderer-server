/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../../utils/helpers.js");
const {
  saveMapUserActions,
} = require("../../../../core/maps/sql/mapSqlUserActions");

const responseName = "responseEveMapLinkRemove";

const request = async function (_connectionId, _responseId, _event) {
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
    await core.mapController.get(_event.mapId).linkRemove(_event.linkId);

    await saveMapUserActions(userId, _event.mapId, "removeChain", {
      chainId: _event.linkId,
    });

    api.send(_connectionId, _responseId, {
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on link remove",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
