import React, { useState } from "react";
import { RefreshCw } from "lucide-react";

interface PasswordGeneratorProps {
  onGenerate: (pass: string) => void;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onGenerate }) => {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  const generate = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let pool = lowercase;
    if (includeUppercase) pool += uppercase;
    if (includeNumbers) pool += numbers;
    if (includeSymbols) pool += symbols;

    let pass = "";
    if (includeUppercase) pass += uppercase[Math.floor(Math.random() * uppercase.length)];
    if (includeNumbers) pass += numbers[Math.floor(Math.random() * numbers.length)];
    if (includeSymbols) pass += symbols[Math.floor(Math.random() * symbols.length)];

    const remainingLength = length - pass.length;
    for (let i = 0; i < remainingLength; i++) {
      pass += pool[Math.floor(Math.random() * pool.length)];
    }

    const shuffled = pass
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
    onGenerate(shuffled);
  };

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.2)",
        border: "1px solid var(--border)",
        padding: "12px",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <span className="form-label" style={{ fontSize: "10px" }}>
        Secure Generator
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="range"
          min="8"
          max="32"
          value={length}
          onChange={(e) => setLength(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: "var(--primary)" }}
        />
        <span style={{ fontSize: "12px", minWidth: "48px", textAlign: "right" }}>
          {length} chars
        </span>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "11px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeUppercase}
            onChange={(e) => setIncludeUppercase(e.target.checked)}
          />
          A-Z
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeNumbers}
            onChange={(e) => setIncludeNumbers(e.target.checked)}
          />
          0-9
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeSymbols}
            onChange={(e) => setIncludeSymbols(e.target.checked)}
          />
          !@#%
        </label>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={generate}
        style={{ padding: "6px 12px", fontSize: "12px", gap: "4px" }}
      >
        <RefreshCw size={12} /> Generate Password
      </button>
    </div>
  );
};
