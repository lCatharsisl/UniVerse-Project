export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export const Result = {
  ok: <T = void>(data?: T): Result<T, never> => ({ success: true, data: data as T }),
  fail: <E>(error: E): Result<never, E> => ({ success: false, error }),
};
