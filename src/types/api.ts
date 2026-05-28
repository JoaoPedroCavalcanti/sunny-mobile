export type TokenPair = {
  access: string;
  refresh: string;
};

export type ApiError = {
  detail?: string;
  [key: string]: unknown;
};
