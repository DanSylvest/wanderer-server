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
    root.EveSwaggerInterface.GetCorporationsCorporationIdMedalsIssued200Ok = factory(root.EveSwaggerInterface.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The GetCorporationsCorporationIdMedalsIssued200Ok model module.
   * @module model/GetCorporationsCorporationIdMedalsIssued200Ok
   * @version 1.3.8
   */

  /**
   * Constructs a new <code>GetCorporationsCorporationIdMedalsIssued200Ok</code>.
   * 200 ok object
   * @alias module:model/GetCorporationsCorporationIdMedalsIssued200Ok
   * @class
   * @param characterId {Number} ID of the character who was rewarded this medal
   * @param issuedAt {Date} issued_at string
   * @param issuerId {Number} ID of the character who issued the medal
   * @param medalId {Number} medal_id integer
   * @param reason {String} reason string
   * @param status {module:model/GetCorporationsCorporationIdMedalsIssued200Ok.StatusEnum} status string
   */
  var exports = function(characterId, issuedAt, issuerId, medalId, reason, status) {
    this.characterId = characterId;
    this.issuedAt = issuedAt;
    this.issuerId = issuerId;
    this.medalId = medalId;
    this.reason = reason;
    this.status = status;
  };

  /**
   * Constructs a <code>GetCorporationsCorporationIdMedalsIssued200Ok</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/GetCorporationsCorporationIdMedalsIssued200Ok} obj Optional instance to populate.
   * @return {module:model/GetCorporationsCorporationIdMedalsIssued200Ok} The populated <code>GetCorporationsCorporationIdMedalsIssued200Ok</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      if (data.hasOwnProperty('character_id'))
        obj.characterId = ApiClient.convertToType(data['character_id'], 'Number');
      if (data.hasOwnProperty('issued_at'))
        obj.issuedAt = ApiClient.convertToType(data['issued_at'], 'Date');
      if (data.hasOwnProperty('issuer_id'))
        obj.issuerId = ApiClient.convertToType(data['issuer_id'], 'Number');
      if (data.hasOwnProperty('medal_id'))
        obj.medalId = ApiClient.convertToType(data['medal_id'], 'Number');
      if (data.hasOwnProperty('reason'))
        obj.reason = ApiClient.convertToType(data['reason'], 'String');
      if (data.hasOwnProperty('status'))
        obj.status = ApiClient.convertToType(data['status'], 'String');
    }
    return obj;
  }

  /**
   * ID of the character who was rewarded this medal
   * @member {Number} characterId
   */
  exports.prototype.characterId = undefined;

  /**
   * issued_at string
   * @member {Date} issuedAt
   */
  exports.prototype.issuedAt = undefined;

  /**
   * ID of the character who issued the medal
   * @member {Number} issuerId
   */
  exports.prototype.issuerId = undefined;

  /**
   * medal_id integer
   * @member {Number} medalId
   */
  exports.prototype.medalId = undefined;

  /**
   * reason string
   * @member {String} reason
   */
  exports.prototype.reason = undefined;

  /**
   * status string
   * @member {module:model/GetCorporationsCorporationIdMedalsIssued200Ok.StatusEnum} status
   */
  exports.prototype.status = undefined;


  /**
   * Allowed values for the <code>status</code> property.
   * @enum {String}
   * @readonly
   */
  exports.StatusEnum = {
    /**
     * value: "private"
     * @const
     */
    _private: "private",

    /**
     * value: "public"
     * @const
     */
    _public: "public"
  };

  return exports;

}));
