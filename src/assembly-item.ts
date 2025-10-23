import { initializeCSV, parseCSV, barcodeStringToNumber } from './lib/utils';
import { ASSEMBLY_ITEM_MAPPINGS } from './lib/configs/dear';
import type { ShopifyItemRow } from './lib/types/shopify';
import type {
  DearAssemblyItemRow,
  DearInventoryItemRow,
} from './lib/types/dear';

// local script constants
const DEBUG = false;
const PRODUCT_CODE = 'ProductCode'; // dear sku field - from inventory list
const PRODUCT_SKU = 'ProductSKU'; // dear sku field - from assembly bom list
const VARIANT_SKU = 'Variant SKU'; // shopify sku field

async function main() {
  try {
    console.log('Getting Shopify Items...');
    // load shopify retail items to filter inventory items
    const shopifyExportFilePath = 'input/SHOPIFY-TN-ITEMS';
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyExportFilePath,
    );

    console.log('There are', shopifyItemRows.length, 'Shopify item rows.');

    console.log('Generating assembly item list...');
    // load dear assembly bom list to get assembly items
    const assemblyBomFilePath = 'input/Assembly_BOM_List';
    const assemblyBomRows =
      await parseCSV<DearAssemblyItemRow>(assemblyBomFilePath);

    console.log('There are', assemblyBomRows.length, 'assembly BOM rows.');

    // create a list of assembly item SKUs to filter out non assembly items (inventory items)
    const assemblyItemSKUs = new Set<string>();
    for (const row of assemblyBomRows) {
      if (row[PRODUCT_SKU]) {
        assemblyItemSKUs.add(row[PRODUCT_SKU]);
      }
    }

    console.log(
      'There are',
      assemblyItemSKUs.size,
      'unique assembly item SKUs to process.',
    );

    // join assemblies on productSKU to get components
    // create assemblies object with components and quantities to use later
    const assemblies: Record<
      string,
      { components: { componentSKU: string; quantity: number }[] }
    > = {};

    for (const row of assemblyBomRows) {
      const productSKU = row[ASSEMBLY_ITEM_MAPPINGS.externalid.field];
      const componentSKU = row[ASSEMBLY_ITEM_MAPPINGS.component.field];
      const quantity = row[ASSEMBLY_ITEM_MAPPINGS.componentquantity.field];

      if (!assemblies[productSKU]) {
        assemblies[productSKU] = {
          components: [],
        };
      }

      assemblies[productSKU].components.push({
        componentSKU,
        quantity,
      });
    }

    console.log(
      `Generated ${Object.keys(assemblies).length} assemblies with components.`,
    );

    // log all assemblies and their components
    if (DEBUG) {
      for (const [assemblySKU, assemblyData] of Object.entries(assemblies)) {
        console.log(`Assembly SKU: ${assemblySKU}`);
        for (const component of assemblyData.components) {
          console.log(
            `  Component SKU: ${component.componentSKU}, Quantity: ${component.quantity}`,
          );
        }
      }
    }

    // load inventory items list exported from DEAR
    const inventoryItemFilePath = 'input/Inventory_List';
    const inventoryItemRows = await parseCSV<DearInventoryItemRow>(
      inventoryItemFilePath,
    );
    // further processing to generate inventory item import list would go here

    console.log(
      'There are',
      inventoryItemRows.length,
      'DEAR inventory item rows.',
    );

    // filter out non assembly items from inventory items
    console.log('Removing non-assembly items from item list...');
    const assemblyItems = inventoryItemRows.filter((item) =>
      assemblyItemSKUs.has(item[PRODUCT_CODE]),
    );

    // Filter out non Shopify Retail items
    console.log(
      'Filtering assembly items to only Shopify Retail SKUs (everything else should be unnecessary)...',
    );
    const shopifyRetailSKUs = new Set(
      shopifyItemRows.map((item) => item[VARIANT_SKU]),
    );

    const filteredAssemblyItems = assemblyItems.filter((item) =>
      shopifyRetailSKUs.has(item[PRODUCT_CODE]),
    );

    // log all skus of filtered inventory items
    if (DEBUG) {
      console.log('Filtered Inventory Item SKUs:');
      for (const item of filteredAssemblyItems) {
        console.log(item[PRODUCT_CODE]);
      }
    }

    // create object for NetSuite import

    const netSuiteImportItems = filteredAssemblyItems.map((item) => {
      const assembly = assemblies[item[PRODUCT_CODE]];
      const parent = inventoryItemRows.find(
        (inv) => inv[PRODUCT_CODE] === item[PRODUCT_CODE],
      );
      const components = assembly?.components || [];

      const assemblyItem = {
        externalid: parent[PRODUCT_CODE],
        name: parent[PRODUCT_CODE],
        displayname: parent[ASSEMBLY_ITEM_MAPPINGS.displayname.field],
        barcode: barcodeStringToNumber(
          parent[ASSEMBLY_ITEM_MAPPINGS.barcode.field],
        ),
        description: parent[ASSEMBLY_ITEM_MAPPINGS.description.field],
        subsidiary: ASSEMBLY_ITEM_MAPPINGS.subsidiary.default,
        class: ASSEMBLY_ITEM_MAPPINGS.class.default,
        costingmethod: ASSEMBLY_ITEM_MAPPINGS.costingmethod.default,
        usebins: ASSEMBLY_ITEM_MAPPINGS.usebins.default,
        atpmethod: ASSEMBLY_ITEM_MAPPINGS.atpmethod.default,
        effectivebomcontrol: ASSEMBLY_ITEM_MAPPINGS.effectivebomcontrol.default,
        manufacturer: parent[ASSEMBLY_ITEM_MAPPINGS.manufacturer.field],
        countryofmanufacture:
          ASSEMBLY_ITEM_MAPPINGS.countryofmanufacture.default,
        weight: parent[ASSEMBLY_ITEM_MAPPINGS.weight.field],
        weightunit: parent[ASSEMBLY_ITEM_MAPPINGS.weightunit.field],
        saleprice: parent[ASSEMBLY_ITEM_MAPPINGS.salesprice.field],
        pricelevel1: ASSEMBLY_ITEM_MAPPINGS.pricelevel1.default,
        pricelevel1price: parent[ASSEMBLY_ITEM_MAPPINGS.pricelevel1price.field],
        pricelevel1currency: ASSEMBLY_ITEM_MAPPINGS.pricelevel1currency.default,
        pricelevel2: ASSEMBLY_ITEM_MAPPINGS.pricelevel2.default,
        pricelevel2price: parent[ASSEMBLY_ITEM_MAPPINGS.pricelevel2price.field],
        pricelevel2currency: ASSEMBLY_ITEM_MAPPINGS.pricelevel2currency.default,
        istaxable: ASSEMBLY_ITEM_MAPPINGS.istaxable.default,
        taxschedule: ASSEMBLY_ITEM_MAPPINGS.taxschedule.default,
      };

      // add components to assembly item
      for (let i = 0; i < components.length; i++) {
        assemblyItem[`component${i + 1}item`] = components[i].componentSKU;
        assemblyItem[`component${i + 1}quantity`] = components[i].quantity;
      }

      return assemblyItem;
    });

    console.log(
      'Generated',
      netSuiteImportItems.length,
      'NetSuite assembly items for import.',
    );

    // export file name
    const outputFilename = 'NetSuite_Assembly_Items.csv';

    const headers = [
      { id: 'externalid', title: 'externalid' },
      { id: 'name', title: 'name' },
      { id: 'displayname', title: 'displayname' },
      { id: 'barcode', title: 'barcode' },
      { id: 'description', title: 'description' },
      { id: 'subsidiary', title: 'subsidiary' },
      { id: 'class', title: 'class' },
      { id: 'costingmethod', title: 'costingmethod' },
      { id: 'usebins', title: 'usebins' },
      { id: 'atpmethod', title: 'atpmethod' },
      { id: 'effectivebomcontrol', title: 'effectivebomcontrol' },
      { id: 'manufacturer', title: 'manufacturer' },
      { id: 'countryofmanufacture', title: 'countryofmanufacture' },
      { id: 'weight', title: 'weight' },
      { id: 'weightunit', title: 'weightunit' },
      { id: 'saleprice', title: 'saleprice' },
      { id: 'pricelevel1', title: 'pricelevel1' },
      { id: 'pricelevel1price', title: 'pricelevel1price' },
      { id: 'pricelevel1currency', title: 'pricelevel1currency' },
      { id: 'pricelevel2', title: 'pricelevel2' },
      { id: 'pricelevel2price', title: 'pricelevel2price' },
      { id: 'pricelevel2currency', title: 'pricelevel2currency' },
      { id: 'istaxable', title: 'istaxable' },
      { id: 'taxschedule', title: 'taxschedule' },
      { id: 'component1item', title: 'component1item' },
      { id: 'component1quantity', title: 'component1quantity' },
      { id: 'component2item', title: 'component2item' },
      { id: 'component2quantity', title: 'component2quantity' },
      { id: 'component3item', title: 'component3item' },
      { id: 'component3quantity', title: 'component3quantity' },
      { id: 'component4item', title: 'component4item' },
      { id: 'component4quantity', title: 'component4quantity' },
    ];

    const csvWriter = initializeCSV(outputFilename, headers);

    await csvWriter.writeRecords(netSuiteImportItems);
    console.log('NetSuite inventory items CSV written to', outputFilename);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
