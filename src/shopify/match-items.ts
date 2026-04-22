import {
  initializeCSV,
  parseCSV,
  createProgressLogger,
  formatDurationMs,
} from '../lib/utils';
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
const DEFAULT_SHOPIFY_INPUT_FILENAME = 'SHOPIFY-ITEMS-EXPORT';
const DEFAULT_NETSUITE_INPUT_FILENAME = 'NETSUITE-ITEMS-EXPORT';
const MAX_ITEMS_PER_FILE = 20000;

const sanitizeTypeForFilename = (type: string): string => {
  const normalized = type
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized === '' ? 'unknown_type' : normalized;
};

async function main() {
  try {
    const runStartedAt = Date.now();
    const shopifyFilenameArg = process.argv[2]?.trim();
    const netSuiteFilenameArg = process.argv[3]?.trim();

    const shopifyInputFilename =
      shopifyFilenameArg && shopifyFilenameArg !== ''
        ? shopifyFilenameArg.replace(/\.csv$/i, '')
        : DEFAULT_SHOPIFY_INPUT_FILENAME;
    const netSuiteInputFilename =
      netSuiteFilenameArg && netSuiteFilenameArg !== ''
        ? netSuiteFilenameArg.replace(/\.csv$/i, '')
        : DEFAULT_NETSUITE_INPUT_FILENAME;

    console.log('Getting Shopify Items...');
    console.log('Using Shopify input file:', `${shopifyInputFilename}.csv`);

    // load shopify retail items to filter inventory items
    const shopifyExportFilePath = `input/${shopifyInputFilename}`;
    const shopifyItemRows = await parseCSV<ShopifyItemRow>(
      shopifyExportFilePath,
      {
        showProgress: true,
        progressLabel: 'Shopify CSV Load',
        progressIntervalPercent: 10,
      },
    );

    const shopifyLoadedAt = Date.now();

    console.log('Using NetSuite input file:', `${netSuiteInputFilename}.csv`);

    // load netsuite items to get internal id mappings
    const netSuiteItemsFilePath = `input/${netSuiteInputFilename}`;
    const netSuiteItemRows = await parseCSV<NetSuiteItemRow>(
      netSuiteItemsFilePath,
      {
        showProgress: true,
        progressLabel: 'NetSuite CSV Load',
        progressIntervalPercent: 10,
      },
    );
    const netSuiteLoadedAt = Date.now();

    console.log('Creating NetSuite item lookup by SKU...');

    // create mapping of netsuite items by sku for easy lookup
    const netSuiteItemsBySKU: Record<string, NetSuiteItemRow> = {};
    netSuiteItemRows.forEach((item) => {
      netSuiteItemsBySKU[item['Item SKU']] = item;
    });
    const indexingDoneAt = Date.now();

    console.log(
      'Generated NetSuite item lookup by SKU for',
      Object.keys(netSuiteItemsBySKU).length,
      'items.',
    );

    console.log('Generating NetSuite inventory items for import...');

    const logMatchProgress = createProgressLogger(
      shopifyItemRows.length,
      'Shopify Match Conversion',
      500,
    );

    // create object for NetSuite import
    const netSuiteImportItems = shopifyItemRows.map((item, index) => {
      const netsuiteData = netSuiteItemsBySKU[item['Variant SKU']];
      logMatchProgress(index + 1);

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

      const mappedFields = Object.assign({}, ...fields);

      return {
        internalid: netsuiteData['Internal ID'],
        type: netsuiteData['Type'],
        sku: netsuiteData['Item SKU'],
        ...mappedFields,
      };
    });
    const transformDoneAt = Date.now();

    // filter out null values (i.e. shopify items that do not have a matching netsuite item by sku)
    const filteredNetSuiteImportItems = netSuiteImportItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
    const filteringDoneAt = Date.now();

    console.log(
      'Generated',
      filteredNetSuiteImportItems.length,
      'NetSuite inventory items for import.',
    );

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

    const matchedItemsByType: Record<
      string,
      (typeof filteredNetSuiteImportItems)[number][]
    > = {};
    filteredNetSuiteImportItems.forEach((item) => {
      const itemType = item.type?.trim() || 'Unknown Type';
      if (!matchedItemsByType[itemType]) {
        matchedItemsByType[itemType] = [];
      }
      matchedItemsByType[itemType].push(item);
    });

    const writeStartedAt = Date.now();

    const typeEntries = Object.entries(matchedItemsByType);
    console.log('Writing', typeEntries.length, 'type-specific output files...');

    for (const [itemType, rows] of typeEntries) {
      const baseFilename = `Shopify_to_NetSuite_Match_Items_${sanitizeTypeForFilename(itemType)}`;
      const totalChunks = Math.max(
        1,
        Math.ceil(rows.length / MAX_ITEMS_PER_FILE),
      );

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const chunkStart = chunkIndex * MAX_ITEMS_PER_FILE;
        const chunkRows = rows.slice(
          chunkStart,
          chunkStart + MAX_ITEMS_PER_FILE,
        );
        const outputFilename =
          totalChunks === 1
            ? baseFilename
            : `${baseFilename}_part_${String(chunkIndex + 1).padStart(2, '0')}`;
        const csvWriter = initializeCSV(outputFilename, headers);
        await csvWriter.writeRecords(chunkRows);
        console.log(
          'Wrote',
          chunkRows.length,
          'rows for type',
          `'${itemType}'`,
          'to',
          `${outputFilename}.csv`,
        );
      }
    }

    const completedAt = Date.now();
    console.log('Finished writing type-specific NetSuite match CSV files.');

    console.log('Timing Summary:');
    console.log(
      '- Shopify CSV load:',
      formatDurationMs(shopifyLoadedAt - runStartedAt),
    );
    console.log(
      '- NetSuite CSV load:',
      formatDurationMs(netSuiteLoadedAt - shopifyLoadedAt),
    );
    console.log(
      '- NetSuite SKU index:',
      formatDurationMs(indexingDoneAt - netSuiteLoadedAt),
    );
    console.log(
      '- Transform:',
      formatDurationMs(transformDoneAt - indexingDoneAt),
    );
    console.log(
      '- Filter matched rows:',
      formatDurationMs(filteringDoneAt - transformDoneAt),
    );
    console.log('- CSV write:', formatDurationMs(completedAt - writeStartedAt));
    console.log('- Total:', formatDurationMs(completedAt - runStartedAt));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
