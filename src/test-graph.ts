import * as dotenv from 'dotenv';
import { createLogger } from './main/utils/logger';
import GraphService from './main/services/graphService';

// Load environment variables
dotenv.config();

// Create a logger
const logger = createLogger('GraphTest');

// Test serial number - can be changed based on your test needs
const TEST_SERIAL = '123456789012';
const TEST_DESCRIPTION = 'Test Device Description';

/**
 * Run a test with better error handling
 */
async function runTest(testName: string, testFn: () => Promise<any>) {
    try {
        logger.info(`Running test: ${testName}`);
        const result = await testFn();
        logger.info(`Test ${testName} succeeded:`, result);
        return { success: true, result };
    } catch (error) {
        logger.error(`Test ${testName} failed:`, error);
        
        // Log detailed error information
        if (error instanceof Error) {
            logger.error(`Error name: ${error.name}`);
            logger.error(`Error message: ${error.message}`);
            logger.error(`Error stack: ${error.stack}`);
            
            // Try to extract more details from the error object
            const errorObj = error as any;
            if (errorObj.statusCode) {
                logger.error(`Status code: ${errorObj.statusCode}`);
            }
            if (errorObj.code) {
                logger.error(`Error code: ${errorObj.code}`);
            }
            if (errorObj.body) {
                logger.error(`Error body:`, errorObj.body);
            }
        }
        
        return { success: false, error };
    }
}

/**
 * Main test function
 */
async function runTests() {
    logger.info('Starting Graph API tests...');
    logger.info('Environment variables check:');
    logger.info(`- CLIENT_ID: ${process.env.CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
    logger.info(`- TENANT_ID: ${process.env.TENANT_ID ? '✓ Set' : '✗ Missing'}`);
    logger.info(`- CLIENT_SECRET: ${process.env.CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);
    
    // Get the Graph service instance
    const graphService = GraphService.getInstance();
    
    // Test 1: Test connection
    const connectionTest = await runTest('Connection Test', async () => {
        return await graphService.testConnection();
    });
    
    if (!connectionTest.success) {
        logger.error('Connection test failed. Cannot continue with other tests.');
        return;
    }
    
    // Test 2: Check device validation
    await runTest('Device Validation', async () => {
        const validation = graphService.validateDevice(TEST_SERIAL);
        return validation;
    });
    
    // Test 3: Check if device exists
    const deviceCheckResult = await runTest('Check Device', async () => {
        return await graphService.checkDeviceSerial(TEST_SERIAL);
    });
    
    // Skip device creation if it already exists
    if (deviceCheckResult.success && deviceCheckResult.result) {
        logger.info(`Device with serial ${TEST_SERIAL} already exists, skipping creation`);
    } else {
        // Test 4: Create a new device
        await runTest('Create Device', async () => {
            return await graphService.addDeviceSerial(TEST_SERIAL, TEST_DESCRIPTION);
        });
    }
    
    // Test 5: List organizations (basic Graph API access test)
    await runTest('List Organizations', async () => {
        const client = await graphService.getClient();
        return await client.api('/organization').get();
    });
    
    logger.info('All tests completed');
}

// Run the tests
runTests().catch(error => {
    logger.error('Unhandled error in test execution:', error);
}); 