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
        // New elements for account update
        const accountUpdateSection = document.getElementById('accountUpdateSection');
        const updateDisplayName = document.getElementById('updateDisplayName');
        const updateAccountBtn = document.getElementById('updateAccountBtn');
        const updateSuccessMessage = document.getElementById('updateSuccessMessage');
        // Elements for password status
        const accountPasswordSection = document.getElementById('accountPasswordSection');
        const passwordStatusIndicator = document.getElementById('passwordStatusIndicator');
        const passwordStatusText = document.getElementById('passwordStatusText');
        const resetPasswordBtn = document.getElementById('resetPasswordBtn');
        const passwordSuccessMessage = document.getElementById('passwordSuccessMessage');
        // Elements for license management placeholder
        const licensesSection = document.getElementById('licensesSection');
        // Elements for account status placeholder
        const accountStatusSection = document.getElementById('accountStatusSection');

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
                
                // Hide update section when input changes
                if (accountUpdateSection) {
                    accountUpdateSection.classList.add('hidden');
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
                                    upnValidation.textContent = `Resource account found, edit it below.`;
                                    
                                    // Store the found UPN for update operations
                                    if (upnInput) {
                                        (upnInput as HTMLInputElement).dataset.foundUpn = upn;
                                    }
                                    
                                    // Show account update section
                                    if (accountUpdateSection) {
                                        accountUpdateSection.classList.remove('hidden');
                                        // Set current display name as placeholder if available
                                        if (updateDisplayName && result.account && result.account.displayName) {
                                            (updateDisplayName as HTMLInputElement).placeholder = `Current: ${result.account.displayName}`;
                                        }
                                    }
                                    
                                    // Show password status section
                                    if (accountPasswordSection) {
                                        accountPasswordSection.classList.remove('hidden');
                                        // Verify password status
                                        verifyPasswordStatus(upn);
                                    }
                                    
                                    // Show license management placeholder
                                    if (licensesSection) {
                                        licensesSection.classList.remove('hidden');
                                    }
                                    
                                    // Check and update account status indicators
                                    checkAccountStatus(upn);
                                    
                                    // Show account status placeholder
                                    if (accountStatusSection) {
                                        accountStatusSection.classList.remove('hidden');
                                    }
                                } else {
                                    // Account exists but with a different domain (.onmicrosoft.com)
                                    const correctUpn = `${username}@${onmicrosoftDomain}`;
                                    upnValidation.textContent = `Resource account found with domain: ${onmicrosoftDomain}. Please use ${correctUpn} to update it.`;
                                    upnValidation.className = 'validation-message warning';
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

        // Setup Update Account functionality
        if (updateAccountBtn && upnInput && updateDisplayName && updateSuccessMessage) {
            updateAccountBtn.addEventListener('click', async () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                const newDisplayName = (updateDisplayName as HTMLInputElement).value.trim();
                
                if (!upn || !newDisplayName) {
                    showToast('Please enter a new display name', true);
                    return;
                }
                
                showLoader();
                const loaderText = document.getElementById('loaderText');
                if (loaderText) loaderText.textContent = 'Updating resource account...';
                
                try {
                    const result = await ipcRenderer.invoke('update-resource-account', {
                        upn,
                        displayName: newDisplayName
                    });
                    
                    hideLoader();
                    
                    if (result.success) {
                        // Show success message
                        updateSuccessMessage.textContent = `Display name updated to: ${newDisplayName}`;
                        updateSuccessMessage.classList.remove('hidden');
                        showToast('Resource account updated successfully', false);
                    } else {
                        showToast(result.error || 'Failed to update resource account', true);
                    }
                } catch (error) {
                    hideLoader();
                    showToast('Error updating resource account: ' + (error as Error).message, true);
                }
            });
        }

        // Setup Password Reset functionality
        if (resetPasswordBtn && upnInput && passwordSuccessMessage) {
            resetPasswordBtn.addEventListener('click', async () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                
                showLoader();
                const loaderText = document.getElementById('loaderText');
                if (loaderText) loaderText.textContent = 'Resetting account password...';
                
                try {
                    const result = await ipcRenderer.invoke('reset-account-password', upn);
                    
                    hideLoader();
                    
                    if (result.success) {
                        // Show success message
                        if (passwordSuccessMessage) {
                            passwordSuccessMessage.textContent = "Password reset to generic password successfully";
                            passwordSuccessMessage.classList.remove('hidden');
                        }
                        showToast('Password reset successful', false);
                        
                        // Update password status indicator
                        if (passwordStatusIndicator && passwordStatusText) {
                            passwordStatusIndicator.className = 'indicator success';
                            passwordStatusText.textContent = "Password set to generic password";
                        }
                    } else {
                        showToast(result.error || 'Failed to reset password', true);
                    }
                } catch (error) {
                    hideLoader();
                    showToast('Error resetting password: ' + (error as Error).message, true);
                }
            });
        }

        // Setup Group Membership functionality
        // Add to MTR Group button (in License Management section)
        const addToMtrBtn = document.getElementById('addToMtrBtn');
        if (addToMtrBtn && upnInput) {
            addToMtrBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                addToMtrGroup(upn);
            });
        }
        
        // Remove from MTR Group button (in License Management section)
        const removeFromMtrBtn = document.getElementById('removeFromMtrBtn');
        if (removeFromMtrBtn && upnInput) {
            removeFromMtrBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                removeFromMtrGroup(upn);
            });
        }
        
        // Add to MTR Group button (in Account Status section)
        const addToMtrStatusBtn = document.getElementById('addToMtrStatusBtn');
        if (addToMtrStatusBtn && upnInput) {
            addToMtrStatusBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                addToMtrGroup(upn);
                // This will also update the status in the account section
            });
        }
        
        // Remove from MTR Group button (in Account Status section)
        const removeFromMtrStatusBtn = document.getElementById('removeFromMtrStatusBtn');
        if (removeFromMtrStatusBtn && upnInput) {
            removeFromMtrStatusBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                removeFromMtrGroup(upn);
                // This will also update the status in the account section
            });
        }
        
        // Add to Room Group button
        const addToRoomBtn = document.getElementById('addToRoomBtn');
        if (addToRoomBtn && upnInput) {
            addToRoomBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                addToRoomGroup(upn);
            });
        }
        
        // Remove from Room Group button
        const removeFromRoomBtn = document.getElementById('removeFromRoomBtn');
        if (removeFromRoomBtn && upnInput) {
            removeFromRoomBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                removeFromRoomGroup(upn);
            });
        }

        // Add to Pro Group button
        const addToProBtn = document.getElementById('addToProBtn');
        if (addToProBtn && upnInput) {
            addToProBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                addToProGroup(upn);
            });
        }
        
        // Remove from Pro Group button
        const removeFromProBtn = document.getElementById('removeFromProBtn');
        if (removeFromProBtn && upnInput) {
            removeFromProBtn.addEventListener('click', () => {
                const upn = (upnInput as HTMLInputElement).dataset.foundUpn || (upnInput as HTMLInputElement).value.trim();
                if (!upn) {
                    showToast('Resource account not found', true);
                    return;
                }
                removeFromProGroup(upn);
            });
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
        // Clear stored UPN
        upnInput.dataset.foundUpn = '';
    }
    
    // Reset validation message
    const upnValidation = document.getElementById('upnValidation');
    if (upnValidation) {
        upnValidation.textContent = '';
        upnValidation.className = 'validation-message';
    }
    
    // Hide update section
    const accountUpdateSection = document.getElementById('accountUpdateSection');
    if (accountUpdateSection) {
        accountUpdateSection.classList.add('hidden');
    }
    
    // Reset update display name input
    const updateDisplayName = document.getElementById('updateDisplayName') as HTMLInputElement;
    if (updateDisplayName) {
        updateDisplayName.value = '';
        updateDisplayName.placeholder = 'Enter new display name';
    }
    
    // Hide success message
    const updateSuccessMessage = document.getElementById('updateSuccessMessage');
    if (updateSuccessMessage) {
        updateSuccessMessage.classList.add('hidden');
    }
    
    // Hide password section
    const accountPasswordSection = document.getElementById('accountPasswordSection');
    if (accountPasswordSection) {
        accountPasswordSection.classList.add('hidden');
    }
    
    // Reset password status
    const passwordStatusIndicator = document.getElementById('passwordStatusIndicator');
    const passwordStatusText = document.getElementById('passwordStatusText');
    if (passwordStatusIndicator && passwordStatusText) {
        passwordStatusIndicator.className = 'indicator';
        passwordStatusText.textContent = 'Not verified';
    }
    
    // Hide password success message
    const passwordSuccessMessage = document.getElementById('passwordSuccessMessage');
    if (passwordSuccessMessage) {
        passwordSuccessMessage.classList.add('hidden');
    }
    
    // Hide license section
    const licensesSection = document.getElementById('licensesSection');
    if (licensesSection) {
        licensesSection.classList.add('hidden');
    }
    
    // Hide account status section
    const accountStatusSection = document.getElementById('accountStatusSection');
    if (accountStatusSection) {
        accountStatusSection.classList.add('hidden');
    }
    
    // Re-enable check button (but disabled since no input)
    const checkUpnBtn = document.getElementById('checkUpnBtn') as HTMLButtonElement;
    if (checkUpnBtn) {
        checkUpnBtn.disabled = true;
    }
}

