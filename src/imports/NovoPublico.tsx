import svgPaths from "./svg-pe2xv1dbe6";

function FluentPeopleAudience32Regular() {
  return (
    <div className="relative shrink-0 size-[23px]" data-name="fluent:people-audience-32-regular">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 23 23">
        <g id="fluent:people-audience-32-regular">
          <path d={svgPaths.p19711000} fill="var(--fill-0, #FF5F39)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Produto() {
  return (
    <div className="bg-[#ffebe0] content-stretch flex items-center justify-center relative rounded-[6.419px] shrink-0 size-[38.511px]" data-name="Produto">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[6.419px]" />
      <FluentPeopleAudience32Regular />
    </div>
  );
}

function Div1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[32px] items-center relative shrink-0 w-[276.672px]" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Produto />
      <p className="font-['Alata:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#111827] text-[20px] whitespace-nowrap">Novo Público</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="h-[16px] relative shrink-0 w-[12px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 16">
        <g id="Frame">
          <path d="M12 16H0V0H12V16Z" stroke="var(--stroke-0, #E5E7EB)" />
          <path d={svgPaths.p38412200} fill="var(--fill-0, #6B7280)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Svg() {
  return (
    <div className="absolute content-stretch flex h-[16px] items-center justify-center left-0 top-[3px] w-[12px]" data-name="svg">
      <Frame />
    </div>
  );
}

function I() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[24px] relative shrink-0 w-[12px]" data-name="i">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Svg />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[32px]" data-name="button">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <I />
    </div>
  );
}

function Div() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[65px] relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[16px] relative size-full">
          <Div1 />
          <Button />
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0">
      <div className="h-[10px] relative shrink-0 w-[16px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 10">
          <path clipRule="evenodd" d={svgPaths.p3a463800} fill="var(--fill-0, #FF5F39)" fillRule="evenodd" id="Vector" />
        </svg>
      </div>
      <p className="font-['Alata:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#111827] text-[18px] whitespace-nowrap">Informações de Classificação</p>
    </div>
  );
}

function Input() {
  return (
    <div className="bg-white h-[42px] relative rounded-[8px] shrink-0 w-full" data-name="input">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center p-[8px] relative size-full">
          <div className="-translate-y-1/2 absolute flex flex-col font-['Alata:Regular',sans-serif] justify-center leading-[0] left-[12px] not-italic text-[#adaebc] text-[14px] top-[21px] whitespace-nowrap">
            <p className="leading-[24px]">Ex: Líderes de RH, Casais jovens, Grupo de Investidores</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Div2() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Título do Público/Cluster</p>
      <Input />
    </div>
  );
}

function Textarea() {
  return (
    <div className="bg-white h-[97px] relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">Ex: Cargo, ocupação, faixa etária, responsabilidades principais</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Div3() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start py-px relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Perfil Resumido</p>
      <Textarea />
    </div>
  );
}

function InformacoesDeClassificacao() {
  return (
    <div className="bg-[#f1f6fe] relative rounded-[8px] shrink-0 w-full" data-name="Informações de Classificação">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[16px] relative size-full">
        <Frame5 />
        <Div2 />
        <Div3 />
      </div>
    </div>
  );
}

