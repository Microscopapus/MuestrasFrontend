// ─────────────────────────────────────────────────────────────
//  CONFIG — solo cambia BASE_URL si cambia el dominio
// ─────────────────────────────────────────────────────────────
const BASE_URL = 'https://microscopiobackend-production.up.railway.app';

const AUTH_API = {
  login:    `${BASE_URL}/api/auth/login`,
  register: `${BASE_URL}/api/auth/register`,
  google:   `${BASE_URL}/api/auth/google`,
};

const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID';

// ─────────────────────────────────────────────────────────────
//  Adapatadores controlan lo que el usuario ve
// ─────────────────────────────────────────────────────────────
//controla el mensaje de error si no jala nada de datos
function mostrarError(msg) {
  const el = document.getElementById('auth-error');
  document.getElementById('auth-error-msg').textContent = "La conexión falló intente de nuevo";
  el.style.display = 'block';
}
//oculta el mensaje de error al cargar login o register
function ocultarError() {
  document.getElementById('auth-error').style.display = 'none';
}
//este sirve para una ves iniciada la sesion o terminaod el registro se haga un login y no se presione el boton varias ves es como si cambiara su estado
function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Iniciando sesión...' : btn.datIaset.texto;
}

// Guardar texto original de botones al cargar
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-principal').forEach(btn => {
    btn.dataset.texto = btn.textContent;
  });
});

// ─────────────────────────────────────────────────────────────
//  GUARDAR SESIÓN Y REDIRIGIR
// ─────────────────────────────────────────────────────────────
function guardarSesionYRedirigir(data) {
  // data viene de json.data → { token, usuario }
  localStorage.setItem('token',   data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  window.location.href = 'index.html';
}

// ─────────────────────────────────────────────────────────────
//  MANEJAR TIPO DE ERROR DEL BACKEND
// ─────────────────────────────────────────────────────────────
function mensajePorTipo(tipo, mensajeBackend) {
  const mensajes = {
    0: mensajeBackend,                          // todo bien (no debería llegar aquí)
    1: 'Error interno, intenta de nuevo.',      // error mysql
    2: 'Este correo ya está registrado.',       // correo duplicado
    3: 'La contraseña no cumple los requisitos.',// contraseña inválida
  };
  return mensajes[tipo] || mensajeBackend || 'La conexión falló, intenta de nuevo.';
}

// ─────────────────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────────────────
async function loginEmail() {
  ocultarError();

  const email    = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const btn      = document.querySelector('.btn-principal');

  if (!email || !password) { mostrarError('Por favor llena todos los campos.'); return; }
  if (!email.includes('@')) { mostrarError('Escribe un correo válido.'); return; }

  setLoading(btn, true);

  try {
    const res  = await fetch(AUTH_API.login, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const json = await res.json();
    // { success, tipo, mensaje, data: { token, usuario } }

    if (!json.success) {
      mostrarError(mensajePorTipo(json.tipo, json.mensaje));
      return;
    }

    guardarSesionYRedirigir(json.data);

  } catch (err) {
    mostrarError('La conexión falló, intenta de nuevo.');
  } finally {
    setLoading(btn, false);
  }
}

// ─────────────────────────────────────────────────────────────
//  REGISTRO
// ─────────────────────────────────────────────────────────────
async function registrar() {
  ocultarError();

  const nombre    = document.getElementById('nombre')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const password  = document.getElementById('password')?.value;
  const password2 = document.getElementById('password2')?.value;
  const btn       = document.querySelector('.btn-principal');

  if (!nombre || !email || !password || !password2) { mostrarError('Por favor llena todos los campos.'); return; }
  if (!email.includes('@'))    { mostrarError('Escribe un correo válido.'); return; }
  if (password.length < 8)     { mostrarError('La contraseña debe tener al menos 8 caracteres.'); return; }
  if (password !== password2)  { mostrarError('Las contraseñas no coinciden.'); return; }

  setLoading(btn, true);

  try {
    const res  = await fetch(AUTH_API.register, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nombre, email, password }),
    });
    const json = await res.json();
    // { success, tipo, mensaje, data: { token, usuario } }

    if (!json.success) {
      mostrarError(mensajePorTipo(json.tipo, json.mensaje));
      return;
    }

    guardarSesionYRedirigir(json.data);

  } catch (err) {
    mostrarError('La conexión falló, intenta de nuevo.');
  } finally {
    setLoading(btn, false);
  }
}

// ─────────────────────────────────────────────────────────────
//  GOOGLE LOGIN
//  Para activar: agrega en el HTML →
//  <script src="https://accounts.google.com/gsi/client"></script>
//  y pon tu Client ID en GOOGLE_CLIENT_ID arriba
// ─────────────────────────────────────────────────────────────
function loginGoogle() {
  // TODO: descomentar cuando tengas el Client ID
  // google.accounts.id.initialize({
  //   client_id: GOOGLE_CLIENT_ID,
  //   callback: handleGoogleResponse,
  // });
  // google.accounts.id.prompt();
  alert('Google login: configura tu Client ID primero.');
}

async function handleGoogleResponse(response) {
  try {
    const res  = await fetch(AUTH_API.google, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: response.credential }),
    });
    const json = await res.json();
    // { success, tipo, mensaje, data: { token, usuario } }

    if (!json.success) {
      mostrarError(mensajePorTipo(json.tipo, json.mensaje));
      return;
    }

    guardarSesionYRedirigir(json.data);

  } catch (err) {
    mostrarError('La conexión falló, intenta de nuevo.');
  }
}

// ─────────────────────────────────────────────────────────────
//  CERRAR SESIÓN
// ─────────────────────────────────────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}