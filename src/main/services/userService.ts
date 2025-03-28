import { GraphBaseService } from './graphBaseService';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserService');

interface UserAccount {
    displayName: string;
    userPrincipalName: string;
    accountEnabled: boolean;
    passwordProfile?: {
        password: string;
        forceChangePasswordNextSignIn: boolean;
        passwordPolicies: string;
    };
}

export class UserService extends GraphBaseService {
    private static instance: UserService;

    private constructor() {
        super();
    }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    public async checkUser(upn: string): Promise<any> {
        try {
            const client = await this.getClient();
            return await client.api(`https://graph.microsoft.com/beta/users/${upn}`).get();
        } catch (error) {
            logger.error('Error checking user:', error);
            throw error;
        }
    }

    public async createUser(displayName: string, upn: string): Promise<any> {
        try {
            const client = await this.getClient();
            const user: UserAccount = {
                displayName,
                userPrincipalName: upn,
                accountEnabled: true,
                passwordProfile: {
                    password: process.env.GENERICPASSWORD || 'ChangeMe123!',
                    forceChangePasswordNextSignIn: false,
                    passwordPolicies: 'DisablePasswordExpiration'
                }
            };

            return await client.api('https://graph.microsoft.com/beta/users').post(user);
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    public async updateUserDisplayName(upn: string, displayName: string): Promise<any> {
        try {
            const client = await this.getClient();
            const user = {
                displayName
            };

            logger.info(`Updating display name for ${upn} to "${displayName}"`);
            return await client.api(`https://graph.microsoft.com/beta/users/${upn}`).patch(user);
        } catch (error) {
            logger.error('Error updating user display name:', error);
            throw error;
        }
    }

    public async resetUserPassword(upn: string): Promise<any> {
        try {
            const client = await this.getClient();
            const genericPassword = process.env.GENERICPASSWORD;
            
            if (!genericPassword) {
                throw new Error("Generic password not defined in environment variables");
            }
            
            logger.info(`Resetting password for user: ${upn}`);
            
            // First, check if user exists
            const user = await this.checkUser(upn);
            if (!user) {
                throw new Error(`User ${upn} not found`);
            }
            
            // Create simplified password profile (based on example code)
            const passwordProfile = {
                passwordProfile: {
                    password: genericPassword,
                    forceChangePasswordNextSignIn: false
                }
            };
            
            // Execute the password reset
            try {
                const result = await client.api(`/users/${upn}`).version("beta").patch(passwordProfile);
                logger.info(`Password reset successful for ${upn}`);
                return result;
            } catch (error) {
                if (error instanceof Error && error.message.includes('Insufficient privileges')) {
                    throw new Error("The application doesn't have permission to reset passwords. The app token requires User.ReadWrite.All permission with admin consent in Azure AD. Contact your administrator to grant these permissions.");
                }
                throw error;
            }
        } catch (error) {
            logger.error('Error resetting user password:', error);
            throw error;
        }
    }

    /**
     * Checks if a user account is unlocked (not blocked)
     */
    public async checkAccountUnlocked(upn: string): Promise<{ isUnlocked: boolean; message: string }> {
        try {
            logger.info(`Checking account unlock status for: ${upn}`);
            const client = await this.getClient();
            
            // Query the user with specific attributes
            const user = await client.api(`/users/${upn}`)
                .select('id,userPrincipalName,accountEnabled,userType')
                .get();
            
            if (!user) {
                return {
                    isUnlocked: false,
                    message: "Account not found"
                };
            }
            
            if (!user.accountEnabled) {
                return {
                    isUnlocked: false,
                    message: "Account is blocked/disabled"
                };
            }
            
            return {
                isUnlocked: true,
                message: "Account is active and not blocked"
            };
        } catch (error) {
            logger.error('Error checking account unlock status:', error);
            return {
                isUnlocked: false,
                message: `Error: ${(error as Error).message}`
            };
        }
    }
} 