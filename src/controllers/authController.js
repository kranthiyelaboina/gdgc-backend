import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const generateToken = (adminId, username, email) => {
    return jwt.sign(
        { adminId, username, email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const authController = {
    // Admin registration (for initial setup)
    async register(req, res) {
        try {
            const { username, password, email, secretKey } = req.body;
            
            // Validate secret key
            if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
                return res.status(403).json({ 
                    error: 'Unauthorized: Invalid secret key for admin registration' 
                });
            }
            
            // Validate required fields
            if (!username || !password || !email) {
                return res.status(400).json({ 
                    error: 'Username, password, and email are required' 
                });
            }
            
            // Check if admin already exists
            const existingAdmin = await Admin.findOne({ 
                $or: [{ username }, { email }] 
            });
            
            if (existingAdmin) {
                return res.status(409).json({ 
                    error: 'Admin with this username or email already exists' 
                });
            }
            
            // Create new admin
            const admin = new Admin({ username, password, email });
            await admin.save();
            
            res.status(201).json({ 
                message: 'Admin registered successfully',
                admin: { 
                    id: admin._id, 
                    username: admin.username, 
                    email: admin.email,
                    role: admin.role,
                    createdAt: admin.createdAt
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ 
                error: 'Internal server error during registration' 
            });
        }
    },

    // Admin login
    async login(req, res) {
        try {
            const { username, password } = req.body;
            
            // Find admin by username
            const admin = await Admin.findOne({ username });
            
            if (!admin) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Compare password using bcrypt
            const isPasswordValid = await admin.comparePassword(password);
            
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Update last login timestamp
            admin.lastLogin = new Date();
            await admin.save();
            
            const token = generateToken(admin._id, admin.username, admin.email);
            
            // Store admin info in session
            req.session.adminId = admin._id;
            req.session.admin = {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            };
            
            res.status(200).json({ 
                message: 'Login successful',
                token,
                admin: { 
                    id: admin._id, 
                    username: admin.username, 
                    email: admin.email,
                    role: admin.role 
                }
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Admin logout
    async logout(req, res) {
        try {
            // Destroy session
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({ error: 'Could not log out' });
                }
                res.clearCookie('connect.sid'); // Clear session cookie
                res.status(200).json({ message: 'Logout successful' });
            });
        } catch (error) {
            res.status(500).json({ error: 'Logout failed' });
        }
    },

    // Get current admin info (for checking if logged in)
    async getCurrentAdmin(req, res) {
        try {
            // Use adminId from hybrid middleware (session or JWT)
            const adminId = req.adminId || req.session?.adminId;
            
            if (!adminId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            
            const admin = await Admin.findById(adminId).select('-password');
            if (!admin) {
                return res.status(404).json({ error: 'Admin not found' });
            }
            
            res.status(200).json({ admin });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Refresh JWT token
    async refreshToken(req, res) {
        try {
            // Use adminId from hybrid middleware (session or JWT)
            const adminId = req.adminId || req.session?.adminId;
            
            if (!adminId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            
            const admin = await Admin.findById(adminId).select('username email');
            if (!admin) {
                return res.status(404).json({ error: 'Admin not found' });
            }
            
            const newToken = generateToken(adminId, admin.username, admin.email);
            
            res.status(200).json({ 
                message: 'Token refreshed successfully',
                token: newToken,
                expiresIn: '24h'
            });
        } catch (error) {
            res.status(500).json({ error: 'Token refresh failed' });
        }
    },

    // Change password (for logged-in admin)
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ 
                    error: 'Current password and new password are required' 
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ 
                    error: 'New password must be at least 6 characters long' 
                });
            }
            
            // Use adminId from hybrid middleware (session or JWT)
            const adminId = req.adminId || req.session?.adminId;
            
            if (!adminId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            
            const admin = await Admin.findById(adminId);
            if (!admin) {
                return res.status(404).json({ error: 'Admin not found' });
            }
            
            // Verify current password
            const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            // Update password (will be hashed by the model's pre-save hook)
            admin.password = newPassword;
            await admin.save();
            
            res.status(200).json({ 
                message: 'Password changed successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Password change failed' });
        }
    },

    // Get all admins (for super admin management)
    async getAllAdmins(req, res) {
        try {
            // Check if current admin has permission (you might want to add a superAdmin role check)
            const admins = await Admin.find({}).select('-password').sort({ createdAt: -1 });
            
            res.status(200).json({ 
                message: 'Admins retrieved successfully',
                count: admins.length,
                admins: admins.map(admin => ({
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role,
                    createdAt: admin.createdAt,
                    lastLogin: admin.lastLogin || null
                }))
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve admins' });
        }
    },

    // Delete admin (master admin only - username 'kranthi')
    async deleteAdmin(req, res) {
        try {
            const { adminId } = req.params;
            
            // Use adminId from hybrid middleware (session or JWT)
            const requestingAdminId = req.adminId || req.session?.adminId;
            
            // Get the requesting admin
            const requestingAdmin = await Admin.findById(requestingAdminId);
            
            if (!requestingAdmin) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            
            // Check if requesting admin is the master admin
            const MASTER_ADMIN = 'kranthi';
            if (requestingAdmin.username !== MASTER_ADMIN) {
                return res.status(403).json({ 
                    error: 'Access denied. Only master admin can delete admins.' 
                });
            }
            
            // Find the admin to delete
            const adminToDelete = await Admin.findById(adminId);
            
            if (!adminToDelete) {
                return res.status(404).json({ error: 'Admin not found' });
            }
            
            // Prevent deletion of master admin
            if (adminToDelete.username === MASTER_ADMIN) {
                return res.status(403).json({ 
                    error: 'Cannot delete master admin account' 
                });
            }
            
            await Admin.findByIdAndDelete(adminId);
            
            res.status(200).json({ 
                message: 'Admin deleted successfully',
                deletedAdmin: {
                    id: adminToDelete._id,
                    username: adminToDelete.username
                }
            });
        } catch (error) {
            console.error('Delete admin error:', error);
            res.status(500).json({ error: 'Failed to delete admin' });
        }
    }
};

export default authController;