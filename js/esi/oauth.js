/**
 * Created by Aleksey Chichenkov <cublakhan257@gmail.com> on 6/19/20.
 */

const request       = require('request');
const CustomPromise = require("./../env/promise");

const CLIENT_ID = config.eve.app.client_id;
const SECRET_KEY = config.eve.app.secret_key;

const SSO_HOST = config.eve.sso.server.host;
const SSO_PROTO = config.eve.sso.server.proto;
const SSO_CONTENT_TYPE = config.eve.sso.server.content_type;

const __esi_oauth_token = function (_code) {
    let res = CLIENT_ID + ":" + SECRET_KEY;
    let encoded = Buffer.from(res).toString('base64');
    let options = {
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

    let pr = new CustomPromise();

    request.post(options, function (error, response, body) {

        if(body) {
            let responseData = JSON.parse(body);

            if(responseData.error) {
                pr.reject(responseData.error_description);
            } else {
                pr.resolve(responseData);
            }
        } else {
            pr.resolve(error);
        }
    }.bind(this));

    return pr.native;
};

const __esi_oauth_verify = function (_access_token) {
    let options = {
        url: SSO_PROTO + "//" + SSO_HOST + "/oauth/verify",
        headers: {
            Authorization: "Bearer " + _access_token,
            Host: SSO_HOST
        }
    };

    let pr = new CustomPromise();

    request.get(options, function (error, response, body) {
        if(error)
            pr.reject(error);
        else {
            try {
                pr.resolve(JSON.parse(body));
            } catch (e) {
                pr.reject("No data");
            }
        }
    }.bind(this));

    return pr.native;
};

const __sso_oath_refresh_token = function (_refresh_token) {
    let res = CLIENT_ID + ":" + SECRET_KEY;
    let encoded = Buffer.from(res).toString('base64');
    let options = {
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

    let pr = new CustomPromise();

    request.post(options, function (error, body, data) {
        if(error)
            pr.reject(error);
        else {
            try {
                pr.resolve(JSON.parse(data));
            } catch (e) {
                pr.reject("No data");
            }
        }
    }.bind(this));

    return pr.native;
};

module.exports = {
    token: __esi_oauth_token,
    verify: __esi_oauth_verify,
    refreshToken: __sso_oath_refresh_token,
}