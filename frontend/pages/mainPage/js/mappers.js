export function mapearMuestras(raw) {
  return raw.map(m => {
    // Extraer el array de categorías del backend (puede venir de varias formas)
    const catsRaw = m.categorias ?? m.Categorias ?? m.categoria ?? m.Categoria ?? [];

    // Si es array de objetos → agarrar el primer nombre
    // Si es array de strings → agarrar el primero
    // Si es string directo → usarlo tal cual
    let categoriaNombre = '';
    let categoriaId     = null;

    if (Array.isArray(catsRaw) && catsRaw.length > 0) {
      const primera = catsRaw[0];
      if (typeof primera === 'object' && primera !== null) {
        categoriaNombre = primera.nombre ?? primera.Nombre ?? primera.name ?? '';
        categoriaId     = primera.id     ?? primera.Id     ?? primera.idCategoria ?? null;
      } else {
        // Es string directo dentro del array
        categoriaNombre = String(primera);
      }
    } else if (typeof catsRaw === 'string' && catsRaw) {
      categoriaNombre = catsRaw;
    }

    console.log(`[DEBUG] Muestra id=${m.id} — catsRaw:`, catsRaw, '→ nombre:', categoriaNombre, '| id:', categoriaId);

    return {
      id:            m.id,
      nombre:        m.nombre      || 'Sin nombre',
      // Guardamos el nombre de la primera categoría para mostrar en UI
      categoria:     categoriaNombre,
      // Guardamos el id de la primera categoría para pre-llenar el modal editar
      categoriaId:   categoriaId,
      descripcion:   m.descripcion || '',
      imagen:        m.imagenes?.[0]?.url || null,
      userId:        m.userId ?? m.idUsuario ?? m.creadorId ?? m.usuarioId
                  ?? m.id_usuario ?? m.IdUsuario ?? m.CreadorId ?? null,
      _raw: m,
    };
  });
}
