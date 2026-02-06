const ENDPOINT_KEY = "yolodocs_endpoint";
const TOKEN_KEY = "yolodocs_token";

export function getEndpoint(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ENDPOINT_KEY) || "";
}

export function setEndpoint(value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENDPOINT_KEY, value);
}

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, value);
}
