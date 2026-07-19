import React from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = "var(--primary)",
}) => {
  return (
    <div className="card glass-panel" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
      <div className="empty-icon" style={{ borderColor: iconColor }}>
        <Icon size={24} style={{ color: iconColor }} />
      </div>
      <div>
        <span className="form-label">{title}</span>
        <h3 style={{ fontSize: "28px", fontWeight: 800 }}>{value}</h3>
      </div>
    </div>
  );
};
