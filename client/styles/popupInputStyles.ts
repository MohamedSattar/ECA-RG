/**
 * Shared input styles for all popup/dialog forms.
 * Matches app theme: warm borders (#F3D1BF), cream background (#FFF8F3),
 * focus/hover (#e78f6a), 6px radius.
 */

export const popupInputStyles = {
  textField: {
    fieldGroup: {
      borderRadius: "6px",
      border: "1px solid #F3D1BF",
      background: "#FFF8F3",
      selectors: {
        ":hover": { borderColor: "#e78f6a" },
        ":focus-within": { borderColor: "#e78f6a", outline: "none" },
      },
    },
    field: { background: "#FFF8F3", borderRadius: "6px" },
  },
  readOnlyTextField: {
    fieldGroup: {
      borderRadius: "6px",
      border: "1px solid #F3D1BF",
      background: "#f5f0eb",
      selectors: {
        ":hover": { borderColor: "#F3D1BF" },
      },
    },
    field: { background: "#f5f0eb", borderRadius: "6px" },
  },
  datePicker: {
    root: {
      borderRadius: "6px",
      border: "1px solid #F3D1BF",
      backgroundColor: "#FFF8F3",
      selectors: {
        ":hover": { borderColor: "#e78f6a" },
        ":focus-within": { borderColor: "#e78f6a", outline: "none" },
      },
    },
    icon: { color: "#e78f6a" },
  },
  dropdown: {
    root: { marginTop: 0 },
    dropdown: {
      borderRadius: "6px",
      border: "1px solid #F3D1BF",
      backgroundColor: "#FFF8F3",
      selectors: {
        ":hover": { borderColor: "#e78f6a" },
        ":focus-within": { borderColor: "#e78f6a" },
      },
    },
    title: { background: "#FFF8F3", borderRadius: "6px" },
    caretDown: { color: "#e78f6a" },
  },
  iconButton: {
    root: { color: "#b06e51" },
    rootHovered: { color: "#d18260" },
  },
} as const;

export const popupLabelClass =
  "block text-sm font-semibold text-[#1e293b] mb-1";

export const popupFormGridClass = "grid gap-5 py-4";

export const popupUploadZoneClass =
  "mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-[#F3D1BF] bg-[#FFF8F3] hover:border-[#e78f6a] hover:bg-[#fefaf9]";

export const popupFileItemClass =
  "flex items-center justify-between p-3 rounded-lg border border-[#F3D1BF] bg-[#FFF8F3]";

export const popupFieldWrapperClass = "mt-1";
