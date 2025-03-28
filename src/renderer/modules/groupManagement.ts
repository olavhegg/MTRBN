import { showLoader, hideLoader, showToast } from './utils.js';

// Functions for checking group memberships
export async function checkMtrGroupMembership(upn: string, ipcRenderer: any) {
    console.log('Checking MTR group membership for:', upn);
    
    const mtrGroupIndicator = document.getElementById('mtrGroupIndicator');
    const addToMtrBtn = document.getElementById('addToMtrBtn') as HTMLButtonElement;
    const removeFromMtrBtn = document.getElementById('removeFromMtrBtn') as HTMLButtonElement;
    
    // Status section indicators
    const resourceGroupIndicator = document.getElementById('resourceGroupIndicator');
    const addToMtrStatusBtn = document.getElementById('addToMtrStatusBtn') as HTMLButtonElement;
    const removeFromMtrStatusBtn = document.getElementById('removeFromMtrStatusBtn') as HTMLButtonElement;
    
    console.log('Status buttons found:', {
        addToMtrBtn: !!addToMtrBtn,
        removeFromMtrBtn: !!removeFromMtrBtn,
        resourceGroupIndicator: !!resourceGroupIndicator,
        addToMtrStatusBtn: !!addToMtrStatusBtn,
        removeFromMtrStatusBtn: !!removeFromMtrStatusBtn
    });
    
    // Only return if BOTH sets of elements are missing
    if ((!mtrGroupIndicator || !addToMtrBtn || !removeFromMtrBtn) && 
        (!resourceGroupIndicator || !addToMtrStatusBtn || !removeFromMtrStatusBtn)) {
        console.log('No elements found to update for MTR group membership');
        return;
    }
    
    try {
        // Set to loading state for license section elements if they exist
        if (mtrGroupIndicator) {
            mtrGroupIndicator.className = 'indicator small';
        }
        if (addToMtrBtn) {
            addToMtrBtn.disabled = true;
        }
        if (removeFromMtrBtn) {
            removeFromMtrBtn.disabled = true;
        }
        
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
        console.log('MTR group membership result:', result);
        
        if (result.success) {
            if (result.isMember) {
                // Update license section indicators if they exist
                if (mtrGroupIndicator) {
                    mtrGroupIndicator.className = 'indicator small success';
                }
                if (addToMtrBtn) {
                    addToMtrBtn.disabled = true;
                }
                if (removeFromMtrBtn) {
                    removeFromMtrBtn.disabled = false;
                }
                
                // Update status section indicators if available
                if (resourceGroupIndicator) {
                    resourceGroupIndicator.className = 'indicator small success';
                }
                
                if (addToMtrStatusBtn) {
                    addToMtrStatusBtn.disabled = true;
                    console.log('Add button disabled because user is already a member');
                }
                
                if (removeFromMtrStatusBtn) {
                    removeFromMtrStatusBtn.disabled = false;
                    console.log('Remove button enabled because user is a member');
                }
            } else {
                // Update license section indicators if they exist
                if (mtrGroupIndicator) {
                    mtrGroupIndicator.className = 'indicator small error';
                }
                if (addToMtrBtn) {
                    addToMtrBtn.disabled = false;
                }
                if (removeFromMtrBtn) {
                    removeFromMtrBtn.disabled = true;
                }
                
                // Update status section indicators if available
                if (resourceGroupIndicator) {
                    resourceGroupIndicator.className = 'indicator small error';
                }
                
                if (addToMtrStatusBtn) {
                    addToMtrStatusBtn.disabled = false;
                    console.log('Add button enabled because user is not a member');
                }
                
                if (removeFromMtrStatusBtn) {
                    removeFromMtrStatusBtn.disabled = true;
                    console.log('Remove button disabled because user is not a member');
                }
            }
        } else {
            // Update license section indicators if they exist
            if (mtrGroupIndicator) {
                mtrGroupIndicator.className = 'indicator small error';
            }
            if (addToMtrBtn) {
                addToMtrBtn.disabled = true;
            }
            if (removeFromMtrBtn) {
                removeFromMtrBtn.disabled = true;
            }
            
            // Update status section indicators if available
            if (resourceGroupIndicator) {
                resourceGroupIndicator.className = 'indicator small error';
            }
            
            if (addToMtrStatusBtn) {
                addToMtrStatusBtn.disabled = true;
                console.log('Add button disabled because of error:', result.error);
            }
            
            if (removeFromMtrStatusBtn) {
                removeFromMtrStatusBtn.disabled = true;
                console.log('Remove button disabled because of error:', result.error);
            }
            
            showToast(result.error || 'Failed to check MTR group membership', true);
        }
    } catch (error) {
        console.error('Error in checkMtrGroupMembership:', error);
        
        // Update license section indicators if they exist
        if (mtrGroupIndicator) {
            mtrGroupIndicator.className = 'indicator small error';
        }
        if (addToMtrBtn) {
            addToMtrBtn.disabled = true;
        }
        if (removeFromMtrBtn) {
            removeFromMtrBtn.disabled = true;
        }
        
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
export async function checkRoomGroupMembership(upn: string, ipcRenderer: any) {
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
export async function checkProGroupMembership(upn: string, ipcRenderer: any) {
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
export async function addToMtrGroup(upn: string, ipcRenderer: any) {
    console.log('Adding user to MTR group:', upn);
    
    const addToMtrBtn = document.getElementById('addToMtrBtn') as HTMLButtonElement;
    const addToMtrStatusBtn = document.getElementById('addToMtrStatusBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    const mtrStatusSuccessMessage = document.getElementById('mtrStatusSuccessMessage');
    
    console.log('Add MTR buttons found:', {
        addToMtrBtn: !!addToMtrBtn,
        addToMtrStatusBtn: !!addToMtrStatusBtn,
        licenseSuccessMessage: !!licenseSuccessMessage,
        mtrStatusSuccessMessage: !!mtrStatusSuccessMessage
    });
    
    // Don't return if one of the buttons is missing - it might be in a different section
    if (!addToMtrBtn && !addToMtrStatusBtn) {
        console.log('No add buttons found for MTR group');
        return;
    }
    
    try {
        // Disable button and show loading state
        if (addToMtrBtn) {
            addToMtrBtn.disabled = true;
            addToMtrBtn.textContent = 'Adding...';
        }
        
        if (addToMtrStatusBtn) {
            addToMtrStatusBtn.disabled = true;
            addToMtrStatusBtn.textContent = 'Adding...';
        }
        
        const result = await ipcRenderer.invoke('add-to-mtr-group', upn);
        console.log('Add to MTR group result:', result);
        
        // Reset button state
        if (addToMtrBtn) {
            addToMtrBtn.textContent = 'Add';
        }
        
        if (addToMtrStatusBtn) {
            addToMtrStatusBtn.textContent = 'Add';
        }
        
        if (result.success) {
            // Show success message in license section if available
            if (licenseSuccessMessage) {
                licenseSuccessMessage.textContent = result.message;
                licenseSuccessMessage.classList.remove('hidden');
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    licenseSuccessMessage.classList.add('hidden');
                }, 5000);
            }
            
            // Show success message in status section if available
            if (mtrStatusSuccessMessage) {
                mtrStatusSuccessMessage.textContent = result.message;
                mtrStatusSuccessMessage.classList.remove('hidden');
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    mtrStatusSuccessMessage.classList.add('hidden');
                }, 5000);
            }
            
            // Refresh membership status
            console.log('Refreshing MTR group membership after add operation');
            await checkMtrGroupMembership(upn, ipcRenderer);
            
            showToast('Added to MTR Resource Accounts group', false);
        } else {
            if (addToMtrBtn) addToMtrBtn.disabled = false;
            if (addToMtrStatusBtn) addToMtrStatusBtn.disabled = false;
            showToast(result.error || 'Failed to add to MTR group', true);
        }
    } catch (error) {
        console.error('Error in addToMtrGroup:', error);
        if (addToMtrBtn) {
            addToMtrBtn.disabled = false;
            addToMtrBtn.textContent = 'Add';
        }
        if (addToMtrStatusBtn) {
            addToMtrStatusBtn.disabled = false;
            addToMtrStatusBtn.textContent = 'Add';
        }
        showToast('Error adding to MTR group: ' + (error as Error).message, true);
    }
}

// Function to remove user from MTR group
export async function removeFromMtrGroup(upn: string, ipcRenderer: any) {
    console.log('Removing user from MTR group:', upn);
    
    const removeFromMtrBtn = document.getElementById('removeFromMtrBtn') as HTMLButtonElement;
    const removeFromMtrStatusBtn = document.getElementById('removeFromMtrStatusBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    const mtrStatusSuccessMessage = document.getElementById('mtrStatusSuccessMessage');
    
    console.log('Remove MTR buttons found:', {
        removeFromMtrBtn: !!removeFromMtrBtn,
        removeFromMtrStatusBtn: !!removeFromMtrStatusBtn,
        licenseSuccessMessage: !!licenseSuccessMessage,
        mtrStatusSuccessMessage: !!mtrStatusSuccessMessage
    });
    
    // Don't return if one of the buttons is missing - it might be in a different section
    if (!removeFromMtrBtn && !removeFromMtrStatusBtn) {
        console.log('No remove buttons found for MTR group');
        return;
    }
    
    try {
        // Disable button and show loading state
        if (removeFromMtrBtn) {
            removeFromMtrBtn.disabled = true;
            removeFromMtrBtn.textContent = 'Removing...';
        }
        
        if (removeFromMtrStatusBtn) {
            removeFromMtrStatusBtn.disabled = true;
            removeFromMtrStatusBtn.textContent = 'Removing...';
        }
        
        const result = await ipcRenderer.invoke('remove-from-mtr-group', upn);
        console.log('Remove from MTR group result:', result);
        
        // Reset button state
        if (removeFromMtrBtn) {
            removeFromMtrBtn.textContent = 'Remove';
        }
        
        if (removeFromMtrStatusBtn) {
            removeFromMtrStatusBtn.textContent = 'Remove';
        }
        
        if (result.success) {
            // Show success message in license section if available
            if (licenseSuccessMessage) {
                licenseSuccessMessage.textContent = result.message;
                licenseSuccessMessage.classList.remove('hidden');
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    licenseSuccessMessage.classList.add('hidden');
                }, 5000);
            }
            
            // Show success message in status section if available
            if (mtrStatusSuccessMessage) {
                mtrStatusSuccessMessage.textContent = result.message;
                mtrStatusSuccessMessage.classList.remove('hidden');
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    mtrStatusSuccessMessage.classList.add('hidden');
                }, 5000);
            }
            
            // Refresh membership status
            console.log('Refreshing MTR group membership after remove operation');
            await checkMtrGroupMembership(upn, ipcRenderer);
            
            showToast('Removed from MTR Resource Accounts group', false);
        } else {
            if (removeFromMtrBtn) removeFromMtrBtn.disabled = false;
            if (removeFromMtrStatusBtn) removeFromMtrStatusBtn.disabled = false;
            showToast(result.error || 'Failed to remove from MTR group', true);
        }
    } catch (error) {
        console.error('Error in removeFromMtrGroup:', error);
        if (removeFromMtrBtn) {
            removeFromMtrBtn.disabled = false;
            removeFromMtrBtn.textContent = 'Remove';
        }
        if (removeFromMtrStatusBtn) {
            removeFromMtrStatusBtn.disabled = false;
            removeFromMtrStatusBtn.textContent = 'Remove'; 
        }
        showToast('Error removing from MTR group: ' + (error as Error).message, true);
    }
}

