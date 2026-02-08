export const Utils = {
  // Genera un ID robusto: UUID si es compatible, o una combinación de fecha + random
  generarId: () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback para entornos antiguos (aunque Chrome/Edge modernos todos soportan UUID)
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  },

  // Escapa caracteres HTML peligrosos para prevenir XSS
  escaparHTML: (cadena) => {
    if (!cadena) return '';
    const div = document.createElement('div');
    div.textContent = cadena;
    return div.innerHTML;
  },

  // Formateo de fecha consistente para toda la app
  formatearFecha: (entradaFecha) => {
    let fecha;
    // Soporte para IDs legacy (timestamps numéricos) o Strings ISO
    if (typeof entradaFecha === 'number' || typeof entradaFecha === 'string') {
      fecha = new Date(entradaFecha);
    } else {
      fecha = entradaFecha; // Objeto Date directo
    }

    // Si la fecha es inválida, retorna string vacío
    if (!fecha || isNaN(fecha.getTime())) return '';

    return fecha.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  },

  // Formateo de moneda
  formatearMoneda: (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(cantidad || 0);
  },

  // Convertir Hex a RGB (para variables CSS)
  hexToRgb: (hex) => {
    // Expandir short hex #000 -> #000000
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  }
};
