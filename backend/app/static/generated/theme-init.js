// İlk boyamadan önce tema seçimini uygular; böylece koyu temada beyaz bir an yanıp sönmez.
(function () {
  try {
    var saved = localStorage.getItem('mihenk-theme')
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved
  } catch (error) { /* gizli pencere: sistem temasını kullan */ }
})()
