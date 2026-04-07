const defaultCahce = {
  user: null,
  session: null
}
let CACHE = defaultCahce

function utf8_to_b64(str) {
  return window.btoa(encodeURIComponent(str));
}

function b64_to_utf8(str) {
  return decodeURIComponent(window.atob(str));
}

export const setUser = (user) => {
  CACHE.user = user
  const str = JSON.stringify(user);
  const base64Str = utf8_to_b64(str);
  localStorage.setItem('MY_OFFER_USER', base64Str);
}

export const getUser = () => {
  if (CACHE.user) return CACHE.user
  const base64Str = localStorage.getItem('MY_OFFER_USER');
  if (!base64Str) return;
  const str = b64_to_utf8(base64Str)
  CACHE.user = JSON.parse(str)
  return CACHE.user;
}

export const setSession = (session) => {
  CACHE.session = session
  const str = JSON.stringify(session);
  const base64Str = utf8_to_b64(str);
  localStorage.setItem('MY_OFFER_SESSION', base64Str);
}

export const getSession = () => {
  if (CACHE.session) return CACHE.session
  const base64Str = localStorage.getItem('MY_OFFER_SESSION');
  if (!base64Str) return;
  const str = b64_to_utf8(base64Str)
  CACHE.session = JSON.parse(str)
  return CACHE.session;
}

export const getToken = () => {
  const session = getSession();
  return session?.token;
}

export const logout = () => {
  CACHE = defaultCahce
  localStorage.clear()
  window.location.reload()
}