(function () {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('Index.html');
    return;
  }

  window.history.pushState(null, "", window.location.href);
  window.addEventListener('popstate',
   function () {
    window.history.pushState(null, "", window.location.href);
    window.history.forward(); // Fuerza a avanzar si logró retroceder
  });
})();

const API = {
  muestras:          'https://microscopiobackend-production.up.railway.app/api/muestras/obtener_muestras',
  obtener:           'https://microscopiobackend-production.up.railway.app/api/muestras/obtener_muestra',
  subirMuestra:      'https://microscopiobackend-production.up.railway.app/api/Muestras/subir_muestra',
  subirImagen:       'https://microscopiobackend-production.up.railway.app/api/Muestras/subir_imagen',
  editarMuestra:     'https://microscopiobackend-production.up.railway.app/api/Muestras/editar_muestra',
  eliminarMuestra:   'https://microscopiobackend-production.up.railway.app/api/Muestras/eliminar_muestra',
  obtenerFavoritos:  'https://microscopiobackend-production.up.railway.app/api/Muestras/obtener_favoritos',
  agregarFavorito:   'https://microscopiobackend-production.up.railway.app/api/Muestras/agregar_favorito',
  eliminarFavorito:  'https://microscopiobackend-production.up.railway.app/api/Muestras/eliminar_favorito',
  obtenerCategorias: 'https://microscopiobackend-production.up.railway.app/api/Muestras/obtener_categorias',
  catalogoFiltrado:  'https://microscopiobackend-production.up.railway.app/api/Muestras/obtener_catalogo_muestras_filtrado',
};