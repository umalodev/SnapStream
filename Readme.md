# Snap Stream - Live Streaming & Recording Platform

Aplikasi profesional untuk live streaming dan recording dengan admin dashboard yang lengkap. Dibangun dengan React, TypeScript, Node.js, dan MediaSoup untuk streaming real-time.

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Prasyarat](#-prasyarat)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Struktur Project](#-struktur-project)
- [Scripts yang Tersedia](#-scripts-yang-tersedia)
- [Troubleshooting](#-troubleshooting)

## ✨ Fitur Utama

- 🎥 **Live Streaming** - Streaming real-time dengan MediaSoup
- 📹 **Recording** - Rekam live stream ke video file
- 👥 **Admin Dashboard** - Panel admin untuk mengelola streaming dan recording
- 📊 **Analytics** - Statistik streaming dan recording
- 🔐 **Authentication** - Sistem autentikasi berbasis JWT
- 📱 **Responsive Design** - Tampilan yang responsif di berbagai perangkat
- 🎨 **Modern UI** - Interface yang modern dengan animasi

## 🛠 Teknologi yang Digunakan

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - ORM untuk database
- **MySQL** - Database
- **MediaSoup** - WebRTC SFU untuk streaming
- **Socket.io** - Real-time communication
- **JWT** - Authentication

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **TailwindCSS** - Styling
- **Electron** - Desktop app (opsional)

## 📦 Prasyarat

Sebelum memulai, pastikan Anda telah menginstall:

- **Node.js** (v16 atau lebih baru)
- **npm** atau **yarn**
- **MySQL** (v8.0 atau lebih baru)
- **Git**

Untuk verifikasi, jalankan:
```bash
node --version  # Harus v16 atau lebih baru
npm --version
mysql --version
```

## 🚀 Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd "cast app/recording2"
   ```

2. **Install semua dependencies sekaligus (RECOMMENDED)**
   ```bash
   npm run install:all
   ```
   
   Atau install manual:
   ```bash
   # Install root dependencies (untuk concurrently)
   npm install
   
   # Install Backend dependencies
   cd backend
   npm install
   
   # Install Frontend dependencies
   cd ../frontend
   npm install
   ```

## ⚙️ Konfigurasi

### 1. Konfigurasi Database

Buat database MySQL terlebih dahulu:
```sql
CREATE DATABASE recording CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Konfigurasi Backend

Buat file `.env` di folder `backend/`:
```env
# Server Configuration
PORT=3000
NODE_ENV=development
HOST=192.168.1.10

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=recording
DB_PORT=3306

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_1759984954468
JWT_EXPIRES_IN=7d

# Media Server
MEDIA_PORT=8000
MEDIA_HOST=192.168.1.10

# CORS
CORS_ORIGIN=http://localhost:5173
```

> **Catatan:** Ganti `192.168.1.10` dengan IP address komputer Anda. Gunakan `localhost` jika hanya menjalankan di satu mesin.

### 3. Konfigurasi Frontend

Edit file `frontend/src/config.ts`:
```typescript
export const API_URL = "http://192.168.1.10:3000";
```

> **Catatan:** Pastikan IP address sesuai dengan konfigurasi backend.

### 4. Setup Database (Optional)

Jalankan migrasi untuk membuat tabel:
```bash
cd backend
npm run create-tables
```

Untuk membuat admin user awal, jalankan:
```bash
node scripts/seedAdmin.js
```

## 🎯 Menjalankan Aplikasi

### ⚡ Opsi 1: Menjalankan Semua dari Root (RECOMMENDED)

Install dependencies root terlebih dahulu (hanya pertama kali):
```bash
npm install
```

Kemudian jalankan semua service dengan satu command:
```bash
npm run dev
```

Ini akan menjalankan:
- ✅ Backend Server (port 3000)
- ✅ MediaSoup Server (port 8000) 
- ✅ Frontend Electron App

Atau menggunakan script alternatif (menggunakan start.js backend):
```bash
npm run dev:all
```

### Opsi 2: Menjalankan Development Mode Manual (3 Terminal)

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
Atau:
```bash
npm start
```

**Terminal 2 - Media Server (untuk streaming):**
```bash
cd backend
npm run media
```

**Terminal 3 - Frontend Electron:**
```bash
cd frontend
npm run dev:electron
```

### Opsi 3: Menjalankan dengan Start Script

Backend memiliki script `start.js` yang menjalankan server dan media server bersamaan:
```bash
cd backend
npm run start:all
```

Lalu di terminal lain untuk frontend:
```bash
cd frontend
npm run dev:electron
```

### Opsi 4: Menjalankan Web Version (bukan Electron)

Untuk menjalankan di browser (bukan Electron):
```bash
npm run dev:web
```

### Akses Aplikasi

- **Frontend (Web):** http://localhost:5173
- **Backend API:** http://localhost:3000/api
- **Admin Login:** http://localhost:5173/admin
- **Media Server:** http://localhost:8000

### Default Admin Credentials

Jika sudah menjalankan `seedAdmin.js`, gunakan:
- **Email:** `admin@example.com`
- **Password:** `admin123` (atau sesuai yang di-set di script)

> ⚠️ **Penting:** Ganti password default setelah login pertama kali!

## 📁 Struktur Project

```
recording2/
├── backend/                 # Backend server
│   ├── config/             # Konfigurasi
│   ├── controllers/        # Controller logic
│   ├── middleware/         # Express middleware
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── scripts/            # Utility scripts
│   ├── uploads/            # Uploaded files
│   ├── server.js           # Main server file
│   ├── mediasoupServer.js  # MediaSoup server
│   └── package.json
│
└── frontend/               # Frontend application
    ├── src/
    │   ├── admin/          # Admin pages
    │   ├── components/     # React components
    │   ├── context/        # React context
    │   ├── config.ts       # Frontend config
    │   └── App.tsx         # Main app component
    ├── public/             # Static assets
    ├── dist/               # Build output
    └── package.json
```

## 📜 Scripts yang Tersedia

### Root Scripts (Direkomendasikan)

Dari folder root, jalankan:
```bash
npm run dev            # Menjalankan semua: backend + media + frontend electron
npm run dev:all        # Menjalankan dengan start.js backend (lebih efisien)
npm run dev:web        # Menjalankan untuk web browser (bukan electron)
npm run install:all    # Install semua dependencies
```

### Backend Scripts

```bash
npm start              # Menjalankan production server
npm run dev            # Menjalankan development server
npm run start:all      # Menjalankan server + media server bersamaan
npm run media          # Menjalankan MediaSoup server saja
npm run create-tables  # Membuat tabel database
```

### Frontend Scripts

```bash
npm run dev            # Development server (Vite) - web browser
npm run dev:electron   # Development server (Vite) - Electron app
npm run build          # Build untuk production
npm run preview        # Preview build production
npm run lint           # Lint code
npm run dev:backend    # Menjalankan backend dari frontend folder
npm run dev:media      # Menjalankan media server dari frontend folder
```

### Build untuk Production

```bash
# Build frontend
cd frontend
npm run build

# Backend tidak perlu build, langsung jalankan:
cd ../backend
npm start
```

### Build Electron App (Desktop)

```bash
cd frontend
npm run build:win      # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux
npm run build:all      # Semua platform
```

## 🔧 Troubleshooting

### 1. Port Already in Use

Jika port sudah digunakan, ubah di:
- Backend: File `.env` atau `backend/config.js`
- Frontend: Vite biasanya menggunakan port 5173, ubah di `vite.config.ts`

### 2. Database Connection Error

- Pastikan MySQL service berjalan
- Cek kredensial database di `.env`
- Pastikan database sudah dibuat
- Cek firewall jika database di remote server

### 3. CORS Error

Update `CORS_ORIGIN` di backend `.env` sesuai dengan URL frontend Anda:
```env
CORS_ORIGIN=http://localhost:5173
```

### 4. MediaSoup Connection Failed

- Pastikan media server berjalan (`npm run media`)
- Cek `MEDIA_HOST` dan `MEDIA_PORT` di konfigurasi
- Pastikan port tidak di-block oleh firewall

### 5. Module Not Found

Hapus `node_modules` dan install ulang:
```bash
rm -rf node_modules package-lock.json
npm install
```

### 6. IP Address Configuration

Untuk development di jaringan lokal:
1. Cari IP address komputer Anda:
   - **Windows:** `ipconfig` di Command Prompt
   - **Mac/Linux:** `ifconfig` atau `ip addr`
2. Update IP di:
   - `backend/.env` (HOST dan MEDIA_HOST)
   - `frontend/src/config.ts` (API_URL)

## 📝 Catatan Penting

1. **IP Address:** Pastikan IP address di backend dan frontend sesuai dengan jaringan Anda
2. **Firewall:** Pastikan port 3000, 5173, dan 8000 tidak di-block
3. **Database:** Database akan dibuat otomatis saat pertama kali menjalankan server (jika menggunakan `sequelize.sync()`)
4. **Uploads:** Folder `backend/uploads/` harus memiliki permission write

## 🔐 Security Notes

- Jangan commit file `.env` ke repository
- Ganti `JWT_SECRET` dengan nilai yang kuat di production
- Gunakan HTTPS di production
- Update password default admin segera setelah setup

## 📞 Support

Jika mengalami masalah:
1. Cek log di terminal untuk error messages
2. Pastikan semua prasyarat terinstall dengan benar
3. Verifikasi konfigurasi database dan IP address
4. Cek dokumentasi MediaSoup untuk masalah streaming

## 📄 License

MIT License

---

**Happy Streaming! 🎥✨**

