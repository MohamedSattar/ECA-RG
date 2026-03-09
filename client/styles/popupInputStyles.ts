/**
 * Shared form input design – single source for Apply Research and dialogs.
 * Warm palette: border #F3D1BF, background #FFF8F3, focus #e78f6a, 6px radius.
 * One border only (no Fluent ::after or focus ring). Consistent height 36px.
 */

const BORDER_COLOR = "#F3D1BF";
const BORDER_COLOR_FOCUS = "#e78f6a";
const BG_ACTIVE = "#FFF8F3";
const BG_DISABLED = "#f5f0eb";
const RADIUS = "6px";
const HEIGHT = 36;

const activeBorder = {
  borderRadius: RADIUS,
  border: `1px solid ${BORDER_COLOR}`,
  background: BG_ACTIVE,
  minHeight: HEIGHT,
  boxShadow: "none",
  outline: "none",
  selectors: {
    ":hover": { borderColor: BORDER_COLOR_FOCUS },
    ":focus-within": {
      borderColor: BORDER_COLOR_FOCUS,
      outline: "none",
      boxShadow: "none",
    },
    "::after": { border: "none", boxShadow: "none" },
  },
} as const;

const disabledBorder = {
  borderRadius: RADIUS,
  border: `1px solid ${BORDER_COLOR}`,
  background: BG_DISABLED,
  minHeight: HEIGHT,
  boxShadow: "none",
  outline: "none",
  selectors: {
    ":hover": { borderColor: BORDER_COLOR },
    "::after": { border: "none", boxShadow: "none" },
  },
} as const;

