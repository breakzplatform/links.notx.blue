// Loaded as a plain blocking script in <head> so a stored dark or terminal
// choice never flashes paper. Light is the default and needs no attribute.
try{var t=localStorage.getItem("theme");if(t==="dark"||t==="terminal")document.documentElement.setAttribute("data-theme",t)}catch(e){}
