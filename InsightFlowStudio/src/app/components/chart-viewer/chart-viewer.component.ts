import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartTypeRegistry, registerables } from 'chart.js';
import { ChartRecommendation } from '../../../services/nl2sql-service';
import { formatNumberWithCommas } from '../../store/studio.store';

Chart.register(...registerables);

@Component({
  selector: 'app-chart-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chart-viewer-container">
      <div class="chart-viewer-header">
        <div class="chart-info">
          <h3 class="chart-title">{{ chartRecommendation?.title || 'Data Visualization' }}</h3>
          @if (chartRecommendation?.reasoning) {
            <p class="chart-reasoning">{{ chartRecommendation?.reasoning }}</p>
          }
        </div>

        <div class="chart-controls">
          <label class="control-label">Chart Type:</label>
          <select
            class="chart-type-select"
            [ngModel]="activeChartType"
            (ngModelChange)="onChartTypeChange($event)"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="doughnut">Doughnut Chart</option>
            <option value="polarArea">Polar Area</option>
            <option value="radar">Radar Chart</option>
          </select>
        </div>
      </div>

      <div class="chart-canvas-wrapper">
        <canvas #chartCanvas></canvas>
      </div>

      <div class="chart-footer-meta">
        <div class="meta-tag">
          <span class="meta-label">Category Axis:</span>
          <code class="meta-code">{{ xAxisCol }}</code>
        </div>
        <div class="meta-tag">
          <span class="meta-label">Value Metrics:</span>
          @for (col of yAxisCols; track col) {
            <code class="meta-code">{{ col }}</code>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chart-viewer-container {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      background: var(--surface-card, #121215);
      border: 1px solid var(--border-subtle, #27272a);
      border-radius: 10px;
      padding: 1.35rem;
    }

    .chart-viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .chart-title {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary, #fafafa);
    }

    .chart-reasoning {
      margin: 0;
      font-size: 0.825rem;
      color: var(--text-muted, #a1a1aa);
      line-height: 1.45;
    }

    .chart-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .control-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-dim, #71717a);
    }

    .chart-type-select {
      background: var(--bg-main, #09090b);
      border: 1px solid var(--border-subtle, #27272a);
      color: var(--text-primary, #fafafa);
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }

    .chart-type-select:focus {
      border-color: #38bdf8;
    }

    .chart-canvas-wrapper {
      position: relative;
      height: 320px;
      width: 100%;
    }

    @media (max-width: 600px) {
      .chart-canvas-wrapper {
        height: 250px;
      }
    }

    .chart-footer-meta {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      border-top: 1px solid var(--border-subtle, #27272a);
      padding-top: 0.85rem;
      flex-wrap: wrap;
    }

    .meta-tag {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .meta-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-dim, #71717a);
    }

    .meta-code {
      background: var(--bg-main, #09090b);
      border: 1px solid var(--border-subtle, #27272a);
      color: #38bdf8;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: var(--font-mono, 'IBM Plex Mono', monospace);
      font-size: 0.75rem;
    }
  `],
})
export class ChartViewerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() chartRecommendation: ChartRecommendation | null = null;
  @Input() data: Record<string, unknown>[] = [];
  @Input() theme: 'dark' | 'light' = 'dark';

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  activeChartType: keyof ChartTypeRegistry = 'bar';
  private chartInstance: Chart | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartRecommendation'] && this.chartRecommendation?.chartType) {
      const recType = this.chartRecommendation.chartType.toLowerCase();
      if (['bar', 'line', 'pie', 'doughnut', 'polararea', 'radar'].includes(recType)) {
        this.activeChartType = (recType === 'polararea' ? 'polarArea' : recType) as keyof ChartTypeRegistry;
      } else {
        this.activeChartType = 'bar';
      }
    }

    // Re-render chart if canvas is ready
    if (this.canvasRef) {
      this.renderChart();
    }
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  onChartTypeChange(newType: string): void {
    this.activeChartType = newType as keyof ChartTypeRegistry;
    this.renderChart();
  }

  get xAxisCol(): string {
    if (this.chartRecommendation?.xAxisColumn) {
      return this.chartRecommendation.xAxisColumn;
    }
    if (this.data.length > 0) {
      const keys = Object.keys(this.data[0]);
      return keys[0] ?? 'Index';
    }
    return 'Index';
  }

  get yAxisCols(): string[] {
    if (this.chartRecommendation?.yAxisColumns && this.chartRecommendation.yAxisColumns.length > 0) {
      return this.chartRecommendation.yAxisColumns;
    }
    if (this.data.length > 0) {
      const keys = Object.keys(this.data[0]);
      const numericKeys = keys.filter((k) => typeof this.data[0][k] === 'number');
      return numericKeys.length > 0 ? numericKeys : keys.slice(1, 2);
    }
    return [];
  }

  private renderChart(): void {
    this.destroyChart();

    if (!this.canvasRef || this.data.length === 0) return;

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.data.map((row) => String(row[this.xAxisCol] ?? ''));
    const isPieOrDoughnut = ['pie', 'doughnut', 'polarArea'].includes(this.activeChartType);

    const isDark = this.theme === 'dark';
    const textColor = isDark ? '#a1a1aa' : '#52525b';
    const gridColor = isDark ? '#27272a' : '#e4e4e7';

    const colorPalette = isDark
      ? [
          { bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6' },
          { bg: 'rgba(16, 185, 129, 0.7)', border: '#10b981' },
          { bg: 'rgba(245, 158, 11, 0.7)', border: '#f59e0b' },
          { bg: 'rgba(236, 72, 153, 0.7)', border: '#ec4899' },
          { bg: 'rgba(139, 92, 246, 0.7)', border: '#8b5cf6' },
          { bg: 'rgba(6, 182, 212, 0.7)', border: '#06b6d4' },
        ]
      : [
          { bg: 'rgba(37, 99, 235, 0.7)', border: '#2563eb' },
          { bg: 'rgba(5, 150, 105, 0.7)', border: '#059669' },
          { bg: 'rgba(217, 119, 6, 0.7)', border: '#d97706' },
          { bg: 'rgba(219, 39, 119, 0.7)', border: '#db2777' },
          { bg: 'rgba(124, 58, 237, 0.7)', border: '#7c3aed' },
          { bg: 'rgba(14, 116, 144, 0.7)', border: '#0e7490' },
        ];

    let datasets: any[];

    if (isPieOrDoughnut) {
      // Single numeric dataset mapped across discrete slice colors
      const targetCol = this.yAxisCols[0] || Object.keys(this.data[0])[1];
      const dataValues = this.data.map((row) => Number(row[targetCol]) || 0);

      datasets = [
        {
          label: targetCol,
          data: dataValues,
          backgroundColor: labels.map((_, i) => colorPalette[i % colorPalette.length].bg),
          borderColor: labels.map((_, i) => colorPalette[i % colorPalette.length].border),
          borderWidth: 1.5,
        },
      ];
    } else {
      // Multiple series per yAxisColumn
      datasets = this.yAxisCols.map((col, idx) => {
        const palette = colorPalette[idx % colorPalette.length];
        return {
          label: col,
          data: this.data.map((row) => Number(row[col]) || 0),
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 2,
          borderRadius: this.activeChartType === 'bar' ? 4 : 0,
          tension: 0.35,
          fill: this.activeChartType === 'radar',
        };
      });
    }

    this.chartInstance = new Chart(ctx, {
      type: this.activeChartType,
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              font: {
                family: 'IBM Plex Mono, monospace',
                size: 11,
              },
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#18181b' : '#ffffff',
            titleColor: isDark ? '#fafafa' : '#09090b',
            bodyColor: isDark ? '#a1a1aa' : '#27272a',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            borderWidth: 1,
            padding: 10,
            bodyFont: {
              family: 'Inter, sans-serif',
            },
            callbacks: {
              label: (context: any) => {
                const label = context.dataset?.label || '';
                const rawVal = context.parsed?.y !== undefined ? context.parsed.y : context.raw;
                const formatted = formatNumberWithCommas(rawVal);
                return label ? `${label}: ${formatted}` : formatted;
              },
            },
          },
        },
        scales: !isPieOrDoughnut && this.activeChartType !== 'radar'
          ? {
              x: {
                grid: {
                  color: gridColor,
                },
                ticks: {
                  color: textColor,
                  font: {
                    family: 'IBM Plex Mono, monospace',
                    size: 10,
                  },
                },
              },
              y: {
                grid: {
                  color: gridColor,
                },
                ticks: {
                  color: textColor,
                  font: {
                    family: 'IBM Plex Mono, monospace',
                    size: 10,
                  },
                  callback: (value: any) => {
                    return formatNumberWithCommas(value);
                  },
                },
              },
            }
          : undefined,
      },
    });
  }

  private destroyChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}
