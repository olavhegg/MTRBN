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
        // DOM Elements
        const deviceTypeSelect = document.getElementById('deviceType');
        const serialNumberInput = document.getElementById('serialNumber');
        const macAddressInput = document.getElementById('macAddress');
        const upnInput = document.getElementById('upn');
        const provisionIntuneBtn = document.getElementById('provisionIntune');
        const provisionTACBtn = document.getElementById('provisionTAC');
        const generateCodeBtn = document.getElementById('generateSelectedCodes');
        const statusContainer = document.getElementById('status');
        const refreshRoomsBtn = document.getElementById('refreshRooms');
        const quitButton = document.getElementById('quitButton');

        // Tab Elements
        const tabButtons = document.querySelectorAll('.nav-tab');
        const tabPanels = document.querySelectorAll('.tab-panel');

        // Status Elements
        const accountStatusValue = document.querySelector('#accountStatus .value');
        const intuneStatusValue = document.querySelector('#intuneStatus .value');
        const tacStatusValue = document.querySelector('#tacStatus .value');
        const groupStatusValue = document.querySelector('#groupStatus .value');

        // Check if all required elements exist
        if (!deviceTypeSelect || !serialNumberInput || !macAddressInput || !upnInput || 
            !provisionIntuneBtn || !provisionTACBtn || !generateCodeBtn || !statusContainer) {
            console.error('Required DOM elements not found');
            return;
        }

        if (tabButtons.length === 0 || tabPanels.length === 0) {
            console.error('Tab elements not found');
            return;
        }

        if (!accountStatusValue || !intuneStatusValue || !tacStatusValue || !groupStatusValue) {
            console.error('Status elements not found');
            return;
        }

        // Type assertions
        const deviceTypeSelectEl = deviceTypeSelect as HTMLSelectElement;
        const serialNumberInputEl = serialNumberInput as HTMLInputElement;
        const macAddressInputEl = macAddressInput as HTMLInputElement;
        const upnInputEl = upnInput as HTMLInputElement;
        const provisionIntuneBtnEl = provisionIntuneBtn as HTMLButtonElement;
        const provisionTACBtnEl = provisionTACBtn as HTMLButtonElement;
        const generateCodeBtnEl = generateCodeBtn as HTMLButtonElement;
        const statusContainerEl = statusContainer as HTMLDivElement;
        const refreshRoomsBtnEl = refreshRoomsBtn as HTMLButtonElement;
        const tabButtonsEl = tabButtons as NodeListOf<HTMLAnchorElement>;
        const tabPanelsEl = tabPanels as NodeListOf<HTMLElement>;
        const accountStatusValueEl = accountStatusValue as HTMLElement;
        const intuneStatusValueEl = intuneStatusValue as HTMLElement;
        const tacStatusValueEl = tacStatusValue as HTMLElement;
        const groupStatusValueEl = groupStatusValue as HTMLElement;

        // Initialize status indicators
        updateStatusIndicator(accountStatusValueEl, 'Not checked');
        updateStatusIndicator(intuneStatusValueEl, 'Not checked');
        updateStatusIndicator(tacStatusValueEl, 'Not checked');
        updateStatusIndicator(groupStatusValueEl, 'Not checked');

        // Setup tab navigation
        setupTabNavigation(tabButtonsEl, tabPanelsEl);
        
        // Setup input validation
        setupSerialNumberValidation(serialNumberInputEl);
        setupMacAddressValidation(macAddressInputEl);
        setupUpnValidation(upnInputEl);

        // Setup event listeners
        deviceTypeSelectEl.addEventListener('change', () => {
            updateButtonStates(deviceTypeSelectEl, serialNumberInputEl, macAddressInputEl, upnInputEl, 
                provisionIntuneBtnEl, provisionTACBtnEl);
        });
        
        serialNumberInputEl.addEventListener('input', () => {
            updateButtonStates(deviceTypeSelectEl, serialNumberInputEl, macAddressInputEl, upnInputEl, 
                provisionIntuneBtnEl, provisionTACBtnEl);
        });
        
        macAddressInputEl.addEventListener('input', () => {
            updateButtonStates(deviceTypeSelectEl, serialNumberInputEl, macAddressInputEl, upnInputEl, 
                provisionIntuneBtnEl, provisionTACBtnEl);
        });

        upnInputEl.addEventListener('blur', async () => {
            const upn = upnInputEl.value;
            if (!upn) return;

            try {
                updateStatusIndicator(accountStatusValueEl, 'Checking...', 'warning');
                const result = await ipcRenderer.invoke('check-resource-account', upn);
                currentStatus.accountStatus = result.exists;
                updateStatusIndicator(
                    accountStatusValueEl,
                    result.exists ? 'Found' : 'Not Found',
                    result.exists ? 'success' : 'error'
                );
            } catch (error) {
                console.error('Error checking resource account:', error);
                updateStatus('Failed to check resource account', true, statusContainerEl);
            }
        });

        serialNumberInputEl.addEventListener('blur', async () => {
            const serialNumber = serialNumberInputEl.value;
            if (!serialNumber) return;

            try {
                updateStatusIndicator(intuneStatusValueEl, 'Checking...', 'warning');
                const result = await ipcRenderer.invoke('check-intune-device', serialNumber);
                currentStatus.intuneStatus = result.exists;
                currentStatus.isProvisioned.intune = result.exists;
                updateStatusIndicator(
                    intuneStatusValueEl,
                    result.exists ? 'Found' : 'Not Found',
                    result.exists ? 'success' : 'error'
                );
                updateStatus(`Device ${result.exists ? 'found' : 'not found'} in Intune`, false, statusContainerEl);
            } catch (error) {
                updateStatusIndicator(intuneStatusValueEl, 'Error', 'error');
                updateStatus('Error checking Intune device: ' + error, true, statusContainerEl);
            }
            updateButtonStates(deviceTypeSelectEl, serialNumberInputEl, macAddressInputEl, upnInputEl, 
                provisionIntuneBtnEl, provisionTACBtnEl);
        });

        macAddressInputEl.addEventListener('blur', async () => {
            const macAddress = macAddressInputEl.value;
            if (!macAddress) return;

            try {
                updateStatusIndicator(tacStatusValueEl, 'Checking...', 'warning');
                const result = await ipcRenderer.invoke('check-tac-device', macAddress);
                currentStatus.tacStatus = result.exists;
                currentStatus.isProvisioned.tac = result.exists;
                updateStatusIndicator(
                    tacStatusValueEl,
                    result.exists ? 'Found' : 'Not Found',
                    result.exists ? 'success' : 'error'
                );
                updateStatus(`Device ${result.exists ? 'found' : 'not found'} in TAC`, false, statusContainerEl);
            } catch (error) {
                updateStatusIndicator(tacStatusValueEl, 'Error', 'error');
                updateStatus('Error checking TAC device: ' + error, true, statusContainerEl);
            }
            updateButtonStates(deviceTypeSelectEl, serialNumberInputEl, macAddressInputEl, upnInputEl, 
                provisionIntuneBtnEl, provisionTACBtnEl);
        });

        // Add event listeners for code generation
        if (generateCodeBtnEl) {
            generateCodeBtnEl.addEventListener('click', () => {
                generateCodesForSelectedRooms();
            });
        }
        
        // Add event listener for refresh button
        if (refreshRoomsBtnEl) {
            refreshRoomsBtnEl.addEventListener('click', () => {
                refreshUnprovisionedRooms();
            });
        }

        // Add event listener for quit button
        if (quitButton) {
            quitButton.addEventListener('click', () => {
                ipcRenderer.invoke('quit-app');
            });
        }

        // Initial button states
        updateButtonStates(deviceTypeSelectEl, serialNumberInputEl, macAddressInputEl, upnInputEl, 
            provisionIntuneBtnEl, provisionTACBtnEl);

        // Add styles for loading state
        const style = document.createElement('style');
        style.textContent = `
            .room-item.loading {
                color: #666;
                font-style: italic;
                justify-content: center;
                padding: 2rem;
            }
            
            .room-location {
                font-size: 0.85em;
                color: #666;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

// Function definitions
function setupTabNavigation(tabButtonsEl: NodeListOf<HTMLAnchorElement>, tabPanelsEl: NodeListOf<HTMLElement>) {
    console.log('Setting up tab navigation');
    
    // Ensure initial state is correct
    const defaultTab = document.querySelector('.nav-tab.active') as HTMLAnchorElement;
    if (defaultTab) {
        const defaultPanelId = defaultTab.getAttribute('href')?.substring(1);
        if (defaultPanelId) {
            const defaultPanel = document.getElementById(defaultPanelId);
            if (defaultPanel) {
                defaultPanel.classList.add('active');
            }
        }
    }
    
    tabButtonsEl.forEach((tab: HTMLAnchorElement) => {
        tab.addEventListener('click', (e: Event) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLAnchorElement;
            const targetId = target.getAttribute('href')?.substring(1);
            
            if (!targetId) {
                console.error('Tab target ID not found');
                return;
            }
            
            const targetPanel = document.getElementById(targetId);
            if (!targetPanel) {
                console.error(`Panel with ID ${targetId} not found`);
                return;
            }
            
            // Remove active class from all tabs and panels
            tabButtonsEl.forEach((t: HTMLAnchorElement) => t.classList.remove('active'));
            tabPanelsEl.forEach((p: HTMLElement) => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            target.classList.add('active');
            targetPanel.classList.add('active');
        });
    });
}

function setupSerialNumberValidation(serialNumberInputEl: HTMLInputElement) {
    if (serialNumberInputEl) {
        serialNumberInputEl.maxLength = 12;
        
        serialNumberInputEl.addEventListener('input', (e: Event) => {
            const input = e.target as HTMLInputElement;
            let value = input.value.toUpperCase();
            // Remove any non-alphanumeric characters
            value = value.replace(/[^A-Z0-9]/g, '');
            // Limit to 12 characters
            value = value.slice(0, 12);
            input.value = value;

            // Check if valid (12 characters and ends with 2)
            const isValid = value.length === 12 && value.endsWith('2');
            input.setCustomValidity(isValid ? '' : 'Serial number must be 12 characters and end with 2');
            input.reportValidity();
        });
    }
}

function setupMacAddressValidation(macAddressInputEl: HTMLInputElement) {
    if (macAddressInputEl) {
        macAddressInputEl.addEventListener('input', (e: Event) => {
            const input = e.target as HTMLInputElement;
            let value = input.value.toUpperCase();
            // Remove any non-hex characters
            value = value.replace(/[^A-F0-9]/g, '');
            
            // Add colons after every 2 characters (except the last group)
            let formattedValue = '';
            for (let i = 0; i < value.length && i < 12; i++) {
                if (i > 0 && i % 2 === 0 && i < 10) {
                    formattedValue += ':';
                }
                formattedValue += value[i];
            }
            
            input.value = formattedValue;

            // Check if valid (complete MAC address)
            const isValid = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(formattedValue);
            input.setCustomValidity(isValid ? '' : 'Please enter a valid MAC address');
            input.reportValidity();
        });
    }
}

function setupUpnValidation(upnInputEl: HTMLInputElement) {
    if (upnInputEl) {
        upnInputEl.addEventListener('input', (e: Event) => {
            const input = e.target as HTMLInputElement;
            input.value = input.value.toLowerCase();
        });
    }
}

function updateButtonStates(
    deviceTypeSelectEl: HTMLSelectElement,
    serialNumberInputEl: HTMLInputElement,
    macAddressInputEl: HTMLInputElement,
    upnInputEl: HTMLInputElement,
    provisionIntuneBtnEl: HTMLButtonElement,
    provisionTACBtnEl: HTMLButtonElement
) {
    const deviceType = deviceTypeSelectEl.value;
    const serialNumber = serialNumberInputEl.value;
    const macAddress = macAddressInputEl.value;
    const upn = upnInputEl.value;

    const isValidMac = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macAddress);
    const isValidSerial = serialNumber.endsWith('2');
    const isValidUpn = upn.includes('@banenor.onmicrosoft.com');

    // Disable provision buttons if already provisioned
    provisionIntuneBtnEl.disabled = !deviceType || !isValidSerial || !currentStatus.accountStatus || currentStatus.isProvisioned.intune;
    provisionTACBtnEl.disabled = !deviceType || !isValidMac || !currentStatus.accountStatus || currentStatus.isProvisioned.tac;

    // Update button text if provisioned
    provisionIntuneBtnEl.textContent = currentStatus.isProvisioned.intune ? 'Already Provisioned' : 'Provision in Intune';
    provisionTACBtnEl.textContent = currentStatus.isProvisioned.tac ? 'Already Provisioned' : 'Provision in TAC';
}

async function refreshUnprovisionedRooms() {
    const unprovisionedList = document.getElementById('unprovisionedList');
    const generateButton = document.getElementById('generateSelectedCodes') as HTMLButtonElement;
    const refreshButton = document.getElementById('refreshRooms') as HTMLButtonElement;
    
    if (!unprovisionedList || !generateButton || !refreshButton) return;

    try {
        // Show loading state
        refreshButton.disabled = true;
        refreshButton.textContent = 'Refreshing...';
        unprovisionedList.innerHTML = '<div class="room-item loading">Loading devices from TAC...</div>';
        generateButton.disabled = true;

        // Fetch devices from TAC
        const result = await ipcRenderer.invoke('get-tac-devices');
        unprovisionedList.innerHTML = '';

        if (!result.devices || result.devices.length === 0) {
            unprovisionedList.innerHTML = '<div class="room-item">No provisioned devices found in TAC</div>';
            generateButton.disabled = true;
            return;
        }

        // Display the devices
        result.devices.forEach((device: any) => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <div class="room-info">
                    <input type="checkbox" class="room-checkbox" data-mac="${device.macAddress}">
                    <div class="room-details">
                        <div class="room-name">${device.name || 'Unnamed Device'}</div>
                        <div class="room-mac">${device.macAddress}</div>
                        ${device.location ? `<div class="room-location">${device.location}</div>` : ''}
                    </div>
                </div>
            `;
            unprovisionedList.appendChild(roomElement);
        });

        // Add event listeners to checkboxes
        const checkboxes = unprovisionedList.querySelectorAll('.room-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateGenerateButtonState);
        });

        // Initial button state
        updateGenerateButtonState();

    } catch (error) {
        console.error('Error fetching TAC devices:', error);
        unprovisionedList.innerHTML = '<div class="room-item error">Error loading devices from TAC</div>';
    } finally {
        // Reset refresh button
        refreshButton.disabled = false;
        refreshButton.textContent = 'Refresh List';
    }
}

