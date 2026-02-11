import { GenderCategory, OperationalCountry, OperationalCountryCurrency, OperationalLanguage, OperationalLocale } from "../Classes/Enum";
import ProductModel from "../Classes/Product";

export default {
  "$id": "standards",
  "definitions": {
      "lowercaseText": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$)[a-z]*$"
      },
      "lowercaseText10": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$)[a-z]{0,10}$"
      },
      "lowercaseText16": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$)[a-z]{0,16}$"
      },
      "lowercaseText30": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$)[a-z]{0,30}$"
      },
      "lowercaseText50": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$)[a-z]{0,50}$"
      },
      "lowercaseText256": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$)[a-z]{0,256}$"
      },
      "text": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).*$"
      },
      "text10": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{0,10}$"
      },
      "text16": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{0,16}$"
      },
      "text30": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{0,30}$"
      },
      "text50": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{0,50}$"
      },
      "text256": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{0,256}$"
      },
      "requiredText": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).+$"
      },
      "requiredText10": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{1,10}$"
      },
      "requiredText16": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{1,16}$"
      },
      "requiredText30": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{1,30}$"
      },
      "requiredText50": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{1,50}$"
      },
      "requiredText256": {
          "type": "string",
          "pattern": "^(?!\\s)(?!.*\\s$).{1,256}$"
      },
      "url": {
          "type": "string",
          "pattern": "^https://[^\\s/$.?#].[^\\s]*$",
          "maxLength": 2048
      },
      "uuid": {
          "type": "string",
          "minLength": 1,
          "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
      },
      "productKey": {
        "type": "string",
        "pattern": ProductModel.productKeyRegex.source
      },
      "productSku": {
        "type": "string",
        "pattern": ProductModel.productSKURegex.source
      },
      "genderCategory": {
        "type": "string",
        "enum": Object.values(GenderCategory)
      },
      "price": {
        "type": "object",
        "properties": {
          "amount": { "type": "number", "minimum": 0 },
          "currency": { "$ref": "#/definitions/currency" }
        },
        "additionalProperties": false,
        "required": ["amount", "currency"]
      },
      "color": {
          "type": "object",
          "properties": {
              "name": {
                  "type": "string"
              },
              "hex": {
                  "type": "string"
              }
          },
          "additionalProperties": false,
          "required": [
              "name"
          ]
      },
      "attributeValue": {
          "oneOf": [
              { "type": "string" },
              {
                  "$ref": "#/definitions/color"
              }
          ]
      },
      "selectionAttributes": {
          "type": "object",
          "properties": {
              "color": { "$ref": "#/definitions/color" }
          },
          "required": ["color"],
          "additionalProperties": {
              "$ref": "#/definitions/attributeValue"
          }
      },
      "firstName": { "$ref": "#/definitions/requiredText30" },
      "lastName": { "$ref": "#/definitions/text30" },
      "company": { "$ref": "#/definitions/text50" },
      "phone": { 
          "type" : "string",
          "pattern": "^[0-9]{10}$"
      },
      "email": { 
          "type" : "string",
          "pattern": "^[^\\s]+@[^\\s]+\\.[^\\s]+$"
      },
      "addressLine1": { "$ref": "#/definitions/requiredText50" },
      "addressLine2": { "$ref": "#/definitions/text50" },
      "city": { "$ref": "#/definitions/requiredText30" },
      "postalCode": { "$ref": "#/definitions/requiredText16" },
      "state": {
          "type": "string",
          "enum": ["AP", "AR", "AS", "BR", "CT", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL", "OR", "PB", "RJ", "SK", "TN", "TG", "TR", "UP", "UT", "WB", "AN", "CH", "DH", "LD", "DL", "PY", "LA", "JK"]
      },
      "country": {
          "type": "string",
          "enum": Object.values(OperationalCountry)
      },
      "currency": {
        "type": "string",
        "enum": Object.values(OperationalCountryCurrency)
      },
      "locale": {
          "type": "string",
          "enum": Object.values(OperationalLocale)
      },
      "language": {
          "type": "string",
          "enum": Object.values(OperationalLanguage)
      },
      "localeOrLanguage": {
          "type": "string",
           "enum": [...Object.values(OperationalLocale), ...Object.values(OperationalLanguage)]
      },
      "addressType": {
          "type": "string",
          "enum": ["shipping", "billing", "billing&shipping"]
      },
      "address": {
          "type": "object",
          "properties": {
              "firstName": {"$ref": "standards#/definitions/firstName"},
              "lastName": { "$ref": "standards#/definitions/lastName" },
              "company": { "$ref": "standards#/definitions/company" },
              "phone": { "$ref": "standards#/definitions/phone" },
              "email": { "$ref": "standards#/definitions/email" },
              "addressLine1": { "$ref": "standards#/definitions/addressLine1" },
              "addressLine2": { "$ref": "standards#/definitions/addressLine2" },
              "city": { "$ref": "standards#/definitions/city" },
              "postalCode": { "$ref": "standards#/definitions/postalCode" },
              "state": { "$ref": "standards#/definitions/state" },
              "country": { "$ref": "standards#/definitions/country" }
          },
          "required": ["firstName", "lastName", "phone", "email", "addressLine1", "postalCode", "state", "country"]
      }
  }
}