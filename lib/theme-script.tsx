const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var dark=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(dark)document.documentElement.classList.add("dark")}catch(e){}})()`;

export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
