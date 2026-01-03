# Business Logic & Decisions

## 1. Commercial & Transaction Rules
*The core logic defining how money, taxes, and discounts are calculated.*

### Shopping Container (Cart & Order)
**Totals Calculation**
- **Grand Total Formula**: `Subtotal + Shipping + TaxTotal - CouponDiscount`.
- **Effective Shipping**: `Shipping Cost - Shipping Coupon Discount` (Floored at 0).
- **Taxable Amount**: `LineItem Subtotal - Allocated Discount`.
- **Rounding Strategy**:
    - **Intermediate Values**: All monetary values calculated via multiplication (e.g., percentage discounts, tax amounts, pro-rata shares) are **rounded** immediately to the standard currency precision.
    - **Consistency**: This ensures that `Sum(Parts) ≈ Whole` and prevents floating-point drift.

**Coupon Strategy**
- **Stacking Rule**: A maximum of **two** coupons can be active simultaneously:
    1. One **General** Coupon (Non-Shipping).
    2. One **Shipping** Coupon.
- **Selection Logic**:
    - **Shipping**: The system *automatically* selects the single best (highest value) shipping coupon.
    - **General**: Only one manual coupon of type `COUPON` is allowed.
- **Discount Distribution**:
    - **General** discounts are distributed **pro-rata** across eligible line items.
    - **Rounding**: Each allocated portion is **rounded** before assignment.
    - **Shipping** discounts are applied directly to the shipping cost.
- **Return/Refund Logic**: Currently, items in `RETURN_REQUESTED`, `RETURNED`, or `REFUNDED` states **are** still considered for coupon application. *(Review required for real-world use cases)*.
- **Tie-Breaker**: If multiple shipping coupons offer the same best value, the system prefers type `COUPON` (manual) over `AUTOMATIC`.
- **Flat Discount Definition**: For `FLAT` method coupons, the discount amount is strictly derived from the regional `MaxCartDiscount` value.

### Line Item Logic
- **Tax Calculation Basis**: Tax is calculated on the **post-discount** unit price.
    - Formula: `(LineSubtotal - AllocatedDiscount) / Quantity` = `TaxableUnitPrice`.
    - This ensures taxes reflect the actual transaction value after promotions.
- **Discount Distribution Math**:
    - Items are sorted by subtotal (ascending) before distribution.
    - The **last item** in the list absorbs any rounding remainder to ensure: `Sum(AllocatedParts) === TotalCouponValue`.

### Tax Rules
- **Non-Progressive Slabs**: Tax logic uses a flat slab system. The *entire* unit price determines the applicable rate.
- **Matching Logic**: Finds the single slab where `minUnitPrice <= price < maxUnitPrice`.
- **Categories**:
    - `APPAREL`: Standard apparel tax rules.
    - `EXEMPT`: Products strictly exempt from tax.

### Pricing Strategy (Tiered)
- **Ascending Volumes**: Tiers must be defined in ascending order of `minimum quantity`.
- **Diminishing Unit Price**: `UnitPrice` must **never increase** as quantity increases.
- **Single Currency**: All tiers must use the exact same currency as the base unit price.
- **Strict Coverage**: The system currently *requires* a tier to cover the purchased quantity.
    - *Bug Risk*: If the first tier starts at quantity > 1, purchasing a smaller amount will result in an error (no fallback to base unit price).
- **Base Requirement**: At least one tier must always exist.
- **Pre-Tax Basis**: All defined prices, including base unit prices, are **pre-tax**.

---

## 2. Catalog & Inventory
*Definitions regarding what we sell and how we track it.*

### Product Definition
- **Mandatory Attributes**: `Color` and `Size` are required for *every* product.
    - *Pointer*: Use `"ONESIZE"` if no specific size exists.
- **Localization**: Specifications are fully localized objects.
- **Market Availability**: An empty pricing object implies the product exists but is **not marketed** in that specific locale.

### Inventory Management
- **Stock Key Composition**: Uniqueness is defined by the combination of:
  `ProductKey` + `SelectionAttributes` (e.g., Color) + `Size` + `Country`.
    - *Generation*: Attribute keys are **sorted alphabetically** to ensure consistency.
    - *Exclusion*: `Size` is explicitly excluded from the generic attribute key generation.
- **Data Structure**: `Size` is stored as a distinct field separate from other attributes to optimize SKU-level operations.

---

## 3. Customer Domain
*Rules governing user data and fulfillment targets.*

### Customer Profile
- **Status Lifecycle**:
    - `CREATED` is the mandatory initial status.
    - Supports concurrent statuses (e.g., a user can be both `REGISTERED_USER` and await `EMAIL_OTP`).
- **Verification**: New accounts default to `isEmailVerified: false`.
- **Profile Data**: `Company` field is optional.

### Addresses
- **Type Determination**: Explicit flags (`isBillingAddress`, `isShippingAddress`) determine the type. An address can be:
    - `BILLING`, `SHIPPING`, `BILLING_AND_SHIPPING`, or `NONE`.
- **Default Resolution Strategy**:
    1. Check for `defaultBillingAddressId` / `defaultShippingAddressId`.
    2. **Fallback**: If explicit default is invalid/missing, auto-select the **most recently created** address of that type.
- **Sorting**: Address lists are always sorted by creation date (newest first).

---

## 4. Cart & Order Lifecycle
*Rules for session management and order progression.*

### Cart Management
- **Expiry**: Default session duration is **120 days**.
    - Logic: `isActive()` checks both `state === ACTIVE` and `expireAt > CurrentTime`.
- **Validation Strategy**:
    - During validation (e.g., on load/refresh), any line item that fails checks (price change, out of stock, inactive) is **silently removed** from the cart.
    - *Pointer*: This "hard fail" approach simplifies data integrity but may need UX review.

### Order States
- **Standard Flow**: `PLACED` → `PENDING_PAYMENT` → `PROCESSING` → `COMPLETED`.
- **Exception States**: `CANCELLED`.
- **Hold Logic**: Orders can be placed `ON_HOLD` (via line items or explicit status) for manual review.

---

## 5. System & Implementation Details
*Technical decisions and data integrity.*

### Payment Processing
- **Security**: Sensitive gateway payloads (raw response blobs, parameters) are **stripped** from standard DTOs/API responses.
- **Refund Tracking**: Partial refunds are supported via an accumulator field `amountRefunded`.
- **Status Flow**: `PENDING` → `AUTHORIZED` → `CAPTURED` (or `FAILED` / `REFUNDED`).

### Image Handling
- **Master Record**: The `original` resolution source is mandatory and protected; it cannot be deleted.
- **Graceful Degradation**: Requesting a missing resolution (e.g., `thumbnail`) automatically falls back to the `original` URL.

---
