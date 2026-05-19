import { API } from '../../../core/js/api/endpoints.js';
import { apiGet, apiPost, apiDelete, apiPut } from '../../../core/js/api/http.js';

export function obtenerMuestras() {
  return apiGet(`${API.muestras}?page=1&size=100`);
}

export function obtenerCategorias() {
  return apiGet(API.obtenerCategorias);
}

export function obtenerFavoritos() {
  return apiGet(`${API.obtenerFavoritos}?page=1&size=100`);
}

export function agregarFavorito(id) {
  return apiPost(API.agregarFavorito, {
    idMuestra: id
  });
}

export function eliminarFavorito(id) {
  return apiDelete(API.eliminarFavorito, {
    idMuestra: id
  });
}