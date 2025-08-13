# SchoolFlow Hub Admin Setup

This directory contains scripts to securely create an admin user for your SchoolFlow Hub application.

## Security Features

- Credentials stored in environment variables (`.env` file)
- `.gitignore` prevents accidental commits of sensitive data
- Role-based access control
- Secure password handling

## Setup Instructions

1. **Update Environment Variables**:
   - Edit the `.env` file and change the default credentials to secure values
   - Especially important: Change `ADMIN_PASSWORD` to a strong, unique password

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Create Admin User**:
   ```bash
   npm run create-admin
   ```

4. **Configure Back4App Permissions**:
   - Log into your Back4App Dashboard
   - For each class (Student, Teacher, Course, etc.):
     - Go to Database > Browser > [Class Name]
     - Click the Settings (gear) icon
     - Select "Class Level Permissions"
     - Add the "Admin" role to all permissions (find, get, create, update, delete)
     - Click "Save"

## Important Security Notes

1. **Never commit the `.env` file** to version control
2. **Use strong, unique passwords**
3. **Regularly rotate admin credentials**
4. **Limit admin account usage to essential tasks only**
5. **Monitor admin account activity**

## Environment Variables

- `BACK4APP_APP_ID`: Your Back4App Application ID
- `BACK4APP_JS_KEY`: Your Back4App JavaScript Key
- `BACK4APP_SERVER_URL`: Your Back4App Server URL
- `ADMIN_USERNAME`: Admin username (default: admin)
- `ADMIN_EMAIL`: Admin email address
- `ADMIN_PASSWORD`: Admin password (CHANGE THIS)

## Troubleshooting

If you encounter errors:

1. Verify all environment variables are correctly set
2. Check Back4App credentials are correct
3. Ensure you have internet connectivity
4. Check Back4App dashboard for any restrictions