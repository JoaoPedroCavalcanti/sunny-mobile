type PaginatedListResponse<T> = {
  results?: T[];
};

export function normalizeListResponse<T>(
  data: T[] | PaginatedListResponse<T> | null | undefined
) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}
