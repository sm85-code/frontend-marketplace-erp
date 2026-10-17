import api from "./client";
export type DocumentKind = "INV" | "PO";
export type TemplateColumn = {
  field: string;
  label: string;
  width: number;
  align: "left" | "center" | "right";
  header_background: string;
  header_color: string;
  total: boolean;
};
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
  columns?: TemplateColumn[];
  row_count?: number;
  show_totals?: boolean;
  border?: boolean;
};
export type TemplateData = {
  kind: DocumentKind;
  version: number;
  blocks: TemplateBlock[] | null;
  orientation?: "portrait" | "landscape";
};
export const getDocumentTemplate = async (kind: DocumentKind) =>
  (await api.get<TemplateData>(`/processing/document-templates/${kind}`)).data;
export const saveDocumentTemplate = async (
  kind: DocumentKind,
  version: number,
  blocks: TemplateBlock[],
  orientation: "portrait" | "landscape" = "portrait",
) =>
  (
    await api.put<{ version: number }>(
      `/processing/document-templates/${kind}`,
      { version, blocks, orientation },
    )
  ).data;
