/*
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 *
 * OpenAPI spec version: 1.3.8
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.4.14
 *
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.EveSwaggerInterface) {
      root.EveSwaggerInterface = {};
    }
    root.EveSwaggerInterface.GetCharactersCharacterIdKillmailsRecent200Ok = factory(root.EveSwaggerInterface.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The GetCharactersCharacterIdKillmailsRecent200Ok model module.
   * @module model/GetCharactersCharacterIdKillmailsRecent200Ok
   * @version 1.3.8
   */

  /**
   * Constructs a new <code>GetCharactersCharacterIdKillmailsRecent200Ok</code>.
   * 200 ok object
   * @alias module:model/GetCharactersCharacterIdKillmailsRecent200Ok
   * @class
   * @param killmailHash {String} A hash of this killmail
   * @param killmailId {Number} ID of this killmail
   */
  var exports = function(killmailHash, killmailId) {
    this.killmailHash = killmailHash;
    this.killmailId = killmailId;
  };

  /**
   * Constructs a <code>GetCharactersCharacterIdKillmailsRecent200Ok</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/GetCharactersCharacterIdKillmailsRecent200Ok} obj Optional instance to populate.
   * @return {module:model/GetCharactersCharacterIdKillmailsRecent200Ok} The populated <code>GetCharactersCharacterIdKillmailsRecent200Ok</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      if (data.hasOwnProperty('killmail_hash'))
        obj.killmailHash = ApiClient.convertToType(data['killmail_hash'], 'String');
      if (data.hasOwnProperty('killmail_id'))
        obj.killmailId = ApiClient.convertToType(data['killmail_id'], 'Number');
    }
    return obj;
  }

  /**
   * A hash of this killmail
   * @member {String} killmailHash
   */
  exports.prototype.killmailHash = undefined;

  /**
   * ID of this killmail
   * @member {Number} killmailId
   */
  exports.prototype.killmailId = undefined;

  return exports;

}));
