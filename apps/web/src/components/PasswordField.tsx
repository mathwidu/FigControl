"use client";

import { evaluatePasswordPolicy } from "@figcontrol/shared";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useId, useState } from "react";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled?: boolean;
  showPolicy?: boolean;
  error?: string | null;
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  disabled = false,
  showPolicy = false,
  error = null,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={visible ? "text" : "password"}
          minLength={8}
          required
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
      {showPolicy ? <PasswordRequirementList password={value} /> : null}
    </div>
  );
}

function PasswordRequirementList({ password }: { password: string }) {
  const policy = evaluatePasswordPolicy(password);

  return (
    <ul className="password-requirements" aria-label="Requisitos da senha">
      {policy.requirements.map((requirement) => (
        <li
          className={requirement.met ? "met" : ""}
          key={requirement.id}
          aria-live="polite"
        >
          {requirement.met ? <Check size={15} /> : <X size={15} />}
          <span>{requirement.label}</span>
        </li>
      ))}
    </ul>
  );
}
