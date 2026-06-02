// ─────────────────────────────────────────────────────────────
//  ENDPOINTS
// ─────────────────────────────────────────────────────────────
const API = {
  muestras:          'https://microscopiobackend-production.up.railway.app/api/muestras/obtener_muestras',
  obtener:           'https://microscopiobackend-production.up.railway.app/api/muestras/obtener_muestra',
  subirMuestra:      'https://microscopiobackend-production.up.railway.app/api/Muestras/subir_muestra',
  subirImagen:       'https://microscopiobackend-production.up.railway.app/api/Muestras/subir_imagen',
  editarMuestra:     'https://microscopiobackend-production.up.railway.app/api/Muestras/editar_muestra',
  eliminarMuestra:   'https://microscopiobackend-production.up.railway.app/api/Muestras/eliminar_muestra',
  obtenerFavoritos:  'https://microscopiobackend-production.up.railway.app/api/Muestras/obtener_favoritos',
  agregarFavorito:   'https://microscopiobackend-production.up.railway.app/api/Muestras/agregar_favorito',
  eliminarFavorito:  'https://microscopiobackend-production.up.railway.app/api/Muestras/eliminar_favorito',
  obtenerCategorias: 'https://microscopiobackend-production.up.railway.app/api/Muestras/obtener_categorias',
  catalogoFiltrado:  'https://microscopiobackend-production.up.railway.app/api/Muestras/obtener_catalogo_muestras_filtrado',
};

// ─────────────────────────────────────────────────────────────
//  ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let muestras      = [];
let categorias    = [];
let favoritos     = [];
let muestraActual = null;
let usuarioActual = null;
let crearCatId    = null;
let editarCatId   = null;
let _filtroTimer  = null;
let filtroChips   = [];

