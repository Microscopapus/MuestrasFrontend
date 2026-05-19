
async function subirMuestra() {

  const nombre = document.getElementById('crear-nombre').value.trim();
  const desc   = document.getElementById('crear-desc').value.trim();

  if (!nombre) {
    mostrarToast('El nombre es obligatorio');
    return;
  }

  // ─────────────────────────────
  // Crear muestra
  // ─────────────────────────────

  const fd = new FormData();

  fd.append('Nombre', nombre);
  fd.append('Descripcion', desc);

  if (crearCatId !== null) {
    fd.append('Categorias', crearCatId);
  }

  let idMuestraCreada = null;

  try {

    const res = await fetch(API.subirMuestra, {
      method: 'POST',
      headers: authHeaders(),
      body: fd
    });

    const json = await res.json();

    console.log('[DEBUG] subirMuestra:', json);

    if (!json.success) {
      throw new Error(json.mensaje);
    }

    idMuestraCreada =
      json.data?.id ??
      json.data?.idMuestra ??
      json.data?.Id ??
      null;

    mostrarToast('✅ Muestra creada');

  } catch (err) {

    console.error(err);

    mostrarToast('Error al crear muestra: ' + err.message);

    return;
  }

  // ─────────────────────────────
  // Subir imágenes
  // ─────────────────────────────

  const bloques = document.querySelectorAll('.imagen-item');

  for (const bloque of bloques) {

    const objetivoInput = bloque.querySelector('.crear-objetivo');
    const fileInput     = bloque.querySelector('.crear-img');

    const objetivo = parseInt(objetivoInput.value, 10);
    const archivo  = fileInput.files[0];

    // Ignorar bloques vacíos
    if (!archivo) {
      continue;
    }

    if (isNaN(objetivo)) {
      mostrarToast('Una imagen no tiene objetivo');
      continue;
    }

    try {

      const fdImg = new FormData();

      fdImg.append('IdMuestra', idMuestraCreada);
      fdImg.append('Objetivo', objetivo);
      fdImg.append('File', archivo);

      console.log(
        '[DEBUG] subirImagen:',
        archivo.name,
        '| Objetivo:',
        objetivo
      );

      const resImg = await fetch(API.subirImagen, {
        method: 'POST',
        headers: authHeaders(),
        body: fdImg
      });

      const jsonImg = await resImg.json();

      console.log('[DEBUG] respuesta imagen:', jsonImg);

      if (!jsonImg.success) {
        throw new Error(jsonImg.mensaje);
      }

    } catch (err) {

      console.error(err);

      mostrarToast(
        `Error subiendo ${archivo.name}: ${err.message}`
      );
    }
  }

  mostrarToast('✅ Proceso completado');

  cerrarModal('modal-crear');

  await cargarMuestras();
}

export async function editarMuestra() {
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

export async function eliminarMuestra() {
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


export function confirmarEliminar() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) {
    mostrarToast('No tienes permiso para eliminar esta muestra');
    return;
  }
  document.getElementById('eliminar-nombre-label').textContent = `"${muestraActual.nombre}"`;
  abrirModal('modal-eliminar');
}

export function crearBloqueImagen() {
  const bloque = document.createElement('div');
  bloque.className = 'imagen-item';
  bloque.innerHTML = `
    <div class="imagen-preview">🔍</div>
    <div class="imagen-item-controls">
      <input type="number"
             class="crear-objetivo"
             placeholder="Objetivo"
             min="0" />

      <label class="file-label">
        <span>Seleccionar imagen</span>
        <input type="file"
               class="crear-img"
               accept="image/*" />
      </label>

      <button type="button" class="btn-remove-img">
        ✕ Quitar imagen
      </button>
    </div>
  `;

  prepararCampoImagen(bloque);
  return bloque;
}

export function prepararCampoImagen(bloque) {
  const fileInput = bloque.querySelector('.crear-img');
  const preview   = bloque.querySelector('.imagen-preview');
  const remover   = bloque.querySelector('.btn-remove-img');

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      const archivo = this.files[0];
      if (!archivo) {
        preview.innerHTML = '🔍';
        return;
      }
      const url = URL.createObjectURL(archivo);
      preview.innerHTML = `<img src="${url}" alt="Vista previa" />`;
    });
  }

  if (remover) {
    remover.addEventListener('click', function () {
      const contenedor = document.getElementById('imagenes-container');
      if (!contenedor) return;
      bloque.remove();
      if (!contenedor.querySelector('.imagen-item')) {
        contenedor.appendChild(crearBloqueImagen());
      }
    });
  }
}

export function agregarCampoImagen() {
  const container = document.getElementById('imagenes-container');
  if (!container) return;
  container.appendChild(crearBloqueImagen());
}

export function abrirModalEditar() {
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


export function esMiMuestra(muestra) {
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