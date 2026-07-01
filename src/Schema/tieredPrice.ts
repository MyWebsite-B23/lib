import { PricingType } from "../Classes/TieredPrice";

export default {
    "$id": "TieredPrices",
    "definitions": {
        "pricingType": {
            "enum": Object.values(PricingType)
        },
        "tier": {
            "type": "object",
            "properties": {
                "enabled": { "type": "boolean" },
                "minQuantity": { "type": "integer", "minimum": 1 },
                "unitPrice": { "$ref": "standards#/definitions/price" }
            },
            "required": ["minQuantity", "unitPrice"]
        },
        "volumeTieredPrice": {
            "type": "object",
            "properties": {
                "type": { "const": PricingType.VOLUME },
                "currency": { "$ref": "standards#/definitions/currency" },
                "baseUnitPrice": { "$ref": "standards#/definitions/price" },
                "taxCategory": { "$ref": "standards#/definitions/requiredText" },
                "isTaxInclusive": { "type": "boolean" },
                "tiers": {
                    "type": "array",
                    "items": { "$ref": "TieredPrices#/definitions/tier" }
                }
            },
            "required": ["taxCategory", "baseUnitPrice"]
        },
        "selectionTieredPrice": {
            "type": "object",
            "properties": {
                "type": { "const": PricingType.SELECTION },
                "currency": { "$ref": "standards#/definitions/currency" },
                "taxCategory": { "$ref": "standards#/definitions/requiredText" },
                "isTaxInclusive": { "type": "boolean" },
                "selections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "selectionAttributes": { "$ref": "standards#/definitions/selectionAttributes" },
                            "baseUnitPrice": { "$ref": "standards#/definitions/price" },
                            "tiers": {
                                "type": "array",
                                "items": { "$ref": "TieredPrices#/definitions/tier" }
                            }
                        },
                        "required": ["selectionAttributes", "baseUnitPrice"]
                    }
                }
            },
            "required": ["type", "taxCategory", "currency"]
        },
        "tieredPrice": {
            "anyOf": [
                { "$ref": "TieredPrices#/definitions/volumeTieredPrice" },
                { "$ref": "TieredPrices#/definitions/selectionTieredPrice" }
            ]
        }
    }
};
