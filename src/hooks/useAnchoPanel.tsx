import { useEffect, useState } from "react";

/**
 * Ancho de un panel lateral, arrastrable y recordado entre sesiones.
 * `direccion` indica hacia dónde crece el panel al mover el divisor a la
 * derecha: 1 para el panel izquierdo, -1 para el derecho.
 */
export function useAnchoPanel(clave: string, inicial: number, min: number, max: number) {
    const [ancho, setAncho] = useState(() => {
      const guardado = Number(localStorage.getItem(clave));
      return guardado >= min && guardado <= max ? guardado : inicial;
    });
  
    useEffect(() => {
      localStorage.setItem(clave, String(ancho));
    }, [clave, ancho]);
  
    const iniciarArrastre = (evento: React.PointerEvent, direccion: 1 | -1) => {
      evento.preventDefault();
      const origenX = evento.clientX;
      const origenAncho = ancho;
      const mover = (e: PointerEvent) => {
        const nuevo = origenAncho + direccion * (e.clientX - origenX);
        setAncho(Math.min(max, Math.max(min, nuevo)));
      };
      const soltar = () => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        document.body.classList.remove("redimensionando");
      };
      document.body.classList.add("redimensionando");
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    };
  
    return [ancho, iniciarArrastre] as const;
  }