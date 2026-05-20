import { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Eye,
  Edit3,
  BarChart3,
  Shield,
  Wallet,
  Key,
  Link2,
  Plus,
  RefreshCw,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getLinkedInAuthUrl,
  exchangeLinkedInCode,
  disconnectLinkedIn,
  fetchLinkedInAdAccounts,
  selectLinkedInAdAccount,
  createLinkedInAdAccount,
} from '@/lib/linkedin';
import type { LinkedInAdAccount } from '@/lib/linkedin';
import type { IntegrationData } from './types';

type ModalState = 'idle' | 'authorizing' | 'selecting_account' | 'connected';

interface Props {
  mode: 'connect' | 'manage';
  currentStatus?: IntegrationData;
  onClose: () => void;
  onStatusRefresh: () => Promise<void>;
}

export function LinkedInConnectionModal({ mode, currentStatus, onClose, onStatusRefresh }: Props) {
  const isAlreadyConnected = currentStatus?.status === 'connected';

  const [state, setState] = useState<ModalState>(() => {
    if (mode === 'manage' && isAlreadyConnected) return 'selecting_account';
    return 'idle';
  });

  const [adAccounts, setAdAccounts] = useState<LinkedInAdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    currentStatus?.selected_ad_account_id || null,
  );
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Ad Account sub-view state
  const [view, setView] = useState<'list' | 'create'>('list');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountCurrency, setNewAccountCurrency] = useState('BRL');
  const [newAccountOrgUrn, setNewAccountOrgUrn] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const loadAdAccounts = async () => {
    setLoadingAccounts(true);
    setError(null);
    try {
      const accounts = await fetchLinkedInAdAccounts();
      setAdAccounts(accounts);
    } catch (err: any) {
      setError('Erro ao carregar Ad Accounts: ' + err.message);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // If manage mode, load ad accounts immediately
  useEffect(() => {
    if (mode === 'manage' && isAlreadyConnected) {
      loadAdAccounts();
    }
  }, [mode, isAlreadyConnected]);

  // Listen for OAuth callback from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'linkedin-oauth-callback' && event.data?.code) {
        try {
          const result = await exchangeLinkedInCode(event.data.code);
          if (result) {
            toast.success('LinkedIn autorizado com sucesso!');
            await onStatusRefresh();
            await loadAdAccounts();
            setState('selecting_account');
          } else {
            setError('Falha ao trocar o codigo de autorizacao. Tente novamente.');
            setState('idle');
          }
        } catch {
          setError('Erro inesperado no OAuth. Tente novamente.');
          setState('idle');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStatusRefresh]);

  const handleStartOAuth = async () => {
    setError(null);
    try {
      const authUrl = await getLinkedInAuthUrl();
      const popup = window.open(authUrl, 'linkedin-oauth', 'width=600,height=700');
      setState('authorizing');

      if (popup) {
        const interval = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(interval);
              setState((s) => (s === 'authorizing' ? 'idle' : s));
              return;
            }
            const popupUrl = popup.location.href;
            if (popupUrl.includes('code=')) {
              const url = new URL(popupUrl);
              const code = url.searchParams.get('code');
              popup.close();
              clearInterval(interval);
              if (code) {
                window.postMessage({ type: 'linkedin-oauth-callback', code }, '*');
              }
            }
          } catch {
            // Cross-origin — ignore until redirect
          }
        }, 500);
      }
    } catch {
      toast.error('Erro ao iniciar OAuth do LinkedIn.');
      setState('idle');
    }
  };

  const handleSelectAccount = async () => {
    if (!selectedAccountId) return;
    const account = adAccounts.find((a) => a.id === selectedAccountId);
    if (!account) return;

    setSubmitting(true);
    setError(null);
    try {
      const ok = await selectLinkedInAdAccount(account.id, account.name, account.currency);
      if (ok) {
        await onStatusRefresh();
        setState('connected');
        toast.success(`Ad Account "${account.name}" selecionada com sucesso!`);
      } else {
        setError('Falha ao salvar a selecao. Tente novamente.');
      }
    } catch (err: any) {
      setError('Erro ao selecionar Ad Account: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnectFromModal = async () => {
    setSubmitting(true);
    const ok = await disconnectLinkedIn();
    if (ok) {
      toast.info('LinkedIn Ads desconectado.');
      await onStatusRefresh();
      onClose();
    } else {
      toast.error('Falha ao desconectar.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] overflow-hidden">
        {/* Header */}
        <div className="bg-[#0077b5] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
                alt="LinkedIn"
                className="w-6 h-6"
              />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                {mode === 'manage' ? 'Gerenciar LinkedIn Ads' : 'Conectar LinkedIn Ads'}
              </h3>
              <p className="text-white/70 text-xs">Marketing API — OAuth 2.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* STATE 1: idle */}
          {state === 'idle' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Pre-requisitos</h4>
                <div className="space-y-2">
                  {[
                    { text: 'App criado no LinkedIn Developer Portal', done: true },
                    { text: 'Aprovacao Marketing Developer Platform', done: true },
                    { text: 'Voce precisara de uma Ad Account ativa no LinkedIn', done: false },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          item.done ? 'bg-green-100' : 'bg-slate-100'
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          item.done ? 'text-slate-600' : 'text-slate-800 font-medium'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Permissoes solicitadas</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { scope: 'r_ads', label: 'Leitura de campanhas', icon: <Eye className="w-3.5 h-3.5" /> },
                    { scope: 'rw_ads', label: 'Criar e editar campanhas', icon: <Edit3 className="w-3.5 h-3.5" /> },
                    { scope: 'r_ads_reporting', label: 'Acesso a analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                    { scope: 'r_organization_social', label: 'Dados da organizacao', icon: <Shield className="w-3.5 h-3.5" /> },
                  ].map((perm) => (
                    <div
                      key={perm.scope}
                      className="flex items-start gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        {perm.icon}
                      </div>
                      <div>
                        <p className="text-[11px] font-mono text-blue-600">{perm.scope}</p>
                        <p className="text-[11px] text-slate-500">{perm.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: authorizing */}
          {state === 'authorizing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-slate-800">
                  Aguardando autorizacao no LinkedIn...
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Uma janela foi aberta para voce autorizar o acesso.
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  Se a janela nao abriu, verifique se popups estao permitidos no navegador.
                </p>
              </div>
            </div>
          )}

          {/* STATE 3: selecting_account */}
          {state === 'selecting_account' && (
            <div className="space-y-5">
              {mode === 'connect' && (
                <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800 text-sm">
                      LinkedIn autorizado com sucesso!
                    </h4>
                    <p className="text-xs text-green-600">
                      Agora selecione qual Ad Account usar nas campanhas da Maestro.
                    </p>
                  </div>
                </div>
              )}

              {mode === 'manage' && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 text-sm">Gerenciar Ad Account</h4>
                    <p className="text-xs text-blue-600">
                      Selecione ou troque a Ad Account vinculada as suas campanhas.
                    </p>
                  </div>
                </div>
              )}

              {view === 'list' && (
                <>
                  {loadingAccounts ? (
                    <div className="flex flex-col items-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                      <p className="text-sm text-slate-500">Carregando Ad Accounts...</p>
                    </div>
                  ) : adAccounts.length === 0 ? (
                    <div className="text-center py-8 bg-amber-50 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                      <h4 className="font-semibold text-amber-800">
                        Nenhuma Ad Account ativa encontrada
                      </h4>
                      <p className="text-xs text-amber-600 mt-1 max-w-xs mx-auto">
                        Crie uma Ad Account no{' '}
                        <a
                          href="https://www.linkedin.com/campaignmanager/"
                          target="_blank"
                          className="underline font-medium"
                        >
                          LinkedIn Campaign Manager
                        </a>{' '}
                        e tente novamente.
                      </p>
                      <button
                        onClick={loadAdAccounts}
                        className="mt-4 px-4 py-2 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 inline mr-1" />
                        Tentar novamente
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {adAccounts.map((account) => {
                        const isSelected = selectedAccountId === account.id;
                        return (
                          <button
                            key={account.id}
                            onClick={() => setSelectedAccountId(account.id)}
                            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-semibold text-slate-800 text-sm">{account.name}</h5>
                                  {account.status === 'ACTIVE' && (
                                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                      ATIVA
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-slate-400">ID: {account.id}</span>
                                  {account.currency && (
                                    <span className="text-xs text-slate-400">
                                      Moeda: {account.currency}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setView('create');
                      setCreateError(null);
                      setCreateSuccess(false);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Criar nova Ad Account
                  </button>
                </>
              )}

              {view === 'create' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800 text-sm">Criar Nova Ad Account</h4>
                      <p className="text-xs text-blue-600">
                        Preencha os campos abaixo para criar uma nova Ad Account.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-mono text-blue-600">Nome da Ad Account</p>
                        <input
                          type="text"
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                          placeholder="Ex: Marketing ABM"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <BarChart3 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-mono text-blue-600">Moeda</p>
                        <select
                          value={newAccountCurrency}
                          onChange={(e) => setNewAccountCurrency(e.target.value)}
                          className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="BRL">BRL</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-mono text-blue-600 mb-0.5">
                          Organizacao URN
                          <span className="font-sans text-slate-400">(opcional)</span>
                          <span className="relative group ml-0.5">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl z-50 leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none block">
                              <span className="font-semibold mb-1.5 block">Como encontrar o Organization ID:</span>
                              <span className="block space-y-1 text-slate-300">
                                <span className="block">1. Acesse a pagina da empresa no LinkedIn</span>
                                <span className="block">2. Veja a URL do navegador</span>
                                <span className="block">
                                  3. Copie o numero apos <span className="font-mono text-white">/company/</span>
                                </span>
                              </span>
                              <span className="mt-2 p-1.5 bg-slate-800 rounded-lg font-mono text-[10px] text-slate-300 break-all block">
                                linkedin.com/company/<span className="text-blue-400 font-bold">2414183</span>/
                              </span>
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </span>
                          </span>
                        </label>
                        <input
                          type="text"
                          value={newAccountOrgUrn}
                          onChange={(e) => setNewAccountOrgUrn(e.target.value)}
                          className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                          placeholder="Ex: urn:li:organization:123456789"
                        />
                      </div>
                    </div>
                  </div>

                  {createError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{createError}</p>
                    </div>
                  )}

                  {createSuccess && (
                    <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-green-700">Ad Account criada com sucesso!</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setView('list')}
                      className="py-2.5 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-white transition-colors"
                    >
                      Voltar para a lista
                    </button>
                    <button
                      onClick={async () => {
                        setIsCreating(true);
                        setCreateError(null);
                        setCreateSuccess(false);
                        try {
                          const result = await createLinkedInAdAccount({
                            name: newAccountName.trim(),
                            currency: newAccountCurrency,
                            reference: newAccountOrgUrn
                              ? newAccountOrgUrn.startsWith('urn:')
                                ? newAccountOrgUrn
                                : `urn:li:organization:${newAccountOrgUrn.replace(/\D/g, '')}`
                              : undefined,
                          });

                          if (!result.success) {
                            throw new Error(result.error || 'Erro ao criar Ad Account no LinkedIn');
                          }

                          setCreateSuccess(true);
                          toast.success(`Ad Account "${newAccountName}" criada com sucesso!`);

                          setTimeout(async () => {
                            await loadAdAccounts();
                            setView('list');
                            setCreateSuccess(false);
                            setNewAccountName('');
                            setNewAccountCurrency('BRL');
                            setNewAccountOrgUrn('');
                          }, 2000);
                        } catch (err: any) {
                          setCreateError(
                            err.message || 'Nao foi possivel criar a Ad Account. Tente novamente.',
                          );
                        } finally {
                          setIsCreating(false);
                        }
                      }}
                      disabled={isCreating || !newAccountName.trim()}
                      className={`py-2.5 px-6 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all ${
                        isCreating || !newAccountName.trim()
                          ? 'bg-blue-300 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {isCreating ? 'Criando no LinkedIn...' : 'Criar Ad Account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE 4: connected */}
          {state === 'connected' && (
            <div className="flex flex-col items-center py-6 space-y-5">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>

              <div className="text-center">
                <h4 className="text-xl font-bold text-slate-800">LinkedIn Ads conectado!</h4>
                <p className="text-sm text-slate-500 mt-1">Sua integracao esta pronta para uso.</p>
              </div>

              <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Resumo da Conexao
                  </span>
                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                </div>
                {currentStatus?.selected_ad_account_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Wallet className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{currentStatus.selected_ad_account_name}</span>
                  </div>
                )}
                {currentStatus?.selected_ad_account_id && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>ID: {currentStatus.selected_ad_account_id}</span>
                  </div>
                )}
                {currentStatus?.selected_ad_account_currency && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Moeda: {currentStatus.selected_ad_account_currency}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          {state === 'idle' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartOAuth}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-[#0077b5] text-white hover:bg-[#006097] shadow-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Conectar via LinkedIn OAuth
              </button>
            </div>
          )}

          {state === 'authorizing' && (
            <button
              onClick={() => setState('idle')}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-white transition-colors"
            >
              Cancelar
            </button>
          )}

          {state === 'selecting_account' && (
            <div className="flex gap-3">
              {mode === 'manage' && (
                <button
                  onClick={handleDisconnectFromModal}
                  disabled={submitting}
                  className="py-2.5 px-4 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Desconectar
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-white transition-colors"
              >
                {mode === 'manage' ? 'Fechar' : 'Voltar'}
              </button>
              <button
                onClick={handleSelectAccount}
                disabled={!selectedAccountId || submitting}
                className={`py-2.5 px-6 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all ${
                  !selectedAccountId || submitting
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Selecao
              </button>
            </div>
          )}

          {state === 'connected' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-white transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  onClose();
                  toast.info('Navegue ate "Campanhas" para comecar a criar!');
                }}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                <Zap className="w-4 h-4" />
                Comecar a criar campanhas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
