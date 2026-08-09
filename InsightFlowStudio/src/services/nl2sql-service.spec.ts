import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Nl2SqlService } from './nl2sql-service';

describe('Nl2SqlService', () => {
  let service: Nl2SqlService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(Nl2SqlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
