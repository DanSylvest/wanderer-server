/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 11/29/20.
 */

module.exports = {
    link                        : require("./link/_dir"),
    routes                      : require("./routes/_dir"),
    solarSystem                 : require("./solarSystem/_dir"),

    add                         : require("./add"),
    addChain                    : require("./addChain"),
    addFast                     : require("./addFast"),
    edit                        : require("./edit"),
    remove                      : require("./remove"),
    list                        : require("./list"),
    info                        : require("./info"),
    subscribeMapExistence       : require("./subscribeMapExistence"),
    waypoint                    : require("./waypoint"),
    updateWatchStatus           : require("./updateWatchStatus"),
    subscribeAllowedMaps        : require("./subscribeAllowedMaps"),
    subscribeAllowedCharacters  : require("./subscribeAllowedCharacters"),
    subscribeOnlineCharacters   : require("./subscribeOnlineCharacters"),
    groups                      : require("./groups"),
    leaderboard                 : require("./leaderboard"),
};