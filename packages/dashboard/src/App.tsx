import { GridBoard } from "./components/GridBoard.js";
import { GlassButton } from "./components/ui/glass-button.js";
import { useTheme } from "./context/ThemeContext.js";
import { Sun, Moon } from "lucide-react";

export default function App() {
  const { resolved, toggleAppearance } = useTheme();

  return (
    <div className="relative h-dvh">
      <GridBoard />
      <div className="fixed bottom-4 left-4 z-40">
        <GlassButton size="icon" variant="ghost" onClick={toggleAppearance} className="w-8 h-8">
          {resolved === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </GlassButton>
      </div>
    </div>
  );
}
