import path from 'path';
import csv from 'csvtojson';
import { createObjectCsvWriter } from 'csv-writer';
import { ObjectMap } from 'csv-writer/src/lib/lang/object';
import { CsvWriter } from 'csv-writer/src/lib/csv-writer';

export const parseCSV = async <Row>(filePath: string) => {
  const jsonArray = await csv().fromFile(
    path.join(__dirname, `../../${filePath}.csv`),
  );
  return jsonArray as Row[];
};

export const initializeCSV = (
  fileName: string,
  header: { id: string; title: string }[],
) => {
  return createObjectCsvWriter({
    path: path.join(__dirname, `../../output/${fileName}.csv`),
    header,
    append: false, // append if file exists
  });
};

export const writeToCSV = async (
  csvWriter: CsvWriter<ObjectMap<any>>,
  records: any[],
) => {
  await csvWriter.writeRecords(records);
};

export const getTaxRate = (
  itemsTotal: number,
  shippingTotal: number,
  taxTotal: number,
) => {
  if (taxTotal === 0 || itemsTotal + shippingTotal === 0) return 0;
  // rounded items total
  const roundedItemsTotal = parseFloat(itemsTotal.toFixed(2)); // required due to floating point precision issues
  const taxableTotal = roundedItemsTotal + shippingTotal;

  return taxTotal / taxableTotal;
};

export const getMaxComponentCount = (
  assemblies: Record<
    string,
    { components: { componentSKU: string; quantity: number }[] }
  >,
) => {
  // find assembly items with the most components for logging
  let maxComponents = 0;
  let assemblyWithMostComponents = null;
  Object.keys(assemblies).forEach((assemblySKU) => {
    const numComponents = assemblies[assemblySKU].components.length;
    if (numComponents > maxComponents) {
      maxComponents = numComponents;
      assemblyWithMostComponents = assemblySKU;
    }
  });
  console.log(
    `Assembly item with most components: ${assemblyWithMostComponents} (${maxComponents} components)`,
  );
};

export const barcodeStringToNumber = (barcode: string) => {
  // remove any non-numeric characters
  const numericString = barcode.replace(/\D/g, '');
  // convert to number
  if (numericString === '') return '';
  return parseInt(numericString, 10);
};

export const handleToTitleCase = (str: string) => {
  return str.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const addPrefixToSKU = (sku: string, prefix: string = 'TN-') => {
  return `${prefix}${sku}`;
};
