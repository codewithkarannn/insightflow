// src/app/app.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStore } from './store/studio.store';
import { ChartViewerComponent } from './components/chart-viewer/chart-viewer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartViewerComponent],
  template: `
    <div class="app-layout">
      <!-- Minimal Header -->
      <header class="navbar">
        <div class="brand">
          <h1 class="brand-title">INSIGHTFLOW</h1>
        </div>
        <div class="header-actions">
          <!-- Settings Trigger -->
          <button
            class="settings-toggle-btn"
            (click)="openSettingsModal()"
            title="Configure Query Execution Timeout & Row Bounds"
          >
            <span>⚙ SETTINGS ({{ store.timeoutSeconds() }}s · {{ store.maxRowLimit() }} max)</span>
          </button>

          <!-- Theme Toggle -->
          <button
            class="theme-toggle-btn"
            (click)="store.toggleTheme()"
            [title]="'Switch to ' + (store.theme() === 'dark' ? 'Light' : 'Dark') + ' Mode'"
          >
            <span>THEME: {{ store.theme() === 'dark' ? 'DARK 🌙' : 'LIGHT ☀' }}</span>
          </button>
        </div>
      </header>

      <main class="grid-container">
        <!-- Prompt Input Section -->
        <section class="card prompt-card">
          <div class="card-header">
            <h2>NATURAL LANGUAGE QUERY</h2>
          </div>

          <div class="input-group">
            <textarea
              [ngModel]="store.prompt()"
              (ngModelChange)="store.prompt.set($event)"
              placeholder="Ask a question about your database..."
              rows="3"
            >
            </textarea>

            <button
              class="btn-run"
              [disabled]="store.isExecuting()"
              (click)="store.executePrompt()"
            >
              @if (store.isExecuting()) {
                <span>SYNTHESIZING SQL & EXECUTING...</span>
              } @else {
                <span>EXECUTE QUERY</span>
              }
            </button>
          </div>

          <!-- Quick Presets -->
          <div class="presets">
            <span class="presets-label">EXAMPLES:</span>
            <button (click)="setPreset('Show all customers from Mumbai')">Mumbai Customers</button>
            <button (click)="setPreset('Show all orders with amount greater than 10000')">
              High-Value Orders
            </button>
            <button (click)="setPreset('Show total sales by category')">
              Category Sales Chart
            </button>
            <button (click)="setPreset('Delete customer with Id 1')">
              Mutation Guardrail
            </button>
          </div>
        </section>

        <!-- View Mode Switcher & Advanced View Controls -->
        @if (store.rawResults().length > 0 || store.generatedSql() || store.executionStats()) {
          <div class="view-mode-bar">
            <div class="view-mode-group">
              <span class="view-mode-label">VIEW MODE:</span>
              <div class="view-mode-buttons">
                <button
                  [class.active]="store.viewMode() === 'combined'"
                  (click)="store.viewMode.set('combined')"
                >
                  COMBINED (CHART + TABLE)
                </button>
                <button
                  [class.active]="store.viewMode() === 'chart'"
                  (click)="store.viewMode.set('chart')"
                >
                  CHART ONLY
                </button>
                <button
                  [class.active]="store.viewMode() === 'table'"
                  (click)="store.viewMode.set('table')"
                >
                  TABLE ONLY
                </button>
                <button
                  class="btn-advanced-mode"
                  [class.active]="store.viewMode() === 'advanced'"
                  (click)="store.viewMode.set('advanced')"
                >
                  ⚡ ADVANCED VIEW
                </button>
              </div>
            </div>

            <!-- Quick Toggle for Advanced View when in other modes -->
            @if (store.viewMode() !== 'advanced') {
              <button
                class="btn-toggle-advanced-pill"
                [class.active]="store.showAdvancedView()"
                (click)="store.toggleAdvancedView()"
                title="Toggle Advanced Execution Metrics & Bounds view"
              >
                <span>⚡ {{ store.showAdvancedView() ? 'HIDE ADVANCED VIEW' : 'EXPAND ADVANCED VIEW' }}</span>
                @if (store.executionStats()) {
                  <span class="pill-ms">{{ store.executionStats()!.elapsedMilliseconds }}ms</span>
                }
              </button>
            }
          </div>
        }

        <!-- ADVANCED VIEW: EXECUTION METRICS & BOUNDS -->
        @if ((store.viewMode() === 'advanced' || store.showAdvancedView()) && (store.rawResults().length > 0 || store.generatedSql() || store.executionStats())) {
          <section class="card execution-overview-card advanced-view-card">
            <div class="exec-overview-header">
              <div class="exec-title-row">
                <span class="exec-title">⚡ ADVANCED VIEW: EXECUTION METRICS & BOUNDS</span>
                <span class="exec-badge" [class.success]="!store.errorMessage()" [class.failure]="!!store.errorMessage()">
                  {{ store.errorMessage() ? '● FAILED / ABORTED' : '● EXECUTED SUCCESSFULLY' }}
                </span>
              </div>
              <button class="btn-edit-bounds" (click)="openSettingsModal()">
                ⚙ Edit Bounds ({{ store.timeoutSeconds() }}s / {{ store.maxRowLimit() }} rows)
              </button>
            </div>

            <div class="exec-metrics-grid">
              <div class="metric-item">
                <span class="metric-label">EXECUTION TIME</span>
                <span class="metric-value highlight">
                  {{ store.executionStats() ? store.executionStats()!.elapsedMilliseconds + ' ms' : '—' }}
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">ROWS RETURNED</span>
                <span class="metric-value">
                  {{ store.resultCount() }} / {{ store.executionStats()?.rowLimitApplied ?? store.maxRowLimit() }} max
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">ENFORCED TIMEOUT</span>
                <span class="metric-value">
                  {{ store.executionStats()?.timeoutSecondsApplied ?? store.timeoutSeconds() }}s limit
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">LIMIT INJECTION</span>
                <span class="metric-value accent">
                  ACTIVE (LIMIT {{ store.executionStats()?.rowLimitApplied ?? store.maxRowLimit() }})
                </span>
              </div>
            </div>

            <!-- Guardrails & Database Telemetry -->
            <div class="telemetry-bar">
              <span class="telemetry-tag">🛡 AST Read-Only Guardrail: ACTIVE</span>
              <span class="telemetry-tag">🔒 Column Masking: 2 Restricted Cols</span>
              <span class="telemetry-tag">💾 DB Engine: SQLite 3 (app_store.db)</span>
            </div>

            <!-- Inspect Generated SQL with syntax preview and copy button -->
            @if (store.generatedSql()) {
              <div class="sql-inspector">
                <div class="sql-inspector-header">
                  <span class="sql-label">VALIDATED & BOUND-CHECKED SQL:</span>
                  <button class="btn-copy-sql" (click)="copySqlToClipboard()">
                    {{ copiedSql ? '✓ COPIED' : '📋 COPY SQL' }}
                  </button>
                </div>
                <pre class="sql-code"><code>{{ store.generatedSql() }}</code></pre>
              </div>
            }
          </section>
        }

        <!-- Interactive Chart.js Graph Viewer Section -->
        @if (store.rawResults().length > 0 && (store.viewMode() === 'combined' || store.viewMode() === 'chart')) {
          <section class="card-chart-section">
            <app-chart-viewer
              [chartRecommendation]="store.chartRecommendation()"
              [data]="store.rawResults()"
              [theme]="store.theme()"
            >
            </app-chart-viewer>
          </section>
        }

        <!-- Data Results Table Section -->
        @if (store.viewMode() === 'combined' || store.viewMode() === 'table' || store.viewMode() === 'advanced') {
          <section class="card table-card">
            <div class="table-header">
              <h2>QUERY RESULTS ({{ store.resultCount() }})</h2>

              <input
                type="text"
                class="filter-input"
                [ngModel]="store.filterText()"
                (ngModelChange)="store.filterText.set($event)"
                placeholder="Filter results..."
              />
            </div>

            <div class="table-container">
              @if (store.filteredResults().length > 0) {
                <table class="data-table">
                  <thead>
                    <tr>
                      @for (col of store.tableColumns(); track col) {
                        <th>{{ col }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of store.filteredResults(); track $index) {
                      <tr>
                        @for (col of store.tableColumns(); track col) {
                          <td>{{ row[col] }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              } @else if (!store.isExecuting() && !store.errorMessage()) {
                <div class="empty-state">
                  <p>No query executed yet or no rows returned.</p>
                </div>
              }
            </div>
          </section>
        }
      </main>

      <!-- Settings Modal Dialog -->
      @if (store.isSettingsOpen()) {
        <div class="modal-backdrop" (click)="store.closeSettings()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>⚙ QUERY TIMEOUT & BOUNDS SETTINGS</h3>
              <button class="modal-close-btn" (click)="store.closeSettings()" title="Close">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label for="timeoutInput">
                  <strong>Command Execution Timeout:</strong>
                  <span class="field-hint">Max seconds allowed before query execution is forcibly aborted.</span>
                </label>
                <div class="input-with-suffix">
                  <input
                    id="timeoutInput"
                    type="number"
                    min="1"
                    max="120"
                    [(ngModel)]="editTimeout"
                  />
                  <span class="suffix">seconds</span>
                </div>
              </div>

              <div class="form-group">
                <label for="limitInput">
                  <strong>Automatic Row Limit Bounds:</strong>
                  <span class="field-hint">Injected into queries without bounds (e.g. LIMIT 100) or caps queries exceeding it.</span>
                </label>
                <div class="input-with-suffix">
                  <input
                    id="limitInput"
                    type="number"
                    min="1"
                    max="1000"
                    [(ngModel)]="editLimit"
                  />
                  <span class="suffix">rows</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="onResetSettings()">Reset Defaults (10s · 100 rows)</button>
              <button class="btn-primary" (click)="onSaveSettings()">Apply & Save</button>
            </div>
          </div>
        </div>
      }

      <!-- Floating Toast Error Notification -->
      @if (store.errorMessage()) {
        <div class="toast-container" role="alert">
          <div class="toast toast-error">
            <div class="toast-body">
              <span class="toast-title">SYSTEM / SECURITY NOTICE</span>
              <p class="toast-message">{{ store.errorMessage() }}</p>
            </div>
            <button class="toast-close" (click)="store.clearError()" title="Dismiss notice">✕</button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly store = inject(StudioStore);

  editTimeout = 10;
  editLimit = 100;
  copiedSql = false;

  ngOnInit() {
    this.store.initTheme();
    this.store.initSettings();
    this.editTimeout = this.store.timeoutSeconds();
    this.editLimit = this.store.maxRowLimit();
    this.store.executePrompt();
  }

  setPreset(promptText: string) {
    this.store.prompt.set(promptText);
    this.store.executePrompt();
  }

  openSettingsModal() {
    this.editTimeout = this.store.timeoutSeconds();
    this.editLimit = this.store.maxRowLimit();
    this.store.openSettings();
  }

  onSaveSettings() {
    this.store.saveSettings(this.editTimeout, this.editLimit);
  }

  onResetSettings() {
    this.editTimeout = 10;
    this.editLimit = 100;
    this.store.resetSettings();
  }

  copySqlToClipboard() {
    const sql = this.store.generatedSql();
    if (!sql) return;
    navigator.clipboard.writeText(sql).then(() => {
      this.copiedSql = true;
      setTimeout(() => (this.copiedSql = false), 2000);
    });
  }
}
