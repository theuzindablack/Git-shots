export function abrirPreview(url, nome, urlRepo) {
  const area = document.getElementById('areaPreview');
  if (!url) {
    area.innerHTML = `
      <div class="no-selection">
        <p class="erro">Não foi possível pré-visualizar</p>
        <a href="${urlRepo}" target="_blank" class="gh-btn">Ver repositório</a>
      </div>`;
    return;
  }
  area.innerHTML = `
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
