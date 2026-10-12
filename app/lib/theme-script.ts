/**
 * Light / dark theme, shared by the server layout and the client hook (lib/theme.ts).
 * No React here: app/layout.tsx (a server component) imports the init script.
 */
export const THEME_STORAGE_KEY = 'atelierzo-theme';

// Runs in <head> before paint (app/layout.tsx) so the page never flashes the wrong theme
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
