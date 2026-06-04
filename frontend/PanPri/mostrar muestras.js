//Cargar catálogo completo
async function cargarMuestras() {
  mostrarPantalla('pantalla-cargando');
  usuarioActual = getUserIdDesdeToken();
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

//inicializar las muestras
cargarMuestras();