// Function to verify password status
async function verifyPasswordStatus(upn: string) {
    const passwordStatusIndicator = document.getElementById('passwordStatusIndicator');
    const passwordStatusText = document.getElementById('passwordStatusText');
    
    if (!passwordStatusIndicator || !passwordStatusText) return;
    
    try {
        // Set to loading state
        passwordStatusIndicator.className = 'indicator';
        passwordStatusText.textContent = 'Verifying password...';
        
        const result = await ipcRenderer.invoke('verify-account-password', upn);
        
        if (result.success) {
            if (result.isValid) {
                passwordStatusIndicator.className = 'indicator success';
                passwordStatusText.textContent = result.message;
            } else {
                passwordStatusIndicator.className = 'indicator error';
                passwordStatusText.textContent = result.message;
                // Only show toast for error
                showToast('Password verification failed', true);
            }
        } else {
            passwordStatusIndicator.className = 'indicator error';
            passwordStatusText.textContent = result.error || 'Failed to verify password';
            showToast(result.error || 'Failed to verify password', true);
        }
    } catch (error) {
        passwordStatusIndicator.className = 'indicator error';
        passwordStatusText.textContent = 'Error: ' + (error as Error).message;
        showToast('Failed to verify password status: ' + (error as Error).message, true);
    }
}

