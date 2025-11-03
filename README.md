# NetSuite Import Tools

> A collection of TypeScript tools to transform Dear/Cin7 and Shopify data into NetSuite-compatible CSV import files.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Required CSV Exports](#required-csv-exports)
- [Usage](#usage)
  - [1. Inventory Items](#1-inventory-items)
  - [2. Matrix Items](#2-matrix-items)
  - [3. Assembly Items](#3-assembly-items)
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

## Required CSV Exports

Before running any scripts, export the following CSV files and place them in the `input/` directory:

### From Dear/Cin7

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

### From Shopify

4. **Product Export** → Save as `input/SHOPIFY-TN-ITEMS.csv`
   - Export all products from your Shopify store
   - Include Variant SKU field for filtering

### Expected Input Structure

```
input/
├── Assembly_BOM_List.csv
├── Inventory_List.csv
├── Inventory_Matrix_List.csv
└── SHOPIFY-TN-ITEMS.csv
```

## Usage

### 1. Inventory Items

Generates standard inventory items for NetSuite, excluding assemblies and matrix items.

**Run:**

```bash
npm run inventory-item
```

**Output:** `output/NetSuite_Inventory_Items.csv`

**Example Output:**

```bash
Getting Shopify Items...
There are 654 Shopify item rows.
Generating assembly item exclusion list...
There are 1096 assembly BOM rows.
There are 455 unique assembly item SKUs to exclude from inventory items.
There are 1877 inventory item rows.
Removing non-Shopify retail items from inventory items...
Joining component SKUs to Shopify item SKUs...
Excluding assembly items from inventory items...
After excluding assembly items, there are 732 inventory items to import.
Generated 732 NetSuite inventory items for import.
✓ NetSuite inventory items CSV written to NetSuite_Inventory_Items.csv
```

### 2. Matrix Items

Generates parent and child matrix items for product families (e.g., apparel with sizes).

**Run:**

```bash
npm run inventory-item-matrix
```

**Output:** `output/NetSuite_Inventory_Items_Matrix.csv`

**Example Output:**

```bash
Getting Matrix Items...
There are 243 matrix inventory item rows.
There are 42 families:
Generated 285 NetSuite inventory items for import.
✓ NetSuite inventory items CSV written to NetSuite_Inventory_Items_Matrix.csv
```

**Note:** This includes both parent items (1 per family) and child items (variants).

### 3. Assembly Items

Generates assembly/bundle items with their component mappings.

**Run:**

```bash
npm run assembly-item
```

**Output:** `output/NetSuite_Assembly_Items.csv`

**Example Output:**

```bash
Getting Shopify Items...
There are 654 Shopify item rows.
Generating assembly item list...
There are 1096 assembly BOM rows.
There are 455 unique assembly item SKUs to process.
Generated 455 assemblies with components.
There are 1877 DEAR inventory item rows.
Filtering assembly items to only Shopify Retail SKUs...
Generated 376 NetSuite assembly items for import.
✓ NetSuite assembly items CSV written to NetSuite_Assembly_Items.csv
```

## Import Order

⚠️ **Critical**: Import files into NetSuite in this exact order:

1. **Inventory Items** (`NetSuite_Inventory_Items.csv`)
   - Must be imported first as they are components for assemblies

2. **Matrix Items** (`NetSuite_Inventory_Items_Matrix.csv`)
   - Import parent items, then child items

3. **Assembly Items** (`NetSuite_Assembly_Items.csv`)
   - Import last, after all component items exist

**Why?** Assembly items reference inventory items as components. If components don't exist in NetSuite, the import will fail.

## Configuration

### Debug Mode

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

## Troubleshooting

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
- Check that `SHOPIFY-TN-ITEMS.csv` contains all expected SKUs
- Enable DEBUG mode to see which items are being filtered

## Project Structure

```
netsuite-import-tools/
├── input/                          # Place CSV exports here
│   ├── Assembly_BOM_List.csv
│   ├── Inventory_List.csv
│   ├── Inventory_Matrix_List.csv
│   └── SHOPIFY-TN-ITEMS.csv
├── output/                         # Generated NetSuite CSVs
│   ├── NetSuite_Assembly_Items.csv
│   ├── NetSuite_Inventory_Items.csv
│   └── NetSuite_Inventory_Items_Matrix.csv
├── src/
│   ├── assembly-item.ts           # Assembly items script
│   ├── inventory-item.ts          # Standard inventory script
│   ├── inventory-item-matrix.ts   # Matrix items script
│   └── lib/
│       ├── configs/
│       │   └── dear.ts            # Field mappings
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
