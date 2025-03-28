import { resetForm, checkSerialNumber, provisionDevice } from './deviceManagement.js';
import { resetAccountForm, checkResourceAccount, updateResourceAccount, resetPassword } from './accountManagement.js';
import { 
    addToMtrGroup, removeFromMtrGroup, 
    addToRoomGroup, removeFromRoomGroup, 
    addToProGroup, removeFromProGroup 
} from './groupManagement.js';

// Setup event handlers for device tab
export function setupDeviceHandlers(ipcRenderer: any) {
    // Serial number validation
    const serialNumberInput = document.getElementById('serialNumber') as HTMLInputElement;
    if (serialNumberInput) {
        serialNumberInput.addEventListener('input', (event) => {
            const input = event.target as HTMLInputElement;
            const value = input.value;
            const validationElement = document.getElementById('serialValidation');
            
            // Enable or disable the check button based on validation
            const checkSerialBtn = document.getElementById('checkSerialBtn') as HTMLButtonElement;
            if (checkSerialBtn) {
                const isValid = value.length === 12 && value.endsWith('2');
                checkSerialBtn.disabled = !isValid;
            }
            
            if (value.length < 12) {
                if (validationElement) {
                    validationElement.textContent = `Serial number too short: ${value.length}/12 characters`;
                    validationElement.className = 'validation-message error';
                }
                const deviceSetupSection = document.getElementById('deviceSetupSection');
                if (deviceSetupSection) {
                    deviceSetupSection.classList.add('hidden');
                }
            } else if (value.length > 12) {
                if (validationElement) {
                    validationElement.textContent = `Serial number too long: ${value.length}/12 characters`;
                    validationElement.className = 'validation-message error';
                }
                const deviceSetupSection = document.getElementById('deviceSetupSection');
                if (deviceSetupSection) {
                    deviceSetupSection.classList.add('hidden');
                }
            } else if (!value.endsWith('2')) {
                if (validationElement) {
                    validationElement.textContent = 'Serial number must end with "2"';
                    validationElement.className = 'validation-message error';
                }
                const deviceSetupSection = document.getElementById('deviceSetupSection');
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
    }

    // Check Serial button
    const checkSerialBtn = document.getElementById('checkSerialBtn');
    if (checkSerialBtn) {
        checkSerialBtn.addEventListener('click', async () => {
            const serialNumber = (serialNumberInput as HTMLInputElement).value;
            await checkSerialNumber(serialNumber, ipcRenderer);
        });
    }

    // Provision button
    const provisionIntuneBtn = document.getElementById('provisionIntuneBtn');
    if (provisionIntuneBtn) {
        provisionIntuneBtn.addEventListener('click', async () => {
            const serialNumber = (serialNumberInput as HTMLInputElement).value;
            const deviceDescription = document.getElementById('description') as HTMLInputElement;
            const description = deviceDescription ? deviceDescription.value : '';
            
            await provisionDevice(serialNumber, description, ipcRenderer);
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }
}

// Setup event handlers for account tab
export function setupAccountHandlers(ipcRenderer: any) {
    // UPN input validation
    const upnInput = document.getElementById('upn') as HTMLInputElement;
    if (upnInput) {
        upnInput.addEventListener('input', (event) => {
            const input = event.target as HTMLInputElement;
            const value = input.value.trim();
            
            // Enable or disable the check button based on validation
            const checkUpnBtn = document.getElementById('checkUpnBtn') as HTMLButtonElement;
            if (checkUpnBtn) {
                const isValid = value.includes('@') && value.length > 5;
                checkUpnBtn.disabled = !isValid;
            }
            
            // Clear previous validation message
            const upnValidation = document.getElementById('upnValidation');
            if (upnValidation) {
                upnValidation.textContent = '';
                upnValidation.className = 'validation-message';
            }
            
            // Hide update section when input changes
            const accountUpdateSection = document.getElementById('accountUpdateSection');
            if (accountUpdateSection) {
                accountUpdateSection.classList.add('hidden');
            }
        });
    }
    
    // Check UPN button
    const checkUpnBtn = document.getElementById('checkUpnBtn');
    if (checkUpnBtn && upnInput) {
        checkUpnBtn.addEventListener('click', async () => {
            const upn = upnInput.value.trim();
            await checkResourceAccount(upn, ipcRenderer);
        });
    }
    
    // Reset account button
    const resetAccountBtn = document.getElementById('resetAccountBtn');
    if (resetAccountBtn) {
        resetAccountBtn.addEventListener('click', resetAccountForm);
    }
    
    // Update account button
    const updateAccountBtn = document.getElementById('updateAccountBtn');
    if (updateAccountBtn) {
        updateAccountBtn.addEventListener('click', async () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            const updateDisplayName = document.getElementById('updateDisplayName') as HTMLInputElement;
            const newDisplayName = updateDisplayName ? updateDisplayName.value.trim() : '';
            
            await updateResourceAccount(upn, newDisplayName, ipcRenderer);
        });
    }
    
    // Reset password button
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', async () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            
            if (!upn) {
                return;
            }
            
            await resetPassword(upn, ipcRenderer);
        });
    }
}

// Setup event handlers for group management
export function setupGroupHandlers(ipcRenderer: any) {
    const upnInput = document.getElementById('upn') as HTMLInputElement;
    
    // Add to MTR Group button (in License Management section)
    const addToMtrBtn = document.getElementById('addToMtrBtn');
    if (addToMtrBtn && upnInput) {
        addToMtrBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            addToMtrGroup(upn, ipcRenderer);
        });
    }
    
    // Remove from MTR Group button
    const removeFromMtrBtn = document.getElementById('removeFromMtrBtn');
    if (removeFromMtrBtn && upnInput) {
        removeFromMtrBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            removeFromMtrGroup(upn, ipcRenderer);
        });
    }
    
    // Add to MTR Group button (in Account Status section)
    const addToMtrStatusBtn = document.getElementById('addToMtrStatusBtn');
    if (addToMtrStatusBtn && upnInput) {
        addToMtrStatusBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            addToMtrGroup(upn, ipcRenderer);
        });
    }
    
    // Remove from MTR Group button (in Account Status section)
    const removeFromMtrStatusBtn = document.getElementById('removeFromMtrStatusBtn');
    if (removeFromMtrStatusBtn && upnInput) {
        removeFromMtrStatusBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            removeFromMtrGroup(upn, ipcRenderer);
        });
    }
    
    // Add to Room Group button
    const addToRoomBtn = document.getElementById('addToRoomBtn');
    if (addToRoomBtn && upnInput) {
        addToRoomBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            addToRoomGroup(upn, ipcRenderer);
        });
    }
    
    // Remove from Room Group button
    const removeFromRoomBtn = document.getElementById('removeFromRoomBtn');
    if (removeFromRoomBtn && upnInput) {
        removeFromRoomBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            removeFromRoomGroup(upn, ipcRenderer);
        });
    }
    
    // Add to Pro Group button
    const addToProBtn = document.getElementById('addToProBtn');
    if (addToProBtn && upnInput) {
        addToProBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            addToProGroup(upn, ipcRenderer);
        });
    }
    
    // Remove from Pro Group button
    const removeFromProBtn = document.getElementById('removeFromProBtn');
    if (removeFromProBtn && upnInput) {
        removeFromProBtn.addEventListener('click', () => {
            const upn = upnInput.dataset.foundUpn || upnInput.value.trim();
            if (!upn) return;
            removeFromProGroup(upn, ipcRenderer);
        });
    }
}

// Setup tab navigation
export function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

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
    const startButtons = document.querySelectorAll('.start-btn');
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
}

// Setup quit button
export function setupQuitHandler(ipcRenderer: any) {
    const quitButton = document.getElementById('quitButton');
    if (quitButton) {
        quitButton.addEventListener('click', () => {
            ipcRenderer.invoke('quit-app');
        });
    }
} 