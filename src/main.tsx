import { createRoot } from "react-dom/client";
import App from "./App"; // شيلنا الـ .tsx من هنا
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);