# Intakely

Intakely adalah aplikasi Android untuk mencatat makanan, kalori, protein, dan air saat bulking, cutting, atau maintenance. Proyek Tugas 2 TST/PWAM kelompok **JensenHuang (K01)**.

- [Uji kesehatan API publik](https://jensenhuang.stei.fun/api/health)
- [Dokumentasi backend Tugas 2 (PDF)](README.pdf)
- [Kontrak API (OpenAPI 3.1)](docs/openapi.json)

## Jalankan aplikasi

Gunakan Node.js 22.13+ pada lini Node.js 22 dan Expo Go Android yang kompatibel dengan Expo SDK 58.

```sh
npm ci
npm start -- --go
```

Pindai QR di Expo Go. Untuk demo, pilih **Create account**, gunakan email dan kata sandi fiktif, lalu selesaikan onboarding dan buka Diary. Kamu juga bisa login kembali dengan akun yang sama. Jika penilai membutuhkan akun siap pakai, bagikan kredensial melalui kanal pengumpulan yang privat.

Aplikasi memakai origin `https://jensenhuang.stei.fun` secara default. Untuk server lain, set `EXPO_PUBLIC_API_URL` ke origin tanpa akhiran `/api`. Semua request mobile berada di `src/services/ApiService.js`.

## Backend di STB

Cloudflare Tunnel meneruskan trafik API HTTPS ke Nginx pada `127.0.0.1:80`. Nginx meneruskan route yang diizinkan ke PocketBase 0.40.6, yang menyimpan data di SQLite melalui volume Compose `pocketbase_data`. Gateway dan PocketBase berjalan sebagai kontainer. Konektor `cloudflared` berjalan sebagai layanan systemd pada host STB.

Pencarian makanan memanggil USDA FoodData Central dengan API key dari [api.data.gov](https://api.data.gov/signup/). Simpan key di `/mnt/storage/intakely/.env` sebagai `USDA_API_KEY=...`; file ini tidak masuk git. Tanpa key, endpoint pencarian menjawab 503 dan fitur lain tetap berjalan.

Dari laptop, salin `compose.yaml` dan direktori `backend/` ke `/mnt/storage/intakely` di STB ARM64. Lalu jalankan di STB:

```sh
cd /mnt/storage/intakely
sudo docker compose config --quiet &&
  sh backend/build-stb.sh &&
  sudo docker compose up -d --no-build --force-recreate
sudo docker compose ps
curl -fsS http://127.0.0.1/api/health
```

Skrip build mengunduh ZIP PocketBase di host, memverifikasi SHA-256, lalu membangun image secara offline. Rebuild saat Dockerfile, hook, atau migrasi berubah. Volume data tetap dipakai ketika kontainer dibuat ulang.

## Verifikasi

```sh
npm run lint
npx tsc --noEmit
node --test tests/*.test.mjs
curl -fsS https://jensenhuang.stei.fun/api/health
```

Untuk pengujian integrasi pada deployment yang diizinkan, jalankan:

```sh
node backend/smoke-diary.mjs https://jensenhuang.stei.fun
```

Smoke test membuat dua akun fiktif, memeriksa isolasi data serta alur onboarding, porsi makanan, dan air. Akun fiktif tetap ada, sedangkan entri makanan dan air yang dibuat untuk pengujian dihapus oleh skrip.
