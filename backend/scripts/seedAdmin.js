const { sequelize } = require('../models');
const User = require('../models/user');

async function seedAdmin() {
  try {
    await sequelize.sync();
    
    // Update ENUM role terlebih dahulu dengan pendekatan yang lebih aman
    console.log('🔄 Mengupdate ENUM role untuk mendukung admin...');
    try {
      // Cek apakah ENUM sudah mendukung admin
      const [results] = await sequelize.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'role'
      `);
      
      if (results.length > 0 && !results[0].COLUMN_TYPE.includes('admin')) {
        await sequelize.query(`
          ALTER TABLE users 
          MODIFY COLUMN role ENUM('guru', 'siswa', 'admin') NOT NULL
        `);
        console.log('✅ ENUM role berhasil diupdate!');
      } else {
        console.log('ℹ️ ENUM role sudah mendukung admin');
      }
    } catch (enumError) {
      console.log('⚠️ Warning: Tidak bisa mengupdate ENUM, mencoba membuat admin...');
    }
    
    console.log('🔄 Membuat akun admin...');
    const [user, created] = await User.findOrCreate({
      where: { email: 'admin@gmail.com' },
      defaults: {
        name: 'Administrator',
        email: 'admin@gmail.com',
        password: 'admin123', // Untuk produksi, gunakan hash!
        role: 'admin',
      },
    });
    if (created) {
      console.log('✅ Akun admin default berhasil dibuat:', user.email);
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Role: admin');
    } else {
      console.log('ℹ️ Akun admin sudah ada:', user.email);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal membuat akun admin:', err.message);
    console.log('');
    console.log('💡 Solusi manual:');
    console.log('1. Buka MySQL dan jalankan:');
    console.log('   ALTER TABLE users MODIFY COLUMN role ENUM("guru", "siswa", "admin") NOT NULL;');
    console.log('2. Kemudian jalankan lagi: node scripts/seedAdmin.js');
    process.exit(1);
  }
}

seedAdmin(); 