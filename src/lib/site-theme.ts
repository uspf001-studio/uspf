export type SiteTheme = {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  header_color: string;
  footer_color: string;
  button_color: string;
  font_family: string;
};

export const defaultSiteTheme: SiteTheme = {
  primary_color: "#0c1c34",
  secondary_color: "#d4a853",
  background_color: "#ffffff",
  text_color: "#142338",
  header_color: "#0c1c34",
  footer_color: "#09182b",
  button_color: "#d4a853",
  font_family: "DM Sans",
};

const previousDefaultTheme: SiteTheme = {
  primary_color: "#101f3c",
  secondary_color: "#c7a45a",
  background_color: "#ffffff",
  text_color: "#182235",
  header_color: "#101f3c",
  footer_color: "#0b172c",
  button_color: "#c7a45a",
  font_family: "DM Sans",
};

export function normalizeSiteTheme(theme: SiteTheme): SiteTheme {
  const isPreviousDefault = Object.keys(previousDefaultTheme).every(
    (key) => theme[key as keyof SiteTheme] === previousDefaultTheme[key as keyof SiteTheme],
  );
  return isPreviousDefault ? defaultSiteTheme : theme;
}
