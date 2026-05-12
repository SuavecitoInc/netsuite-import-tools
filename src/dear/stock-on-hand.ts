import {
  initializeCSV,
  parseCSV,
  createProgressLogger,
  formatDurationMs,
} from '../lib/utils';

import type {
  DearInventoryAvailabilityRow,
  DearAvailabilityReportRow,
} from '../lib/types/dear';

// filenames
const DEAR_INVENTORY_AVAILABILITY = 'StockOnHand_2026-05-12';

// local script constants
const EXTERNAL_ID = `TN-${DEAR_INVENTORY_AVAILABILITY}`;
const MEMO = `Inventory availability as of ${DEAR_INVENTORY_AVAILABILITY}`;

const CONFIG = {
  subsidiary: 1, // map to NetSuite subsidiary internal id
  location: 1, // map to NetSuite location internal id
  status: 1, // good
  date: '4/20/2026',
  bin: 4314,
};

async function main() {
  try {
    const runStartedAt = Date.now();

    console.log('Getting Dear Availability...');
    // load dear inventory list items
    const dearAvailabilityExportFilePath = `input/${DEAR_INVENTORY_AVAILABILITY}`;
    const dearAvailabilityReportRows =
      await parseCSV<DearAvailabilityReportRow>(
        dearAvailabilityExportFilePath,
        {
          showProgress: true,
          progressLabel: 'Dear Availability Report CSV Load',
          progressIntervalPercent: 10,
        },
      );

    console.log(
      'There are',
      dearAvailabilityReportRows.length,
      'Dear Availability Report item rows.',
    );

    // load dear inventory availability items
    const dearInventoryAvailabilityFilePath = `input/${DEAR_INVENTORY_AVAILABILITY}`;
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
      dearAvailabilityReportRows.length,
      'Dear Availability Report Conversion',
      500,
    );

    // create object for NetSuite import
    const netSuiteImportItems = dearAvailabilityReportRows
      .map((item, index) => {
        logConversionProgress(index + 1);

        return {
          externalid: EXTERNAL_ID,
          memo: MEMO,
          subsidiary: CONFIG.subsidiary,
          location: CONFIG.location,
          status: CONFIG.status,
          date: CONFIG.date,
          item: item.ProductCode, // map to item external id
          available: item.Quantity,
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
    const outputFilename =
      'Dear_to_NetSuite_Inventory_Adjustment-STOCK_ON_HAND';

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