// ─────────────────────────────────────────────────────────────
//  UTILS AUTH
// ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders(json = false) {
  const h = { 'Authorization': `Bearer ${getToken()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function getUserIdDesdeToken() {
  try {
    const payload = getToken().split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id_usuario || decoded.sub || decoded.id || decoded.userId
        || decoded.nameid   || decoded.Id  || null;
  } catch { return null; }
}

function esMiMuestra(muestra) {
  if (!usuarioActual) return false;
  let dueno = muestra.userId;
  if ((dueno === null || dueno === undefined) && muestra._raw) {
    const raw = muestra._raw;
    dueno = raw.userId ?? raw.idUsuario ?? raw.creadorId ?? raw.usuarioId
          ?? raw.id_usuario ?? raw.IdUsuario ?? raw.CreadorId;
  }
  return String(dueno) === String(usuarioActual);
}

// ─────────────────────────────────────────────────────────────
//  PANTALLAS
// ─────────────────────────────────────────────────────────────
function mostrarPantalla(id) {
  ['pantalla-cargando', 'pantalla-error', 'pantalla-contenido'].forEach(p => {
    const el = document.getElementById(p);
    if (!el) return;
    el.classList.remove('activo');
  });
  const target = document.getElementById(id);
  if (target) target.classList.add('activo');
}

// ─────────────────────────────────────────────────────────────
//  CARGAR CATEGORÍAS
// ─────────────────────────────────────────────────────────────
async function cargarCategorias() {
  try {
    const res  = await fetch(API.obtenerCategorias, { method: 'GET', headers: authHeaders() });
    const json = await res.json();
    const raw  = json.data?.categorias || json.data || json.categorias || [];
    categorias = Array.isArray(raw)
      ? raw.map(c => ({
          id:     c.id   ?? c.Id   ?? c.idCategoria ?? c.IdCategoria ?? null,
          nombre: c.nombre ?? c.name ?? c.Nombre    ?? '',
        })).filter(c => c.id !== null && c.nombre !== '')
      : [];
  } catch { categorias = []; }
}

// ─────────────────────────────────────────────────────────────
//  CARGAR MUESTRAS
// ─────────────────────────────────────────────────────────────
async function cargarMuestras() {
  mostrarPantalla('pantalla-cargando');
  usuarioActual = getUserIdDesdeToken();

  // Mostrar nombre del usuario en navbar
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombre = u.nombre || u.name || u.Name || u.Nombre || '';
    const el = document.getElementById('nav-usuario-nombre');
    if (el && nombre) el.textContent = `Bienvenido, ${nombre}`;
  } catch { /* silencioso */ }

  try {
    const res  = await fetch(`${API.muestras}?page=1&size=100`, { headers: authHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    const raw = json.data?.muestras || [];
    muestras  = mapearMuestras(raw);
  } catch (err) {
    document.getElementById('error-msg').textContent = 'La conexión falló, intenta de nuevo.';
    mostrarPantalla('pantalla-error');
    return;
  }

  await Promise.all([cargarFavoritos(), cargarCategorias()]);
  buildGrid();
  mostrarPantalla('pantalla-contenido');
}

// ─────────────────────────────────────────────────────────────
//  MAPEO DE MUESTRAS
// ─────────────────────────────────────────────────────────────
function mapearMuestras(raw) {
  return raw.map(m => {
    const catsRaw = m.categorias ?? m.Categorias ?? m.categoria ?? m.Categoria ?? [];
    let categoriaNombre = '';
    let categoriaId     = null;

    if (Array.isArray(catsRaw) && catsRaw.length > 0) {
      const primera = catsRaw[0];
      if (typeof primera === 'object' && primera !== null) {
        categoriaNombre = primera.nombre ?? primera.Nombre ?? primera.name ?? '';
        categoriaId     = primera.id     ?? primera.Id     ?? primera.idCategoria ?? null;
      } else {
        categoriaNombre = String(primera);
      }
    } else if (typeof catsRaw === 'string' && catsRaw) {
      categoriaNombre = catsRaw;
    }

    return {
      id:          m.id,
      nombre:      m.nombre      || 'Sin nombre',
      categoria:   categoriaNombre,
      categoriaId: categoriaId,
      descripcion: m.descripcion || '',
      imagen:      m.imagenes?.[0]?.url || null,
      userId:      m.userId ?? m.idUsuario ?? m.creadorId ?? m.usuarioId
                ?? m.id_usuario ?? m.IdUsuario ?? m.CreadorId ?? null,
      _raw: m,
    };
  });
}

// ─────────────────────────────────────────────────────────────
//  BÚSQUEDA POR NOMBRE
// ─────────────────────────────────────────────────────────────
function filtrarPorNombre(valor) {
  if (!filtroChips.length) {
    const q = valor.toLowerCase().trim();
    const lista = q ? muestras.filter(m => m.nombre.toLowerCase().includes(q)) : muestras;
    buildGrid(lista);
  }
}

// ─────────────────────────────────────────────────────────────
//  FILTRO POR CATEGORÍA — CHIPS
// ─────────────────────────────────────────────────────────────
function onCatFiltroInput(valor) {
  clearTimeout(_filtroTimer);
  _filtroTimer = setTimeout(() => mostrarSugerenciasFiltro(valor), 200);
}

function mostrarSugerenciasFiltro(texto) {
  const lista = document.getElementById('cat-filtro-lista');
  const q     = texto.trim().toLowerCase();

  if (!q || !categorias.length) {
    lista.innerHTML = '';
    lista.classList.remove('visible');
    return;
  }

  const yaSeleccionadas = new Set(filtroChips.map(c => c.id));
  const coincidencias   = categorias.filter(
    c => c.nombre.toLowerCase().includes(q) && !yaSeleccionadas.has(c.id)
  );

  if (!coincidencias.length) { lista.innerHTML = ''; lista.classList.remove('visible'); return; }

  lista.innerHTML = coincidencias.map(c =>
    `<div class="autocomplete-item"
          onmousedown="event.preventDefault()"
          onclick="agregarChipFiltro(${c.id}, '${c.nombre.replace(/'/g, "\\'")}')">
       ${c.nombre}
     </div>`
  ).join('');
  lista.classList.add('visible');
}

function agregarChipFiltro(id, nombre) {
  if (filtroChips.some(c => c.id === id)) return;
  filtroChips.push({ id, nombre });
  document.getElementById('cat-filtro').value = '';
  document.getElementById('cat-filtro-lista').classList.remove('visible');
  renderChipsFiltro();
  ejecutarFiltroCatalogo();
}

function quitarChipFiltro(id) {
  filtroChips = filtroChips.filter(c => c.id !== id);
  renderChipsFiltro();
  ejecutarFiltroCatalogo();
}

function renderChipsFiltro() {
  const contenedor = document.getElementById('cat-chips');
  if (!contenedor) return;
  contenedor.innerHTML = filtroChips.map(c =>
    `<span class="chip">
       ${c.nombre}
       <button onmousedown="event.preventDefault()" onclick="quitarChipFiltro(${c.id})">✕</button>
     </span>`
  ).join('');
}

async function ejecutarFiltroCatalogo() {
  if (!filtroChips.length) {
    buildGrid(muestras);
    return;
  }
  try {
    const params = new URLSearchParams({ page: 1, size: 100 });
    filtroChips.forEach(c => params.append('categorias', c.id));
    const res   = await fetch(`${API.catalogoFiltrado}?${params}`, { headers: authHeaders() });
    const json  = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    const raw  = json.data?.muestras || json.data || [];
    buildGrid(mapearMuestras(raw));
  } catch { buildGrid([]); }
}

// ─────────────────────────────────────────────────────────────
//  AUTOCOMPLETE CATEGORÍAS (crear / editar)
// ─────────────────────────────────────────────────────────────
function sugerirCat(prefijo) {
  const input = document.getElementById(`${prefijo}-cat-texto`);
  const lista = document.getElementById(`${prefijo}-cat-lista`);
  const q     = input.value.trim().toLowerCase();

  if (prefijo === 'crear') crearCatId = null;
  else editarCatId = null;

  if (!q || !categorias.length) { lista.innerHTML = ''; lista.classList.remove('visible'); return; }

  const coincidencias = categorias.filter(c => c.nombre.toLowerCase().includes(q));
  if (!coincidencias.length) { lista.innerHTML = ''; lista.classList.remove('visible'); return; }

  lista.innerHTML = coincidencias.map(c =>
    `<div class="autocomplete-item"
          onmousedown="event.preventDefault()"
          onclick="seleccionarCat('${prefijo}', ${c.id}, '${c.nombre.replace(/'/g, "\\'")}')">
       ${c.nombre}
     </div>`
  ).join('');
  lista.classList.add('visible');
}

function seleccionarCat(prefijo, id, nombre) {
  document.getElementById(`${prefijo}-cat-texto`).value = nombre;
  document.getElementById(`${prefijo}-cat-lista`).classList.remove('visible');
  if (prefijo === 'crear') crearCatId = id;
  else editarCatId = id;
}

function cerrarAutocompletes() {
  document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('visible'));
}

document.addEventListener('click', function (e) {
  if (!e.target.closest('.autocomplete-wrap')) cerrarAutocompletes();
});

// ─────────────────────────────────────────────────────────────
//  FAVORITOS
// ─────────────────────────────────────────────────────────────
async function cargarFavoritos() {
  try {
    const res  = await fetch(`${API.obtenerFavoritos}?page=1&size=100`, { method: 'GET', headers: authHeaders() });
    const json = await res.json();
    const raw  = json.data?.muestras || json.data || [];
    favoritos  = Array.isArray(raw) ? raw.map(m => (typeof m === 'object' ? m.id : m)) : [];
  } catch { favoritos = []; }
}

function esFavorito(id) { return favoritos.includes(id); }

async function agregarFavorito(id, e) {
  if (e) e.stopPropagation();
  if (esFavorito(id)) return;
  try {
    const res  = await fetch(API.agregarFavorito, { method: 'POST', headers: authHeaders(true), body: JSON.stringify({ idMuestra: id }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    favoritos.push(id);
    mostrarToast('★ Agregado a favoritos');
    actualizarEstrellas();
  } catch { mostrarToast('Error al agregar favorito'); }
}

async function eliminarFavoritoById(id, e) {
  if (e) e.stopPropagation();
  if (!esFavorito(id)) return;
  try {
    const res  = await fetch(API.eliminarFavorito, { method: 'DELETE', headers: authHeaders(true), body: JSON.stringify({ idMuestra: id }) });
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

function actualizarEstrellas() {
  document.querySelectorAll('.card-star').forEach(btn => {
    btn.classList.toggle('favorito', esFavorito(Number(btn.dataset.id)));
  });
}

// ─────────────────────────────────────────────────────────────
//  PANEL FAVORITOS (MODAL)
// ─────────────────────────────────────────────────────────────
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

async function quitarFavDesdePanel(id) {
  try {
    const res  = await fetch(API.eliminarFavorito, { method: 'DELETE', headers: authHeaders(true), body: JSON.stringify({ idMuestra: id }) });
    const json = await res.json();
    if (!json.success) throw new Error();
    favoritos = favoritos.filter(f => f !== id);
    actualizarEstrellas();
    filtrarFavoritos();
    mostrarToast('Quitado de favoritos');
  } catch { mostrarToast('Error al quitar favorito'); }
}

// ─────────────────────────────────────────────────────────────
//  GRID
// ─────────────────────────────────────────────────────────────
function buildGrid(lista = muestras) {
  const grid = document.getElementById('menu-grid');
  const countEl = document.getElementById('count-num');
  grid.innerHTML = '';
  if (countEl) countEl.textContent = lista.length;

  if (!lista.length) {
    grid.innerHTML = '<p class="grid-vacio">Sin resultados</p>';
    return;
  }

  lista.forEach(m => {
    const card     = document.createElement('div');
    card.className = 'menu-card';
    card.id        = 'card-' + m.id;
    card.onclick   = () => seleccionar(m.id);

    const star      = document.createElement('button');
    star.className  = 'card-star' + (esFavorito(m.id) ? ' favorito' : '');
    star.innerHTML  = '★';
    star.dataset.id = m.id;
    star.onclick    = (e) => toggleFavorito(m.id, e);
    card.appendChild(star);

    if (m.imagen) {
      const img     = document.createElement('img');
      img.src       = m.imagen;
      img.alt       = m.nombre;
      img.className = 'card-img';
      img.loading   = 'lazy';
      card.appendChild(img);
    } else {
      const ph       = document.createElement('div');
      ph.className   = 'card-placeholder';
      ph.textContent = '🔬';
      card.appendChild(ph);
    }

    const nombre       = document.createElement('div');
    nombre.className   = 'card-nombre';
    nombre.textContent = m.nombre.length > 13 ? m.nombre.slice(0, 12) + '…' : m.nombre;
    card.appendChild(nombre);

    if (m.categoria) {
      const cat       = document.createElement('div');
      cat.className   = 'card-cat';
      cat.textContent = m.categoria;
      card.appendChild(cat);
    }

    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────
//  SELECCIONAR MUESTRA
// ─────────────────────────────────────────────────────────────
function actualizarBotonesCrud(m) {
  const btnEditar   = document.querySelector('.btn-editar');
  const btnEliminar = document.querySelector('.btn-eliminar');
  const tienePermiso = m && usuarioActual && esMiMuestra(m);
  if (btnEditar)   btnEditar.style.display   = tienePermiso ? '' : 'none';
  if (btnEliminar) btnEliminar.style.display = tienePermiso ? '' : 'none';
}

function seleccionar(id) {
  const m = muestras.find(x => x.id === id);
  if (!m) return;
  muestraActual = m;

  document.querySelectorAll('.menu-card').forEach(c => c.classList.remove('activo'));
  document.getElementById('card-' + id)?.classList.add('activo');

  document.getElementById('detalle-vacio').style.display   = 'none';
  document.getElementById('detalle-muestra').style.display = 'flex';

  const contenedor = document.getElementById('detalle-imagen');
  contenedor.innerHTML = '';
  if (m.imagen) {
    const img = document.createElement('img');
    img.src   = m.imagen;
    img.alt   = m.nombre;
    contenedor.appendChild(img);
  } else {
    contenedor.innerHTML = '<div class="img-placeholder-grande">🔬</div>';
  }

  document.getElementById('detalle-nombre').textContent = m.nombre;
  document.getElementById('detalle-desc').textContent   = m.descripcion;

  const badge = document.getElementById('detalle-cat');
  if (m.categoria) {
    badge.textContent   = m.categoria;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }

  actualizarBotonesCrud(m);
}

// ─────────────────────────────────────────────────────────────
//  CRUD — CREAR
// ─────────────────────────────────────────────────────────────
function abrirModalCrear() {
  document.getElementById('crear-nombre').value    = '';
  document.getElementById('crear-desc').value      = '';
  document.getElementById('crear-cat-texto').value = '';
  document.getElementById('crear-cat-lista').classList.remove('visible');
  crearCatId = null;

  const container = document.getElementById('imagenes-container');
  if (container) { container.innerHTML = ''; container.appendChild(crearBloqueImagen()); }

  abrirModal('modal-crear');
}

function crearBloqueImagen() {
  const bloque = document.createElement('div');
  bloque.className = 'imagen-item';
  bloque.innerHTML = `
    <div class="imagen-preview">🔍</div>
    <div class="imagen-item-controls">
      <input type="number" class="crear-objetivo" placeholder="Objetivo" min="0">
      <label class="file-label">
        <span>Seleccionar imagen</span>
        <input type="file" class="crear-img" accept="image/*">
      </label>
      <button type="button" class="btn-remove-img">✕ Quitar imagen</button>
    </div>
  `;
  prepararCampoImagen(bloque);
  return bloque;
}

function prepararCampoImagen(bloque) {
  const fileInput = bloque.querySelector('.crear-img');
  const preview   = bloque.querySelector('.imagen-preview');
  const remover   = bloque.querySelector('.btn-remove-img');

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      const archivo = this.files[0];
      preview.innerHTML = archivo ? `<img src="${URL.createObjectURL(archivo)}" alt="Vista previa">` : '🔍';
    });
  }

  if (remover) {
    remover.addEventListener('click', function () {
      const contenedor = document.getElementById('imagenes-container');
      if (!contenedor) return;
      bloque.remove();
      if (!contenedor.querySelector('.imagen-item')) contenedor.appendChild(crearBloqueImagen());
    });
  }
}

async function subirMuestra() {
  const nombre = document.getElementById('crear-nombre').value.trim();
  const desc   = document.getElementById('crear-desc').value.trim();
  if (!nombre) { mostrarToast('El nombre es obligatorio'); return; }

  const fd = new FormData();
  fd.append('Nombre', nombre);
  fd.append('Descripcion', desc);
  if (crearCatId !== null) fd.append('Categorias', crearCatId);

  let idMuestraCreada = null;

  try {
    const res  = await fetch(API.subirMuestra, { method: 'POST', headers: authHeaders(), body: fd });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    idMuestraCreada = json.data?.id ?? json.data?.idMuestra ?? json.data?.Id ?? null;
    mostrarToast('Muestra creada');
  } catch (err) {
    mostrarToast('Error al crear muestra: ' + err.message);
    return;
  }

  const bloques = document.querySelectorAll('.imagen-item');
  for (const bloque of bloques) {
    const objetivoInput = bloque.querySelector('.crear-objetivo');
    const fileInput     = bloque.querySelector('.crear-img');
    const objetivo      = parseInt(objetivoInput.value, 10);
    const archivo       = fileInput.files[0];
    if (!archivo) continue;
    if (isNaN(objetivo)) { mostrarToast('Una imagen no tiene objetivo'); continue; }
    try {
      const fdImg = new FormData();
      fdImg.append('IdMuestra', idMuestraCreada);
      fdImg.append('Objetivo', objetivo);
      fdImg.append('File', archivo);
      const resImg  = await fetch(API.subirImagen, { method: 'POST', headers: authHeaders(), body: fdImg });
      const jsonImg = await resImg.json();
      if (!jsonImg.success) throw new Error(jsonImg.mensaje);
    } catch (err) {
      mostrarToast(`Error subiendo ${archivo.name}: ${err.message}`);
    }
  }

  mostrarToast('Proceso completado');
  cerrarModal('modal-crear');
  await cargarMuestras();
}

function agregarCampoImagen() {
  const container = document.getElementById('imagenes-container');
  if (container) container.appendChild(crearBloqueImagen());
}

// ─────────────────────────────────────────────────────────────
//  CRUD — EDITAR
// ─────────────────────────────────────────────────────────────
function abrirModalEditar() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para editar esta muestra'); return; }

  document.getElementById('editar-nombre').value    = muestraActual.nombre;
  document.getElementById('editar-desc').value      = muestraActual.descripcion;
  document.getElementById('editar-cat-texto').value = muestraActual.categoria || '';
  document.getElementById('editar-cat-lista').classList.remove('visible');

  if (muestraActual.categoriaId !== null && muestraActual.categoriaId !== undefined) {
    editarCatId = muestraActual.categoriaId;
  } else {
    const catExistente = categorias.find(c => c.nombre.toLowerCase() === (muestraActual.categoria || '').toLowerCase());
    editarCatId = catExistente ? catExistente.id : null;
  }

  abrirModal('modal-editar');
}

async function editarMuestra() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para editar esta muestra'); return; }

  const nombre = document.getElementById('editar-nombre').value.trim();
  const desc   = document.getElementById('editar-desc').value.trim();
  if (!nombre) { mostrarToast('El nombre es obligatorio'); return; }

  const body = {
    idMuestra:   muestraActual.id,
    nombre,
    descripcion: desc,
    categorias:  editarCatId !== null ? [editarCatId] : [],
    imagenes:    [],
  };

  try {
    const res  = await fetch(API.editarMuestra, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify(body) });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    mostrarToast('Muestra actualizada');
    cerrarModal('modal-editar');
    await cargarMuestras();
    seleccionar(muestraActual.id);
  } catch (err) {
    mostrarToast('Error al editar: ' + err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  CRUD — ELIMINAR
// ─────────────────────────────────────────────────────────────
function confirmarEliminar() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para eliminar esta muestra'); return; }
  document.getElementById('eliminar-nombre-label').textContent = `"${muestraActual.nombre}"`;
  abrirModal('modal-eliminar');
}

async function eliminarMuestra() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para eliminar esta muestra'); return; }

  const idEliminar = muestraActual.id;

  try {
    const res  = await fetch(API.eliminarMuestra, { method: 'DELETE', headers: authHeaders(true), body: JSON.stringify({ idMuestra: idEliminar }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    mostrarToast('Muestra eliminada');
    cerrarModal('modal-eliminar');
    muestraActual = null;
    document.getElementById('detalle-muestra').style.display = 'none';
    document.getElementById('detalle-vacio').style.display   = 'flex';
    favoritos = favoritos.filter(f => f !== idEliminar);
    await cargarMuestras();
  } catch (err) {
    mostrarToast('Error al eliminar: ' + err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  MODALES
// ─────────────────────────────────────────────────────────────
function abrirModal(id) {
  document.getElementById(id).classList.add('activo');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('activo');
  cerrarAutocompletes();
}

document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', function (e) {
    if (e.target === this) { this.classList.remove('activo'); cerrarAutocompletes(); }
  });
});

// ─────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────
let _toastTimer;
function mostrarToast(msg) {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id        = '_toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
}

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('imagenes-container');
  if (container) {
    const items = container.querySelectorAll('.imagen-item');
    if (items.length) items.forEach(prepararCampoImagen);
    else container.appendChild(crearBloqueImagen());
  }
});

cargarMuestras();