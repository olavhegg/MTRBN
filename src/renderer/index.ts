// Status tracking
let currentStatus = {
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

// Interface definitions
interface DeviceStatus {
    intuneStatus: boolean;
    tacStatus: boolean;
    accountStatus: boolean;
    groupsStatus: { [key: string]: boolean };
    isProvisioned: {
        intune: boolean;
        tac: boolean;
    };
}

// Helper Functions
function updateStatusIndicator(element: HTMLElement, status: string, type: 'success' | 'error' | 'warning' = 'warning') {
    element.textContent = status;
    element.className = `value ${type}`;
}

function updateStatus(message: string, isError: boolean = false, statusContainer: HTMLElement) {
    const statusElement = document.createElement('div');
    statusElement.className = `status-message ${isError ? 'error' : 'success'}`;
    statusElement.textContent = message;
    statusContainer.prepend(statusElement);

    // Keep only last 5 messages
    while (statusContainer.children.length > 5) {
        statusContainer.removeChild(statusContainer.lastChild!);
    }
}

// Helper function to generate a random password
function generateRandomPassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    try {
        // DOM Elements for new tabbed interface
        const serialNumberInput = document.getElementById('serialNumber');
        const upnInput = document.getElementById('upn');
        const displayNameInput = document.getElementById('displayName');
        const provisionIntuneBtn = document.getElementById('provisionIntuneBtn');
        const createResourceAccountBtn = document.querySelector('.submit-btn');
        const quitButton = document.getElementById('quitButton');
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        const deviceDescription = document.getElementById('description');
        const deviceSetupSection = document.getElementById('deviceSetupSection');
        const resetBtn = document.getElementById('resetBtn');
        const startButtons = document.querySelectorAll('.start-btn');
        const checkSerialBtn = document.getElementById('checkSerialBtn');
        const provisionSerialNumberInput = document.getElementById('provisionSerialNumber');

        // Create a container for status messages if needed
        let statusContainer = document.querySelector('.status-container');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.className = 'status-container';
            document.querySelector('main')?.appendChild(statusContainer);
        }

        // Check if essential elements exist
        if (!serialNumberInput || !upnInput || !provisionIntuneBtn) {
            console.error('Required DOM elements not found');
            return;
        }

        // Tab navigation setup
        if (tabButtons && tabContents) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remove active class from all buttons and contents
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    // Get the tab to activate
                    const tabId = button.getAttribute('data-tab');
                    if (tabId) {
                        const tabContent = document.getElementById(tabId);
                        if (tabContent) {
                            tabContent.classList.add('active');
                        }
                    }
                });
            });
        }

        // Setup welcome tab buttons
        if (startButtons) {
            startButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabToGo = button.getAttribute('data-goto');
                    if (tabToGo) {
                        // Find and click the corresponding tab button
                        const targetTab = document.querySelector(`.tab-btn[data-tab="${tabToGo}"]`);
                        if (targetTab) {
                            (targetTab as HTMLElement).click();
                        }
                    }
                });
            });
        }

        // Serial number validation
        if (serialNumberInput) {
            serialNumberInput.addEventListener('input', (event) => {
                const input = event.target as HTMLInputElement;
                const value = input.value;
                const validationElement = document.getElementById('serialValidation');
                
                // Enable or disable the check button based on validation
                if (checkSerialBtn) {
                    const isValid = value.length === 12 && value.endsWith('2');
                    (checkSerialBtn as HTMLButtonElement).disabled = !isValid;
                }
                
                if (value.length < 12) {
                    if (validationElement) {
                        validationElement.textContent = `Serial number too short: ${value.length}/12 characters`;
                        validationElement.className = 'validation-message error';
                    }
                    if (deviceSetupSection) {
                        deviceSetupSection.classList.add('hidden');
                    }
                } else if (value.length > 12) {
                    if (validationElement) {
                        validationElement.textContent = `Serial number too long: ${value.length}/12 characters`;
                        validationElement.className = 'validation-message error';
                    }
                    if (deviceSetupSection) {
                        deviceSetupSection.classList.add('hidden');
                    }
                } else if (!value.endsWith('2')) {
                    if (validationElement) {
                        validationElement.textContent = 'Serial number must end with "2"';
                        validationElement.className = 'validation-message error';
                    }
                    if (deviceSetupSection) {
                        deviceSetupSection.classList.add('hidden');
                    }
                } else {
                    if (validationElement) {
                        validationElement.textContent = 'Valid serial number format. Press Check to verify if the device is already provisioned in Intune.';
                        validationElement.className = 'validation-message success';
                    }
                }
            });

            // Remove the blur event and handle serial check with the button click
            if (checkSerialBtn) {
                checkSerialBtn.addEventListener('click', async () => {
                    const serialNumber = (serialNumberInput as HTMLInputElement).value;
                    if (!serialNumber || serialNumber.length !== 12 || !serialNumber.endsWith('2')) return;
                    
                    console.log('Check button clicked for serial:', serialNumber);
                    showLoader();
                    const validationElement = document.getElementById('serialValidation');
                    
                    try {
                        console.log('Sending check-intune-device request...');
                        // Check if device exists in Intune
                        const result = await ipcRenderer.invoke('check-intune-device', serialNumber);
                        console.log('Received check-intune-device response:', result);
                        hideLoader();
                        
                        if (result && result.success) {
                            if (result.exists) {
                                // Show a message that the device already exists
                                console.log('Device exists in Intune:', result.device);
                                if (validationElement) {
                                    validationElement.textContent = `Device ${serialNumber} is already provisioned in Intune with description: ${result.device.description}`;
                                    validationElement.className = 'validation-message success';
                                }
                                showToast(`Device ${serialNumber} is already provisioned in Intune`, false);
                                
                                // Don't show device setup section if already provisioned
                                if (deviceSetupSection) {
                                    deviceSetupSection.classList.add('hidden');
                                }
                            } else {
                                // Device is valid but not registered yet
                                console.log('Device not registered in Intune');
                                if (validationElement) {
                                    validationElement.textContent = 'Device not registered. Please provide a description to register it.';
                                    validationElement.className = 'validation-message success';
                                }
                                
                                // Show the device setup section
                                if (deviceSetupSection) {
                                    deviceSetupSection.classList.remove('hidden');
                                    
                                    // Set the serial number in the provision section
                                    if (provisionSerialNumberInput) {
                                        (provisionSerialNumberInput as HTMLInputElement).value = serialNumber;
                                    }
                                    
                                    // Set focus on description field
                                    if (deviceDescription) {
                                        (deviceDescription as HTMLInputElement).focus();
                                    }
                                }
                            }
                        } else {
                            console.error('Error result from check-intune-device:', result);
                            if (validationElement) {
                                validationElement.textContent = result?.error || 'Error checking device status. Please try again.';
                                validationElement.className = 'validation-message error';
                            }
                            showToast(result?.error || 'Error checking device status', true);
                        }
                    } catch (error) {
                        console.error('Exception checking Intune device:', error);
                        hideLoader();
                        if (validationElement) {
                            validationElement.textContent = 'Error checking device. Please try again or contact support.';
                            validationElement.className = 'validation-message error';
                        }
                        showToast(`Error checking device: ${error instanceof Error ? error.message : String(error)}`, true);
                    }
                });
            }
        }

        // Setup Intune provisioning button
        if (provisionIntuneBtn && serialNumberInput && deviceDescription) {
            provisionIntuneBtn.addEventListener('click', async () => {
                const serialNumber = (serialNumberInput as HTMLInputElement).value;
                const description = (deviceDescription as HTMLInputElement).value;
                
                if (!serialNumber || !description) {
                    showToast('Please fill in all required fields', true);
                    return;
                }

                showLoader();
                
                try {
                    // First check if device already exists
                    const checkResult = await ipcRenderer.invoke('check-intune-device', serialNumber);
                    
                    // If device exists and is valid, show message and don't try to provision again
                    if (checkResult.success && checkResult.exists) {
                        hideLoader();
                        showToast(`Device ${serialNumber} is already provisioned in Intune`, false);
                        
                        // Update results with existing device info
                        showResults({
                            success: true,
                            device: checkResult.device,
                            user: null,
                            groups: [],
                            errors: []
                        });
                        return;
                    }
                    
                    // Change loader text for provisioning
                    const loaderText = document.getElementById('loaderText');
                    if (loaderText) loaderText.textContent = 'Provisioning device in Intune...';
                    
                    // Proceed with provisioning if device doesn't exist
                    const result = await ipcRenderer.invoke('provision-intune', {
                        serialNumber,
                        description
                    });
                    
                    hideLoader();
                    
                    if (result.success) {
                        showToast(`Device ${serialNumber} successfully registered in Intune`, false);
                        showResults({
                            success: true,
                            device: result.device,
                            user: null,
                            groups: [],
                            errors: []
                        });
                    } else {
                        showToast(result.error || 'Failed to provision device', true);
                    }
                } catch (error) {
                    hideLoader();
                    showToast('Error provisioning device: ' + (error instanceof Error ? error.message : String(error)), true);
                }
            });
        }

        // Setup Resource Account creation
        if (createResourceAccountBtn && upnInput && displayNameInput) {
            createResourceAccountBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                
                const upn = (upnInput as HTMLInputElement).value;
                const displayName = (displayNameInput as HTMLInputElement).value;
                
                if (!upn || !displayName) {
                    showToast('Please fill in all required fields', true);
                    return;
                }

                showLoader();
                
                // Set appropriate loader text
                const loaderText = document.getElementById('loaderText');
                if (loaderText) loaderText.textContent = 'Creating resource account...';
                
                try {
                    const password = generateRandomPassword();
                    const result = await ipcRenderer.invoke('create-resource-account', {
                        upn,
                        displayName,
                        password
                    });
                    
                    hideLoader();
                    
                    if (result.success) {
                        showResults({
                            success: true,
                            device: null,
                            user: result.user,
                            groups: result.groups || [],
                            errors: []
                        });
                    } else {
                        showToast(result.error || 'Failed to create resource account', true);
                    }
                } catch (error) {
                    hideLoader();
                    showToast('Error creating resource account: ' + error, true);
                }
            });
        }

        // Reset button functionality
        if (resetBtn) {
            resetBtn.addEventListener('click', resetForm);
        }

        // Quit button functionality
        if (quitButton) {
            quitButton.addEventListener('click', () => {
                ipcRenderer.invoke('quit-app');
            });
        }

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