function updateGenerateButtonState() {
    const generateButton = document.getElementById('generateSelectedCodes') as HTMLButtonElement;
    const checkedBoxes = document.querySelectorAll('.room-checkbox:checked');
    
    if (generateButton) {
        generateButton.disabled = checkedBoxes.length === 0;
    }
}

async function generateCodesForSelectedRooms() {
    const checkboxes = document.querySelectorAll('.room-checkbox:checked');
    const generatedCodesDiv = document.getElementById('generatedCodes');
    
    if (!generatedCodesDiv || checkboxes.length === 0) return;

    generatedCodesDiv.innerHTML = '<div class="generating">Generating codes...</div>';
    
    try {
        // Use data-mac instead of data-roomId
        const macAddresses = Array.from(checkboxes).map(checkbox => (checkbox as HTMLInputElement).dataset.mac);
        const codes = await Promise.all(macAddresses.map(mac => ipcRenderer.invoke('generate-code', mac)));
        
        generatedCodesDiv.innerHTML = `
            <div class="codes-result">
                ${codes.map((code: string, index: number) => `
                    <div class="code-item">
                        <span class="code-value">${code}</span>
                        <button class="copy-button" onclick="navigator.clipboard.writeText('${code}')">Copy</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error generating codes:', error);
        generatedCodesDiv.innerHTML = '<div class="error">Error generating codes</div>';
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

interface DeviceValidation {
    type: string;
    isValid: boolean;
    validationMessage: string;
}

// DOM Elements
const setupForm = document.getElementById('setupForm') as HTMLFormElement;
const serialNumberInput = document.getElementById('serialNumber') as HTMLInputElement;
const descriptionInput = document.getElementById('description') as HTMLInputElement;
const upnInput = document.getElementById('upn') as HTMLInputElement;
const displayNameInput = document.getElementById('displayName') as HTMLInputElement;
const deviceSetupSection = document.getElementById('deviceSetupSection') as HTMLDivElement;
const provisionIntuneBtn = document.getElementById('provisionIntuneBtn') as HTMLButtonElement;
const serialValidation = document.getElementById('serialValidation') as HTMLDivElement;
const resultsDiv = document.getElementById('results') as HTMLDivElement;
const deviceStatus = document.getElementById('deviceStatus') as HTMLPreElement;
const userStatus = document.getElementById('userStatus') as HTMLPreElement;
const groupStatus = document.getElementById('groupStatus') as HTMLPreElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const toast = document.getElementById('toast') as HTMLDivElement;
const toastMessage = document.getElementById('toastMessage') as HTMLSpanElement;
const quitButton = document.getElementById('quitButton') as HTMLButtonElement;

// Tab Elements
const tabButtons = document.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
const tabContents = document.querySelectorAll('.tab-content') as NodeListOf<HTMLDivElement>;
const startButtons = document.querySelectorAll('.start-btn') as NodeListOf<HTMLButtonElement>;

let deviceProvisioned = false;

// Tab Switching
function switchTab(tabId: string) {
    // Update tab buttons
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab contents
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
}

// Event Listeners for Tabs
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        if (tabId) switchTab(tabId);
    });
});

