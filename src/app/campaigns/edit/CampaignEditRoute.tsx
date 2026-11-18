import { useParams } from 'react-router-dom';
import { CampaignWizard } from '../CampaignWizard';
import { isDraftId } from '../drafts';
import { PublishedCampaignEdit } from './PublishedCampaignEdit';

/**
 * campaigns/new e campaigns/:id/edit atendem dois casos:
 * - sem id ou rascunho ("draft-…"): assistente de 5 passos, como sempre;
 * - qualquer outro id: é um grupo PUBLICADO no LinkedIn e abre a tela de
 *   edição de campanha publicada. Antes, esse id caía no assistente, que
 *   abria vazio e sem aviso.
 *
 * As duas rotas usam este mesmo componente para o React Router reaproveitar o
 * assistente quando ele troca /new por /draft-…/edit ao salvar o rascunho (com
 * elementos de tipos diferentes, o assistente seria montado de novo).
 */
export function CampaignEditRoute() {
  const { id } = useParams<{ id: string }>();
  return !id || isDraftId(id) ? <CampaignWizard /> : <PublishedCampaignEdit />;
}
