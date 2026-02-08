import { createTheme } from "@fluentui/react/lib/Theme";
import {  initializeIcons } from "@fluentui/react/lib/Icons";
import { FontSizes, PartialTheme } from "@fluentui/react";
import { labelDayButton } from "react-day-picker";
import { Label } from "recharts";
import { read } from "fs";
import { he } from "date-fns/locale";
initializeIcons();
const myTheme: PartialTheme = createTheme({
    palette: {
        themePrimary: '#e78f6a',
        themeLighterAlt: '#fefaf9',
        themeLighter: '#fbece6',
        themeLight: '#f8dcd0',
        themeTertiary: '#f1bba3',
        themeSecondary: '#eb9d7b',
        themeDarkAlt: '#d18260',
        themeDark: '#b06e51',
        themeDarker: '#82513c',
        neutralLighterAlt: '#faf9f8',
        neutralLighter: '#f3f2f1',
        neutralLight: '#edebe9',
        neutralQuaternaryAlt: '#e1dfdd',
        neutralQuaternary: '#d0d0d0',
        neutralTertiaryAlt: '#c8c6c4',
        neutralTertiary: '#a19f9d',
        neutralSecondary: '#605e5c',
        neutralPrimaryAlt: '#3b3a39',
        neutralPrimary: '#323130',
        neutralDark: '#201f1e',
        black: '#000000',
        white: '#ffffff',
    },
    components: {
      
        Label: {
            styles: {
                root: { 
                    color:"#391400A3",
                    fontSize: "16px",
                    fontWeight: 600
                }
            }
        },

        TextField: {
            styles: {
                fieldGroup: {
                    borderRadius: "4px",
                    borderColor: "#F3D1BF",
                    background: "#FFF8F3",
                    selectors: {
                        ":hover": { borderColor: "#e78f6a" },
                        ":active": { borderColor: "#d18260", outline: "none" },
                        ":focus-within": {
                            borderColor: "#e78f6a",
                            outline: "none",
                        },
                    },
                    readOnly: {
                        background: "#FFF8F3",
                        borderColor: "#F3D1BF",
                        height:"auto"
                    },
                },
                field:{
                background: "#FFF8F3",
                borderRadius: "4px",
                }
             },
        },
        TagPicker: {
            styles: {
                text: {
                    borderRadius: "4px",
                    background: "#FFF8F3",
                    borderColor: "#F3D1BF",                
                    selectors: {
                        ".ms-BasePicker-input": {

                        },
                        ":hover": { borderColor: "#e78f6a" },
                        ":active": { borderColor: "#d18260", outline: "none" },
                        ":focus-within": {
                            borderColor: "#e78f6a",
                            outline: "none",
                        },
                    },
                },
            },
        },
        DatePicker: {
            styles: {
                root: {
                    selectors: {
                        ":hover": { borderColor: "#e78f6a" },
                        ":active": { borderColor: "#d18260", outline: "none" },
                        ":focus-within": {
                            borderColor: "#e78f6a",
                            outline: "none",
                        },
                        ".ms-TextField-field": {
                            lineHeight: "normal!important",
                            height:"auto!important"
                        },
                        ".ms-TextField-fieldGroup": {
                            alignItems: "center",
                        },
                       },
                },


                icon: {
                    color: "#e78f6a",
                },
            },
        },
        IconButton: {
            styles: {
                root: {
                    backgroundColor: "transparent",
                    color: "#fff",
                    borderRadius: "4px",
                    outline: "none",
                },
                rootHovered: {
                    backgroundColor: "#fbece6",
                    color: "#e78f6a",
                    borderRadius: "4px",
                    outline: "none",
                },
                rootPressed: {
                    backgroundColor: "#f1bba3",
                    color: "#d18260",
                    borderRadius: "4px",
                    outline: "none",
                },
                rootChecked: {
                    backgroundColor: "#f1bba3",
                    color: "#d18260",
                    borderRadius: "4px",
                    outline: "none",
                },
                rootCheckedHovered: {
                    backgroundColor: "#f8dcd0",
                    color: "#d18260",
                    borderRadius: "4px",
                    outline: "none",
                },
                rootCheckedPressed: {
                    backgroundColor: "#eb9d7b",
                    color: "#b06e51",
                    borderRadius: "4px",
                    outline: "none",
                },
                icon: {
                    color: "#e78f6a",
                },

            }
        },
        Dropdown: {
            styles: {
                rootHovered: {
                    borderColor: "#e78f6a",
                },
                dropdownHovered:{
                    borderColor: "#e78f6a",
                },
                title: {
                    borderRadius: "4px",
                     borderColor: "#F3D1BF",
                    background: "#FFF8F3",
                    selectors: {
                        ":hover": { borderColor: "#e78f6a" },
                        ":active": { borderColor: "#d18260", outline: "none" },
                        ":focus-within": {
                            borderColor: "#e78f6a",

                            outline: "none",
                        }
                    }
                },
                caretDownWrapper: {
                    color: "#e78f6a",
                    alignSelf: "anchor-center"
                }
            }
        },
        PrimaryButton:{
            styles: {
                root: {
                    padding: "8px 16px",
                    borderRadius: "4px"
                }
            }
        },
        DefaultButton:{
            styles: {
                root: {
                    padding: "8px 16px",
                    borderRadius: "4px"
                }
            }
        }

    }
});




export default myTheme;