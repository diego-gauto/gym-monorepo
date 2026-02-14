import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@gym-admin/shared';
import CheckoutClient from './CheckoutClient';
import * as authFlow from '../../../lib/auth-flow';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'plan' ? 'monthly' : null),
  }),
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

vi.mock('../../../lib/auth-flow', () => ({
  getSession: vi.fn(),
  resolvePlan: vi.fn(),
  fetchBillingContext: vi.fn(),
  payCheckout: vi.fn(),
  requestPlanChange: vi.fn(),
  toPlanType: vi.fn(),
  updateBillingCard: vi.fn(),
}));

describe('CheckoutClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace.mockReset();
    mockPush.mockReset();
    vi.mocked(authFlow.resolvePlan).mockReturnValue('monthly');
  });

  it('blocks access when no session exists', () => {
    vi.mocked(authFlow.getSession).mockReturnValue(null);
    render(<CheckoutClient />);
    expect(screen.getByText('Cargando checkout...')).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/login?origin=elegir_plan&plan=monthly');
  });

  it('blocks admin users', () => {
    vi.mocked(authFlow.getSession).mockReturnValue({
      role: UserRole.ADMIN,
      origin: 'elegir_plan',
      email: 'admin@test.com',
      accessToken: 'token',
    });
    render(<CheckoutClient />);
    expect(screen.getByText('Los administradores no pueden acceder a checkout.')).toBeInTheDocument();
  });

  it('shows checkout details for user with valid origin and plan', () => {
    vi.mocked(authFlow.getSession).mockReturnValue({
      role: UserRole.USER,
      origin: 'elegir_plan',
      email: 'user@test.com',
      accessToken: 'token',
    });
    vi.mocked(authFlow.resolvePlan).mockReturnValue('monthly');

    render(<CheckoutClient />);
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByText('Plan seleccionado: monthly')).toBeInTheDocument();
  });

  it('redirects to success screen after approved payment', async () => {
    vi.mocked(authFlow.getSession).mockReturnValue({
      role: UserRole.USER,
      origin: 'elegir_plan',
      email: 'user@test.com',
      accessToken: 'token',
    });
    vi.mocked(authFlow.payCheckout).mockResolvedValue({
      message: 'Pago aprobado. Tu suscripción ya está activa.',
      invoiceUuid: 'inv-1',
      subscriptionUuid: 'sub-1',
      status: 'ACTIVE',
      paidAt: null,
    });
    const user = userEvent.setup();

    render(<CheckoutClient />);

    await user.type(screen.getByLabelText('Número de tarjeta'), '4509953566233704');
    await user.type(screen.getByPlaceholderText('MM'), '12');
    await user.type(screen.getByPlaceholderText('YY'), '30');
    await user.type(screen.getByLabelText('CVV'), '123');
    await user.type(screen.getByLabelText('Titular'), 'JUAN PEREZ');
    await user.type(screen.getByLabelText('Tipo doc'), 'DNI');
    await user.type(screen.getByLabelText('Documento'), '12345678');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Pagar/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/checkout/success?plan=monthly&invoice=inv-1&subscription=sub-1&amount=15000');
    });
  });

  it('shows failed payment modal and keeps card data for retry', async () => {
    vi.mocked(authFlow.getSession).mockReturnValue({
      role: UserRole.USER,
      origin: 'elegir_plan',
      email: 'user@test.com',
      accessToken: 'token',
    });
    vi.mocked(authFlow.payCheckout).mockRejectedValue(new Error('Pago rechazado por Mercado Pago: card_declined'));
    const user = userEvent.setup();

    render(<CheckoutClient />);

    const cardInput = screen.getByLabelText('Número de tarjeta') as HTMLInputElement;
    await user.type(cardInput, '4509953566233704');
    await user.type(screen.getByPlaceholderText('MM'), '12');
    await user.type(screen.getByPlaceholderText('YY'), '30');
    await user.type(screen.getByLabelText('CVV'), '123');
    await user.type(screen.getByLabelText('Titular'), 'JUAN PEREZ');
    await user.type(screen.getByLabelText('Tipo doc'), 'DNI');
    await user.type(screen.getByLabelText('Documento'), '12345678');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Pago rechazado por Mercado Pago: card_declined')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar y reintentar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(cardInput.value).toContain('4509');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('closes failed payment modal with Escape and restores focus to pay button', async () => {
    vi.mocked(authFlow.getSession).mockReturnValue({
      role: UserRole.USER,
      origin: 'elegir_plan',
      email: 'user@test.com',
      accessToken: 'token',
    });
    vi.mocked(authFlow.payCheckout).mockRejectedValue(new Error('Pago rechazado por Mercado Pago: card_declined'));
    const user = userEvent.setup();

    render(<CheckoutClient />);

    await user.type(screen.getByLabelText('Número de tarjeta'), '4509953566233704');
    await user.type(screen.getByPlaceholderText('MM'), '12');
    await user.type(screen.getByPlaceholderText('YY'), '30');
    await user.type(screen.getByLabelText('CVV'), '123');
    await user.type(screen.getByLabelText('Titular'), 'JUAN PEREZ');
    await user.type(screen.getByLabelText('Tipo doc'), 'DNI');
    await user.type(screen.getByLabelText('Documento'), '12345678');
    await user.click(screen.getByRole('checkbox'));
    const payButton = screen.getByRole('button', { name: /Pagar/i });
    await user.click(payButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(payButton).toHaveFocus();
  });

  it('closes failed payment modal when clicking overlay', async () => {
    vi.mocked(authFlow.getSession).mockReturnValue({
      role: UserRole.USER,
      origin: 'elegir_plan',
      email: 'user@test.com',
      accessToken: 'token',
    });
    vi.mocked(authFlow.payCheckout).mockRejectedValue(new Error('Pago rechazado por Mercado Pago: card_declined'));
    const user = userEvent.setup();

    render(<CheckoutClient />);

    await user.type(screen.getByLabelText('Número de tarjeta'), '4509953566233704');
    await user.type(screen.getByPlaceholderText('MM'), '12');
    await user.type(screen.getByPlaceholderText('YY'), '30');
    await user.type(screen.getByLabelText('CVV'), '123');
    await user.type(screen.getByLabelText('Titular'), 'JUAN PEREZ');
    await user.type(screen.getByLabelText('Tipo doc'), 'DNI');
    await user.type(screen.getByLabelText('Documento'), '12345678');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Pagar/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByTestId('payment-error-overlay'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
