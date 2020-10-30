/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/29/20.
 */

module.exports = {
    add                             : require("./group/add"),
    list                            : require("./group/list"),
    info                            : require("./group/info"),
    fastSearch                      : require("./group/fastSearch"),
    remove                          : require("./group/remove"),
    edit                            : require("./group/edit"),
    allowedGroups                   : require("./group/allowedGroups"),
    getAllowedCharactersForGroup    : require("./group/getAllowedCharactersForGroup"),
    updateAllowedCharactersForGroup : require("./group/updateAllowedCharactersForGroup"),
};