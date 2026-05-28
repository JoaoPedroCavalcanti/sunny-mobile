export function extractErrorMessage(error: unknown): string {
  const defaultMessage = 'Nao foi possivel concluir a operacao.';

  if (!error || typeof error !== 'object') return defaultMessage;

  const asAny = error as any;
  const detail = asAny?.response?.data?.detail;
  if (typeof detail === 'string') return detail;

  const data = asAny?.response?.data;
  if (typeof data === 'string') return data;

  if (data && typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    const value = data[firstKey];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
      return value[0];
    }
  }

  if (typeof asAny.message === 'string') return asAny.message;
  return defaultMessage;
}