async function resetPassword(upn: string) {
    const resetPasswordBtn = document.getElementById('resetPasswordBtn') as HTMLButtonElement;
    const passwordSuccessMessage = document.getElementById('passwordSuccessMessage');
    
    if (!resetPasswordBtn || !passwordSuccessMessage) return;
    
    try {
        // Disable button and show loading state
        resetPasswordBtn.disabled = true;
        resetPasswordBtn.textContent = 'Resetting...';
        
        const result = await ipcRenderer.invoke('reset-account-password', upn);
        
        // Reset button state
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.textContent = 'Reset to Generic Password';
        
        if (result.success) {
            // Show success message
            passwordSuccessMessage.textContent = 'Password has been reset to the generic password';
            passwordSuccessMessage.classList.remove('hidden');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                passwordSuccessMessage.classList.add('hidden');
            }, 5000);
            
            // Verify password status again to update the indicator
            verifyPasswordStatus(upn);
            
            showToast('Password reset successfully', false);
        } else {
            showToast(result.error || 'Failed to reset password', true);
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        
        // Reset button state
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.textContent = 'Reset to Generic Password';
        
        showToast(`Failed to reset password: ${(error as Error).message}`, true);
    }
}

// Function to check and update account status indicators
async function checkAccountStatus(upn: string) {
    // Check account unlock status
    await checkAccountUnlockStatus(upn);
    
    // Check group memberships
    await checkGroupMemberships(upn);
}

