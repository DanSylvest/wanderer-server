/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../utils/helpers");
const { exportMap } = require("../../../core/maps/sql/mapSqlActions");

const responseName = "responseMapExport";

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
    const list = await core.mapController.getMapListByOwner(userId);
    const isOwner = list.some((x) => x.id === _event.mapId);

    if (_event.checkOwner) {
      api.send(_connectionId, _responseId, {
        data: isOwner,
        success: true,
        eventType: responseName,
      });
      return;
    }

    const info = await exportMap(_event.mapId);

    if (!isOwner) {
      helpers.errResponse(
        _connectionId,
        _responseId,
        responseName,
        "Error on export",
        {
          code: 0,
          handledError: err,
        },
      );
      return;
    }

    api.send(_connectionId, _responseId, {
      data: info,
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on export",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
