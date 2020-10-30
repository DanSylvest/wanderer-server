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
    root.EveSwaggerInterface.GetMarketsPrices200Ok = factory(root.EveSwaggerInterface.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The GetMarketsPrices200Ok model module.
   * @module model/GetMarketsPrices200Ok
   * @version 1.3.8
   */

  /**
   * Constructs a new <code>GetMarketsPrices200Ok</code>.
   * 200 ok object
   * @alias module:model/GetMarketsPrices200Ok
   * @class
   * @param typeId {Number} type_id integer
   */
  var exports = function(typeId) {
    this.typeId = typeId;
  };

  /**
   * Constructs a <code>GetMarketsPrices200Ok</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/GetMarketsPrices200Ok} obj Optional instance to populate.
   * @return {module:model/GetMarketsPrices200Ok} The populated <code>GetMarketsPrices200Ok</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      if (data.hasOwnProperty('adjusted_price'))
        obj.adjustedPrice = ApiClient.convertToType(data['adjusted_price'], 'Number');
      if (data.hasOwnProperty('average_price'))
        obj.averagePrice = ApiClient.convertToType(data['average_price'], 'Number');
      if (data.hasOwnProperty('type_id'))
        obj.typeId = ApiClient.convertToType(data['type_id'], 'Number');
    }
    return obj;
  }

  /**
   * adjusted_price number
   * @member {Number} adjustedPrice
   */
  exports.prototype.adjustedPrice = undefined;

  /**
   * average_price number
   * @member {Number} averagePrice
   */
  exports.prototype.averagePrice = undefined;

  /**
   * type_id integer
   * @member {Number} typeId
   */
  exports.prototype.typeId = undefined;

  return exports;

}));
