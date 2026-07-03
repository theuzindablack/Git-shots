import { atualizarInterfaceUsuario, iniciarLogin, trocarCodigoPorToken, sair } from './login.js';
import { buscarProjetos } from './busca.js';

function iniciar() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get('code');
  if (codigo) {
    trocarCodigoPorToken(codigo);
  } else {
    atualizarInterfaceUsuario();
  }

  document.getElementById('loginBtn')?.addEventListener('click', iniciarLogin);
  document.getElementById('logoutBtn')?.addEventListener('click', sair);
  document.getElementById('buscarBtn')?.addEventListener('click', buscarProjetos);
}

iniciar();
