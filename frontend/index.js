// ─────────────────────────────────────────────────────────────
//  DB CONFIG — conecta aquí tu base de datos cuando esté lista
// ─────────────────────────────────────────────────────────────
const DB_CONFIG = {
  // Cambia esta URL por la de tu backend/API cuando esté lista
  endpoint: '/muestras',

  // Ejemplos según tu stack:
  // Express + MySQL:  'http://localhost:3000/api/muestras'
  // FastAPI:          'http://localhost:8000/muestras'
  // Supabase REST:    'https://xxxx.supabase.co/rest/v1/muestras'
  // Firebase:         'https://tu-proyecto.firebaseio.com/muestras.json'
};

// ─────────────────────────────────────────────────────────────
//  Datos visuales locales (paleta de colores para cada tipo)
//  Cuando el backend responda, se mezclan con sus datos reales
// ─────────────────────────────────────────────────────────────

let muestras = [];

// ─────────────────────────────────────────────────────────────
//  PANTALLAS — solo una visible a la vez
// ─────────────────────────────────────────────────────────────
function mostrarPantalla(id) {
  ['pantalla-cargando', 'pantalla-error', 'pantalla-contenido']
    .forEach(p => document.getElementById(p).style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}

// ─────────────────────────────────────────────────────────────
//  FETCH AL BACKEND
// ─────────────────────────────────────────────────────────────
async function cargarMuestras() {
  mostrarPantalla('pantalla-cargando');

  try {
    const res = await fetch(DB_CONFIG.endpoint);
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

    const data = await res.json();
    const raw  = Array.isArray(data) ? data : (data.muestras || []);

    // Mezclar datos del server con paleta visual local
    muestras = raw.map(m => ({
      ...(visuales[m.id] || visuales.eritrocitos),
      ...m,
    }));

  } catch (err) {
    // Sin backend → usar datos locales y avisar
    console.warn('Backend no disponible:', err.message);
    muestras = muestrasLocal.map(m => ({ ...visuales[m.id], ...m }));
    document.getElementById('error-msg').textContent = err.message;
    mostrarPantalla('pantalla-error');
    return; // No seguir al contenido
  }

  buildGrid();
  mostrarPantalla('pantalla-contenido');
}


//menu
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
      img.src = m.imagen; img.alt = m.nombre; img.className = 'card-img';
      card.appendChild(img);
    } else {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 80;
      card.appendChild(cv);
      setTimeout(() => dibujarMuestra(cv, m, 0.7), 0);
    }

    const nombre = document.createElement('div');
    nombre.className = 'card-nombre';
    nombre.textContent = m.nombre.length > 12 ? m.nombre.slice(0,11)+'…' : m.nombre;

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
  document.getElementById('card-'+id).classList.add('activo');

  document.getElementById('detalle-vacio').style.display = 'none';
  const det = document.getElementById('detalle-muestra');
  det.style.display = 'flex';

  const contenedor = document.getElementById('detalle-imagen');
  contenedor.innerHTML = '';
  if (m.imagen) {
    const img = document.createElement('img');
    img.src = m.imagen; img.alt = m.nombre;
    img.style.cssText = 'width:220px;height:220px;border-radius:50%;object-fit:cover;';
    contenedor.appendChild(img);
  } else {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 260;
    cv.style.cssText = 'width:220px;height:220px;border-radius:50%;';
    contenedor.appendChild(cv);
    dibujarMuestra(cv, m, 2.2);
  }

  document.getElementById('detalle-nombre').textContent = m.nombre;
  document.getElementById('detalle-cat').textContent    = m.categoria;
  document.getElementById('detalle-desc').textContent   = m.descripcion || '';

  cerrarMenu();
}

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
cargarMuestras();