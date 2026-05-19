let _toastTimer;
function mostrarToast(msg, _toastTimer) {
  let t = document.getElementById('_toast');
  if (!t) {
    t           = document.createElement('div');
    t.id        = '_toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('visible'), 2800);
}
