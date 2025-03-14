const { ipcRenderer } = require('electron');

// Global variables for form elements
let setupForm, deviceTypeSelect, serialNumberInput, provisionIntuneBtn, provisionTACBtn, 
    generateCodeBtn, macAddressInput, statusContainer, checkUpnBtn, checkSerialBtn, checkMacBtn;

// Device type configurations
const deviceConfigs = {
    'tap-scheduler': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true },
    'tap-ip': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true },
    'tap': { requiresIntune: false, requiresTAC: false, requiresCode: true, requiresMac: false },
    'rallybar': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true }
};

function setupTabNavigation() {
    console.log('Setting up tab navigation');
    const tabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.tab-panel');

    // Set initial active tab (Info tab)
    const infoTab = document.querySelector('a[href="#info"]');
    const infoPanel = document.getElementById('info');
    
    if (infoTab && infoPanel) {
        console.log('Setting initial active tab to Info');
        // Remove active class from all tabs and panels first
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        
        // Set Info tab as active
        infoTab.classList.add('active');
        infoPanel.classList.add('active');
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const clickedTab = e.currentTarget;
            
            console.log('Tab clicked:', clickedTab.getAttribute('href'));
            
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            clickedTab.classList.add('active');
            
            // Show corresponding panel
            const panelId = clickedTab.getAttribute('href')?.substring(1);
            if (panelId) {
                const panel = document.getElementById(panelId);
                if (panel) {
                    panel.classList.add('active');
                    console.log(`Activated panel: ${panelId}`);
                } else {
                    console.error(`Panel not found: ${panelId}`);
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Set up tab navigation first
    setupTabNavigation();
    
    // Initialize form elements and event listeners for the setup tab
    function initializeSetupTab() {
        console.log('Initializing setup tab');
        const setupForm = document.getElementById('setupForm');
        const deviceTypeSelect = document.getElementById('deviceType');
        const serialNumberInput = document.getElementById('serialNumber');
        const provisionIntuneBtn = document.getElementById('provisionIntune');
        const provisionTACBtn = document.getElementById('provisionTAC');
        const generateCodeBtn = document.getElementById('generateCode');
        const macAddressInput = document.getElementById('macAddress');
        const statusContainer = document.getElementById('status');

        const checkUpnBtn = document.getElementById('checkUpn');
        const checkSerialBtn = document.getElementById('checkSerial');
        const checkMacBtn = document.getElementById('checkMac');

        if (!setupForm || !deviceTypeSelect) {
            console.log('Setup tab elements not found, skipping initialization');
            return;
        }

        // Device type configurations
        const deviceConfigs = {
            'tap-scheduler': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true },
            'tap-ip': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true },
            'tap': { requiresIntune: false, requiresTAC: false, requiresCode: true, requiresMac: false },
            'rallybar': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true }
        };

        // Add event listeners only if elements exist
        if (deviceTypeSelect) {
            // Initial state - disable all fields
            function disableAllFields() {
                if (macAddressInput) {
                    macAddressInput.disabled = true;
                    macAddressInput.value = '';
                }
                if (document.getElementById('upn')) {
                    document.getElementById('upn').disabled = true;
                }
                if (serialNumberInput) {
                    serialNumberInput.disabled = true;
                }
                if (checkUpnBtn) checkUpnBtn.disabled = true;
                if (checkSerialBtn) checkSerialBtn.disabled = true;
                if (checkMacBtn) checkMacBtn.disabled = true;
                if (provisionIntuneBtn) provisionIntuneBtn.disabled = true;
                if (provisionTACBtn) provisionTACBtn.disabled = true;
                if (generateCodeBtn) generateCodeBtn.disabled = true;

                const macAddressHint = document.getElementById('macAddressHint');
                const macAddressNotRequired = document.getElementById('macAddressNotRequired');
                if (macAddressHint) macAddressHint.style.display = 'none';
                if (macAddressNotRequired) macAddressNotRequired.style.display = 'none';
            }

            // Enable fields based on device type
            function enableFields() {
                if (document.getElementById('upn')) {
                    document.getElementById('upn').disabled = false;
                }
                if (serialNumberInput) {
                    serialNumberInput.disabled = false;
                }
                if (checkUpnBtn) checkUpnBtn.disabled = false;
                if (checkSerialBtn) checkSerialBtn.disabled = false;
            }

            // Set initial state
            disableAllFields();

            deviceTypeSelect.addEventListener('change', () => {
                const selectedType = deviceTypeSelect.value;
                
                // If no device type is selected, disable all fields
                if (!selectedType) {
                    disableAllFields();
                    return;
                }

                // Enable common fields
                enableFields();

                const config = deviceConfigs[selectedType] || { requiresIntune: false, requiresTAC: false, requiresCode: false, requiresMac: false };

                if (provisionIntuneBtn) provisionIntuneBtn.disabled = !config.requiresIntune;
                if (provisionTACBtn) provisionTACBtn.disabled = !config.requiresTAC;
                if (generateCodeBtn) generateCodeBtn.disabled = !config.requiresCode;
                
                // Handle MAC address field
                if (macAddressInput) {
                    macAddressInput.disabled = !config.requiresMac;
                    const macAddressHint = document.getElementById('macAddressHint');
                    const macAddressNotRequired = document.getElementById('macAddressNotRequired');
                    
                    if (!config.requiresMac) {
                        macAddressInput.value = '';
                        if (macAddressHint) macAddressHint.style.display = 'none';
                        if (macAddressNotRequired) macAddressNotRequired.style.display = 'block';
                        if (checkMacBtn) checkMacBtn.disabled = true;
                    } else {
                        if (macAddressHint) macAddressHint.style.display = 'block';
                        if (macAddressNotRequired) macAddressNotRequired.style.display = 'none';
                        if (checkMacBtn) checkMacBtn.disabled = false;
                    }
                }

                // Recheck device status when type changes
                checkDeviceStatus();
            });
        }

        // Add other event listeners only if elements exist
        if (checkUpnBtn) checkUpnBtn.addEventListener('click', checkUpn);
        if (checkSerialBtn) checkSerialBtn.addEventListener('click', checkSerial);
        if (checkMacBtn) checkMacBtn.addEventListener('click', checkMac);
        if (serialNumberInput) serialNumberInput.addEventListener('input', debouncedDeviceCheck);
        if (macAddressInput) {
            macAddressInput.addEventListener('input', (e) => {
                if (macAddressInput.disabled) return;
                
                const value = e.target.value;
                const formatted = value
                    .replace(/[^0-9a-fA-F]/g, '')
                    .toUpperCase()
                    .match(/.{1,2}/g)
                    ?.join(':')
                    .substring(0, 17) || '';
                
                if (value !== formatted) {
                    e.target.value = formatted;
                }

                if (formatted.length === 17) {
                    debouncedDeviceCheck();
                }
            });
        }

        // Initialize the form state if deviceTypeSelect exists
        if (deviceTypeSelect) {
            deviceTypeSelect.dispatchEvent(new Event('change'));
        }
    }

    // Initialize codes tab
    function initializeCodesTab() {
        console.log('Initializing codes tab');
        const refreshRoomsBtn = document.getElementById('refreshRooms');
        if (refreshRoomsBtn) {
            refreshRoomsBtn.addEventListener('click', () => {
                // Add refresh functionality here
                console.log('Refresh rooms clicked');
            });
        }
    }

    // Add tab change listener to initialize tab-specific content
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const panelId = e.currentTarget.getAttribute('href')?.substring(1);
            if (panelId === 'setup') {
                initializeSetupTab();
            } else if (panelId === 'codes') {
                initializeCodesTab();
            }
        });
    });

    // Initialize the current active tab
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
        const panelId = activeTab.getAttribute('href')?.substring(1);
        if (panelId === 'setup') {
            initializeSetupTab();
        } else if (panelId === 'codes') {
            initializeCodesTab();
        }
    }

    // Individual check functions
    async function checkUpn() {
        const upn = document.getElementById('upn').value.trim();
        const accountStatusValue = document.querySelector('#accountStatus .value');

        if (!upn) {
            showStatus('Please enter a UPN', 'error');
            return;
        }

        try {
            updateStatusIndicator(accountStatusValue, 'Checking...', 'warning');
            const accountResult = await ipcRenderer.invoke('check-resource-account', upn);
            updateStatusIndicator(
                accountStatusValue,
                accountResult.exists ? 'Found' : 'Not Found',
                accountResult.exists ? 'success' : 'error'
            );
            showStatus(
                accountResult.exists 
                    ? `Resource account found: ${accountResult.details?.displayName || upn}`
                    : 'Resource account not found',
                accountResult.exists ? 'success' : 'error'
            );
        } catch (error) {
            console.error('Error checking UPN:', error);
            updateStatusIndicator(accountStatusValue, 'Error', 'error');
            showStatus(`Error checking UPN: ${error.message}`, 'error');
        }
    }

    async function checkSerial() {
        const serialNumber = serialNumberInput.value.trim();
        const intuneStatusValue = document.querySelector('#intuneStatus .value');
        const config = deviceConfigs[deviceTypeSelect.value] || {};

        if (serialNumber.length < 3) {
            showStatus('Serial number must be at least 3 characters', 'error');
            return;
        }

        try {
            updateStatusIndicator(intuneStatusValue, 'Checking...', 'warning');
            const intuneResult = await ipcRenderer.invoke('check-serial-number', serialNumber);
            updateStatusIndicator(
                intuneStatusValue,
                intuneResult.exists ? 'Found' : 'Not Found',
                intuneResult.exists ? 'success' : 'error'
            );

            if (intuneResult.exists && config.requiresIntune) {
                provisionIntuneBtn.disabled = true;
            }

            showStatus(
                intuneResult.exists 
                    ? 'Device found in Intune'
                    : 'Device not found in Intune',
                intuneResult.exists ? 'success' : 'warning'
            );
        } catch (error) {
            console.error('Error checking serial number:', error);
            updateStatusIndicator(intuneStatusValue, 'Error', 'error');
            showStatus(`Error checking serial number: ${error.message}`, 'error');
        }
    }

    async function checkMac() {
        const macAddress = macAddressInput.value.trim();
        const deviceType = deviceTypeSelect.value;
        const tacStatusValue = document.querySelector('#tacStatus .value');
        const config = deviceConfigs[deviceType] || {};

        if (!config.requiresMac) {
            showStatus('MAC address check not required for this device type', 'warning');
            return;
        }

        if (macAddress.length !== 17) {
            showStatus('Please enter a complete MAC address', 'error');
            return;
        }

        try {
            updateStatusIndicator(tacStatusValue, 'Checking...', 'warning');
            const tacResult = await ipcRenderer.invoke('check-mac-address', {
                macAddress,
                deviceType
            });
            updateStatusIndicator(
                tacStatusValue,
                tacResult.exists ? 'Found' : 'Not Found',
                tacResult.exists ? 'success' : 'error'
            );

            if (tacResult.exists && config.requiresTAC) {
                provisionTACBtn.disabled = true;
            }

            showStatus(
                tacResult.exists 
                    ? 'Device found in TAC'
                    : 'Device not found in TAC',
                tacResult.exists ? 'success' : 'warning'
            );
        } catch (error) {
            console.error('Error checking MAC address:', error);
            updateStatusIndicator(tacStatusValue, 'Error', 'error');
            showStatus(`Error checking MAC address: ${error.message}`, 'error');
        }
    }

    // Modify the existing checkDeviceStatus function to use the new individual check functions
    async function checkDeviceStatus() {
        if (!deviceTypeSelect) return;
        
        const deviceType = deviceTypeSelect.value;
        const config = deviceConfigs[deviceType] || {};

        try {
            await checkUpn();
            await checkSerial();
            if (config.requiresMac) {
                await checkMac();
            }
        } catch (error) {
            console.error('Error checking device status:', error);
            showStatus(`Error checking device status: ${error.message}`, 'error');
        }
    }

    // Helper function to update status indicators
    function updateStatusIndicator(element, status, type = 'warning') {
        if (element) {
            element.textContent = status;
            element.className = `value ${type}`;
        }
    }

    // Debounced device check
    let deviceCheckTimeout;
    function debouncedDeviceCheck() {
        clearTimeout(deviceCheckTimeout);
        deviceCheckTimeout = setTimeout(checkDeviceStatus, 500);
    }

    function showStatus(message, type) {
        if (statusContainer) {
            statusContainer.textContent = message;
            statusContainer.className = `status-container ${type}`;
        }
    }
}); 