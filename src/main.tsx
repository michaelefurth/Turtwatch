import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/nunito"; // self-hosted rounded font (weights 200–1000)
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
