import { initializeCSV, parseCSV, barcodeStringToNumber } from './lib/utils';
import { ASSEMBLY_ITEM_MAPPINGS } from './lib/configs/dear';
import type { ShopifyItemRow } from './lib/types/shopify';
import type {
  DearAssemblyItemRow,
  DearInventoryItemRow,
} from './lib/types/dear';

// Types
interface AssemblyComponent {
  componentSKU: string;
  quantity: number;
}

interface AssemblyData {
  components: AssemblyComponent[];
}

interface NetSuiteAssemblyItem {
  externalid: string;
  name: string;
  displayname: string;
  barcode: string | number;
  description: string;
  subsidiary: string | number | boolean | null;
  class: string | number | boolean | null;
  costingmethod: string | number | boolean | null;
  usebins: string | number | boolean | null;
  atpmethod: string | number | boolean | null;
  effectivebomcontrol: string | number | boolean | null;
  manufacturer: string;
  countryofmanufacture: string | number | boolean | null;
  weight: string;
  weightunit: string;
  saleprice: string;
  pricelevel1: string | number | boolean | null;
  pricelevel1price: string;
  pricelevel1currency: string | number | boolean | null;
  pricelevel2: string | number | boolean | null;
  pricelevel2price: string;
  pricelevel2currency: string | number | boolean | null;
  istaxable: string | number | boolean | null;
  taxschedule: string | number | boolean | null;
  [key: string]: any; // For dynamic component fields
}

// Constants
const DEBUG = false;
const PRODUCT_CODE = 'ProductCode';
const PRODUCT_SKU = 'ProductSKU';
const VARIANT_SKU = 'Variant SKU';

// Helper functions
function extractAssemblySKUs(bomRows: DearAssemblyItemRow[]): Set<string> {
  return new Set(bomRows.map((row) => row[PRODUCT_SKU]).filter(Boolean));
}

function buildAssembliesMap(
  bomRows: DearAssemblyItemRow[],
): Record<string, AssemblyData> {
  return bomRows.reduce(
    (acc, row) => {
      const productSKU = row[ASSEMBLY_ITEM_MAPPINGS.externalid.field];
      const componentSKU = row[ASSEMBLY_ITEM_MAPPINGS.component.field];
      const quantity = row[ASSEMBLY_ITEM_MAPPINGS.componentquantity.field];

      if (!productSKU || !componentSKU) {
        console.warn('Skipping BOM row with missing SKU or component');
        return acc;
      }

      if (!acc[productSKU]) {
        acc[productSKU] = { components: [] };
      }

      acc[productSKU].components.push({ componentSKU, quantity });
      return acc;
    },
    {} as Record<string, AssemblyData>,
  );
}

function filterAssemblyItems(
  inventoryItems: DearInventoryItemRow[],
  assemblyItemSKUs: Set<string>,
  shopifyRetailSKUs: Set<string>,
): DearInventoryItemRow[] {
  return inventoryItems.filter(
    (item) =>
      assemblyItemSKUs.has(item[PRODUCT_CODE]) &&
      shopifyRetailSKUs.has(item[PRODUCT_CODE]),
  );
}

function createNetSuiteAssemblyItem(
  item: DearInventoryItemRow,
  assemblies: Record<string, AssemblyData>,
): NetSuiteAssemblyItem {
  const assembly = assemblies[item[PRODUCT_CODE]];
  const components = assembly?.components || [];

  if (!assembly) {
    console.warn(`No assembly data found for ${item[PRODUCT_CODE]}`);
  }

  const netsuiteItem: NetSuiteAssemblyItem = {
    externalid: item[PRODUCT_CODE],
    name: item[PRODUCT_CODE],
    displayname: item[ASSEMBLY_ITEM_MAPPINGS.displayname.field],
    barcode: barcodeStringToNumber(item[ASSEMBLY_ITEM_MAPPINGS.barcode.field]),
    description: item[ASSEMBLY_ITEM_MAPPINGS.description.field],
    subsidiary: ASSEMBLY_ITEM_MAPPINGS.subsidiary.default,
    class: ASSEMBLY_ITEM_MAPPINGS.class.default,
    costingmethod: ASSEMBLY_ITEM_MAPPINGS.costingmethod.default,
    usebins: ASSEMBLY_ITEM_MAPPINGS.usebins.default,
    atpmethod: ASSEMBLY_ITEM_MAPPINGS.atpmethod.default,
    effectivebomcontrol: ASSEMBLY_ITEM_MAPPINGS.effectivebomcontrol.default,
    manufacturer: item[ASSEMBLY_ITEM_MAPPINGS.manufacturer.field],
    countryofmanufacture: ASSEMBLY_ITEM_MAPPINGS.countryofmanufacture.default,
    weight: item[ASSEMBLY_ITEM_MAPPINGS.weight.field],
    weightunit: item[ASSEMBLY_ITEM_MAPPINGS.weightunit.field],
    saleprice: item[ASSEMBLY_ITEM_MAPPINGS.salesprice.field],
    pricelevel1: ASSEMBLY_ITEM_MAPPINGS.pricelevel1.default,
    pricelevel1price: item[ASSEMBLY_ITEM_MAPPINGS.pricelevel1price.field],
    pricelevel1currency: ASSEMBLY_ITEM_MAPPINGS.pricelevel1currency.default,
    pricelevel2: ASSEMBLY_ITEM_MAPPINGS.pricelevel2.default,
    pricelevel2price: item[ASSEMBLY_ITEM_MAPPINGS.pricelevel2price.field],
    pricelevel2currency: ASSEMBLY_ITEM_MAPPINGS.pricelevel2currency.default,
    istaxable: ASSEMBLY_ITEM_MAPPINGS.istaxable.default,
    taxschedule: ASSEMBLY_ITEM_MAPPINGS.taxschedule.default,
  };

  // Add components dynamically
  components.forEach((component, index) => {
    netsuiteItem[`component${index + 1}item`] = component.componentSKU;
    netsuiteItem[`component${index + 1}quantity`] = component.quantity;
  });

  return netsuiteItem;
}

