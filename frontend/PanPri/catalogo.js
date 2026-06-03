let _filtroTimer = null;

//Cargar catálogo completo
async function cargarMuestras() {
  mostrarPantalla('pantalla-cargando');
  usuarioActual = getUserIdDesdeToken();

  // Nombre del usuario en toolbar
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombre = u.nombre || u.name || u.Name || u.Nombre || '';
    const el = document.getElementById('nav-usuario-nombre');
    if (el && nombre) el.textContent = `Bienvenido, ${nombre}`;
  } catch { }

  try {
    const res  = await fetch(`${API.muestras}?page=1&size=100`, { headers: authHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    muestras = mapearMuestras(json.data?.muestras || []);
  } catch {
    document.getElementById('error-msg').textContent = 'La conexión falló, intenta de nuevo.';
    mostrarPantalla('pantalla-error');
    return;
  }

  await Promise.all([cargarFavoritos(), cargarCategorias()]);
  buildGrid();
  mostrarPantalla('pantalla-contenido');
}

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

//Mapeo de respuesta del backend
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

// Grilla de muestras y selección de muestra para detalle
function buildGrid(lista = muestras) {
  const grid    = document.getElementById('menu-grid');
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

//Seleccionar muestra para ver detalle
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

  // Mostrar/ocultar botones según permiso
  const tienePermiso = usuarioActual && esMiMuestra(m);
  document.querySelector('.btn-editar').style.display   = tienePermiso ? '' : 'none';
  document.querySelector('.btn-eliminar').style.display = tienePermiso ? '' : 'none';
}

//Búsqueda por nombre
function filtrarPorNombre(valor) {
  if (filtroChips.length) return; // chips tienen prioridad
  const q    = valor.toLowerCase().trim();
  const lista = q ? muestras.filter(m => m.nombre.toLowerCase().includes(q)) : muestras;
  buildGrid(lista);
}

//creacion de chips de filtro por categoría
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

//Autocompletas categoría en modales
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

//inicializar las muestras
cargarMuestras();
