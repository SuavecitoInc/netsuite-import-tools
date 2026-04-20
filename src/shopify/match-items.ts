import { initializeCSV, parseCSV } from '../lib/utils';
import type { ShopifyItemRow } from '../lib/types/shopify';
import { getFieldValueByHandle } from './helpers';
import { SHOPIFY_FIELDS } from '../lib/configs/shopify';

// Update these mappings based on the fields you want to import from Shopify to NetSuite and their corresponding NetSuite
// field names (whatever name you want to use for the column on the csv)
const FIELD_MAPS = [
  {
    shopifyField: SHOPIFY_FIELDS.Description,
    netsuiteField: 'Description',
  },
];

type NetSuiteItemRow = {
  'Internal ID': string;
  Type: string;
  'Display Name': string;
  'Item SKU': string;
};

// local script constants
const DEBUG = false;

async function main() {
  try {
    console.log('Getting Shopify Items...');
    // load shopify retail items to filter inventory items
    const shopifyExportFilePath = 'input/SHOPIFY-ITEMS-EXPORT';
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyExportFilePath,
    );
    // load netsuite items to get internal id mappings
    const netSuiteItemsFilePath = 'input/NETSUITE-ITEMS-EXPORT';
    const netSuiteItemRows = await parseCSV<NetSuiteItemRow>(
      netSuiteItemsFilePath,
    );

    console.log('Creating NetSuite item lookup by SKU...');

    // create mapping of netsuite items by sku for easy lookup
    const netSuiteItemsBySKU: Record<string, NetSuiteItemRow> = {};
    netSuiteItemRows.forEach((item) => {
      netSuiteItemsBySKU[item['Item SKU']] = item;
    });

    console.log(
      'Generated NetSuite item lookup by SKU for',
      Object.keys(netSuiteItemsBySKU).length,
      'items.',
    );

    console.log('Generating NetSuite inventory items for import...');

    // create object for NetSuite import
    const netSuiteImportItems = shopifyItemRows.map((item) => {
      const netsuiteData = netSuiteItemsBySKU[item['Variant SKU']];
      if (!netsuiteData) {
        return null;
      }
      const fields = FIELD_MAPS.map((el) => {
        DEBUG &&
          console.log('Mapping field', el.shopifyField, 'to', el.netsuiteField);
        DEBUG && console.log('Shopify value:', item[el.shopifyField]);
        let value = item[el.shopifyField];

        if (value === '') {
          DEBUG && console.log('Value is empty, trying to get value by handle');
          value = getFieldValueByHandle(
            item.Handle,
            el.shopifyField,
            shopifyItemRows,
            DEBUG,
          ) as string;

          DEBUG && console.log('Value from handle is:', value);
        }
        return {
          [el.netsuiteField.toLowerCase().replace(/ /g, '_')]: value,
        };
      });
      DEBUG && console.log('Mapped fields:', fields);

      return {
        internalid: netsuiteData['Internal ID'],
        type: netsuiteData['Type'],
        sku: netsuiteData['Item SKU'],
        ...fields[0], // get the first (and only) field mapping for this item
      };
    });

    // filter out null values (i.e. shopify items that do not have a matching netsuite item by sku)
    const filteredNetSuiteImportItems = netSuiteImportItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    console.log(
      'Generated',
      filteredNetSuiteImportItems.length,
      'NetSuite inventory items for import.',
    );

    // export file name
    const outputFilename = 'Shopify_to_NetSuite_Match_Items';

    // initialize CSV writer
    // generate headers from FIELD_MAPS
    const headers = [
      { id: 'internalid', title: 'internalid' },
      { id: 'type', title: 'type' },
      { id: 'sku', title: 'sku' },
      ...FIELD_MAPS.map((el) => ({
        id: el.netsuiteField.toLowerCase().replace(/ /g, '_'),
        title: el.netsuiteField.toLowerCase().replace(/ /g, '_'),
      })),
    ];
    const csvWriter = initializeCSV(outputFilename, headers);

    await csvWriter.writeRecords(filteredNetSuiteImportItems);
    console.log('NetSuite inventory items CSV written to', outputFilename);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
