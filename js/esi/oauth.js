/**
 * Created by Aleksey Chichenkov <rolahd@yandex.ru> on 6/19/20.
 */

var request       = require('request');
var CustomPromise = require("./../../env/promise");


var CLIENT_ID = config.eve.app.client_id;
var SECRET_KEY = config.eve.app.secret_key;

var SSO_HOST = config.eve.sso.server.host;
var SSO_PROTO = config.eve.sso.server.proto;
var SSO_CONTENT_TYPE = config.eve.sso.server.content_type;

var __esi_oauth_token = function (_code) {
    var res = CLIENT_ID + ":" + SECRET_KEY;
    var encoded = Buffer.from(res).toString('base64');
    var options = {
        url: SSO_PROTO + "//" + SSO_HOST + "/oauth/token",
        headers: {
            Authorization: "Basic " + encoded,
            "Content-Type": SSO_CONTENT_TYPE,
            Host: SSO_HOST
        },
        form: {
            grant_type: "authorization_code",
            code: _code
        }
    };

    var pr = new CustomPromise();

    request.post(options, function (error, response, body) {
        var responseData = JSON.parse(body);

        if(responseData.error)
            pr.reject(responseData.error_description);
        else
            pr.resolve(body && JSON.parse(body));
    }.bind(this));

    return pr.native;
};

var __esi_oauth_verify = function (_access_token) {
    var options = {
        url: SSO_PROTO + "//" + SSO_HOST + "/oauth/verify",
        headers: {
            Authorization: "Bearer " + _access_token,
            Host: SSO_HOST
        }
    };

    var pr = new CustomPromise();

    request.get(options, function (error, response, body) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(JSON.parse(body));
    }.bind(this));

    return pr.native;
};

var __sso_oath_refresh_token = function (_refresh_token) {
    var res = CLIENT_ID + ":" + SECRET_KEY;
    var encoded = Buffer.from(res).toString('base64');
    var options = {
        url: SSO_PROTO + "//" + SSO_HOST + "/oauth/token",
        headers: {
            Authorization: "Basic " + encoded,
            "Content-Type": SSO_CONTENT_TYPE,
            Host: SSO_HOST
        },
        form: {
            grant_type: "refresh_token",
            refresh_token: _refresh_token
        }
    };

    var pr = new CustomPromise();

    request.post(options, function (error, body, data) {
        if(error)
            pr.reject(error);
        else
            pr.resolve(JSON.parse(data));
    }.bind(this));

    return pr.native;
};

module.exports = {
    token: __esi_oauth_token,
    verify: __esi_oauth_verify,
    refreshToken: __sso_oath_refresh_token,
}