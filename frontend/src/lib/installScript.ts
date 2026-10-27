// Server-safe (the layout inlines it): Chrome and Edge fire `beforeinstallprompt` once
// per page load, possibly before any of our code has loaded, so this inline script in
// <head> keeps it on window for lib/install.ts. An install leaves a mark in
// localStorage, so a normal tab knows the app is already installed.
export const INSTALL_FLAG_KEY = "aepp-installed";

export const INSTALL_INIT_SCRIPT = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__aeppInstall=e;try{localStorage.removeItem(${JSON.stringify(
  INSTALL_FLAG_KEY,
)})}catch(x){}});addEventListener("appinstalled",function(){window.__aeppInstall=null;try{localStorage.setItem(${JSON.stringify(
  INSTALL_FLAG_KEY,
)},"1")}catch(x){}})`;
