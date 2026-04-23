import {
  initializeCSV,
  parseCSV,
  createProgressLogger,
  formatDurationMs,
} from '../lib/utils';

import type {
  DearInventoryItemRow,
  DearInventoryAvailabilityRow,
} from '../lib/types/dear';

// local script constants
const REMOVE_NEGATIVE_QUANTITY = false; // set to true to remove negative quantities, false to keep them (NetSuite will reject negative quantities on inventory adjustments)
const EXTERNAL_ID = 'SOME EXTERNAL ID';
const MEMO = 'SOME MEMO';

const CONFIG = {
  subsidiary: 1, // map to NetSuite subsidiary internal id
  location: 1, // map to NetSuite location internal id
  status: 1, // good
  date: '4/20/2026',
};

async function main() {
  try {
    const runStartedAt = Date.now();

    console.log('Getting Dear Inventory Items...');
    // load dear inventory list items
    const dearInventoryListExportFilePath = 'input/Inventory_List';
    const dearInventoryListItemRows = await parseCSV<DearInventoryItemRow>(
      dearInventoryListExportFilePath,
      {
        showProgress: true,
        progressLabel: 'Dear Inventory List CSV Load',
        progressIntervalPercent: 10,
      },
    );

    console.log(
      'There are',
      dearInventoryListItemRows.length,
      'Dear inventory list item rows.',
    );

    // load dear inventory availability items
    const dearInventoryAvailabilityFilePath = 'input/Inventory_Availability';
    const dearInventoryAvailabilityRows =
      await parseCSV<DearInventoryAvailabilityRow>(
        dearInventoryAvailabilityFilePath,
        {
          showProgress: true,
          progressLabel: 'Dear Inventory Availability CSV Load',
          progressIntervalPercent: 10,
        },
      );
    console.log(
      'There are',
      dearInventoryAvailabilityRows.length,
      'Dear inventory availability item rows.',
    );

    console.log('Building Dear inventory availability index by SKU...');
    const availabilityBySku = new Map<string, DearInventoryAvailabilityRow>();
    dearInventoryAvailabilityRows.forEach((row) => {
      if (row.SKU && !availabilityBySku.has(row.SKU)) {
        availabilityBySku.set(row.SKU, row);
      }
    });

    const logConversionProgress = createProgressLogger(
      dearInventoryListItemRows.length,
      'Dear Inventory Availability Conversion',
      500,
    );

    // create object for NetSuite import
    const netSuiteImportItems = dearInventoryListItemRows
      .map((item, index) => {
        logConversionProgress(index + 1);

        const dearInventoryRow = availabilityBySku.get(item.ProductCode);

        if (dearInventoryRow === undefined) {
          console.warn(
            `No inventory availability found for SKU: ${item.ProductCode}`,
          );
          return null;
        }

        if (REMOVE_NEGATIVE_QUANTITY) {
          console.warn(
            `REMOVE_NEGATIVE_QUANTITY is enabled for SKU: ${item.ProductCode}`,
          );
          if (dearInventoryRow.Available < 0) {
            console.warn(
              `Negative inventory for SKU: ${item.ProductCode} removed`,
            );
            return null;
          }
        }

        return {
          externalid: EXTERNAL_ID,
          memo: MEMO,
          subsidiary: CONFIG.subsidiary,
          location: CONFIG.location,
          status: CONFIG.status,
          date: CONFIG.date,
          item: item.ProductCode, // map to item external id
          available: dearInventoryRow.Available,
          averagecost: item.AverageCost,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // clear nulls from items that had no availability
    const filteredNetSuiteImportItems = netSuiteImportItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    console.log(
      'Generated',
      filteredNetSuiteImportItems.length,
      'NetSuite inventory items for import.',
    );

    // export file name
    const outputFilename = 'Dear_to_NetSuite_Inventory_Adjustment';

    const headers = [
      { id: 'externalid', title: 'externalid' },
      { id: 'memo', title: 'memo' },
      { id: 'subsidiary', title: 'subsidiary' },
      { id: 'location', title: 'location' },
      { id: 'status', title: 'status' },
      { id: 'date', title: 'date' },
      { id: 'item', title: 'item' },
      { id: 'available', title: 'available' },
      { id: 'averagecost', title: 'averagecost' },
    ];
    const csvWriter = initializeCSV(outputFilename, headers);

    await csvWriter.writeRecords(filteredNetSuiteImportItems);
    console.log('NetSuite inventory adjustment CSV written to', outputFilename);
    console.log(
      'Dear inventory availability completed in',
      formatDurationMs(Date.now() - runStartedAt),
    );
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
