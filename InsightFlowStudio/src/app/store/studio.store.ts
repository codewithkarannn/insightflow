
import { Injectable, signal, computed, inject } from '@angular/core';
import { ChartRecommendation, Nl2SqlService, QueryExecutionStats } from '../../services/nl2sql-service';

@Injectable({ providedIn: 'root' })
export class StudioStore {
  private readonly api = inject(Nl2SqlService);

  // Reactive State Signals
  readonly prompt = signal<string>('Show me all customers from Mumbai');
  readonly isExecuting = signal<boolean>(false);
  readonly generatedSql = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly rawResults = signal<Record<string, unknown>[]>([]);
  readonly chartRecommendation = signal<ChartRecommendation | null>(null);
  readonly filterText = signal<string>('');
  readonly viewMode = signal<'combined' | 'chart' | 'table' | 'advanced'>('combined');
  readonly theme = signal<'dark' | 'light'>('dark');

  // Query Timeout & Bounds Settings
  readonly timeoutSeconds = signal<number>(10);
  readonly maxRowLimit = signal<number>(100);
  readonly isSettingsOpen = signal<boolean>(false);
  readonly executionStats = signal<QueryExecutionStats | null>(null);
  readonly showSqlPreview = signal<boolean>(true);
  readonly showAdvancedView = signal<boolean>(false);

  initTheme() {
    const saved = localStorage.getItem('insightflow-theme') as 'dark' | 'light';
    const initial = saved || 'dark';
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
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  saveSettings(timeout: number, limit: number) {
    const validTimeout = Math.max(1, Math.min(120, Math.floor(timeout || 10)));
    const validLimit = Math.max(1, Math.min(1000, Math.floor(limit || 100)));
    this.timeoutSeconds.set(validTimeout);
    this.maxRowLimit.set(validLimit);
    localStorage.setItem(
      'insightflow-settings',
      JSON.stringify({ timeoutSeconds: validTimeout, maxRowLimit: validLimit })
    );
    this.isSettingsOpen.set(false);
  }

  resetSettings() {
    this.saveSettings(10, 100);
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
    return Object.keys(rows[0]);
  });

  executePrompt() {
    if (!this.prompt().trim()) return;

    this.isExecuting.set(true);
    this.errorMessage.set(null);

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
