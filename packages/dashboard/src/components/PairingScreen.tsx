import { useState } from "react";
import { GlassCard } from "./ui/glass-card.js";
import { GlassInput } from "./ui/glass-input.js";
import { GlassButton } from "./ui/glass-button.js";
import { Tablet } from "lucide-react";

interface PairingScreenProps {
  onPaired: (token: string) => void;
}

export function PairingScreen({ onPaired }: PairingScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, deviceName: "Dashboard Tablet" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Pairing failed");
        return;
      }
      onPaired(data.token ?? data.deviceToken);
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh flex items-center justify-center p-6">
      <GlassCard className="w-full max-w-sm p-8 flex flex-col items-center gap-6 animate-glass-in">
        <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-sm flex items-center justify-center">
          <Tablet className="w-8 h-8 text-[var(--text-secondary)]" />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Pair Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Enter the 6-digit code from Settings
          </p>
        </div>

        <GlassInput
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
          }}
          placeholder="000000"
          maxLength={6}
          inputMode="numeric"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <GlassButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={code.length !== 6 || loading}
        >
          {loading ? "Pairing..." : "Pair"}
        </GlassButton>
      </GlassCard>
    </div>
  );
}
