/**
 * Converts a numeric amount to English words for formal Promissory Notes and Loan Agreements.
 * Example: 5000 -> "FIVE THOUSAND PESOS ONLY"
 * Example: 12500.50 -> "TWELVE THOUSAND FIVE HUNDRED PESOS AND 50/100 ONLY"
 */
export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'ZERO PESOS ONLY';

  const units = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

  function convertGroup(num: number): string {
    let group = '';
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundred > 0) {
      group += units[hundred] + ' HUNDRED ';
    }

    if (remainder > 0) {
      if (remainder < 20) {
        group += units[remainder] + ' ';
      } else {
        const ten = Math.floor(remainder / 10);
        const unit = remainder % 10;
        group += tens[ten] + (unit > 0 ? '-' + units[unit] : '') + ' ';
      }
    }

    return group.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'ZERO PESOS ONLY';
  }

  let words = '';
  let scaleIndex = 0;
  let remaining = integerPart;

  if (integerPart === 0) {
    words = 'ZERO';
  } else {
    while (remaining > 0) {
      const chunk = remaining % 1000;
      if (chunk > 0) {
        const chunkWords = convertGroup(chunk);
        words = chunkWords + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
      }
      remaining = Math.floor(remaining / 1000);
      scaleIndex++;
    }
  }

  let result = words.trim() + ' PESOS';

  if (decimalPart > 0) {
    result += ` AND ${decimalPart}/100`;
  }

  return result.toUpperCase() + ' ONLY';
}
