import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethod, PlanType, UserRole } from '@gym-admin/shared';
import {
  buildCheckoutUrl,
  clearAuthFlowState,
  clearSelectedPlan,
  deleteAdminTrainer,
  fetchAdminActivities,
  fetchCheckInActivities,
  fetchCheckInEligibility,
  fetchAdminCheckInQr,
  fetchAdminSiteSettings,
  fetchAdminStats,
  getSession,
  isPlanId,
  loginWithGoogleCode,
  loginWithGoogleIdToken,
  loginWithCredentials,
  payCheckout,
  persistOrigin,
  persistPlan,
  registerUser,
  requestPasswordReset,
  registerAdminCounterPayment,
  resetPasswordByToken,
  resolveOrigin,
  resolvePlan,
  resendVerificationEmail,
  saveAuthSession,
  searchAdminCounterPaymentStudents,
  submitCheckIn,
  updateAdminSiteSettings,
  verifyUserEmail,
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
      json: async () => ({ message: 'Te enviamos un email para activar tu cuenta.' }),
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
    expect(result.message).toBe('Te enviamos un email para activar tu cuenta.');

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

  it('calls verification and password recovery endpoints', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Email verificado correctamente.' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Si el email existe, te enviamos un nuevo link de verificación.' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Si el email existe, te enviamos instrucciones para recuperar tu contraseña.' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Contraseña actualizada correctamente.' }),
      });

    const verify = await verifyUserEmail('token-1');
    const resend = await resendVerificationEmail('u@u.com');
    const forgot = await requestPasswordReset('u@u.com');
    const reset = await resetPasswordByToken('token-2', 'Password123', 'Password123');

    expect(verify.message).toContain('verificado');
    expect(resend.message).toContain('link');
    expect(forgot.message).toContain('instrucciones');
    expect(reset.message).toContain('actualizada');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/reset-password',
      expect.objectContaining({ method: 'POST' }),
    );
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

  it('calls check-in eligibility endpoint with bearer token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ canCheckIn: true }),
    });

    const result = await fetchCheckInEligibility('token-123', 'main', 'token-abc');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/access/check-in/eligibility?gym=main&token=token-abc',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
    expect(result.canCheckIn).toBe(true);
  });

  it('calls check-in activities endpoint with bearer token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [{ slug: 'yoga', name: 'Yoga' }] }),
    });

    const result = await fetchCheckInActivities('token-123', 'main', 'token-abc');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/access/check-in/activities?gym=main&token=token-abc',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(result.activities[0].slug).toBe('yoga');
  });

  it('submits check-in payload with bearer token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'ok', checkIn: { uuid: 'att-1' } }),
    });

    const result = await submitCheckIn('token-123', {
      activitySlug: 'yoga',
      gymLocation: 'main',
      qrToken: 'token-abc',
      latitude: -34.6,
      longitude: -58.4,
      deviceId: 'mobile',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/access/check-in',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          activitySlug: 'yoga',
          gymLocation: 'main',
          qrToken: 'token-abc',
          latitude: -34.6,
          longitude: -58.4,
          deviceId: 'mobile',
        }),
      }),
    );
    expect(result.checkIn.uuid).toBe('att-1');
  });

  it('calls admin check-in qr endpoint with bearer token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gymLocation: 'main',
        checkInUrl: 'http://localhost:3000/check-in?gym=main',
        qrImageUrl: 'https://example.test/qr.png',
        generatedAt: '2026-01-01T00:00:00.000Z',
      }),
    });

    const result = await fetchAdminCheckInQr('token-123', 'main');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/access/check-in/admin/qr?gym=main',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
    expect(result.gymLocation).toBe('main');
  });

  it('calls admin stats endpoint by range', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        range: 'month',
        from: '2026-01-01T00:00:00.000Z',
        totals: {
          users: 10,
          newUsers: 3,
          activeUsers: 8,
          activeSubscriptions: 4,
          oneTimePaidUsers: 2,
          stoppedPaying: 1,
          cancelled: 1,
        },
        subscriptionsByPlan: { MONTHLY: 2 },
        oneTimeByAmount: {},
      }),
    });

    const result = await fetchAdminStats('token-123', 'month');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/stats?range=month',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
    expect(result.totals.users).toBe(10);
  });

  it('calls admin site get and patch endpoints with bearer token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const payload = {
      heroBadge: '#1',
      heroTitle: 'Hero',
      heroSubtitle: 'Subtitle',
      heroBackgroundImage: '/hero.png',
      gymName: 'Gym',
      gymAddress: 'Address',
      gymEmail: 'mail@gym.com',
      gymPhone: '+54',
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });

    const current = await fetchAdminSiteSettings('token-123');
    const updated = await updateAdminSiteSettings('token-123', payload);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/content/site',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/content/site',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    );
    expect(current.gymName).toBe('Gym');
    expect(updated.heroTitle).toBe('Hero');
  });

  it('calls admin activities and trainer delete endpoints', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ deleted: true }),
    });

    const activities = await fetchAdminActivities('token-123');
    const deletion = await deleteAdminTrainer('token-123', 'tr-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/content/activities',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/content/trainers/tr-1',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
    expect(activities).toEqual([]);
    expect(deletion.deleted).toBe(true);
  });

  it('calls admin counter payment endpoints with payload and token', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            uuid: 'user-1',
            fullName: 'Diego Gauto',
            email: 'diegogauto01@gmail.com',
            phone: '1122334455',
            status: 'ACTIVE',
            hasActiveSubscription: false,
            activeSubscriptionEndDate: null,
            latestOneTimePaidAt: null,
          },
        ],
      }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Pago físico registrado correctamente.',
        invoice: {
          uuid: 'inv-1',
          userUuid: 'user-1',
          studentName: 'Diego Gauto',
          studentEmail: 'diegogauto01@gmail.com',
          planId: PlanType.MONTHLY,
          amount: 15000,
          currency: 'ARS',
          paymentMethod: PaymentMethod.CASH,
          paidAt: '2026-02-19T00:00:00.000Z',
        },
      }),
    });

    const search = await searchAdminCounterPaymentStudents('token-123', 'diego');
    const saved = await registerAdminCounterPayment('token-123', {
      userUuid: 'user-1',
      planId: PlanType.MONTHLY,
      paymentMethod: PaymentMethod.CASH,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/admin/payments/students?q=diego',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/payments/one-time',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
        body: JSON.stringify({
          userUuid: 'user-1',
          planId: PlanType.MONTHLY,
          paymentMethod: PaymentMethod.CASH,
        }),
      }),
    );
    expect(search.items[0]?.email).toBe('diegogauto01@gmail.com');
    expect(saved.invoice.amount).toBe(15000);
  });
});
