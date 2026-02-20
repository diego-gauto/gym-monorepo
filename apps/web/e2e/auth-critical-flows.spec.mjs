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
    const loginForm = page.locator('form').first();
    await loginForm.locator('#email').fill('e2e-user@gympro.test');
    await loginForm.locator('#password').fill('Password123');
    await loginForm.getByRole('button', { name: 'Ingresar' }).click();

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
    const registerForm = page.locator('form').first();
    await registerForm.locator('#firstName').fill('Diego');
    await registerForm.locator('#lastName').fill('Gauto');
    await registerForm.locator('#email').fill('diego-e2e@gympro.test');
    await registerForm.locator('#phone').fill('11 5555 1234');
    await registerForm.locator('#password').fill('Password123');
    await registerForm.locator('#confirmPassword').fill('Password123');
    await registerForm.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Te enviamos un email para activar tu cuenta.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reenviar email de verificación' })).toBeVisible();
  });
});
