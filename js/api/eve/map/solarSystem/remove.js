/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../../utils/helpers");
const {
  saveMapUserActions,
} = require("../../../../core/maps/sql/mapSqlUserActions");

const responseName = "responseEveMapSystemRemove";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @param _event.systemIds
 * @returns {Promise<void>}
 */
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

    const map = core.mapController.get(_event.mapId);
    await Promise.all(
      _event.systemIds.map((x) => map.systemRemove(x.toString())),
    );

    await saveMapUserActions(userId, _event.mapId, "removeSolarSystems", {
      solarSystemIds: _event.systemIds,
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
      "Error on remove solar system",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
