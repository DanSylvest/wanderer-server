/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveMapAdd";

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
    const props = {
      name: _event.name,
      description: _event.description,
      groups: _event.groups,
    };

    const mapId = await core.mapController.createMap(userId, props);
    api.send(_connectionId, _responseId, {
      data: {
        mapId,
        owner: userId,
      },
      eventType: responseName,
      success: true,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on create map",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
