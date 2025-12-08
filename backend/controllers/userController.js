
const { User } = require('../models');
const { logActivity } = require('./activityLogController');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Get all admin users
const getAdminUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id', 'name', 'email', 'password', 'role', 'createdAt', 'updatedAt']
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'password', 'role', 'createdAt', 'updatedAt']
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new admin user
const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user with same email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update admin user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // Update user
    await user.update({
      name: name || user.name,
      email: email || user.email,
      password: password || user.password,
      role: 'admin'
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete admin user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete the user
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    // Menggunakan req.user dari middleware authenticateToken
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      id: user.id,
      name: user.name, 
      email: user.email,
      role: user.role 
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    // Menggunakan req.user dari middleware authenticateToken
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, password } = req.body;
    const oldName = user.name;
    const oldEmail = user.email;
    
    user.name = name || user.name;
    user.email = email || user.email;
    if (password) user.password = password; // (hash di produksi)
    await user.save();

    // Log activity
    await logActivity(
      userId,
      user.role,
      user.name,
      'edit_profile',
      `${user.name} updated their profile information`,
      { 
        nameChanged: name !== oldName,
        emailChanged: email !== oldEmail,
        passwordChanged: !!password
      }
    );

    res.json({ 
      success: true, 
      name: user.name, 
      email: user.email,
      role: user.role 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update password for specific user
const updatePassword = async (req, res) => {
  try {
    // Use authenticated user's ID from token
    const userId = req.user?.id;
    const { id } = req.params;
    
    // Use authenticated user ID, fallback to params if not available
    const targetUserId = userId || id;
    
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    if (user.password !== currentPassword) {
      return res.status(400).json({ error: 'Password saat ini tidak benar' });
    }
    
    // Update password
    await user.update({ password: newPassword });
    
    // Log activity
    await logActivity(
      user.id,
      user.role,
      user.name,
      'change_password',
      `${user.name} changed their password`,
      {}
    );
    
    res.json({ message: 'Password berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login function
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Email tidak terdaftar',
        errorType: 'EMAIL_NOT_FOUND'
      });
    }
    
    // Check password (in production, use bcrypt for hashing)
    if (user.password !== password) {
      return res.status(401).json({ 
        error: 'Password salah',
        errorType: 'INVALID_PASSWORD'
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
    
    // Log activity
    await logActivity(
      user.id,
      user.role,
      user.name,
      'login',
      `${user.name} logged in`,
      { email: user.email }
    );
    
    // Return user data (exclude password) and token
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.json({ 
      message: 'Login berhasil',
      token,
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAdminUsers,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  updatePassword,
  login
}; 