// Function to check if account is unlocked
async function checkAccountUnlockStatus(upn: string) {
    const accountLockedIndicator = document.getElementById('accountLockedIndicator');
    
    if (!accountLockedIndicator) return;
    
    try {
        // Set to loading state
        accountLockedIndicator.className = 'indicator small';
        
        const result = await ipcRenderer.invoke('check-account-unlock', upn);
        
        if (result.success) {
            if (result.isUnlocked) {
                accountLockedIndicator.className = 'indicator small success';
            } else {
                accountLockedIndicator.className = 'indicator small error';
            }
        } else {
            accountLockedIndicator.className = 'indicator small error';
            showToast(result.error || 'Failed to check account unlock status', true);
        }
    } catch (error) {
        accountLockedIndicator.className = 'indicator small error';
        showToast('Error checking account unlock status: ' + (error as Error).message, true);
    }
}

// Function to check and update all group memberships
async function checkGroupMemberships(upn: string) {
    // Check MTR group membership
    await checkMtrGroupMembership(upn);
    
    // Check Room group membership
    await checkRoomGroupMembership(upn);
    
    // Check Pro license group membership
    await checkProGroupMembership(upn);
}

// Function to check MTR group membership
async function checkMtrGroupMembership(upn: string) {
    const mtrGroupIndicator = document.getElementById('mtrGroupIndicator');
    const addToMtrBtn = document.getElementById('addToMtrBtn') as HTMLButtonElement;
    const removeFromMtrBtn = document.getElementById('removeFromMtrBtn') as HTMLButtonElement;
    
    // Status section indicators
    const resourceGroupIndicator = document.getElementById('resourceGroupIndicator');
    const addToMtrStatusBtn = document.getElementById('addToMtrStatusBtn') as HTMLButtonElement;
    const removeFromMtrStatusBtn = document.getElementById('removeFromMtrStatusBtn') as HTMLButtonElement;
    
    if (!mtrGroupIndicator || !addToMtrBtn || !removeFromMtrBtn) return;
    
    try {
        // Set to loading state
        mtrGroupIndicator.className = 'indicator small';
        addToMtrBtn.disabled = true;
        removeFromMtrBtn.disabled = true;
        
        // Also set status section to loading if available
        if (resourceGroupIndicator) {
            resourceGroupIndicator.className = 'indicator small';
        }
        
        if (addToMtrStatusBtn) {
            addToMtrStatusBtn.disabled = true;
        }
        
        if (removeFromMtrStatusBtn) {
            removeFromMtrStatusBtn.disabled = true;
        }
        
        const result = await ipcRenderer.invoke('check-group-membership', upn);
        
        if (result.success) {
            if (result.isMember) {
                // Update license section indicators
                mtrGroupIndicator.className = 'indicator small success';
                addToMtrBtn.disabled = true;
                removeFromMtrBtn.disabled = false;
                
                // Update status section indicators if available
                if (resourceGroupIndicator) {
                    resourceGroupIndicator.className = 'indicator small success';
                }
                
                if (addToMtrStatusBtn) {
                    addToMtrStatusBtn.disabled = true;
                }
                
                if (removeFromMtrStatusBtn) {
                    removeFromMtrStatusBtn.disabled = false;
                }
            } else {
                // Update license section indicators
                mtrGroupIndicator.className = 'indicator small error';
                addToMtrBtn.disabled = false;
                removeFromMtrBtn.disabled = true;
                
                // Update status section indicators if available
                if (resourceGroupIndicator) {
                    resourceGroupIndicator.className = 'indicator small error';
                }
                
                if (addToMtrStatusBtn) {
                    addToMtrStatusBtn.disabled = false;
                }
                
                if (removeFromMtrStatusBtn) {
                    removeFromMtrStatusBtn.disabled = true;
                }
            }
        } else {
            // Update license section indicators
            mtrGroupIndicator.className = 'indicator small error';
            addToMtrBtn.disabled = true;
            removeFromMtrBtn.disabled = true;
            
            // Update status section indicators if available
            if (resourceGroupIndicator) {
                resourceGroupIndicator.className = 'indicator small error';
            }
            
            if (addToMtrStatusBtn) {
                addToMtrStatusBtn.disabled = true;
            }
            
            if (removeFromMtrStatusBtn) {
                removeFromMtrStatusBtn.disabled = true;
            }
            
            showToast(result.error || 'Failed to check MTR group membership', true);
        }
    } catch (error) {
        // Update license section indicators
        mtrGroupIndicator.className = 'indicator small error';
        addToMtrBtn.disabled = true;
        removeFromMtrBtn.disabled = true;
        
        // Update status section indicators if available
        if (resourceGroupIndicator) {
            resourceGroupIndicator.className = 'indicator small error';
        }
        
        if (addToMtrStatusBtn) {
            addToMtrStatusBtn.disabled = true;
        }
        
        if (removeFromMtrStatusBtn) {
            removeFromMtrStatusBtn.disabled = true;
        }
        
        showToast('Error checking MTR group membership: ' + (error as Error).message, true);
    }
}