function Group() {
  return (
    <div className="h-[20px] relative shrink-0 w-[18px]" data-name="Group">
      <div className="absolute inset-[-5%_-5.56%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 21.9996">
          <g id="Group">
            <path d={svgPaths.p2b2eb120} id="Vector" stroke="var(--stroke-0, #FF5F39)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d={svgPaths.p1214ff00} id="Vector_2" stroke="var(--stroke-0, #FF5F39)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d={svgPaths.p10217be} id="Vector_3" stroke="var(--stroke-0, #FF5F39)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0">
      <Group />
      <p className="font-['Alata:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#111827] text-[18px] whitespace-nowrap">Desafios e Motivações</p>
    </div>
  );
}

function Textarea1() {
  return (
    <div className="bg-white h-[97px] relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">Descreva o produto/serviço e seus principais benefícios</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Div4() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start py-px relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Principais Desafios</p>
      <Textarea1 />
    </div>
  );
}

function Textarea2() {
  return (
    <div className="bg-white h-[97px] relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">Descreva o produto/serviço e seus principais benefícios</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Div5() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start py-px relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Principais Motivações</p>
      <Textarea2 />
    </div>
  );
}

function DesafiosEMotivacoes() {
  return (
    <div className="bg-[#f1f6fe] relative rounded-[8px] shrink-0 w-full" data-name="Desafios e Motivações">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[16px] relative size-full">
        <Frame6 />
        <Div4 />
        <Div5 />
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="h-[20px] relative shrink-0 w-[18px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 20">
        <g id="Group 993">
          <path d={svgPaths.p2fa7a00} fill="var(--fill-0, #FF5F39)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <Group1 />
      <p className="font-['Alata:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#111827] text-[18px] whitespace-nowrap">Jornada de Compra (Opcional)</p>
    </div>
  );
}

function Input1() {
  return (
    <div className="bg-white h-[42px] relative rounded-[8px] shrink-0 w-full" data-name="input">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center p-[8px] relative size-full">
          <div className="-translate-y-1/2 absolute flex flex-col font-['Alata:Regular',sans-serif] justify-center leading-[0] left-[12px] not-italic text-[#adaebc] text-[14px] top-[21px] whitespace-nowrap">
            <p className="leading-[24px]">Ex: Identifica necessidade quando sistema atual falha</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Div6() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">1- Como percebe o problema?</p>
      <Input1 />
    </div>
  );
}

function Textarea3() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">Ex: Pesquisa no Google, pede referências, testa demos</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Div7() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start py-px relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">2- Como pesquisa soluções?</p>
      <Textarea3 />
    </div>
  );
}

function Textarea4() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">Ex: Prioriza custo-benefício e suporte técnico</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Div8() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start py-px relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">3- Como decide comprar?</p>
      <Textarea4 />
    </div>
  );
}

function JornadaDeCompraOpcional() {
  return (
    <div className="bg-[#f1f6fe] relative rounded-[8px] shrink-0 w-full" data-name="Jornada de Compra (Opcional)">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[16px] relative size-full">
        <Frame7 />
        <Div6 />
        <Div7 />
        <Div8 />
      </div>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <div className="flex items-center justify-center relative shrink-0">
        <div className="-scale-y-100 flex-none rotate-180">
          <div className="h-[23px] relative w-[16px]" data-name="Caminho 81">
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 23">
              <path d={svgPaths.pfb8d080} fill="var(--fill-0, #FF5F39)" id="Caminho 81" />
            </svg>
          </div>
        </div>
      </div>
      <p className="font-['Alata:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#111827] text-[18px] whitespace-nowrap">Contas</p>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[48px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d="M20 24H28" id="Vector" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d="M20 16H28" id="Vector_2" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d={svgPaths.p1a9bd860} id="Vector_3" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d={svgPaths.pb4da140} id="Vector_4" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d={svgPaths.p1764aa00} id="Vector_5" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[21px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="-translate-x-1/2 absolute font-['ABeeZee:Regular',sans-serif] leading-[21px] left-[136.52px] not-italic text-[#364153] text-[14px] text-center top-[0.5px] whitespace-nowrap">Nenhuma conta selecionada</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[18px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="-translate-x-1/2 absolute font-['Alata:Regular',sans-serif] leading-[18px] left-[136.5px] not-italic text-[#6a7282] text-[12px] text-center top-px whitespace-nowrap">Selecione as contas que fazem parte deste público</p>
    </div>
  );
}

function Container() {
  return (
    <div className="h-[39px] relative shrink-0 w-[271.508px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Paragraph />
        <Paragraph1 />
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-white h-[41px] relative rounded-[10px] shrink-0 w-[153.914px]" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#3571de] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['ABeeZee:Regular',sans-serif] leading-[21px] left-[18px] not-italic text-[#3571de] text-[14px] top-[10.5px] whitespace-nowrap">+ Adicionar Contas</p>
      </div>
    </div>
  );
}

function AccountSelector() {
  return (
    <div className="bg-[#f9fafb] content-stretch flex flex-col gap-[16px] h-[228px] items-center justify-center p-[2px] relative rounded-[10px] shrink-0 w-full" data-name="AccountSelector">
      <div aria-hidden="true" className="absolute border-2 border-[#d1d5dc] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Icon />
      <Container />
      <Button1 />
    </div>
  );
}

function JornadaDeCompraOpcional1() {
  return (
    <div className="bg-[#f1f6fe] relative rounded-[8px] shrink-0 w-full" data-name="Jornada de Compra (Opcional)">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[16px] relative size-full">
        <Frame8 />
        <AccountSelector />
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0">
      <div className="relative shrink-0 size-[20px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
          <path d={svgPaths.p16e68f40} fill="var(--fill-0, #FF5F39)" id="Vector" />
        </svg>
      </div>
      <p className="font-['Alata:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#111827] text-[18px] whitespace-nowrap">Mercado Alvo</p>
    </div>
  );
}

function Input2() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full" data-name="input">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[12px] py-[8px] relative size-full">
          <div className="flex flex-col font-['Alata:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">
            <p className="leading-[24px]">Mercado 1</p>
          </div>
          <div className="h-[6px] relative shrink-0 w-[12px]">
            <div className="absolute inset-[-16.67%_-8.33%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 8">
                <path d="M1 1L7 7L13 1" id="Vector 105" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex items-center justify-center px-[12px] py-[16px] relative rounded-[8px] shrink-0">
      <div aria-hidden="true" className="absolute border-2 border-[#3571de] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#3571de] text-[14px] whitespace-nowrap">Crie um novo Mercado</p>
    </div>
  );
}

function Div9() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Selecione um mercado para incluir este público</p>
      <Input2 />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">ou</p>
      <Frame10 />
    </div>
  );
}

