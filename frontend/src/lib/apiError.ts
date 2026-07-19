import { AxiosError } from "axios";

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
