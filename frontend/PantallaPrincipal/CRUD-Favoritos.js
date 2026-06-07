//Carga inicial
async function cargarFavoritos() {
  try {
    const res  = await fetch(`${API.obtenerFavoritos}?page=1&size=100`, { method: 'GET', headers: authHeaders() });
    const json = await res.json();
    const raw  = json.data?.muestras || json.data || [];
    const nuevos = Array.isArray(raw) ? raw.map(m => (typeof m === 'object' ? m.id : m)) : [];

    // Solo actualiza si la respuesta tiene sentido
    if (nuevos.length > 0 || favoritos.length === 0) {
      favoritos = nuevos;
    }
  } catch {  }
}
//Estado
function esFavorito(id) {
  return favoritos.includes(id);
}

function actualizarEstrellas() {
    document.querySelectorAll('.estrella-tarjeta').forEach(btn => {
    btn.classList.toggle('favorito', esFavorito(Number(btn.dataset.id)));
  });
}

//agregar
async function agregarFavorito(id, e) {
  if (e) e.stopPropagation();
  if (esFavorito(id)) return;
  try {
    const res  = await fetch(API.agregarFavorito, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ idMuestra: id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    favoritos.push(id);
    mostrarToast('★ Agregado a favoritos');
    actualizarEstrellas();
  } catch { mostrarToast('Error al agregar favorito'); }
}

//Eliminar
async function eliminarFavoritoById(id, e) {
  if (e) e.stopPropagation();
  if (!esFavorito(id)) return;
  try {
    const res  = await fetch(API.eliminarFavorito, {
      method: 'DELETE', headers: authHeaders(true),
      body: JSON.stringify({ idMuestra: id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    favoritos = favoritos.filter(f => f !== id);
    mostrarToast('Quitado de favoritos');
    actualizarEstrellas();
  } catch { mostrarToast('Error al quitar favorito'); }
}

function toggleFavorito(id, e) {
  if (e) e.stopPropagation();
  esFavorito(id) ? eliminarFavoritoById(id, e) : agregarFavorito(id, e);
}

//POP-UP favoritos
function abrirFavoritos() {
  const searchEl = document.getElementById('fav-search');
  if (searchEl) searchEl.value = '';
  renderFavLista();
  abrirModal('modal-favoritos');
}

function filtrarFavoritos() {
  const searchEl = document.getElementById('fav-search');
  renderFavLista(searchEl ? searchEl.value : '');
}

function renderFavLista(filtro = '') {
  const lista = document.getElementById('fav-lista');
  if (!lista) return;

  const fq          = filtro.toLowerCase();
  const favMuestras = muestras.filter(m => esFavorito(m.id) && m.nombre.toLowerCase().includes(fq));

  if (!favMuestras.length) {
    lista.innerHTML = `<div class="fav-vacio">${filtro ? '🔍 Sin resultados' : '⭐ No tienes favoritos aún'}</div>`;
    return;
  }

  lista.innerHTML = favMuestras.map(m => `
    <div class="fav-item" onclick="seleccionar(${m.id}); cerrarModal('modal-favoritos');">
      ${m.imagen
        ? `<img src="${m.imagen}" alt="${m.nombre}" loading="lazy">`
        : `<div class="fav-placeholder">🔬</div>`}
      <div class="fav-info">
        <div class="fav-nombre">${m.nombre}</div>
        <div class="fav-cat">${m.categoria || '—'}</div>
      </div>
      <button class="fav-quitar" onclick="event.stopPropagation(); quitarFavDesdePanel(${m.id})">✕</button>
    </div>
  `).join('');
}

//Para eliminar favorito desde el panel de favoritos sin tener que ir al detalle de la muestra
async function quitarFavDesdePanel(id) {
  try {
    const res  = await fetch(API.eliminarFavorito, {
      method: 'DELETE', headers: authHeaders(true),
      body: JSON.stringify({ idMuestra: id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error();
    favoritos = favoritos.filter(f => f !== id);
    actualizarEstrellas();
    filtrarFavoritos();
    mostrarToast('Quitado de favoritos');
  } catch { mostrarToast('Error al quitar favorito'); }
}
