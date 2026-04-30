interface TokenMessageInput {
  appUrl: string;
  token: string;
}

interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

export function buildEmailVerificationMessage(input: TokenMessageInput): EmailMessage {
  const link = buildUrl(input.appUrl, '/verificar-email', input.token);
  return {
    subject: 'Confirme seu email no FigControl',
    text: `Confirme seu email no FigControl acessando: ${link}`,
    html: `<p>Confirme seu email no FigControl.</p><p><a href="${escapeHtml(link)}">Confirmar email</a></p>`
  };
}

export function buildPasswordResetMessage(input: TokenMessageInput): EmailMessage {
  const link = buildUrl(input.appUrl, '/resetar-senha', input.token);
  return {
    subject: 'Redefina sua senha do FigControl',
    text: `Redefina sua senha do FigControl acessando: ${link}`,
    html: `<p>Recebemos um pedido para redefinir sua senha do FigControl.</p><p><a href="${escapeHtml(link)}">Redefinir senha</a></p>`
  };
}

function buildUrl(appUrl: string, path: string, token: string): string {
  const url = new URL(path, appUrl.endsWith('/') ? appUrl : `${appUrl}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
