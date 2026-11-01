import { useState } from 'react'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { Button, IconButton, useToast } from '../../shared/ui'
import { dismissInstall, promptInstall, useInstallDismissed, useInstallMode } from './install'
import './install.css'

function IosSteps() {
  return (
    <ol className="install-steps">
      <li><Share size={16} aria-hidden="true" /><span>Safari'nin alt çubuğundaki <strong>Paylaş</strong> simgesine dokun.</span></li>
      <li><SquarePlus size={16} aria-hidden="true" /><span>Listeden <strong>Ana Ekrana Ekle</strong>'yi seç, sonra <strong>Ekle</strong>'ye dokun.</span></li>
    </ol>
  )
}

function useInstall() {
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const install = async () => {
    setBusy(true)
    try {
      if (await promptInstall()) notify('Mihenk ana ekranına eklendi.', 'success')
    } finally {
      setBusy(false)
    }
  }
  return { install, busy }
}

/** Bugün ekranındaki kapatılabilir öneri kartı. Yüklüyse ya da yakın zamanda kapatıldıysa görünmez. */
export function InstallAppCard() {
  const mode = useInstallMode()
  const dismissed = useInstallDismissed()
  const { install, busy } = useInstall()
  if (dismissed || (mode !== 'prompt' && mode !== 'ios')) return null
  return (
    <aside className="install-card" aria-labelledby="install-card-title">
      <span className="install-card__icon" aria-hidden="true"><img src="/static/pwa-icon-192.png" alt="" width={44} height={44} /></span>
      <div className="install-card__text">
        <strong id="install-card-title">Mihenk'i ana ekranına ekle</strong>
        <span>Uygulama gibi tam ekran açılır, internet zayıfken de başlar, hatırlatmalar bildirim olarak gelir.</span>
        {mode === 'ios' && <IosSteps />}
      </div>
      {mode === 'prompt' && <Button size="sm" icon={<Download size={16} aria-hidden="true" />} loading={busy} onClick={() => void install()}>Yükle</Button>}
      <IconButton className="install-card__close" label="Şimdilik gizle" icon={<X size={18} />} onClick={() => dismissInstall()} />
    </aside>
  )
}

/** Ayarlar'daki kalıcı bölüm: her zaman durumu ve ne yapılacağını söyler. */
export function InstallAppSettings() {
  const mode = useInstallMode()
  const { install, busy } = useInstall()
  if (mode === 'installed') return <p className="install-note">Mihenk bu cihazda uygulama olarak yüklü.</p>
  if (mode === 'prompt') {
    return (
      <div className="install-note">
        <p>Mihenk'i ana ekranına ekleyerek uygulama gibi kullanabilirsin.</p>
        <Button variant="secondary" icon={<Download size={16} aria-hidden="true" />} loading={busy} onClick={() => void install()}>Uygulamayı yükle</Button>
      </div>
    )
  }
  if (mode === 'ios') return <div className="install-note"><p>iPhone'da Safari'den ana ekrana ekleyebilirsin:</p><IosSteps /></div>
  return (
    <p className="install-note">
      Telefonunda Chrome veya Samsung Internet'te menüden <strong>Uygulamayı yükle</strong> ya da <strong>Ana ekrana ekle</strong>'yi seç.
      iPhone'da Safari'de <strong>Paylaş › Ana Ekrana Ekle</strong> yolunu izle.
    </p>
  )
}
