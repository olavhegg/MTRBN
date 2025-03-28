import { showLoader, hideLoader, showToast } from './utils.js';

// Functions related to device management
export function resetForm() {
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
    
    // Focus on serial number input
    if (serialNumberInput) {
        serialNumberInput.focus();
    }
}

export async function checkSerialNumber(serialNumber: string, ipcRenderer: any) {
    if (!serialNumber || serialNumber.length !== 12 || !serialNumber.endsWith('2')) return;
    
    console.log('Check button clicked for serial:', serialNumber);
    showLoader();
    const validationElement = document.getElementById('serialValidation');
    const deviceSetupSection = document.getElementById('deviceSetupSection');
    const provisionSerialNumberInput = document.getElementById('provisionSerialNumber') as HTMLInputElement;
    const deviceDescription = document.getElementById('description') as HTMLInputElement;
    
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
                        provisionSerialNumberInput.value = serialNumber;
                    }
                    
                    // Set focus on description field
                    if (deviceDescription) {
                        deviceDescription.focus();
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
}

export async function provisionDevice(serialNumber: string, description: string, ipcRenderer: any) {
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
} 