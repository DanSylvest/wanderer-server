const saveMapUserActions = async (userId, mapId, eventType, data = {}) => {
  await core.dbController.userActionsTable.add({
    userId,
    eventType,
    entityType: "map",
    entityId: mapId,
    additionalData: JSON.stringify(data),
  });
};

module.exports = { saveMapUserActions };
