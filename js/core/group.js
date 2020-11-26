/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/22/20.
 */

var Emitter       = require("./../env/tools/emitter");
var classCreator  = require("./../env/tools/class");
var extend        = require("./../env/tools/extend");

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
    async getAttribute (_attribute) {
        return await core.dbController.groupsDB.get(this.options.groupId, _attribute);
    },
    async getInfo () {
        try {
            let result = await core.dbController.groupsDB.get(this.options.groupId, ["name", "owner", "description"]);
            return {
                name: result.name,
                owner: result.owner,
                description: result.description
            }
        } catch (err) {
            throw {
                sub: err,
                message: `Error on getInfo by [${this.options.groupId}]`
            }
        }
    },
    connectionBreak: function (_connectionId) {

    }
});

module.exports = Group;