// Import modules
import { DeviceStatus } from './modules/types.js';
import { showToast } from './modules/utils.js';
import { 
    setupDeviceHandlers, 
    setupAccountHandlers, 
    setupGroupHandlers, 
    setupTabNavigation,
    setupQuitHandler,
    setupLicenseHandlers
} from './modules/eventHandlers.js';

// Status tracking
let currentStatus: DeviceStatus = {
    intuneStatus: false,
    tacStatus: false,
    accountStatus: false,
    groupsStatus: {},
    isProvisioned: {
        intune: false,
        tac: false
    }
};

// Get the electron API from the window object
const { ipcRenderer } = (window as any).electron;

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    try {
        // Setup UI event handlers
        setupTabNavigation();
        setupDeviceHandlers(ipcRenderer);
        setupAccountHandlers(ipcRenderer);
        setupGroupHandlers(ipcRenderer);
        setupLicenseHandlers(ipcRenderer);
        setupQuitHandler(ipcRenderer);

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast(`Error initializing app: ${error instanceof Error ? error.message : String(error)}`, true);
    }
}); 