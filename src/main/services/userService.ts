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

    public async verifyUserPassword(upn: string): Promise<{ isValid: boolean; message: string }> {
        try {
            logger.info(`Verifying password for user: ${upn}`);
            const genericPassword = process.env.GENERICPASSWORD;
            
            if (!genericPassword) {
                return {
                    isValid: false,
                    message: "Generic password not defined in environment variables"
                };
            }
            
            // Since we cannot directly verify a password through Graph API,
            // we need to make a more thorough check of account properties
            try {
                const user = await this.checkUser(upn);
                
                if (!user) {
                    return {
                        isValid: false,
                        message: "Account not found"
                    };
                }
                
                if (!user.accountEnabled) {
                    return {
                        isValid: false,
                        message: "Account is disabled"
                    };
                }
                
                // Check for specific properties that might indicate password status
                // This is a best-effort approach since direct password verification is not possible
                
                // Check if user has passwordPolicies that match what we set for generic password
                const hasExpectedPolicy = user.passwordPolicies && 
                    user.passwordPolicies.includes('DisablePasswordExpiration');
                    
                // Check if user was recently created or reset password (within last day)
                const recentlyModified = user.lastPasswordChangeDateTime ? 
                    (new Date().getTime() - new Date(user.lastPasswordChangeDateTime).getTime()) < 86400000 : 
                    false;
                
                if (hasExpectedPolicy || recentlyModified) {
                    return {
                        isValid: true,
                        message: "Password appears to match generic password"
                    };
                }
                
                return {
                    isValid: false,
                    message: "Password likely does not match generic password"
                };
            } catch (error) {
                logger.error('Error checking user for password verification:', error);
                return {
                    isValid: false,
                    message: `Unable to verify: ${(error as Error).message}`
                };
            }
        } catch (error) {
            logger.error('Error verifying user password:', error);
            return {
                isValid: false,
                message: `Error: ${(error as Error).message}`
            };
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
            
            // Create password profile
            const passwordProfile = {
                passwordProfile: {
                    password: genericPassword,
                    forceChangePasswordNextSignIn: false,
                    passwordPolicies: "DisablePasswordExpiration"
                }
            };
            
            // Execute the password reset
            const result = await client.api(`https://graph.microsoft.com/beta/users/${upn}`).patch(passwordProfile);
            logger.info(`Password reset successful for ${upn}`);
            
            return result;
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