export function onCatFiltroInput(valor) {
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
export async function ejecutarFiltroCatalogo() {
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