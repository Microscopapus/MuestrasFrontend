
// ─────────────────────────────────────────────────────────────
//  FAVORITOS — CARGAR
// ─────────────────────────────────────────────────────────────
export async function cargarFavoritos() {
  try {
    const res  = await fetch(`${API.obtenerFavoritos}?page=1&size=100`, {
      method:  'GET',
      headers: authHeaders(),
    });
    const json = await res.json();
    console.log('[DEBUG] obtenerFavoritos — respuesta:', json);
    const raw  = json.data?.muestras || json.data || [];
    favoritos  = Array.isArray(raw) ? raw.map(m => (typeof m === 'object' ? m.id : m)) : [];
    console.log('[DEBUG] favoritos cargados (ids):', favoritos);
  } catch (err) {
    console.warn('[DEBUG] Error al cargar favoritos:', err);
    favoritos = [];
  }
}

function esFavorito(id) {
  return favoritos.includes(id);
}

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — AGREGAR
// ─────────────────────────────────────────────────────────────
export async function agregarFavorito(id, e) {
  if (e) e.stopPropagation();
  if (esFavorito(id)) return;
  try {
    const res  = await fetch(API.agregarFavorito, {
      method:  'POST',
      headers: authHeaders(true),
      body:    JSON.stringify({ idMuestra: id }),
    });
    const json = await res.json();
    console.log('[DEBUG] agregarFavorito — respuesta:', json);
    if (!json.success) throw new Error(json.mensaje);
    favoritos.push(id);
    mostrarToast('★ Agregado a favoritos');
    actualizarEstrellas();
    renderFavLista();
  } catch (err) {
    console.error('[DEBUG] Error al agregar favorito:', err);
    mostrarToast('Error al agregar favorito');
  }
}

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — ELIMINAR
// ─────────────────────────────────────────────────────────────
export async function eliminarFavoritoById(id, e) {
  if (e) e.stopPropagation();
  if (!esFavorito(id)) return;
  try {
    const res  = await fetch(API.eliminarFavorito, {
      method:  'DELETE',
      headers: authHeaders(true),
      body:    JSON.stringify({ idMuestra: id }),
    });
    const json = await res.json();
    console.log('[DEBUG] eliminarFavorito — respuesta:', json);
    if (!json.success) throw new Error(json.mensaje);
    favoritos = favoritos.filter(f => f !== id);
    mostrarToast('Quitado de favoritos');
    actualizarEstrellas();
    renderFavLista();
  } catch (err) {
    console.error('[DEBUG] Error al quitar favorito:', err);
    mostrarToast('Error al quitar favorito');
  }
}

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — TOGGLE
// ─────────────────────────────────────────────────────────────
export function toggleFavorito(id, e) {
  if (e) e.stopPropagation();
  esFavorito(id) ? eliminarFavoritoById(id, e) : agregarFavorito(id, e);
}

export function actualizarEstrellas() {
  document.querySelectorAll('.card-star').forEach(btn => {
    const id = Number(btn.dataset.id);
    btn.classList.toggle('favorito', esFavorito(id));
  });
}

// ─────────────────────────────────────────────────────────────
//  PANEL FAVORITOS
// ─────────────────────────────────────────────────────────────
export function abrirFavoritos() {
  document.getElementById('fav-search').value = '';
  renderFavLista();
  document.getElementById('panel-favoritos').classList.add('activo');
  document.getElementById('overlay').classList.add('activo');
  document.body.classList.add('menu-abierto');
}

export function cerrarFavoritos() {
  document.getElementById('panel-favoritos').classList.remove('activo');
  document.getElementById('overlay').classList.remove('activo');
  document.body.classList.remove('menu-abierto');
}

export function filtrarFavoritos() {
  const q = document.getElementById('fav-search').value;
  renderFavLista(q);
}

export function renderFavLista(filtro = '') {
  const lista       = document.getElementById('fav-lista');
  const fq          = filtro.toLowerCase();
  const favMuestras = muestras.filter(m =>
    esFavorito(m.id) && m.nombre.toLowerCase().includes(fq)
  );

  if (!favMuestras.length) {
    lista.innerHTML = `<div class="fav-vacio">${filtro ? '🔍 Sin resultados' : '⭐ No tienes favoritos aún'}</div>`;
    return;
  }

  lista.innerHTML = favMuestras.map(m => `
    <div class="fav-item" onclick="seleccionar(${m.id}); cerrarFavoritos();">
      ${m.imagen
        ? `<img src="${m.imagen}" alt="${m.nombre}" loading="lazy">`
        : `<div class="fav-item-placeholder">🔬</div>`}
      <div class="fav-item-info">
        <div class="fav-item-nombre">${m.nombre}</div>
        <div class="fav-item-cat">${m.categoria || '—'}</div>
      </div>
      <button class="fav-item-quitar"
        onclick="event.stopPropagation(); quitarFavDesdePanel(${m.id})">✕</button>
    </div>
  `).join('');
}

export async function quitarFavDesdePanel(id) {
  try {
    const res  = await fetch(API.eliminarFavorito, {
      method:  'DELETE',
      headers: authHeaders(true),
      body:    JSON.stringify({ idMuestra: id }),
    });
    const json = await res.json();
    console.log('[DEBUG] quitarFavDesdePanel — respuesta:', json);
    if (!json.success) throw new Error();
    favoritos = favoritos.filter(f => f !== id);
    actualizarEstrellas();
    filtrarFavoritos();
    mostrarToast('Quitado de favoritos');
  } catch (err) {
    console.error('[DEBUG] Error al quitar fav desde panel:', err);
    mostrarToast('Error al quitar favorito');
  }
}