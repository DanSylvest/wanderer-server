/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");
var extend       = require("./../env/tools/extend");
var log          = require("./log");
var printf       = require("./../env/tools/print_f");

var SubscriptionsController = classCreator("SubscriptionsController", Emitter, {
    constructor: function SubscriptionsController(_options) {
        this.options = extend({
            name: "defaultObserver",
            /** @type {*} */
            data: null,
            onStart: null,
            onStop: null,
            responseCommand: "",
            changeCheck: true
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._subscribers = [];
        this._data = this.options.data;
    },
    addSubscriber: function (_connectionId, _responseId) {
        log(log.DEBUG, printf("SubscriptionController [%s] add subscriber [%s - %s]", this.options.name, _connectionId, _responseId));

        this._subscribers.push({
            connectionId: _connectionId,
            responseId:_responseId
        });

        if(this._subscribers.length === 1) {
            this.options.onStart();
        }
    },
    removeSubscriber: function (_connectionId, _responseId) {
        log(log.DEBUG, printf("SubscriptionController [%s] remove subscriber [%s - %s]", this.options.name, _connectionId, _responseId));

        for (var a = 0; a < this._subscribers.length; a++) {
            if(this._subscribers[a].connectionId === _connectionId && this._subscribers[a].responseId === _responseId) {
                this._subscribers.removeByIndex(a);
                break;
            }
        }

        if(this._subscribers.length === 0) {
            this.options.onStop();
        }
    },
    removeSubscribersByConnection: function (_connectionId) {
        log(log.DEBUG, printf("SubscriptionController [%s] remove subscriber by connection [%s]", this.options.name, _connectionId));
        for (var a = 0; a < this._subscribers.length; a++) {
            if(this._subscribers[a].connectionId === _connectionId) {
                this._subscribers.removeByIndex(a);
            }
        }

        if(this._subscribers.length === 0) {
            this.options.onStop();
        }
    },
    _checkSubscribers: function () {
        // We need check subscribers count for valid this requests.
        // If subscribers equal zero, we need get response and stop process
        // because it no need anyone
        return this._subscribers.length > 0;
    },
    _onValueChanged: function (_value) {
        log(log.DEBUG, printf("SubscriptionController [%s] value updated [%s]", this.options.name, JSON.stringify(this._data)));

        if(this._subscribers.length > 0) {
            this._notify();
        }
    },
    notify: function (_data) {
        if(!this.options.changeCheck || this._data !== _data){

            this._data = _data;
            log(log.DEBUG, printf("SubscriptionController [%s] value updated [%s]", this.options.name, JSON.stringify(this._data)));

            if(this._subscribers.length > 0) {
                this._notify();
            }
        }
    },
    _notify: function () {
        log(log.DEBUG, printf("SubscriptionController [%s] notify subscribers", this.options.name));

        for (var a = 0; a < this._subscribers.length; a++) {
            var subscriber = this._subscribers[a];

            this._notifySubscriber(subscriber.connectionId, subscriber.responseId);
        }
    },
    _notifySubscriber: function (_connectionId, _responseId) {
        api.send(_connectionId, _responseId, {
            data: this._data,
            success: true,
            eventType: "responseEveCharacterOnline"
        });
    }
});

module.exports = SubscriptionsController;