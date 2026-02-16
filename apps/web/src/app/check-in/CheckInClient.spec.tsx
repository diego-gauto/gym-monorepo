import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRole } from '@gym-admin/shared';
import CheckInClient from './CheckInClient';
import * as authFlow from '../../lib/auth-flow';

vi.mock('next/link', async () => {
  const react = await import('react');
  return {
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
      react.createElement('a', { href, className }, children),
  };
});

vi.mock('../../lib/auth-flow', () => ({
  fetchCheckInActivities: vi.fn(),
  fetchCheckInEligibility: vi.fn(),
  getSession: vi.fn(),
  submitCheckIn: vi.fn(),
}));

describe('CheckInClient', () => {
  const validToken = '2026-02-15.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('shows login/register actions when there is no session and token is present', async () => {
    vi.mocked(authFlow.getSession).mockReturnValue(null);

    render(<CheckInClient initialGym="main" initialToken={validToken} />);

    expect(await screen.findByRole('heading', { name: 'Necesitás iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/login?origin=login_manual&next=%2Fcheck-in%3Fgym%3Dmain%26t%3D2026-02-15.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(screen.getByRole('link', { name: 'Registrarme' })).toHaveAttribute(
      'href',
      '/register?origin=login_manual&next=%2Fcheck-in%3Fgym%3Dmain%26t%3D2026-02-15.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
  });

  it('allows selecting activity and submitting check-in when eligible', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.getSession).mockReturnValue({
      accessToken: 'token-123',
      email: 'user@test.com',
      origin: 'login_manual',
      role: UserRole.USER,
    });

    vi.mocked(authFlow.fetchCheckInEligibility).mockResolvedValue({
      canCheckIn: true,
      reason: null,
      user: { uuid: 'u-1', name: 'Juan Perez' },
      membership: { ok: true, source: 'SUBSCRIPTION', inGrace: false, graceEndsAt: null },
      medicalCertificate: { ok: true, validUntil: '2099-01-01T00:00:00.000Z' },
    });

    vi.mocked(authFlow.fetchCheckInActivities).mockResolvedValue({
      activities: [
        { slug: 'yoga', name: 'Yoga' },
        { slug: 'crossfit', name: 'Crossfit' },
      ],
    });

    vi.mocked(authFlow.submitCheckIn).mockResolvedValue({
      message: 'ok',
      checkIn: {
        uuid: 'att-1',
        checkInAt: '2026-02-14T12:00:00.000Z',
        activitySlug: 'yoga',
        gymLocation: 'main',
      },
    });

    render(<CheckInClient initialGym="main" initialToken={validToken} />);

    expect(await screen.findByRole('button', { name: 'Registrar ingreso' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Yoga/i }));
    await user.click(screen.getByRole('button', { name: 'Registrar ingreso' }));

    expect(authFlow.submitCheckIn).toHaveBeenCalledWith(
      'token-123',
      expect.objectContaining({
        activitySlug: 'yoga',
        gymLocation: 'main',
        qrToken: validToken,
        deviceId: 'qr-web',
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Ingreso registrado' })).toBeInTheDocument();
  });

  it('shows retry state when eligibility validation times out', async () => {
    vi.useFakeTimers();
    vi.mocked(authFlow.getSession).mockReturnValue({
      accessToken: 'token-123',
      email: 'user@test.com',
      origin: 'login_manual',
      role: UserRole.USER,
    });

    vi.mocked(authFlow.fetchCheckInEligibility).mockImplementation(
      () => new Promise(() => {
        // unresolved on purpose
      }),
    );
    vi.mocked(authFlow.fetchCheckInActivities).mockImplementation(
      () => new Promise(() => {
        // unresolved on purpose
      }),
    );

    render(<CheckInClient initialGym="main" initialToken={validToken} />);

    await act(async () => {
      vi.advanceTimersByTime(10001);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('heading', { name: 'No pudimos validar tu acceso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('blocks direct route access when token is missing', async () => {
    vi.mocked(authFlow.getSession).mockReturnValue(null);

    render(<CheckInClient initialGym="main" initialToken={null} />);

    expect(await screen.findByRole('heading', { name: 'No pudimos validar tu acceso' })).toBeInTheDocument();
    expect(screen.getByText(/exclusivo por QR/i)).toBeInTheDocument();
  });
});
