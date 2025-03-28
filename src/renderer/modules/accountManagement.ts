import { showLoader, hideLoader, showToast } from './utils.js';
import {
    checkMtrGroupMembership,
    checkRoomGroupMembership,
    checkProGroupMembership,
    runGroupDiagnostics
} from './groupManagement.js';

// Functions related to account management
export function resetAccountForm() {
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

export async function checkResourceAccount(upn: string, ipcRenderer: any) {
    if (!upn) {
        return;
    }
    
    try {
        showLoader('Checking account...');
        
        // First run the diagnostics
        await runGroupDiagnostics(ipcRenderer);
        
        const result = await ipcRenderer.invoke('check-resource-account', upn);
        
        hideLoader();
        
        const upnValidation = document.getElementById('upnValidation');
        const accountUpdateSection = document.getElementById('accountUpdateSection');
        const accountPasswordSection = document.getElementById('accountPasswordSection');
        const licensesSection = document.getElementById('licensesSection');
        const accountStatusSection = document.getElementById('accountStatusSection');
        const upnInput = document.getElementById('upn') as HTMLInputElement;
        const updateDisplayName = document.getElementById('updateDisplayName') as HTMLInputElement;
        
        if (result.success) {
            if (result.exists) {
                // Account exists
                if (upnValidation) {
                    upnValidation.textContent = `Account found with ${result.domain} domain`;
                    upnValidation.className = 'validation-message valid';
                }
                
                // Store found UPN in dataset for later use
                if (upnInput) {
                    upnInput.dataset.foundUpn = result.account.userPrincipalName;
                }
                
                // Show the update section and set current display name
                if (accountUpdateSection) {
                    accountUpdateSection.classList.remove('hidden');
                }
                
                if (updateDisplayName) {
                    updateDisplayName.value = result.account.displayName || '';
                }
                
                // Show password and license sections
                if (accountPasswordSection) {
                    accountPasswordSection.classList.remove('hidden');
                }
                
                if (licensesSection) {
                    licensesSection.classList.remove('hidden');
                }
                
                // Check account status and group memberships
                await checkAccountStatus(result.account.userPrincipalName, ipcRenderer);
                
                // Check all group memberships
                await checkGroupMemberships(result.account.userPrincipalName, ipcRenderer);
            } else {
                // Account doesn't exist
                if (upnValidation) {
                    upnValidation.textContent = `Account "${upn}" not found`;
                    upnValidation.className = 'validation-message error';
                }
                
                // Hide all the other sections
                if (accountUpdateSection) {
                    accountUpdateSection.classList.add('hidden');
                }
                
                if (accountPasswordSection) {
                    accountPasswordSection.classList.add('hidden');
                }
                
                if (licensesSection) {
                    licensesSection.classList.add('hidden');
                }
            }
        } else {
            // Error occurred
            if (upnValidation) {
                upnValidation.textContent = result.error || 'Error checking account';
                upnValidation.className = 'validation-message error';
            }
            
            showToast(result.error || 'Error checking resource account', true);
        }
    } catch (error) {
        hideLoader();
        showToast(`Error checking resource account: ${(error as Error).message}`, true);
    }
}

export async function updateResourceAccount(upn: string, newDisplayName: string, ipcRenderer: any) {
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
        
        const updateSuccessMessage = document.getElementById('updateSuccessMessage');
        
        if (result.success) {
            // Show success message
            if (updateSuccessMessage) {
                updateSuccessMessage.textContent = `Display name updated to: ${newDisplayName}`;
                updateSuccessMessage.classList.remove('hidden');
            }
            showToast('Resource account updated successfully', false);
        } else {
            showToast(result.error || 'Failed to update resource account', true);
        }
    } catch (error) {
        hideLoader();
        showToast('Error updating resource account: ' + (error as Error).message, true);
    }
}

