/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../../utils/helpers");
const {
  saveMapUserActions,
} = require("../../../../core/maps/sql/mapSqlUserActions");

const responseName = "responseEveMapSystemsPositionsUpdate";

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
    await core.mapController
      .get(_event.mapId)
      .updateSystemsPosition(_event.systemsPosition);

    await saveMapUserActions(
      userId,
      _event.mapId,
      "updateSolarSystemPosition",
      { systemsPosition: _event.systemsPosition },
    );

    api.send(_connectionId, _responseId, {
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on update positions of solar system",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
