/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 4/4/21.
 */
const Subscriber    = require("./../../../utils/subscriber");
const mapSqlActions = require("./../sql/mapSqlActions.js");

class Chain {
    constructor(mapId, chainId) {
        this.mapId = mapId;
        this.chainId = chainId;
        this._notifyDynamicInfoSubscriber = false;
    }

    destructor () {
        this._dynamicInfoSubscriber && this._dynamicInfoSubscriber.destructor();
        delete this._dynamicInfoSubscriber;
        this._notifyDynamicInfoSubscriber = false;
    }

    connectionBreak (_connectionId) {
        this._notifyDynamicInfoSubscriber && this._dynamicInfoSubscriber.removeSubscribersByConnection(_connectionId);
    }

    _createDynamicInfoSubscriber () {
        if (!this._dynamicInfoSubscriber) {
            this._dynamicInfoSubscriber = new Subscriber({
                responseCommand: "responseEveMapChainData",
                onStart: () => this._notifyDynamicInfoSubscriber = true,
                onStop: () => this._notifyDynamicInfoSubscriber = false
            });
        }
    }

    subscribeDynamicInfo (connectionId, responseId) {
        this._createDynamicInfoSubscriber();
        this._dynamicInfoSubscriber.addSubscriber(connectionId, responseId);
        this._bulkDynamicInfo(connectionId, responseId);
    }

    unsubscribeDynamicInfo (_connectionId, _responseId) {
        if (this._dynamicInfoSubscriber) {
            this._dynamicInfoSubscriber.removeSubscriber(_connectionId, _responseId);
        }
    }

    async _bulkDynamicInfo (connectionId, responseId) {
        let info = await mapSqlActions.getLinkInfo(this.mapId, this.chainId);

        this._dynamicInfoSubscriber.notifyFor(connectionId, responseId, {
            type: "bulk",
            data: {
                solarSystemSource: info.solarSystemSource,
                solarSystemTarget: info.solarSystemTarget,
                massStatus: info.massStatus,
                timeStatus: info.timeStatus,
                shipSizeType: info.shipSizeType,
                wormholeType: info.wormholeType,
                countOfPassage: info.countOfPassage,
                created: info.created,
                updated: info.updated,
            }
        });
    }

    update (data) {
        if (this._notifyDynamicInfoSubscriber) {
            this._dynamicInfoSubscriber.notify({
                type: "updated",
                data: data
            });
        }
    }
}

module.exports = Chain;