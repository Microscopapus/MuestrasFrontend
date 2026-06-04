//Editar
function abrirModalEditar() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para editar esta muestra'); return; }

  document.getElementById('editar-nombre').value    = muestraActual.nombre;
  document.getElementById('editar-desc').value      = muestraActual.descripcion;
  document.getElementById('editar-cat-texto').value = muestraActual.categoria || '';
  document.getElementById('editar-cat-lista').classList.remove('visible');

  editarCatId = muestraActual.categoriaId ?? (
    categorias.find(c => c.nombre.toLowerCase() === (muestraActual.categoria || '').toLowerCase())?.id ?? null
  );

  abrirModal('modal-editar');
}

async function editarMuestra() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para editar esta muestra'); return; }

  const nombre = document.getElementById('editar-nombre').value.trim();
  const desc   = document.getElementById('editar-desc').value.trim();
  if (!nombre) { mostrarToast('El nombre es obligatorio'); return; }

  const body = {
    idMuestra:   muestraActual.id,
    nombre,
    descripcion: desc,
    categorias:  editarCatId !== null ? [editarCatId] : [],
    imagenes:    [],
  };

  try {
    const res  = await fetch(API.editarMuestra, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify(body) });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    const idActual = muestraActual.id;
    mostrarToast('Muestra actualizada');
    cerrarModal('modal-editar');
    await cargarMuestras();
    seleccionar(idActual);
  } catch (error) {
    mostrarToast('Error al editar: ' + error.message);
  }
}

//Eliminar
function confirmarEliminar() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para eliminar esta muestra'); return; }
  document.getElementById('eliminar-nombre-label').textContent = `"${muestraActual.nombre}"`;
  abrirModal('modal-eliminar');
}

async function eliminarMuestra() {
  if (!muestraActual) return;
  if (!esMiMuestra(muestraActual)) { mostrarToast('No tienes permiso para eliminar esta muestra'); return; }

  const idEliminar = muestraActual.id;

  try {
    const res  = await fetch(API.eliminarMuestra, {
      method: 'DELETE', headers: authHeaders(true),
      body: JSON.stringify({ idMuestra: idEliminar }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    mostrarToast('Muestra eliminada');
    cerrarModal('modal-eliminar');
    muestraActual = null;
    document.getElementById('detalle-muestra').style.display = 'none';
    document.getElementById('detalle-vacio').style.display   = 'flex';
    favoritos = favoritos.filter(f => f !== idEliminar);
    await cargarMuestras();
  } catch (error

  ) {
    mostrarToast('Error al eliminar: ' + error.message);
  }
}

//Preparar campo de imagen inicial
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('imagenes-container');
  if (!container) return;
  const items = container.querySelectorAll('.imagen-item');
  if (items.length) items.forEach(_prepararCampoImagen);
  else container.appendChild(crearBloqueImagen());
});
