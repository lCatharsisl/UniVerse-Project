import { randomBytes } from 'crypto';
import {
  AuthorizationCodeRequest,
  AuthorizationUrlRequest,
  ConfidentialClientApplication,
} from '@azure/msal-node';
import env from '../../../config/env';
import { AppError } from '../../../shared/core/errors';
import { IdentityService } from './identity.service';
import {
  inferYasarRoleFromEmail,
  normalizeMicrosoftEmail,
  readMicrosoftAuthState,
  sanitizeReturnTo,
  sealMicrosoftAuthState,
  splitDisplayName,
} from './microsoftAuth.utils';

type MicrosoftTokenClaims = {
  oid?: string;
  tid?: string;
  nonce?: string;
  preferred_username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
};

const MICROSOFT_SCOPES = ['openid', 'profile', 'email'];

export class MicrosoftAuthService {
  private static msalClient: ConfidentialClientApplication | null = null;

  static isEnabled(): boolean {
    return Boolean(
      env.MICROSOFT_CLIENT_ID &&
      env.MICROSOFT_CLIENT_SECRET &&
      env.MICROSOFT_TENANT_ID
    );
  }

  static getProviderStatus() {
    return {
      microsoft: {
        enabled: this.isEnabled(),
      },
    };
  }

  static async getAuthorizationUrl(returnTo?: string): Promise<string> {
    const nonce = randomBytes(16).toString('hex');
    const state = sealMicrosoftAuthState(
      {
        nonce,
        returnTo: sanitizeReturnTo(returnTo),
        issuedAt: Date.now(),
      },
      env.SESSION_SECRET
    );

    const request: AuthorizationUrlRequest = {
      redirectUri: this.getRedirectUri(),
      scopes: MICROSOFT_SCOPES,
      state,
      nonce,
      prompt: 'select_account',
    };

    return this.getClient().getAuthCodeUrl(request);
  }

  static async handleCallback(
    query: Record<string, unknown>,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const error = typeof query.error === 'string' ? query.error : '';
    const errorDescription = typeof query.error_description === 'string' ? query.error_description : '';

    if (error) {
      return this.buildErrorRedirect(errorDescription || error);
    }

    const code = typeof query.code === 'string' ? query.code : '';
    const state = typeof query.state === 'string' ? query.state : '';

    if (!code || !state) {
      return this.buildErrorRedirect('Missing Microsoft authorization response');
    }

    try {
      const authState = readMicrosoftAuthState(state, env.SESSION_SECRET);
      const tokenRequest: AuthorizationCodeRequest = {
        code,
        redirectUri: this.getRedirectUri(),
        scopes: MICROSOFT_SCOPES,
      };

      const result = await this.getClient().acquireTokenByCode(tokenRequest);
      const claims = (result?.idTokenClaims || {}) as MicrosoftTokenClaims;

      if (!claims.oid || !claims.tid) {
        throw AppError.unauthorized('Microsoft identity claims are incomplete');
      }

      if (claims.tid !== env.MICROSOFT_TENANT_ID) {
        throw AppError.unauthorized('This Microsoft tenant is not allowed');
      }

      if (claims.nonce !== authState.nonce) {
        throw AppError.unauthorized('Microsoft auth nonce mismatch');
      }

      const email = normalizeMicrosoftEmail(String(claims.preferred_username || claims.email || ''));
      if (!email) {
        throw AppError.badRequest('Microsoft account email could not be resolved');
      }

      const fallbackName = splitDisplayName(claims.name);
      const firstName = String(claims.given_name || fallbackName.firstName || '');
      const lastName = String(claims.family_name || fallbackName.lastName || '');

      const loginResult = await IdentityService.loginWithMicrosoft({
        email,
        microsoftOid: claims.oid,
        microsoftTid: claims.tid,
        inferredRole: inferYasarRoleFromEmail(email),
        firstName,
        lastName,
        displayName: String(claims.name || ''),
      }, userAgent, ipAddress);

      if (!loginResult.success) {
        return this.buildErrorRedirect(loginResult.error || 'Microsoft sign-in failed');
      }

      const { token } = loginResult.data as { token: string };
      return this.buildSuccessRedirect(token, authState.returnTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Microsoft sign-in failed';
      return this.buildErrorRedirect(message);
    }
  }

  private static getClient(): ConfidentialClientApplication {
    if (!this.isEnabled()) {
      throw AppError.badRequest('Microsoft sign-in is not configured');
    }

    if (!this.msalClient) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: env.MICROSOFT_CLIENT_ID!,
          clientSecret: env.MICROSOFT_CLIENT_SECRET!,
          authority: `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}`,
        },
      });
    }

    return this.msalClient;
  }

  private static getRedirectUri(): string {
    if (env.MICROSOFT_REDIRECT_URI) {
      return env.MICROSOFT_REDIRECT_URI;
    }

    const backendBaseUrl = (env.BACKEND_PUBLIC_URL || `http://localhost:${env.PORT}`).replace(/\/$/, '');
    return `${backendBaseUrl}/api/auth/microsoft/callback`;
  }

  private static buildSuccessRedirect(sessionToken: string, returnTo: string): string {
    const url = new URL('/login', env.FRONTEND_URL);
    url.hash = new URLSearchParams({
      sessionToken,
      returnTo: sanitizeReturnTo(returnTo),
      provider: 'microsoft',
    }).toString();
    return url.toString();
  }

  private static buildErrorRedirect(message: string): string {
    const url = new URL('/login', env.FRONTEND_URL);
    url.hash = new URLSearchParams({
      authError: message,
      provider: 'microsoft',
    }).toString();
    return url.toString();
  }
}
