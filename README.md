# 🍿 MUZLIX (NontonDesktop)

![Muzlix Desktop App](https://img.shields.io/badge/Status-Private_Beta-red) ![Tech Stack](https://img.shields.io/badge/Stack-Electron%20%7C%20React%20%7C%20Node.js-blue)

**MUZLIX** (sebelumnya NontonDesktop) adalah aplikasi dekstop berbasis Electron dan React yang memungkinkan pengguna untuk melakukan *streaming* film bersubtitle Indonesia dengan antarmuka sinematik premium bergaya Netflix dipadukan dengan desain *Glassmorphism* modern.

> **⚠️ PERHATIAN PENTING (SECURITY NOTICE)**
> Aplikasi dekstop ini dibuat **EKSKLUSIF** untuk keperluan pembelajaran developer utama, **Musa Habibulloh Al Faruq**. 
> Tolong JANGAN menyebarluaskan aplikasi ini selain untuk kepentingan *tester* dan *survey* internal dari pihak developer. Aplikasi ini dilindungi oleh *Security Lock Screen* sebelum dapat diakses.

---

## ✨ Fitur Utama

- 🔒 **Security Lock System**: Akses aplikasi dikunci untuk memastikan hanya *tester* berwenang yang dapat menggunakannya.
- 🎨 **Premium Cinematic UI**: Desain mode gelap pekat (Dark Mode) yang terinspirasi dari antarmuka Netflix, lengkap dengan navigasi halaman (Pagination) yang sangat mulus.
- 📺 **Dribbble-Style Player**: Pemutar video (Video Player) tidak lagi konvensional! Hadir dengan *floating card* bergaya *glassmorphism* modern, lengkap dengan tombol lapis gradasi merah yang cantik.
- 🕵️ **Cloudflare Bypass Search**: Fitur pencarian canggih yang memanfaatkan `BrowserWindow` tersembunyi dari Electron untuk menembus proteksi anti-bot Cloudflare, menjamin pencarian film selalu berhasil.
- 🛡️ **Built-in Ad-Blocker & CORS Bypass**: Menghentikan *popup* dan melucuti pelacak iklan (*ad-networks*) langsung dari proses utama Electron (`main.cjs`), memastikan pengalaman menonton yang bersih tanpa gangguan iklan *iframe*.
- 🏷️ **Dynamic Genre Filtering**: Menyaring film otomatis berdasarkan kategori yang didapat secara *real-time* tanpa membebani server target.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini menggunakan perpaduan antara teknologi web modern dan arsitektur *backend* yang dioptimalkan untuk performa tinggi:

- **Frontend:** React, Vite, Tailwind CSS, Lucide React (Icons).
- **Desktop Environment:** Electron.js (menangani modifikasi HTTP headers & proses IPC lintas keamanan).
- **Backend (API):** Node.js, Express, Axios, Cheerio (berada di dalam direktori `api/`).

---

## 🚀 Cara Menjalankan Aplikasi Lokal

Karena aplikasi ini dikembangkan menggunakan arsitektur *monorepo* sederhana (Frontend + Backend), proses instalasi dan penjalanan diringkas menggunakan *script* otomatis.

### 1. Instalasi Dependensi
Pastikan Node.js sudah terinstal. Buka terminal di folder root (`E:\Github\NontonDesktop`) dan jalankan:
```bash
npm install
cd api
npm install
cd ..
```

### 2. Kompilasi Backend (Jika ada perubahan API)
```bash
npm run build --prefix api
```

### 3. Menjalankan Aplikasi (Mode Developer)
Untuk menjalankan Backend, Vite (Frontend), dan Electron secara bersamaan:
```bash
npm run dev
```

### 4. Akses Masuk
Saat aplikasi terbuka, Anda akan dihadapkan pada layar *Security Lock*. Silakan masukkan kata sandi khusus *tester*:
**Sandi:** `musaganteng123`

---

## 👨‍💻 Pengembang

Dibuat dan dedikasi tinggi oleh:
**Musa Habibulloh Al Faruq**

*Catatan: Hak cipta film dan layanan streaming sepenuhnya milik penyedia pihak ketiga (LK21). Aplikasi ini murni berfungsi sebagai sarana peramban edukatif (browser-wrapper).*
