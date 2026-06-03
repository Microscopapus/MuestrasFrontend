// ── Endpoints ────────────────────────────────────────────────
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

// ── Estado compartido ─────────────────────────────────────────
let muestras      = [];
let categorias    = [];
let favoritos     = [];
let muestraActual = null;
let usuarioActual = null;
let crearCatId    = null;
let editarCatId   = null;
let filtroChips   = [];

// Al cargar, verifica sesión y bloquea el "atrás"
(function () {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.replace('../CHECK-IN/index.html');
    return;
  }

  history.pushState(null, '', location.href);

  window.addEventListener('popstate', function () {
    history.pushState(null, '', location.href);
  });
})();

//Vlidaciones con el backend
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

//Pantallas
function mostrarPantalla(id) {
  ['pantalla-cargando', 'pantalla-error', 'pantalla-contenido'].forEach(p => {
    document.getElementById(p)?.classList.remove('activo');
  });
  document.getElementById(id)?.classList.add('activo');
}

//Modales
function abrirModal(id) {
  document.getElementById(id)?.classList.add('activo');
}

function cerrarModal(id) {
  document.getElementById(id)?.classList.remove('activo');
  cerrarAutocompletes();
}

function cerrarAutocompletes() {
  document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('visible'));
}

document.addEventListener('click', function (e) {
  if (!e.target.closest('.autocomplete-wrap')) cerrarAutocompletes();
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', function (e) {
      if (e.target === this) { this.classList.remove('activo'); cerrarAutocompletes(); }
    });
  });
});

//Mnesajes
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