function showLoader() {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loaderText');
    if (loader) loader.classList.remove('hidden');
    if (loaderText) loaderText.textContent = 'Checking device...';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
}

function showToast(message: string, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastMessage) {
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

function showResults(results: SetupResults) {
    const resultsSection = document.getElementById('results');
    const deviceStatus = document.getElementById('deviceStatus');
    const userStatus = document.getElementById('userStatus');
    const groupStatus = document.getElementById('groupStatus');
    
    if (!resultsSection || !deviceStatus || !userStatus || !groupStatus) return;
    
    // Show results section
    resultsSection.classList.remove('hidden');
    
    // Update device status
    if (results.device) {
        deviceStatus.textContent = JSON.stringify(results.device, null, 2);
    } else {
        deviceStatus.textContent = 'No device information';
    }
    
    // Update user status
    if (results.user) {
        userStatus.textContent = JSON.stringify(results.user, null, 2);
    } else {
        userStatus.textContent = 'No user information';
    }
    
    // Update group status
    if (results.groups && results.groups.length > 0) {
        groupStatus.textContent = results.groups.join('\n');
    } else {
        groupStatus.textContent = 'No group memberships';
    }
}

function resetForm() {
    // Reset form values
    const serialNumberInput = document.getElementById('serialNumber') as HTMLInputElement;
    const upnInput = document.getElementById('upn') as HTMLInputElement;
    const displayNameInput = document.getElementById('displayName') as HTMLInputElement;
    const descriptionInput = document.getElementById('description') as HTMLInputElement;
    const checkSerialBtn = document.getElementById('checkSerialBtn') as HTMLButtonElement;
    const provisionSerialNumberInput = document.getElementById('provisionSerialNumber') as HTMLInputElement;
    
    if (serialNumberInput) serialNumberInput.value = '';
    if (upnInput) upnInput.value = '';
    if (displayNameInput) displayNameInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (provisionSerialNumberInput) provisionSerialNumberInput.value = '';
    if (checkSerialBtn) checkSerialBtn.disabled = true;
    
    // Hide results section
    const resultsSection = document.getElementById('results');
    if (resultsSection) resultsSection.classList.add('hidden');
    
    // Hide device setup section
    const deviceSetupSection = document.getElementById('deviceSetupSection');
    if (deviceSetupSection) deviceSetupSection.classList.add('hidden');
    
    // Reset validation messages
    const validationElement = document.getElementById('serialValidation');
    if (validationElement) {
        validationElement.textContent = '';
        validationElement.className = 'validation-message';
    }
    
    // Go back to welcome tab
    const welcomeTab = document.querySelector('.tab-btn[data-tab="welcome"]');
    if (welcomeTab) {
        (welcomeTab as HTMLElement).click();
    }
}

interface SetupResults {
    success: boolean;
    device: any;
    user: any;
    groups: string[];
    errors: string[];
    error?: string;
} 