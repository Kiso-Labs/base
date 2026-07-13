import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export interface IssuePropertyOption {
  readonly label: string;
  readonly value: string;
}

export function IssuePropertySelect({
  disabled,
  label,
  onValueChange,
  options,
  size = "default",
  value,
}: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly IssuePropertyOption[];
  readonly size?: "default" | "sm" | "xs";
  readonly value: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Select
        disabled={disabled}
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue);
        }}
        value={value}
      >
        <SelectTrigger className="w-full" size={size}>
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