export const popupInputStyles = {
  textField: {
    root: { outline: "none" },
    wrapper: { border: "none", boxShadow: "none" },
    fieldGroup: activeBorder,
    field: {
      background: "transparent",
      borderRadius: RADIUS,
      minHeight: HEIGHT - 2,
      padding: "0 12px",
      fontSize: "14px",
      lineHeight: "20px",
      color: "#1e293b",
    },
  },
  readOnlyTextField: {
    root: { outline: "none" },
    wrapper: { border: "none", boxShadow: "none" },
    fieldGroup: disabledBorder,
    field: {
      background: "transparent",
      borderRadius: RADIUS,
      minHeight: HEIGHT - 2,
      padding: "0 12px",
      cursor: "default",
    },
  },
  textFieldDisabled: {
    root: { outline: "none" },
    wrapper: { border: "none", boxShadow: "none" },
    fieldGroup: {
      ...disabledBorder,
      selectors: {
        ...disabledBorder.selectors,
        ":focus-within": { borderColor: BORDER_COLOR, boxShadow: "none" },
      },
    },
    field: {
      background: "transparent",
      borderRadius: RADIUS,
      minHeight: HEIGHT - 2,
      padding: "0 12px",
      cursor: "not-allowed",
    },
  },
  datePicker: {
    root: {
      ...activeBorder,
      backgroundColor: BG_ACTIVE,
    },
    icon: {
      color: BORDER_COLOR_FOCUS,
      lineHeight: `${HEIGHT - 2}px`,
      padding: "2px 5px 5px",
    },
    textField: {
      fieldGroup: {
        border: "none",
        borderWidth: 0,
        minHeight: HEIGHT - 2,
        background: "transparent",
        boxShadow: "none",
      },
      field: {
        background: "transparent",
        padding: "0 10px",
        minHeight: HEIGHT - 2,
        lineHeight: HEIGHT - 2,
      },
    },
  },
  datePickerDisabled: {
    root: {
      borderRadius: RADIUS,
      border: `1px solid ${BORDER_COLOR}`,
      backgroundColor: BG_DISABLED,
      minHeight: HEIGHT,
      boxShadow: "none",
      selectors: { ":hover": { borderColor: BORDER_COLOR }, "::after": { border: "none" } },
    },
    icon: {
      color: "#94a3b8",
      padding: "2px 5px 5px",
    },
    textField: {
      fieldGroup: {
        border: "none",
        borderWidth: 0,
        minHeight: HEIGHT - 2,
        background: "transparent",
        boxShadow: "none",
      },
      field: {
        background: "transparent",
        padding: "0 12px",
        minHeight: HEIGHT - 2,
        lineHeight: HEIGHT - 2,
      },
    },
  },
  dropdown: {
    root: { marginTop: 0, outline: "none" },
    dropdown: {
      borderRadius: RADIUS,
      border: "none",
      backgroundColor: "transparent",
      minHeight: HEIGHT,
      boxShadow: "none",
      outline: "none",
      selectors: { "::after": { border: "none", boxShadow: "none" } },
    },
    title: {
      borderRadius: RADIUS,
      border: `1px solid ${BORDER_COLOR}`,
      background: BG_ACTIVE,
      minHeight: HEIGHT - 2,
      padding: "0 12px",
      lineHeight: `${HEIGHT - 2}px`,
      fontSize: "14px",
      boxShadow: "none",
      selectors: {
        ":hover": { borderColor: BORDER_COLOR_FOCUS },
        ":focus": { borderColor: BORDER_COLOR_FOCUS, outline: "none", boxShadow: "none" },
        "::after": { border: "none", boxShadow: "none" },
      },
    },
    caretDown: { color: BORDER_COLOR_FOCUS, lineHeight: `${HEIGHT - 2}px` },
    dropdownItem: {
      minHeight: 32,
      lineHeight: "20px",
      fontSize: "14px",
      padding: "6px 12px",
    },
    dropdownItemSelected: {
      minHeight: 32,
      lineHeight: "20px",
      fontSize: "14px",
      padding: "6px 12px",
    },
    dropdownItemHeader: {
      minHeight: 28,
      lineHeight: "18px",
      fontSize: "13px",
      padding: "4px 12px",
    },
  },
  dropdownDisabled: {
    root: { marginTop: 0 },
    dropdown: {
      borderRadius: RADIUS,
      border: "none",
      backgroundColor: "transparent",
      minHeight: HEIGHT,
      boxShadow: "none",
      selectors: { "::after": { border: "none" } },
    },
    title: {
      borderRadius: RADIUS,
      border: `1px solid ${BORDER_COLOR}`,
      background: BG_DISABLED,
      minHeight: HEIGHT - 2,
      padding: "0 12px",
      lineHeight: `${HEIGHT - 2}px`,
      cursor: "not-allowed",
      boxShadow: "none",
      selectors: { "::after": { border: "none" } },
    },
    caretDown: { color: "#94a3b8" },
    dropdownItem: { minHeight: 32, lineHeight: "20px", fontSize: "14px", padding: "6px 12px" },
    dropdownItemSelected: { minHeight: 32, lineHeight: "20px", padding: "6px 12px" },
  },
  iconButton: {
    root: { color: "#b06e51" },
    rootHovered: { color: "#d18260" },
  },
  /** Research page primary CTA – brand blue, min-height 50px */
  researchPrimaryButton: {
    root: {
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
      minHeight: 50,
      color: "#fff",
      borderRadius: RADIUS,
    },
    rootHovered: {
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
      minHeight: 50,
      color: "#fff",
    },
    rootPressed: {
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
      minHeight: 50,
      color: "#fff",
    },
    rootDisabled: { border: "1px solid #cbd5e1", backgroundColor: "#cbd5e1" },
  },
  /** Research page secondary / Cancel – outline, same height as primary */
  researchSecondaryButton: {
    root: {
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "transparent",
      minHeight: 50,
      color: "rgb(29, 32, 84)",
      borderRadius: RADIUS,
    },
    rootHovered: {
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "#f1f5f9",
      minHeight: 50,
      color: "rgb(29, 32, 84)",
    },
    rootPressed: {
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "#e2e8f0",
      minHeight: 50,
      color: "rgb(29, 32, 84)",
    },
    rootDisabled: {
      border: "1px solid #cbd5e1",
      backgroundColor: "#f8fafc",
      color: "#94a3b8",
    },
  },
  /** Edit action – brand blue (tables) */
  editButton: {
    root: {
      color: "#fff",
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
      borderRadius: RADIUS,
      width: 32,
      height: 32,
    },
    rootHovered: {
      color: "#fff",
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
    },
    rootPressed: {
      color: "#fff",
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
    },
    rootDisabled: { color: "#cbd5e1", backgroundColor: "#f1f5f9" },
  },
  /** Delete/Remove action – brand blue (tables) */
  deleteButton: {
    root: {
      color: "#fff",
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
      borderRadius: RADIUS,
      width: 32,
      height: 32,
    },
    rootHovered: {
      color: "#fff",
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
    },
    rootPressed: {
      color: "#fff",
      border: "1px solid rgb(29, 32, 84)",
      backgroundColor: "rgb(29, 32, 84)",
    },
    rootDisabled: { color: "#cbd5e1", backgroundColor: "#f1f5f9" },
  },
  tagPicker: {
    root: { minHeight: HEIGHT },
    text: {
      borderRadius: RADIUS,
      border: `1px solid ${BORDER_COLOR}`,
      backgroundColor: BG_ACTIVE,
      minHeight: HEIGHT - 2,
      boxShadow: "none",
      outline: "none",
      selectors: {
        ":hover": { borderColor: BORDER_COLOR_FOCUS },
        ":focus": { borderColor: BORDER_COLOR_FOCUS, outline: "none", boxShadow: "none" },
        "::after": { border: "none" },
      },
    },
    input: { background: "transparent", borderRadius: RADIUS, minHeight: 28 },
  },
  tagPickerDisabled: {
    root: { minHeight: HEIGHT },
    text: {
      borderRadius: RADIUS,
      border: `1px solid ${BORDER_COLOR}`,
      backgroundColor: BG_DISABLED,
      minHeight: HEIGHT - 2,
      boxShadow: "none",
      selectors: { ":hover": { borderColor: BORDER_COLOR }, "::after": { border: "none" } },
    },
    input: { background: "transparent", minHeight: 28, cursor: "not-allowed" },
  },
} as const;

export const popupLabelClass = "block text-sm font-semibold text-[#1e293b] mb-1";
export const popupFormGridClass = "grid gap-5 py-4";
export const popupFieldWrapperClass = "mt-1";

export const popupUploadZoneClass =
  "mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-[#F3D1BF] bg-[#FFF8F3] hover:border-[#e78f6a] hover:bg-[#fefaf9]";
export const popupFileItemClass =
  "flex items-center justify-between p-3 rounded-lg border border-[#F3D1BF] bg-[#FFF8F3]";
