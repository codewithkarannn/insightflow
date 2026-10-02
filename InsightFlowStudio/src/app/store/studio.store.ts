
import { Injectable, signal, computed, inject } from '@angular/core';
import { ChartRecommendation, Nl2SqlService, QueryExecutionStats } from '../../services/nl2sql-service';

@Injectable({ providedIn: 'root' })
export class StudioStore {
  private readonly api = inject(Nl2SqlService);

  // Reactive State Signals
  readonly prompt = signal<string>('Show me all customers from Mumbai');
  readonly isExecuting = signal<boolean>(false);
  readonly generatedSql = signal<string>('');
  readonly explanation = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly rawResults = signal<Record<string, unknown>[]>([]);
  readonly chartRecommendation = signal<ChartRecommendation | null>(null);
  readonly filterText = signal<string>('');
  readonly viewMode = signal<'combined' | 'chart' | 'table' | 'advanced'>('table');
  readonly theme = signal<'dark' | 'light'>('light');

  // Query Timeout & Bounds Settings
  readonly timeoutSeconds = signal<number>(10);
  readonly maxRowLimit = signal<number>(100);
  readonly entityDisplayMode = signal<'both' | 'name_only' | 'raw'>('name_only');
  readonly formatNumbers = signal<boolean>(true);
  readonly isSettingsOpen = signal<boolean>(false);
  readonly executionStats = signal<QueryExecutionStats | null>(null);
  readonly showSqlPreview = signal<boolean>(true);
  readonly showAdvancedView = signal<boolean>(false);

