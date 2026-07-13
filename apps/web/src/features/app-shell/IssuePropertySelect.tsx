import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

export interface IssuePropertyOption {
  readonly label: string;
  readonly value: string;
}

export function IssuePropertySelect({
  disabled,
  icon,
  label,
  onValueChange,
  options,
  size = "default",
  value,
  variant = "field",
}: {
  readonly disabled?: boolean;
  readonly icon?: React.ReactNode;
  readonly label: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly IssuePropertyOption[];
  readonly size?: "default" | "sm" | "xs";
  readonly value: string;
  readonly variant?: "field" | "pill";
}) {
  return (
    <label className={cn(variant === "field" && "space-y-1.5")}>
      <span className={cn("text-xs font-medium text-foreground", variant === "pill" && "sr-only")}>
        {label}
      </span>
      <Select
        disabled={disabled}
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue);
        }}
        value={value}
      >
        <SelectTrigger
          aria-label={label}
          className={cn(
            variant === "field" && "w-full",
            variant === "pill" &&
              "w-auto min-w-0 rounded-full border-border/60 bg-muted/45 px-3 text-muted-foreground shadow-none hover:bg-muted/70 hover:text-foreground",
          )}
          size={size}
        >
          {icon}
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </label>
  );
}
