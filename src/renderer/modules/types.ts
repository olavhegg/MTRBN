// Interface definitions
export interface DeviceStatus {
    intuneStatus: boolean;
    tacStatus: boolean;
    accountStatus: boolean;
    groupsStatus: { [key: string]: boolean };
    isProvisioned: {
        intune: boolean;
        tac: boolean;
    };
} 