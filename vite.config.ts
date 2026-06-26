import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // 👇 السطر ده هو اللي هيصلح الـ 404 وبدونه الملفات مش هتفتح أونلاين
  base: "/ERC/", 
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});