import path from 'path';
import csv from 'csvtojson';
import { createObjectCsvWriter } from 'csv-writer';
import { ObjectMap } from 'csv-writer/src/lib/lang/object';
import { CsvWriter } from 'csv-writer/src/lib/csv-writer';
import fs from 'fs';

// Configuration constants
const INPUT_DIR = path.join(__dirname, '../../input');
const OUTPUT_DIR = path.join(__dirname, '../../output');

/**
 * Parses a CSV file and returns an array of typed objects.
 *
 * @template Row - The type of the CSV rows
 * @param filePath - Path to the CSV file (without .csv extension)
 * @returns Promise resolving to an array of parsed rows
 * @throws Error if the file doesn't exist or cannot be parsed
 *
 * @example
 * ```typescript
 * const items = await parseCSV<InventoryItem>('input/Inventory_List');
 * ```
 */
export const parseCSV = async <Row>(filePath: string): Promise<Row[]> => {
  const fullPath = path.join(__dirname, `../../${filePath}.csv`);

  // Validate file exists
  if (!fs.existsSync(fullPath)) {
    throw new Error(`CSV file not found: ${fullPath}`);
  }

  try {
    const jsonArray = await csv().fromFile(fullPath);
    return jsonArray as Row[];
  } catch (error) {
    throw new Error(`Failed to parse CSV file ${fullPath}: ${error.message}`);
  }
};

/**
 * Initializes a CSV writer for output files.
 *
 * @param fileName - Name of the output file (without .csv extension)
 * @param header - Array of column definitions with id and title
 * @param append - Whether to append to existing file (default: false)
 * @returns CSV writer instance
 *
 * @example
 * ```typescript
 * const writer = initializeCSV('NetSuite_Items', [
 *   { id: 'sku', title: 'sku' },
 *   { id: 'name', title: 'name' }
 * ]);
 * ```
 */
export const initializeCSV = (
  fileName: string,
  header: { id: string; title: string }[],
  append: boolean = false,
): CsvWriter<ObjectMap<any>> => {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  return createObjectCsvWriter({
    path: path.join(OUTPUT_DIR, `${fileName}.csv`),
    header,
    append,
  });
};

/**
 * Writes records to a CSV file.
 *
 * @param csvWriter - CSV writer instance
 * @param records - Array of records to write
 * @returns Promise that resolves when writing is complete
 */
export const writeToCSV = async (
  csvWriter: CsvWriter<ObjectMap<any>>,
  records: any[],
): Promise<void> => {
  if (!records || records.length === 0) {
    console.warn('No records to write to CSV');
    return;
  }
  await csvWriter.writeRecords(records);
};

/**
 * Finds and returns the maximum number of components across all assemblies.
 * Also logs the assembly with the most components.
 *
 * @param assemblies - Record of assembly SKUs to their component data
 * @returns Maximum component count found
 *
 * @example
 * ```typescript
 * const maxCount = getMaxComponentCount(assemblies); // returns 12
 * ```
 */
export const getMaxComponentCount = (
  assemblies: Record<
    string,
    { components: { componentSKU: string; quantity: number }[] }
  >,
): number => {
  if (!assemblies || Object.keys(assemblies).length === 0) {
    return 0;
  }

  let maxComponents = 0;
  let assemblyWithMostComponents: string | null = null;

  Object.entries(assemblies).forEach(([assemblySKU, assemblyData]) => {
    const numComponents = assemblyData.components.length;
    if (numComponents > maxComponents) {
      maxComponents = numComponents;
      assemblyWithMostComponents = assemblySKU;
    }
  });

  if (assemblyWithMostComponents) {
    console.log(
      `Assembly item with most components: ${assemblyWithMostComponents} (${maxComponents} components)`,
    );
  }

  return maxComponents;
};

/**
 * Converts a barcode string to a number by removing non-numeric characters.
 * Returns empty string if no numeric characters are found.
 *
 * @param barcode - Barcode string to convert
 * @returns Parsed number or empty string
 *
 * @example
 * ```typescript
 * barcodeStringToNumber('ABC-123-456') // returns 123456
 * barcodeStringToNumber('NO-NUMBERS')  // returns ''
 * ```
 */
export const barcodeStringToNumber = (barcode: string): number | string => {
  if (!barcode || typeof barcode !== 'string') {
    return '';
  }

  // Remove any non-numeric characters
  const numericString = barcode.replace(/\D/g, '');

  if (numericString === '') {
    return '';
  }

  const parsed = parseInt(numericString, 10);

  // Check for safe integer range
  if (parsed > Number.MAX_SAFE_INTEGER) {
    console.warn(
      `Barcode ${barcode} exceeds MAX_SAFE_INTEGER, returning as string`,
    );
    return numericString;
  }

  return parsed;
};

/**
 * Converts a hyphenated or underscored string to Title Case.
 *
 * @param str - String to convert
 * @returns Title cased string
 *
 * @example
 * ```typescript
 * handleToTitleCase('product-family-sku') // returns 'Product Family Sku'
 * handleToTitleCase('my_product_name')    // returns 'My Product Name'
 * ```
 */
export const handleToTitleCase = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
};

/**
 * Adds a prefix to a SKU if it doesn't already have it.
 *
 * @param sku - SKU to prefix
 * @param prefix - Prefix to add (default: 'TN-')
 * @returns Prefixed SKU
 *
 * @example
 * ```typescript
 * addPrefixToSKU('12345')        // returns 'TN-12345'
 * addPrefixToSKU('TN-12345')     // returns 'TN-12345' (no duplicate)
 * addPrefixToSKU('12345', 'US-') // returns 'US-12345'
 * ```
 */
export const addPrefixToSKU = (sku: string, prefix: string = 'TN-'): string => {
  if (!sku || typeof sku !== 'string') {
    return '';
  }

  // Don't add prefix if it already exists
  if (sku.startsWith(prefix)) {
    return sku;
  }

  return `${prefix}${sku}`;
};

/**
 * Validates that all required CSV columns are present.
 */
export const validateCSVColumns = (
  row: any,
  requiredColumns: string[],
  fileName: string = 'CSV',
): void => {
  const missing = requiredColumns.filter((col) => !(col in row));
  if (missing.length > 0) {
    throw new Error(
      `${fileName} is missing required columns: ${missing.join(', ')}`,
    );
  }
};

/**
 * Archives an existing output file before overwriting.
 */
export const archiveOutputFile = (fileName: string): void => {
  const filePath = path.join(OUTPUT_DIR, `${fileName}.csv`);
  if (fs.existsSync(filePath)) {
    const archiveDir = path.join(OUTPUT_DIR, 'archive');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(archiveDir, `${fileName}_${timestamp}.csv`);

    fs.copyFileSync(filePath, archivePath);
    console.log(`Archived existing file to: ${archivePath}`);
  }
};
