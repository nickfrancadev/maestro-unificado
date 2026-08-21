import React, { useState, useRef, useEffect } from 'react';
import { PaintBucket } from 'lucide-react';
import { BriefPane, type BriefDraft } from './BriefPane';
import { createDefaultBrandKit, MOCK_BRAND_FIXTURE } from './brandKit';
import type { CreativeData } from './types';
import { fetchClientVoice, saveClientVoice } from '@/lib/ai';

export function createEmptyBriefDraft(): BriefDraft {
  return {
    voice: '', context: '', websiteUrl: '',
    productService: '', audienceMarket: '', persona: '',
    brandColors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logo: null,
    source: null,
    extractedRef: '',
  };
}

interface BriefStepProps {
  creativeData?: CreativeData;
  onCreativeChange?: (data: CreativeData) => void;
  /**
   * O rascunho vive no `CampaignWizard`, não aqui. Este step desmonta a cada
   * navegação entre passos, e um estado local perderia toda edição ainda não
   * enviada com "Salvar marca" — que é o caso comum de quem preenche a marca
   * e clica direto em "Próximo Passo".
   */
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
}

export function BriefStep({ creativeData, onCreativeChange, draft, setDraft }: BriefStepProps) {
  const brandKit = creativeData?.brandKit || createDefaultBrandKit();
  const clientProductService = creativeData?.clientProductService || '';
  const clientAudienceMarket = creativeData?.clientAudienceMarket || '';
  const clientPersona = creativeData?.clientPersona || '';

  // Ref sincronizado com o último `creativeData` para que closures assíncronas
  // (o save da marca) leiam estado fresco em vez do snapshot do render que as
  // capturou.
  const creativeDataRef = useRef(creativeData);
  useEffect(() => { creativeDataRef.current = creativeData; }, [creativeData]);

  const updateCreative = (partial: Partial<CreativeData>) => {
    const current = creativeDataRef.current;
    if (!onCreativeChange || !current) return;
    const next = { ...current, ...partial };
    creativeDataRef.current = next;
    onCreativeChange(next);
  };

  // Carrega a marca já salva na conta, uma vez.
  useEffect(() => {
    if (!creativeData) return;
    if (brandKit.voice || brandKit.context || brandKit.websiteUrl) return;
    fetchClientVoice()
      .then((stored) => {
        if (
          stored.voice ||
          stored.brand_context ||
          stored.website_url ||
          stored.product_service ||
          stored.audience_market ||
          stored.persona
        ) {
          updateCreative({
            brandKit: {
              ...createDefaultBrandKit(),
              status: 'defined',
              voice: stored.voice,
              context: stored.brand_context,
              websiteUrl: stored.website_url,
              colors: stored.brand_colors || { primary: '', secondary: '', accent: '' },
            },
            clientProductService: stored.product_service || '',
            clientAudienceMarket: stored.audience_market || '',
            clientPersona: stored.persona || '',
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DOIS efeitos, de propósito. Antes era um só, com os campos de campanha
  // (produto/público/persona) na lista de deps e reescrevendo o draft INTEIRO —
  // e como esses três gravam ao vivo em `creativeData`, o prop controlado dava
  // a volta pelo `CampaignWizard`, o efeito reagia e ressuscitava a marca
  // *salva* por cima do que o usuário tinha acabado de digitar/extrair.
  // O semeador da marca agora só reage ao `brandKit`; os campos de campanha
  // fazem patch cirúrgico das próprias chaves.
  //
  // A assinatura + o ref existem porque este step DESMONTA a cada navegação do
  // wizard. Um efeito com lista de deps dispara de novo em toda remontagem, e
  // como o rascunho sobrevive no pai, ele voltaria a ser sobrescrito pela marca
  // salva — apagando justamente a edição que ainda não passou por "Salvar
  // marca". Adotar a assinatura atual na primeira renderização (sem escrever)
  // faz o efeito reagir só a mudanças REAIS do brandKit.
  const brandSignature = [
    brandKit.status,
    brandKit.voice,
    brandKit.context,
    brandKit.websiteUrl,
    brandKit.fontFamily,
    brandKit.colors.primary,
    brandKit.colors.secondary,
    brandKit.colors.accent,
  ].join('\u0000');
  const seededSignatureRef = useRef<string | null>(null);
  if (seededSignatureRef.current === null) seededSignatureRef.current = brandSignature;

  useEffect(() => {
    if (seededSignatureRef.current === brandSignature) return;
    seededSignatureRef.current = brandSignature;
    setDraft((d) => ({
      ...d,
      voice: brandKit.voice,
      context: brandKit.context,
      websiteUrl: brandKit.websiteUrl,
      brandColors: brandKit.colors,
      fontFamily: brandKit.fontFamily,
      logo: brandKit.logo,
      colorOptions: brandKit.colorOptions,
      // `source`/`extractedRef` NÃO são tocados aqui de propósito: quem os
      // possui são os handlers de extração (`applyFixtureToDraft` grava,
      // `handleResetExtraction` limpa). Zerá-los aqui fazia o chip de
      // procedência sumir exatamente ao salvar — o momento em que ele mais
      // importa —, já que salvar muda o `brandKit` e reacende este efeito.
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandSignature]);

  useEffect(() => {
    setDraft((d) => ({
      ...d,
      productService: clientProductService,
      audienceMarket: clientAudienceMarket,
      persona: clientPersona,
    }));
    // Aqui re-semear na remontagem é inofensivo: estes três gravam ao vivo em
    // `creativeData`, então o valor do prop JÁ é o que o usuário digitou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientProductService, clientAudienceMarket, clientPersona]);

  // Extraction UI state
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractWarning, setExtractWarning] = useState<string | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  // Sem o modal fechando, sucesso e falha do save global ficavam
  // indistinguíveis (o botão ia pra "Salvando…" e voltava). Estes dois estados
  // dão o feedback que a dispensa do overlay levou embora.
  const [saveBrandError, setSaveBrandError] = useState<string | null>(null);
  const [brandSaved, setBrandSaved] = useState(false);

  const persistVoice = async () => {
    setSavingBrand(true);
    setSaveBrandError(null);
    setBrandSaved(false);
    updateCreative({
      brandKit: {
        ...(creativeDataRef.current?.brandKit || createDefaultBrandKit()),
        status: 'defined',
        voice: draft.voice,
        context: draft.context,
        websiteUrl: draft.websiteUrl,
        colors: draft.brandColors,
        // As candidatas precisam ir junto: o efeito de sync re-semeia o draft a
        // partir do brandKit depois deste write, e sem elas aqui as amostras
        // desapareceriam no instante em que o usuário salva.
        colorOptions: draft.colorOptions,
        fontFamily: draft.fontFamily,
        logo: draft.logo,
      },
      clientProductService: draft.productService,
      clientAudienceMarket: draft.audienceMarket,
      clientPersona: draft.persona,
    });
    try {
      await saveClientVoice({
        voice: draft.voice,
        brand_context: draft.context,
        website_url: draft.websiteUrl,
        product_service: draft.productService,
        audience_market: draft.audienceMarket,
        persona: draft.persona,
        brand_colors: draft.brandColors,
      });
      setBrandSaved(true);
    } catch (e: any) {
      // A escrita local (updateCreative acima) permanece — o que falhou foi o
      // envio pro servidor, e é isso que a mensagem precisa dizer.
      setSaveBrandError(`Não foi possível salvar a marca no servidor: ${e?.message || 'erro desconhecido'}`);
    }
    setSavingBrand(false);
  };

  // O "salvo" é confirmação momentânea, não estado permanente da tela.
  useEffect(() => {
    if (!brandSaved) return;
    const t = setTimeout(() => setBrandSaved(false), 4000);
    return () => clearTimeout(t);
  }, [brandSaved]);

  const applyFixtureToDraft = (source: 'brandbook' | 'website', ref: string) => {
    setDraft((d) => ({
      ...d,
      voice: MOCK_BRAND_FIXTURE.voice,
      context: MOCK_BRAND_FIXTURE.context,
      brandColors: MOCK_BRAND_FIXTURE.colors,
      fontFamily: MOCK_BRAND_FIXTURE.fontFamily,
      logo: MOCK_BRAND_FIXTURE.logo,
      colorOptions: MOCK_BRAND_FIXTURE.colorOptions,
      source,
      extractedRef: ref,
    }));
  };

  const handleExtract = async () => {
    const url = draft.websiteUrl.trim();
    if (!url) return;
    setExtracting(true);
    setExtractError(null);
    setExtractWarning(null);
    // Mock: simula latência de rede e preenche a partir da fixture.
    await new Promise((r) => setTimeout(r, 900));
    applyFixtureToDraft('website', url);
    setExtractWarning('Extração simulada (mock) — revise os campos antes de salvar.');
    setExtracting(false);
  };

  const handleBrandBookUpload = async (file: File) => {
    setExtracting(true);
    setExtractError(null);
    setExtractWarning(null);
    await new Promise((r) => setTimeout(r, 900));
    applyFixtureToDraft('brandbook', file.name);
    setExtractWarning('Brand Book lido (mock) — revise os campos antes de salvar.');
    setExtracting(false);
  };

  const handleResetExtraction = () => {
    setExtractWarning(null);
    setExtractError(null);
    setDraft((d) => ({
      ...d,
      // websiteUrl e fontFamily são mantidos de propósito (pré-preenche um retry).
      source: null,
      extractedRef: '',
      voice: '',
      context: '',
      brandColors: { primary: '', secondary: '', accent: '' },
      logo: null,
    }));
  };

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PaintBucket className="w-6 h-6 text-[#FF5F39]" />
          Marca
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Define a marca e o brief usados por toda a campanha. A IA parte daqui para
          escrever e desenhar os criativos do próximo passo.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <BriefPane
          draft={draft}
          setDraft={setDraft}
          status={brandKit.status}
          savingBrand={savingBrand}
          saveError={saveBrandError}
          saveSucceeded={brandSaved}
          onSaveBrand={persistVoice}
          extracting={extracting}
          extractError={extractError}
          extractWarning={extractWarning}
          onExtractWebsite={handleExtract}
          onUploadBrandBook={handleBrandBookUpload}
          onResetExtraction={handleResetExtraction}
          onCampaignFieldChange={(patch) => updateCreative({
            ...(patch.productService !== undefined && { clientProductService: patch.productService }),
            ...(patch.audienceMarket !== undefined && { clientAudienceMarket: patch.audienceMarket }),
            ...(patch.persona !== undefined && { clientPersona: patch.persona }),
          })}
        />
      </div>
    </div>
  );
}
