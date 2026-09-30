
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QueryExecutionStats {
  elapsedMilliseconds: number;
  rowCount: number;
  rowLimitApplied: number;
  timeoutSecondsApplied: number;
}

export interface ApiQueryRequest {
  prompt: string;
  connectionString?: string | null;
  restrictedColumns?: string[] | null;
  timeoutSeconds?: number | null;
  maxRowLimit?: number | null;
}

export interface ChartRecommendation {
  chartType: string;
  title: string;
  xAxisColumn: string;
  yAxisColumns: string[];
  reasoning?: string;
}

export interface ApiQueryResponse {
  isSuccess: boolean;
  sql?: string;
  data?: Record<string, unknown>[];
  jsonData?: string;
  chart?: ChartRecommendation;
  error?: string;
  stats?: QueryExecutionStats;
}

@Injectable({ providedIn: 'root' })
export class Nl2SqlService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:5182/api/query';

  executeQuery(
    prompt: string, 
    connectionString?: string | null, 
    timeoutSeconds?: number, 
    maxRowLimit?: number
  ): Observable<ApiQueryResponse> {
    const payload: ApiQueryRequest = {
      prompt,
      connectionString: connectionString || null,
      restrictedColumns: ['Customers.PasswordHash', 'Customers.CreditCardNumber'],
      timeoutSeconds: timeoutSeconds ?? 10,
      maxRowLimit: maxRowLimit ?? 100,
    };

    return this.http.post<ApiQueryResponse>(this.apiUrl, payload);
  }
}
