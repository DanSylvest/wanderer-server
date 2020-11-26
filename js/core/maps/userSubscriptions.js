/**
 * Created by Aleksey Chichenkov <a.chichenkov@initi.ru> on 11/26/20.
 */
const Subscriber = require("./../../utils/subscriber");

class AllowedMapsForUser {
    constructor(userId) {
        this.userId = userId;
        this.subscription = null;
        this.notify = false;
        this.data = null;
    }

    deinit () {
        this.userId = null;
        this.subscription.destructor();
    }

    _create () {
        if (!this.subscription) {
            this.subscription = new Subscriber({
                responseCommand: "allowedMapsSubscriptionUpdate",
                onStart: () => {
                    this.notify = true
                },
                onStop: () => {
                    this.notify = false
                }
            });
        }
    }

    setData (data) {
        this.data = data;
    }

    getData () {
        return this.data;
    }

    subscribe (connectionId, responseId) {
        this._create();
        this.subscription.addSubscriber(connectionId, responseId);
    }

    unsubscribe (connectionId, responseId) {
        if(this.subscription)
            this.subscription.removeSubscriber(connectionId, responseId);
    }
}

class UserSubscriptions {
    constructor() {
        this.users = Object.create(null);
    }

    /**
     *
     * @param userId
     * @returns {{allowedMaps: AllowedMapsForUser}}
     */
    getUser (userId) {
        if(!this.users[userId]) {
            this.users[userId] = Object.create(null);
            this.users[userId].allowedMaps = new AllowedMapsForUser(userId);
        }

        return this.users[userId];
    }

    getUsers (){
        return Object.keys(this.users);
    }


    removeUser (userId) {
        if(this.users[userId]) {
            this.users[userId].allowedMaps.deinit();
            delete this.users[userId];
        }
    }

}

module.exports = UserSubscriptions;