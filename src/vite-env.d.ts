declare module "*.css?url" {
  const css: string;
  export default css;
}

declare module "*.css" {
  const css: Record<string, string>;
  export default css;
}
