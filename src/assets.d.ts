// Imagens importadas como módulo (o Vite devolve a URL do arquivo).
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
