#!/usr/bin/env python3
"""`public/3b/<ad>.png` görsellerinden `<ad>.glb` üretir.

Görseller düz resim olduğu için gerçek bir derinlik bilgisi taşımıyorlar.
Burada siluetten bir kabartma çıkarıyoruz: şeklin kenarından içeriye doğru
uzaklık, yüzeyin ne kadar kabaracağını belirliyor; görselin kendi aydınlık
değeri de ince ayrıntıyı (kıvrımlar, girintiler) taşıyor. Ön yüzey bu
kabartma, arka yüzey onun aynası, ikisinin arası da kenar şeridiyle
kapatılıyor. Sonuçta döndürülebilir, hacimli bir nesne çıkıyor.

Kullanım:  python3 scripts/3b-model-uret.py [ad ...]
Varsayılan olarak `public/3b/` altındaki tüm PNG'leri işler.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image
from scipy import ndimage

KLASOR = Path(__file__).resolve().parent.parent / 'public' / '3b'

# Izgara adımı: küçük değer daha ayrıntılı ama daha ağır model demek.
ADIM = 5
# Kabartmanın en kalın yerinin, görselin genişliğine oranı.
KALINLIK = 0.16
# Aydınlık değerinin ayrıntıya katkısı (0 = yalnızca siluet).
AYRINTI = 0.35


# Bu orandan küçük kopuk lekeler (ışıltılar, serpintiler) atılır; üç boyutta
# havada asılı duran döküntü gibi görünüyorlar.
EN_KUCUK_PARCA = 0.004


def ayikla(maske: np.ndarray) -> np.ndarray:
    """Siluetteki küçük, kopuk lekeleri temizler."""
    etiket, adet = ndimage.label(maske)
    if adet <= 1:
        return maske
    boyutlar = ndimage.sum(maske, etiket, range(1, adet + 1))
    esik = maske.sum() * EN_KUCUK_PARCA
    tutulan = {i + 1 for i, boyut in enumerate(boyutlar) if boyut >= esik}
    return np.isin(etiket, list(tutulan))


def kabartma(alpha: np.ndarray, parlaklik: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Maske ve aydınlıktan 0..1 aralığında bir yükseklik haritası üretir.

    Yüksekliğin yanında, küçük lekeleri atılmış siluet maskesini de döndürür.
    """
    maske = ayikla(alpha > 0.5)

    # Kenardan içeriye uzaklık: şeklin ortası en kabarık yer.
    uzaklik = ndimage.distance_transform_edt(maske)
    if uzaklik.max() > 0:
        uzaklik = uzaklik / uzaklik.max()
    # Kubbe profili: kenarda dik, ortaya doğru yumuşayan bir yüzey.
    govde = np.sqrt(np.clip(1.0 - (1.0 - uzaklik) ** 2, 0.0, 1.0))

    # Aydınlık, nesnenin kendi biçimini (kıvrım, girinti) kabaca taşır.
    detay = ndimage.gaussian_filter(parlaklik, 3.0)
    icerik = detay[maske]
    if icerik.size:
        alt, ust = np.percentile(icerik, [5, 95])
        detay = np.clip((detay - alt) / max(ust - alt, 1e-6), 0.0, 1.0)

    yukseklik = govde * (1.0 - AYRINTI + AYRINTI * detay)
    yukseklik = ndimage.gaussian_filter(yukseklik, 1.5)
    return np.where(maske, np.clip(yukseklik, 0.0, 1.0), 0.0), maske


def kenar_halkasi(yuzler: np.ndarray) -> np.ndarray:
    """Yalnızca bir yüze ait olan kenarları (siluetin sınırını) döndürür."""
    kenarlar = np.vstack([yuzler[:, [0, 1]], yuzler[:, [1, 2]], yuzler[:, [2, 0]]])
    sirali = np.sort(kenarlar, axis=1)
    _, ilk, sayi = np.unique(sirali, axis=0, return_index=True, return_counts=True)
    return kenarlar[ilk[sayi == 1]]