function generateComponentHeaders(maxComponents: number) {
  const headers = [];
  for (let i = 1; i <= maxComponents; i++) {
    headers.push(
      { id: `component${i}item`, title: `component${i}item` },
      { id: `component${i}quantity`, title: `component${i}quantity` },
    );
  }
  return headers;
}

function getMaxComponentCount(
  assemblies: Record<string, AssemblyData>,
): number {
  const counts = Object.values(assemblies).map((a) => a.components.length);
  return counts.length > 0 ? Math.max(...counts, 4) : 4;
}

async function main() {
  try {
    console.log('Getting Shopify Items...');
    const shopifyExportFilePath = 'input/SHOPIFY-TN-ITEMS';
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyExportFilePath,
    );
    console.log('There are', shopifyItemRows.length, 'Shopify item rows.');

    console.log('Generating assembly item list...');
    const assemblyBomFilePath = 'input/Assembly_BOM_List';
    const assemblyBomRows =
      await parseCSV<DearAssemblyItemRow>(assemblyBomFilePath);
    console.log('There are', assemblyBomRows.length, 'assembly BOM rows.');

    const assemblyItemSKUs = extractAssemblySKUs(assemblyBomRows);
    console.log(
      'There are',
      assemblyItemSKUs.size,
      'unique assembly item SKUs to process.',
    );

    const assemblies = buildAssembliesMap(assemblyBomRows);
    console.log(
      `Generated ${Object.keys(assemblies).length} assemblies with components.`,
    );

    if (DEBUG) {
      Object.entries(assemblies).forEach(([assemblySKU, assemblyData]) => {
        console.log(`Assembly SKU: ${assemblySKU}`);
        assemblyData.components.forEach((component) => {
          console.log(
            `  Component SKU: ${component.componentSKU}, Quantity: ${component.quantity}`,
          );
        });
      });
    }

    console.log('Loading DEAR inventory items...');
    const inventoryItemFilePath = 'input/Inventory_List';
    const inventoryItemRows = await parseCSV<DearInventoryItemRow>(
      inventoryItemFilePath,
    );
    console.log(
      'There are',
      inventoryItemRows.length,
      'DEAR inventory item rows.',
    );

    console.log('Filtering to Shopify retail assembly items...');
    const shopifyRetailSKUs = new Set(
      shopifyItemRows.map((item) => item[VARIANT_SKU]).filter(Boolean),
    );

    const filteredAssemblyItems = filterAssemblyItems(
      inventoryItemRows,
      assemblyItemSKUs,
      shopifyRetailSKUs,
    );

    console.log(
      'Found',
      filteredAssemblyItems.length,
      'assembly items to import.',
    );

    if (DEBUG) {
      console.log('Filtered Assembly Item SKUs:');
      filteredAssemblyItems.forEach((item) => {
        console.log(item[PRODUCT_CODE]);
      });
    }

    const netSuiteImportItems = filteredAssemblyItems.map((item) =>
      createNetSuiteAssemblyItem(item, assemblies),
    );

    console.log(
      'Generated',
      netSuiteImportItems.length,
      'NetSuite assembly items for import.',
    );

    const outputFilename = 'NetSuite_Assembly_Items';
    const maxComponents = getMaxComponentCount(assemblies);

    console.log(`Max components in any assembly: ${maxComponents}`);

    const baseHeaders = [
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
    ];

    const componentHeaders = generateComponentHeaders(maxComponents);
    const headers = [...baseHeaders, ...componentHeaders];

    const csvWriter = initializeCSV(outputFilename, headers);
    await csvWriter.writeRecords(netSuiteImportItems);
    console.log('NetSuite assembly items CSV written to', outputFilename);
  } catch (err: any) {
    console.error('Error:', err.message);
    if (DEBUG && err.stack) {
      console.error(err.stack);
    }
  }
}

main();
