/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveMapAddFast";
// const exist = require("./../../../env/tools/exist");

/**
 * @param _connectionId
 * @param _responseId
 * @param {Object} _event
 * @param {String} _event.mapName
 * @param {String} _event.mapDescription
 * @param {String} _event.mapNote
 * @param {String} _event.groupName
 * @param {String} _event.groupDescription
 * @param {Boolean} _event.shareForCorporation
 * @param {Boolean} _event.shareForAlliance
 * @param {Number} _event.characterId
 * @returns {*}
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
    const result = await core.mapController.createMapFast(userId, _event);

    api.send(_connectionId, _responseId, {
      data: result,
      eventType: responseName,
      success: true,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on fast creating map",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
