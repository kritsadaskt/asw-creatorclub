
  import { createRoot } from "react-dom/client";
  import "./styles/index.css";
  import { AppRouter } from "./app/router/AppRouter";

  createRoot(document.getElementById("root")!).render(<AppRouter />);
  