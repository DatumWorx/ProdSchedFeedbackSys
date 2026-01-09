import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import db from '../lib/db';

const QC_FORMS_PATH = '/Users/zax/Library/CloudStorage/OneDrive-SpecialDesignProducts,Inc/QC FORMS';

interface QCEntry {
  date: string;
  department: string;
  operator: string | null;
  part_name: string;
  start_time: string | null;
  process_time_minutes: number | null;
  finish_time: string | null;
  total_time_minutes: number | null;
  material: string | null;
  total_parts: number | null;
  yield: number | null;
  material_size: string | null;
  qc_rejected_parts: number | null;
  actual_ppm: number | null;
  ideal_ppm: number | null;
  productive_time_percent: number | null;
}

function parseDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    // Try to parse various date formats
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  if (typeof value === 'number') {
    // Excel date serial number (days since 1900-01-01)
    try {
      const excelEpoch = new Date(1899, 11, 30); // Excel epoch
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
  return null;
}

function parseTime(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toTimeString().split(' ')[0];
  }
  if (typeof value === 'string') {
    // Try to parse time string
    const timeMatch = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i);
    if (timeMatch) {
      return value; // Return as-is if it looks like a time
    }
    // Try parsing as date-time
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toTimeString().split(' ')[0];
    }
    return value;
  }
  if (typeof value === 'number') {
    // Excel time serial number (fraction of day)
    try {
      const hours = Math.floor(value * 24);
      const minutes = Math.floor((value * 24 - hours) * 60);
      const seconds = Math.floor(((value * 24 - hours) * 60 - minutes) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      return null;
    }
  }
  return null;
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importQCSheet(filePath: string): Promise<number> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const qcSheet = workbook.getWorksheet('QC Sheet');
  if (!qcSheet) {
    console.log(`No QC Sheet found in ${filePath}`);
    return 0;
  }

  // Find header row (row 5 based on template structure)
  let headerRow = 5;
  const headers: Record<string, number> = {};

  // Map column headers
  qcSheet.getRow(headerRow).eachCell((cell, colNumber) => {
    const header = cell.value?.toString().trim().toUpperCase();
    if (header) {
      headers[header] = colNumber;
    }
  });

  const entries: QCEntry[] = [];
  let rowNum = headerRow + 1;

  // Read data rows
  while (rowNum <= qcSheet.rowCount) {
    const row = qcSheet.getRow(rowNum);
    const date = parseDate(row.getCell(headers['DATE (MM/DD/YYYY) CTRL + ;'] || headers['DATE'] || 1)?.value);
    const department = row.getCell(headers['DEPARTMENT'] || 2)?.value?.toString().trim();
    const partName = row.getCell(headers['PART NAME'] || headers['ENTER PART NAMES'] || 3)?.value?.toString().trim();

    // Skip empty rows
    if (!date || !department || !partName) {
      rowNum++;
      continue;
    }

    const entry: QCEntry = {
      date: date,
      department: department,
      operator: row.getCell(headers['OPERATOR'] || 3)?.value?.toString().trim() || null,
      part_name: partName,
      start_time: parseTime(row.getCell(headers['START'] || 4)?.value),
      process_time_minutes: parseNumber(row.getCell(headers['PROCESS TIME (MINUTES)'] || headers['PROCESS TIME'] || 5)?.value),
      finish_time: parseTime(row.getCell(headers['FINISH'] || 6)?.value),
      total_time_minutes: parseNumber(row.getCell(headers['TOTAL TIME (MINUTES)'] || headers['TOTAL TIME'] || 7)?.value),
      material: row.getCell(headers['MATERIAL'] || 8)?.value?.toString().trim() || null,
      total_parts: parseNumber(row.getCell(headers['TOTAL PARTS'] || 9)?.value),
      yield: parseNumber(row.getCell(headers['YIELD'] || 10)?.value),
      material_size: row.getCell(headers['MATERIAL SIZE'] || 11)?.value?.toString().trim() || null,
      qc_rejected_parts: parseNumber(row.getCell(headers['QC REJECTED PARTS'] || 12)?.value),
      actual_ppm: parseNumber(row.getCell(headers['ACTUAL PPM'] || 13)?.value),
      ideal_ppm: parseNumber(row.getCell(headers['IDEAL PPM'] || 14)?.value),
      productive_time_percent: parseNumber(row.getCell(headers['% OF PRODUCTIVE TIME'] || headers['% PRODUCTIVE TIME'] || 15)?.value),
    };

    entries.push(entry);
    rowNum++;
  }

  // Insert into database
  const stmt = db.prepare(`
    INSERT INTO qc_entries (
      date, department, operator, part_name, start_time, process_time_minutes,
      finish_time, total_time_minutes, material, total_parts, yield, material_size,
      qc_rejected_parts, actual_ppm, ideal_ppm, productive_time_percent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((entries: QCEntry[]) => {
    for (const entry of entries) {
      stmt.run(
        entry.date,
        entry.department,
        entry.operator,
        entry.part_name,
        entry.start_time,
        entry.process_time_minutes,
        entry.finish_time,
        entry.total_time_minutes,
        entry.material,
        entry.total_parts,
        entry.yield,
        entry.material_size,
        entry.qc_rejected_parts,
        entry.actual_ppm,
        entry.ideal_ppm,
        entry.productive_time_percent,
      );
    }
  });

  insertMany(entries);
  return entries.length;
}

async function importOperatorsFromTemplate() {
  const templatePath = path.join(process.cwd(), '..', '_TMEPLATE.xlsx');
  
  if (!fs.existsSync(templatePath)) {
    console.log('Template file not found, skipping operator import');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const varsSheet = workbook.getWorksheet('Variables');
  if (!varsSheet) {
    console.log('Variables sheet not found');
    return;
  }

  const stmt = db.prepare('INSERT OR IGNORE INTO operators (name, department) VALUES (?, ?)');

  // Read operators from Variables sheet (starting from row 1, column 3)
  for (let rowNum = 1; rowNum <= varsSheet.rowCount; rowNum++) {
    const row = varsSheet.getRow(rowNum);
    const operator = row.getCell(3)?.value?.toString().trim();
    const department = row.getCell(2)?.value?.toString().trim();

    if (operator && operator !== 'Operators') {
      stmt.run(operator, department || null);
    }
  }
}

async function main() {
  console.log('Starting QC sheet import...');

  // Import operators from template
  await importOperatorsFromTemplate();
  console.log('Operators imported from template');

  // Import all QC sheets
  if (!fs.existsSync(QC_FORMS_PATH)) {
    console.error(`QC Forms path not found: ${QC_FORMS_PATH}`);
    process.exit(1);
  }

  const files = fs.readdirSync(QC_FORMS_PATH);
  const xlsxFiles = files.filter(f => f.endsWith('.xlsx') && !f.startsWith('~$') && !f.startsWith('_'));

  console.log(`Found ${xlsxFiles.length} QC sheet files`);

  let totalImported = 0;
  for (const file of xlsxFiles) {
    const filePath = path.join(QC_FORMS_PATH, file);
    try {
      const count = await importQCSheet(filePath);
      totalImported += count;
      console.log(`Imported ${count} entries from ${file}`);
    } catch (error) {
      console.error(`Error importing ${file}:`, error);
    }
  }

  console.log(`\nImport complete! Total entries imported: ${totalImported}`);
}

if (require.main === module) {
  main().catch(console.error);
}

