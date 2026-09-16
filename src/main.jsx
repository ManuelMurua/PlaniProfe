import React from "react";
import { createRoot } from "react-dom/client";
import "./storage.js";
import App from "./App.jsx";

document.documentElement.style.background = "#E7ECEF";
createRoot(document.getElementById("root")).render(<App />);
