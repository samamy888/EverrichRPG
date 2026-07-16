import { API_BASE_URL } from "../config";

export interface SystemStatus {
  name: string;
  environment: string;
  version: string;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE_URL}/system`, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return response.json() as Promise<SystemStatus>;
}
