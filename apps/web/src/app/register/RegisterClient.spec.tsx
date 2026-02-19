import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  persistOrigin: vi.fn(),
  persistPlan: vi.fn(),
  registerUser: vi.fn(),
  resendVerificationEmail: vi.fn(),
  resolveOrigin: vi.fn(),
  resolvePlan: vi.fn(),
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
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/login?origin=login_manual&plan=yearly');
  });

  it('renders login link without plan when none is selected', () => {
    vi.mocked(authFlow.resolvePlan).mockReturnValue(null);
    render(<RegisterClient initialPlan={null} initialOrigin={null} />);
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/login?origin=login_manual');
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

  it('submits valid register data and shows verification email message', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.registerUser).mockResolvedValue({
      message: 'Te enviamos un email para activar tu cuenta.',
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
    expect(await screen.findByText('Te enviamos un email para activar tu cuenta.')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('allows resending verification email after successful register', async () => {
    const user = userEvent.setup();
    vi.mocked(authFlow.registerUser).mockResolvedValue({ message: 'Te enviamos un email para activar tu cuenta.' });
    vi.mocked(authFlow.resendVerificationEmail).mockResolvedValue({
      message: 'Si el email existe, te enviamos un nuevo link de verificación.',
    });

    render(<RegisterClient initialPlan={null} initialOrigin={null} />);

    await user.type(screen.getByLabelText('Nombre'), 'Juan');
    await user.type(screen.getByLabelText('Apellido'), 'Perez');
    await user.type(screen.getByLabelText('Email'), 'juan@test.com');
    await user.type(screen.getByLabelText('Teléfono'), '11 5555 1234');
    await user.type(screen.getByLabelText('Contraseña'), 'Password123');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await user.click(screen.getByRole('button', { name: 'Reenviar email de verificación' }));

    expect(authFlow.resendVerificationEmail).toHaveBeenCalledWith('juan@test.com');
    expect(await screen.findByText('Si el email existe, te enviamos un nuevo link de verificación.')).toBeInTheDocument();
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
