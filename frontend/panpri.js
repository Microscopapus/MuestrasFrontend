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
let categorias    = [];   // [{ id, nombre }] — se carga al inicio
let favoritos     = [];
let muestraActual = null;
let usuarioActual = null;

// IDs de categoría seleccionados en los modales
let crearCatId    = null;
let editarCatId   = null;

// Timer para debounce del filtro de catálogo
let _filtroTimer  = null;

// Chips de categorías seleccionadas en el filtro del catálogo
// [{ id, nombre }]
let filtroChips   = [];

// ─────────────────────────────────────────────────────────────
//  UTILS AUTH
// ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders(json = false) {
  const token = getToken();
  const h = { 'Authorization': `Bearer ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function getUserIdDesdeToken() {
  try {
    const token   = getToken();
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id_usuario || decoded.sub || decoded.id || decoded.userId
        || decoded.nameid   || decoded.Id  || null;
  } catch {
    return null;
  }
}

function esMiMuestra(muestra) {
  if (!usuarioActual) {
    console.warn('[DEBUG] esMiMuestra: usuarioActual es null — revisa el claim del JWT');
    return false;
  }
  let dueno = muestra.userId;
  if ((dueno === null || dueno === undefined) && muestra._raw) {
    const raw = muestra._raw;
    dueno = raw.userId ?? raw.idUsuario ?? raw.creadorId ?? raw.usuarioId
          ?? raw.id_usuario ?? raw.IdUsuario ?? raw.CreadorId;
    console.log('[DEBUG] esMiMuestra — campos del raw:', Object.keys(raw));
  }
  console.log('[DEBUG] esMiMuestra → dueno:', dueno, '| usuarioActual:', usuarioActual);
  return String(dueno) === String(usuarioActual);
}

// ─────────────────────────────────────────────────────────────
//  PANTALLAS
// ─────────────────────────────────────────────────────────────
function mostrarPantalla(id) {
  ['pantalla-cargando', 'pantalla-error', 'pantalla-contenido']
    .forEach(p => { document.getElementById(p).style.display = 'none'; });
  document.getElementById(id).style.display = 'flex';
}

// ─────────────────────────────────────────────────────────────
//  CARGAR CATEGORÍAS (POST sin parámetros)
// ─────────────────────────────────────────────────────────────
async function cargarCategorias() {
  try {
    const res  = await fetch(API.obtenerCategorias, {
      method:  'GET',
      headers: authHeaders(),
    });
    const json = await res.json();
    console.log('[DEBUG] obtenerCategorias — respuesta completa:', json);

    // El backend puede devolver el array de varias formas
    const raw = json.data?.categorias || json.data || json.categorias || [];
    console.log('[DEBUG] obtenerCategorias — raw array:', raw);

    categorias = Array.isArray(raw)
      ? raw.map(c => ({
          id:     c.id   ?? c.Id   ?? c.idCategoria ?? c.IdCategoria ?? null,
          nombre: c.nombre ?? c.name ?? c.Nombre    ?? '',
        })).filter(c => c.id !== null && c.nombre !== '')
      : [];
    console.log('[DEBUG] Categorías mapeadas:', categorias);
  } catch (err) {
    console.warn('[DEBUG] No se pudieron cargar categorías:', err);
    categorias = [];
  }
}

// ─────────────────────────────────────────────────────────────
//  CARGAR MUESTRAS
// ─────────────────────────────────────────────────────────────
async function cargarMuestras() {
  mostrarPantalla('pantalla-cargando');
  usuarioActual = getUserIdDesdeToken();

  try {
    const res  = await fetch(`${API.muestras}?page=1&size=100`, { headers: authHeaders() });
    const json = await res.json();
    console.log('[DEBUG] obtenerMuestras — respuesta completa:', json);
    if (!json.success) throw new Error(json.mensaje);

    const raw = json.data?.muestras || [];

    if (raw.length > 0) {
      console.log('[DEBUG] Primera muestra raw completa:', raw[0]);
      console.log('[DEBUG] Campos de la primera muestra:', Object.keys(raw[0]));
      // Log específico del campo categorias para ver su estructura
      console.log('[DEBUG] raw[0].categorias:', raw[0].categorias);
      console.log('[DEBUG] raw[0].categoria:', raw[0].categoria);
    }
    console.log('[DEBUG] usuarioActual desde token:', usuarioActual);

    muestras = mapearMuestras(raw);
    console.log('[DEBUG] Primera muestra mapeada:', muestras[0]);
  } catch (err) {
    console.error('[DEBUG] Error al cargar muestras:', err);
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
//  PUNTO CLAVE: el backend devuelve "categorias" (plural, array)
//  no "categoria" (singular, string). Por eso nunca aparecía.
// ─────────────────────────────────────────────────────────────
function mapearMuestras(raw) {
  return raw.map(m => {
    // Extraer el array de categorías del backend (puede venir de varias formas)
    const catsRaw = m.categorias ?? m.Categorias ?? m.categoria ?? m.Categoria ?? [];

    // Si es array de objetos → agarrar el primer nombre
    // Si es array de strings → agarrar el primero
    // Si es string directo → usarlo tal cual
    let categoriaNombre = '';
    let categoriaId     = null;

    if (Array.isArray(catsRaw) && catsRaw.length > 0) {
      const primera = catsRaw[0];
      if (typeof primera === 'object' && primera !== null) {
        categoriaNombre = primera.nombre ?? primera.Nombre ?? primera.name ?? '';
        categoriaId     = primera.id     ?? primera.Id     ?? primera.idCategoria ?? null;
      } else {
        // Es string directo dentro del array
        categoriaNombre = String(primera);
      }
    } else if (typeof catsRaw === 'string' && catsRaw) {
      categoriaNombre = catsRaw;
    }

    console.log(`[DEBUG] Muestra id=${m.id} — catsRaw:`, catsRaw, '→ nombre:', categoriaNombre, '| id:', categoriaId);

    return {
      id:            m.id,
      nombre:        m.nombre      || 'Sin nombre',
      // Guardamos el nombre de la primera categoría para mostrar en UI
      categoria:     categoriaNombre,
      // Guardamos el id de la primera categoría para pre-llenar el modal editar
      categoriaId:   categoriaId,
      descripcion:   m.descripcion || '',
      imagen:        m.imagenes?.[0]?.url || null,
      userId:        m.userId ?? m.idUsuario ?? m.creadorId ?? m.usuarioId
                  ?? m.id_usuario ?? m.IdUsuario ?? m.CreadorId ?? null,
      _raw: m,
    };
  });
}

// ─────────────────────────────────────────────────────────────
//  FILTRAR CATÁLOGO — SISTEMA DE CHIPS MULTI-CATEGORÍA
// ─────────────────────────────────────────────────────────────

// Muestra el autocomplete del filtro mientras el usuario escribe
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

  // Excluir las que ya están como chip
  const yaSeleccionadas = new Set(filtroChips.map(c => c.id));
  const coincidencias   = categorias.filter(
    c => c.nombre.toLowerCase().includes(q) && !yaSeleccionadas.has(c.id)
  );

  if (!coincidencias.length) {
    lista.innerHTML = '';
    lista.classList.remove('visible');
    return;
  }

  lista.innerHTML = coincidencias.map(c =>
    `<div class="autocomplete-item"
          onmousedown="event.preventDefault()"
          onclick="agregarChipFiltro(${c.id}, '${c.nombre.replace(/'/g, "\\'")}')">
       ${c.nombre}
     </div>`
  ).join('');
  lista.classList.add('visible');
}

// Agrega un chip al filtro y lanza la búsqueda
function agregarChipFiltro(id, nombre) {
  // Evitar duplicados
  if (filtroChips.some(c => c.id === id)) return;

  filtroChips.push({ id, nombre });
  document.getElementById('cat-filtro').value = '';
  document.getElementById('cat-filtro-lista').classList.remove('visible');
  renderChipsFiltro();
  ejecutarFiltroCatalogo();
  console.log('[DEBUG] agregarChipFiltro — chips actuales:', filtroChips);
}

// Elimina un chip y re-lanza la búsqueda
function quitarChipFiltro(id) {
  filtroChips = filtroChips.filter(c => c.id !== id);
  renderChipsFiltro();
  ejecutarFiltroCatalogo();
  console.log('[DEBUG] quitarChipFiltro — chips actuales:', filtroChips);
}

// Dibuja los chips en el contenedor del HTML
function renderChipsFiltro() {
  const contenedor = document.getElementById('cat-chips');
  if (!contenedor) return;
  contenedor.innerHTML = filtroChips.map(c =>
    `<span class="cat-chip">
       ${c.nombre}
       <button onmousedown="event.preventDefault()" onclick="quitarChipFiltro(${c.id})">✕</button>
     </span>`
  ).join('');
}

// Llama al endpoint con todos los IDs de chips, o muestra todo si no hay chips
async function ejecutarFiltroCatalogo() {
  // Sin chips → todo el catálogo
  if (!filtroChips.length) {
    buildGrid(muestras);
    return;
  }

  try {
    const params = new URLSearchParams({ page: 1, size: 100 });
    filtroChips.forEach(c => params.append('categorias', c.id));
    console.log('[DEBUG] ejecutarFiltroCatalogo — params:', params.toString());

    const res  = await fetch(`${API.catalogoFiltrado}?${params}`, { headers: authHeaders() });
    const json = await res.json();
    console.log('[DEBUG] catalogoFiltrado — respuesta:', json);
    if (!json.success) throw new Error(json.mensaje);

    const raw      = json.data?.muestras || json.data || [];
    const filtradas = mapearMuestras(raw);
    buildGrid(filtradas);
  } catch (err) {
    console.warn('[DEBUG] Error al filtrar catálogo:', err);
    buildGrid([]);
  }
}

// ─────────────────────────────────────────────────────────────
//  AUTOCOMPLETE DE CATEGORÍAS (crear / editar)
// ─────────────────────────────────────────────────────────────
function sugerirCat(prefijo) {
  const input  = document.getElementById(`${prefijo}-cat-texto`);
  const lista  = document.getElementById(`${prefijo}-cat-lista`);
  const q      = input.value.trim().toLowerCase();

  // Resetear el ID seleccionado si el usuario está editando el texto
  if (prefijo === 'crear') crearCatId = null;
  else editarCatId = null;

  if (!q || !categorias.length) {
    lista.innerHTML = '';
    lista.classList.remove('visible');
    return;
  }

  const coincidencias = categorias.filter(c => c.nombre.toLowerCase().includes(q));
  console.log('[DEBUG] sugerirCat prefijo=' + prefijo + ' q=' + q + ' coincidencias:', coincidencias);

  if (!coincidencias.length) {
    lista.innerHTML = '';
    lista.classList.remove('visible');
    return;
  }

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
  else                     editarCatId = id;
  console.log(`[DEBUG] seleccionarCat — prefijo:${prefijo} id:${id} nombre:${nombre}`);
}

function cerrarAutocompletes() {
  document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('visible'));
}

// Cierra el autocomplete al hacer click fuera
document.addEventListener('click', function (e) {
  if (!e.target.closest('.autocomplete-wrap')) cerrarAutocompletes();
});

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — CARGAR
// ─────────────────────────────────────────────────────────────
async function cargarFavoritos() {
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
async function agregarFavorito(id, e) {
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
async function eliminarFavoritoById(id, e) {
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
function toggleFavorito(id, e) {
  if (e) e.stopPropagation();
  esFavorito(id) ? eliminarFavoritoById(id, e) : agregarFavorito(id, e);
}

function actualizarEstrellas() {
  document.querySelectorAll('.card-star').forEach(btn => {
    const id = Number(btn.dataset.id);
    btn.classList.toggle('favorito', esFavorito(id));
  });
}

// ─────────────────────────────────────────────────────────────
//  PANEL FAVORITOS
// ─────────────────────────────────────────────────────────────
function abrirFavoritos() {
  document.getElementById('fav-search').value = '';
  renderFavLista();
  document.getElementById('panel-favoritos').classList.add('activo');
  document.getElementById('overlay').classList.add('activo');
  document.body.classList.add('menu-abierto');
}

function cerrarFavoritos() {
  document.getElementById('panel-favoritos').classList.remove('activo');
  document.getElementById('overlay').classList.remove('activo');
  document.body.classList.remove('menu-abierto');
}

function filtrarFavoritos() {
  const q = document.getElementById('fav-search').value;
  renderFavLista(q);
}

function renderFavLista(filtro = '') {
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

async function quitarFavDesdePanel(id) {
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

// ─────────────────────────────────────────────────────────────
//  GRID DEL MENÚ
// ─────────────────────────────────────────────────────────────
function buildGrid(lista = muestras) {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

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

    // ── CATEGORÍA EN LA CARD (era el bug principal: m.categoria no existía) ──
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
//  MENÚ (catálogo)
// ─────────────────────────────────────────────────────────────
function abrirMenu() {
  const input = document.getElementById('cat-filtro');
  if (input) input.value = '';
  // Limpiar chips y autocomplete al abrir
  filtroChips = [];
  renderChipsFiltro();
  document.getElementById('cat-filtro-lista')?.classList.remove('visible');
  buildGrid(muestras);

  document.getElementById('menu').classList.add('activo');
  document.getElementById('overlay').classList.add('activo');
  document.body.classList.add('menu-abierto');
}

function cerrarMenu() {
  document.getElementById('menu').classList.remove('activo');
  document.getElementById('overlay').classList.remove('activo');
  document.body.classList.remove('menu-abierto');
}

function cerrarTodo() {
  cerrarMenu();
  cerrarFavoritos();
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
  console.log('[DEBUG] seleccionar muestra:', m);

  document.querySelectorAll('.menu-card').forEach(c => c.classList.remove('activo'));
  document.getElementById('card-' + id)?.classList.add('activo');

  document.getElementById('detalle-vacio').style.display   = 'none';
  document.getElementById('detalle-muestra').style.display = 'flex';

  const contenedor     = document.getElementById('detalle-imagen');
  contenedor.innerHTML = '';
  if (m.imagen) {
    const img = document.createElement('img');
    img.src   = m.imagen;
    img.alt   = m.nombre;
    contenedor.appendChild(img);
  }

  document.getElementById('detalle-nombre').textContent = m.nombre;
  document.getElementById('detalle-desc').textContent   = m.descripcion;

  // Badge de categoría
  const badge = document.getElementById('detalle-cat');
  if (m.categoria) {
    badge.textContent   = m.categoria;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }

  actualizarBotonesCrud(m);
  cerrarMenu();
}

// ─────────────────────────────────────────────────────────────
//  CRUD — CREAR MUESTRA
//  Son 2 llamadas separadas: subirMuestra + subirImagen
// ─────────────────────────────────────────────────────────────
function abrirModalCrear() {
  document.getElementById('crear-nombre').value      = '';
  document.getElementById('crear-desc').value        = '';
  document.getElementById('crear-objetivo').value    = '';
  document.getElementById('crear-img').value         = '';
  document.getElementById('crear-preview').innerHTML = '';
  document.getElementById('crear-cat-texto').value   = '';
  document.getElementById('crear-cat-lista').classList.remove('visible');
  crearCatId = null;
  abrirModal('modal-crear');
}

document.getElementById('crear-img').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  document.getElementById('crear-preview').innerHTML = `<img src="${url}" alt="preview">`;
});

async function subirMuestra() {
  const nombre   = document.getElementById('crear-nombre').value.trim();
  const desc     = document.getElementById('crear-desc').value.trim();
  const objetivo = parseInt(document.getElementById('crear-objetivo').value, 10);
  const imgFile  = document.getElementById('crear-img').files[0];

  if (!nombre)         { mostrarToast('El nombre es obligatorio'); return; }
  if (isNaN(objetivo)) { mostrarToast('El objetivo es obligatorio'); return; }

  // ── Llamada 1: subir_muestra (multipart/form-data) ──
  const fd = new FormData();
  fd.append('Nombre',      nombre);
  fd.append('Descripcion', desc);
  // El campo en el backend se llama "Categorias" (plural, array)
  if (crearCatId !== null) fd.append('Categorias', crearCatId);

  console.log('[DEBUG] subirMuestra — FormData Nombre:', nombre, '| Descripcion:', desc, '| Categorias:', crearCatId);

  let idMuestraCreada = null;

  try {
    const res  = await fetch(API.subirMuestra, {
      method:  'POST',
      headers: authHeaders(),   // sin Content-Type para que el browser ponga el boundary
      body:    fd,
    });
    const json = await res.json();
    console.log('[DEBUG] subirMuestra — respuesta:', json);
    if (!json.success) throw new Error(json.mensaje);
    idMuestraCreada = json.data?.id ?? json.data?.idMuestra ?? json.data?.Id ?? null;
    console.log('[DEBUG] subirMuestra — idMuestraCreada:', idMuestraCreada);
    mostrarToast('✅ Muestra creada');
  } catch (err) {
    console.error('[DEBUG] Error en subirMuestra:', err);
    mostrarToast('Error al crear muestra: ' + err.message);
    return;
  }

  // ── Llamada 2: subir_imagen (multipart/form-data) — solo si hay imagen e id ──
  if (imgFile && idMuestraCreada) {
    try {
      const fdImg = new FormData();
      fdImg.append('IdMuestra', idMuestraCreada);
      fdImg.append('Objetivo',  objetivo);
      fdImg.append('File',      imgFile);

      console.log('[DEBUG] subirImagen — IdMuestra:', idMuestraCreada, '| Objetivo:', objetivo, '| File:', imgFile.name);

      const resImg  = await fetch(API.subirImagen, {
        method:  'POST',
        headers: authHeaders(),
        body:    fdImg,
      });
      const jsonImg = await resImg.json();
      console.log('[DEBUG] subirImagen — respuesta:', jsonImg);
      if (!jsonImg.success) throw new Error(jsonImg.mensaje);
      mostrarToast('✅ Imagen subida correctamente');
    } catch (err) {
      console.error('[DEBUG] Error en subirImagen:', err);
      mostrarToast('Muestra creada pero falló la imagen: ' + err.message);
    }
  }

  cerrarModal('modal-crear');
  await cargarMuestras();
}

// ─────────────────────────────────────────────────────────────
//  CRUD — EDITAR MUESTRA
// ─────────────────────────────────────────────────────────────
function abrirModalEditar() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para editar esta muestra');
    return;
  }

  document.getElementById('editar-nombre').value    = muestraActual.nombre;
  document.getElementById('editar-desc').value      = muestraActual.descripcion;
  document.getElementById('editar-cat-texto').value = muestraActual.categoria || '';
  document.getElementById('editar-cat-lista').classList.remove('visible');

  // Pre-cargar el id de categoría:
  // 1. Si ya lo guardamos en categoriaId durante el mapeo, usarlo directamente
  // 2. Si no, buscar por nombre en el array de categorías
  if (muestraActual.categoriaId !== null && muestraActual.categoriaId !== undefined) {
    editarCatId = muestraActual.categoriaId;
  } else {
    const catExistente = categorias.find(
      c => c.nombre.toLowerCase() === (muestraActual.categoria || '').toLowerCase()
    );
    editarCatId = catExistente ? catExistente.id : null;
  }

  console.log('[DEBUG] abrirModalEditar — editarCatId:', editarCatId, '| categoria:', muestraActual.categoria);
  abrirModal('modal-editar');
}

async function editarMuestra() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para editar esta muestra');
    return;
  }

  const nombre = document.getElementById('editar-nombre').value.trim();
  const desc   = document.getElementById('editar-desc').value.trim();

  if (!nombre) { mostrarToast('El nombre es obligatorio'); return; }

  const body = {
    idMuestra:   muestraActual.id,
    nombre,
    descripcion: desc,
    // El backend espera "categorias" (plural) como array de ints
    categorias:  editarCatId !== null ? [editarCatId] : [],
    imagenes:    [],
  };

  console.log('[DEBUG] editarMuestra — body:', JSON.stringify(body));

  try {
    const res  = await fetch(API.editarMuestra, {
      method:  'PUT',
      headers: authHeaders(true),
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    console.log('[DEBUG] editarMuestra — respuesta:', json);
    if (!json.success) throw new Error(json.mensaje);

    mostrarToast('✅ Muestra actualizada');
    cerrarModal('modal-editar');
    await cargarMuestras();
    seleccionar(muestraActual.id);
  } catch (err) {
    console.error('[DEBUG] Error en editarMuestra:', err);
    mostrarToast('Error al editar: ' + err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  CRUD — ELIMINAR MUESTRA
// ─────────────────────────────────────────────────────────────
function confirmarEliminar() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para eliminar esta muestra');
    return;
  }
  document.getElementById('eliminar-nombre-label').textContent = `"${muestraActual.nombre}"`;
  abrirModal('modal-eliminar');
}

async function eliminarMuestra() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para eliminar esta muestra');
    return;
  }

  const idEliminar = muestraActual.id;
  console.log('[DEBUG] eliminarMuestra — idEliminar:', idEliminar);

  try {
    const res  = await fetch(API.eliminarMuestra, {
      method:  'DELETE',
      headers: authHeaders(true),
      body:    JSON.stringify({ idMuestra: idEliminar }),
    });
    const json = await res.json();
    console.log('[DEBUG] eliminarMuestra — respuesta:', json);
    if (!json.success) throw new Error(json.mensaje);

    mostrarToast('🗑️ Muestra eliminada');
    cerrarModal('modal-eliminar');
    muestraActual = null;
    document.getElementById('detalle-muestra').style.display = 'none';
    document.getElementById('detalle-vacio').style.display   = 'flex';
    favoritos = favoritos.filter(f => f !== idEliminar);
    await cargarMuestras();
  } catch (err) {
    console.error('[DEBUG] Error en eliminarMuestra:', err);
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
    if (e.target === this) {
      this.classList.remove('activo');
      cerrarAutocompletes();
    }
  });
});

// ─────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────
let _toastTimer;
function mostrarToast(msg) {
  let t = document.getElementById('_toast');
  if (!t) {
    t           = document.createElement('div');
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
cargarMuestras();