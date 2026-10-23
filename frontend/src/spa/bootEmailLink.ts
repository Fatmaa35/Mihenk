// Yan etkili modül: router oluşmadan önce e-posta bağlantısını yakalar ve adresi /giris yapar.
// main.tsx içinde App'ten ÖNCE içe aktarılmalıdır.
import { captureEmailLink } from './emailLink'

captureEmailLink()