// Function to check Room group membership
async function checkRoomGroupMembership(upn: string) {
    const roomGroupIndicator = document.getElementById('roomGroupIndicator');
    const addToRoomBtn = document.getElementById('addToRoomBtn') as HTMLButtonElement;
    const removeFromRoomBtn = document.getElementById('removeFromRoomBtn') as HTMLButtonElement;
    
    if (!roomGroupIndicator || !addToRoomBtn || !removeFromRoomBtn) return;
    
    try {
        // Set to loading state
        roomGroupIndicator.className = 'indicator small';
        addToRoomBtn.disabled = true;
        removeFromRoomBtn.disabled = true;
        
        const result = await ipcRenderer.invoke('check-room-membership', upn);
        
        if (result.success) {
            if (result.isMember) {
                roomGroupIndicator.className = 'indicator small success';
                addToRoomBtn.disabled = true;
                removeFromRoomBtn.disabled = false;
            } else {
                roomGroupIndicator.className = 'indicator small error';
                addToRoomBtn.disabled = false;
                removeFromRoomBtn.disabled = true;
            }
        } else {
            roomGroupIndicator.className = 'indicator small error';
            addToRoomBtn.disabled = true;
            removeFromRoomBtn.disabled = true;
            showToast(result.error || 'Failed to check Room group membership', true);
        }
    } catch (error) {
        roomGroupIndicator.className = 'indicator small error';
        addToRoomBtn.disabled = true;
        removeFromRoomBtn.disabled = true;
        showToast('Error checking Room group membership: ' + (error as Error).message, true);
    }
}

// Function to check Pro license group membership
async function checkProGroupMembership(upn: string) {
    const proGroupIndicator = document.getElementById('proGroupIndicator');
    const addToProBtn = document.getElementById('addToProBtn') as HTMLButtonElement;
    const removeFromProBtn = document.getElementById('removeFromProBtn') as HTMLButtonElement;
    
    if (!proGroupIndicator || !addToProBtn || !removeFromProBtn) return;
    
    try {
        // Set to loading state
        proGroupIndicator.className = 'indicator small';
        addToProBtn.disabled = true;
        removeFromProBtn.disabled = true;
        
        const result = await ipcRenderer.invoke('check-pro-membership', upn);
        
        if (result.success) {
            if (result.isMember) {
                proGroupIndicator.className = 'indicator small success';
                addToProBtn.disabled = true;
                removeFromProBtn.disabled = false;
            } else {
                proGroupIndicator.className = 'indicator small error';
                addToProBtn.disabled = false;
                removeFromProBtn.disabled = true;
            }
        } else {
            proGroupIndicator.className = 'indicator small error';
            addToProBtn.disabled = true;
            removeFromProBtn.disabled = true;
            showToast(result.error || 'Failed to check Pro license group membership', true);
        }
    } catch (error) {
        proGroupIndicator.className = 'indicator small error';
        addToProBtn.disabled = true;
        removeFromProBtn.disabled = true;
        showToast('Error checking Pro license group membership: ' + (error as Error).message, true);
    }
}

