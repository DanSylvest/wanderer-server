/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 3/30/21.
 */
const Subscriber = require("../../../utils/_new/subscriber");

class MapSubscribers {
  constructor(map) {
    this.map = map;

    this._notifySystems = false;
    this._notifyLinks = false;
  }

  destructor() {
    this._notifySystems = false;
    this._notifyLinks = false;

    delete this.map;

    if (this._existenceSubscriber) {
      this._existenceSubscriber.notify(false);
      this._existenceSubscriber.destructor();
      delete this._systemsSubscriber;
    }

    if (this._systemsSubscriber) {
      this._systemsSubscriber.destructor();
      delete this._systemsSubscriber;
    }

    if (this._hubsSubscriber) {
      this._hubsSubscriber.destructor();
      delete this._hubsSubscriber;
    }

    if (this._linksSubscriber) {
      this._linksSubscriber.destructor();
      delete this._linksSubscriber;
    }

    if (this._onlineCharactersSubscriber) {
      this._onlineCharactersSubscriber.destructor();
      delete this._onlineCharactersSubscriber;
    }
  }

  connectionBreak(_connectionId) {
    this._systemsSubscriber &&
      this._systemsSubscriber.removeSubscribersByConnection(_connectionId);
    this._linksSubscriber &&
      this._linksSubscriber.removeSubscribersByConnection(_connectionId);
    this._hubsSubscriber &&
      this._hubsSubscriber.removeSubscribersByConnection(_connectionId);
    this._onlineCharactersSubscriber &&
      this._onlineCharactersSubscriber.removeSubscribersByConnection(
        _connectionId,
      );
  }

  _createExistenceSubscriber() {
    if (!this._existenceSubscriber) {
      this._existenceSubscriber = new Subscriber({
        responseCommand: "responseEveMapExistence",
        onStart: () => (this._notifyExistence = true),
        onStop: () => (this._notifyExistence = false),
      });
    }
  }

  _createSystemsSubscriber() {
    if (!this._systemsSubscriber) {
      this._systemsSubscriber = new Subscriber({
        responseCommand: "responseEveMapSystems",
        onStart: () => (this._notifySystems = true),
        onStop: () => (this._notifySystems = false),
      });
    }
  }

  _createHubsSubscriber() {
    if (!this._hubsSubscriber) {
      this._hubsSubscriber = new Subscriber({
        responseCommand: "responseSubscribeHubs",
        onStart: () => (this._notifyHubs = true),
        onStop: () => (this._notifyHubs = false),
      });
    }
  }

  _createLinksSubscriber() {
    if (!this._linksSubscriber) {
      this._linksSubscriber = new Subscriber({
        responseCommand: "responseEveMapLinks",
        onStart: () => (this._notifyLinks = true),
        onStop: () => (this._notifyLinks = false),
      });
    }
  }

  _createOnlineCharactersSubscriber() {
    if (!this._onlineCharactersSubscriber) {
      this._onlineCharactersSubscriber = new Subscriber({
        responseCommand: "responseOnlineCharactersSubscriber",
      });
    }
  }

  async subscribeHubs(connectionId, responseId) {
    this._createHubsSubscriber();
    this._hubsSubscriber.addSubscriber(connectionId, responseId);

    const list = await this.map.getHubs();
    this._hubsSubscriber.notifyFor(connectionId, responseId, {
      type: "bulk",
      list,
    });
  }

  unsubscribeHubs(_connectionId, _responseId) {
    if (this._hubsSubscriber) {
      this._hubsSubscriber.removeSubscriber(_connectionId, _responseId);
    }
  }

  async subscribeSystems(connectionId, responseId) {
    this._createSystemsSubscriber();
    this._systemsSubscriber.addSubscriber(connectionId, responseId);

    const systems = await this.map.getSystems();
    this._systemsSubscriber.notifyFor(connectionId, responseId, {
      type: "bulk",
      list: systems,
    });
  }

