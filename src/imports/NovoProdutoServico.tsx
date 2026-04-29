import svgPaths from "./svg-2zxdqbrxsk";

function Frame() {
  return (
    <div className="h-[14px] relative shrink-0 w-[12.25px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.25 14">
        <g id="Frame">
          <path d="M12.25 14H0V0H12.25V14Z" stroke="var(--stroke-0, #E5E7EB)" />
          <path d={svgPaths.p363f1d80} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Svg() {
  return (
    <div className="absolute content-stretch flex h-[14px] items-center justify-center left-0 top-[2.75px] w-[12.25px]" data-name="svg">
      <Frame />
    </div>
  );
}

function I() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[12.25px]" data-name="i">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Svg />
    </div>
  );
}

function Div2() {
  return (
    <div className="bg-[#3571de] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[32px]" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <I />
    </div>
  );
}

function H() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[28px] relative shrink-0 w-[232.672px]" data-name="h2">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold h-[32px] leading-[normal] left-0 not-italic text-[#111827] text-[20px] top-[4px] w-[260px]">Adicionar Produto/Serviço</p>
    </div>
  );
}

function Div1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[32px] items-center relative shrink-0 w-[276.672px]" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Div2 />
      <H />
    </div>
  );
}

function Frame1() {
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

function Svg1() {
  return (
    <div className="absolute content-stretch flex h-[16px] items-center justify-center left-0 top-[3px] w-[12px]" data-name="svg">
      <Frame1 />
    </div>
  );
}

function I1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[24px] relative shrink-0 w-[12px]" data-name="i">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Svg1 />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[32px]" data-name="button">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <I1 />
    </div>
  );
}

function Div() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] content-stretch flex h-[65px] items-center justify-between left-0 px-[24px] py-[16px] top-0 w-[638px]" data-name="div">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <Div1 />
      <Button />
    </div>
  );
}

function Label() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[22px] left-0 top-px w-[26.719px]" data-name="label">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-0 w-[30px]">Tipo</p>
    </div>
  );
}

function Input() {
  return (
    <div className="bg-[rgba(0,0,0,0)] relative rounded-[9999px] shrink-0 size-[16px]" data-name="input">
      <div aria-hidden="true" className="absolute border-[0.5px] border-black border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}

function Span() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[49.047px]" data-name="span">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-[-1px] w-[53px]">Produto</p>
    </div>
  );
}

function Label1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[8px] h-full items-center relative shrink-0 w-[73.047px]" data-name="label">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Input />
      <Span />
    </div>
  );
}

function Input1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] relative rounded-[9999px] shrink-0 size-[16px]" data-name="input">
      <div aria-hidden="true" className="absolute border-[0.5px] border-black border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}

function Span1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[46.688px]" data-name="span">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-[-1px] w-[50px]">Serviço</p>
    </div>
  );
}

function Label2() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[8px] h-full items-center relative shrink-0 w-[70.688px]" data-name="label">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Input1 />
      <Span1 />
    </div>
  );
}

function Input2() {
  return (
    <div className="bg-[rgba(0,0,0,0)] relative rounded-[9999px] shrink-0 size-[16px]" data-name="input">
      <div aria-hidden="true" className="absolute border-[0.5px] border-black border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}

function Span2() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[46.688px]" data-name="span">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[22px] leading-[normal] left-[1.27px] not-italic text-[#374151] text-[14px] top-[-1px] w-[94px]">Treinamento</p>
    </div>
  );
}

function Label3() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[8px] h-full items-center relative shrink-0 w-[70.688px]" data-name="label">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Input2 />
      <Span2 />
    </div>
  );
}

function Div5() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] content-stretch flex gap-[16px] h-[20px] items-start left-0 top-[36px] w-[590px]" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Label1 />
      <Label2 />
      <Label3 />
    </div>
  );
}

function Div4() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[56px] left-[-8px] top-0 w-[590px]" data-name="div">
      <Label />
      <Div5 />
    </div>
  );
}

function Label4() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[22px] left-0 top-px w-[47.516px]" data-name="label">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-0 w-[51px]">Nome *</p>
    </div>
  );
}

function Input3() {
  return (
    <div className="absolute bg-white border border-[#d1d5db] border-solid h-[42px] left-0 rounded-[8px] top-[32px] w-[590px]" data-name="input">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[42px] justify-center leading-[0] left-[11px] not-italic text-[#adaebc] text-[16px] top-[20px] w-[590px]">
        <p className="leading-[24px]">Digite o nome do produto/serviço</p>
      </div>
    </div>
  );
}

function Div6() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[74px] left-0 top-[80px] w-[590px]" data-name="div">
      <Label4 />
      <Input3 />
    </div>
  );
}

