// 1 token só da SUA conta
const GITHUB_CLIENT_ID = 'Ov23liFmRRxAl4bPsMqa';
const REDIRECT_URI = 'http://localhost:7700/index.html';

let accessToken = localStorage.getItem('gh_token');
const cache = new Map(); // guarda buscas para não repetir
let resetTime = 0;
let remaining = 5000;

function iniciar() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get('code');
  if (codigo && !accessToken) trocarCodigoPorToken(codigo);
  else atualizarInterfaceUsuario();
  document.getElementById('loginBtn')?.addEventListener('click', iniciarLogin);
  document.getElementById('logoutBtn')?.addEventListener('click', sair);
}

function iniciarLogin() {
  const estado = btoa(Math.random().toString());
  localStorage.setItem('gh_estado', estado);
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=public_repo,read:user&state=${estado}`;
  window.location.href = authUrl;
}

async function trocarCodigoPorToken(codigo) {
  const estadoRecebido = new URLSearchParams(window.location.search).get('state');
  if (estadoRecebido !== localStorage.getItem('gh_estado')) { alert('Erro de segurança'); limpar(); return; }
  try {
    const resposta = await fetch('https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token', {
      method: 'POST', headers: {'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({client_id:GITHUB_CLIENT_ID,code:codigo,redirect_uri:REDIRECT_URI})
    });
    const dados = await resposta.json();
    if (dados.access_token) {
      accessToken = dados.access_token;
      localStorage.setItem('gh_token', accessToken);
      limpar();
      atualizarInterfaceUsuario();
    }
  } catch { alert('Falha na autenticação'); limpar(); }
}

function limpar() {
  window.history.replaceState({}, document.title, window.location.pathname);
  localStorage.removeItem('gh_estado');
}

function atualizarInterfaceUsuario() {
  const loginArea = document.getElementById('loginArea');
  const userArea = document.getElementById('userArea');
  const nome = document.getElementById('userName');
  if (accessToken) {
    loginArea.style.display = 'none'; userArea.style.display = 'flex';
    fetch('https://api.github.com/user', {headers:obterCab()})
      .then(r=>r.json()).then(u=>nome.textContent=`Olá, ${u.login}`);
  } else { loginArea.style.display = 'block'; userArea.style.display = 'none'; }
}

function sair() {
  localStorage.removeItem('gh_token'); accessToken=null; window.location.reload();
}

function obterCab() {
  const h = {'Accept':'application/vnd.github.v3+json'};
  if (accessToken) h.Authorization=`token ${accessToken}`;
  return h;
}

async function obterUrlPagina(repo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo.full_name}/pages`, {headers:obterCab()});
    if (res.ok) { const d=await res.json(); if(d.html_url)return d.html_url; if(d.cname)return`https://${d.cname}`; }
    return repo.name.endsWith('.github.io') ? `https://${repo.owner.login}.github.io/` : `https://${repo.owner.login}.github.io/${repo.name}/`;
  } catch { return `https://${repo.owner.login}.github.io/${repo.name}/`; }
}

// BUSCA COM CACHE E CONTROLE DE LIMITE
async function buscarProjetos() {
  const termo = document.getElementById('userInput').value.trim();
  const lista = document.getElementById('listaRepos');
  if (!termo) { lista.innerHTML='<div style="padding:20px;">Digite algo</div>'; return; }
  if (cache.has(termo)) { renderizar(cache.get(termo), lista); return; }

  // Espera se estiver bloqueado
  if (remaining < 5 && Date.now() < resetTime) {
    const espera = Math.ceil((resetTime - Date.now())/1000/60);
    lista.innerHTML=`<div style="padding:20px;color:#f85149">Aguarde ${espera}min para continuar</div>`;
    return;
  }

  lista.innerHTML='<div style="padding:20px;">Buscando...</div>';
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(termo)}+has:pages+language:html+language:javascript+language:css&sort=updated&per_page=30`;
    const res = await fetch(url, {headers:obterCab()});

    // Atualiza controle de limite
    remaining = parseInt(res.headers.get('X-RateLimit-Remaining')||'0');
    resetTime = parseInt(res.headers.get('X-RateLimit-Reset')||'0')*1000;

    if (res.status===403) { buscarProjetos(); return; }
    if (!res.ok) throw new Error('Erro');
    const dados = await res.json();
    if (!dados.items||!dados.items.length) { lista.innerHTML='<div style="padding:20px;">Nenhum encontrado</div>'; return; }
    cache.set(termo, dados.items);
    renderizar(dados.items, lista);
  } catch { lista.innerHTML='<div style="padding:20px;color:#f85149">Erro de conexão</div>'; }
}

function renderizar(itens, lista) {
  lista.innerHTML='';
  itens.forEach(repo=>{
    const cor = repo.language==='HTML'?'#e34c26':repo.language==='CSS'?'#563d7c':'#f1e05a';
    const item=document.createElement('div');
    item.className='repo-item';
    item.onclick=async()=>{
      document.querySelectorAll('.repo-item').forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      abrirPreview(await obterUrlPagina(repo), repo.name, repo.html_url);
    };
    item.innerHTML=`
      <div class="repo-header">
        <span class="repo-name">${repo.name}</span>
        <span class="badge">${repo.private?'Privado':'Público'}</span>
      </div>
      <span class="repo-desc">${repo.description||'Sem descrição'}</span>
      <div class="repo-meta">
        <span><span class="lang-dot" style="background:${cor}"></span>${repo.language||'Não definida'}</span>
        <span>👤 ${repo.owner.login}</span>
        <span>⭐ ${repo.stargazers_count}</span>
      </div>`;
    lista.appendChild(item);
  });
}

function abrirPreview(url, nome, urlRepo) {
  const area=document.getElementById('areaPreview');
  if (!url) {
    area.innerHTML=`<div class="no-selection"><p class="erro">Não foi possível pré-visualizar</p><a href="${urlRepo}" target="_blank" class="gh-btn">Ver repositório</a></div>`;
    return;
  }
  area.innerHTML=`
    <div class="browser-header">
      <div style="display:flex; gap:6px;">
        <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#27c93f"></span>
      </div>
      <div class="address-bar">${url}</div>
      <div style="display:flex; gap:8px;">
        <a href="${url}" target="_blank" class="gh-btn">Abrir</a>
        <a href="${urlRepo}" target="_blank" class="gh-btn">Código</a>
      </div>
    </div>
    <iframe src="${url}" title="Preview ${nome}"></iframe>`;
}

iniciar();
    
