import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import PasteBoard from "./pages/PasteBoard.tsx";
import CreatePaste from "./pages/CreatePaste.tsx";
import ReadPaste from "./pages/ReadPaste.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <PasteBoard /> },
      { path: "new", element: <CreatePaste /> },
      { path: "p/:id", element: <ReadPaste /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
