import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Function to check if .env file exists and display its contents
function checkEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    
    console.log('Checking .env file:');
    if (fs.existsSync(envPath)) {
        console.log('✅ .env file exists at:', envPath);
        
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const envLines = envContent.split('\n').filter(line => line.trim() !== '');
            
            console.log('\n.env file contains the following lines:');
            envLines.forEach((line, index) => {
                // Hide actual secret values, just show that they exist
                if (line.startsWith('#')) {
                    console.log(`  ${index + 1}. ${line}`); // Show comments as is
                } else {
                    const keyValue = line.split('=');
                    if (keyValue.length >= 2) {
                        const key = keyValue[0].trim();
                        console.log(`  ${index + 1}. ${key}=[${keyValue[1].length} characters]`);
                    } else {
                        console.log(`  ${index + 1}. ${line}`);
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error reading .env file:', error);
        }
    } else {
        console.error('❌ .env file not found at:', envPath);
        console.log('\nYou need to create a .env file with your Azure AD app credentials:');
        console.log('CLIENT_ID=your_client_id');
        console.log('CLIENT_SECRET=your_client_secret');
        console.log('TENANT_ID=your_tenant_id');
    }
}

// Check environment variables
function checkEnvVariables() {
    console.log('\nChecking loaded environment variables:');
    
    const variables = ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID'];
    
    variables.forEach(variable => {
        const value = process.env[variable];
        if (value) {
            console.log(`✅ ${variable} is set (${value.length} characters)`);
        } else {
            console.error(`❌ ${variable} is NOT SET`);
        }
    });
}

// Display process working directory
console.log('Current working directory:', process.cwd());

// Check .env file
checkEnvFile();

// Check environment variables
checkEnvVariables();

console.log('\nIf environment variables are not loading correctly:');
console.log('1. Make sure your .env file is in the project root directory');
console.log('2. Ensure it has the correct variable names (CLIENT_ID, CLIENT_SECRET, TENANT_ID)');
console.log('3. Restart your terminal/command prompt after making changes');
console.log('4. Run "npm run build" before running the debug scripts to ensure latest changes are compiled'); 