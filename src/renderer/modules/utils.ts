// Helper Functions
export function updateStatusIndicator(element: HTMLElement, status: string, type: 'success' | 'error' | 'warning' = 'warning') {
    element.textContent = status;
    element.className = `value ${type}`;
}

export function updateStatus(message: string, isError: boolean = false, statusContainer: HTMLElement) {
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
export function generateRandomPassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

export function showLoader(message?: string) {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loaderText');
    if (loader) loader.classList.remove('hidden');
    if (loaderText) loaderText.textContent = message || 'Checking device...';
}

export function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
}

export function showToast(message: string, isError = false) {
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