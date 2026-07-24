import { useState } from "react";
import "./App.css";
import { Editor } from "./ui/Editor";
import { Inicio } from "./ui/Inicio";

type Pantalla = { nombre: "inicio" } | { nombre: "editor"; carpeta: string };

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>({ nombre: "inicio" });

  if (pantalla.nombre === "editor") {
    return (
      <Editor
        carpeta={pantalla.carpeta}
        alVolver={() => setPantalla({ nombre: "inicio" })}
      />
    );
  }
  return <Inicio alAbrir={(carpeta) => setPantalla({ nombre: "editor", carpeta })} />;
}
