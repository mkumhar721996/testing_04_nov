// Seam for the Entra sign-in story: it replaces this with the real access token.
// Until then there is no token, so the API client sends no Authorization header.
export function getAccessToken(): string | null {
  return null;
}