  unsubscribeSystems(_connectionId, _responseId) {
    if (this._systemsSubscriber) {
      this._systemsSubscriber.removeSubscriber(_connectionId, _responseId);
    }
  }

  async subscribeLinks(connectionId, responseId) {
    this._createLinksSubscriber();
    this._linksSubscriber.addSubscriber(connectionId, responseId);

    const links = await this.map.getLinks();
    this._linksSubscriber.notifyFor(connectionId, responseId, {
      type: "bulk",
      list: links,
    });
  }

  unsubscribeLinks(_connectionId, _responseId) {
    if (this._linksSubscriber) {
      this._linksSubscriber.removeSubscriber(_connectionId, _responseId);
    }
  }

  subscribeExistence(connectionId, responseId) {
    this._createExistenceSubscriber();
    this._existenceSubscriber.addSubscriber(connectionId, responseId);
  }

  unsubscribeExistence(connectionId, responseId) {
    if (this._existenceSubscriber) {
      this._existenceSubscriber.removeSubscriber(connectionId, responseId);
    }
  }

  subscribeOnlineCharacters(connectionId, responseId) {
    this._createOnlineCharactersSubscriber();

    this._onlineCharactersSubscriber.addSubscriber(connectionId, responseId);
    const chars = this.map.collectCharactersInfo();
    this._onlineCharactersSubscriber.notifyFor(connectionId, responseId, {
      type: "bulk",
      data: chars,
    });
  }

  unsubscribeOnlineCharacters(connectionId, responseId) {
    if (this._onlineCharactersSubscriber) {
      this._onlineCharactersSubscriber.removeSubscriber(
        connectionId,
        responseId,
      );
    }
  }

  // API
  async notifySystemAdd(solarSystemId) {
    if (this._notifySystems && this._systemsSubscriber) {
      this._systemsSubscriber.notify({
        type: "add",
        solarSystemId: solarSystemId.toString(),
      });
    }
  }

  notifySystemRemoved(solarSystemId) {
    if (this._notifySystems && this._systemsSubscriber) {
      this._systemsSubscriber.notify({
        type: "removed",
        solarSystemId,
      });
    }
  }

  notifyLinkAdded(chainId) {
    if (this._notifyLinks) {
      this._linksSubscriber.notify({
        type: "add",
        chainId,
      });
    }
  }

  notifyLinkRemoved(chainId) {
    if (this._notifyLinks) {
      this._linksSubscriber.notify({
        type: "removed",
        chainId,
      });
    }
  }

  notifyHubAdded(hubId) {
    if (this._notifyLinks) {
      this._hubsSubscriber.notify({
        type: "add",
        hubId: hubId.toString(),
      });
    }
  }

  notifyHubRemoved(hubId) {
    if (this._notifyLinks) {
      this._hubsSubscriber.notify({
        type: "removed",
        hubId: hubId.toString(),
      });
    }
  }

  notifyCharacterOnlineUpdatedLocation(characterId, oldLocation, locationId) {
    if (!this._onlineCharactersSubscriber) {
      return;
    }

    this._onlineCharactersSubscriber.notify({
      type: "updatedLocation",
      data: { characterId, oldLocation, locationId },
    });
  }

  notifyCharacterOnlineUpdatedShipType(characterId, shipTypeId) {
    if (!this._onlineCharactersSubscriber) {
      return;
    }

    this._onlineCharactersSubscriber.notify({
      type: "updatedShipType",
      data: { characterId, shipTypeId },
    });
  }

  notifyCharacterOnlineAdded(characterId) {
    if (!this._onlineCharactersSubscriber) {
      return;
    }

    const { locationId, shipTypeId } = this.map.getCharacterInfo(characterId);

    this._onlineCharactersSubscriber.notify({
      type: "added",
      data: { characterId, locationId, shipTypeId },
    });
  }

  notifyCharacterOnlineRemoved(characterId) {
    if (!this._onlineCharactersSubscriber) {
      return;
    }

    this._onlineCharactersSubscriber.notify({
      type: "removed",
      data: { characterId },
    });
  }
}

module.exports = MapSubscribers;
