import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;
// Evita que traductores automáticos (Chrome/Android) reemplacen nodos de texto,
// lo que rompe el árbol de React con NotFoundError: removeChild.
rootEl.setAttribute("translate", "no");
rootEl.classList.add("notranslate");

createRoot(rootEl).render(<App />);
