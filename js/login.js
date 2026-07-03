import { GITHUB_CLIENT_ID, REDIRECT_URI } from './config.js';

export let accessToken = localStorage.getItem('gh_token');
export let remaining = 5000;
export let resetTime = 0;

export function iniciarLogin() {
  const estado = btoa(Math.random().toString(36));
  localStorage.setItem('gh_estado', estado);
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=public_repo,read:user&state=${estado}`;
  window.location.href = authUrl;
}

export async function trocarCodigoPorToken(codigo) {
  const estadoRecebido = new URLSearchParams(window.location.search).get('state');
  const estadoSalvo = localStorage.getItem('gh_estado');

  if (!estadoRecebido || estadoRecebido !== estadoSalvo) {
    alert('Erro de segurança: sessão inválida');
    limparRetorno();
    return;
  }

  // ⚠️ PARA USO LOCAL SÓ — remova ou use método seguro ao publicar
  // Se for publicar, remova essa linha e use outro método de troca
  const clientSecret = 'COLE_AQUI_SEU_CLIENT_SECRET';

  try {
    const resposta = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: clientSecret.trim(),
        code: codigo,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!resposta.ok) throw new Error(`Erro: ${resposta.status} - ${resposta.statusText}`);
    const dados = await resposta.json();

    if (dados.access_token) {
      accessToken = dados.access_token;
      localStorage.setItem('gh_token', accessToken);
      limparRetorno();
      atualizarInterfaceUsuario();
    } else {
      alert('Falha no login: ' + (dados.error_description || dados.error || 'desconhecido'));
      limparRetorno();
    }
  } catch (erro) {
    alert('Erro ao autenticar: ' + erro.message);
    limparRetorno();
  }
}

function limparRetorno() {
  window.history.replaceState({}, document.title, window.location.pathname);
  localStorage.removeItem('gh_estado');
}

export function obterCabecalhos() {
  const cabecalhos = { 'Accept': 'application/vnd.github.v3+json' };
  if (accessToken) cabecalhos['Authorization'] = `token ${accessToken.trim()}`;
  return cabecalhos;
}

export function atualizarInterfaceUsuario() {
  const loginArea = document.getElementById('loginArea');
  const userArea = document.getElementById('userArea');
  const nomeUsuario = document.getElementById('userName');
  const avatarUsuario = document.getElementById('userAvatar');
  const limiteInfo = document.getElementById('limiteInfo');

  if (accessToken && loginArea && userArea) {
    loginArea.style.display = 'none';
    userArea.style.display = 'flex';

    fetch('https://api.github.com/user', { headers: obterCabecalhos() })
      .then(res => {
        remaining = parseInt(res.headers.get('X-RateLimit-Remaining') || '0');
        resetTime = parseInt(res.headers.get('X-RateLimit-Reset') || '0') * 1000;
        return res.json();
      })
      .then(usuario => {
        nomeUsuario.textContent = usuario.login;
        avatarUsuario.src = usuario.avatar_url;
        avatarUsuario.alt = `Foto de ${usuario.login}`;
        limiteInfo.textContent = `Logado — restam: ${remaining} requisições`;
      })
      .catch(() => {
        nomeUsuario.textContent = 'Logado';
        limiteInfo.textContent = 'Limite: 5000/hora';
      });
  } else if (loginArea && userArea) {
    loginArea.style.display = 'flex';
    userArea.style.display = 'none';
    limiteInfo.textContent = 'Sem login: 60 req/hora | Logado: 5000 req/hora';
  }
}

export function sair() {
  localStorage.removeItem('gh_token');
  localStorage.removeItem('gh_estado');
  accessToken = null;
  window.location.reload();
}
