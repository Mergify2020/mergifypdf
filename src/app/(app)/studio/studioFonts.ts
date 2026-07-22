import type { TextFont, TextFontVariant } from "./studioTypes";

const STANDARD_FONTS = {
  Helvetica: "Helvetica",
  TimesRoman: "Times-Roman",
  TimesRomanBold: "Times-Bold",
  TimesRomanItalic: "Times-Italic",
  TimesRomanBoldItalic: "Times-BoldItalic",
  Courier: "Courier",
  CourierBold: "Courier-Bold",
  CourierOblique: "Courier-Oblique",
  CourierBoldOblique: "Courier-BoldOblique",
} as const;

export type StandardFontName = (typeof STANDARD_FONTS)[keyof typeof STANDARD_FONTS];

export type FontOption =
  | {
      label: string;
      cssFamily: string;
      pdf: { type: "standard"; variants: Record<TextFontVariant, StandardFontName> };
    }
  | {
      label: string;
      cssFamily: string;
      pdf: {
        type: "custom";
        variants: Record<TextFontVariant, string>;
        fallback: StandardFontName;
      };
    };

export const TEXT_FONT_OPTIONS: Record<TextFont, FontOption> = {
  Inter: {
    label: "Inter",
    cssFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Inter-Regular.ttf",
        bold: "/fonts/Inter-Bold.ttf",
        italic: "/fonts/Inter-Italic.ttf",
        boldItalic: "/fonts/Inter-BoldItalic.ttf",
      },
      fallback: STANDARD_FONTS.Helvetica,
    },
  },
  Arial: {
    label: "Arial",
    cssFamily: "'Arimo', 'Arial', 'Helvetica Neue', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Arimo-Regular.ttf",
        bold: "/fonts/Arimo-Bold.ttf",
        italic: "/fonts/Arimo-Italic.ttf",
        boldItalic: "/fonts/Arimo-BoldItalic.ttf",
      },
      fallback: STANDARD_FONTS.Helvetica,
    },
  },
  Roboto: {
    label: "Roboto",
    cssFamily: "'Roboto', 'Arial', 'Helvetica Neue', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Roboto-Regular.ttf",
        bold: "/fonts/Roboto-Regular.ttf",
        italic: "/fonts/Roboto-Regular.ttf",
        boldItalic: "/fonts/Roboto-Regular.ttf",
      },
      fallback: STANDARD_FONTS.Helvetica,
    },
  },
  Poppins: {
    label: "Poppins",
    cssFamily: "'Poppins', 'Helvetica Neue', 'Arial', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Poppins-Regular.ttf",
        bold: "/fonts/Poppins-Bold.ttf",
        italic: "/fonts/Poppins-Italic.ttf",
        boldItalic: "/fonts/Poppins-BoldItalic.ttf",
      },
      fallback: STANDARD_FONTS.Helvetica,
    },
  },
  "Times New Roman": {
    label: "Times New Roman",
    cssFamily: "'Times New Roman', Times, serif",
    pdf: {
      type: "standard",
      variants: {
        normal: STANDARD_FONTS.TimesRoman,
        bold: STANDARD_FONTS.TimesRomanBold,
        italic: STANDARD_FONTS.TimesRomanItalic,
        boldItalic: STANDARD_FONTS.TimesRomanBoldItalic,
      },
    },
  },
  "Courier New": {
    label: "Courier New",
    cssFamily: "'Courier New', 'SFMono-Regular', Consolas, monospace",
    pdf: {
      type: "standard",
      variants: {
        normal: STANDARD_FONTS.Courier,
        bold: STANDARD_FONTS.CourierBold,
        italic: STANDARD_FONTS.CourierOblique,
        boldItalic: STANDARD_FONTS.CourierBoldOblique,
      },
    },
  },
  Georgia: {
    label: "Georgia",
    cssFamily: "'Georgia', 'Times New Roman', serif",
    pdf: {
      type: "standard",
      variants: {
        normal: STANDARD_FONTS.TimesRoman,
        bold: STANDARD_FONTS.TimesRomanBold,
        italic: STANDARD_FONTS.TimesRomanItalic,
        boldItalic: STANDARD_FONTS.TimesRomanBoldItalic,
      },
    },
  },
};
