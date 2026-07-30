import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BriefPane, type BriefDraft } from './BriefPane';

afterEach(cleanup);

function draft(over: Partial<BriefDraft> = {}): BriefDraft {
  return {
    voice: '', context: '', websiteUrl: '',
    productService: '', audienceMarket: '', persona: '',
    brandColors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
    icons: [], graphics: [],
    source: null, extractedRef: '',
    ...over,
  };
}

function setup(over: Partial<BriefDraft> = {}, status: 'defined' | 'empty' = 'empty', props = {}) {
  const setDraft = vi.fn();
  const onSaveBrand = vi.fn();
  const onCampaignFieldChange = vi.fn();
  render(
    <BriefPane
      draft={draft(over)}
      setDraft={setDraft}
      status={status}
      savingBrand={false}
      onSaveBrand={onSaveBrand}
      extracting={false}
      extractError={null}
      extractWarning={null}
      onExtractWebsite={vi.fn()}
      onUploadBrandBook={vi.fn()}
      onResetExtraction={vi.fn()}
      onCampaignFieldChange={onCampaignFieldChange}
      {...props}
    />,
  );
  return { setDraft, onSaveBrand, onCampaignFieldChange };
}

describe('BriefPane — marca já definida', () => {
  // O bug central: hoje o modal renderiza BrandSummary em somente-leitura
  // quando a marca vem de /ai/client-voice, e não há como alterá-la.
  it('renderiza o tom de voz num campo editável', () => {
    const { setDraft } = setup({ voice: 'Técnico e didático' }, 'defined');
    const campo = screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement;
    expect(campo).not.toHaveAttribute('readonly');
    expect(campo.value).toBe('Técnico e didático');
    fireEvent.change(campo, { target: { value: 'Direto' } });
    expect(setDraft).toHaveBeenCalled();
  });

  it('mantém as ações de extração alcançáveis', () => {
    setup({ voice: 'Técnico' }, 'defined');
    expect(screen.getByText(/substituir a partir de pdf/i)).toBeTruthy();
    expect(screen.getByText(/extrair do site novamente/i)).toBeTruthy();
  });

  it('avisa que a marca vale para todas as campanhas', () => {
    setup({ voice: 'Técnico' }, 'defined');
    expect(screen.getByText(/todas as campanhas/i)).toBeTruthy();
  });
});

describe('BriefPane — marca vazia', () => {
  it('mostra os campos preenchíveis sem exigir extração antes', () => {
    setup({}, 'empty');
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
    expect(screen.queryByText(/aparecem após a extração/i)).toBeNull();
  });

  it('oferece os dois caminhos de extração', () => {
    setup({}, 'empty');
    expect(screen.getByText(/brand book/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /extrair com ia/i })).toBeTruthy();
  });
});

describe('BriefPane — separação de escopo', () => {
  // Campo de campanha grava ao vivo; não pode acionar o save global.
  it('campo de campanha chama onCampaignFieldChange e não onSaveBrand', () => {
    const { onCampaignFieldChange, onSaveBrand } = setup({}, 'defined');
    fireEvent.change(screen.getByLabelText(/produto\/serviço/i), {
      target: { value: 'Produto A' },
    });
    expect(onCampaignFieldChange).toHaveBeenCalledWith({ productService: 'Produto A' });
    expect(onSaveBrand).not.toHaveBeenCalled();
  });

  it('salvar marca chama onSaveBrand uma vez', () => {
    const { onSaveBrand } = setup({ voice: 'Técnico' }, 'defined');
    fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
    expect(onSaveBrand).toHaveBeenCalledTimes(1);
  });
});
