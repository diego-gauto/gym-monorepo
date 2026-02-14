import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginClient from './LoginClient';
import * as authFlow from '../../lib/auth-flow';
import * as googleOAuth from '../../lib/google-oauth';

const mockPush = vi.fn();

vi.mock('next/link', () => {
  return {
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
      <a href={href} className={className}>{children}</a>
    ),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('../../lib/auth-flow', () => ({
  buildCheckoutUrl: vi.fn((plan: string) => `/checkout/mercadopago?plan=${plan}`),
  loginWithCredentials: vi.fn(),
  persistOrigin: vi.fn(),
  persistPlan: vi.fn(),
  resolveOrigin: vi.fn(),
  resolvePlan: vi.fn(),
  saveAuthSession: vi.fn(),
}));

vi.mock('../../lib/google-oauth', () => ({
  startGoogleOAuth: vi.fn(),
}));

describe('LoginClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
    vi.mocked(authFlow.resolveOrigin).mockReturnValue('login_manual');
    vi.mocked(authFlow.resolvePlan).mockReturnValue('monthly');
  });

  it('renders login form and register link', () => {
    render(<LoginClient initialPlan={null} initialOrigin={null} />);
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    const registerLinks = screen.getAllByRole('link', { name: 'No tengo cuenta / Registrarme' });
    expect(registerLinks[0]).toHaveAttribute('href', '/register?origin=login_manual&plan=monthly');
  });

  it('renders with plan omitted when resolvePlan returns null', () => {
    vi.mocked(authFlow.resolvePlan).mockReturnValue(null);
    render(<LoginClient initialPlan={null} initialOrigin={null} />);
    const registerLinks = screen.getAllByRole('link', { name: 'No tengo cuenta / Registrarme' });
    expect(registerLinks[0]).toHaveAttribute('href', '/register?origin=login_manual');
  });

  it('shows inline validation errors for invalid/touched fields', async () => {
    const user = userEvent.setup();
    render(<LoginClient initialPlan={null} initialOrigin={null} />);

    await user.type(screen.getByLabelText('Email'), 'invalid-email');
    await user.tab();
    await user.click(screen.getByLabelText('Contraseña'));
    await user.tab();

    expect(await screen.findByText('Ingresá un email válido')).toBeInTheDocument();
  });

  it('submits valid credentials and redirects to home', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.loginWithCredentials).mockResolvedValue({
      access_token: 'jwt-token',
      user: {
        email: 'user@test.com',
        role: 'USER',
      },
    });

    render(<LoginClient initialPlan={null} initialOrigin={null} />);

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(authFlow.loginWithCredentials).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'Password123',
    });
    expect(authFlow.saveAuthSession).toHaveBeenCalledWith('jwt-token', 'user@test.com', 'USER', 'login_manual');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('redirects to checkout after login when origin is elegir_plan', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.resolveOrigin).mockReturnValue('elegir_plan');
    vi.mocked(authFlow.resolvePlan).mockReturnValue('quarterly');
    vi.mocked(authFlow.loginWithCredentials).mockResolvedValue({
      access_token: 'jwt-token',
      user: {
        email: 'user@test.com',
        role: 'USER',
      },
    });

    render(<LoginClient initialPlan={null} initialOrigin={null} />);

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(mockPush).toHaveBeenCalledWith('/checkout/mercadopago?plan=quarterly');
  });

  it('starts Google OAuth flow when user clicks Google button', async () => {
    const user = userEvent.setup();

    render(<LoginClient initialPlan={null} initialOrigin={null} />);
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(googleOAuth.startGoogleOAuth).toHaveBeenCalledWith(expect.any(String), {
      origin: 'login_manual',
      planId: 'monthly',
    });
    expect(authFlow.persistOrigin).not.toHaveBeenCalled();
    expect(authFlow.persistPlan).not.toHaveBeenCalled();
  });
});
