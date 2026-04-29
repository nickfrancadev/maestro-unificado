import svgPaths from "./svg-5p1qyi6jln";

function Produto() {
  return (
    <div className="relative shrink-0 size-[36.511px]" data-name="Produto">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36.5114 36.5114">
        <g id="Produto">
          <path d={svgPaths.p36cfe00} fill="var(--fill-0, #DBEAFE)" />
          <path d={svgPaths.p36cfe00} stroke="var(--stroke-0, #E5E7EB)" />
          <path d={svgPaths.pdbc5700} fill="var(--fill-0, #3571DE)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Div1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[32px] items-center relative shrink-0 w-[276.672px]" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Produto />
      <p className="font-['Alata:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#111827] text-[20px] whitespace-nowrap">Momento de mercado</p>
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

function Input() {
  return (
    <div className="bg-white h-[42px] relative rounded-[8px] shrink-0 w-full" data-name="input">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center p-[8px] relative size-full">
          <div className="-translate-y-1/2 absolute flex flex-col font-['Alata:Regular',sans-serif] justify-center leading-[0] left-[12px] not-italic text-[#adaebc] text-[14px] top-[21px] whitespace-nowrap">
            <p className="leading-[24px]">{`Ex: `}</p>
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
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Título do Momento</p>
      <Input />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-px items-start leading-[normal] not-italic relative shrink-0 text-[12px] whitespace-nowrap">
      <p className="font-['ABeeZee:Regular',sans-serif] relative shrink-0 text-[#707070]">DATA INICIAL DO MOMENTO</p>
      <p className="font-['Alata:Regular',sans-serif] relative shrink-0 text-black">15/03/2023</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-col gap-px items-start leading-[normal] not-italic relative shrink-0 text-[12px] whitespace-nowrap">
      <p className="font-['ABeeZee:Regular',sans-serif] relative shrink-0 text-[#707070]">DATA FINAL DO MOMENTO</p>
      <p className="font-['Alata:Regular',sans-serif] relative shrink-0 text-black">15/03/2023</p>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[24px] items-center relative shrink-0 w-full">
      <div className="flex-[1_0_0] min-w-px relative rounded-[10px]" data-name="Data">
        <div aria-hidden="true" className="absolute border-2 border-[#e0e0e0] border-solid inset-0 pointer-events-none rounded-[10px]" />
        <div className="content-stretch flex flex-col items-start px-[17px] py-[12px] relative size-full">
          <Frame2 />
        </div>
      </div>
      <div className="flex-[1_0_0] min-w-px relative rounded-[10px]" data-name="Data">
        <div aria-hidden="true" className="absolute border-2 border-[#e0e0e0] border-solid inset-0 pointer-events-none rounded-[10px]" />
        <div className="content-stretch flex flex-col items-start px-[17px] py-[12px] relative size-full">
          <Frame3 />
        </div>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full">
      <div className="relative shrink-0 size-[20px]">
        <div className="absolute border-2 border-black border-solid inset-0 rounded-[6px]" />
      </div>
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap">Datas não se aplicam</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
      <Frame8 />
      <Frame9 />
    </div>
  );
}

function Textarea() {
  return (
    <div className="bg-white h-[97px] relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">{`Ex: `}</p>
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
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Motivação</p>
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[11px] whitespace-nowrap">Oque te motivou a explorar esse momento?</p>
      <Textarea />
    </div>
  );
}

function Textarea1() {
  return (
    <div className="bg-white h-[97px] relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">{`Ex: `}</p>
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
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Descrição do Momento</p>
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[11px] whitespace-nowrap">Oque acontece nesse momento?</p>
      <Textarea1 />
    </div>
  );
}

function Textarea2() {
  return (
    <div className="bg-white h-[97px] relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">{`Ex: `}</p>
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
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Percepção</p>
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[11px] whitespace-nowrap">Como este momento é percebido pelo público</p>
      <Textarea2 />
    </div>
  );
}

function Textarea3() {
  return (
    <div className="bg-white h-[97px] relative rounded-[8px] shrink-0 w-full" data-name="textarea">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start p-[8px] relative size-full">
          <p className="font-['Alata:Regular',sans-serif] leading-[24px] not-italic relative shrink-0 text-[#adaebc] text-[14px] whitespace-nowrap">{`Ex: `}</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Div6() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex flex-col gap-[9px] items-start py-px relative shrink-0 w-full" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[14px] whitespace-nowrap">Percepção</p>
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[14px] not-italic relative shrink-0 text-[#374151] text-[11px] whitespace-nowrap">Como este momento é percebido pelo público</p>
      <Textarea3 />
    </div>
  );
}

function InformacoesDeClassificacao() {
  return (
    <div className="bg-[#f1f6fe] relative rounded-[8px] shrink-0 w-full" data-name="Informações de Classificação">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[16px] relative size-full">
        <Div2 />
        <Frame7 />
        <Div3 />
        <Div4 />
        <Div5 />
        <Div6 />
      </div>
    </div>
  );
}

function Button1() {
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

function Button2() {
  return (
    <div className="bg-[#3571de] content-stretch flex gap-[8px] h-[39px] items-center justify-center px-[16px] py-[8px] relative rounded-[8px] shrink-0 w-[179px]" data-name="button">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <I1 />
      <p className="font-['ABeeZee:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[16px] text-center text-white whitespace-nowrap">Salvar Público</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      <Button1 />
      <Button2 />
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <Frame4 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="content-stretch flex flex-col gap-[12px] items-start px-[16px] relative size-full">
        <InformacoesDeClassificacao />
        <Frame6 />
      </div>
    </div>
  );
}

export default function NovoMercado() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[12px] items-start pb-[24px] relative rounded-[10px] size-full" data-name="Novo Mercado">
      <Div />
      <Frame5 />
    </div>
  );
}