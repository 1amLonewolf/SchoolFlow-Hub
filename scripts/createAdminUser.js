// scripts/createAdminUser.js
require('dotenv').config();
const Parse = require('parse/node');

// Initialize Parse with environment variables
Parse.initialize(
    process.env.BACK4APP_APP_ID,
    process.env.BACK4APP_JS_KEY,
    process.env.BACK4APP_MASTER_KEY  // Master key for server-side operations
);
Parse.serverURL = process.env.BACK4APP_SERVER_URL;

class AdminUserManager {
    static async createAdminUser() {
        try {
            console.log('🔐 Creating secure admin user...');
            
            // Validate environment variables
            if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
                throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables');
            }
            
            // Check if admin user already exists
            const existingUserQuery = new Parse.Query(Parse.User);
            existingUserQuery.equalTo('username', process.env.ADMIN_USERNAME);
            
            try {
                const existingUser = await existingUserQuery.first({ useMasterKey: true });
                if (existingUser) {
                    console.log('⚠️  Admin user already exists');
                    return existingUser;
                }
            } catch (error) {
                // Continue if we can't check
                console.log('ℹ️  Unable to check if user exists, proceeding with creation');
            }
            
            // Create the admin user using master key
            const user = new Parse.User();
            user.set('username', process.env.ADMIN_USERNAME);
            user.set('password', process.env.ADMIN_PASSWORD);
            user.set('email', process.env.ADMIN_EMAIL);
            user.set('role', 'admin');
            user.set('isAdmin', true);
            
            const savedUser = await user.save(null, { useMasterKey: true });
            console.log('✅ Admin user created successfully!');
            console.log('   User ID:', savedUser.id);
            console.log('   Username:', savedUser.get('username'));
            
            return savedUser;
        } catch (error) {
            console.error('❌ Error creating admin user:', error.message);
            if (error.code) {
                console.error('   Error code:', error.code);
            }
            throw error;
        }
    }
}

// Only run if this script is called directly
if (require.main === module) {
    AdminUserManager.createAdminUser()
        .then(() => {
            console.log('\n🚀 Admin user setup complete!');
            console.log('\nNext steps:');
            console.log('1. Test logging in with the admin account');
            console.log('2. For full admin privileges, manually create an "Admin" role in Back4App Dashboard');
            console.log('3. Assign the admin user to this role');
            console.log('4. Set Class Level Permissions (CLPs) for each class to allow Admin role access');
        })
        .catch(error => {
            console.error('Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = AdminUserManager;