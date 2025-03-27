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
        const quitButton = document.getElementById('quitButton');
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        const deviceDescription = document.getElementById('description');
        const deviceSetupSection = document.getElementById('deviceSetupSection');
        const resetBtn = document.getElementById('resetBtn');
        const startButtons = document.querySelectorAll('.start-btn');
        const checkSerialBtn = document.getElementById('checkSerialBtn');
        const provisionSerialNumberInput = document.getElementById('provisionSerialNumber');
        // New elements for resource account tab
        const checkUpnBtn = document.getElementById('checkUpnBtn');
        const upnValidation = document.getElementById('upnValidation');
        const resetAccountBtn = document.getElementById('resetAccountBtn');

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
                        
                        // Show permanent success message
                        const permanentSuccessMessage = document.getElementById('permanentSuccessMessage');
                        if (permanentSuccessMessage) {
                            permanentSuccessMessage.textContent = `Device ${serialNumber} is already provisioned in Intune`;
                            permanentSuccessMessage.classList.remove('hidden');
                        }
                        
                        // Show reset button
                        const resetBtn = document.getElementById('resetBtn');
                        if (resetBtn) {
                            resetBtn.classList.remove('hidden');
                        }
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
                        
                        // Show permanent success message
                        const permanentSuccessMessage = document.getElementById('permanentSuccessMessage');
                        if (permanentSuccessMessage) {
                            permanentSuccessMessage.textContent = `Device ${serialNumber} successfully registered in Intune`;
                            permanentSuccessMessage.classList.remove('hidden');
                        }
                        
                        // Show reset button
                        const resetBtn = document.getElementById('resetBtn');
                        if (resetBtn) {
                            resetBtn.classList.remove('hidden');
                        }
                    } else {
                        showToast(result.error || 'Failed to provision device', true);
                    }
                } catch (error) {
                    hideLoader();
                    showToast('Error provisioning device: ' + (error instanceof Error ? error.message : String(error)), true);
                }
            });
        }

        // UPN input validation
        if (upnInput) {
            upnInput.addEventListener('input', (event) => {
                const input = event.target as HTMLInputElement;
                const value = input.value.trim();
                
                // Enable or disable the check button based on validation
                if (checkUpnBtn) {
                    const isValid = value.includes('@') && value.length > 5;
                    (checkUpnBtn as HTMLButtonElement).disabled = !isValid;
                }
                
                // Clear previous validation message
                if (upnValidation) {
                    upnValidation.textContent = '';
                    upnValidation.className = 'validation-message';
                }
            });
        }

        // Setup Resource Account checking
        if (checkUpnBtn && upnInput && upnValidation) {
            checkUpnBtn.addEventListener('click', async () => {
                const upn = (upnInput as HTMLInputElement).value.trim();
                
                if (!upn) {
                    if (upnValidation) {
                        upnValidation.textContent = 'Please enter a UPN';
                        upnValidation.className = 'validation-message error';
                    }
                    return;
                }
                
                // Validate UPN format
                if (!upn.includes('@')) {
                    if (upnValidation) {
                        upnValidation.textContent = 'UPN must include @ symbol';
                        upnValidation.className = 'validation-message error';
                    }
                    return;
                }
                
                // Extract domain info for better messaging
                const [username, domain] = upn.split('@');
                const domainParts = domain.split('.');
                const orgName = domainParts[0]; // e.g., "testeuc" from "testeuc.no"
                const onmicrosoftDomain = `${orgName}.onmicrosoft.com`;
                
                showLoader();
                const loaderText = document.getElementById('loaderText');
                if (loaderText) loaderText.textContent = 'Checking resource account...';
                
                try {
                    const result = await ipcRenderer.invoke('check-resource-account', upn);
                    
                    hideLoader();
                    
                    if (result.success) {
                        if (result.exists) {
                            // Account exists
                            if (upnValidation) {
                                const domainType = result.domain === 'original' ? domain : onmicrosoftDomain;
                                if (result.domain === 'original') {
                                    // Account exists with the exact domain that was entered
                                    upnValidation.textContent = `Resource account found with domain: ${domain}`;
                                } else {
                                    // Account exists but with a different domain (.onmicrosoft.com)
                                    upnValidation.textContent = `Resource account found with domain: ${onmicrosoftDomain} (use this domain instead)`;
                                }
                                upnValidation.className = 'validation-message success';
                            }
                        } else {
                            // Account does not exist in either domain
                            if (upnValidation) {
                                upnValidation.textContent = `No resource account found with either ${domain} or ${onmicrosoftDomain} domains.`;
                                upnValidation.className = 'validation-message error';
                            }
                        }
                    } else {
                        // Error checking account
                        if (upnValidation) {
                            upnValidation.textContent = result.error || 'Error checking account';
                            upnValidation.className = 'validation-message error';
                        }
                    }
                } catch (error) {
                    hideLoader();
                    
                    if (upnValidation) {
                        upnValidation.textContent = 'Error checking account: ' + (error as Error).message;
                        upnValidation.className = 'validation-message error';
                    }
                }
            });
        }
        
        // Reset button functionality
        if (resetBtn) {
            resetBtn.addEventListener('click', resetForm);
        }
        
        // Reset account button functionality
        if (resetAccountBtn) {
            resetAccountBtn.addEventListener('click', resetAccountForm);
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

function resetForm() {
    // Reset form values
    const serialNumberInput = document.getElementById('serialNumber') as HTMLInputElement;
    const upnInput = document.getElementById('upn') as HTMLInputElement;
    const displayNameInput = document.getElementById('displayName') as HTMLInputElement;
    const descriptionInput = document.getElementById('description') as HTMLInputElement;
    const checkSerialBtn = document.getElementById('checkSerialBtn') as HTMLButtonElement;
    const provisionSerialNumberInput = document.getElementById('provisionSerialNumber') as HTMLInputElement;
    const permanentSuccessMessage = document.getElementById('permanentSuccessMessage');
    const resetBtn = document.getElementById('resetBtn');
    
    if (serialNumberInput) serialNumberInput.value = '';
    if (upnInput) upnInput.value = '';
    if (displayNameInput) displayNameInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (provisionSerialNumberInput) provisionSerialNumberInput.value = '';
    if (checkSerialBtn) checkSerialBtn.disabled = true;
    if (permanentSuccessMessage) permanentSuccessMessage.classList.add('hidden');
    if (resetBtn) resetBtn.classList.add('hidden');
    
    // Hide device setup section
    const deviceSetupSection = document.getElementById('deviceSetupSection');
    if (deviceSetupSection) deviceSetupSection.classList.add('hidden');
    
    // Reset validation messages
    const validationElement = document.getElementById('serialValidation');
    if (validationElement) {
        validationElement.textContent = '';
        validationElement.className = 'validation-message';
    }
    
    // Focus on serial number input instead of going back to welcome tab
    if (serialNumberInput) {
        serialNumberInput.focus();
    }
}

function resetAccountForm() {
    // Reset UPN input
    const upnInput = document.getElementById('upn') as HTMLInputElement;
    if (upnInput) {
        upnInput.value = '';
        upnInput.disabled = false;
    }
    
    // Reset validation message
    const upnValidation = document.getElementById('upnValidation');
    if (upnValidation) {
        upnValidation.textContent = '';
        upnValidation.className = 'validation-message';
    }
    
    // Re-enable check button (but disabled since no input)
    const checkUpnBtn = document.getElementById('checkUpnBtn') as HTMLButtonElement;
    if (checkUpnBtn) {
        checkUpnBtn.disabled = true;
    }
} 