// ─────────────────────────────────────────────────────────────
//  SESIÓN
// ─────────────────────────────────────────────────────────────
(function verificarSesion() {
  if (!localStorage.getItem('token')) window.location.href = 'login.html';
})();

// ─────────────────────────────────────────────────────────────
//  ENDPOINTS
// ─────────────────────────────────────────────────────────────
const API = {
  muestras:         'https://microscopiobackend-production.up.railway.app/api/muestras/obtener_muestras',
  subirMuestra:     'https://microscopiobackend-production.up.railway.app/api/Muestras/subir_muestra',
  subirImagen:      'https://microscopiobackend-production.up.railway.app/api/Muestras/subir_imagen',
  editarMuestra:    'https://microscopiobackend-production.up.railway.app/api/Muestras/editar_muestra',
  eliminarMuestra:  'https://microscopiobackend-production.up.railway.app/api/Muestras/eliminar_muestra',
  obtenerFavoritos: 'https://microscopiobackend-production.up.railway.app/api/Muestras/obtener_favoritos',
  agregarFavorito:  'https://microscopiobackend-production.up.railway.app/api/Muestras/agregar_favorito',
  eliminarFavorito: 'https://microscopiobackend-production.up.railway.app/api/Muestras/eliminar_favorito',
};

// ─────────────────────────────────────────────────────────────
//  ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let muestras      = [];
let favoritos     = [];   // array de ids
let muestraActual = null;
let usuarioActual = null; // id del usuario logueado, extraído del token

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

// Decodifica el payload del JWT para obtener el userId del usuario logueado
// No valida la firma (eso lo hace el backend), solo lee los claims
function getUserIdDesdeToken() {
  try {
    const token   = getToken();
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    // El claim puede llamarse sub, id, userId, nameid o Id según el backend
    return decoded.sub || decoded.id || decoded.userId || decoded.nameid || decoded.Id || null;
  } catch {
    return null;
  }
}

