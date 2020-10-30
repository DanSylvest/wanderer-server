/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 5/28/20.
 */

var ApiClient = require("./external/src/ApiClient")
var index = require("./external/src/index")

var test = async function () {
    // ApiClient, index.SearchApi
    // debugger;

    var location = new index.LocationApi();

    var id = 96278263;
    var opts = {};
    opts.datasource = "tranquility";
    opts.ifNoneMatch = "ifNoneMatch_example";
    opts.token = "token_example";

    location.getCharactersCharacterIdOnline(id, opts, function (error, data, response) {
        debugger;
    })

    var instance = new index.SearchApi();

    var categories = ["character"];
    var search = "Ilia Volyeva";
    var opts = {
        acceptLanguage: "en-us",
        datasource: "tranquility",
        ifNoneMatch: "ifNoneMatch_example",
        language: "en-us",
        strict: false,
    };


    var response = function (_count, error, data, response) {
        console.log(JSON.stringify(instance, true, 3))

        if(_count === 999)
            debugger;

        if(error)
            debugger;

        debugger;

    }.bind(this)

    for (var a = 0; a < 1; a++) {
        instance.getSearch(categories, search, opts, response.bind(this, a));
    }
};

test();