export async function resetPassword(upn: string, ipcRenderer: any) {
    const resetPasswordBtn = document.getElementById('resetPasswordBtn') as HTMLButtonElement;
    const passwordSuccessMessage = document.getElementById('passwordSuccessMessage');
    const passwordStatusIndicator = document.getElementById('passwordStatusIndicator');
    const passwordStatusText = document.getElementById('passwordStatusText');
    
    if (!resetPasswordBtn || !passwordSuccessMessage) return;
    
    try {
        // Check if UPN ends with onmicrosoft.com
        if (!upn.toLowerCase().endsWith('onmicrosoft.com')) {
            if (passwordStatusIndicator && passwordStatusText) {
                passwordStatusIndicator.className = 'indicator warning';
                passwordStatusText.textContent = 'Password reset is only available for cloud accounts. Changes for on-premises accounts must be done in on-premises Active Directory.';
            }
            showToast('Password reset only available for cloud accounts', false);
            return;
        }
        
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
            
            // Update the password status indicator
            if (passwordStatusIndicator && passwordStatusText) {
                passwordStatusIndicator.className = 'indicator success';
                passwordStatusText.textContent = 'Password reset to generic password';
            }
            
            showToast('Password reset successfully', false);
        } else {
            const errorMsg = result.error || 'Failed to reset password';
            
            // Use warning instead of error for permission issues
            if (errorMsg.includes("doesn't have permission") || errorMsg.includes("Insufficient privileges")) {
                showToast('Permission issue: The app needs User.ReadWrite.All permission in Azure AD', false);
                
                if (passwordStatusIndicator && passwordStatusText) {
                    passwordStatusIndicator.className = 'indicator warning';
                    passwordStatusText.textContent = 'Password reset requires User.ReadWrite.All permission in Azure AD';
                }
            } else {
                showToast(errorMsg, true);
            }
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
export async function checkAccountStatus(upn: string, ipcRenderer: any) {
    // Check account unlock status
    await checkAccountUnlockStatus(upn, ipcRenderer);
    
    // Update password status indicator based on account type
    const passwordStatusIndicator = document.getElementById('passwordStatusIndicator');
    const passwordStatusText = document.getElementById('passwordStatusText');
    
    if (passwordStatusIndicator && passwordStatusText) {
        if (upn.toLowerCase().endsWith('onmicrosoft.com')) {
            passwordStatusIndicator.className = 'indicator info';
            passwordStatusText.textContent = 'Cloud account - password can be reset';
        } else {
            passwordStatusIndicator.className = 'indicator warning';
            passwordStatusText.textContent = 'On-premises account - password must be managed in Active Directory';
        }
    }
    
    // Check group memberships
    await checkGroupMemberships(upn, ipcRenderer);
}

// Function to check if account is unlocked
async function checkAccountUnlockStatus(upn: string, ipcRenderer: any) {
    const accountLockedIndicator = document.getElementById('accountLockedIndicator');
    
    if (!accountLockedIndicator) return;
    
    try {
        // Set to loading state
        accountLockedIndicator.className = 'indicator';
        
        const result = await ipcRenderer.invoke('check-account-unlock', upn);
        
        if (result.success) {
            if (result.isUnlocked) {
                accountLockedIndicator.className = 'indicator success';
            } else {
                accountLockedIndicator.className = 'indicator error';
            }
        } else {
            accountLockedIndicator.className = 'indicator error';
            showToast(result.error || 'Failed to check account unlock status', true);
        }
    } catch (error) {
        accountLockedIndicator.className = 'indicator error';
        showToast('Error checking account unlock status: ' + (error as Error).message, true);
    }
}

// Function to check and update all group memberships
async function checkGroupMemberships(upn: string, ipcRenderer: any) {
    // Check MTR group membership
    await checkMtrGroupMembership(upn, ipcRenderer);
    
    // Check Room group membership
    await checkRoomGroupMembership(upn, ipcRenderer);
    
    // Check Pro license group membership
    await checkProGroupMembership(upn, ipcRenderer);
} 