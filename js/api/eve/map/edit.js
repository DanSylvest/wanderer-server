/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveMapEdit";

const request = async function (
  _connectionId,
  _responseId,
  { mapId, name, description, note = "", groups },
) {
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
    await core.mapController.editMap(mapId, {
      name,
      description,
      note,
      groups,
    });

    api.send(_connectionId, _responseId, {
      eventType: responseName,
      success: true,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on editing map",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
