function abrirModalCrear() {
  document.getElementById('crear-nombre').value    = '';
  document.getElementById('crear-desc').value      = '';
  document.getElementById('crear-cat-texto').value = '';
  document.getElementById('crear-cat-lista').classList.remove('visible');
  crearCatId = null;

  const container = document.getElementById('imagenes-container');
  if (container) {
    container.innerHTML = '';
    container.appendChild(crearBloqueImagen());
  }

  abrirModal('modal-crear');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('activo');
  cerrarAutocompletes();
}