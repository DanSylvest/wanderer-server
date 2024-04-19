/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/21/20.
 */

const NodeCache = require("node-cache");
const Emitter = require("../../env/_new/tools/emitter");

// const SEARCH_LIMIT = 12;

class CorporationsController extends Emitter {
  constructor() {
    super();

    this.infoCache = new NodeCache({
      stdTTL: 60 * 60,
      checkperiod: 60 * 10,
      useClones: false,
    });
  }

  async searchInEve(_match) {
    let result = Object.create(null);

    try {
      result = await core.esiApi.search(["corporation"], _match);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return [];
    }

    const ids = (result.corporation && result.corporation.slice(0, 15)) || [];
    const infoArr = await Promise.all(
      ids.map((x) => this.getPublicCorporationInfo(x)),
    );
    const out = infoArr.map((x, index) => ({
      id: ids[index],
      name: x.name,
    }));

    out.sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));

    return out;
  }

  async getPublicCorporationInfo(corporationId) {
    if (this.infoCache.has(corporationId)) {
      return this.infoCache.get(corporationId);
    }
    const info = await core.esiApi.corporation.info(corporationId);
    this.infoCache.set(corporationId, info);
    return info;
  }

  fastSearch(_options) {
    return this.searchInEve(_options.match);
  }
}

module.exports = CorporationsController;