function Label5() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[22px] left-0 top-px w-[72.406px]" data-name="label">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-0 w-[78px]">Descrição *</p>
    </div>
  );
}

function Textarea() {
  return (
    <div className="absolute bg-white border border-[#d1d5db] border-solid h-[90px] left-0 overflow-clip rounded-[8px] top-[32px] w-[590px]" data-name="textarea">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[90px] leading-[24px] left-[11px] not-italic text-[#adaebc] text-[16px] top-[7px] w-[590px]">Descreva o produto/serviço e seus principais benefícios</p>
    </div>
  );
}

function Div7() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[129px] left-0 top-[178px] w-[590px]" data-name="div">
      <Label5 />
      <Textarea />
    </div>
  );
}

function Label6() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[22px] left-0 top-px w-[46.75px]" data-name="label">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-0 w-[50px]">Preço *</p>
    </div>
  );
}

function Span3() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[24px] left-[33px] top-[11px] w-[19.844px]" data-name="span">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[25px] leading-[normal] left-0 not-italic text-[#6b7280] text-[16px] top-[-1px] w-[21px]">R$</p>
    </div>
  );
}

function Input4() {
  return (
    <div className="absolute bg-white border border-[#d1d5db] border-solid h-[42px] left-0 rounded-[8px] top-0 w-[287px]" data-name="input">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[42px] justify-center leading-[0] left-[67px] not-italic text-[#adaebc] text-[16px] top-[20px] w-[213px]">
        <p className="leading-[24px]">0,00</p>
      </div>
      <Span3 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute left-0 size-[29px] top-[6px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29 29">
        <g id="Frame">
          <path clipRule="evenodd" d={svgPaths.p621c600} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Div10() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[42px] left-0 top-[32px] w-[287px]" data-name="div">
      <Input4 />
      <Frame2 />
    </div>
  );
}

function Div9() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[77px] left-0 top-0 w-[287px]" data-name="div">
      <Label6 />
      <Div10 />
    </div>
  );
}

function Label7() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[22px] left-0 top-px w-[52.156px]" data-name="label">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-0 w-[56px]">Unidade</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute left-[3px] size-[29px] top-[7px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29 29">
        <g id="Frame">
          <path clipRule="evenodd" d={svgPaths.p13584200} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Select() {
  return (
    <div className="absolute bg-white border border-[#d1d5db] border-solid h-[45px] left-0 rounded-[8px] top-[32px] w-[287px]" data-name="select">
      <div className="-translate-y-1/2 absolute flex flex-col font-['Inter:Regular',sans-serif] font-normal h-[45px] justify-center leading-[0] left-[33px] not-italic overflow-hidden text-[16px] text-black text-ellipsis top-[21.5px] w-[38px] whitespace-nowrap">
        <p className="leading-[normal] overflow-hidden text-ellipsis">/mês</p>
      </div>
      <Frame3 />
    </div>
  );
}

function Div11() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[77px] left-[303px] top-0 w-[287px]" data-name="div">
      <Label7 />
      <Select />
    </div>
  );
}

function Div8() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[77px] left-0 top-[336px] w-[590px]" data-name="div">
      <Div9 />
      <Div11 />
    </div>
  );
}

function Label8() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[22px] left-0 top-px w-[39.703px]" data-name="label">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-0 w-[44px]">Status</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Frame">
          <path d={svgPaths.p2f658e80} fill="var(--fill-0, #0075FF)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Svg2() {
  return (
    <div className="absolute content-stretch flex h-[23px] items-center justify-center left-px top-[-1.5px] w-[18px]" data-name="svg">
      <Frame4 />
    </div>
  );
}

function Input5() {
  return (
    <div className="bg-[rgba(0,0,0,0)] relative rounded-[9999px] shrink-0 size-[16px]" data-name="input">
      <div aria-hidden="true" className="absolute border-[#0075ff] border-[0.5px] border-solid inset-0 pointer-events-none rounded-[9999px]" />
      <Svg2 />
    </div>
  );
}

function Span4() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[31.125px]" data-name="span">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-[-1px] w-[34px]">Ativo</p>
    </div>
  );
}

function Label9() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[8px] h-full items-center relative shrink-0 w-[55.125px]" data-name="label">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Input5 />
      <Span4 />
    </div>
  );
}

