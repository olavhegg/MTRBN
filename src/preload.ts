import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
interface ElectronAPI {
    ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
        on(channel: string, func: (...args: any[]) => void): void;
        once(channel: string, func: (...args: any[]) => void): void;
        removeListener(channel: string, func: (...args: any[]) => void): void;
    }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        ipcRenderer: {
            invoke: (channel: string, ...args: any[]) => {
                const validChannels = [
                    'validate-device',
                    'check-device-serial',
                    'provision-device',
                    'setup-device',
                    'quit-app'
                ];
                if (validChannels.includes(channel)) {
                    return ipcRenderer.invoke(channel, ...args);
                }
                throw new Error(`Invalid channel: ${channel}`);
            },
            on: (channel: string, func: (...args: any[]) => void) => {
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            },
            once: (channel: string, func: (...args: any[]) => void) => {
                ipcRenderer.once(channel, (event, ...args) => func(...args));
            },
            removeListener: (channel: string, func: (...args: any[]) => void) => {
                ipcRenderer.removeListener(channel, func);
            }
        }
    } as ElectronAPI
); 