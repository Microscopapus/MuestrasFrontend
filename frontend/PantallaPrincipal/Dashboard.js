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