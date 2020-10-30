/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter      = require("./../env/tools/emitter");
var classCreator = require("./../env/tools/class");
var extend       = require("./../env/tools/extend");
var promise      = require("./../env/promise");
var log          = require("./log");
var printf       = require("./../env/tools/print_f");

var SubscriptionsController = classCreator("SubscriptionsController", Emitter, {
    constructor: function SubscriptionsController(_options) {
        this.options = extend({
            name: "defaultObserver",
            // /** @type Function */
            // accessToken: null,
            /** @type {*} */
            data: null
        }, _options);

        Emitter.prototype.constructor.call(this);

        this._subscribers = [];
        this._data = this.options.data;
    },
    start: function () {
        log(log.DEBUG, printf("SubscriptionController [%s] has started", this.options.name));
        // this._observer = this._createObserver();
        // this._observer.start();
        // this._observer.on("change", this._onObserverChange.bind(this));
    },
    addSubscriber: function (_connectionId, _responseId) {
        log(log.DEBUG, printf("SubscriptionController [%s] add subscriber [%s - %s]", this.options.name, _connectionId, _responseId));

        // when we add first subscriber we need start subscription
        if(!this._checkSubscribers()){
            // this._observer.start();
        }

        this._subscribers.push({
            connectionId: _connectionId,
            responseId:_responseId
        })
    },
    removeSubscriber: function (_connectionId, _responseId) {
        log(log.DEBUG, printf("SubscriptionController [%s] remove subscriber [%s - %s]", this.options.name, _connectionId, _responseId));

        for (var a = 0; a < this._subscribers.length; a++) {
            if(this._subscribers[a].connectionId === _connectionId && this._subscribers[a].responseId === _responseId) {
                this._subscribers.removeByIndex(a);
                break;
            }
        }
    },
    removeSubscribersByConnection: function (_connectionId) {
        log(log.DEBUG, printf("SubscriptionController [%s] remove subscriber by connection [%s]", this.options.name, _connectionId));
        for (var a = 0; a < this._subscribers.length; a++) {
            if(this._subscribers[a].connectionId === _connectionId) {
                this._subscribers.removeByIndex(a);
            }
        }
    },
    _checkSubscribers: function () {
        // We need check subscribers count for valid this requests.
        // If subscribers equal zero, we need get response and stop process
        // because it no need anyone
        return this._subscribers.length > 0;
    },
    _createObserver: function () {
        return null;
    },
    _onObserverChange: function (_data) {
        if(this._data === _data){
            // do nothing
        } else {
            this._data = _data;
            this._onValueChanged(this._data);
        }
    },
    _onValueChanged: function (_value) {
        log(log.DEBUG, printf("SubscriptionController [%s] value updated [%s]", this.options.name, JSON.stringify(this._data)));


        if(this._checkSubscribers()) {
            this._notify();
        } else {
            // this._observer.stop();
        }
        // this._update().then(function(){
        //     if(this._checkSubscribers()) {
        //         this._notify();
        //     } else {
        //         // this._observer.stop();
        //     }
        // }.bind(this), function(_err){
        //     // Error on update value in subscriptionsController
        //     debugger;
        // }.bind(this));
    },
    _notify: function () {
        log(log.DEBUG, printf("SubscriptionController [%s] notify subscribers", this.options.name));

        for (var a = 0; a < this._subscribers.length; a++) {
            var subscriber = this._subscribers[a];

            this._notifySubscriber(subscriber.connectionId, subscriber.responseId);
        }
    },
    _notifySubscriber: function (_connectionId, _responseId) {
        // do nothing
    },
    // _update: function () {
    //     var pr = new promise();
    //
    //     pr.resolve();
    //
    //     return pr.native;
    // }
});

module.exports = SubscriptionsController;