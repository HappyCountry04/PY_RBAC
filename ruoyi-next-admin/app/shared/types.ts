export type LoginResponse = {
  code: number;
  msg: string;
  token: string;
};

export type RouterItem = {
  name?: string;
  path: string;
  component?: string;
  hidden?: boolean;
  meta?: {
    title?: string;
    icon?: string;
  };
  children?: RouterItem[];
};

export type TableResponse = {
  code: number;
  msg: string;
  rows?: Record<string, unknown>[];
  data?: Record<string, unknown>[];
  total?: number;
};
