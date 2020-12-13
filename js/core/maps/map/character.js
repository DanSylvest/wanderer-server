/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 11/15/20.
 */

const Emitter = require("./../../../env/tools/emitter");
const exist = require("./../../../env/tools/exist");
const classCreator = require("./../../../env/tools/class");

const DROP_TIMEOUT = 15000;
const MapCharacter = classCreator("MapCharacter", Emitter, {
    constructor (characterId) {
        Emitter.prototype.constructor.call(this);

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
    },
    destructor () {
        this.dropTimerId !== -1 && clearTimeout(this.dropTimerId);
        this.dropTimerId = -1;

        this.onlineAttr.off(this.onlineSubscribeId);

        this.locationAttr && this.locationAttr.off(this.locationSubscribeId);
        this.shipAttr && this.shipAttr.off(this.shipSubscribeId);

        Emitter.prototype.destructor.call(this);
    },
    init () {
        this.onlineAttr = core.charactersController.get(this.characterId).get("online");
        this.onlineSubscribeId = this.onlineAttr.on("change", this._onOnlineChange.bind(this));
        this.onlineValue = false;
    },
    startDropTimer () {
        this.dropTimerId !== -1 && clearTimeout(this.dropTimerId);
        this.dropTimerId = setTimeout(() => {
            this.dropTimerId = -1;
            this.emit("drop");
        }, DROP_TIMEOUT);
    },
    cancelDropTimer () {
        clearTimeout(this.dropTimerId);
        this.dropTimerId = -1;
    },
    clearCurrentLocation () {
        this.locationValue = null;
    },
    currentLocation () {
        return this.locationValue;
    },
    _onOnlineChange (_isOnline) {
        // when state change from false to true
        // we need start observer location of character
        if (_isOnline && !this.onlineValue) {
            this.locationAttr = core.charactersController.get(this.characterId).get("location");
            this.locationSubscribeId = this.locationAttr.on("change", this._onLocationChange.bind(this));

            this.shipAttr = core.charactersController.get(this.characterId).get("ship");
            this.shipSubscribeId = this.shipAttr.on("change", this._onShipChange.bind(this));

            this.locationValue = null; // ?? Что это за странная фигня. Если разберусь почему надо описать
            this.onlineValue = true;
        }

            // when state change from true to false
        // we need off subscribe from character
        else if (!_isOnline && this.onlineValue) {
            if (this.locationValue !== null) {
                this.shipAttr.off(this.shipSubscribeId);
                this.shipAttr = null;
                this.shipSubscribeId = null;

                this.locationAttr.off(this.locationSubscribeId);
                this.locationAttr = null;
                this.locationSubscribeId = null;
                this.locationValue = null;
                this.onlineValue = false
            }

            this.emit("leaveSystem");
        }
    },
    /**
     * It will called when character location state is changed
     * Location - it is solar system id
     *
     * @param _characterId
     * @param _location
     * @private
     */
    _onLocationChange ( _location) {
        let location = _location.toString();

        // Когда персонаж только начал отслеживаться на карте
        if (this.locationValue === null && location) {
            // надо проверить, есть ли такая система на карте
            // если такой системы нет, то надо бы ее добавить
            // линк, создавать нет необходимости
            // надо добавить персонажа в систему
            this.locationValue = location;

            this.emit("enterInSystem", location);
            // this._characterEnterToSystem(this.characterId, location);
        }

        // Когда персонаж сделал переход из одной системы в другую
        else if (this.locationValue && location && this.locationValue !== location) {
            // надо проверить, есть ли такая система на карте
            // если такой системы нет, то надо бы ее добавить
            // надо добавить персонажа в систему _location
            // надо удалить персонажа из системы characterData.locationValue
            // надо проверить, существует ли уже линк между системами
            // если существует, то инкрементировать счетчик прохода
            // если не существует, то следует создать

            var oldSystem = this.locationValue;
            this.locationValue = location;

            this.emit("moveToSystem", oldSystem, location);
        }
    },

    _onShipChange (_characterId, _shipTypeId) {
        // todo Пока ничего делать не надо, но в будущем надо отправлять уведомление, что тип шипа поменялся
    },
    isOnline () {
        return exist(this.onlineValue) ? this.onlineValue : false;
    },
    location () {
        return this.locationValue;
    }
});

module.exports = MapCharacter;