def model_uret(png: Path) -> Path:
    goruntu = Image.open(png).convert('RGBA')
    en, boy = goruntu.size
    dizi = np.asarray(goruntu, dtype=np.float32) / 255.0
    alpha = dizi[..., 3]
    parlaklik = dizi[..., :3].mean(axis=2)

    yukseklik, maske = kabartma(alpha, parlaklik)

    # Izgara düğümleri: görselin üzerine seyrek bir ağ seriyoruz.
    satirlar = np.arange(0, boy, ADIM)
    sutunlar = np.arange(0, en, ADIM)
    hy = yukseklik[np.ix_(satirlar, sutunlar)]
    dolu = maske[np.ix_(satirlar, sutunlar)]

    # Dünya koordinatları: görsel kısa kenarına göre -0.5..0.5 aralığına oturur.
    olcek = 1.0 / max(en, boy)
    gx = (sutunlar[None, :] - en / 2.0) * olcek
    gy = (boy / 2.0 - satirlar[:, None]) * olcek
    gz = hy * (KALINLIK * en * olcek)
    gx = np.broadcast_to(gx, hy.shape)
    gy = np.broadcast_to(gy, hy.shape)

    # Doku koordinatları doğrudan görselin kendisi.
    u = np.broadcast_to(sutunlar[None, :] / (en - 1), hy.shape)
    v = np.broadcast_to(1.0 - satirlar[:, None] / (boy - 1), hy.shape)

    sira = -np.ones(hy.shape, dtype=np.int64)
    sira[dolu] = np.arange(int(dolu.sum()))
    n = int(dolu.sum())

    on_noktalar = np.column_stack([gx[dolu], gy[dolu], gz[dolu]])
    arka_noktalar = np.column_stack([gx[dolu], gy[dolu], -gz[dolu]])
    uv = np.column_stack([u[dolu], v[dolu]])

    # Dört köşesi de dolu olan her hücre iki üçgene bölünür.
    sol_ust = sira[:-1, :-1]
    sag_ust = sira[:-1, 1:]
    sol_alt = sira[1:, :-1]
    sag_alt = sira[1:, 1:]
    gecerli = (sol_ust >= 0) & (sag_ust >= 0) & (sol_alt >= 0) & (sag_alt >= 0)
    a, b, c, d = (k[gecerli] for k in (sol_ust, sag_ust, sol_alt, sag_alt))
    on_yuzler = np.vstack([np.column_stack([a, c, b]), np.column_stack([b, c, d])])

    halka = kenar_halkasi(on_yuzler)

    noktalar = np.vstack([on_noktalar, arka_noktalar])
    dokular = np.vstack([uv, uv])
    # Arka yüzeyin sarım yönü ters, yoksa içeriden görünür.
    arka_yuzler = on_yuzler[:, ::-1] + n
    # Kenar şeridi: siluet sınırındaki her kenarı ön ve arka yüzey arasında kapatır.
    i, j = halka[:, 0], halka[:, 1]
    serit = np.vstack([
        np.column_stack([i, j, j + n]),
        np.column_stack([i, j + n, i + n]),
    ])

    agac = trimesh.Trimesh(
        vertices=noktalar,
        faces=np.vstack([on_yuzler, arka_yuzler, serit]),
        visual=trimesh.visual.TextureVisuals(
            uv=dokular,
            material=trimesh.visual.material.PBRMaterial(
                baseColorTexture=goruntu,
                metallicFactor=0.0,
                roughnessFactor=0.65,
                alphaMode='MASK',
                alphaCutoff=0.5,
                doubleSided=False,
            ),
        ),
        process=False,
    )
    agac.fix_normals()

    hedef = png.with_suffix('.glb')
    hedef.write_bytes(trimesh.exchange.gltf.export_glb(trimesh.Scene(agac)))
    print(f'{hedef.name}: {len(agac.vertices)} nokta, {len(agac.faces)} yüz, '
          f'{hedef.stat().st_size / 1024:.0f} KB')
    return hedef


def main() -> None:
    adlar = sys.argv[1:]
    dosyalar = [KLASOR / f'{ad}.png' for ad in adlar] if adlar else sorted(KLASOR.glob('*.png'))
    for png in dosyalar:
        if not png.exists():
            raise SystemExit(f'bulunamadı: {png}')
        model_uret(png)


if __name__ == '__main__':
    main()
