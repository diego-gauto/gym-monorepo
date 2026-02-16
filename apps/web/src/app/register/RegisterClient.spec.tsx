import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@gym-admin/shared';
import RegisterClient from './RegisterClient';
import * as authFlow from '../../lib/auth-flow';
import * as googleOAuth from '../../lib/google-oauth';

const mockPush = vi.fn();

vi.mock('next/link', async () => {
  const react = await import('react');
  return {
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
      react.createElement('a', { href, className }, children),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('../../lib/auth-flow', () => ({
  buildCheckoutUrl: vi.fn((plan: string) => `/checkout/mercadopago?plan=${plan}`),
  persistOrigin: vi.fn(),
  persistPlan: vi.fn(),
  registerUser: vi.fn(),
  resolveOrigin: vi.fn(),
  resolvePlan: vi.fn(),
  saveAuthSession: vi.fn(),
}));

vi.mock('../../lib/google-oauth', () => ({
  startGoogleOAuth: vi.fn(),
}));

describe('RegisterClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
    vi.mocked(authFlow.resolveOrigin).mockReturnValue('login_manual');
    vi.mocked(authFlow.resolvePlan).mockReturnValue('yearly');
  });

  it('renders register form and login link', () => {
    render(<RegisterClient initialPlan={null} initialOrigin={null} />);
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    const loginLinks = screen.getAllByRole('link', { name: 'Ya tengo cuenta / Ingresar' });
    expect(loginLinks[0]).toHaveAttribute('href', '/login?origin=login_manual&plan=yearly');
  });

  it('renders login link without plan when none is selected', () => {
    vi.mocked(authFlow.resolvePlan).mockReturnValue(null);
    render(<RegisterClient initialPlan={null} initialOrigin={null} />);
    const loginLinks = screen.getAllByRole('link', { name: 'Ya tengo cuenta / Ingresar' });
    expect(loginLinks[0]).toHaveAttribute('href', '/login?origin=login_manual');
  });

  it('shows mismatch password validation', async () => {
    const user = userEvent.setup();
    render(<RegisterClient initialPlan={null} initialOrigin={null} />);

    await user.type(screen.getByLabelText('Nombre'), 'Juan');
    await user.type(screen.getByLabelText('Apellido'), 'Perez');
    await user.type(screen.getByLabelText('Email'), 'juan@test.com');
    await user.type(screen.getByLabelText('Teléfono'), '11 5555 1234');
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Password124');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('submits valid register data and redirects to home', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.registerUser).mockResolvedValue({
      access_token: 'jwt-token',
      user: {
        email: 'juan@test.com',
        role: UserRole.USER,
      },
    });

    render(<RegisterClient initialPlan={null} initialOrigin={null} />);

    await user.type(screen.getByLabelText('Nombre'), 'Juan');
    await user.type(screen.getByLabelText('Apellido'), 'Perez');
    await user.type(screen.getByLabelText('Email'), 'juan@test.com');
    await user.type(screen.getByLabelText('Teléfono'), '11 5555 1234');
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(authFlow.registerUser).toHaveBeenCalledWith({
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@test.com',
      phone: '11 5555 1234',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    expect(authFlow.saveAuthSession).toHaveBeenCalledWith('jwt-token', 'juan@test.com', 'USER', 'login_manual');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('redirects to checkout after register when origin is elegir_plan', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.resolveOrigin).mockReturnValue('elegir_plan');
    vi.mocked(authFlow.resolvePlan).mockReturnValue('monthly');
    vi.mocked(authFlow.registerUser).mockResolvedValue({
      access_token: 'jwt-token',
      user: {
        email: 'juan@test.com',
        role: UserRole.USER,
      },
    });

    render(<RegisterClient initialPlan={null} initialOrigin={null} />);

    await user.type(screen.getByLabelText('Nombre'), 'Juan');
    await user.type(screen.getByLabelText('Apellido'), 'Perez');
    await user.type(screen.getByLabelText('Email'), 'juan@test.com');
    await user.type(screen.getByLabelText('Teléfono'), '11 5555 1234');
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/checkout/mercadopago?plan=monthly');
    });
  });

  it('starts Google OAuth flow and preserves elegir_plan context', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.resolveOrigin).mockReturnValue('elegir_plan');
    vi.mocked(authFlow.resolvePlan).mockReturnValue('monthly');

    render(<RegisterClient initialPlan={null} initialOrigin={null} />);
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(googleOAuth.startGoogleOAuth).toHaveBeenCalledWith(expect.any(String), {
      origin: 'elegir_plan',
      planId: 'monthly',
    });
    expect(authFlow.persistOrigin).not.toHaveBeenCalled();
    expect(authFlow.persistPlan).not.toHaveBeenCalled();
  });
});
