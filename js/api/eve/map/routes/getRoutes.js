/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../../utils/helpers");

const responseName = "responseGetRoutes";

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
    const map = core.mapController.get(_event.mapId);
    const list = await map.getRoutesListForSolarSystemAdvanced(
      _event.solarSystemId,
      _event.hubs,
      _event.settings,
    );

    api.send(_connectionId, _responseId, {
      data: list,
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on getting routes",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
