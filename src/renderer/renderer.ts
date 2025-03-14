import { ipcRenderer } from 'electron';

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

// DOM Elements
const deviceTypeSelect = document.getElementById('deviceType') as HTMLSelectElement;
const serialNumberInput = document.getElementById('serialNumber') as HTMLInputElement;
const macAddressInput = document.getElementById('macAddress') as HTMLInputElement;
const upnInput = document.getElementById('upn') as HTMLInputElement;
const provisionIntuneBtn = document.getElementById('provisionIntune') as HTMLButtonElement;
const provisionTACBtn = document.getElementById('provisionTAC') as HTMLButtonElement;
const generateCodeBtn = document.getElementById('generateCode') as HTMLButtonElement;
const statusContainer = document.getElementById('status') as HTMLDivElement;

// Tab Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Status Elements
const accountStatusValue = document.querySelector('#accountStatus .value') as HTMLElement;
const intuneStatusValue = document.querySelector('#intuneStatus .value') as HTMLElement;
const tacStatusValue = document.querySelector('#tacStatus .value') as HTMLElement;
const groupStatusValue = document.querySelector('#groupStatus .value') as HTMLElement;

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

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initializeApp();
});

function initializeApp() {
    console.log('Initializing app');
    setupTabNavigation();
    setupInputValidation();
    setupEventListeners();
    initializeStatusIndicators();
}

function setupTabNavigation() {
    console.log('Setting up tab navigation');
    const tabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.tab-panel');

    // Set initial active tab
    const firstTab = tabs[0] as HTMLElement;
    const firstPanel = panels[0] as HTMLElement;
    
    if (firstTab && firstPanel) {
        console.log('Setting initial active tab');
        firstTab.classList.add('active');
        firstPanel.classList.add('active');
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e: Event) => {
            e.preventDefault();
            const clickedTab = e.currentTarget as HTMLElement;
            
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            clickedTab.classList.add('active');
            
            // Show corresponding panel
            const panelId = (clickedTab as HTMLAnchorElement).getAttribute('href')?.substring(1);
            if (panelId) {
                const panel = document.getElementById(panelId);
                if (panel) {
                    panel.classList.add('active');
                    console.log(`Activated panel: ${panelId}`);
                }
            }

            // If switching to codes tab, refresh the list
            if (panelId === 'codes') {
                refreshUnprovisionedRooms();
            }
        });
    });
}

function setupInputValidation() {
    setupSerialNumberValidation();
    setupMacAddressValidation();
}

