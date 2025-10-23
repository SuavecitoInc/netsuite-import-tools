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

TODO: Add matrix inventory item generation instructions here.
