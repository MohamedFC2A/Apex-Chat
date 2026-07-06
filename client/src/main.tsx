import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "katex/dist/katex.min.css";
import { runDiagnostics } from "./lib/diagnostics";

// Run intelligent system diagnostics
runDiagnostics();

createRoot(document.getElementById("root")!).render(<App />);
