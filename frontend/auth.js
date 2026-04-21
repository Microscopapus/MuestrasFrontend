const AUTH_API = {
  login:    'https://microscopiobackend-production.up.railway.app/api/api/Auth/login/email',
  register: 'https://microscopiobackend-production.up.railway.app/api/auth/register/email',
 google: 'https://microscopiobackend-production.up.railway.app/api/Auth/login/google',
};

const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID';

// ─────────────────────────────────────────────────────────────
//  Adaptadores — controlan lo que el usuario ve
// ─────────────────────────────────────────────────────────────
//pone el texto del error en el div rojo y lo hace visible. Se llama cuando algo falla.
function mostrarError(msg) {
  const el = document.getElementById('auth-error');
  document.getElementById('auth-error-msg').textContent = msg;
  el.style.display = 'block';
}
//esconde el div rojo. Se llama al inicio de cada intento para limpiar el error anterior antes de intentar de nuevo.
function ocultarError() {
  document.getElementById('auth-error').style.display = 'none';
}

// Deshabilita el botón mientras carga y lo regresa a su texto original
function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Cargando...' : btn.dataset.texto; // ← typo corregido: datIaset → dataset
}
//guarda el texto original de cada botón ("Iniciar sesión", "Crear cuenta") en btn.dataset.texto antes de que se pueda cambiar, para que setLoading sepa a qué texto regresar después del "Cargando...".
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-principal').forEach(btn => {
    btn.dataset.texto = btn.textContent;
  });
});

// ─────────────────────────────────────────────────────────────
//  GUARDAR SESIÓN Y REDIRIGIR
// ─────────────────────────────────────────────────────────────
function guardarSesionYRedirigir(data) {
 localStorage.setItem('token', data.token);
 localStorage.setItem('usuario', JSON.stringify(data.usuario));
  window.location.href = 'index.html';
}

// ─────────────────────────────────────────────────────────────
//  TIPOS DE ERROR DEL BACKEND
// ─────────────────────────────────────────────────────────────
function mensajePorTipo(tipo, mensajeBackend) {
  const mensajes = {
    0: mensajeBackend,
    1: 'Error interno, intenta de nuevo.',
    2: 'Este correo ya está registrado.',
    3: 'La contraseña no cumple los requisitos.',
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
      body:    JSON.stringify({ Email:email, Passwor:password }),
    });
    const texto = await res.text();
    alert('Status: ' + res.status + ' | Respuesta: "' + texto + '"');
    const json  = JSON.parse(texto);
    // { success, tipo, mensaje, data: { token, usuario } }

  if (!json.success) { mostrarError(mensajePorTipo(json.tipo, json.mensaje)); return; }
  alert('data: ' + JSON.stringify(json.data));
    guardarSesionYRedirigir(json.data);

  } catch (err) {
    alert('Error: ' + err.message);
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

  //const nombre    = document.getElementById('nombre')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const password  = document.getElementById('password')?.value;
  const password2 = document.getElementById('password2')?.value;
  const btn       = document.querySelector('.btn-principal');

  //if (!nombre || !email || !password || !password2) { mostrarError('Por favor llena todos los campos.'); return; }
  if (!email.includes('@'))   { mostrarError('Escribe un correo válido.'); return; }
  if (password.length < 8)    { mostrarError('La contraseña debe tener al menos 8 caracteres.'); return; }
  if (password !== password2) { mostrarError('Las contraseñas no coinciden.'); return; }

  setLoading(btn, true);

  try {
    const res  = await fetch(AUTH_API.register, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({nombre, email, password }),
    });
    const texto = await res.text();
    const json  = JSON.parse(texto);
    // { success, tipo, mensaje, data: { token, usuario } }   ← corregido: era código suelto antes

    if (!json.success) { mostrarError(mensajePorTipo(json.tipo, json.mensaje)); return; }
    alert('data: ' + JSON.stringify(json.data));
    guardarSesionYRedirigir(json.data);

  } catch (err) {
    mostrarError('La conexión falló, intenta de nuevo.');
  } finally {
    setLoading(btn, false);
  }
}

// ─────────────────────────────────────────────────────────────
//  GOOGLE LOGIN — descomenta cuando tengas el Client ID
// ─────────────────────────────────────────────────────────────
function loginGoogle() {
 /* mostrarError('Google login aún no está configurado.');
}*/

async function handleGoogleResponse(response) {
  try {
    const res  = await fetch(AUTH_API.google, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: response.credential }),
    });
    const json = await res.json();

    if (!json.success) { mostrarError(mensajePorTipo(json.tipo, json.mensaje)); return; }

    guardarSesionYRedirigir(json.data);

  } catch (err) {
    mostrarError('La conexión falló, intenta de nuevo.');
  }
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