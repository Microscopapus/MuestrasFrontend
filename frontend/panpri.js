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
      method:  'POST',
      headers: authHeaders(true),
      body:    JSON.stringify({}),
    });
    const json = await res.json();

    // Intentamos varias formas en que el backend puede devolver el array
    const raw = json.data?.categorias || json.data || json.categorias || [];
    categorias = Array.isArray(raw)
      ? raw.map(c => ({
          id:     c.id   ?? c.Id   ?? c.idCategoria ?? null,
          nombre: c.nombre ?? c.name ?? c.Nombre    ?? '',
        })).filter(c => c.id !== null && c.nombre !== '')
      : [];
    console.log('[DEBUG] Categorías cargadas:', categorias);
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
    if (!json.success) throw new Error(json.mensaje);

    const raw = json.data?.muestras || [];

    if (raw.length > 0) console.log('[DEBUG] Primera muestra raw:', raw[0]);
    console.log('[DEBUG] usuarioActual desde token:', usuarioActual);

    muestras = mapearMuestras(raw);
  } catch (err) {
    document.getElementById('error-msg').textContent = 'La conexión falló, intenta de nuevo.';
    mostrarPantalla('pantalla-error');
    return;
  }

  await Promise.all([cargarFavoritos(), cargarCategorias()]);
  buildGrid();
  mostrarPantalla('pantalla-contenido');
}

// Mapea el raw del backend al modelo interno
function mapearMuestras(raw) {
  return raw.map(m => ({
    id:          m.id,
    nombre:      m.nombre      || 'Sin nombre',
    categoria:   m.categoria   || m.Categoria   || '',
    descripcion: m.descripcion || '',
    imagen:      m.imagenes?.[0]?.url || null,
    userId:      m.userId ?? m.idUsuario ?? m.creadorId ?? m.usuarioId
              ?? m.id_usuario ?? m.IdUsuario ?? m.CreadorId ?? null,
    _raw: m,
  }));
}

// ─────────────────────────────────────────────────────────────
//  FILTRAR CATÁLOGO POR CATEGORÍA
// ─────────────────────────────────────────────────────────────
function onCatFiltroInput(valor) {
  clearTimeout(_filtroTimer);
  _filtroTimer = setTimeout(() => filtrarCatalogo(valor), 280);
}

async function filtrarCatalogo(texto) {
  const q = texto.trim().toLowerCase();

  // Sin texto → mostrar todo el catálogo normal
  if (!q) {
    buildGrid(muestras);
    return;
  }

  // Buscar categorías cuyo nombre coincida con el texto
  const catsFiltradas = categorias.filter(c => c.nombre.toLowerCase().includes(q));

  // Si no hay categorías que coincidan (o no hay categorías en BD) → grid vacío
  if (!catsFiltradas.length) {
    buildGrid([]);
    return;
  }

  // Llamar al endpoint de filtrado con los IDs encontrados
  try {
    const params = new URLSearchParams({ page: 1, size: 100 });
    catsFiltradas.forEach(c => params.append('categorias', c.id));

    const res  = await fetch(`${API.catalogoFiltrado}?${params}`, { headers: authHeaders() });
    const json = await res.json();
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
    const raw  = json.data?.muestras || json.data || [];
    favoritos  = Array.isArray(raw) ? raw.map(m => (typeof m === 'object' ? m.id : m)) : [];
  } catch {
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
    if (!json.success) throw new Error(json.mensaje);
    favoritos.push(id);
    mostrarToast('★ Agregado a favoritos');
    actualizarEstrellas();
    renderFavLista();
  } catch {
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
    if (!json.success) throw new Error(json.mensaje);
    favoritos = favoritos.filter(f => f !== id);
    mostrarToast('Quitado de favoritos');
    actualizarEstrellas();
    renderFavLista();
  } catch {
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
    if (!json.success) throw new Error();
    favoritos = favoritos.filter(f => f !== id);
    actualizarEstrellas();
    filtrarFavoritos();
    mostrarToast('Quitado de favoritos');
  } catch {
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
  // Limpiar filtro al abrir
  const input = document.getElementById('cat-filtro');
  if (input) input.value = '';
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
function seleccionar(id) {
  // Buscar en el catálogo completo (no en el filtrado temporal)
  const m = muestras.find(x => x.id === id);
  if (!m) return;
  muestraActual = m;

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

  // Mostrar badge de categoría si existe
  const badge = document.getElementById('detalle-cat');
  if (m.categoria) {
    badge.textContent = m.categoria;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }

  cerrarMenu();
}

// ─────────────────────────────────────────────────────────────
//  CRUD — CREAR MUESTRA
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

  if (!nombre)        { mostrarToast('El nombre es obligatorio'); return; }
  if (isNaN(objetivo)) { mostrarToast('El objetivo es obligatorio'); return; }

  const fd = new FormData();
  fd.append('Nombre',      nombre);
  fd.append('Descripcion', desc);
  if (crearCatId !== null) fd.append('Categorias', crearCatId);
  if (imgFile)             fd.append('Imagenes',   imgFile);

  let idMuestraCreada = null;

  try {
    const res  = await fetch(API.subirMuestra, {
      method:  'POST',
      headers: authHeaders(),
      body:    fd,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    idMuestraCreada = json.data?.id || json.data?.idMuestra || null;
    mostrarToast('✅ Muestra creada');
  } catch (err) {
    mostrarToast('Error al crear muestra: ' + err.message);
    return;
  }

  if (imgFile && idMuestraCreada) {
    try {
      const fdImg = new FormData();
      fdImg.append('IdMuestra', idMuestraCreada);
      fdImg.append('Objetivo',  objetivo);
      fdImg.append('File',      imgFile);

      const resImg  = await fetch(API.subirImagen, {
        method:  'POST',
        headers: authHeaders(),
        body:    fdImg,
      });
      const jsonImg = await resImg.json();
      if (!jsonImg.success) throw new Error(jsonImg.mensaje);
      mostrarToast('✅ Imagen subida correctamente');
    } catch (err) {
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

  document.getElementById('editar-nombre').value   = muestraActual.nombre;
  document.getElementById('editar-desc').value     = muestraActual.descripcion;
  document.getElementById('editar-cat-texto').value = muestraActual.categoria || '';
  document.getElementById('editar-cat-lista').classList.remove('visible');

  // Si la muestra ya tiene categoría, intentamos recuperar su ID
  const catExistente = categorias.find(
    c => c.nombre.toLowerCase() === (muestraActual.categoria || '').toLowerCase()
  );
  editarCatId = catExistente ? catExistente.id : null;

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

  try {
    const res  = await fetch(API.editarMuestra, {
      method:  'PUT',
      headers: authHeaders(true),
      body:    JSON.stringify({
        idMuestra:   muestraActual.id,
        nombre,
        descripcion: desc,
        categorias:  editarCatId ? [editarCatId] : [],
        imagenes:    [],
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);

    mostrarToast('✅ Muestra actualizada');
    cerrarModal('modal-editar');
    await cargarMuestras();
    seleccionar(muestraActual.id);
  } catch (err) {
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

  try {
    const res  = await fetch(API.eliminarMuestra, {
      method:  'DELETE',
      headers: authHeaders(true),
      body:    JSON.stringify({ idMuestra: idEliminar }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);

    mostrarToast('🗑️ Muestra eliminada');
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