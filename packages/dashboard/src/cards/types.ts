import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface CardDefinition<TConfig = unknown> {
  type: string;
  label: string;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  component: ComponentType<CardProps<TConfig>>;
}

export interface CardProps<TConfig = unknown> {
  config: TConfig;
  width: number;
  height: number;
}

export interface CardInstance {
  id: string;
  type: string;
  config: unknown;
}
