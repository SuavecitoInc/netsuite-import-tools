# NetSuite Import Tools

> A collection of scripts to transform Dear/Cin7 and Shopify data into NetSuite-compatible CSV import files.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Dear / Cin7](#dear--cin7)
  - [Required CSV Exports](#required-csv-exports)
  - [Usage](#usage)
  - [1. Inventory Items](#1-inventory-items)
  - [2. Matrix Items](#2-matrix-items)
  - [3. Assembly Items](#3-assembly-items)
  - [4. Inventory Availability](#4-inventory-availability)
- [Shopify](#shopify)
  - [Required CSV Exports](#required-csv-exports)
  - [Usage](#usage)
  - [1. Inventory Items](#1-inventory-items)
  - [2. Matrix Items](#2-matrix-items)
  - [3. Match Items](#3-match-items)
- [NetSuite](#netsuite)
  - [Import Order](#import-order)
  - [Configuration](#configuration)
  - [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [NetSuite Import Mappings](#netsuite-import-mappings)

## Overview

This project automates the transformation of inventory data from Dear/Cin7 and Shopify into NetSuite-compatible CSV import files. It handles three types of items:

- **Inventory Items**: Standard products from Dear/Cin7 filtered by Shopify SKUs
- **Matrix Items**: Product families with size variations (e.g., apparel)
- **Assembly Items**: Bundle products with components (Bills of Materials)

The scripts ensure proper filtering, mapping, and formatting required by NetSuite's CSV import feature.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **TypeScript**: Installed via project dependencies
- Access to Dear/Cin7 and Shopify for CSV exports

## Installation

1. Clone the repository:

```bash
git clone https://github.com/SuavecitoInc/netsuite-import-tools.git
cd netsuite-import-tools
```

2. Install dependencies:

```bash
npm install
```

3. Create the `input` directory if it doesn't exist:

```bash
mkdir -p input output
```

## DEAR / CIN7

### Required CSV Exports

Before running any scripts, export the following CSV files and place them in the `input/` directory:

#### From Dear/Cin7

1. **Inventory List** → Save as `input/Inventory_List.csv`
   - Export all inventory items
   - Include fields: ProductCode, Name, Barcode, Weight, Price, etc.

2. **Assembly BOM List** → Save as `input/Assembly_BOM_List.csv`
   - Export all assembly bills of materials
   - Include fields: ProductSKU, ComponentSKU, Quantity

3. **Matrix Inventory List** → Save as `input/Inventory_Matrix_List.csv`
   - Export only apparel/sized items
   - Include family and option fields
   - **Important**: Remove these items from `Inventory_List.csv`

#### From Shopify

4. **Product Export** → Save as `input/SHOPIFY-ITEMS.csv`
   - Export all products from your Shopify store
   - Include Fields Handle, Title, Body (HTML), Vendor, Product Category, Type, and Variant SKU. Remove anything else

#### Expected Input Structure

```
input/
├── Assembly_BOM_List.csv
├── Inventory_List.csv
├── Inventory_Matrix_List.csv
└── SHOPIFY-ITEMS.csv
```

### Usage

#### 1. Inventory Items

Generates standard inventory items for NetSuite, excluding assemblies and matrix items.

**Run:**

```bash
npm run dear:inventory-item
```

**Output:** `output/Dear_to_NetSuite_Inventory_Items.csv`

#### 2. Matrix Items

Generates parent and child matrix items for product families (e.g., apparel with sizes).

**Run:**

```bash
npm run dear:inventory-item-matrix
```

**Output:** `output/Dear_to_NetSuite_Inventory_Items_Matrix.csv`

**Note:** This includes both parent items (1 per family) and child items (variants).

#### 3. Assembly Items

Generates assembly/bundle items with their component mappings.

**Run:**

```bash
npm run dear:assembly-item
```

**Output:** `output/Dear_to_NetSuite_Assembly_Items.csv`

#### 4. Inventory Availability

Generates inventory availability adjustments for NetSuite based on Dear inventory data.

**Run:**

```bash
npm run dear:inventory-availability
```

**Output:** `output/Dear_to_NetSuite_Inventory_Adjustment.csv`

## SHOPIFY

### Required CSV Exports

Before running any scripts, export the following CSV files and place them in the `input/` directory:

#### From NetSuite

1. **Product Export** → Save as `input/NETSUITE-ITEMS-EXPORT.csv`
   - Export all Products from NetSuite
   - Include fields: Internal ID, Type, Item SKU.

#### From Shopify

4. **Product Export** → Save as `input/SHOPIFY-ITEMS-EXPORT.csv`
   - Export all products from your Shopify store
   - Include all fields, this is just a standard Shopify product export

#### Expected Input Structure

```
input/
├── NETSUITE-ITEMS-EXPORT.csv
└── SHOPIFY-ITEMS-EXPORT.csv
```

### Usage

#### 1. Inventory Items

Generates standard inventory items for NetSuite, excluding assemblies and matrix items.

**Run:**

```bash
npm run shopify:inventory-item
```

**Output:** `output/Shopify_to_NetSuite_Inventory_Items.csv`

#### 2. Matrix Items

Generates parent and child matrix items for product families (e.g., apparel with sizes).

**Run:**

```bash
npm run shopify:inventory-item-matrix
```

**Output:** `output/NetSuite_Inventory_Items_Matrix.csv`

**Note:** This includes both parent items (1 per family) and child items (variants).

#### 3. Match Items

Generates a CSF of items, matching Shopify items to NetSuite items based on SKU, and mapping fields from Shopify to NetSuite. You must add the fields you want to map to the FIELD_MAPS.

Config:

```typescript
const FIELD_MAPS = [
  {
    shopifyField: 'Body (HTML)', // Shopify field name from the export
    netsuiteField: 'Description', // Desired NetSuite field name for the output CSV column
  },
];
```

**Run:**

```bash
npm run shopify:match-items
```

**Output:** `output/Shopify_to_NetSuite_Matched_Items.csv`

## NETSUITE

### Import Order

⚠️ **Critical**: Import files into NetSuite in this exact order:

1. **Inventory Items** (`NetSuite_Inventory_Items.csv`)
   - Must be imported first as they are components for assemblies

2. **Matrix Items** (`NetSuite_Inventory_Items_Matrix.csv`)
   - Import parent items, then child items

3. **Assembly Items** (`NetSuite_Assembly_Items.csv`)
   - Import last, after all component items exist

**Why?** Assembly items reference inventory items as components. If components don't exist in NetSuite, the import will fail.

### Configuration

#### Debug Mode

To enable detailed logging, edit the script file and set:

```typescript
const DEBUG = true;
```

This will output:

- All SKUs being processed
- Item-by-item details
- Component mappings for assemblies
- Family groupings for matrix items

### Field Mappings

Field mappings are configured in:

- `src/lib/configs/dear.ts` - Dear/Cin7 to NetSuite field mappings
- `src/lib/configs/shopify.ts` - Shopify to NetSuite field mappings

### Troubleshooting

### No Output File Generated

**Issue:** Script runs but no CSV is created.

**Solution:**

- Check that input CSV files exist in `input/` directory
- Verify CSV files have correct column headers
- Check terminal for error messages

### Import Fails in NetSuite

**Issue:** CSV uploads but NetSuite shows import errors.

**Solution:**

- Verify you followed the [import order](#import-order)
- Check that all referenced items exist (components, subsidiaries, classes)
- Review NetSuite's error log for specific field issues
- Verify saved import mappings match your file structure (see [SAVED_IMPORTS.md](./SAVED_IMPORTS.md))

### Duplicate SKUs

**Issue:** "Duplicate external ID" error in NetSuite.

**Solution:**

- Check if items already exist in NetSuite
- Use Update mode instead of Add mode in NetSuite import
- Review your source data for duplicate SKUs

### Missing Items in Output

**Issue:** Expected more items in output CSV.

**Solution:**

- Items may be filtered out if not in Shopify export
- Check that `SHOPIFY-ITEMS.csv` contains all expected SKUs
- Enable DEBUG mode to see which items are being filtered

## Project Structure

```
netsuite-import-tools/
├── input/                          # Place CSV exports here
│   ├── Assembly_BOM_List.csv
│   ├── Inventory_List.csv
│   ├── Inventory_Matrix_List.csv
│   ├── NETSUITE-ITEMS-EXPORT.csv
│   ├── SHOPIFY-ITEMS-EXPORT.csv
│   └── SHOPIFY-ITEMS.csv
├── output/                         # Generated NetSuite CSVs
│   ├── NetSuite_Assembly_Items.csv
│   ├── NetSuite_Inventory_Items.csv
│   └── NetSuite_Inventory_Items_Matrix.csv
├── src/
│   ├── dear/
│   │   ├── assembly-item.ts           # Assembly items script
│   │   ├── inventory-item.ts          # Standard inventory script
│   │   └── inventory-item-matrix.ts   # Matrix items script
│   ├── shopify/
│   │   ├── helpers.ts                 # Helper functions for Shopify integration
│   │   ├── inventory-item.ts          # Standard inventory script
│   │   └── inventory-item-matrix.ts   # Matrix items script
│   └── lib/
│       ├── configs/
│       │   └── dear.ts            # Field mappings
│       │   └── shopify.ts            # Field mappings
│       ├── types/                 # TypeScript types
│       └── utils.ts               # Shared utilities
├── package.json
├── tsconfig.json
├── README.md
└── SAVED_IMPORTS.md               # NetSuite import mappings
```

## NetSuite Import Mappings

Saved CSV Import mappings for NetSuite can be found in [SAVED_IMPORTS.md](./SAVED_IMPORTS.md).

These mappings define how CSV columns map to NetSuite fields during import.

## Notes

### Matrix Items (Dear/Cin7 Families)

- **Only apparel with size variations** are handled as NetSuite Matrix Items
- All other product families are imported as standard Inventory Items
- Matrix items must be separated into their own CSV (`Inventory_Matrix_List.csv`)
- Remove matrix items from `Inventory_List.csv` before running the standard inventory import

### Component SKUs

Assembly component SKUs are automatically included in the inventory items output, even if they're not in Shopify. This ensures all components exist before assemblies are imported.

---

## Development

### Adding New Field Mappings

Edit `src/lib/configs/dear.ts`:

```typescript
export const INVENTORY_ITEM_MAPPINGS: MAPPINGS = {
  newfieldname: {
    field: 'DearFieldName', // Source field from Dear/Cin7
    default: 'Default Value', // Or null if mapping from source
  },
};
```

### Running Individual Scripts

```bash
npx tsx src/inventory-item.ts
npx tsx src/assembly-item.ts
npx tsx src/inventory-item-matrix.ts
```

---

**Questions?** Contact the development team or review the source code in `src/`.
