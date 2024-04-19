const Emitter = require("./../../../env/_new/tools/emitter");

class Search extends Emitter {
  accessToken;
  characterId;
  constructor({ accessToken, characterId }) {
    super();
    this.accessToken = accessToken;
    this.characterId = characterId;
    this._paused = false;
  }

  async search(type, match) {
    if (this._paused) {
      return [];
    }

    try {
      const token = await this.accessToken();
      const result = await core.esiApi.search(
        token,
        this.characterId,
        [type],
        match,
      );
      return result;
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      return [];
    }
  }

  serverStatusOffline() {
    this._paused = true;
  }

  serverStatusOnline() {
    this._paused = false;
  }
}

module.exports = Search;
