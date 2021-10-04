/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 3/18/21.
 */

const Emitter = require("./../../../env/_new/tools/emitter");
const exist = require("./../../../env/tools/exist");
const Subscriber = require("./../../../utils/subscriber");

class MapUser extends Emitter {
    /**
     * @type {{charId : String, online: Boolean}[]}
     */
    characters = [];

    constructor(mapId, userId) {
        super();

        this.mapId = mapId;
        this.characterId = userId;

        this._notifyAllowedCharacters = false;
        this._allowedCharactersSubscriber = null;
    }

    destructor() {
        this.characters = []
        Emitter.prototype.destructor.call(this);
    }

    _createAllowedCharactersSubscriber() {
        if (!this._allowedCharactersSubscriber) {
            this._allowedCharactersSubscriber = new Subscriber({
                changeCheck: false,
                responseCommand: "responseAllowedCharactersSubscriber",
                onStart: function () {
                    this._notifyAllowedCharacters = true;
                }.bind(this),
                onStop: function () {
                    this._notifyAllowedCharacters = false;
                }.bind(this)
            });
        }
    }

    subscribeAllowedCharacters(connectionId, responseId) {
        this._createAllowedCharactersSubscriber();
        this._allowedCharactersSubscriber.addSubscriber(connectionId, responseId);
        this._bulkAvailableCharacters(connectionId, responseId);
    }

    unsubscribeAllowedCharacters(connectionId, responseId) {
        if (this._allowedCharactersSubscriber) {
            this._allowedCharactersSubscriber.removeSubscriber(connectionId, responseId);
        }
    }

    addedToAvailable({charId, online}) {
        if (!exist(this.characters.searchByObjectKey("charId", charId))) {
            this.characters.push({charId, online});

            if (this._notifyAllowedCharacters) {
                this._allowedCharactersSubscriber.notify({
                    type: "addedToAvailable",
                    data: {charId, online}
                });
            }
        }
    }

    removedFromAvailable(charId) {
        if (exist(this.characters.searchByObjectKey("charId", charId))) {
            this.characters.eraseByObjectKey("charId", charId);

            if (this._notifyAllowedCharacters) {
                this._allowedCharactersSubscriber.notify({
                    type: "removedFromAvailable",
                    data: charId
                });
            }
        }
    }

    onlineChanged(charId, online) {
        let obj = this.characters.searchByObjectKey("charId", charId);

        if (!obj) {
            debugger;
        }

        obj.online = online;

        if (this._notifyAllowedCharacters) {
            this._allowedCharactersSubscriber.notify({
                type: "onlineChanged",
                data: {charId, online}
            });
        }
    }

    _bulkAvailableCharacters(connectionId, responseId) {
        this._allowedCharactersSubscriber.notifyFor(connectionId, responseId, {
            type: "bulk",
            data: this.characters
        });
    }

    updateAllowedCharacters(characters) {
        this.characters = characters;
    }

    subscribersCount() {
        return !!this._allowedCharactersSubscriber ? this._allowedCharactersSubscriber.subscribersCount() : 0;
    }
}

module.exports = MapUser;