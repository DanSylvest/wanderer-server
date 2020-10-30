/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var extend        = require("./../env/tools/extend");
var print_f       = require("./../env/tools/print_f");
var Path          = require("./../env/tools/path");
var CustomPromise = require("./../env/promise");
var fs            = require("fs");

// var OnlineSubscriptionsController = require("./../utils/subscriptionsController/online");

var Group = classCreator("Group", Emitter, {
    constructor: function Group(_options) {
        this.options = extend({
            groupId: null
        },_options);

        Emitter.prototype.constructor.call(this);

        this._observers = Object.create(null);
    },
    destructor: function () {
        Emitter.prototype.destructor.call(this);
    },
    getAttribute: function (_attribute) {
        var pr = new CustomPromise();

        core.dbController.groupsDB.get(this.options.groupId, _attribute).then(function(_value){
            pr.resolve(_value);
        }.bind(this), function(_err){
            pr.reject(_err);
        }.bind(this));

        return pr.native;
    },
    getInfo: function () {
        var pr = new CustomPromise();

        var attrs = ["name", "owner", "description"];
        core.dbController.groupsDB.get(this.options.groupId, attrs).then(function (_result) {
            pr.resolve({
                name: _result.name,
                owner: _result.owner,
                description: _result.description
            })
        }.bind(this), function (_err) {
            pr.reject({
                sub: _err,
                message: print_f("Error on getInfo by [%s]", this.options.groupId)
            })
        }.bind(this))

        // var prarr = [];
        //
        // prarr.push(core.dbController.groupsDB.getById(this.options.groupId, "name"));
        // prarr.push(core.dbController.groupsDB.getById(this.options.groupId, "owner"));
        // prarr.push(core.dbController.groupsDB.getById(this.options.groupId, "description"));
        //
        // Promise.all(prarr).then(function (_arr) {
        //     pr.resolve({
        //         name: _arr[0],
        //         owner: _arr[1],
        //         description: _arr[2]
        //     })
        // }.bind(this), function (_err) {
        //     pr.reject({
        //         sub: _err,
        //         message: print_f("Error on getInfo by [%s]", this.options.groupId)
        //     })
        // }.bind(this));

        return pr.native;
    },
    connectionBreak: function (_connectionId) {

    }
});



module.exports = Group;