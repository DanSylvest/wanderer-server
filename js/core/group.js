/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 5/22/20.
 */

const Emitter = require("./../env/_new/tools/emitter");
const extend = require("./../env/tools/extend");

class Group extends Emitter {
    constructor(_options) {
        super();

        this.options = extend({
            groupId: null
        }, _options);

        this._observers = Object.create(null);
    }

    destructor() {
        Emitter.prototype.destructor.call(this);
    }

    async getAttribute(_attribute) {
        return await core.dbController.groupsDB.get(this.options.groupId, _attribute);
    }

    async getInfo() {
        try {
            let result = await core.dbController.groupsDB.get(this.options.groupId, ["name", "owner", "description"]);

            return {
                id: this.options.groupId,
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
    }

    connectionBreak(_connectionId) {

    }
}

module.exports = Group;