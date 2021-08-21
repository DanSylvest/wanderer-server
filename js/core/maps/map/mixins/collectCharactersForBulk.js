module.exports = {
    collectCharactersInfo() {
        const out = [];
        for (const characterId in this.characters) {
            const shipTypeId = this.characters[characterId].currentShipType();
            const locationId = this.characters[characterId].location();

            if (locationId && shipTypeId) {
                out.push({characterId, shipTypeId, locationId});
            }
        }
        return out;
    },

    /**
     *
     * @param charId
     * @returns {null|{shipTypeId, locationId: *}}
     */
    getCharacterInfo(charId) {
        if (this.characters[charId]) {
            const shipTypeId = this.characters[charId].currentShipType();
            const locationId = this.characters[charId].location();

            if (locationId && shipTypeId) {
                return {locationId, shipTypeId};
            }
        }

        return null;
    }
}