/**
 * Shared Dataverse Web API client for server-side calls.
 * Uses server-side client credentials token.
 */

const DATAVERSE_RESOURCE = process.env.DATAVERSE_RESOURCE;
const DATAVERSE_BASE_URL =
  process.env.DATAVERSE_BASE_URL ||
  (DATAVERSE_RESOURCE ? DATAVERSE_RESOURCE.replace(/\/\.default\/?$/, "") : "");
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_LOGIN_BASE_URL =
  process.env.AZURE_LOGIN_BASE_URL || "https://login.microsoftonline.com";

let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

export async function getDataverseToken(): Promise<string | null> {
  if (cachedToken && cachedTokenExpiry > Date.now()) return cachedToken;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !DATAVERSE_RESOURCE) {
    return null;
  }
  const tokenUrl = `${AZURE_LOGIN_BASE_URL}/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: DATAVERSE_RESOURCE,
  });
  const resp = await fetch(tokenUrl, {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!resp.ok) return null;
  const body = await resp.json();
  cachedToken = body.access_token;
  const expiresIn = Number(body.expires_in) || 3600;
  cachedTokenExpiry = Date.now() + (expiresIn - 60) * 1000;
  return cachedToken;
}

const BASE_PATH = "/api/data/v9.2";

export async function dataverseFetch(
  method: string,
  path: string,
  body?: object,
): Promise<Response> {
  const base = DATAVERSE_BASE_URL || "";
  const fullPath = path.startsWith("http") ? path : path.startsWith("/") ? BASE_PATH + path : BASE_PATH + "/" + path;
  const url = base + fullPath;
  const token = await getDataverseToken();
  const headers: HeadersInit = {
    Accept: "application/json",
    "OData-Version": "4.0",
    "OData-MaxVersion": "4.0",
    "If-None-Match": "null",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, {
    method,
    headers,
    body: body && method !== "GET" ? JSON.stringify(body) : undefined,
  });
}

export function getDataverseBaseUrl(): string {
  return DATAVERSE_BASE_URL || "";
}
