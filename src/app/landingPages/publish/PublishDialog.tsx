// PublishDialog — Task 16. Controlled dialog for choosing a slug (with live
// availability check), publishing/unpublishing a landing page, and a
// SIMULATED custom-domain flow (Pending -> Verifying -> Active with a
// copyable CNAME). No real DNS/SSL is involved anywhere in this file —
// everything under the "Domínios" section beyond the always-on path route
// is local UI state that resets when the dialog closes/unmounts.
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Globe, Loader2, Rocket, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { getPage, savePage, isSlugAvailable } from '../store/repo';
import { slugify, type LandingPage } from '../store/model';

type DomainStatus = 'idle' | 'provisioning' | 'active';
type CustomDomainStatus = 'pending' | 'verifying' | 'active';

export interface PublishDialogProps {
  page: LandingPage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: (updated: LandingPage) => void;
}

function CopyableCode({ value, label }: { value: string; label?: string }) {
  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    toast.success('Copiado para a área de transferência.');
  };
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
        {label ? `${label} ` : ''}
        {value}
      </code>
      <Button type="button" variant="outline" size="icon" onClick={handleCopy} title="Copiar">
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

export function PublishDialog({ page, open, onOpenChange, onChanged }: PublishDialogProps) {
  const [slugInput, setSlugInput] = useState(page.slug);
  const [subdomainInput, setSubdomainInput] = useState(page.slug);
  const [customDomainInput, setCustomDomainInput] = useState('');

  const [subdomainStatus, setSubdomainStatus] = useState<DomainStatus>('idle');
  const [customDomainStatus, setCustomDomainStatus] = useState<CustomDomainStatus | 'idle'>('idle');

  // Timer refs so any pending simulated step is cleared on unmount / dialog
  // close, preventing setState-after-unmount.
  const subdomainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customDomainTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearSubdomainTimer = () => {
    if (subdomainTimerRef.current) {
      clearTimeout(subdomainTimerRef.current);
      subdomainTimerRef.current = null;
    }
  };
  const clearCustomDomainTimers = () => {
    customDomainTimersRef.current.forEach(clearTimeout);
    customDomainTimersRef.current = [];
  };

  useEffect(() => () => {
    clearSubdomainTimer();
    clearCustomDomainTimers();
  }, []);

  // Reset local (non-persisted) state whenever the dialog is (re)opened for
  // a given page, so a stale simulation from a previous open doesn't leak in.
  useEffect(() => {
    if (!open) return;
    setSlugInput(page.slug);
    setSubdomainInput(page.slug);
    setCustomDomainInput('');
    setSubdomainStatus('idle');
    setCustomDomainStatus('idle');
    clearSubdomainTimer();
    clearCustomDomainTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page.id]);

  const normalizedSlug = slugify(slugInput);
  const slugAvailable = normalizedSlug.length > 0 && isSlugAvailable(normalizedSlug, page.id);
  const isPublished = page.status === 'published';
  const canPublish = normalizedSlug.length > 0 && slugAvailable;

  const handleSlugChange = (raw: string) => {
    setSlugInput(slugify(raw));
  };

  const handlePublish = () => {
    if (!canPublish) return;
    const latest = getPage(page.id) ?? page;
    const updated: LandingPage = { ...latest, slug: normalizedSlug, status: 'published' };
    savePage(updated);
    onChanged?.(updated);
    toast.success(`"${updated.name}" publicada com sucesso.`);
  };

  const handleUnpublish = () => {
    const latest = getPage(page.id) ?? page;
    const updated: LandingPage = { ...latest, status: 'draft' };
    savePage(updated);
    onChanged?.(updated);
    toast.success(`"${updated.name}" despublicada. O rascunho continua editável.`);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard?.writeText(url);
    toast.success('URL copiada para a área de transferência.');
  };

  const handleProvisionSubdomain = () => {
    if (!subdomainInput.trim() || subdomainStatus === 'provisioning') return;
    setSubdomainStatus('provisioning');
    clearSubdomainTimer();
    subdomainTimerRef.current = setTimeout(() => {
      setSubdomainStatus('active');
      subdomainTimerRef.current = null;
    }, 1200);
  };

  const handleVerifyCustomDomain = () => {
    if (!customDomainInput.trim() || customDomainStatus === 'verifying' || customDomainStatus === 'active') return;
    clearCustomDomainTimers();
    // Walks Pendente -> Verificando -> Ativo, each step simulated with a
    // short setTimeout. Both timers are tracked so unmount/close can cancel
    // whichever is still pending.
    setCustomDomainStatus('pending');
    const t1 = setTimeout(() => {
      setCustomDomainStatus('verifying');
      const t2 = setTimeout(() => {
        setCustomDomainStatus('active');
      }, 1400);
      customDomainTimersRef.current = [t2];
    }, 900);
    customDomainTimersRef.current = [t1];
  };

  const liveUrl = `${window.location.origin}/p/${page.slug}`;
  const pathPreviewUrl = `maestroabm.com/p/${normalizedSlug || page.slug}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          clearSubdomainTimer();
          clearCustomDomainTimers();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-[#FF5F39]" />
            Publicar landing page
          </DialogTitle>
          <DialogDescription>
            Escolha o slug, publique ou despublique, e configure domínios (simulação de preview).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Slug section */}
          <div className="space-y-1.5">
            <Label htmlFor="pd-slug">Slug</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-slate-400">/p/</span>
              <Input
                id="pd-slug"
                value={slugInput}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="minha-pagina"
                className="font-mono text-sm"
              />
            </div>
            {normalizedSlug.length === 0 ? (
              <p className="text-xs text-slate-500">Informe um slug para publicar.</p>
            ) : slugAvailable ? (
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Check className="size-3.5" /> disponível
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                <X className="size-3.5" /> já em uso
              </p>
            )}
          </div>

          {/* Publish / Unpublish */}
          <div className="rounded-lg border border-slate-200 p-3.5">
            {isPublished ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Publicada</Badge>
                  <span className="text-xs text-slate-500">A página está no ar.</span>
                </div>
                <CopyableCode value={liveUrl} />
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={handleUnpublish}>
                    Despublicar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  A página ainda não está publicada. Ao publicar, <code>/p/{normalizedSlug || '...'}</code>{' '}
                  fica acessível imediatamente.
                </div>
                <Button type="button" onClick={handlePublish} disabled={!canPublish} className="shrink-0 bg-[#FF5F39] hover:bg-[#E54A26]">
                  <Rocket className="size-3.5" />
                  Publicar
                </Button>
              </div>
            )}
          </div>

          {/* Domains (simulated) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900">Domínios</span>
              <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
                simulação / preview
              </Badge>
            </div>

            <Tabs defaultValue="path">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="path">Path</TabsTrigger>
                <TabsTrigger value="subdomain">Subdomínio</TabsTrigger>
                <TabsTrigger value="custom">Domínio próprio</TabsTrigger>
              </TabsList>

              <TabsContent value="path" className="space-y-2 pt-2">
                <p className="text-xs text-slate-500">
                  URL padrão, disponível sem nenhuma configuração adicional.
                </p>
                <CopyableCode value={pathPreviewUrl} />
              </TabsContent>

              <TabsContent value="subdomain" className="space-y-2 pt-2">
                <p className="text-xs text-slate-500">
                  Provisiona um subdomínio gratuito com SSL simulado.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={subdomainInput}
                    onChange={(e) => setSubdomainInput(slugify(e.target.value))}
                    placeholder="minha-conta"
                    className="font-mono text-sm"
                    disabled={subdomainStatus !== 'idle'}
                  />
                  <span className="shrink-0 text-xs text-slate-400">.maestropages.com</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {subdomainStatus === 'idle' && (
                    <>
                      <span className="text-xs text-slate-400">SSL ainda não provisionado.</span>
                      <Button type="button" variant="outline" size="sm" onClick={handleProvisionSubdomain}>
                        Provisionar
                      </Button>
                    </>
                  )}
                  {subdomainStatus === 'provisioning' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <Loader2 className="size-3.5 animate-spin" /> provisionando SSL…
                    </span>
                  )}
                  {subdomainStatus === 'active' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <ShieldCheck className="size-3.5" /> Ativo (simulado)
                    </span>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-2 pt-2">
                <p className="text-xs text-slate-500">
                  Aponte seu domínio próprio via CNAME. Verificação de DNS/SSL é simulada nesta prévia.
                </p>
                <Input
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="paginas.suaempresa.com"
                  className="font-mono text-sm"
                />
                <CopyableCode label="CNAME  →" value="cname.maestropages.com" />
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {customDomainStatus === 'idle' && <span className="text-slate-400">Aguardando verificação</span>}
                    {customDomainStatus === 'pending' && (
                      <Badge variant="outline" className="border-slate-300 text-slate-600">Pendente</Badge>
                    )}
                    {customDomainStatus === 'verifying' && (
                      <Badge variant="outline" className="border-amber-300 text-amber-600">
                        <Loader2 className="size-3 animate-spin" /> Verificando
                      </Badge>
                    )}
                    {customDomainStatus === 'active' && (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        <ShieldCheck className="size-3" /> Ativo
                      </Badge>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyCustomDomain}
                    disabled={
                      !customDomainInput.trim() ||
                      customDomainStatus === 'pending' ||
                      customDomainStatus === 'verifying' ||
                      customDomainStatus === 'active'
                    }
                  >
                    Verificar
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PublishDialog;
