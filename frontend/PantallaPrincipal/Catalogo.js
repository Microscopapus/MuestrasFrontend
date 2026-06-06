let _filtroTimer = null;

// BUG 1 FIX: toolbarUsuario solo muestra el nombre — el fetch que estaba
// pegado aquí adentro no pertenece a esta función, vive en ObtenerMuestras.js
function toolbarUsuario() {
  try {
    const u      = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombre = u.nombre || u.name || u.Name || u.Nombre || '';
    const el     = document.getElementById('nav-usuario-nombre');
    if (el && nombre) el.textContent = `Bienvenido, ${nombre}`;
  } catch { }
}

// BUG 2 FIX: le faltaba async
async function cargarCategorias() {
  try {
    const res  = await fetch(API.obtenerCategorias, { method: 'GET', headers: authHeaders() });
    const json = await res.json();
    const raw  = json.data?.categorias || json.data || json.categorias || [];
    categorias = Array.isArray(raw)
      ? raw.map(c => ({
          id:     c.id     ?? c.Id     ?? c.idCategoria ?? c.IdCategoria ?? null,
          nombre: c.nombre ?? c.name   ?? c.Nombre      ?? '',
        })).filter(c => c.id !== null && c.nombre !== '')
      : [];
  } catch { categorias = []; }
}

// Búsqueda por nombre
function filtrarPorNombre(valor) {
  if (filtroChips.length) return;
  const q     = valor.toLowerCase().trim();
  const lista = q ? muestras.filter(m => m.nombre.toLowerCase().includes(q)) : muestras;
  buildGrid(lista);
}

// Chips de filtro por categoría
function onCatFiltroInput(valor) {
  clearTimeout(_filtroTimer);
  _filtroTimer = setTimeout(() => _mostrarSugerenciasFiltro(valor), 200);
}

function _mostrarSugerenciasFiltro(texto) {
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
    `<div class="item-autocompletar"
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
  _renderChips();
  _ejecutarFiltro();
}

function quitarChipFiltro(id) {
  filtroChips = filtroChips.filter(c => c.id !== id);
  _renderChips();
  _ejecutarFiltro();
}

function _renderChips() {
  const contenedor = document.getElementById('cat-chips');
  if (!contenedor) return;
  contenedor.innerHTML = filtroChips.map(c =>
    `<span class="chip">
       ${c.nombre}
       <button onmousedown="event.preventDefault()" onclick="quitarChipFiltro(${c.id})">✕</button>
     </span>`
  ).join('');
}

async function _ejecutarFiltro() {
  if (!filtroChips.length) { buildGrid(muestras); return; }
  try {
    const params = new URLSearchParams({ page: 1, size: 100 });
    filtroChips.forEach(c => params.append('categorias', c.id));
    const res  = await fetch(`${API.catalogoFiltrado}?${params}`, { headers: authHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    buildGrid(mapearMuestras(json.data?.muestras || json.data || []));
  } catch { buildGrid([]); }
}

// Autocomplete categoría en modales
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
    `<div class="item-autocompletar"
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