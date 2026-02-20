import { expect, test } from '@playwright/test';

const loginResponse = {
  access_token: 'e2e-token',
  user: {
    uuid: 'e2e-user-uuid',
    email: 'e2e-user@gympro.test',
    role: 'USER',
    status: 'ACTIVE',
  },
};

test.describe('Critical auth flows', () => {
  test('login redirects to checkout when user came from elegir plan', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(loginResponse),
      });
    });

    await page.goto('/login?origin=elegir_plan&plan=monthly');
    await page.getByLabel('Email').fill('e2e-user@gympro.test');
    await page.getByLabel('Contraseña').fill('Password123');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/checkout\/mercadopago\?plan=monthly/);
  });

  test('register shows verification message and resend action', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Te enviamos un email para activar tu cuenta.' }),
      });
    });

    await page.route('**/api/auth/resend-verification-email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Reenviamos el email de verificación.' }),
      });
    });

    await page.goto('/register?origin=login_manual');
    await page.getByLabel('Nombre').fill('Diego');
    await page.getByLabel('Apellido').fill('Gauto');
    await page.getByLabel('Email').fill('diego-e2e@gympro.test');
    await page.getByLabel('Teléfono').fill('11 5555 1234');
    await page.getByLabel('Contraseña').fill('Password123');
    await page.getByLabel('Confirmar contraseña').fill('Password123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Te enviamos un email para activar tu cuenta.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reenviar email de verificación' })).toBeVisible();
  });
});
