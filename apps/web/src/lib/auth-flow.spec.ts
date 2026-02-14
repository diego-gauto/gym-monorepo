import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanType, UserRole } from '@gym-admin/shared';
import {
  buildCheckoutUrl,
  clearAuthFlowState,
  clearSelectedPlan,
  getSession,
  isPlanId,
  loginWithGoogleCode,
  loginWithGoogleIdToken,
  loginWithCredentials,
  payCheckout,
  persistOrigin,
  persistPlan,
  registerUser,
  resolveOrigin,
  resolvePlan,
  saveAuthSession,
} from './auth-flow';

describe('auth-flow utility', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates plan ids and checkout URLs', () => {
    expect(isPlanId('monthly')).toBe(true);
    expect(isPlanId('quarterly')).toBe(true);
    expect(isPlanId('yearly')).toBe(true);
    expect(isPlanId('invalid')).toBe(false);
    expect(buildCheckoutUrl('monthly')).toBe('/checkout/mercadopago?plan=monthly');
  });

  it('persists and resolves plan/origin from localStorage', () => {
    persistPlan('yearly');
    persistOrigin('elegir_plan');

    expect(resolvePlan(null)).toBe('yearly');
    expect(resolveOrigin(null)).toBe('elegir_plan');

    clearSelectedPlan();
    expect(resolvePlan(null)).toBeNull();
  });

  it('saves and reads session with role normalization', () => {
    saveAuthSession('token-1', 'test@email.com', 'admin', 'login_manual');
    const session = getSession();

    expect(session).not.toBeNull();
    expect(session?.role).toBe(UserRole.ADMIN);

    saveAuthSession('token-2', 'test@email.com', 'user', 'login_manual');
    expect(getSession()?.role).toBe(UserRole.USER);
  });

  it('clears session, origin and selected plan on full logout cleanup', () => {
    persistPlan('monthly');
    persistOrigin('elegir_plan');
    saveAuthSession('token-2', 'test@email.com', 'user', 'login_manual');

    clearAuthFlowState();

    expect(getSession()).toBeNull();
    expect(resolvePlan(null)).toBeNull();
    expect(resolveOrigin(null)).toBe('login_manual');
  });

  it('calls register endpoint and parses API errors', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'jwt', user: { email: 'u@u.com', role: 'USER' } }),
    });

    const result = await registerUser({
      firstName: 'A',
      lastName: 'B',
      email: 'u@u.com',
      phone: '11 5555 0000',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.access_token).toBe('jwt');

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: ['Error principal'] }),
    });

    await expect(
      registerUser({
        firstName: 'A',
        lastName: 'B',
        email: 'u@u.com',
        phone: '11 5555 0000',
        password: 'Password123',
        confirmPassword: 'Password123',
      }),
    ).rejects.toThrow('Error principal');
  });

  it('calls login endpoint and handles fallback API error', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error('bad json');
      },
    });

    await expect(
      loginWithCredentials({ email: 'u@u.com', password: 'Password123' }),
    ).rejects.toThrow('Ocurrió un error');
  });

  it('calls google auth endpoint with id token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'jwt-google', user: { email: 'google@u.com', role: 'USER' } }),
    });

    const result = await loginWithGoogleIdToken('google-id-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/google',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idToken: 'google-id-token' }),
      }),
    );
    expect(result.access_token).toBe('jwt-google');
  });

  it('calls google code endpoint with code + redirect uri', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'jwt-google-code', user: { email: 'google@u.com', role: 'USER' } }),
    });

    const result = await loginWithGoogleCode('auth-code-1', 'http://localhost:3000/auth/google/callback');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/google/code',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'auth-code-1', redirectUri: 'http://localhost:3000/auth/google/callback' }),
      }),
    );
    expect(result.access_token).toBe('jwt-google-code');
  });

  it('calls checkout pay endpoint with bearer token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Pago aprobado', invoiceUuid: 'inv-1', subscriptionUuid: 'sub-1', status: 'ACTIVE', paidAt: null }),
    });

    const result = await payCheckout('token-123', {
      planId: PlanType.MONTHLY,
      cardNumber: '4509953566233704',
      expirationMonth: '11',
      expirationYear: '30',
      securityCode: '123',
      cardholderName: 'APRO',
      identificationType: 'DNI',
      identificationNumber: '12345678',
      acceptedRecurringTerms: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/billing/checkout/pay',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
    expect(result.invoiceUuid).toBe('inv-1');
  });
});
