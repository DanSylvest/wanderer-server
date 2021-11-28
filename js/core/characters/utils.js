const getCorporationId = async (characterId) => {
    let {corporationId} = await core.charactersController.getPublicCharacterInfo(characterId);
    return corporationId || -1;
};

const getAllianceId = async (characterId) => {
    let {allianceId} = await core.charactersController.getPublicCharacterInfo(characterId);
    return allianceId || -1;
};

const getName = async (characterId) => {
    let {name} = await core.dbController.charactersDB.get(characterId, ["name"]);
    return name;
};

const getCorporationName = async (corporationId) => {
    const {name} = await core.corporationsController.getPublicCorporationInfo(corporationId);
    return name;
};

const getAllianceName = async (allianceId) => {
    const {name} = await core.alliancesController.getPublicAllianceInfo(allianceId);
    return name;
};

module.exports = {getName, getCorporationId, getAllianceId, getCorporationName, getAllianceName};