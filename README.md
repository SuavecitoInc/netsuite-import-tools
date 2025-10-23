# NetSuite Import Tools

> A collection of tools and scripts to facilitate data import into NetSuite.

## Dear / Cin7

## CSV Exports (Required)

CSVs are expected in the `input` directory with the following names:

- Export data from DEAR / Cin7 as CSV files.
  - `Inventory_List.csv`
  - `Assembly_BOM_list.csv`
- Export data from Shopify as CSV file.
  - `SHOPIFY-TN-ITEMS.csv`

## NetSuite Import Mappings

The Saved CSV Import mappings can be found [here](./SAVED_IMPORTS.md).

## Notes

Dear / Cin7 Families - NetSuite Matrix Items:

- We are only handling Apparel with Sizes as Matrix Items.
- All other Families will be handled as standard Inventory Items.

Import Sheets:

- Remove all apparel that will be handled as Matrix Items from the `Inventory_List.csv` before running the Inventory Item import script. Create its own CSV `Inventory_List_Matrix.csv` for the Matrix Item import script.

### RUN

Inventory Items:

This script will generate a CSV file named `NetSuite_Inventory_Items.csv` in `output` directory. This file contains the inventory items ready for import into NetSuite.

```bash
❯ npm run inventory-item

> netsuite-import-tools@0.0.1 inventory-item
> tsx src/inventory-item.ts

Getting Shopify Items...
There are 654 Shopify item rows.
Generating assembly item exclusion list...
There are 1096 assembly BOM rows.
There are 455 unique assembly item SKUs to exclude from inventory items.
There are 1877 inventory item rows.
Removing non-Shopify retail items from inventory items...
Joining component SKUs to Shopify item SKUs...
Excluding assembly items from inventory items, as they are not inventory items in NetSuite, and will be handled separately...
After excluding assembly items, there are 732 inventory items to import.
Generated 732 NetSuite inventory items for import.
NetSuite inventory items CSV written to NetSuite_Inventory_Items.csv
```

Assembly Items:

This script will generate a CSV file named `NetSuite_Assembly_Items.csv` in `output` directory. This file contains the assembly items ready for import into NetSuite. When importing make sure to import the Inventory Items first, as they must exist in NetSuite before assemblies can be created.

```bash
❯ npm run assembly-item

> netsuite-import-tools@0.0.1 assembly-item
> tsx src/assembly-item.ts

Getting Shopify Items...
There are 654 Shopify item rows.
Generating assembly item list...
There are 1096 assembly BOM rows.
There are 455 unique assembly item SKUs to process.
Generated 455 assemblies with components.
There are 1877 DEAR inventory item rows.
Removing non-assembly items from item list...
Filtering assembly items to only Shopify Retail SKUs (everything else should be unnecessary)...
Generated 376 NetSuite assembly items for import.
NetSuite inventory items CSV written to NetSuite_Assembly_Items.csv
```

Matrix Inventory Items:

This script will generate a CSV file named `NetSuite_Inventory_Items_Matrix.csv` in `output` directory. This file contains the matrix inventory items ready for import into NetSuite.

```bash
❯ npm run inventory-item-matrix

> netsuite-import-tools@0.0.1 inventory-item-matrix
> tsx src/inventory-item-matrix.ts

Getting Matrix Items...
There are 243 matrix inventory item rows.
There are  42 families:
Generated 285 NetSuite inventory items for import.
NetSuite inventory items CSV written to NetSuite_Inventory_Items_Matrix.csv
```
