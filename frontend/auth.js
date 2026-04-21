const AUTH_API = {
  login:    'https://microscopiobackend-production.up.railway.app/api/Auth/login/email',
  register: 'https://microscopiobackend-production.up.railway.app/api/Auth/register/email',
  google:   'https://microscopiobackend-production.up.railway.app/api/Auth/login/google',
};

const GOOGLE_CLIENT_ID = '30335745792-2elqg0tt0s9iq9u0hd6flgbstldbjrg1.apps.googleusercontent.com';

// pone el texto del error en el div rojo y lo hace visible
function mostrarError(msg) {
  const el = document.getElementById('auth-error');
  document.getElementById('auth-error-msg').textContent = msg;
  el.style.display = 'block';
}

// esconde el div rojo al inicio de cada intento
function ocultarError() {
  document.getElementById('auth-error').style.display = 'none';
}

// deshabilita el botón mientras carga y lo regresa a su texto original
function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Cargando...' : btn.dataset.texto;
}

// guarda el texto original de cada botón antes de que cambie
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-principal').forEach(btn => {
    btn.dataset.texto = btn.textContent;
  });
});

// ─────────────────────────────────────────────────────────────
//  GUARDAR SESIÓN Y REDIRIGIR
// ─────────────────────────────────────────────────────────────
function guardarSesionYRedirigir(data) {
  localStorage.setItem('token',   data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  window.location.href = 'panpri.html';
}

// ─────────────────────────────────────────────────────────────
//  TIPOS DE ERROR — solo para registro
// ─────────────────────────────────────────────────────────────
function mensajePorTipo(tipo, mensajeBackend) {
  const mensajes = {
    0: mensajeBackend,
    1: 'Error interno, intenta de nuevo.',
    2: 'Este correo ya está registrado.',
    3: 'La contraseña no cumple los requisitos.',
    5: mensajeBackend,
  };
  return mensajes[tipo] || mensajeBackend || 'La conexión falló, intenta de nuevo.';
}

// ─────────────────────────────────────────────────────────────
//  LOGIN
//  Request body: { email, password }
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
    const res   = await fetch(AUTH_API.login, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const texto = await res.text();
    const json  = JSON.parse(texto);
    // { success, tipo, mensaje, data: { token, usuario } }

    if (!json.success) {
      // login muestra el mensaje del backend directo, sin interpretar tipos
      mostrarError(json.mensaje || 'Correo o contraseña incorrectos.');
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
//  Request body: { name, email, password }
// ─────────────────────────────────────────────────────────────
async function registrar() {
  ocultarError();

  const nombre    = document.getElementById('nombre')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const password  = document.getElementById('password')?.value;
  const password2 = document.getElementById('password2')?.value;
  const btn       = document.querySelector('.btn-principal');

  if (!nombre || !email || !password || !password2) { mostrarError('Por favor llena todos los campos.'); return; }
  if (!email.includes('@'))   { mostrarError('Escribe un correo válido.'); return; }
  if (password.length < 8)    { mostrarError('La contraseña debe tener al menos 8 caracteres.'); return; }
  if (password !== password2) { mostrarError('Las contraseñas no coinciden.'); return; }

  setLoading(btn, true);

  try {
    const res   = await fetch(AUTH_API.register, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: nombre, email, password }),
    });
    const texto = await res.text();
    const json  = JSON.parse(texto);
    // { success, tipo, mensaje, data: { token, usuario } }

    if (!json.success) {
      // registro interpreta los tipos de error del backend
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
//  Request body: { idToken }
// ─────────────────────────────────────────────────────────────
async function handleGoogleResponse(response) {
  try {
    const res   = await fetch(AUTH_API.google, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idToken: response.credential }),
    });
    const texto = await res.text();
    const json  = JSON.parse(texto);

    if (!json.success) {
      mostrarError(json.mensaje || 'Error al iniciar sesión con Google.');
      return;
    }

    guardarSesionYRedirigir(json.data);

  } catch (err) {
    mostrarError('La conexión falló, intenta de nuevo.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback:  handleGoogleResponse,
  });
  google.accounts.id.renderButton(
    document.getElementById('btn-google-container'),
    { theme: 'outline', size: 'large', width: 300 }
  );
});

// ─────────────────────────────────────────────────────────────
//  CERRAR SESIÓN
// ─────────────────────────────────────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}