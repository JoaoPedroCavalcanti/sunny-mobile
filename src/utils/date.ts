export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const d = parseDateInput(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const d = parseDateInput(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateInput(value: string): Date {
  if (DATE_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function toApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toApiDateTime(date: Date): string {
  return date.toISOString();
}

export function maskBrDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function maskBrTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

const BR_DATE_REGEX = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
const BR_TIME_REGEX = /^(\d{1,2})[-:](\d{2})$/;

export function brDateToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(BR_DATE_REGEX);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1900
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

export function isoDateToBr(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const [, yyyy, mm, dd] = match;
  return `${dd}-${mm}-${yyyy}`;
}

export function combineBrDateTime(
  brDate: string,
  brTime: string
): string | null {
  const iso = brDateToIso(brDate);
  if (!iso) return null;
  const [yyyy, mm, dd] = iso.split('-').map(Number);
  const timeMatch = (brTime || '00-00').trim().match(BR_TIME_REGEX);
  const hours = timeMatch ? Number(timeMatch[1]) : 0;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  const date = new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
