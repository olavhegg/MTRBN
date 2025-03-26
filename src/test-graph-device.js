require('dotenv').config();
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const https = require('https');

// A serial that would match the format
const TEST_SERIAL = '123456789012';

// Log errors with more details
function logError(error) {
    console.error('Error details:');
    if (typeof error === 'object' && error !== null) {
        console.error('Message:', error.message);
        console.error('Name:', error.name);
        if ('statusCode' in error) console.error('Status code:', error.statusCode);
        if ('code' in error) console.error('Error code:', error.code);
        if ('body' in error) console.error('Body:', error.body);
    } else {
        console.error(error);
    }
}

// HTTP request using native Node.js https
function httpsRequest(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsedData = JSON.parse(data);
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: parsedData
                        });
                    } catch (e) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data
                        });
                    }
                } else {
                    reject({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        message: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function runTest() {
    try {
        console.log('Starting Graph API test with multiple approaches');
        console.log('Environment check:');
        console.log(`CLIENT_ID: ${process.env.CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
        console.log(`CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);
        console.log(`TENANT_ID: ${process.env.TENANT_ID ? '✓ Set' : '✗ Missing'}`);

        if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.TENANT_ID) {
            throw new Error('Missing required environment variables');
        }

        // Create token credential for auth
        const tokenCredential = new ClientSecretCredential(
            process.env.TENANT_ID,
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET
        );

        console.log('Token credential created, getting auth token...');
        const token = await tokenCredential.getToken(['https://graph.microsoft.com/.default']);
        console.log('Token acquired successfully');

        // TEST 1: Exactly what's in the app - using Graph client with full URL
        console.log('\n=== TEST 1: Graph client with full URL (app approach) ===');
        try {
            const graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        done(null, token.token);
                    } catch (error) {
                        done(error, null);
                    }
                }
            });

            console.log('Graph client initialized');
            
            const endpoint = 'https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities';
            const filter = `importedDeviceIdentifier eq '${TEST_SERIAL}'`;
            console.log(`Calling API with endpoint: ${endpoint} and filter: ${filter}`);

            const result = await graphClient.api(endpoint)
                .filter(filter)
                .get();
            
            console.log('TEST 1 SUCCESS! Result:', result);
        } catch (error) {
            console.error('TEST 1 FAILED!');
            logError(error);
        }

        // TEST 2: Native HTTPS request to beta endpoint
        console.log('\n=== TEST 2: Native HTTPS request to beta endpoint ===');
        try {
            const url = new URL(`https://graph.microsoft.com/beta/deviceManagement/importedDeviceIdentities?$filter=importedDeviceIdentifier eq '${TEST_SERIAL}'`);
            console.log(`Calling API with HTTPS: ${url.toString()}`);
            
            const response = await httpsRequest(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('TEST 2 SUCCESS! Result:', response.data);
        } catch (error) {
            console.error('TEST 2 FAILED!');
            logError(error);
        }

        // TEST 3: Graph client with different URL structure
        console.log('\n=== TEST 3: Graph client with URL without https:// prefix ===');
        try {
            const graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        done(null, token.token);
                    } catch (error) {
                        done(error, null);
                    }
                }
            });

            console.log('Graph client initialized');
            
            // Try without https:// prefix
            const endpoint = 'beta/deviceManagement/importedDeviceIdentities';
            const filter = `importedDeviceIdentifier eq '${TEST_SERIAL}'`;
            console.log(`Calling API with endpoint: ${endpoint} and filter: ${filter}`);

            const result = await graphClient.api(endpoint)
                .filter(filter)
                .get();
            
            console.log('TEST 3 SUCCESS! Result:', result);
        } catch (error) {
            console.error('TEST 3 FAILED!');
            logError(error);
        }

        // TEST 4: Try with baseUrl set in client
        console.log('\n=== TEST 4: Graph client with baseUrl set and relative path ===');
        try {
            const graphClient = Client.init({
                baseUrl: 'https://graph.microsoft.com/beta',
                authProvider: async (done) => {
                    try {
                        done(null, token.token);
                    } catch (error) {
                        done(error, null);
                    }
                }
            });

            console.log('Graph client initialized with baseUrl');
            
            const endpoint = '/deviceManagement/importedDeviceIdentities';
            const filter = `importedDeviceIdentifier eq '${TEST_SERIAL}'`;
            console.log(`Calling API with endpoint: ${endpoint} and filter: ${filter}`);

            const result = await graphClient.api(endpoint)
                .filter(filter)
                .get();
            
            console.log('TEST 4 SUCCESS! Result:', result);
        } catch (error) {
            console.error('TEST 4 FAILED!');
            logError(error);
        }

        // TEST 5: Try a simpler endpoint to see if anything works
        console.log('\n=== TEST 5: Graph client with simple Beta endpoint (organization) ===');
        try {
            const graphClient = Client.init({
                authProvider: async (done) => {
                    try {
                        done(null, token.token);
                    } catch (error) {
                        done(error, null);
                    }
                }
            });

            console.log('Graph client initialized');
            
            const endpoint = 'https://graph.microsoft.com/beta/organization';
            console.log(`Calling API with simple endpoint: ${endpoint}`);

            const result = await graphClient.api(endpoint).get();
            
            console.log('TEST 5 SUCCESS! Result:', result);
        } catch (error) {
            console.error('TEST 5 FAILED!');
            logError(error);
        }

    } catch (error) {
        console.error('Test failed with error:');
        logError(error);
    }
}

runTest(); 