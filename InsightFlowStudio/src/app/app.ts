import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StudioStore,
  isIdColumn,
  isNameColumn,
  formatColumnHeader,
  formatNumberWithCommas,
  formatCellValue,
  isNumberCell,
} from './store/studio.store';
import { ChartViewerComponent } from './components/chart-viewer/chart-viewer.component';
import { ExportService } from '../services/export.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartViewerComponent],
  template: `
    <div class="app-layout">
      <!-- Executive Navbar -->
      <header class="navbar">
        <div class="brand">

          <div class="brand-info">
            <h1 class="brand-title">InsightFlow</h1>

          </div>
        </div>

        <div class="header-actions">
          <!-- Settings Trigger -->
          <button
            class="header-btn"
            (click)="openSettingsModal()"
            title="Configure Execution Timeout, Bounds & Entity Display"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="btn-text">Settings</span>
          </button>

          <!-- Theme Toggle -->
          <button
            class="header-btn"
            (click)="store.toggleTheme()"
            [title]="'Switch to ' + (store.theme() === 'dark' ? 'Light' : 'Dark') + ' Mode'"
          >
            @if (store.theme() === 'dark') {
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/>
                <path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/>
                <path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/>
                <path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/>
                <path d="m19.07 4.93-1.41 1.41"/>
              </svg>
              <span class="btn-text">Light</span>
            } @else {
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
              <span class="btn-text">Dark</span>
            }
          </button>
        </div>
      </header>

      <main class="grid-container">
        <!-- Natural Language Query Section -->
        <section class="card prompt-card">
          <div class="card-header">
            <div class="card-title-group">
              <h2>Ask Your Business Data</h2>
              <p class="card-subtitle">Analyze revenue, customers, and inventory using conversational questions.</p>
            </div>
          </div>

          <div class="input-group">
            <textarea
              [ngModel]="store.prompt()"
              (ngModelChange)="store.prompt.set($event)"
              placeholder="e.g., Show total sales by category, or find top 5 customers by spending..."
              rows="3"
            >
            </textarea>

            <button
              class="btn-run"
              [disabled]="store.isExecuting()"
              (click)="store.executePrompt()"
            >
              @if (store.isExecuting()) {
                <svg class="icon-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Analyzing Data...</span>
              } @else {
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  <path d="M5 3v4"/>
                  <path d="M19 17v4"/>
                  <path d="M3 5h4"/>
                  <path d="M17 19h4"/>
                </svg>
                <span>Run Analysis</span>
              }
            </button>
          </div>

          <!-- Quick Presets -->
          <div class="presets">
            <span class="presets-label">Popular Questions:</span>
            <div class="presets-scroll">
              <button class="preset-chip" (click)="setPreset('Show all customers from Mumbai')">
                Mumbai Customers
              </button>
              <button class="preset-chip" (click)="setPreset('Show total sales by category')">
                Sales by Category
              </button>
              <button class="preset-chip" (click)="setPreset('Show all orders with amount greater than 10000')">
                High-Value Orders (> 10k)
              </button>
              <button class="preset-chip" (click)="setPreset('Show recent orders with customer name')">
                Recent Orders
              </button>
            </div>
          </div>
        </section>

        <!-- Executive Loading State on Each Query Hit -->
        @if (store.isExecuting()) {
          <section class="card loading-card" role="status" aria-live="polite">
            <div class="loading-header">
              <div class="loading-pulse-ring">
                <svg class="loading-spinner-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
              <div class="loading-text-group">
                <h3 class="loading-title">Generating Business Intelligence</h3>
                <p class="loading-subtitle">Synthesizing SQL query, verifying data governance bounds, and querying records...</p>
              </div>
            </div>

            <!-- Shimmering Skeleton Plain-Language Explanation -->
            <div class="skeleton-explanation">
              <div class="skeleton-bar" style="width: 25%; height: 12px; margin-bottom: 8px;"></div>
              <div class="skeleton-bar" style="width: 92%; height: 14px; margin-bottom: 6px;"></div>
              <div class="skeleton-bar" style="width: 60%; height: 14px;"></div>
            </div>

            <!-- Shimmering Skeleton Table -->
            <div class="skeleton-table-wrapper">
              <div class="skeleton-table-header">
                <div class="skeleton-bar" style="width: 8%;"></div>
                <div class="skeleton-bar" style="width: 26%;"></div>
                <div class="skeleton-bar" style="width: 24%;"></div>
                <div class="skeleton-bar" style="width: 22%;"></div>
                <div class="skeleton-bar" style="width: 20%;"></div>
              </div>
              @for (item of [1, 2, 3, 4]; track item) {
                <div class="skeleton-table-row">
                  <div class="skeleton-bar" style="width: 8%;"></div>
                  <div class="skeleton-bar" style="width: 28%;"></div>
                  <div class="skeleton-bar" style="width: 22%;"></div>
                  <div class="skeleton-bar" style="width: 24%;"></div>
                  <div class="skeleton-bar" style="width: 18%;"></div>
                </div>
              }
            </div>
          </section>
        }

        <!-- View Mode Switcher -->
        @if (!store.isExecuting() && (store.rawResults().length > 0 || store.generatedSql() || store.executionStats())) {
          <div class="view-mode-bar">
            <div class="view-mode-group">
              <span class="view-mode-label">View:</span>
              <div class="view-mode-buttons">
                <button
                  [class.active]="store.viewMode() === 'combined'"
                  (click)="store.viewMode.set('combined')"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M3 11h18"/>
                    <line x1="8" x2="8" y1="16" y2="19"/>
                    <line x1="12" x2="12" y1="13" y2="19"/>
                    <line x1="16" x2="16" y1="15" y2="19"/>
                  </svg>
                  <span>Combined</span>
                </button>
                <button
                  [class.active]="store.viewMode() === 'chart'"
                  (click)="store.viewMode.set('chart')"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" x2="18" y1="20" y2="10"/>
                    <line x1="12" x2="12" y1="20" y2="4"/>
                    <line x1="6" x2="6" y1="20" y2="14"/>
                  </svg>
                  <span>Chart</span>
                </button>
                <button
                  [class.active]="store.viewMode() === 'table'"
                  (click)="store.viewMode.set('table')"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M3 15h18"/>
                    <path d="M9 3v18"/>
                  </svg>
                  <span>Table</span>
                </button>
                <button
                  class="btn-advanced-mode"
                  [class.active]="store.viewMode() === 'advanced'"
                  (click)="store.viewMode.set('advanced')"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span>Governance & SQL</span>
                </button>
              </div>
            </div>

            <!-- Quick Toggle for Advanced View when in other modes -->
            @if (store.viewMode() !== 'advanced') {
              <button
                class="btn-toggle-advanced-pill"
                [class.active]="store.showAdvancedView()"
                (click)="store.toggleAdvancedView()"
                title="Toggle Governance & Execution Details"
              >
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span>{{ store.showAdvancedView() ? 'Hide Details' : 'View Performance' }}</span>
                @if (store.executionStats()) {
                  <span class="pill-ms">{{ store.executionStats()!.elapsedMilliseconds }}ms</span>
                }
              </button>
            }
          </div>
        }

        <!-- Plain-Language Explanation (Executive Non-Technical Brief) -->
        @if (!store.isExecuting() && store.explanation()) {
          <section class="card card-explanation">
            <div class="explanation-inner">
              <div class="explanation-icon-wrapper">
                <svg class="icon-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <div class="explanation-content">
                <div class="explanation-meta-row">
                  <h3 class="explanation-heading">Plain-Language Explanation</h3>
                  <span class="badge-explanation">Executive Brief</span>
                </div>
                <p class="explanation-paragraph">{{ store.explanation() }}</p>
              </div>
            </div>
          </section>
        }

        <!-- GOVERNANCE & EXECUTION PERFORMANCE -->
        @if (!store.isExecuting() && (store.viewMode() === 'advanced' || store.showAdvancedView()) && (store.rawResults().length > 0 || store.generatedSql() || store.executionStats())) {
          <section class="card execution-overview-card advanced-view-card">
            <div class="exec-overview-header">
              <div class="exec-title-row">
                <span class="exec-title">Data Governance & Performance Metrics</span>
                <span class="exec-badge" [class.success]="!store.errorMessage()" [class.failure]="!!store.errorMessage()">
                  {{ store.errorMessage() ? 'Query Aborted' : 'Executed Successfully' }}
                </span>
              </div>
              <div class="exec-actions-row">
                <button
                  class="btn-export-compact"
                  [disabled]="store.resultCount() === 0"
                  (click)="exportCsv()"
                  title="Export results as CSV"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" x2="12" y1="15" y2="3"/>
                  </svg>
                  <span>CSV</span>
                </button>
                <button
                  class="btn-export-compact"
                  [disabled]="store.resultCount() === 0"
                  (click)="exportJson()"
                  title="Export results as JSON"
                >
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" x2="12" y1="15" y2="3"/>
                  </svg>
                  <span>JSON</span>
                </button>
                <button class="btn-edit-bounds" (click)="openSettingsModal()">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>Edit Bounds</span>
                </button>
              </div>
            </div>

            <div class="exec-metrics-grid">
              <div class="metric-item">
                <span class="metric-label">
                  <svg class="icon-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Response Time
                </span>
                <span class="metric-value highlight">
                  {{ store.executionStats() ? formatNumberWithCommas(store.executionStats()!.elapsedMilliseconds) + ' ms' : '—' }}
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">
                  <svg class="icon-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M3 15h18"/>
                  </svg>
                  Rows Retrieved
                </span>
                <span class="metric-value">
                  {{ formatNumberWithCommas(store.resultCount()) }} / {{ formatNumberWithCommas(store.executionStats()?.rowLimitApplied ?? store.maxRowLimit()) }} max
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">
                  <svg class="icon-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Enforced Timeout
                </span>
                <span class="metric-value">
                  {{ store.executionStats()?.timeoutSecondsApplied ?? store.timeoutSeconds() }}s limit
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">
                  <svg class="icon-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 12 2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  Row Guardrail
                </span>
                <span class="metric-value accent">
                  Limit {{ formatNumberWithCommas(store.executionStats()?.rowLimitApplied ?? store.maxRowLimit()) }} Active
                </span>
              </div>
            </div>

            <!-- Enterprise Trust & Governance Badges -->
            <div class="telemetry-bar">
              <span class="telemetry-tag">
                <svg class="icon-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                AST Read-Only Protection: Active
              </span>
              <span class="telemetry-tag">
                <svg class="icon-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Privacy Masking: 2 Restricted Columns
              </span>
              <span class="telemetry-tag">
                <svg class="icon-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
                </svg>
                Engine: SQLite 3 Enterprise
              </span>
            </div>

            <!-- Inspect Generated SQL -->
            @if (store.generatedSql()) {
              <div class="sql-inspector">
                <div class="sql-inspector-header">
                  <span class="sql-label">Validated Enterprise SQL Query:</span>
                  <button class="btn-copy-sql" (click)="copySqlToClipboard()">
                    @if (copiedSql) {
                      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Copied</span>
                    } @else {
                      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                      </svg>
                      <span>Copy SQL</span>
                    }
                  </button>
                </div>
                <pre class="sql-code"><code>{{ store.generatedSql() }}</code></pre>
              </div>
            }
          </section>
        }

        <!-- Interactive Chart Visualization -->
        @if (!store.isExecuting() && store.rawResults().length > 0 && (store.viewMode() === 'combined' || store.viewMode() === 'chart')) {
          <section class="card card-chart-section">
            <app-chart-viewer
              [chartRecommendation]="store.chartRecommendation()"
              [data]="store.rawResults()"
              [theme]="store.theme()"
            >
            </app-chart-viewer>
          </section>
        }

        <!-- Data Results Table -->
        @if (!store.isExecuting() && (store.viewMode() === 'combined' || store.viewMode() === 'table' || store.viewMode() === 'advanced')) {
          <section class="card table-card">
            <div class="table-header">
              <div class="table-title-group">
                <h2>Query Results</h2>
                <span class="badge-count">{{ formatNumberWithCommas(store.resultCount()) }} records</span>
              </div>

              <div class="table-actions">
                <div class="filter-input-wrapper">
                  <svg class="icon-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input
                    type="text"
                    class="filter-input"
                    [ngModel]="store.filterText()"
                    (ngModelChange)="store.filterText.set($event)"
                    placeholder="Search records..."
                  />
                </div>

                <div class="export-btn-group">
                  <button
                    class="btn-export"
                    [disabled]="store.resultCount() === 0"
                    (click)="exportCsv()"
                    title="Export results as CSV"
                  >
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    <span>CSV</span>
                  </button>
                  <button
                    class="btn-export"
                    [disabled]="store.resultCount() === 0"
                    (click)="exportJson()"
                    title="Export results as JSON"
                  >
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="table-container">
              @if (store.filteredResults().length > 0) {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th class="th-srno">SR. NO.</th>
                      @for (col of store.tableColumns(); track col) {
                        <th>
                          @if (isIdColumn(col)) {
                            <span class="th-badge-id">#</span>
                          }
                          {{ formatColumnHeader(col) }}
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of store.filteredResults(); track $index) {
                      <tr>
                        <td class="td-srno">{{ formatNumberWithCommas($index + 1) }}</td>
                        @for (col of store.tableColumns(); track col) {
                          <td [class.td-number]="isNumberCell(row[col], col)">
                            @if (isIdColumn(col)) {
                              <span class="cell-id-badge"><span class="id-hash">#</span>{{ row[col] }}</span>
                            } @else if (isNameColumn(col)) {
                              <span class="cell-name-label">{{ row[col] }}</span>
                            } @else {
                              {{ formatCellValue(row[col], col, store.formatNumbers()) }}
                            }
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              } @else if (!store.isExecuting() && !store.errorMessage()) {
                <div class="empty-state">
                  <p>No queries executed yet or no matching rows returned.</p>
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
              <div class="modal-title-group">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <h3>System Settings & Bounds</h3>
              </div>
              <button class="modal-close-btn" (click)="store.closeSettings()" title="Close">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label for="timeoutInput">
                  <strong>Query Execution Timeout:</strong>
                  <span class="field-hint">Maximum seconds allowed before query is safely halted.</span>
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
                  <strong>Automatic Row Cap:</strong>
                  <span class="field-hint">Injected into queries without limits (e.g., LIMIT 100) to protect database memory.</span>
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

              <div class="form-group">
                <label for="entityModeSelect">
                  <strong>Entity Projection Standard:</strong>
                  <span class="field-hint">Control how record identifiers and descriptive names are rendered in the table.</span>
                </label>
                <div class="select-wrapper">
                  <select
                    id="entityModeSelect"
                    class="form-select"
                    [(ngModel)]="editEntityMode"
                  >
                    <option value="name_only">Human-Readable Names Only (Recommended for Business)</option>
                    <option value="both">Both ID & Name</option>
                    <option value="raw">Raw Database Output</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="formatNumbersSelect">
                  <strong>Number Formatting (Digits):</strong>
                  <span class="field-hint">Apply standard comma grouping on numbers and amounts (e.g. 1,234,567.89).</span>
                </label>
                <div class="select-wrapper">
                  <select
                    id="formatNumbersSelect"
                    class="form-select"
                    [(ngModel)]="editFormatNumbers"
                  >
                    <option [ngValue]="true">Comma Separated (e.g., 1,234,567.89) (Default)</option>
                    <option [ngValue]="false">Raw Unformatted Numbers (e.g., 1234567.89)</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="onResetSettings()">Reset Defaults</button>
              <button class="btn-primary" (click)="onSaveSettings()">Apply & Save</button>
            </div>
          </div>
        </div>
      }

      <!-- Floating Red Danger Toast Notification -->
      @if (store.errorMessage()) {
        <div class="toast-container" role="alert" aria-live="assertive">
          <div class="toast toast-danger">
            <div class="toast-danger-icon-wrapper">
              <svg class="toast-danger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="toast-body">
              <span class="toast-title">
                {{ isSecurityError(store.errorMessage()!) ? 'Security Guardrail Alert' : 'Execution Error' }}
              </span>
              <p class="toast-message">{{ store.errorMessage() }}</p>
            </div>
            <button class="toast-close" (click)="store.clearError()" title="Dismiss error alert">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly store = inject(StudioStore);
  protected readonly exportService = inject(ExportService);

  editTimeout = 10;
  editLimit = 100;
  editEntityMode: 'both' | 'name_only' | 'raw' = 'name_only';
  editFormatNumbers = true;
  copiedSql = false;

  readonly isIdColumn = isIdColumn;
  readonly isNameColumn = isNameColumn;
  readonly formatColumnHeader = formatColumnHeader;
  readonly formatNumberWithCommas = formatNumberWithCommas;
  readonly formatCellValue = formatCellValue;
  readonly isNumberCell = isNumberCell;

  isSecurityError(err: string): boolean {
    if (!err) return false;
    const lower = err.toLowerCase();
    return (
      lower.includes('security') ||
      lower.includes('prohibited') ||
      lower.includes('violation') ||
      lower.includes('destructive') ||
      lower.includes('restricted') ||
      lower.includes('blocked')
    );
  }

  exportCsv() {
    const data = this.store.filteredResults();
    if (data.length === 0) return;
    this.exportService.exportToCsv(data);
  }

  exportJson() {
    const data = this.store.filteredResults();
    if (data.length === 0) return;
    this.exportService.exportToJson(data);
  }

  ngOnInit() {
    this.store.initTheme();
    this.store.initSettings();
    this.editTimeout = this.store.timeoutSeconds();
    this.editLimit = this.store.maxRowLimit();
    this.editEntityMode = this.store.entityDisplayMode();
    this.editFormatNumbers = this.store.formatNumbers();
    this.store.executePrompt();
  }

  setPreset(promptText: string) {
    this.store.prompt.set(promptText);
    this.store.executePrompt();
  }

  openSettingsModal() {
    this.editTimeout = this.store.timeoutSeconds();
    this.editLimit = this.store.maxRowLimit();
    this.editEntityMode = this.store.entityDisplayMode();
    this.editFormatNumbers = this.store.formatNumbers();
    this.store.openSettings();
  }

  onSaveSettings() {
    this.store.saveSettings(
      this.editTimeout,
      this.editLimit,
      this.editEntityMode,
      this.editFormatNumbers
    );
  }

  onResetSettings() {
    this.editTimeout = 10;
    this.editLimit = 100;
    this.editEntityMode = 'name_only';
    this.editFormatNumbers = true;
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
