// Shared small building blocks for block Panels (props editors).
// Kept intentionally tiny — panels just bind <Input>/<Textarea> to props
// and call onChange({ props: { ...block.props, [key]: value } }).
import * as React from 'react';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { Trash2, Plus } from 'lucide-react';

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

export function SelectField(props: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const inputId = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{props.label}</Label>
      <select
        id={inputId}
        value={props.value ?? ''}
        onChange={(e) => props.onChange(e.target.value)}
        className="flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      >
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ItemListEditor<T extends Record<string, unknown>>(props: {
  label: string;
  items: T[];
  makeItem: () => T;
  onChange: (items: T[]) => void;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}) {
  const items = props.items ?? [];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{props.label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => props.onChange([...items, props.makeItem()])}
        >
          <Plus className="size-3.5" /> Adicionar
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="relative space-y-2 rounded-md border border-border p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 size-6"
              onClick={() => props.onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-3.5" />
            </Button>
            {props.renderItem(
              item,
              (patch) => {
                const next = items.slice();
                next[index] = { ...item, ...patch };
                props.onChange(next);
              },
              index,
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum item adicionado ainda.</p>
        )}
      </div>
    </div>
  );
}
