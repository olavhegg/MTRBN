import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { createLogger } from './main/utils/logger';
import GraphService from './main/services/graphService';

// Load environment variables
dotenv.config();

// Create a logger
const logger = createLogger('GraphTest');

// Create readline interface for interaction
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Default test serial number
let TEST_SERIAL = '123456789012';
let TEST_DESCRIPTION = 'Test Device Description';

/**
 * Run a test with better error handling
 */
async function runTest(testName: string, testFn: () => Promise<any>) {
    try {
        logger.info(`Running test: ${testName}`);
        console.log(`\n----- RUNNING TEST: ${testName} -----`);
        const result = await testFn();
        logger.info(`Test ${testName} succeeded:`, result);
        console.log(`✅ TEST PASSED: ${testName}`);
        console.log('RESULT:', JSON.stringify(result, null, 2));
        return { success: true, result };
    } catch (error) {
        logger.error(`Test ${testName} failed:`, error);
        console.log(`❌ TEST FAILED: ${testName}`);
        
        // Log detailed error information
        if (error instanceof Error) {
            console.log(`Error name: ${error.name}`);
            console.log(`Error message: ${error.message}`);
            
            // Try to extract more details from the error object
            const errorObj = error as any;
            if (errorObj.statusCode) {
                console.log(`Status code: ${errorObj.statusCode}`);
            }
            if (errorObj.code) {
                console.log(`Error code: ${errorObj.code}`);
            }
            if (errorObj.body) {
                console.log(`Error body:`, errorObj.body);
            }
        } else {
            console.log('Unknown error type:', error);
        }
        
        return { success: false, error };
    }
}

// Available tests
const tests = {
    '1': {
        name: 'Test Connection',
        fn: async (graphService: GraphService) => {
            return await graphService.testConnection();
        }
    },
    '2': {
        name: 'Check Environment Variables',
        fn: async () => {
            return {
                CLIENT_ID: process.env.CLIENT_ID ? '✓ Set' : '✗ Missing',
                TENANT_ID: process.env.TENANT_ID ? '✓ Set' : '✗ Missing',
                CLIENT_SECRET: process.env.CLIENT_SECRET ? '✓ Set' : '✗ Missing'
            };
        }
    },
    '3': {
        name: 'Validate Device Serial',
        fn: async (graphService: GraphService) => {
            return graphService.validateDevice(TEST_SERIAL);
        }
    },
    '4': {
        name: 'Check If Device Exists',
        fn: async (graphService: GraphService) => {
            return await graphService.checkDeviceSerial(TEST_SERIAL);
        }
    },
    '5': {
        name: 'Add Device to Intune',
        fn: async (graphService: GraphService) => {
            return await graphService.addDeviceSerial(TEST_SERIAL, TEST_DESCRIPTION);
        }
    },
    '6': {
        name: 'List Organizations',
        fn: async (graphService: GraphService) => {
            const client = await graphService.getClient();
            return await client.api('/organization').get();
        }
    },
    '7': {
        name: 'Run All Tests in Sequence',
        fn: async (graphService: GraphService) => {
            // This is just a placeholder, the function is handled differently
            return {};
        }
    }
};

/**
 * Show the menu and get user choice
 */
function showMenu(): Promise<string> {
    return new Promise((resolve) => {
        console.log('\n===== GRAPH API TEST MENU =====');
        console.log(`Current test serial: ${TEST_SERIAL}`);
        console.log('Available tests:');
        
        for (const [key, test] of Object.entries(tests)) {
            console.log(`${key}. ${test.name}`);
        }
        
        console.log('8. Change Test Serial Number');
        console.log('9. Exit');
        
        rl.question('\nSelect an option (1-9): ', (answer) => {
            resolve(answer.trim());
        });
    });
}

/**
 * Change the test serial number
 */
function changeTestSerial(): Promise<void> {
    return new Promise((resolve) => {
        rl.question('Enter new serial number (must be 12 chars and end with 2): ', (serial) => {
            TEST_SERIAL = serial.trim();
            rl.question('Enter device description: ', (description) => {
                TEST_DESCRIPTION = description.trim();
                console.log(`Serial number set to: ${TEST_SERIAL}`);
                console.log(`Description set to: ${TEST_DESCRIPTION}`);
                resolve();
            });
        });
    });
}

/**
 * Run a specific test
 */
async function runSelectedTest(choice: string) {
    const graphService = GraphService.getInstance();
    
    if (choice === '8') {
        await changeTestSerial();
        return true;
    } else if (choice === '9') {
        return false;
    } else if (choice === '7') {
        // Run all tests in sequence
        for (let i = 1; i <= 6; i++) {
            const test = tests[i.toString()];
            if (test) {
                await runTest(test.name, () => test.fn(graphService));
                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return true;
    } else if (tests[choice]) {
        const test = tests[choice];
        await runTest(test.name, () => test.fn(graphService));
        return true;
    } else {
        console.log('Invalid option. Please try again.');
        return true;
    }
}

/**
 * Main interactive function
 */
async function startInteractive() {
    console.log('Starting Graph API Interactive Test Tool');
    logger.info('Interactive test tool started');
    
    let running = true;
    while (running) {
        const choice = await showMenu();
        running = await runSelectedTest(choice);
    }
    
    console.log('Exiting test tool. Goodbye!');
    rl.close();
}

// Start the interactive menu
startInteractive().catch(error => {
    logger.error('Unhandled error in test execution:', error);
    console.error('An unexpected error occurred:', error);
    rl.close();
}); 