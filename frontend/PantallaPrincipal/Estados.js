// ── Estado compartido ─────────────────────────────────────────
let muestras      = [];
let categorias    = [];
let favoritos     = [];
let muestraActual = null;
let usuarioActual = null;
let crearCatId    = null;
let editarCatId   = null;
let filtroChips   = [];

(function () {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('../Auth/Login.html');
    return;
  }
  history.pushState(null, '', location.href);
  window.addEventListener('popstate', function () {
    history.pushState(null, '', location.href);
  });
})();