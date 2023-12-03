const helpers = require('./../../../../utils/helpers.js');
const { saveMapUserActions } = require('../../../../core/maps/sql/mapSqlUserActions');
const responseName = 'responseEveMapLinkUpdate';

const request = async function (_connectionId, _responseId, _event) {
  // we need get token by connection
  const token = core.connectionStorage.get(_connectionId);

  // when token is undefined - it means what you have no rights
  if (token === undefined) {
    helpers.errResponse(_connectionId, _responseId, responseName, 'You not authorized or token was expired', { code: 1 });
    return;
  }

  try {
    const userId = await core.tokenController.checkToken(token);
    await core.mapController.get(_event.mapId).updateLink(_event.linkId, _event.data);

    await saveMapUserActions(userId, _event.mapId, 'updateChain', { chainId: _event.linkId, data: _event.data });

    api.send(_connectionId, _responseId, {
      success: true,
      eventType: 'responseEveMapLinkUpdate',
    });
  } catch (err) {
    helpers.errResponse(_connectionId, _responseId, responseName, 'Error on link update', {
      code: 0,
      handledError: err,
    });
  }
};

module.exports = request;