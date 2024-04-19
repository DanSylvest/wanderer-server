/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveCorporationInfo";

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.corporationId
 * @param _event.corporationIds
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
    await core.tokenController.checkToken(token);

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

    let info;
    if (_event.corporationIds) {
      info = await Promise.all(
        _event.corporationIds.map((id) =>
          core.corporationsController.getPublicCorporationInfo(id),
        ),
      );
      _event.corporationIds.map((x, i) => (info[i].id = x.toString()));
    } else if (_event.corporationId) {
      info = await core.corporationsController.getPublicCorporationInfo(
        _event.corporationId,
      );
    }

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
      "Error on load corporation info",
      {
        code: 0,
        handledError: _err,
      },
    );
  }
};

module.exports = request;
