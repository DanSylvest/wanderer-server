const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveUpdateAllowedCharacterForGroup";

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

    await core.groupsController.updateAllowedCharactersForGroup(
      userId,
      _event.groupId,
      _event.characters,
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
      "Error on update allowed character for group",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
