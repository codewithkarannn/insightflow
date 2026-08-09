
import { Injectable, signal, computed, inject } from '@angular/core';
import { ChartRecommendation, Nl2SqlService } from '../../services/nl2sql-service';


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
  readonly viewMode = signal<'combined' | 'chart' | 'table'>('combined');
  readonly theme = signal<'dark' | 'light'>('dark');

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

    this.api.executeQuery(this.prompt()).subscribe({
      next: (res) => {
        this.isExecuting.set(false);
        if (res.isSuccess) {
          this.generatedSql.set(res.sql ?? '');
          this.rawResults.set(res.data ?? []);
          this.chartRecommendation.set(res.chart ?? null);
        } else {
          this.errorMessage.set(res.error ?? 'Query evaluation failed');
          this.rawResults.set([]);
          this.chartRecommendation.set(null);
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
      },
    });
  }
}
