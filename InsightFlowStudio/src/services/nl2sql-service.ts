
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiQueryRequest {
  prompt: string;
  connectionString?: string | null;
  restrictedColumns?: string[] | null;
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
}

@Injectable({ providedIn: 'root' })
export class Nl2SqlService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/query';

  executeQuery(prompt: string, connectionString?: string): Observable<ApiQueryResponse> {
    const payload: ApiQueryRequest = {
      prompt,
      connectionString: connectionString || null,
      restrictedColumns: ['Customers.PasswordHash', 'Customers.CreditCardNumber'],
    };

    return this.http.post<ApiQueryResponse>(this.apiUrl, payload);
  }
}
