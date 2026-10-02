import {
  formatNumberWithCommas,
  isNonNumericIdentifier,
  isNumberCell,
  formatCellValue,
  formatColumnHeader,
} from './studio.store';

describe('Number Formatting and Column Utilities', () => {
  describe('formatNumberWithCommas', () => {
    it('should format integers with thousand separators', () => {
      expect(formatNumberWithCommas(0)).toBe('0');
      expect(formatNumberWithCommas(99)).toBe('99');
      expect(formatNumberWithCommas(1000)).toBe('1,000');
      expect(formatNumberWithCommas(1234567)).toBe('1,234,567');
      expect(formatNumberWithCommas(1000000000)).toBe('1,000,000,000');
    });

    it('should format decimal numbers preserving exact precision', () => {
      expect(formatNumberWithCommas(1234.56)).toBe('1,234.56');
      expect(formatNumberWithCommas(1234567.89123)).toBe('1,234,567.89123');
      expect(formatNumberWithCommas(0.005)).toBe('0.005');
    });

    it('should handle negative numbers correctly', () => {
      expect(formatNumberWithCommas(-1000)).toBe('-1,000');
      expect(formatNumberWithCommas(-9876543.21)).toBe('-9,876,543.21');
    });

    it('should handle numeric strings and bigint', () => {
      expect(formatNumberWithCommas('45000')).toBe('45,000');
      expect(formatNumberWithCommas('1234567.80')).toBe('1,234,567.80');
      expect(formatNumberWithCommas(BigInt(1000000))).toBe('1,000,000');
    });

    it('should return empty string for null, undefined, or empty', () => {
      expect(formatNumberWithCommas(null)).toBe('');
      expect(formatNumberWithCommas(undefined)).toBe('');
      expect(formatNumberWithCommas('')).toBe('');
    });
  });

  describe('isNonNumericIdentifier', () => {
    it('should identify date, time, year, postal, and phone columns', () => {
      expect(isNonNumericIdentifier('Year')).toBe(true);
      expect(isNonNumericIdentifier('OrderYear')).toBe(true);
      expect(isNonNumericIdentifier('OrderDate')).toBe(true);
      expect(isNonNumericIdentifier('created_at_time')).toBe(true);
      expect(isNonNumericIdentifier('ZipCode')).toBe(true);
      expect(isNonNumericIdentifier('PostalCode')).toBe(true);
      expect(isNonNumericIdentifier('Phone')).toBe(true);
      expect(isNonNumericIdentifier('SSN')).toBe(true);
    });

    it('should return false for metric and financial columns', () => {
      expect(isNonNumericIdentifier('TotalAmount')).toBe(false);
      expect(isNonNumericIdentifier('Quantity')).toBe(false);
      expect(isNonNumericIdentifier('UnitPrice')).toBe(false);
      expect(isNonNumericIdentifier('Revenue')).toBe(false);
      expect(isNonNumericIdentifier('SalesCount')).toBe(false);
    });
  });

  describe('isNumberCell', () => {
    it('should return true for numbers and numeric strings', () => {
      expect(isNumberCell(100)).toBe(true);
      expect(isNumberCell(12345.67)).toBe(true);
      expect(isNumberCell('4500')).toBe(true);
      expect(isNumberCell('123.45')).toBe(true);
    });

    it('should return false for non-numeric text, null, and non-numeric identifiers', () => {
      expect(isNumberCell('Mumbai')).toBe(false);
      expect(isNumberCell(null)).toBe(false);
      expect(isNumberCell(undefined)).toBe(false);
      expect(isNumberCell(2024, 'Year')).toBe(false);
      expect(isNumberCell('90210', 'ZipCode')).toBe(false);
    });
  });

  describe('formatCellValue', () => {
    it('should format numbers with commas when applyCommas is true', () => {
      expect(formatCellValue(15000, 'TotalSales', true)).toBe('15,000');
      expect(formatCellValue(1250000.5, 'Revenue', true)).toBe('1,250,000.5');
    });

    it('should not add commas when applyCommas is false', () => {
      expect(formatCellValue(15000, 'TotalSales', false)).toBe('15000');
    });

    it('should not add commas to Year or ZipCode even if applyCommas is true', () => {
      expect(formatCellValue(2024, 'OrderYear', true)).toBe('2024');
      expect(formatCellValue(90210, 'ZipCode', true)).toBe('90210');
    });

    it('should return em-dash for null, undefined, or empty string', () => {
      expect(formatCellValue(null)).toBe('—');
      expect(formatCellValue(undefined)).toBe('—');
      expect(formatCellValue('')).toBe('—');
    });

    it('should preserve booleans and standard strings', () => {
      expect(formatCellValue(true)).toBe('true');
      expect(formatCellValue(false)).toBe('false');
      expect(formatCellValue('Customer Name')).toBe('Customer Name');
    });
  });

  describe('formatColumnHeader', () => {
    it('should convert PascalCase, camelCase, and snake_case to Title Case', () => {
      expect(formatColumnHeader('TotalAmount')).toBe('Total Amount');
      expect(formatColumnHeader('customerName')).toBe('Customer Name');
      expect(formatColumnHeader('unit_price')).toBe('Unit Price');
      expect(formatColumnHeader('order_item_quantity')).toBe('Order Item Quantity');
    });
  });
});
