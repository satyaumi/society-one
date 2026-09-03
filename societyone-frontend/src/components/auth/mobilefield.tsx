import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DEFAULT_COUNTRY_CODES } from "@/lib/auth/password-validators";

export function MobileField({
  id = "mobile",
  label = "Mobile number",
  countryCode,
  onCountryCodeChange,
  localNumber,
  onLocalNumberChange,
  error,
  disabled,
  required = true,
}: {
  id?: string;
  label?: string;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  localNumber: string;
  onLocalNumberChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        <Phone className="mr-1.5 inline size-3.5 -translate-y-0.5 text-muted-foreground" />
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <div className="mt-2 flex gap-2">
        <select
          aria-label="Country code"
          value={countryCode}
          disabled={disabled}
          onChange={(event) => onCountryCodeChange(event.target.value)}
          className="h-9 max-w-[7.5rem] shrink-0 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        >
          {DEFAULT_COUNTRY_CODES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.code}
            </option>
          ))}
        </select>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={localNumber}
          disabled={disabled}
          aria-invalid={!!error}
          onChange={(event) => onLocalNumberChange(event.target.value)}
          className={cn("flex-1", error && "border-destructive focus:ring-destructive")}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
