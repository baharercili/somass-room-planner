# SO-MASS Room Planner

Tarayıcıda oda planlama, ürün inceleme ve malzeme stüdyosu.

- [Oda planlayıcı](https://baharercili.github.io/somass-room-planner/)
- [Ürün inceleme](https://baharercili.github.io/somass-room-planner/model-inceleme.html)
- [Malzeme stüdyosu](https://baharercili.github.io/somass-room-planner/malzeme-studyosu.html)

Müşteriye kaydedilen müşteri ve oda kayıtları ortak Supabase çalışma alanında tutulur.
Tarayıcı henüz kaydedilmemiş çalışmalar ve malzeme stüdyosu taslakları için yerel kayıt da tutabilir.
GitHub uygulama ve yayın dosyalarını barındırır; müşteri kayıtları bu depoya eklenmez.
Uygulamayı kullanmak için bilgisayarda yerel sunucu veya yayın klasörü tutmak gerekmez.

## Yayın

GitHub Actions, `room-web-manifest.json` ve `parts/` içindeki doğrulanmış statik
paketi `room-publish/restore.py` ile açar ve GitHub Pages'e yayımlar.
Dosyaların boyutları ve SHA-256 kayıtları yayın öncesinde kontrol edilir.
Yayın sonunda giriş sayfaları, örnek model ve iki meşe kaplaması tekrar doğrulanır.

Bu depo tarayıcıda çalışan yayın paketini içerir. CAD dönüştürme ortamı ve
özgün tasarım kaynakları ayrı tutulur.

## Doğrulanmış yayını yeniden kurma

27 Kasım 2026'da doğrulanan yayın, özgün model ve kaplama dosyalarıyla birlikte
GitHub'daki kalıcı paketlerden geri kurulabilir. Boş bir `_site` hedefi kullanın:

```sh
git checkout 38ee411b313102a78184e8daf5ae8292751ee0c8
python3 room-publish/restore.py --site _site
python3 room-publish/apply-updates.py --site _site
python3 room-publish/material-gallery-v179-cfd55e91db46/restore-v179-assets.py --site _site
```

Bu doğrulanmış yayın 2.837 dosya ve 987.616.891 bayt içerir.
Yerel deneme/yayın kopyaları çalışması için gerekli değildir. Özgün CAD dosyaları,
düzenlenebilir Blender dosyaları ve yayımlanmamış özel kaynaklar bu yayın paketinin
kapsamında değildir; yerel temizlik sırasında ayrıca korunmalıdır.
