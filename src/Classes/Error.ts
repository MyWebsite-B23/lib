export class LineItemNotFoundError extends Error {
    constructor(lineItemId: string) {
        super(`Line item with ID '${lineItemId}' not found in the cart.`);
        this.name = 'LineItemNotFoundError';
    }
}

export class DuplicateSizeError extends Error {
    constructor(size: string) {
        super(`Duplicate size found: ${size}`);
        this.name = 'DuplicateSizeError';
    }
}

export class ProductMismatchError extends Error {
    constructor(message: string = "Product and selection attributes do not match.") {
        super(`ProductMismatch: ${message}`);
        this.name = 'ProductMismatchError';
    }
}

export class ProductInactiveError extends Error {
    constructor(message: string = "Product is not active.") {
        super(`ProductInactive: ${message}`);
        this.name = 'ProductInactiveError';
    }
}

export class SelectionAttributeParseError extends Error {
    constructor(message: string = "Failed to parse selection attributes key.") {
        super(`SelectionAttributeParseError: ${message}`);
        this.name = 'SelectionAttributeParseError';
    }
}

export class SizeMismatchError extends Error {
    constructor(message: string = "Size does not match.") {
        super(`SizeMismatch: ${message}`);
        this.name = 'SizeMismatchError';
    }
}

export class PricingNotFoundError extends Error {
    constructor(message: string = "Pricing details not available for the product") {
        super(`NotFound: ${message}`);
        this.name = 'PricingNotFoundError';
    }
}

export class InvalidTaxRuleError extends Error {
    constructor(message: string = "Tax rule category mismatch.") {
        super(`InvalidTaxRule: ${message}`);
        this.name = 'InvalidTaxRuleError';
    }
}

export class InvalidTaxCategoryError extends Error {
    constructor(message: string = "Tax category is not valid.") {
        super(`InvalidTaxCategory: ${message}`);
        this.name = 'InvalidTaxCategoryError';
    }
}

export class InvalidMinQuantityError extends Error {
    constructor(message: string = "Minimum quantity must be greater than zero.") {
        super(`InvalidMinQuantity: ${message}`);
        this.name = 'InvalidMinQuantityError';
    }
}

export class InvalidTieredPriceError extends Error {
    constructor(message: string) {
        super(`InvalidTieredPrice: ${message}`);
        this.name = 'InvalidTieredPriceError';
    }
}

export class InvalidQuantityError extends Error {
    constructor(message: string = "Quantity must be greater than zero.") {
        super(`InvalidQuantity: ${message}`);
        this.name = 'InvalidQuantityError';
    }
}

export class NoApplicableTierError extends Error {
    constructor(quantity: number) {
        super(`NoApplicableTier: Quantity ${quantity} does not meet the minimum purchase requirement.`);
        this.name = 'NoApplicableTierError';
    }
}

export class TaxSlabNotFoundError extends Error {
    constructor(message: string = "No applicable tax slab or multiple slabs found for the given unit price.") {
        super(`TaxSlabNotFound: ${message}`);
        this.name = 'TaxSlabNotFoundError';
    }
}

export class InvalidPriceAmountError extends Error {
    constructor(message: string = "Amount cannot be negative.") {
        super(`InvalidAmount: ${message}`);
        this.name = 'InvalidPriceAmountError';
    }
}

export class InvalidCurrencyCodeError extends Error {
    constructor(message: string = "Currency code is required.") {
        super(`InvalidCurrency: ${message}`);
        this.name = 'InvalidCurrencyCodeError';
    }
}

export class CurrencyMismatchError extends Error {
    constructor(message: string = "Cannot perform operation on prices with different currencies.") {
        super(`CurrencyMismatch: ${message}`);
        this.name = 'CurrencyMismatchError';
    }
}

export class InvalidArgumentError extends Error {
    constructor(message: string) {
        super(`InvalidArgument: ${message}`);
        this.name = 'InvalidArgumentError';
    }
}

export class InvalidImageSourceError extends Error {
    constructor(message: string = "Invalid image source configuration.") {
        super(`InvalidImageSource: ${message}`);
        this.name = 'InvalidImageSourceError';
    }
}