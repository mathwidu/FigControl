import { expect, test } from "@playwright/test";

const baseCollection = {
  slug: "world-cup-2026",
  name: "FIFA World Cup 2026",
  baseStickerCount: 2,
  trackedStickerCount: 3,
  summary: {
    base: { total: 2, have: 0, missing: 2, duplicates: 0, percent: 0 },
    tracked: { total: 3, have: 0, missing: 3, duplicates: 0, percent: 0 },
  },
  sections: [
    {
      slug: "brazil",
      name: "Brasil",
      kind: "TEAM",
      stickers: [
        {
          code: "BRA20",
          localNumber: 20,
          label: "Estévão",
          isBaseAlbum: true,
          special: false,
          quantity: 0,
        },
        {
          code: "BRA3",
          localNumber: 3,
          label: "Bento",
          isBaseAlbum: true,
          special: false,
          quantity: 0,
        },
      ],
    },
    {
      slug: "coca-cola",
      name: "Coca-Cola",
      kind: "COCA_COLA",
      stickers: [
        {
          code: "CC12",
          localNumber: 12,
          label: "Gabriel Magalhães - Brazil",
          isBaseAlbum: false,
          special: true,
          quantity: 0,
        },
      ],
    },
  ],
};

const apiHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

test("registers, marks a repeated sticker, navigates lists and copies share text", async ({
  context,
  page,
}) => {
  let collection = structuredClone(baseCollection);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.route("**/auth/register", async (route) => {
    await route.fulfill({
      headers: apiHeaders,
      json: {
        success: true,
        message: "If the email exists, instructions were sent.",
      },
    });
  });

  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      headers: apiHeaders,
      json: {
        user: { id: "user-1", email: "teste@example.com" },
        accessToken: "access-token",
        refreshToken: "refresh-token",
      },
    });
  });

  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      headers: apiHeaders,
      json: {
        user: { id: "user-1", email: "teste@example.com" },
        accessToken: "access-token-refreshed",
        refreshToken: "refresh-token-refreshed",
      },
    });
  });

  await page.route(/\/me\/collection\/world-cup-2026$/, async (route) => {
    await route.fulfill({ headers: apiHeaders, json: collection });
  });

  await page.route(
    "**/me/collection/world-cup-2026/stickers/BRA20",
    async (route) => {
      collection = structuredClone(baseCollection);
      collection.sections[0].stickers[0].quantity = 2;
      collection.summary.base = {
        total: 2,
        have: 1,
        missing: 1,
        duplicates: 1,
        percent: 50,
      };
      collection.summary.tracked = {
        total: 3,
        have: 1,
        missing: 2,
        duplicates: 1,
        percent: 33,
      };
      await route.fulfill({ headers: apiHeaders, json: collection });
    },
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(
    page.getByRole("button", { name: "Ja tenho conta" }),
  ).toBeVisible();
  await page.getByLabel("Email").fill("teste@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
  await page.getByLabel("Confirmar senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(
    page.getByText("Conta criada. Verifique seu email antes de entrar."),
  ).toBeVisible();

  await page.getByLabel("Senha", { exact: true }).fill("senha-forte-123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page.getByRole("heading", { name: "Controle de Figurinhas 2026" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Brasil/ }).click();
  await expect(page.getByText("BRA20")).toBeVisible();
  await page.getByTitle("Aumentar BRA20").click();
  await expect(
    page.getByRole("button", { name: /BRA20 quantidade 2/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Faltando" }).click();
  await expect(
    page.getByRole("button", { name: "BRA3", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /BRA20 x1/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Repetidas" }).click();
  const duplicatesView = page.locator(".grouped-view.duplicates");
  await expect(
    duplicatesView.getByRole("button", { name: /BRA20 x1/ }),
  ).toBeVisible();
  await expect(
    duplicatesView.getByRole("button", { name: "BRA3", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Copiar" }).click();
  await expect(page.getByText("Lista de repetidas copiada.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Brasil: BRA20 x1");
});
