const helpers = require('./../../../utils/helpers.js');
const { checkAccessToMapByUser } = require('./../../../core/maps/utils/checkAccessToMapByUser');
const { getMapLeaderboard } = require('../../../core/maps/sql/mapSqlActions');

const responseName = 'responseEveMapLeaderboard';
const NodeCache = require("node-cache");


const dataCache = new NodeCache({
  stdTTL: 60 * 60 * 10,
  checkperiod: 60 * 60 * 5,
  useClones: false,
});

/**
 *
 * @param _connectionId
 * @param _responseId
 * @param _event
 * @param _event.mapId
 * @returns {Promise<void>}
 */
const request = async function (_connectionId, _responseId, _event) {
  const { mapId } = _event;

  // we need get token by connection
  const token = core.connectionStorage.get(_connectionId);

  // when token is undefined - it means what you have no rights
  if (token === undefined) {
    helpers.errResponse(_connectionId, _responseId, responseName, 'You not authorized or token was expired', { code: 1 });
    return;
  }

  try {
    await core.tokenController.checkToken(token);

    let res;
    if (dataCache.has(mapId)) {
      res = dataCache.get(mapId);
    } else {
      res = await getMapLeaderboard(mapId);
      dataCache.set(mapId, res);
    }

    api.send(_connectionId, _responseId, {
      data: { activity: res },
      success: true,
      eventType: responseName,
    });
  } catch (err) {
    helpers.errResponse(_connectionId, _responseId, responseName, 'Error on getting map leaderboard', {
      code: 0,
      handledError: err,
    });
  }
};

module.exports = request;