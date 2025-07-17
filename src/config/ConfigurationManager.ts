/**
 * Configuration Manager
 * Handles environment variable configuration following Single Responsibility Principle
 */

import { 
  JiraConfig, 
  JiraAuthConfig, 
  EnvironmentVariables, 
  JiraValidationError,
  JiraAuthenticationError
} from '../types/index.js';

export interface IConfigurationManager {
  loadConfiguration(): JiraConfig;
  validateConfiguration(config: JiraConfig): void;
}

export class ConfigurationManager implements IConfigurationManager {
  private readonly env: NodeJS.ProcessEnv;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
  }

  /**
   * Load Jira configuration from environment variables
   * @returns JiraConfig object
   * @throws JiraValidationError if required variables are missing
   */
  public loadConfiguration(): JiraConfig {
    const host = this.getRequiredEnvVar('JIRA_HOST');
    const protocol = this.getEnvVar('JIRA_PROTOCOL', 'https') as 'http' | 'https';
    const port = this.parsePort(this.getEnvVar('JIRA_PORT'));
    const apiVersion = this.getEnvVar('JIRA_API_VERSION', '2');

    const auth = this.loadAuthConfiguration();

    const config: JiraConfig = {
      host,
      protocol,
      port,
      apiVersion,
      auth
    };

    this.validateConfiguration(config);
    return config;
  }

  /**
   * Validate the loaded configuration
   * @param config - The configuration to validate
   * @throws JiraValidationError if configuration is invalid
   */
  public validateConfiguration(config: JiraConfig): void {
    if (!config.host) {
      throw new JiraValidationError('JIRA_HOST is required', 'host');
    }

    if (!['http', 'https'].includes(config.protocol)) {
      throw new JiraValidationError('JIRA_PROTOCOL must be http or https', 'protocol');
    }

    if (config.port !== undefined && (config.port < 1 || config.port > 65535)) {
      throw new JiraValidationError('JIRA_PORT must be between 1 and 65535', 'port');
    }

    this.validateAuthConfiguration(config.auth);
  }

  /**
   * Load authentication configuration from environment variables
   * @returns JiraAuthConfig object
   * @throws JiraAuthenticationError if no valid auth method is found
   */
  private loadAuthConfiguration(): JiraAuthConfig {
    // Try OAuth first
    if (this.hasOAuthCredentials()) {
      return {
        type: 'oauth',
        oauth: {
          consumer_key: this.getRequiredEnvVar('JIRA_OAUTH_CONSUMER_KEY'),
          private_key: this.getRequiredEnvVar('JIRA_OAUTH_PRIVATE_KEY'),
          token: this.getRequiredEnvVar('JIRA_OAUTH_TOKEN'),
          token_secret: this.getRequiredEnvVar('JIRA_OAUTH_TOKEN_SECRET')
        }
      };
    }

    // Try API token authentication
    if (this.hasTokenCredentials()) {
      return {
        type: 'token',
        email: this.getRequiredEnvVar('JIRA_EMAIL'),
        apiToken: this.getRequiredEnvVar('JIRA_API_TOKEN')
      };
    }

    // Try basic authentication
    if (this.hasBasicCredentials()) {
      return {
        type: 'basic',
        username: this.getRequiredEnvVar('JIRA_USERNAME'),
        password: this.getRequiredEnvVar('JIRA_PASSWORD')
      };
    }

    throw new JiraAuthenticationError(
      'No valid authentication method found. Please provide one of: ' +
      'OAuth (JIRA_OAUTH_*), API Token (JIRA_EMAIL + JIRA_API_TOKEN), ' +
      'or Basic Auth (JIRA_USERNAME + JIRA_PASSWORD)'
    );
  }

  /**
   * Validate authentication configuration
   * @param auth - The auth config to validate
   */
  private validateAuthConfiguration(auth: JiraAuthConfig): void {
    switch (auth.type) {
      case 'oauth':
        if (!auth.oauth?.consumer_key || !auth.oauth?.private_key || 
            !auth.oauth?.token || !auth.oauth?.token_secret) {
          throw new JiraAuthenticationError('OAuth configuration is incomplete');
        }
        break;
      case 'token':
        if (!auth.email || !auth.apiToken) {
          throw new JiraAuthenticationError('API token configuration requires email and apiToken');
        }
        break;
      case 'basic':
        if (!auth.username || !auth.password) {
          throw new JiraAuthenticationError('Basic auth configuration requires username and password');
        }
        break;
      default:
        throw new JiraAuthenticationError('Unknown authentication type');
    }
  }

  /**
   * Check if OAuth credentials are available
   */
  private hasOAuthCredentials(): boolean {
    return !!(
      this.env.JIRA_OAUTH_CONSUMER_KEY &&
      this.env.JIRA_OAUTH_PRIVATE_KEY &&
      this.env.JIRA_OAUTH_TOKEN &&
      this.env.JIRA_OAUTH_TOKEN_SECRET
    );
  }

  /**
   * Check if API token credentials are available
   */
  private hasTokenCredentials(): boolean {
    return !!(this.env.JIRA_EMAIL && this.env.JIRA_API_TOKEN);
  }

  /**
   * Check if basic auth credentials are available
   */
  private hasBasicCredentials(): boolean {
    return !!(this.env.JIRA_USERNAME && this.env.JIRA_PASSWORD);
  }

  /**
   * Get required environment variable
   * @param key - Environment variable key
   * @throws JiraValidationError if variable is not set
   */
  private getRequiredEnvVar(key: string): string {
    const value = this.env[key];
    if (!value) {
      throw new JiraValidationError(`Required environment variable ${key} is not set`, key);
    }
    return value;
  }

  /**
   * Get optional environment variable with default value
   * @param key - Environment variable key
   * @param defaultValue - Default value if not set
   */
  private getEnvVar(key: string, defaultValue: string = ''): string {
    return this.env[key] || defaultValue;
  }

  /**
   * Parse port number from string
   * @param portStr - Port string from environment variable
   * @returns Port number or undefined
   */
  private parsePort(portStr: string): number | undefined {
    if (!portStr) return undefined;
    
    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
      throw new JiraValidationError(`Invalid port number: ${portStr}`, 'port');
    }
    
    return port;
  }
} 