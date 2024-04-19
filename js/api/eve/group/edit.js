/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */

const helpers = require("../../../utils/helpers.js");

const responseName = "responseEveGroupEdit";

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

    const props = {
      name: _event.name,
      description: _event.description,
      characters: _event.characters,
      corporations: _event.corporations,
      alliances: _event.alliances,
      moderators: _event.moderators,
    };

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

    await core.groupsController.editGroup(_event.groupId, props);

    api.send(_connectionId, _responseId, {
      eventType: responseName,
      success: true,
    });
  } catch (err) {
    helpers.errResponse(
      _connectionId,
      _responseId,
      responseName,
      "Error on editing group",
      {
        code: 0,
        handledError: err,
      },
    );
  }
};

module.exports = request;