// Retorna true si la muestra pertenece al usuario logueado
function esMiMuestra(muestra) {
  if (!usuarioActual) return false;
  // El campo puede llamarse userId, idUsuario, creadorId según lo que devuelva el backend
  const dueno = muestra.userId || muestra.idUsuario || muestra.creadorId || muestra.usuarioId;
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
//  CARGAR MUESTRAS
// ─────────────────────────────────────────────────────────────
async function cargarMuestras() {
  mostrarPantalla('pantalla-cargando');

  // Extraer userId del token antes de cualquier otra cosa
  usuarioActual = getUserIdDesdeToken();

  try {
    const res  = await fetch(`${API.muestras}?page=1&size=100`, { headers: authHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);

    const raw = json.data?.muestras || [];
    muestras = raw.map(m => ({
      id:          m.id,
      nombre:      m.nombre      || 'Sin nombre',
      // PENDIENTE: categoría — la BD aún no la acepta, descomentar cuando esté lista
      // categoria:   m.categoria   || '',
      categoria:   '',
      descripcion: m.descripcion || '',
      imagen:      m.imagenes?.[0]?.url || null,
      // Guardamos el id del dueño para comparar con usuarioActual
      userId:      m.userId || m.idUsuario || m.creadorId || m.usuarioId || null,
    }));
  } catch (err) {
    document.getElementById('error-msg').textContent = 'La conexión falló, intenta de nuevo.';
    mostrarPantalla('pantalla-error');
    return;
  }

  await cargarFavoritos();
  buildGrid();
  mostrarPantalla('pantalla-contenido');
}

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — CARGAR
// ─────────────────────────────────────────────────────────────
async function cargarFavoritos() {
  try {
    // GET no debe llevar body — los parámetros van en la URL
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

  // Evitar doble click si ya es favorito
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
  } catch (err) {
    mostrarToast('Error al agregar favorito');
  }
}

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — ELIMINAR
// ─────────────────────────────────────────────────────────────
async function eliminarFavoritoById(id, e) {
  if (e) e.stopPropagation();

  // Evitar doble click si ya no es favorito
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
  } catch (err) {
    mostrarToast('Error al quitar favorito');
  }
}

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — TOGGLE (decide cuál llamar según estado actual)
// ─────────────────────────────────────────────────────────────
function toggleFavorito(id, e) {
  if (e) e.stopPropagation();
  if (esFavorito(id)) {
    eliminarFavoritoById(id, e);
  } else {
    agregarFavorito(id, e);
  }
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

// ─────────────────────────────────────────────────────────────
//  FAVORITOS — QUITAR DESDE EL PANEL (sin evento de click de card)
// ─────────────────────────────────────────────────────────────
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
function buildGrid() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

  muestras.forEach(m => {
    const card     = document.createElement('div');
    card.className = 'menu-card';
    card.id        = 'card-' + m.id;
    card.onclick   = () => seleccionar(m.id);

    // Estrella favorito — visible para todos
    const star      = document.createElement('button');
    star.className  = 'card-star' + (esFavorito(m.id) ? ' favorito' : '');
    star.innerHTML  = '★';
    star.dataset.id = m.id;
    star.onclick    = (e) => toggleFavorito(m.id, e);
    card.appendChild(star);

    // Imagen o placeholder
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

    // PENDIENTE: mostrar categoría cuando la BD la soporte
    // const cat       = document.createElement('div');
    // cat.className   = 'card-cat';
    // cat.textContent = m.categoria;
    // card.appendChild(cat);

    card.appendChild(nombre);
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────
//  MENÚ (catálogo)
// ─────────────────────────────────────────────────────────────
function abrirMenu() {
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
  // PENDIENTE: mostrar categoría cuando la BD la soporte
  // document.getElementById('detalle-cat').textContent = m.categoria || '—';
  document.getElementById('detalle-desc').textContent   = m.descripcion;

  // Mostrar u ocultar botones de editar/eliminar según si es dueño
  const acciones = document.getElementById('detalle-acciones-crud');
  if (acciones) {
    acciones.style.display = esMiMuestra(m) ? 'flex' : 'none';
  }

  cerrarMenu();
}

// ─────────────────────────────────────────────────────────────
//  CRUD — CREAR MUESTRA
//  Flujo: 1) subir_muestra con nombre y descripción
//         2) con el id retornado, subir_imagen con el archivo
// ─────────────────────────────────────────────────────────────
function abrirModalCrear() {
  document.getElementById('crear-nombre').value      = '';
  document.getElementById('crear-desc').value        = '';
  document.getElementById('crear-img').value         = '';
  document.getElementById('crear-preview').innerHTML = '';
  abrirModal('modal-crear');
}

// Preview de imagen al seleccionar archivo
document.getElementById('crear-img').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  document.getElementById('crear-preview').innerHTML = `<img src="${url}" alt="preview">`;
});

async function subirMuestra() {
  const nombre  = document.getElementById('crear-nombre').value.trim();
  const desc    = document.getElementById('crear-desc').value.trim();
  const imgFile = document.getElementById('crear-img').files[0];

  if (!nombre) { mostrarToast('El nombre es obligatorio'); return; }

  // ── Paso 1: crear la muestra con nombre y descripción ──
  const fd = new FormData();
  fd.append('Nombre', nombre);
  fd.append('Descripcion', desc);
  // PENDIENTE: agregar categoría cuando la BD la soporte
  // fd.append('Categorias', categoriaId);

  // Si el backend acepta la imagen directo en subir_muestra la mandamos aquí
  // Si no, se sube por separado en el paso 2 via subir_imagen
  if (imgFile) fd.append('Imagenes', imgFile);

  let idMuestraCreada = null;

  try {
    const res  = await fetch(API.subirMuestra, {
      method:  'POST',
      headers: authHeaders(), // sin Content-Type para que FormData ponga boundary
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

  // ── Paso 2: subir imagen por separado si el paso 1 no la aceptó ──
  // Solo se ejecuta si hay archivo Y el backend retornó un id de muestra
  // PENDIENTE: verificar si subir_muestra ya acepta la imagen o si siempre
  // hay que usar subir_imagen por separado. Si subir_muestra ya la maneja,
  // se puede eliminar este paso 2 completo.
  if (imgFile && idMuestraCreada) {
    try {
      const fdImg = new FormData();
      fdImg.append('idMuestra', idMuestraCreada);
      fdImg.append('Imagen', imgFile);
      fdImg.append('Objetivo', objetivo);

      const resImg  = await fetch(API.subirImagen, {
        method:  'POST',
        headers: authHeaders(), // sin Content-Type para que FormData ponga boundary
        body:    fdImg,
      });
      const jsonImg = await resImg.json();
      if (!jsonImg.success) throw new Error(jsonImg.mensaje);

      mostrarToast('✅ Imagen subida correctamente');

    } catch (err) {
      // La muestra ya se creó, solo falló la imagen — avisamos sin revertir
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

  // Protección: solo el dueño puede editar
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para editar esta muestra');
    return;
  }

  document.getElementById('editar-nombre').value = muestraActual.nombre;
  document.getElementById('editar-desc').value   = muestraActual.descripcion;
  // PENDIENTE: cargar categoría cuando la BD la soporte
  // document.getElementById('editar-categoria').value = muestraActual.categoria;
  abrirModal('modal-editar');
}

async function editarMuestra() {
  if (!muestraActual) return;

  // Protección: solo el dueño puede editar
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para editar esta muestra');
    return;
  }

  const nombre = document.getElementById('editar-nombre').value.trim();
  const desc   = document.getElementById('editar-desc').value.trim();
  // PENDIENTE: leer categoría cuando la BD la soporte
  // const categoria = document.getElementById('editar-categoria').value;

  if (!nombre) { mostrarToast('El nombre es obligatorio'); return; }

  try {
    const res  = await fetch(API.editarMuestra, {
      method:  'PUT',
      headers: authHeaders(true),
      body:    JSON.stringify({
        idMuestra:   muestraActual.id,
        nombre,
        descripcion: desc,
        // PENDIENTE: enviar categorías cuando la BD las soporte
        // categorias: [categoria],
        // PENDIENTE: enviar imágenes cuando el flujo de edición las soporte
        // imagenes: [],
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

  // Protección: solo el dueño puede eliminar
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para eliminar esta muestra');
    return;
  }

  document.getElementById('eliminar-nombre-label').textContent = `"${muestraActual.nombre}"`;
  abrirModal('modal-eliminar');
}

async function eliminarMuestra() {
  if (!muestraActual) return;

  // Protección: solo el dueño puede eliminar
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
}

// Cerrar modal al hacer click en el backdrop
document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('activo');
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