// Event Listeners for Welcome Screen Buttons
startButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.goto;
        if (tabId) switchTab(tabId);
    });
});

// Helper Functions
function showLoader() {
    loader.classList.remove('hidden');
}

function hideLoader() {
    loader.classList.add('hidden');
}

function showToast(message: string, isError = false) {
    toastMessage.textContent = message;
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function showResults(results: SetupResults) {
    resultsDiv.classList.remove('hidden');
    setupForm.classList.add('hidden');

    // Format device status
    if (results.device) {
        deviceStatus.textContent = `✅ Device registered in Intune\nSerial: ${results.device.importedDeviceIdentifier}\nDescription: ${results.device.description}`;
    } else if (deviceProvisioned) {
        deviceStatus.textContent = '✅ Device already provisioned in Intune';
    } else {
        deviceStatus.textContent = 'ℹ️ Device not provisioned in Intune';
    }

    // Format user status
    userStatus.textContent = results.user
        ? `✅ User account ready\nUPN: ${results.user.userPrincipalName}\nDisplay Name: ${results.user.displayName}`
        : '❌ Failed to setup user account';

    // Format group status
    if (results.groups.length > 0) {
        groupStatus.textContent = '✅ Added to groups:\n' + results.groups.join('\n');
    } else {
        groupStatus.textContent = '❌ No groups were added';
    }
}

function resetForm() {
    setupForm.reset();
    resultsDiv.classList.add('hidden');
    setupForm.classList.remove('hidden');
    serialValidation.textContent = '';
    serialValidation.className = 'validation-message';
    deviceSetupSection.classList.add('hidden');
    deviceProvisioned = false;
    switchTab('welcome');
}

async function validateSerialNumber(serialNumber: string) {
    try {
        const validation = await ipcRenderer.invoke('validate-device', serialNumber) as DeviceValidation;
        
        serialValidation.textContent = validation.validationMessage;
        serialValidation.className = `validation-message ${validation.isValid ? 'valid' : 'invalid'}`;
        
        if (validation.isValid) {
            // Check if device is already in Intune
            const device = await ipcRenderer.invoke('check-device-serial', serialNumber);
            deviceProvisioned = !!device;
            
            // Show device setup section if device is valid but not provisioned
            deviceSetupSection.classList.remove('hidden');
            if (deviceProvisioned) {
                provisionIntuneBtn.textContent = 'Already Provisioned';
                provisionIntuneBtn.disabled = true;
            } else {
                provisionIntuneBtn.textContent = 'Provision in Intune';
                provisionIntuneBtn.disabled = false;
            }
        } else {
            deviceSetupSection.classList.add('hidden');
        }
        
        return validation.isValid;
    } catch (error) {
        console.error('Error validating serial number:', error);
        return false;
    }
}

// Event Listeners
setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    showLoader();

    try {
        const results = await ipcRenderer.invoke('setup-device', {
            serialNumber: serialNumberInput.value,
            description: descriptionInput.value,
            upn: upnInput.value,
            displayName: displayNameInput.value,
            shouldProvisionInIntune: false // Device provisioning is handled separately now
        }) as SetupResults;

        hideLoader();

        if (results.success) {
            showToast('Resource account created successfully');
            showResults(results);
        } else {
            showToast(results.error || 'Failed to create resource account', true);
        }
    } catch (error) {
        hideLoader();
        showToast('An unexpected error occurred', true);
        console.error('Setup error:', error);
    }
});

