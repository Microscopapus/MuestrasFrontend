function verificarSesion() {
  const token = localStorage.getItem('token');
  if (!token) window.location.href = 'login.html';
}
verificarSesion();

// ─────────────────────────────────────────────────────────────
//  CONFIG — solo cambia BASE_URL si cambia el dominio
// ─────────────────────────────────────────────────────────────
const BASE_URL = 'https://microscopiobackend-production.up.railway.app';

const API = {
  muestras: `${BASE_URL}/api/muestras/obtener_muestras?page=1&size=10`,
};

let muestras = [];

// ─────────────────────────────────────────────────────────────
//  PANTALLAS
// ─────────────────────────────────────────────────────────────
function mostrarPantalla(id) {
  ['pantalla-cargando', 'pantalla-error', 'pantalla-contenido']
    .forEach(p => document.getElementById(p).style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}

// ─────────────────────────────────────────────────────────────
//  CARGAR MUESTRAS
//
//  Respuesta del backend:
//  {
//    "success": true,
//    "data": {
//      "total": 4,
//      "muestras": [
//        {
//          "id": 1,
//          "nombre": "Célula vegetal",
//          "descripcion": "Muestra observada en laboratorio",
//          "imagenes": [
//            { "url": "https://..." }   ← con imagen
//          ]
//        },
//        {
//          "id": 2,
//          "nombre": "Bacteria",
//          "descripcion": "Muestra con tinción",
//          "imagenes": []               ← sin imagen
//        },
//        {
//          "id": 3,
//          "nombre": "Tejido muscular",
//          "descripcion": "Corte longitudinal",
//          "imagenes": [
//            { "url": "https://..." },  ← con varias imágenes
//            { "url": "https://..." }      (se usa la primera)
//          ]
//        }
//      ]
//    }
//  }
// ─────────────────────────────────────────────────────────────
async function cargarMuestras() {
  mostrarPantalla('pantalla-cargando');

  try {
    const res = await fetch(API.muestras);
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

    const json = await res.json();
    if (!json.success) throw new Error(json.mensaje || 'El servidor devolvió un error.');

    const raw = json.data?.muestras || [];

    muestras = raw.map(m => ({
      id:          m.id,
      nombre:      m.nombre      || 'Sin nombre',
      categoria:   m.categoria   || '',
      descripcion: m.descripcion || '',
      imagen:      m.imagenes?.[0]?.url || null,
    }));

  } catch (err) {
    console.warn('Error al cargar:', err.message);
    document.getElementById('error-msg').textContent = 'La conexión falló, intenta de nuevo.';
    mostrarPantalla('pantalla-error');
    return;
  }

  buildGrid();
  mostrarPantalla('pantalla-contenido');
}

// ─────────────────────────────────────────────────────────────
//  GRID DEL MENÚ
// ─────────────────────────────────────────────────────────────
function buildGrid() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

  muestras.forEach(m => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.id = 'card-' + m.id;
    card.onclick = () => seleccionar(m.id);

    if (m.imagen) {
      const img = document.createElement('img');
      img.src = m.imagen;
      img.alt = m.nombre;
      img.className = 'card-img';
      card.appendChild(img);
    }

    const nombre = document.createElement('div');
    nombre.className = 'card-nombre';
    nombre.textContent = m.nombre.length > 12 ? m.nombre.slice(0, 11) + '…' : m.nombre;

    const cat = document.createElement('div');
    cat.className = 'card-cat';
    cat.textContent = m.categoria;

    card.appendChild(nombre);
    card.appendChild(cat);
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────
//  MENÚ
// ─────────────────────────────────────────────────────────────
function abrirMenu() {
  document.getElementById('menu').classList.add('activo');
  document.getElementById('overlay').classList.add('activo');
  document.body.classList.add('menu-abierto');
}

function cerrarMenu() {
  document.getElementById('menu').classList.remove('activo');
  document.getElementById('overlay').classList.remove('activo');
  document.body.classList.remove('menu-abierto');
}

// ─────────────────────────────────────────────────────────────
//  SELECCIONAR MUESTRA
// ─────────────────────────────────────────────────────────────
function seleccionar(id) {
  const m = muestras.find(x => x.id === id);
  if (!m) return;

  document.querySelectorAll('.menu-card').forEach(c => c.classList.remove('activo'));
  document.getElementById('card-' + id).classList.add('activo');

  document.getElementById('detalle-vacio').style.display = 'none';
  const det = document.getElementById('detalle-muestra');
  det.style.display = 'flex';

  const contenedor = document.getElementById('detalle-imagen');
  contenedor.innerHTML = '';

  if (m.imagen) {
    const img = document.createElement('img');
    img.src = m.imagen;
    img.alt = m.nombre;
    img.style.cssText = 'width:220px;height:220px;border-radius:50%;object-fit:cover;';
    contenedor.appendChild(img);
  }

  document.getElementById('detalle-nombre').textContent = m.nombre;
  document.getElementById('detalle-cat').textContent    = m.categoria;
  document.getElementById('detalle-desc').textContent   = m.descripcion;

  cerrarMenu();
}

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
cargarMuestras();