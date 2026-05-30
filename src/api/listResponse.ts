type PaginatedListResponse<T> = {
  results?: T[];
};

export function normalizeListResponse<T>(
  data: T[] | PaginatedListResponse<T> | null | undefined
): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray((data as PaginatedListResponse<T>).results)) {
    return (data as PaginatedListResponse<T>).results as T[];
  }

  return [];
}
