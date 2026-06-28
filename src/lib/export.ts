'use client';

import ExcelJS from 'exceljs';

export interface ExportColumn<T> {
  header: string;
  key: keyof T | string;
  width?: number;
  render?: (item: T) => string;
}

export async function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Header row
  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0070F2' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Data rows
  for (const item of data) {
    const rowValues = columns.map((col) => {
      if (col.render) return col.render(item);
      const val = (item as Record<string, unknown>)[col.key as string];
      return val != null ? String(val) : '';
    });
    sheet.addRow(rowValues);
  }

  // Column widths
  columns.forEach((col, i) => {
    const colObj = sheet.getColumn(i + 1);
    colObj.width = col.width || 18;
    colObj.alignment = { vertical: 'middle' };
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: data.length + 1, column: columns.length },
  };

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Generate blob and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