function setupSerialNumberValidation() {
    const serialNumberInput = document.getElementById('serialNumber') as HTMLInputElement;
    if (serialNumberInput) {
        serialNumberInput.addEventListener('input', (e: Event) => {
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

function setupMacAddressValidation() {
    const macAddressInput = document.getElementById('macAddress') as HTMLInputElement;
    if (macAddressInput) {
        macAddressInput.addEventListener('input', (e: Event) => {
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

function setupEventListeners() {
    console.log('Setting up event listeners');
    const deviceTypeSelect = document.getElementById('deviceType') as HTMLSelectElement;
    const serialNumberInput = document.getElementById('serialNumber') as HTMLInputElement;
    const macAddressInput = document.getElementById('macAddress') as HTMLInputElement;
    const upnInput = document.getElementById('upn') as HTMLInputElement;

    if (deviceTypeSelect) deviceTypeSelect.addEventListener('change', updateButtonStates);
    if (serialNumberInput) serialNumberInput.addEventListener('input', updateButtonStates);
    if (macAddressInput) macAddressInput.addEventListener('input', updateButtonStates);
    if (upnInput) {
        upnInput.addEventListener('blur', async () => {
            const upn = upnInput.value;
            if (!upn) return;

            try {
                const accountStatusValue = document.querySelector('#accountStatus .value') as HTMLElement;
                if (accountStatusValue) {
                    updateStatusIndicator(accountStatusValue, 'Checking...', 'warning');
                    const result = await ipcRenderer.invoke('check-resource-account', upn);
                    currentStatus.accountStatus = result.exists;
                    updateStatusIndicator(
                        accountStatusValue,
                        result.exists ? 'Found' : 'Not Found',
                        result.exists ? 'success' : 'error'
                    );
                }
            } catch (error) {
                console.error('Error checking resource account:', error);
                updateStatus('Failed to check resource account', true);
            }
        });
    }
}

function initializeStatusIndicators() {
    console.log('Initializing status indicators');
    const accountStatusValue = document.querySelector('#accountStatus .value') as HTMLElement;
    const intuneStatusValue = document.querySelector('#intuneStatus .value') as HTMLElement;
    const tacStatusValue = document.querySelector('#tacStatus .value') as HTMLElement;
    const groupStatusValue = document.querySelector('#groupStatus .value') as HTMLElement;

    if (accountStatusValue) updateStatusIndicator(accountStatusValue, 'Not checked');
    if (intuneStatusValue) updateStatusIndicator(intuneStatusValue, 'Not checked');
    if (tacStatusValue) updateStatusIndicator(tacStatusValue, 'Not checked');
    if (groupStatusValue) updateStatusIndicator(groupStatusValue, 'Not checked');
}

// Helper Functions
function updateStatusIndicator(element: HTMLElement, status: string, type: 'success' | 'error' | 'warning' = 'warning') {
    element.textContent = status;
    element.className = `value ${type}`;
}

function updateStatus(message: string, isError: boolean = false) {
    const statusElement = document.createElement('div');
    statusElement.className = `status-message ${isError ? 'error' : 'success'}`;
    statusElement.textContent = message;
    statusContainer.prepend(statusElement);

    // Keep only last 5 messages
    while (statusContainer.children.length > 5) {
        statusContainer.removeChild(statusContainer.lastChild!);
    }
}

function updateButtonStates() {
    const deviceType = deviceTypeSelect.value;
    const serialNumber = serialNumberInput.value;
    const macAddress = macAddressInput.value;
    const upn = upnInput.value;

    const isValidMac = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macAddress);
    const isValidSerial = serialNumber.endsWith('2');
    const isValidUpn = upn.includes('@banenor.onmicrosoft.com');

    // Disable provision buttons if already provisioned
    provisionIntuneBtn.disabled = !deviceType || !isValidSerial || !currentStatus.accountStatus || currentStatus.isProvisioned.intune;
    provisionTACBtn.disabled = !deviceType || !isValidMac || !currentStatus.accountStatus || currentStatus.isProvisioned.tac;

    // Update button text if provisioned
    provisionIntuneBtn.textContent = currentStatus.isProvisioned.intune ? 'Already Provisioned' : 'Provision in Intune';
    provisionTACBtn.textContent = currentStatus.isProvisioned.tac ? 'Already Provisioned' : 'Provision in TAC';
}

async function refreshUnprovisionedRooms() {
    const unprovisionedList = document.getElementById('unprovisionedList');
    const generateButton = document.getElementById('generateSelectedCodes') as HTMLButtonElement;
    if (!unprovisionedList || !generateButton) return;

    try {
        const result = await ipcRenderer.invoke('get-unprovisioned-rooms');
        unprovisionedList.innerHTML = '';

        if (result.rooms.length === 0) {
            unprovisionedList.innerHTML = '<div class="room-item">No provisioned, unassigned rooms found</div>';
            generateButton.disabled = true;
            return;
        }

        generateButton.disabled = false;

        result.rooms.forEach((room: any) => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <div class="room-info">
                    <input type="checkbox" class="room-checkbox" data-room-id="${room.id}">
                    <div class="room-details">
                        <div class="room-name">${room.displayName}</div>
                        <div class="room-mac">${room.macAddress}</div>
                    </div>
                </div>
            `;
            unprovisionedList.appendChild(roomElement);
        });
    } catch (error) {
        console.error('Error fetching unassigned rooms:', error);
        unprovisionedList.innerHTML = '<div class="room-item error">Error loading rooms</div>';
    }
}

async function generateCodesForSelectedRooms() {
    const checkboxes = document.querySelectorAll('.room-checkbox:checked');
    const generatedCodesDiv = document.getElementById('generatedCodes');
    
    if (!generatedCodesDiv || checkboxes.length === 0) return;

    generatedCodesDiv.innerHTML = '<div class="generating">Generating codes...</div>';
    
    try {
        const roomIds = Array.from(checkboxes).map(checkbox => (checkbox as HTMLInputElement).dataset.roomId);
        const codes = await Promise.all(roomIds.map(id => ipcRenderer.invoke('generate-code', id)));
        
        generatedCodesDiv.innerHTML = `
            <div class="codes-result">
                ${codes.map((code, index) => `
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

// Event Listeners
deviceTypeSelect.addEventListener('change', updateButtonStates);
serialNumberInput.addEventListener('input', updateButtonStates);
macAddressInput.addEventListener('input', updateButtonStates);

serialNumberInput.addEventListener('blur', async () => {
    const serialNumber = serialNumberInput.value;
    if (!serialNumber) return;

    try {
        updateStatusIndicator(intuneStatusValue, 'Checking...', 'warning');
        const result = await ipcRenderer.invoke('check-intune-device', serialNumber);
        currentStatus.intuneStatus = result.exists;
        currentStatus.isProvisioned.intune = result.exists;
        updateStatusIndicator(
            intuneStatusValue,
            result.exists ? 'Found' : 'Not Found',
            result.exists ? 'success' : 'error'
        );
        updateStatus(`Device ${result.exists ? 'found' : 'not found'} in Intune`);
    } catch (error) {
        updateStatusIndicator(intuneStatusValue, 'Error', 'error');
        updateStatus('Error checking Intune device: ' + error, true);
    }
    updateButtonStates();
});

macAddressInput.addEventListener('blur', async () => {
    const macAddress = macAddressInput.value;
    if (!macAddress) return;

    try {
        updateStatusIndicator(tacStatusValue, 'Checking...', 'warning');
        const result = await ipcRenderer.invoke('check-tac-device', macAddress);
        currentStatus.tacStatus = result.exists;
        currentStatus.isProvisioned.tac = result.exists;
        updateStatusIndicator(
            tacStatusValue,
            result.exists ? 'Found' : 'Not Found',
            result.exists ? 'success' : 'error'
        );
        updateStatus(`Device ${result.exists ? 'found' : 'not found'} in TAC`);
    } catch (error) {
        updateStatusIndicator(tacStatusValue, 'Error', 'error');
        updateStatus('Error checking TAC device: ' + error, true);
    }
    updateButtonStates();
});

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

// Initialize button states and status indicators
updateButtonStates();
updateStatusIndicator(accountStatusValue, 'Not checked');
updateStatusIndicator(intuneStatusValue, 'Not checked');
updateStatusIndicator(tacStatusValue, 'Not checked');
updateStatusIndicator(groupStatusValue, 'Not checked');

// Add to your event listeners setup
document.getElementById('generateSelectedCodes')?.addEventListener('click', generateCodesForSelectedRooms); 