function Input6() {
  return (
    <div className="bg-[rgba(0,0,0,0)] relative rounded-[9999px] shrink-0 size-[16px]" data-name="input">
      <div aria-hidden="true" className="absolute border-[0.5px] border-black border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}

function Span5() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[62.516px]" data-name="span">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-[-1px] w-[65px]">Rascunho</p>
    </div>
  );
}

function Label10() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[8px] h-full items-center relative shrink-0 w-[86.516px]" data-name="label">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Input6 />
      <Span5 />
    </div>
  );
}

function Input7() {
  return (
    <div className="bg-[rgba(0,0,0,0)] relative rounded-[9999px] shrink-0 size-[16px]" data-name="input">
      <div aria-hidden="true" className="absolute border-[0.5px] border-black border-solid inset-0 pointer-events-none rounded-[9999px]" />
    </div>
  );
}

function Span6() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[41.813px]" data-name="span">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal h-[22px] leading-[normal] left-0 not-italic text-[#374151] text-[14px] top-[-1px] w-[45px]">Inativo</p>
    </div>
  );
}

function Label11() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex gap-[8px] h-full items-center relative shrink-0 w-[65.813px]" data-name="label">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Input7 />
      <Span6 />
    </div>
  );
}

function Div13() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] content-stretch flex gap-[16px] h-[20px] items-start left-0 top-[36px] w-[590px]" data-name="div">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Label9 />
      <Label10 />
      <Label11 />
    </div>
  );
}

function Div12() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[56px] left-0 top-[437px] w-[590px]" data-name="div">
      <Label8 />
      <Div13 />
    </div>
  );
}

function Form() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[589px] left-[24px] top-[24px] w-[590px]" data-name="form">
      <Div4 />
      <Div6 />
      <Div7 />
      <Div8 />
      <Div12 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="h-[17.216px] relative shrink-0 w-[15.064px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.0642 17.2162">
        <g id="Frame">
          <path d={svgPaths.p2e6d2a80} stroke="var(--stroke-0, #E5E7EB)" />
          <path d={svgPaths.p1285d600} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Svg3() {
  return (
    <div className="absolute content-stretch flex h-[17.216px] items-center justify-center left-[0.16px] top-[3.19px] w-[15.064px]" data-name="svg">
      <Frame5 />
    </div>
  );
}

function Div3() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] border-0 border-[#e5e7eb] border-solid h-[637px] left-0 top-[71px] w-[638px]" data-name="div">
      <Form />
      <Svg3 />
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-white h-full relative rounded-[8px] shrink-0 w-[90.031px]" data-name="button">
      <div aria-hidden="true" className="absolute border border-[#d1d5db] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="-translate-x-1/2 absolute font-['Inter:Medium',sans-serif] font-medium h-[22px] leading-[normal] left-[48px] not-italic text-[#374151] text-[14px] text-center top-[8px] w-[62px]">Cancelar</p>
    </div>
  );
}

function Frame6() {
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

function Svg4() {
  return (
    <div className="absolute content-stretch flex h-[14px] items-center justify-center left-0 top-[2.75px] w-[12.25px]" data-name="svg">
      <Frame6 />
    </div>
  );
}

function I2() {
  return (
    <div className="bg-[rgba(0,0,0,0)] h-[20px] relative shrink-0 w-[12.25px]" data-name="i">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <Svg4 />
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#3571de] h-full relative rounded-[8px] shrink-0 w-[145.688px]" data-name="button">
      <div aria-hidden="true" className="absolute border-0 border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[8px] items-center px-[16px] py-[8px] relative size-full">
          <I2 />
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">Salvar Produto</p>
        </div>
      </div>
    </div>
  );
}

function Div14() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0)] content-stretch flex gap-[12px] h-[71px] items-center justify-end left-0 px-[24px] py-[16px] top-[702px] w-[638px]" data-name="div">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-solid border-t inset-0 pointer-events-none" />
      <Button1 />
      <Button2 />
    </div>
  );
}

export default function NovoProdutoServico() {
  return (
    <div className="bg-white border border-[#e5e7eb] border-solid overflow-clip relative rounded-[8px] shadow-[0px_8px_10px_0px_rgba(0,0,0,0.1),0px_20px_25px_0px_rgba(0,0,0,0.1)] size-full" data-name="Novo Produto/Serviço">
      <Div />
      <Div3 />
      <Div14 />
    </div>
  );
}