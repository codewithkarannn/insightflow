import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExportService {
  /**
   * Exports data rows to an RFC 4180-compliant CSV file and triggers an instant browser download.
   */
  exportToCsv(data: Record<string, unknown>[], customFilename?: string): void {
    if (!data || data.length === 0) {
      return;
    }

    const columns = Object.keys(data[0]);
    const headerRow = columns.map((col) => this.escapeCsvField(col)).join(',');

    const dataRows = data.map((row) =>
      columns.map((col) => this.escapeCsvField(row[col])).join(',')
    );

    const csvContent = [headerRow, ...dataRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = customFilename || `insightflow-results-${this.getTimestamp()}.csv`;

    this.triggerDownload(blob, filename);
  }

  /**
   * Exports data rows to formatted JSON file and triggers an instant browser download.
   */
  exportToJson(data: Record<string, unknown>[], customFilename?: string): void {
    if (!data) {
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const filename = customFilename || `insightflow-results-${this.getTimestamp()}.json`;

    this.triggerDownload(blob, filename);
  }

  private escapeCsvField(val: unknown): string {
    if (val === null || val === undefined) {
      return '';
    }

    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }
}
