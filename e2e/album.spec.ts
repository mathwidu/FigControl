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

test("registers, marks a missing sticker as owned, manages duplicates and copies section duplicates", async ({
  context,
  page,
}) => {
  let collection = structuredClone(baseCollection);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  function updateSummaries() {
    const stickers = collection.sections.flatMap((section) => section.stickers);
    const baseStickers = stickers.filter((sticker) => sticker.isBaseAlbum);
    const summarize = (items: typeof stickers) => {
      const total = items.length;
      const have = items.filter((sticker) => sticker.quantity > 0).length;
      const missing = total - have;
      const duplicates = items.filter((sticker) => sticker.quantity > 1).length;
      const percent = total === 0 ? 0 : Math.round((have / total) * 100);
      return { total, have, missing, duplicates, percent };
    };

    collection.summary.base = summarize(baseStickers);
    collection.summary.tracked = summarize(stickers);
  }

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
      const body = route.request().postDataJSON() as { quantity: number };
      collection.sections[0].stickers[0].quantity = body.quantity;
      updateSummaries();
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
  await expect(
    page.locator('img.flag-image[src="/flags/br.svg"]').first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /Brasil/ }).click();
  await expect(page.getByRole("tab", { name: /Faltam 2/ })).toBeVisible();
  await page.getByRole("link", { name: "FigControl inicio" }).click();
  await expect(page.getByRole("button", { name: /Brasil/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Faltam 2/ })).toHaveCount(0);

  await page.getByRole("button", { name: /Brasil/ }).click();
  await page.getByRole("button", { name: "Marcar BRA20 como tenho" }).click();

  await page.getByRole("tab", { name: /Tenho 1/ }).click();
  await expect(
    page.getByRole("button", { name: "Abrir ações de BRA20" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: /Faltam 1/ }).click();
  await expect(
    page.getByRole("button", { name: "BRA3", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Marcar BRA3 como tenho" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: /Tenho 1/ }).click();
  await page.getByRole("button", { name: "Abrir ações de BRA20" }).click();
  await page.getByRole("button", { name: "Adicionar repetida" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir ações de BRA20" }),
  ).toBeVisible();
  await expect(page.getByText("1 repetida")).toBeVisible();
  await page.getByRole("button", { name: "Ver repetidas" }).click();
  await expect(page.getByText("BRA20 x1", { exact: true })).toBeVisible();

  await page.getByTitle("Copiar repetidas").click();
  await expect(page.getByText("Lista de repetidas copiada.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("BRA20 x1");
});
