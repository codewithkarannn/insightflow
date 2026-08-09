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
          <h1 class="brand-title">INSIGHTFLOW </h1>
        </div>
        <div class="header-actions">

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
                <span>SYNTHESIZING SQL & GRAPH RECOMMENDATION...</span>
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

        <!-- View Mode Switcher Controls -->
        @if (store.rawResults().length > 0) {
          <div class="view-mode-bar">
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
            </div>
          </div>
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
        @if (store.viewMode() === 'combined' || store.viewMode() === 'table') {
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

  ngOnInit() {
    this.store.initTheme();
    this.store.executePrompt();
  }

  setPreset(promptText: string) {
    this.store.prompt.set(promptText);
    this.store.executePrompt();
  }
}
