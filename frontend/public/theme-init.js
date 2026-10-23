// İlk boyamadan önce tema ve hareket tercihini uygular; böylece koyu temada beyaz bir an yanıp sönmez.
(function () {
  try {
    var root = document.documentElement
    var saved = localStorage.getItem('mihenk-theme')
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved
    if (localStorage.getItem('mihenk-reduced-motion') === 'true') root.classList.add('reduce-motion')
  } catch (error) { /* gizli pencere: varsayılanları kullan */ }
})()
