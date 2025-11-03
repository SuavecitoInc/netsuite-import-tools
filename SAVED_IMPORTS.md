# NetSuite CSV Import Mappings

> Saved CSV Import field mappings for NetSuite data imports

## Table of Contents

- [Overview](#overview)
- [How to Use These Mappings](#how-to-use-these-mappings)
- [Import Mappings](#import-mappings)
  - [Inventory Items](#inventory-items)
  - [Assembly Items](#assembly-items)
  - [Matrix Items](#matrix-items)
- [Field Reference](#field-reference)
- [Common Import Errors](#common-import-errors)

## Overview

This document contains the field mappings used when importing CSV files into NetSuite. Each mapping defines how a CSV column maps to a NetSuite field and what type of data it expects.

**NetSuite Version Compatibility:** 2024.2+

## How to Use These Mappings

### Creating a New Saved Import in NetSuite

1. Navigate to **Setup** → **Import/Export** → **Import CSV Records**
2. Select **Inventory Item** (or **Assembly/Build Item** for assemblies)
3. Upload your CSV file from the `output/` directory
4. Click **Next** to map fields
5. Use the mappings below to configure each field
6. Click **Save Mapping** and give it a descriptive name (e.g., "Dear Inventory Items Import")

### Loading an Existing Saved Import

1. Navigate to **Setup** → **Import/Export** → **Import CSV Records**
2. Select **Inventory Item** or **Assembly/Build Item**
3. Choose **Use Saved Mapping** and select your saved mapping name
4. Upload your CSV file
5. Click **Next** → **Run Import**

## Import Mappings

### Inventory Items

**CSV File:** `output/NetSuite_Inventory_Items.csv`

**NetSuite Import Type:** Inventory Item

#### Required Fields

| CSV Column   | NetSuite Field                  | Type        | Notes                                    |
| ------------ | ------------------------------- | ----------- | ---------------------------------------- |
| `externalid` | Item : External ID              | Default     | Unique identifier for the item           |
| `name`       | Item : Item Name/Number (Req)   | Default     | SKU/Item number                          |
| `subsidiary` | Item : Subsidiary (Req)         | Internal ID | Use internal ID: `1`                     |
| `class`      | Item : Class (Req)              | External ID | Use internal ID: `53`                    |
| `atpmethod`  | Item : Default ATP Method (Req) | Default     | Usually "Cumulative ATP with Look Ahead" |

#### Item Details

| CSV Column             | NetSuite Field                    | Type    | Notes                      |
| ---------------------- | --------------------------------- | ------- | -------------------------- |
| `displayname`          | Item : Display Name/Code          | Default | Human-readable name        |
| `barcode`              | Item : UPC Code                   | Default | Numeric barcode            |
| `manufacturer`         | Item : Manufacturer               | Default | Supplier/manufacturer name |
| `countryofmanufacture` | Item : Manufacturer Country (Req) | Default | Country code               |
| `salesdescription`     | Item : Sales Description          | Default | Product description        |

#### Configuration

| CSV Column      | NetSuite Field        | Type    | Notes                     |
| --------------- | --------------------- | ------- | ------------------------- |
| `costingmethod` | Item : Costing Method | Default | Usually "FIFO"            |
| `usebins`       | Item : Use Bins       | Default | `true` for bin management |
| `istaxable`     | Item : Taxable        | Default | `true` if taxable         |
| `taxschedule`   | Item : Tax Schedule   | Default | Usually "Taxable"         |

#### Physical Properties

| CSV Column   | NetSuite Field     | Type    | Notes                |
| ------------ | ------------------ | ------- | -------------------- |
| `weight`     | Item : Item Weight | Default | Numeric weight value |
| `weightunit` | Item : Weight Unit | Default | Usually "lb" or "kg" |

#### Pricing

| CSV Column            | NetSuite Field                       | Type    | Notes              |
| --------------------- | ------------------------------------ | ------- | ------------------ |
| `salesprice`          | Item : Sales Price                   | Default | Base retail price  |
| `pricelevel1`         | Item - Pricing 1 : Price Level (Req) | Default | E.g., "Base Price" |
| `pricelevel1price`    | Item - Pricing 1 : Price (Req)       | Default | Price for level 1  |
| `pricelevel1currency` | Item - Pricing 1 : Currency (Req)    | Default | Usually "USD"      |
| `pricelevel2`         | Item - Pricing 2 : Price Level (Req) | Default | E.g., "Wholesale"  |
| `pricelevel2price`    | Item - Pricing 2 : Price (Req)       | Default | Price for level 2  |
| `pricelevel2currency` | Item - Pricing 2 : Currency (Req)    | Default | Usually "USD"      |

<details>
<summary>📋 Complete Field Mapping Table (Click to expand)</summary>

| CSV Column           | NetSuite Field                       | Type        |
| -------------------- | ------------------------------------ | ----------- |
| externalid           | Item : External ID                   | Default     |
| name                 | Item : Item Name/Number (Req)        | Default     |
| displayname          | Item : Display Name/Code             | Default     |
| barcode              | Item : UPC Code                      | Default     |
| subsidiary           | Item : Subsidiary (Req)              | Internal ID |
| class                | Item : Class (Req)                   | Internal ID |
| costingmethod        | Item : Costing Method                | Default     |
| usebins              | Item : Use Bins                      | Default     |
| atpmethod            | Item : Default ATP Method (Req)      | Default     |
| manufacturer         | Item : Manufacturer                  | Default     |
| countryofmanufacture | Item : Manufacturer Country (Req)    | Default     |
| salesdescription     | Item : Sales Description             | Default     |
| weight               | Item : Item Weight                   | Default     |
| weightunit           | Item : Weight Unit                   | Default     |
| salesprice           | Item : Sales Price                   | Default     |
| istaxable            | Item : Taxable                       | Default     |
| taxschedule          | Item : Tax Schedule                  | Default     |
| pricelevel1          | Item - Pricing 1 : Price Level (Req) | Default     |
| pricelevel1price     | Item - Pricing 1 : Price (Req)       | Default     |
| pricelevel1currency  | Item - Pricing 1 : Currency (Req)    | Default     |
| pricelevel2          | Item - Pricing 2 : Price Level (Req) | Default     |
| pricelevel2price     | Item - Pricing 2 : Price (Req)       | Default     |
| pricelevel2currency  | Item - Pricing 2 : Currency (Req)    | Default     |

</details>

---

### Assembly Items

**CSV File:** `output/NetSuite_Assembly_Items.csv`

**NetSuite Import Type:** Assembly/Build Item

#### Assembly-Specific Fields

| CSV Column            | NetSuite Field                     | Type    | Notes                    |
| --------------------- | ---------------------------------- | ------- | ------------------------ |
| `description`         | Item : Description                 | Default | Assembly description     |
| `effectivebomcontrol` | Item : Effective BOM Control (Req) | Default | Usually "Effective Date" |

#### Component Mappings

Components are dynamically numbered based on how many components each assembly has.

| CSV Column           | NetSuite Field                | Type        | Notes                        |
| -------------------- | ----------------------------- | ----------- | ---------------------------- |
| `component1item`     | Item - Members 1 : Item (Req) | External ID | Component SKU                |
| `component1quantity` | Item - Members 1 : Quantity   | Default     | Quantity needed              |
| `component2item`     | Item - Members 2 : Item (Req) | External ID | Component SKU                |
| `component2quantity` | Item - Members 2 : Quantity   | Default     | Quantity needed              |
| `component3item`     | Item - Members 3 : Item (Req) | External ID | Component SKU                |
| `component3quantity` | Item - Members 3 : Quantity   | Default     | Quantity needed              |
| `component4item`     | Item - Members 4 : Item (Req) | External ID | Component SKU                |
| `component4quantity` | Item - Members 4 : Quantity   | Default     | Quantity needed              |
| ...                  | ...                           | ...         | Continues for all components |

> **Note:** The script dynamically generates component columns based on the maximum number of components in any assembly. You may have more than 4 component columns.

<details>
<summary>📋 Complete Field Mapping Table (Click to expand)</summary>

| CSV Column           | NetSuite Field                       | Type        |
| -------------------- | ------------------------------------ | ----------- |
| externalid           | Item : External ID                   | Default     |
| name                 | Item : Item Name/Number (Req)        | Default     |
| displayname          | Item : Display Name/Code             | Default     |
| barcode              | Item : UPC Code                      | Default     |
| description          | Item : Description                   | Default     |
| subsidiary           | Item : Subsidiary (Req)              | Internal ID |
| class                | Item : Class (Req)                   | Internal ID |
| costingmethod        | Item : Costing Method                | Default     |
| usebins              | Item : Use Bins                      | Default     |
| atpmethod            | Item : Default ATP Method (Req)      | Default     |
| effectivebomcontrol  | Item : Effective BOM Control (Req)   | Default     |
| manufacturer         | Item : Manufacturer                  | Default     |
| countryofmanufacture | Item : Manufacturer Country (Req)    | Default     |
| weight               | Item : Item Weight                   | Default     |
| weightunit           | Item : Weight Unit                   | Default     |
| saleprice            | Item : Sales Price                   | Default     |
| istaxable            | Item : Taxable                       | Default     |
| taxschedule          | Item : Tax Schedule                  | Default     |
| pricelevel1          | Item - Pricing 1 : Price Level (Req) | Default     |
| pricelevel1price     | Item - Pricing 1 : Price (Req)       | Default     |
| pricelevel1currency  | Item - Pricing 1 : Currency (Req)    | Default     |
| pricelevel2          | Item - Pricing 2 : Price Level (Req) | Default     |
| pricelevel2price     | Item - Pricing 2 : Price (Req)       | Default     |
| pricelevel2currency  | Item - Pricing 2 : Currency (Req)    | Default     |
| component1item       | Item - Members 1 : Item (Req)        | External ID |
| component1quantity   | Item - Members 1 : Quantity          | Default     |
| component2item       | Item - Members 2 : Item (Req)        | External ID |
| component2quantity   | Item - Members 2 : Quantity          | Default     |
| component3item       | Item - Members 3 : Item (Req)        | External ID |
| component3quantity   | Item - Members 3 : Quantity          | Default     |
| component4item       | Item - Members 4 : Item (Req)        | External ID |
| component4quantity   | Item - Members 4 : Quantity          | Default     |

</details>

---

### Matrix Items

**CSV File:** `output/NetSuite_Inventory_Items_Matrix.csv`

**NetSuite Import Type:** Inventory Item (with Matrix support enabled)

#### Matrix-Specific Fields

| CSV Column   | NetSuite Field              | Type        | Notes                                       |
| ------------ | --------------------------- | ----------- | ------------------------------------------- |
| `matrixtype` | Item : Matrix Type          | Default     | "Parent Matrix Item" or "Child Matrix Item" |
| `subitemof`  | Item : Subitem of           | External ID | Parent SKU (empty for parent items)         |
| `size`       | Item : Matrix Option - Size | Default     | Size value (e.g., "S", "M", "L")            |

> **Important:** Import parent items first, then child items. Parents must exist before children can reference them via `subitemof`.

<details>
<summary>📋 Complete Field Mapping Table (Click to expand)</summary>

| CSV Column           | NetSuite Field                       | Type        |
| -------------------- | ------------------------------------ | ----------- |
| externalid           | Item : External ID                   | Default     |
| name                 | Item : Item Name/Number (Req)        | Default     |
| displayname          | Item : Display Name/Code             | Default     |
| barcode              | Item : UPC Code                      | Default     |
| size                 | Item : Matrix Option - Size          | Default     |
| matrixtype           | Item : Matrix Type                   | Default     |
| subitemof            | Item : Subitem of                    | External ID |
| subsidiary           | Item : Subsidiary (Req)              | Internal ID |
| class                | Item : Class (Req)                   | Internal ID |
| costingmethod        | Item : Costing Method                | Default     |
| usebins              | Item : Use Bins                      | Default     |
| atpmethod            | Item : Default ATP Method (Req)      | Default     |
| manufacturer         | Item : Manufacturer                  | Default     |
| countryofmanufacture | Item : Manufacturer Country (Req)    | Default     |
| salesdescription     | Item : Sales Description             | Default     |
| weight               | Item : Item Weight                   | Default     |
| weightunit           | Item : Weight Unit                   | Default     |
| salesprice           | Item : Sales Price                   | Default     |
| istaxable            | Item : Taxable                       | Default     |
| taxschedule          | Item : Tax Schedule                  | Default     |
| pricelevel1          | Item - Pricing 1 : Price Level (Req) | Default     |
| pricelevel1price     | Item - Pricing 1 : Price (Req)       | Default     |
| pricelevel1currency  | Item - Pricing 1 : Currency (Req)    | Default     |
| pricelevel2          | Item - Pricing 2 : Price Level (Req) | Default     |
| pricelevel2price     | Item - Pricing 2 : Price (Req)       | Default     |
| pricelevel2currency  | Item - Pricing 2 : Currency (Req)    | Default     |

</details>

---

## Field Reference

### Field Types Explained

- **Default**: Use the value exactly as it appears in the CSV
- **External ID**: Use the external ID of the related record (not internal ID)
- **Internal ID**: Use the numeric internal ID from NetSuite (e.g., subsidiary = `1`)

### Common Field Values

| Field                 | Common Values                             | Notes                                |
| --------------------- | ----------------------------------------- | ------------------------------------ |
| `subsidiary`          | `1`                                       | Internal ID for your main subsidiary |
| `class`               | `53`                                      | Internal ID for your product class   |
| `costingmethod`       | `FIFO`, `LIFO`, `Average`                 | Inventory costing method             |
| `atpmethod`           | `Cumulative ATP with Look Ahead`          | Available-to-promise method          |
| `effectivebomcontrol` | `Effective Date`                          | For assembly items                   |
| `weightunit`          | `lb`, `kg`, `oz`                          | Unit of weight measurement           |
| `istaxable`           | `true`, `false`                           | Whether item is taxable              |
| `taxschedule`         | `Taxable`                                 | Tax schedule name                    |
| `matrixtype`          | `Parent Matrix Item`, `Child Matrix Item` | For matrix items only                |

---

## Common Import Errors

### "Invalid subsidiary reference"

**Cause:** Subsidiary internal ID is incorrect or doesn't exist.

**Solution:** Verify the subsidiary ID in NetSuite under **Setup** → **Company** → **Subsidiaries**. Use the numeric Internal ID.

### "Invalid class reference"

**Cause:** Class internal ID doesn't exist or is incorrect.

**Solution:** Check **Lists** → **Accounting** → **Classes** for the correct Internal ID value.

### "Component item not found"

**Cause:** Component SKU referenced in assembly doesn't exist in NetSuite.

**Solution:** Import inventory items first before assemblies. Ensure all component external IDs match exactly.

### "Duplicate external ID"

**Cause:** Item with this external ID already exists in NetSuite.

**Solution:**

- Use **Update** mode instead of **Add** mode in import settings
- Check for duplicate rows in your CSV
- Verify items weren't previously imported

### "Matrix parent item not found"

**Cause:** Child matrix item references a parent that doesn't exist.

**Solution:** Sort your CSV so parent items (where `matrixtype` = "Parent Matrix Item") appear before child items, or import in two passes.

### "Required field missing"

**Cause:** A required field is empty in the CSV.

**Solution:** Check the mapping tables above for fields marked "(Req)" and ensure they have values in your CSV.

---

## Tips for Successful Imports

1. **Always backup** - Export existing items before importing updates
2. **Test with small batch** - Import 5-10 items first to verify mappings
3. **Check data quality** - Ensure no blank required fields or invalid characters
4. **Follow import order** - Inventory → Matrix → Assembly
5. **Review error log** - NetSuite provides detailed error messages for each failed row
6. **Use external IDs consistently** - External IDs are case-sensitive
7. **Save your mappings** - Once working, save the mapping for reuse

---

**Last Updated:** November 2025  
**NetSuite Version:** 2024.2+
