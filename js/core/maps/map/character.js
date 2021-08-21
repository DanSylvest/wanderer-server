/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 11/15/20.
 */

const Emitter = require("./../../../env/_new/tools/emitter");
const exist = require("./../../../env/tools/exist");

let counter = 0;
const ST_INITIAL = counter++;
const ST_WAIT_ONLINE = counter++;
const ST_WAIT_SHIP_TYPE = counter++;
const ST_WAIT_LOCATION = counter++;
const ST_READY = counter++;


const DROP_TIMEOUT = 15000;
class MapCharacter extends Emitter {
    constructor(characterId) {
        super();

        this.characterId = characterId;

        this.dropTimerId = -1;
        this.onlineSubscribeId = null;
        this.onlineAttr = null;
        this.onlineValue = null;

        this.locationAttr = null;
        this.locationSubscribeId = null;
        this.locationValue = null;

        this.shipAttr = null;
        this.shipSubscribeId = null;
        this.shipValue = null;

        this.state = ST_INITIAL;
    }

    destructor() {
        this.dropTimerId !== -1 && clearTimeout(this.dropTimerId);
        this.dropTimerId = -1;

        this.onlineAttr.off(this.onlineSubscribeId);

        this.locationAttr && this.locationAttr.off(this.locationSubscribeId);
        this.shipAttr && this.shipAttr.off(this.shipSubscribeId);

        Emitter.prototype.destructor.call(this);
    }

    init() {
        this.state = ST_WAIT_ONLINE;
        this.onlineAttr = core.charactersController.get(this.characterId).get("online");
        this.onlineSubscribeId = this.onlineAttr.on("change", this._onOnlineChange.bind(this));
        this.onlineValue = false;
    }

    startDropTimer() {
        this.dropTimerId !== -1 && clearTimeout(this.dropTimerId);
        this.dropTimerId = setTimeout(() => {
            this.dropTimerId = -1;
            this.emit("drop");
        }, DROP_TIMEOUT);
    }

    cancelDropTimer() {
        clearTimeout(this.dropTimerId);
        this.dropTimerId = -1;
    }

    watchToShipType() {
        this.shipAttr = core.charactersController.get(this.characterId).get("ship");
        this.shipSubscribeId = this.shipAttr.on("change", this._onShipChange.bind(this));
    }

    watchToLocation() {
        this.locationAttr = core.charactersController.get(this.characterId).get("location");
        this.locationSubscribeId = this.locationAttr.on("change", this._onLocationChange.bind(this));
    }

    dropWatches() {
        if (this.shipSubscribeId !== null) {
            this.shipAttr.off(this.shipSubscribeId);
            this.shipAttr = null;
            this.shipSubscribeId = null;
            this.shipValue = null;
        }

        if (this.locationSubscribeId !== null) {
            this.locationAttr.off(this.locationSubscribeId);
            this.locationAttr = null;
            this.locationSubscribeId = null;
            this.locationValue = null;
        }
    }

    _onOnlineChange(_isOnline) {
        switch (this.state) {
            case ST_WAIT_ONLINE:
                if (_isOnline && !this.onlineValue) {
                    this.onlineValue = true;
                    this.state = ST_WAIT_SHIP_TYPE;
                    this.watchToShipType();
                }
                break;
            default:
                if (!_isOnline && this.onlineValue) {
                    this.onlineValue = false;
                    this.dropWatches();
                    this.state = ST_WAIT_ONLINE;
                    this.emit("leaveSystem");
                }
        }

        this.emit("onlineChanged", _isOnline);
    }

    _onShipChange(shipTypeId) {
        this.shipValue = shipTypeId;

        switch (this.state) {
            case ST_WAIT_ONLINE:
            case ST_WAIT_LOCATION:
                break;
            case ST_WAIT_SHIP_TYPE:
                this.watchToLocation();
                this.state = ST_WAIT_LOCATION;
                break;
            case ST_READY:
                this.emit("shipChanged", this.shipValue);
                break;
        }
    }

    /**
     * It will called when character location state is changed
     * Location - it is solar system id
     *
     * @param _location
     * @private
     */
    _onLocationChange(_location) {
        let location = _location.toString();

        switch (this.state) {
            case ST_WAIT_LOCATION:
                this.state = ST_READY;
                this.locationValue = location;
                this.emit("enterInSystem", location);
                break;
            case ST_READY:
                if (this.locationValue !== location) {
                    let oldSystem = this.locationValue;
                    this.locationValue = location;
                    this.emit("moveToSystem", oldSystem, location);
                }
        }
    }

    isOnline() {
        return exist(this.onlineValue) ? this.onlineValue : false;
    }

    location() {
        return this.locationValue;
    }

    currentShipType() {
        return this.shipValue;
    }
}

module.exports = MapCharacter;
