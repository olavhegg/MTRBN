// Declare this as a module to allow global augmentation
export {};

// Define the IPC interface
interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, func: (...args: any[]) => void): void;
    once(channel: string, func: (...args: any[]) => void): void;
    removeListener(channel: string, func: (...args: any[]) => void): void;
}

declare global {
    interface Window {
        electron: {
            ipcRenderer: IpcRenderer;
        }
    }
}

const { ipcRenderer } = window.electron;

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