// Function to add user to Room group
export async function addToRoomGroup(upn: string, ipcRenderer: any) {
    const addToRoomBtn = document.getElementById('addToRoomBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!addToRoomBtn) return;
    
    try {
        // Disable button and show loading state
        addToRoomBtn.disabled = true;
        addToRoomBtn.textContent = 'Adding...';
        
        const result = await ipcRenderer.invoke('add-to-room-group', upn);
        
        // Reset button state
        addToRoomBtn.textContent = 'Add';
        
        if (result.success) {
            if (licenseSuccessMessage) {
                licenseSuccessMessage.textContent = result.message;
                licenseSuccessMessage.classList.remove('hidden');
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    licenseSuccessMessage.classList.add('hidden');
                }, 5000);
            }
            
            // Refresh membership status
            checkRoomGroupMembership(upn, ipcRenderer);
            
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
export async function removeFromRoomGroup(upn: string, ipcRenderer: any) {
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
            checkRoomGroupMembership(upn, ipcRenderer);
            
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
export async function addToProGroup(upn: string, ipcRenderer: any) {
    const addToProBtn = document.getElementById('addToProBtn') as HTMLButtonElement;
    const licenseSuccessMessage = document.getElementById('licenseSuccessMessage');
    
    if (!addToProBtn) return;
    
    try {
        // Disable button and show loading state
        addToProBtn.disabled = true;
        addToProBtn.textContent = 'Adding...';
        
        const result = await ipcRenderer.invoke('add-to-pro-group', upn);
        
        // Reset button state
        addToProBtn.textContent = 'Add';
        
        if (result.success) {
            if (licenseSuccessMessage) {
                licenseSuccessMessage.textContent = result.message;
                licenseSuccessMessage.classList.remove('hidden');
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    licenseSuccessMessage.classList.add('hidden');
                }, 5000);
            }
            
            // Refresh membership status
            checkProGroupMembership(upn, ipcRenderer);
            
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
export async function removeFromProGroup(upn: string, ipcRenderer: any) {
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
            checkProGroupMembership(upn, ipcRenderer);
            
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

// Function to run group diagnostics
export async function runGroupDiagnostics(ipcRenderer: any) {
    try {
        console.log('Running group diagnostics...');
        const diagnosticResult = await ipcRenderer.invoke('group-diagnostic');
        console.log('Group Diagnostics:', diagnosticResult);
        return diagnosticResult;
    } catch (error) {
        console.error('Error running group diagnostics:', error);
        return { success: false, error: (error as Error).message };
    }
}

// Function to get license information
export async function getLicenseInfo(ipcRenderer: any): Promise<{
    success: boolean;
    error?: string;
    licenses?: {
        teamsRoomsPro: {
            total: number;
            used: number;
            available: number;
        };
        teamsSharedDevices: {
            total: number;
            used: number;
            available: number;
        };
    };
}> {
    try {
        showLoader('Getting license information...');
        
        const result = await ipcRenderer.invoke('get-license-info');
        
        hideLoader();
        
        if (result.success) {
            return {
                success: true,
                licenses: result.licenses
            };
        } else {
            showToast(result.error || 'Failed to get license information', true);
            return {
                success: false,
                error: result.error || 'Failed to get license information'
            };
        }
    } catch (error) {
        hideLoader();
        const errorMessage = 'Error getting license information: ' + (error as Error).message;
        showToast(errorMessage, true);
        return {
            success: false,
            error: errorMessage
        };
    }
} 