// Function to add user to MTR group
async function addToMtrGroup(upn: string) {
    const addToMtrBtn = document.getElementById('addToMtrBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!addToMtrBtn || !licenseSuccessMessage) return;
    
    try {
        // Disable button and show loading state
        addToMtrBtn.disabled = true;
        addToMtrBtn.textContent = 'Adding...';
        
        const result = await ipcRenderer.invoke('add-to-mtr-group', upn);
        
        // Reset button state
        addToMtrBtn.textContent = 'Add';
        
        if (result.success) {
            licenseSuccessMessage.textContent = result.message;
            licenseSuccessMessage.classList.remove('hidden');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                licenseSuccessMessage.classList.add('hidden');
            }, 5000);
            
            // Refresh membership status
            checkMtrGroupMembership(upn);
            
            showToast('Added to MTR Resource Accounts group', false);
        } else {
            addToMtrBtn.disabled = false;
            showToast(result.error || 'Failed to add to MTR group', true);
        }
    } catch (error) {
        addToMtrBtn.disabled = false;
        addToMtrBtn.textContent = 'Add';
        showToast('Error adding to MTR group: ' + (error as Error).message, true);
    }
}

// Function to remove user from MTR group
async function removeFromMtrGroup(upn: string) {
    const removeFromMtrBtn = document.getElementById('removeFromMtrBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!removeFromMtrBtn || !licenseSuccessMessage) return;
    
    try {
        // Disable button and show loading state
        removeFromMtrBtn.disabled = true;
        removeFromMtrBtn.textContent = 'Removing...';
        
        const result = await ipcRenderer.invoke('remove-from-mtr-group', upn);
        
        // Reset button state
        removeFromMtrBtn.textContent = 'Remove';
        
        if (result.success) {
            licenseSuccessMessage.textContent = result.message;
            licenseSuccessMessage.classList.remove('hidden');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                licenseSuccessMessage.classList.add('hidden');
            }, 5000);
            
            // Refresh membership status
            checkMtrGroupMembership(upn);
            
            showToast('Removed from MTR Resource Accounts group', false);
        } else {
            removeFromMtrBtn.disabled = false;
            showToast(result.error || 'Failed to remove from MTR group', true);
        }
    } catch (error) {
        removeFromMtrBtn.disabled = false;
        removeFromMtrBtn.textContent = 'Remove';
        showToast('Error removing from MTR group: ' + (error as Error).message, true);
    }
}

// Function to add user to Room group
async function addToRoomGroup(upn: string) {
    const addToRoomBtn = document.getElementById('addToRoomBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!addToRoomBtn || !licenseSuccessMessage) return;
    
    try {
        // Disable button and show loading state
        addToRoomBtn.disabled = true;
        addToRoomBtn.textContent = 'Adding...';
        
        const result = await ipcRenderer.invoke('add-to-room-group', upn);
        
        // Reset button state
        addToRoomBtn.textContent = 'Add';
        
        if (result.success) {
            licenseSuccessMessage.textContent = result.message;
            licenseSuccessMessage.classList.remove('hidden');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                licenseSuccessMessage.classList.add('hidden');
            }, 5000);
            
            // Refresh membership status
            checkRoomGroupMembership(upn);
            
            showToast('Added to Room Accounts group', false);
        } else {
            addToRoomBtn.disabled = false;
            showToast(result.error || 'Failed to add to Room group', true);
        }
    } catch (error) {
        addToRoomBtn.disabled = false;
        addToRoomBtn.textContent = 'Add';
        showToast('Error adding to Room group: ' + (error as Error).message, true);
    }
}

