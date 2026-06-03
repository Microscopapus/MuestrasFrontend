const AUTH_API = {
  login:    'https://microscopiobackend-production.up.railway.app/api/Auth/login/email',
  register: 'https://microscopiobackend-production.up.railway.app/api/Auth/register/email',
  google:   'https://microscopiobackend-production.up.railway.app/api/Auth/login/google',
};

const GOOGLE_CLIENT_ID = '30335745792-2elqg0tt0s9iq9u0hd6flgbstldbjrg1.apps.googleusercontent.com';

// ── Helpers UI ──────────────────────────────────────────────
function mostrarError(msg) {
  const el = document.getElementById('auth-error');
  document.getElementById('auth-error-msg').textContent = msg;
  el.style.display = 'block';
}

function ocultarError() {
  document.getElementById('auth-error').style.display = 'none';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Cargando…' : btn.dataset.texto;
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const show  = input.type === 'password';
  input.type  = show ? 'text' : 'password';
  btn.innerHTML = show
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-auth').forEach(btn => {
    btn.dataset.texto = btn.textContent;
  });
});

// ── Sesión ──────────────────────────────────────────────────
function guardarSesionYRedirigir(data) {
  localStorage.setItem('token',   data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  window.location.replace('panpri.html');
}

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

// ── Login ────────────────────────────────────────────────────
async function loginEmail() {
  ocultarError();
  const email    = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const btn      = document.querySelector('.btn-auth');

  if (!email || !password) { mostrarError('Por favor llena todos los campos.'); return; }
  if (!email.includes('@')) { mostrarError('Escribe un correo válido.'); return; }

  setLoading(btn, true);
  try {
    const res  = await fetch(AUTH_API.login, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.success) { mostrarError(json.mensaje || 'Correo o contraseña incorrectos.'); return; }
    guardarSesionYRedirigir(json.data);
  } catch { mostrarError('La conexión falló, intenta de nuevo.'); }
  finally   { setLoading(btn, false); }
}

// ── Registro ─────────────────────────────────────────────────
async function registrar() {
  ocultarError();
  const nombre    = document.getElementById('nombre')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const password  = document.getElementById('password')?.value;
  const password2 = document.getElementById('password2')?.value;
  const btn       = document.querySelector('.btn-auth');

  if (!nombre || !email || !password || !password2) { mostrarError('Por favor llena todos los campos.'); return; }
  if (!email.includes('@'))   { mostrarError('Escribe un correo válido.'); return; }
  if (password.length < 8)    { mostrarError('La contraseña debe tener al menos 8 caracteres.'); return; }
  if (password !== password2) { mostrarError('Las contraseñas no coinciden.'); return; }

  setLoading(btn, true);
  try {
    const res  = await fetch(AUTH_API.register, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nombre, email, password }),
    });
    const json = await res.json();
    if (!json.success) { mostrarError(mensajePorTipo(json.tipo, json.mensaje)); return; }
    guardarSesionYRedirigir(json.data);
  } catch { mostrarError('La conexión falló, intenta de nuevo.'); }
  finally   { setLoading(btn, false); }
}

// ── Google ───────────────────────────────────────────────────
async function handleGoogleResponse(response) {
  try {
    const res  = await fetch(AUTH_API.google, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential }),
    });
    const json = await res.json();
    if (!json.success) { mostrarError(json.mensaje || 'Error al iniciar sesión con Google.'); return; }
    guardarSesionYRedirigir(json.data);
  } catch { mostrarError('La conexión falló, intenta de nuevo.'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const googleBtnContainer = document.getElementById('btn-google-container');
  if (googleBtnContainer && typeof google !== 'undefined') {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse });
    google.accounts.id.renderButton(googleBtnContainer, { theme: 'filled_black', size: 'large', width: 360, text: 'continue_with' });
  }
});

// ── Cerrar sesión ─────────────────────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.replace('index.html');
}