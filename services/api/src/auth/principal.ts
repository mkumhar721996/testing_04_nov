export interface Principal {
  id: string;
  roles: string[];
}

export interface TokenVerifier {
  verify(bearerToken: string): Promise<Principal | null>;
}

export const TOKEN_VERIFIER = 'TOKEN_VERIFIER';

export const LEAD_ROLE = 'Lead';
