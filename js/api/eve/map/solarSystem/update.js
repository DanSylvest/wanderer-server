const helpers = require('./../../../../utils/helpers.js');
const { saveMapUserActions } = require('../../../../core/maps/sql/mapSqlUserActions');
const responseName = 'responseEveMapSystemsUpdate';

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @param _event.systemId
 * @param _event.data
 * @returns {Promise<void>}
 */
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
    await core.mapController.get(_event.mapId).updateSystem(_event.systemId, _event.data);

    await saveMapUserActions(userId, _event.mapId, 'updateSolarSystem', {
      solarSystemId: _event.systemId,
      data: _event.data,
    });

    api.send(_connectionId, _responseId, {
      success: true,
      eventType: 'responseEveMapSystemsUpdate',
    });
  } catch (err) {
    helpers.errResponse(_connectionId, _responseId, responseName, 'Error on update solar system', {
      code: 0,
      handledError: err,
    });
  }
};

module.exports = request;