provisionIntuneBtn.addEventListener('click', async () => {
    showLoader();
    try {
        const result = await ipcRenderer.invoke('provision-device', {
            serialNumber: serialNumberInput.value,
            description: descriptionInput.value
        });
        
        if (result.success) {
            deviceProvisioned = true;
            provisionIntuneBtn.textContent = 'Already Provisioned';
            provisionIntuneBtn.disabled = true;
            showToast('Device provisioned successfully in Intune');
        } else {
            showToast('Failed to provision device in Intune', true);
        }
    } catch (error) {
        showToast('Error provisioning device', true);
        console.error('Provision error:', error);
    }
    hideLoader();
});

resetBtn.addEventListener('click', resetForm);

// Form validation and auto-formatting
serialNumberInput.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    validateSerialNumber(input.value);
});

upnInput.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.toLowerCase();
});

// Auto-generate description if empty when serial is entered
serialNumberInput.addEventListener('change', async () => {
    if (!descriptionInput.value && serialNumberInput.value) {
        const validation = await ipcRenderer.invoke('validate-device', serialNumberInput.value) as DeviceValidation;
        descriptionInput.value = `Logitech Device ${serialNumberInput.value}`;
    }
});

// Auto-generate display name if empty when UPN is entered
upnInput.addEventListener('change', () => {
    if (!displayNameInput.value && upnInput.value) {
        const roomName = upnInput.value.split('@')[0];
        displayNameInput.value = roomName
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
            .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
});

// Add quit button event listener
quitButton.addEventListener('click', () => {
    ipcRenderer.invoke('quit-app');
}); 