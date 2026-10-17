import api from "./client";
export type DocumentKind = "INV" | "PO";
export type TemplateBlock = {
  id: string;
  kind: "text" | "logo" | "line" | "table" | "total";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  font_size: number;
  bold: boolean;
  align: "left" | "center" | "right";
  color: string;
  image_url: string;
};
export type TemplateData = {
  kind: DocumentKind;
  version: number;
  blocks: TemplateBlock[] | null;
};
export const getDocumentTemplate = async (kind: DocumentKind) =>
  (await api.get<TemplateData>(`/processing/document-templates/${kind}`)).data;
export const saveDocumentTemplate = async (
  kind: DocumentKind,
  version: number,
  blocks: TemplateBlock[],
) =>
  (
    await api.put<{ version: number }>(
      `/processing/document-templates/${kind}`,
      { version, blocks },
    )
  ).data;
