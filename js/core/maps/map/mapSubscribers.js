/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 3/30/21.
 */
const Subscriber = require("./../../../utils/subscriber");

class MapSubscribers {
    constructor(map) {
        this.map = map;
        this._notifySystems = false;
        this._notifyLinks = false;
    }
    destructor () {
        this._notifySystems = false;
        this._notifyLinks = false;

        delete this.map;

        if(this._existenceSubscriber) {
            this._existenceSubscriber.notify(false);
            this._existenceSubscriber.destructor();
            this._systemsSubscriber = null;
        }

        if(this._systemsSubscriber) {
            this._systemsSubscriber.destructor();
            this._systemsSubscriber = null;
        }

        if(this._linksSubscriber) {
            this._linksSubscriber.destructor();
            this._linksSubscriber = null;
        }
    }
    connectionBreak (_connectionId) {
        this._systemsSubscriber && this._systemsSubscriber.removeSubscribersByConnection(_connectionId);
        this._linksSubscriber && this._linksSubscriber.removeSubscribersByConnection(_connectionId);
    }
    _createExistenceSubscriber () {
        if(!this._existenceSubscriber) {
            this._existenceSubscriber = new Subscriber({
                responseCommand: "responseEveMapExistence",
                onStart: function () {
                    this._notifyExistence = true;
                }.bind(this),
                onStop: function () {
                    this._notifyExistence = false;
                }.bind(this)
            });
        }
    }
    _createSystemsSubscriber () {
        if (!this._systemsSubscriber) {
            this._systemsSubscriber = new Subscriber({
                responseCommand: "responseEveMapSystems",
                onStart: function () {
                    this._notifySystems = true;
                }.bind(this),
                onStop: function () {
                    this._notifySystems = false;
                }.bind(this)
            });
        }
    }
    _createLinksSubscriber () {
        if(!this._linksSubscriber) {
            this._linksSubscriber = new Subscriber({
                responseCommand: "responseEveMapLinks",
                onStart: function () {
                    this._notifyLinks = true;
                }.bind(this),
                onStop: function () {
                    this._notifyLinks = false;
                }.bind(this)
            });
        }
    }
    async subscribeSystems (connectionId, responseId) {
        this._createSystemsSubscriber();
        this._systemsSubscriber.addSubscriber(connectionId, responseId);

        let systems = await this.map.getSystems();
        this._systemsSubscriber.notifyFor(connectionId, responseId, {
            type: "bulk",
            list: systems
        });
    }
    unsubscribeSystems (_connectionId, _responseId) {
        if (this._systemsSubscriber) {
            this._systemsSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    }
    async subscribeLinks (connectionId, responseId) {
        this._createLinksSubscriber()
        this._linksSubscriber.addSubscriber(connectionId, responseId);

        let links = await this.map.getLinks();
        this._linksSubscriber.notifyFor(connectionId, responseId, {
            type: "bulk",
            list: links
        });
    }
    unsubscribeLinks (_connectionId, _responseId) {
        if (this._linksSubscriber) {
            this._linksSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    }
    subscribeExistence (connectionId, responseId) {
        this._createExistenceSubscriber();
        this._existenceSubscriber.addSubscriber(connectionId, responseId);
    }
    unsubscribeExistence (connectionId, responseId) {
        if (this._existenceSubscriber) {
            this._existenceSubscriber.removeSubscriber(connectionId, responseId);
        }
    }
    // API
    async notifySystemAdd (solarSystemId) {
        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "add",
                solarSystemId: solarSystemId.toString()
            });
        }
    }
    notifySystemRemoved (solarSystemId) {
        if (this._notifySystems && this._systemsSubscriber) {
            this._systemsSubscriber.notify({
                type: "removed",
                solarSystemId: solarSystemId
            });
        }
    }

    notifyLinkAdded (chainId) {
        if (this._notifyLinks) {
            this._linksSubscriber.notify({
                type: "add",
                chainId: chainId
            })
        }
    }

    notifyLinkRemoved (chainId) {
        if (this._notifyLinks) {
            this._linksSubscriber.notify({
                type: "removed",
                chainId: chainId
            })
        }
    }
}

module.exports = MapSubscribers;