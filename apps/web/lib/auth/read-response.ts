export async function readAuthResponse(response: Response): Promise<unknown> {
  if (response.status === 404) {
    throw new Error("The web sign-in service was not found. Restart the web server with pnpm dev:web and open http://localhost:3000.");
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("The sign-in service returned an unexpected response. Restart the web server and try again.");
  }
  try {
    return await response.json();
  } catch {
    throw new Error("The sign-in service returned an invalid response. Please try again.");
  }
}
