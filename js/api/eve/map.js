/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/29/20.
 */

module.exports = {
    add                   : require("./map/add"),
    edit                  : require("./map/edit"),
    remove                : require("./map/remove"),
    list                  : require("./map/list"),
    allowedMaps           : require("./map/allowedMaps"),
    info                  : require("./map/info"),
    subscribeMapSystems   : require("./map/subscribeMapSystems"),
    subscribeMapLinks     : require("./map/subscribeMapLinks"),
    systemInfo            : require("./map/systemInfo"),
    linkInfo              : require("./map/linkInfo"),
    linkRemove            : require("./map/linkRemove"),
    systemRemove          : require("./map/systemRemove"),
    systemsRemove         : require("./map/systemsRemove"),
    updateSystemsPosition : require("./map/updateSystemsPosition"),
    updateSystem          : require("./map/updateSystem"),
    updateLink            : require("./map/updateLink"),
    waypoint              : require("./map/waypoint"),
};