const KNOWN_ERROR_TRANSLATIONS: Record<string, string> = {
  'start_time must be earlier than end_time.':
    'O horario de inicio precisa ser menor que o horario de fim.',
  'The Barbecue already has a booking in this time window.':
    'A churrasqueira ja possui uma reserva nesse horario.',
  'The Hall already has a booking in this time window.':
    'O salao de festas ja possui uma reserva nesse horario.'
};

function translate(message: string): string {
  return KNOWN_ERROR_TRANSLATIONS[message] ?? message;
}

export function extractErrorMessage(error: unknown): string {
  const defaultMessage = 'Nao foi possivel concluir a operacao.';

  if (!error || typeof error !== 'object') return defaultMessage;

  const asAny = error as any;
  const detail = asAny?.response?.data?.detail;
  if (typeof detail === 'string') return translate(detail);

  const data = asAny?.response?.data;
  if (typeof data === 'string') return translate(data);

  if (data && typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    const value = data[firstKey];
    if (typeof value === 'string') return translate(value);
    if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
      return translate(value[0]);
    }
  }

  if (typeof asAny.message === 'string') return asAny.message;
  return defaultMessage;
}