// Function to remove user from Room group
async function removeFromRoomGroup(upn: string) {
    const removeFromRoomBtn = document.getElementById('removeFromRoomBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!removeFromRoomBtn || !licenseSuccessMessage) return;
    
    try {
        // Disable button and show loading state
        removeFromRoomBtn.disabled = true;
        removeFromRoomBtn.textContent = 'Removing...';
        
        const result = await ipcRenderer.invoke('remove-from-room-group', upn);
        
        // Reset button state
        removeFromRoomBtn.textContent = 'Remove';
        
        if (result.success) {
            licenseSuccessMessage.textContent = result.message;
            licenseSuccessMessage.classList.remove('hidden');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                licenseSuccessMessage.classList.add('hidden');
            }, 5000);
            
            // Refresh membership status
            checkRoomGroupMembership(upn);
            
            showToast('Removed from Room Accounts group', false);
        } else {
            removeFromRoomBtn.disabled = false;
            showToast(result.error || 'Failed to remove from Room group', true);
        }
    } catch (error) {
        removeFromRoomBtn.disabled = false;
        removeFromRoomBtn.textContent = 'Remove';
        showToast('Error removing from Room group: ' + (error as Error).message, true);
    }
}

// Function to add user to Pro license group
async function addToProGroup(upn: string) {
    const addToProBtn = document.getElementById('addToProBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!addToProBtn || !licenseSuccessMessage) return;
    
    try {
        // Disable button and show loading state
        addToProBtn.disabled = true;
        addToProBtn.textContent = 'Adding...';
        
        const result = await ipcRenderer.invoke('add-to-pro-group', upn);
        
        // Reset button state
        addToProBtn.textContent = 'Add';
        
        if (result.success) {
            licenseSuccessMessage.textContent = result.message;
            licenseSuccessMessage.classList.remove('hidden');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                licenseSuccessMessage.classList.add('hidden');
            }, 5000);
            
            // Refresh membership status
            checkProGroupMembership(upn);
            
            showToast('Added to Teams Rooms Pro license group', false);
        } else {
            addToProBtn.disabled = false;
            showToast(result.error || 'Failed to add to Pro license group', true);
        }
    } catch (error) {
        addToProBtn.disabled = false;
        addToProBtn.textContent = 'Add';
        showToast('Error adding to Pro license group: ' + (error as Error).message, true);
    }
}

// Function to remove user from Pro license group
async function removeFromProGroup(upn: string) {
    const removeFromProBtn = document.getElementById('removeFromProBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!removeFromProBtn || !licenseSuccessMessage) return;
    
    try {
        // Disable button and show loading state
        removeFromProBtn.disabled = true;
        removeFromProBtn.textContent = 'Removing...';
        
        const result = await ipcRenderer.invoke('remove-from-pro-group', upn);
        
        // Reset button state
        removeFromProBtn.textContent = 'Remove';
        
        if (result.success) {
            licenseSuccessMessage.textContent = result.message;
            licenseSuccessMessage.classList.remove('hidden');
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                licenseSuccessMessage.classList.add('hidden');
            }, 5000);
            
            // Refresh membership status
            checkProGroupMembership(upn);
            
            showToast('Removed from Teams Rooms Pro license group', false);
        } else {
            removeFromProBtn.disabled = false;
            showToast(result.error || 'Failed to remove from Pro license group', true);
        }
    } catch (error) {
        removeFromProBtn.disabled = false;
        removeFromProBtn.textContent = 'Remove';
        showToast('Error removing from Pro license group: ' + (error as Error).message, true);
    }
} 