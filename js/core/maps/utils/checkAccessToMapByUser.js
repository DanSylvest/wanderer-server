const checkAccessToMapByUser = async (userId, mapId) => {
    const maps = await core.mapController.getMapsWhereCharacterTrackByUser(userId);
    return maps.includes(mapId);
}

module.exports = {checkAccessToMapByUser};