  initTheme() {
    const saved = localStorage.getItem('insightflow-theme') as 'dark' | 'light';
    const initial = saved || 'light';
    this.theme.set(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem('insightflow-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  initSettings() {
    try {
      const saved = localStorage.getItem('insightflow-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.timeoutSeconds === 'number' && parsed.timeoutSeconds > 0) {
          this.timeoutSeconds.set(parsed.timeoutSeconds);
        }
        if (typeof parsed.maxRowLimit === 'number' && parsed.maxRowLimit > 0) {
          this.maxRowLimit.set(parsed.maxRowLimit);
        }
        if (parsed.entityDisplayMode === 'both' || parsed.entityDisplayMode === 'name_only' || parsed.entityDisplayMode === 'raw') {
          this.entityDisplayMode.set(parsed.entityDisplayMode);
        }
        if (typeof parsed.formatNumbers === 'boolean') {
          this.formatNumbers.set(parsed.formatNumbers);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  saveSettings(
    timeout: number,
    limit: number,
    entityMode: 'both' | 'name_only' | 'raw' = 'name_only',
    formatNumbers = true
  ) {
    const validTimeout = Math.max(1, Math.min(120, Math.floor(timeout || 10)));
    const validLimit = Math.max(1, Math.min(1000, Math.floor(limit || 100)));
    this.timeoutSeconds.set(validTimeout);
    this.maxRowLimit.set(validLimit);
    this.entityDisplayMode.set(entityMode);
    this.formatNumbers.set(formatNumbers);
    localStorage.setItem(
      'insightflow-settings',
      JSON.stringify({ 
        timeoutSeconds: validTimeout, 
        maxRowLimit: validLimit,
        entityDisplayMode: entityMode,
        formatNumbers: formatNumbers
      })
    );
    this.isSettingsOpen.set(false);
  }

  resetSettings() {
    this.saveSettings(10, 100, 'name_only', true);
  }

  openSettings() {
    this.isSettingsOpen.set(true);
  }

  closeSettings() {
    this.isSettingsOpen.set(false);
  }

  toggleSettings() {
    this.isSettingsOpen.update((v) => !v);
  }

  toggleSqlPreview() {
    this.showSqlPreview.update((v) => !v);
  }

  toggleAdvancedView() {
    this.showAdvancedView.update((v) => !v);
  }

  setAdvancedView(show: boolean) {
    this.showAdvancedView.set(show);
  }

  clearError() {
    this.errorMessage.set(null);
  }

  // Computed Derived State
  readonly filteredResults = computed(() => {
    const filter = this.filterText().toLowerCase().trim();
    const rows = this.rawResults();
    if (!filter) return rows;

    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(filter)),
    );
  });

  readonly resultCount = computed(() => this.filteredResults().length);

  readonly tableColumns = computed(() => {
    const rows = this.rawResults();
    if (rows.length === 0) return [];
    const allCols = Object.keys(rows[0]);
    const mode = this.entityDisplayMode();

    if (mode === 'raw') {
      return allCols;
    }

    const hasNameCol = allCols.some(isNameColumn);

    if (mode === 'name_only' && hasNameCol) {
      // If user chose 'name_only' and there is at least one descriptive name column,
      // hide the raw ID column(s) so only descriptive names are visible
      return allCols.filter((c) => !isIdColumn(c));
    }

    // Default 'both': Smart column ordering (IDs first, then Names, then other attributes, then numeric metrics)
    const isMetricCol = (c: string) =>
      /^(total.*|sum.*|amount|price|unitprice|quantity|stock.*|count.*)$/i.test(c);

    const idCols = allCols.filter(isIdColumn);
    const nameCols = allCols.filter((c) => isNameColumn(c) && !isIdColumn(c));
    const metricCols = allCols.filter((c) => isMetricCol(c) && !isIdColumn(c) && !isNameColumn(c));
    const otherCols = allCols.filter(
      (c) => !isIdColumn(c) && !isNameColumn(c) && !isMetricCol(c)
    );

    return [...idCols, ...nameCols, ...otherCols, ...metricCols];
  });

  executePrompt() {
    if (!this.prompt().trim()) return;

    this.isExecuting.set(true);
    this.errorMessage.set(null);
    this.explanation.set(null);

    this.api
      .executeQuery(
        this.prompt(),
        null,
        this.timeoutSeconds(),
        this.maxRowLimit()
      )
      .subscribe({
        next: (res) => {
          this.isExecuting.set(false);
          this.executionStats.set(res.stats ?? null);
          this.explanation.set(res.explanation ?? null);
          if (res.isSuccess) {
            this.generatedSql.set(res.sql ?? '');
            this.rawResults.set(res.data ?? []);
            this.chartRecommendation.set(res.chart ?? null);
          } else {
            this.errorMessage.set(res.error ?? 'Query evaluation failed');
            this.rawResults.set([]);
            this.chartRecommendation.set(null);
            if (res.sql) {
              this.generatedSql.set(res.sql);
            }
          }
        },
        error: (err) => {
          this.isExecuting.set(false);
          const backendErr = err.error?.error || err.message || 'Server connection failed';
          this.errorMessage.set(backendErr);
          this.explanation.set(err.error?.explanation ?? null);
          this.chartRecommendation.set(null);
          if (err.error?.sql) {
            this.generatedSql.set(err.error.sql);
          }
          if (err.error?.stats) {
            this.executionStats.set(err.error.stats);
          } else {
            this.executionStats.set(null);
          }
        },
      });
  }
}

export function isIdColumn(col: string): boolean {
  if (!col) return false;
  const lower = col.toLowerCase();
  return lower === 'id' || lower.endsWith('id') || lower.endsWith('_id') || lower.startsWith('id_');
}

export function isNameColumn(col: string): boolean {
  if (!col) return false;
  const lower = col.toLowerCase();
  return lower.includes('name') || lower === 'title' || lower === 'label';
}

export function formatColumnHeader(col: string): string {
  if (!col) return '';
  // Convert camelCase or PascalCase to separate words (e.g. CategoryName -> Category Name, FullName -> Full Name)
  let formatted = col.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Convert snake_case or kebab-case to spaces (e.g. order_date -> order date)
  formatted = formatted.replace(/[_-]+/g, ' ');
  // Capitalize each word
  return formatted.replace(/\b\w/g, (char) => char.toUpperCase()).trim();
}

/**
 * Formats a number, stringified number, or bigint with comma grouping on the integer digits,
 * preserving exact decimals and negative signs (e.g. 1234567.89 -> "1,234,567.89").
 */
export function formatNumberWithCommas(val: number | string | bigint | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const s = String(val).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const [intPart, decPart] = s.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  }
  return s;
}

/**
 * Identifies column names that represent dates, times, years, postal codes, or phone numbers,
 * where comma grouping on digits is inappropriate.
 */
export function isNonNumericIdentifier(col?: string): boolean {
  if (!col) return false;
  const lower = col.toLowerCase();
  return (
    lower === 'year' ||
    lower.endsWith('year') ||
    lower.startsWith('year') ||
    lower.includes('date') ||
    lower.includes('time') ||
    lower.includes('phone') ||
    lower.includes('mobile') ||
    lower.includes('zip') ||
    lower.includes('postal') ||
    lower.includes('pin') ||
    lower.includes('pincode') ||
    lower.includes('ssn') ||
    lower.includes('isbn')
  );
}

/**
 * Determines whether a cell value is numeric and suitable for tabular number rendering.
 */
export function isNumberCell(val: unknown, col?: string): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (isNonNumericIdentifier(col)) return false;
  if (typeof val === 'number') return !Number.isNaN(val);
  if (typeof val === 'bigint') return true;
  if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim())) return true;
  return false;
}

/**
 * Formats table cell content. Formats numeric digits with commas when enabled,
 * leaves identifiers/dates intact, and renders null/undefined as em-dash.
 */
export function formatCellValue(val: unknown, col?: string, applyCommas = true): string {
  if (val === null || val === undefined || val === '') {
    return '—';
  }

  if (typeof val === 'boolean') {
    return String(val);
  }

  // If digits grouping disabled or column represents year/date/phone/zip
  if (!applyCommas || isNonNumericIdentifier(col)) {
    return String(val);
  }

  if (typeof val === 'number' || typeof val === 'bigint') {
    if (typeof val === 'number' && Number.isNaN(val)) return '—';
    return formatNumberWithCommas(val);
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return formatNumberWithCommas(trimmed);
    }
    return val;
  }

  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  return String(val);
}