function JornadaDeCompraOpcional2() {
  return (
    <div className="bg-[#f1f6fe] relative rounded-[8px] shrink-0 w-full" data-name="Jornada de Compra (Opcional)">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[16px] relative size-full">
        <Frame9 />
        <Div9 />
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-white content-stretch flex h-[39px] items-center justify-center px-[10px] py-[8px] relative rounded-[8px] shrink-0 w-[170px]" data-name="button">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#797979] text-[16px] text-center whitespace-nowrap">Cancelar</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="h-[14px] relative shrink-0 w-[12.25px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.25 14">
        <g id="Frame">
          <g clipPath="url(#clip0_146_3801)">
            <path d={svgPaths.p36ecb300} fill="var(--fill-0, white)" id="Vector" />
          </g>
        </g>
        <defs>
          <clipPath id="clip0_146_3801">
            <path d="M0 0H12.25V14H0V0Z" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Svg1() {
  return (
    <div className="absolute content-stretch flex h-[14px] items-center justify-center left-0 top-[2.75px] w-[12.25px]" data-name="svg">
      <Frame1 />
    </div>
  );
}

function I1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[12.25px]" data-name="i">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Svg1 />
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#3571de] content-stretch flex gap-[8px] h-[39px] items-center justify-center px-[16px] py-[8px] relative rounded-[8px] shrink-0 w-[179px]" data-name="button">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <I1 />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap">Salvar Público</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      <Button2 />
      <Button3 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full">
      <JornadaDeCompraOpcional2 />
      <Frame2 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="content-stretch flex flex-col gap-[12px] items-start px-[16px] relative size-full">
        <InformacoesDeClassificacao />
        <DesafiosEMotivacoes />
        <JornadaDeCompraOpcional />
        <JornadaDeCompraOpcional1 />
        <Frame4 />
      </div>
    </div>
  );
}

export default function NovoPublico() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[12px] items-start pb-[24px] relative rounded-[10px] size-full" data-name="Novo Público">
      <Div />
      <Frame3 />
    </div>
  );
}