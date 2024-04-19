/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../utils/helpers.js");

const responseName = "responseMapGroups";

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
    /* let userId = */
    await core.tokenController.checkToken(token);

    const list = await core.mapController.getMapGroups(_event.mapId);

    const arrInfo = await Promise.all(
      list.map((x) => core.groupsController.get(x).getInfo()),
    );
    arrInfo.map((x, i) => (x.id = list[i]));

    api.send(_connectionId, _responseId, {
      data: arrInfo,
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on load map groups",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
