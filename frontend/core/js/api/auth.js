function authHeaders(json = false) {
  const token = getToken();
  const h = { 'Authorization': `Bearer ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function getUserIdDesdeToken() {
  try {
    const token   = getToken();
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.id_usuario || decoded.sub || decoded.id || decoded.userId
        || decoded.nameid   || decoded.Id  || null;
  } catch {
    return null;
  }
}