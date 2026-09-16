import React, { useEffect, useRef } from "react";

// Config vía variables de entorno (públicas, no son secretas como la clave de Anthropic):
// VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX en .env
const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || "";

let scriptCargado = false;
function cargarScriptAdsense(client) {
  if (scriptCargado || document.querySelector('script[data-adsbygoogle]')) return;
  scriptCargado = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  s.crossOrigin = "anonymous";
  s.dataset.adsbygoogle = "true";
  document.head.appendChild(s);
}

// slot: el ID del bloque de anuncio de tu cuenta de AdSense (data-ad-slot).
export default function AdSlot({ slot, style }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!CLIENT || !slot) return;
    cargarScriptAdsense(CLIENT);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      /* el script puede no haber cargado aún; AdSense reintenta solo */
    }
  }, [slot]);

  if (!CLIENT || !slot) {
    if (import.meta.env.DEV) {
      return (
        <div
          className="adPlaceholder noprint"
          style={{
            border: "1px dashed var(--linea)",
            borderRadius: 4,
            padding: "14px 16px",
            fontSize: 12.5,
            color: "var(--suave)",
            textAlign: "center",
            ...style,
          }}
        >
          Espacio publicitario — configura VITE_ADSENSE_CLIENT y VITE_ADSENSE_SLOT_* en .env para que se muestre el anuncio real.
        </div>
      );
    }
    return null;
  }

  return (
    <ins
      ref={ref}
      className="adsbygoogle noprint"
      style={{ display: "block", ...style }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
