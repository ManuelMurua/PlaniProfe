// Dentro de Claude, window.storage ya existe y guarda los datos en la cuenta.
// Fuera de Claude no existe, así que aquí se reemplaza por localStorage
// manteniendo la misma forma de respuesta que espera el componente.
if (typeof window !== "undefined" && !window.storage) {
  const clave = (k) => `pm:${k}`;

  window.storage = {
    async get(key) {
      const v = localStorage.getItem(clave(key));
      if (v === null) throw new Error(`La clave ${key} no existe`);
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(clave(key), value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(clave(key));
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(clave(prefix)))
        .map((k) => k.slice(3));
      return { keys, prefix, shared: false };
    },
  };
}
