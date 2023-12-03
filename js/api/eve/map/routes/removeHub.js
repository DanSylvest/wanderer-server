/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/20/20.
 */
const helpers = require('./../../../../utils/helpers.js');
const { saveMapUserActions } = require('../../../../core/maps/sql/mapSqlUserActions');
const responseName = 'responseEveMapRoutesRemoveHub';

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

    let map = core.mapController.get(_event.mapId);
    await map.removeHub(_event.solarSystemId);
    await saveMapUserActions(userId, _event.mapId, 'removeHub', { hub: _event.solarSystemId });

    api.send(_connectionId, _responseId, {
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(_connectionId, _responseId, responseName, 'Error on remove hub', {
      code: 0,
      handledError: err,
    });
  }
};

module.exports = request;