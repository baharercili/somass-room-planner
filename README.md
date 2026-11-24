# SO-MASS Room Planner

Tarayıcıda oda planlama, ürün inceleme ve malzeme stüdyosu.

- [Oda planlayıcı](https://baharercili.github.io/somass-room-planner/)
- [Ürün inceleme](https://baharercili.github.io/somass-room-planner/model-inceleme.html)
- [Malzeme stüdyosu](https://baharercili.github.io/somass-room-planner/malzeme-studyosu.html)

Kişisel oda düzenleri ziyaretçinin tarayıcısında saklanır.

## Yayın

GitHub Actions, `room-web-manifest.json` ve `parts/` içindeki doğrulanmış statik
paketi `room-publish/restore.py` ile açar ve GitHub Pages'e yayımlar.
Dosyaların boyutları ve SHA-256 kayıtları yayın öncesinde kontrol edilir.
Yayın sonunda giriş sayfaları, örnek model ve iki meşe kaplaması tekrar doğrulanır.

Bu depo tarayıcıda çalışan yayın paketini içerir. CAD dönüştürme ortamı ve
özgün tasarım kaynakları ayrı tutulur.
