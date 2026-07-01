import fs from 'fs';
import path from 'path';

type Config = {
  prefix: string;
  startNumber: number;
  endNumber: number;
  numberPadding: number;
  startLetter: string;
  endLetter: string;
};

const config: Config = {
  prefix: 'TN - Apparel - ',
  startNumber: 1,
  endNumber: 40,
  numberPadding: 3,
  startLetter: 'A',
  endLetter: 'G',
};

function generateBinNames({
  prefix,
  startNumber,
  endNumber,
  numberPadding,
  startLetter,
  endLetter,
}: Config) {
  const bins = [];

  const startCharCode = startLetter.charCodeAt(0);
  const endCharCode = endLetter.charCodeAt(0);

  for (let num = startNumber; num <= endNumber; num++) {
    const paddedNum = String(num).padStart(numberPadding, '0');

    for (let charCode = startCharCode; charCode <= endCharCode; charCode++) {
      const letter = String.fromCharCode(charCode);
      bins.push(`${prefix}${paddedNum} ${letter}`);
    }
  }

  return bins;
}

/** Writes an array of bin names to a CSV file with a single "Bin" column. */
function writeBinsCsv(bins: string[], outputPath: string) {
  const csvLines = ['Bin', ...bins];
  fs.writeFileSync(outputPath, csvLines.join('\n'));
}

function main() {
  const outputPath =
    process.argv[2] || path.join(__dirname, '../../output/apparel-bins.csv');

  const bins = generateBinNames(config);

  writeBinsCsv(bins, outputPath);
  console.error(`Generated ${bins.length} bin names.`);
  console.error(`Written to ${outputPath}`);
}

main();
