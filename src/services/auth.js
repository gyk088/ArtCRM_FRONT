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
  localStorage.setItem('ATR_USER', base64Str);
}

export const getUser = () => {
  if (CACHE.user) return CACHE.user
  const base64Str = localStorage.getItem('ATR_USER');
  if (!base64Str) return;
  const str = b64_to_utf8(base64Str)
  CACHE.user = JSON.parse(str)
  return CACHE.user;
}

export const setSession = (session) => {
  CACHE.session = session
  const str = JSON.stringify(session);
  const base64Str = utf8_to_b64(str);
  localStorage.setItem('ATR_SESSION', base64Str);
}

export const getSession = () => {
  if (CACHE.session) return CACHE.session
  const base64Str = localStorage.getItem('ATR_SESSION');
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

// ==================== Имперсонация (вход под другим пользователем из админ-панели) ====================
const IMPERSONATION_KEY = 'ATR_IMPERSONATION_ORIGINAL'

// Запоминает текущего (реального) пользователя и подменяет активную сессию
// на сессию, выданную бэкендом при имперсонации (см. adminStore.impersonate)
export const startImpersonation = (impersonatedUser, impersonatedSession) => {
  const original = { user: getUser(), session: getSession() }
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(original))
  setUser(impersonatedUser)
  setSession(impersonatedSession)
}

export const isImpersonating = () => {
  return !!localStorage.getItem(IMPERSONATION_KEY)
}

// Возвращает исходную (реальную) сессию администратора/галереи, сохранённую
// в startImpersonation — для банера "вы вошли как..." и т.п.
export const getImpersonationOriginal = () => {
  const raw = localStorage.getItem(IMPERSONATION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Восстанавливает исходную сессию. Сам запрос на завершение имперсонации
// (POST /admin/impersonate/stop) должен быть сделан ДО вызова этой функции —
// пока ещё активен токен имперсонируемой сессии.
export const endImpersonation = () => {
  const original = getImpersonationOriginal()
  if (!original) return false

  localStorage.removeItem(IMPERSONATION_KEY)
  setUser(original.user)
  setSession(original.session)
  return true
}