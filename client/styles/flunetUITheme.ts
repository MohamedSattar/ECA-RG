import { createTheme } from "@fluentui/react/lib/Theme";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import { PartialTheme } from "@fluentui/react";

initializeIcons();

/** Form control design tokens – aligned with popupInputStyles / global.css */
const FORM = {
  border: "#F3D1BF",
  borderFocus: "#e78f6a",
  bg: "#FFF8F3",
  bgDisabled: "#f5f0eb",
  radius: "6px",
} as const;

const myTheme: PartialTheme = createTheme({
  palette: {
    themePrimary: "#e78f6a",
    themeLighterAlt: "#fefaf9",
    themeLighter: "#fbece6",
    themeLight: "#f8dcd0",
    themeTertiary: "#f1bba3",
    themeSecondary: "#eb9d7b",
    themeDarkAlt: "#d18260",
    themeDark: "#b06e51",
    themeDarker: "#82513c",
    neutralLighterAlt: "#faf9f8",
    neutralLighter: "#f3f2f1",
    neutralLight: "#edebe9",
    neutralQuaternaryAlt: "#e1dfdd",
    neutralQuaternary: "#d0d0d0",
    neutralTertiaryAlt: "#c8c6c4",
    neutralTertiary: "#a19f9d",
    neutralSecondary: "#605e5c",
    neutralPrimaryAlt: "#3b3a39",
    neutralPrimary: "#323130",
    neutralDark: "#201f1e",
    black: "#000000",
    white: "#ffffff",
  },
  components: {
    Label: {
      styles: {
        root: {
          color: "#1e293b",
          fontSize: "14px",
          fontWeight: 600,
        },
      },
    },
    TextField: {
      styles: {
        root: { outline: "none" },
        wrapper: { border: "none", boxShadow: "none" },
        fieldGroup: {
          borderRadius: FORM.radius,
          border: `1px solid ${FORM.border}`,
          background: FORM.bg,
          boxShadow: "none",
          outline: "none",
          selectors: {
            ":hover": { borderColor: FORM.borderFocus },
            ":focus-within": {
              borderColor: FORM.borderFocus,
              outline: "none",
              boxShadow: "none",
            },
            "::after": { border: "none", boxShadow: "none" },
          },
        },
        field: {
          background: "transparent",
          borderRadius: FORM.radius,
          padding: "0 12px",
          fontSize: "14px",
        },
      },
    },
    TagPicker: {
      styles: {
        text: {
          borderRadius: FORM.radius,
          border: `1px solid ${FORM.border}`,
          background: FORM.bg,
          boxShadow: "none",
          outline: "none",
          selectors: {
            ":hover": { borderColor: FORM.borderFocus },
            ":focus-within": {
              borderColor: FORM.borderFocus,
              outline: "none",
              boxShadow: "none",
            },
            "::after": { border: "none" },
          },
        },
      },
    },
    DatePicker: {
      styles: {
        root: {
          borderRadius: FORM.radius,
          border: `1px solid ${FORM.border}`,
          backgroundColor: FORM.bg,
          boxShadow: "none",
          outline: "none",
          selectors: {
            ":hover": { borderColor: FORM.borderFocus },
            ":focus-within": {
              borderColor: FORM.borderFocus,
              outline: "none",
              boxShadow: "none",
            },
            "::after": { border: "none" },
            ".ms-TextField-fieldGroup": { border: "none", background: "transparent" },
            ".ms-TextField-field": { background: "transparent" },
          },
        },
        icon: { color: FORM.borderFocus },
      },
    },
    IconButton: {
      styles: {
        root: {
          backgroundColor: "transparent",
          color: "#b06e51",
          borderRadius: FORM.radius,
          outline: "none",
        },
        rootHovered: {
          backgroundColor: "#fbece6",
          color: FORM.borderFocus,
          borderRadius: FORM.radius,
          outline: "none",
        },
        rootPressed: {
          backgroundColor: "#f1bba3",
          color: "#d18260",
          borderRadius: FORM.radius,
          outline: "none",
        },
        rootChecked: {
          backgroundColor: "#f1bba3",
          color: "#d18260",
          borderRadius: FORM.radius,
          outline: "none",
        },
        rootCheckedHovered: {
          backgroundColor: "#f8dcd0",
          color: "#d18260",
          borderRadius: FORM.radius,
          outline: "none",
        },
        rootCheckedPressed: {
          backgroundColor: "#eb9d7b",
          color: "#b06e51",
          borderRadius: FORM.radius,
          outline: "none",
        },
        icon: { color: FORM.borderFocus },
      },
    },
    Dropdown: {
      styles: {
        root: { outline: "none" },
        rootHovered: { borderColor: FORM.borderFocus },
        dropdown: {
          borderRadius: FORM.radius,
          border: "none",
          backgroundColor: "transparent",
          boxShadow: "none",
          selectors: {
            "::after": { border: "none", boxShadow: "none" },
          },
        },
        dropdownHovered: { borderColor: "transparent" },
        title: {
          borderRadius: FORM.radius,
          border: `1px solid ${FORM.border}`,
          background: FORM.bg,
          padding: "0 12px",
          fontSize: "14px",
          boxShadow: "none",
          selectors: {
            ":hover": { borderColor: FORM.borderFocus },
            ":focus": {
              borderColor: FORM.borderFocus,
              outline: "none",
              boxShadow: "none",
            },
            "::after": { border: "none", boxShadow: "none" },
          },
        },
        caretDownWrapper: {
          color: FORM.borderFocus,
          alignSelf: "center",
        },
        dropdownItem: {
          minHeight: 32,
          lineHeight: "20px",
          fontSize: "14px",
          padding: "6px 12px",
        },
        dropdownItemSelected: {
          minHeight: 32,
          lineHeight: "20px",
          padding: "6px 12px",
        },
      },
    },
    PrimaryButton: {
      styles: {
        root: {
          padding: "8px 16px",
          borderRadius: FORM.radius,
        },
      },
    },
    DefaultButton: {
      styles: {
        root: {
          padding: "8px 16px",
          borderRadius: FORM.radius,
        },
      },
    },
  },
});

export default myTheme;
