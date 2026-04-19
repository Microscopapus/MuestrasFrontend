// ─────────────────────────────────────────────────────────────
//  AUTH CONFIG
//  Cuando tengas backend, cambia el endpoint aquí
// ─────────────────────────────────────────────────────────────
const AUTH_CONFIG = {
  loginEndpoint:    '/api/auth/login',
  registerEndpoint: '/api/auth/register',
  // Google OAuth: configura tu Client ID de Google Cloud Console
  googleClientId: 'TU_GOOGLE_CLIENT_ID',
};

// ─────────────────────────────────────────────────────────────
//  UTILIDADES UI
// ─────────────────────────────────────────────────────────────
function mostrarError(msg) {
  const el = document.getElementById('auth-error');
  document.getElementById('auth-error-msg').textContent = "La conexión falló intente de nuevo";
  el.style.display = 'block';
}

function ocultarError() {
  document.getElementById('auth-error').style.display = 'none';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Cargando...' : btn.dataset.texto;
}

// Guardar texto original de botones al cargar
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-principal').forEach(btn => {
    btn.dataset.texto = btn.textContent;
  });
});

// ─────────────────────────────────────────────────────────────
//  LOGIN CON EMAIL Y CONTRASEÑA
// ─────────────────────────────────────────────────────────────
async function loginEmail() {
  ocultarError();

  const email    = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const btn      = document.querySelector('.btn-principal');

  // Validaciones básicas
  if (!email || !password) {
    mostrarError('Por favor llena todos los campos.');
    return;
  }
  if (!email.includes('@')) {
    mostrarError('Escribe un correo válido.');
    return;
  }

  setLoading(btn, true);

  try {
    const res = await fetch(AUTH_CONFIG.loginEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.mensaje || 'Credenciales incorrectas.');

    // Guardar token/sesión
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    // Redirigir al catálogo
    window.location.href = 'index.html';

  } catch (err) {
    mostrarError("Fallo la conexión intente de nuevo");
  } finally {
    setLoading(btn, false);
  }
}

// ─────────────────────────────────────────────────────────────
//  REGISTRO
// ─────────────────────────────────────────────────────────────
async function registrar() {
  ocultarError();

  const nombre   = document.getElementById('nombre')?.value.trim();
  const email    = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const password2= document.getElementById('password2')?.value;
  const btn      = document.querySelector('.btn-principal');

  // Validaciones
  if (!nombre || !email || !password || !password2) {
    mostrarError('Por favor llena todos los campos.');
    return;
  }
  if (!email.includes('@')) {
    mostrarError('Escribe un correo válido.');
    return;
  }
  if (password.length < 8) {
    mostrarError('La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  if (password !== password2) {
    mostrarError('Las contraseñas no coinciden.');
    return;
  }

  setLoading(btn, true);

  try {
    const res = await fetch(AUTH_CONFIG.registerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.mensaje || 'No se pudo crear la cuenta.');

    // Guardar sesión y redirigir
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    window.location.href = 'index.html';

  } catch (err) {
    mostrarError(err.message);
  } finally {
    setLoading(btn, false);
  }
}

// ─────────────────────────────────────────────────────────────
//  LOGIN CON GOOGLE
//  Requiere Google Identity Services
//  Docs: https://developers.google.com/identity/gsi/web
// ─────────────────────────────────────────────────────────────
function loginGoogle() {
  // TODO: cuando tengas tu Google Client ID configurado,
  // descomenta este bloque y agrega el script de Google al HTML:
  // <script src="https://accounts.google.com/gsi/client"></script>
  //
  // google.accounts.id.initialize({
  //   client_id: AUTH_CONFIG.googleClientId,
  //   callback: handleGoogleResponse,
  // });
  // google.accounts.id.prompt();

  alert('Google login: ¿Seguro que quiere iniciar sesión con google?');
}

async function handleGoogleResponse(response) {
  // response.credential es el JWT de Google
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || 'Error con Google.');
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    window.location.href = 'index.html';
  } catch (err) {
    mostrarError(err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  CERRAR SESIÓN (llama esto desde index.html si quieres)
// ─────────────────────────────────────────────────────────────
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}