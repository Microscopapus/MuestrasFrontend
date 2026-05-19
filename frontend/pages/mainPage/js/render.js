export function buildGrid(lista = muestras) {
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

export function seleccionar(id) {
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

export function actualizarBotonesCrud(m) {
  const btnEditar   = document.querySelector('.btn-editar');
  const btnEliminar = document.querySelector('.btn-eliminar');
  const tienePermiso = m && usuarioActual && esMiMuestra(m);

  if (btnEditar)   btnEditar.style.display   = tienePermiso ? '' : 'none';
  if (btnEliminar) btnEliminar.style.display = tienePermiso ? '' : 'none';
}

export function mostrarPantalla(id) {
  ['pantalla-cargando', 'pantalla-error', 'pantalla-contenido']
    .forEach(p => { document.getElementById(p).style.display = 'none'; });
  document.getElementById(id).style.display = 'flex';
}