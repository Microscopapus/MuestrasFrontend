

// Chips de categorías seleccionadas en el filtro del catálogo
// [{ id, nombre }]
let filtroChips = [];

// ─────────────────────────────────────────────────────────────
//  UTILS AUTH
// ─────────────────────────────────────────────────────────────
// Timer para debounce del filtro de catálogo
let _filtroTimer = null;



// ─────────────────────────────────────────────────────────────
//  PANTALLAS
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
//  CARGAR CATEGORÍAS (POST sin parámetros)
// ─────────────────────────────────────────────────────────────
async function cargarCategorias() {
  try {
    const res = await fetch(API.obtenerCategorias, {
      method: 'GET',
      headers: authHeaders(),
    });
    const json = await res.json();
    console.log('[DEBUG] obtenerCategorias — respuesta completa:', json);

    // El backend puede devolver el array de varias formas
    const raw = json.data?.categorias || json.data || json.categorias || [];
    console.log('[DEBUG] obtenerCategorias — raw array:', raw);

    categorias = Array.isArray(raw)
      ? raw.map(c => ({
        id: c.id ?? c.Id ?? c.idCategoria ?? c.IdCategoria ?? null,
        nombre: c.nombre ?? c.name ?? c.Nombre ?? '',
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
    const res = await fetch(`${API.muestras}?page=1&size=100`, { headers: authHeaders() });
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


function sugerirCat(prefijo) {
  const input = document.getElementById(`${prefijo}-cat-texto`);
  const lista = document.getElementById(`${prefijo}-cat-lista`);
  const q = input.value.trim().toLowerCase();

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
  else editarCatId = id;
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


function abrirModal(id) {
  document.getElementById(id).classList.add('activo');
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
//  INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('imagenes-container');
  if (!container) return;

  const items = container.querySelectorAll('.imagen-item');
  if (items.length) {
    items.forEach(prepararCampoImagen);
  } else {
    container.appendChild(crearBloqueImagen());
  }
});

cargarMuestras();