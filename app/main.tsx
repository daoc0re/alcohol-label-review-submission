import React from "react";
import { createRoot } from "react-dom/client";
import { ReviewWorkspace } from "@/components/review/workspace";
import "./globals.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReviewWorkspace />
  </React.StrictMode>,
);
