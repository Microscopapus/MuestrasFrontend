//Crear muestra
function abrirModalCrear() {
  document.getElementById('crear-nombre').value    = '';
  document.getElementById('crear-desc').value      = '';
  document.getElementById('crear-cat-texto').value = '';
  document.getElementById('crear-cat-lista').classList.remove('visible');
  crearCatId = null;

  const container = document.getElementById('imagenes-container');
  if (container) { container.innerHTML = ''; container.appendChild(crearBloqueImagen()); }

  abrirModal('modal-crear');
}

function crearBloqueImagen() {
  const bloque = document.createElement('div');
  bloque.className = 'imagen-item';
  bloque.innerHTML = `
    <div class="imagen-preview">🔍</div>
    <div class="imagen-item-controls">
      <input type="number" class="crear-objetivo" placeholder="Objetivo" min="0">
      <label class="file-label">
        <span>Seleccionar imagen</span>
        <input type="file" class="crear-img" accept="image/*">
      </label>
      <button type="button" class="btn-remove-img">✕ Quitar imagen</button>
    </div>
  `;
  _prepararCampoImagen(bloque);
  return bloque;
}

function _prepararCampoImagen(bloque) {
  const fileInput = bloque.querySelector('.crear-img');
  const preview   = bloque.querySelector('.imagen-preview');
  const remover   = bloque.querySelector('.btn-remove-img');

  fileInput?.addEventListener('change', function () {
    const archivo = this.files[0];
    preview.innerHTML = archivo ? `<img src="${URL.createObjectURL(archivo)}" alt="Vista previa">` : '🔍';
  });

  remover?.addEventListener('click', function () {
    const contenedor = document.getElementById('imagenes-container');
    if (!contenedor) return;
    bloque.remove();
    if (!contenedor.querySelector('.imagen-item')) contenedor.appendChild(crearBloqueImagen());
  });
}

function agregarCampoImagen() {
  const container = document.getElementById('imagenes-container');
  if (container) container.appendChild(crearBloqueImagen());
}

async function subirMuestra() {
  const nombre = document.getElementById('crear-nombre').value.trim();
  const desc   = document.getElementById('crear-desc').value.trim();
  if (!nombre) { mostrarToast('El nombre es obligatorio'); return; }

  const fd = new FormData();
  fd.append('Nombre', nombre);
  fd.append('Descripcion', desc);
  if (crearCatId !== null) fd.append('Categorias', crearCatId);

  let idMuestraCreada = null;

  try {
    const res  = await fetch(API.subirMuestra, { method: 'POST', headers: authHeaders(), body: fd });
    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje);
    idMuestraCreada = json.data?.id ?? json.data?.idMuestra ?? json.data?.Id ?? null;
    mostrarToast('Muestra creada');
  } catch (err) {
    mostrarToast('Error al crear: ' + err.message);
    return;
  }

  // Subir imágenes asociadas
  for (const bloque of document.querySelectorAll('.imagen-item')) {
    const objetivo = parseInt(bloque.querySelector('.crear-objetivo').value, 10);
    const archivo  = bloque.querySelector('.crear-img').files[0];
    if (!archivo) continue;
    if (isNaN(objetivo)) { mostrarToast('Una imagen no tiene objetivo'); continue; }
    try {
      const fdImg = new FormData();
      fdImg.append('IdMuestra', idMuestraCreada);
      fdImg.append('Objetivo', objetivo);
      fdImg.append('File', archivo);
      const resImg  = await fetch(API.subirImagen, { method: 'POST', headers: authHeaders(), body: fdImg });
      const jsonImg = await resImg.json();
      if (!jsonImg.success) throw new Error(jsonImg.mensaje);
    } catch (err) {
      mostrarToast(`Error subiendo ${archivo.name}: ${err.message}`);
    }
  }

  mostrarToast('Proceso completado');
  cerrarModal('modal-crear');
  await cargarMuestras();
}

