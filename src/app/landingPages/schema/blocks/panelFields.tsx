// Shared small building blocks for the page-settings (SEO) panel — see
// editor/StylePanel.tsx's no-selection branch. Historically these also
// backed each block's own content Panel (props editor); those were removed
// in favor of the per-slot StylePanel (Task 8), which only still needs the
// plain text/textarea fields for SEO title/description. Kept intentionally
// tiny — bind <Input>/<Textarea> to a value and call onChange(value).
import * as React from 'react';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const inputId = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{props.label}</Label>
      <Input
        id={inputId}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

export function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const inputId = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{props.label}</Label>
      <Textarea
        id={inputId}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}
