/**
 * Jira Client Adapter
 * Implements dependency inversion principle by abstracting jira-client
 */

import JiraApi from 'jira-client';
import { 
  JiraConfig, 
  JiraIssue, 
  JiraSearchResult, 
  ListIssuesParams, 
  CreateIssueParams,
  JiraConnectionError,
  JiraAuthenticationError,
  JiraValidationError,
  AddCommentParams,
  JiraComment,
} from '../types/index.js';

export interface IJiraClient {
  connect(): Promise<void>;
  searchIssues(params: ListIssuesParams): Promise<JiraSearchResult>;
  createIssue(params: CreateIssueParams): Promise<JiraIssue>;
  testConnection(): Promise<boolean>;
  addComment(issueKey: string, body: string): Promise<JiraComment>;
  // 已移除 group 相关方法
}

export class JiraClientAdapter implements IJiraClient {
  private client: JiraApi | null = null;
  private readonly config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
  }

  /**
   * Initialize the Jira client connection
   * @throws JiraConnectionError if connection fails
   */
  public async connect(): Promise<void> {
    try {
      const clientOptions = this.buildClientOptions();
      this.client = new JiraApi(clientOptions);
      
      // Test the connection
      await this.testConnection();
    } catch (error) {
      throw new JiraConnectionError(
        `Failed to connect to Jira: ${this.getErrorMessage(error)}`,
        error
      );
    }
  }

  /**
   * Search for Jira issues
   * @param params - Search parameters
   * @returns Search results with issues
   */
  public async searchIssues(params: ListIssuesParams): Promise<JiraSearchResult> {
    this.ensureConnected();
    
    try {
      const searchOptions = {
        jql: params.jql || '',
        startAt: params.startAt || 0,
        maxResults: params.maxResults || 50,
        fields: params.fields ? params.fields.split(',') : undefined
      };

      const result = await this.client!.searchJira(
        searchOptions.jql,
        searchOptions
      );

      return {
        expand: result.expand || '',
        startAt: result.startAt,
        maxResults: result.maxResults,
        total: result.total,
        issues: result.issues || []
      };
    } catch (error) {
      this.handleJiraError(error, 'search issues');
      throw error; // This will never be reached due to handleJiraError throwing
    }
  }

  /**
   * Create a new Jira issue
   * @param params - Issue creation parameters
   * @returns Created issue object
   */
  public async createIssue(params: CreateIssueParams): Promise<JiraIssue> {
    this.ensureConnected();
    this.validateCreateIssueParams(params);

    try {
      const issueData = this.buildIssueData(params);
      const result = await this.client!.addNewIssue(issueData);
      
      // Fetch the complete issue data
      const issue = await this.client!.findIssue(result.key);
      return issue as JiraIssue;
    } catch (error) {
      this.handleJiraError(error, 'create issue');
      throw error; // This will never be reached due to handleJiraError throwing
    }
  }

  /**
   * Test the Jira connection
   * @returns True if connection is successful
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.getCurrentUser();
      return true;
    } catch (error) {
      if (this.isAuthenticationError(error)) {
        throw new JiraAuthenticationError(
          `Authentication failed: ${this.getErrorMessage(error)}`,
          error
        );
      }
      throw new JiraConnectionError(
        `Connection test failed: ${this.getErrorMessage(error)}`,
        error
      );
    }
  }

  /**
   * Add a comment to a Jira issue
   * @param issueKey - The key of the issue
   * @param body - The comment body
   * @returns The created comment object
   */
  public async addComment(issueKey: string, body: string): Promise<JiraComment> {
    this.ensureConnected();
    if (!issueKey || typeof issueKey !== 'string') {
      throw new JiraValidationError('issueKey is required and must be a string', 'issueKey');
    }
    if (!body || typeof body !== 'string') {
      throw new JiraValidationError('body is required and must be a string', 'body');
    }
    try {
      const comment = await this.client!.addComment(issueKey, body);
      return comment as JiraComment;
    } catch (error) {
      this.handleJiraError(error, 'add comment');
      throw error;
    }
  }

  /**
   * Build jira-client options from config
   */
  private buildClientOptions(): any {
    const baseOptions = {
      protocol: this.config.protocol,
      host: this.config.host,
      port: this.config.port,
      apiVersion: this.config.apiVersion,
      strictSSL: this.config.protocol === 'https'
    };

    switch (this.config.auth.type) {
      case 'basic':
        return {
          ...baseOptions,
          username: this.config.auth.username,
          password: this.config.auth.password
        };
      
      case 'token':
        return {
          ...baseOptions,
          username: this.config.auth.email,
          password: this.config.auth.apiToken
        };
      
      case 'oauth':
        return {
          ...baseOptions,
          oauth: this.config.auth.oauth
        };
      
      default:
        throw new JiraValidationError('Unsupported authentication type');
    }
  }

  /**
   * Build issue data for creation
   */
  private buildIssueData(params: CreateIssueParams): any {
    const issueData: any = {
      fields: {
        project: { key: params.projectKey },
        issuetype: { name: params.issueType },
        summary: params.summary
      }
    };

    if (params.description) {
      issueData.fields.description = params.description;
    }

    if (params.priority) {
      issueData.fields.priority = { name: params.priority };
    }

    if (params.assignee) {
      issueData.fields.assignee = { name: params.assignee };
    }

    if (params.labels && params.labels.length > 0) {
      issueData.fields.labels = params.labels;
    }

    // Add custom fields
    if (params.customFields) {
      Object.assign(issueData.fields, params.customFields);
    }

    return issueData;
  }

  /**
   * Validate create issue parameters
   */
  private validateCreateIssueParams(params: CreateIssueParams): void {
    if (!params.projectKey) {
      throw new JiraValidationError('Project key is required', 'projectKey');
    }

    if (!params.issueType) {
      throw new JiraValidationError('Issue type is required', 'issueType');
    }

    if (!params.summary || params.summary.trim().length === 0) {
      throw new JiraValidationError('Summary is required and cannot be empty', 'summary');
    }

    if (params.summary.length > 255) {
      throw new JiraValidationError('Summary cannot exceed 255 characters', 'summary');
    }
  }

  /**
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.client) {
      throw new JiraConnectionError('Jira client is not connected. Call connect() first.');
    }
  }

  /**
   * Handle Jira API errors with appropriate error types
   */
  private handleJiraError(error: any, operation: string): never {
    const message = this.getErrorMessage(error);
    
    if (this.isAuthenticationError(error)) {
      throw new JiraAuthenticationError(`Failed to ${operation}: ${message}`, error);
    }
    
    if (this.isValidationError(error)) {
      throw new JiraValidationError(`Failed to ${operation}: ${message}`, error);
    }
    
    throw new JiraConnectionError(`Failed to ${operation}: ${message}`, error);
  }

  /**
   * Check if error is authentication related
   */
  private isAuthenticationError(error: any): boolean {
    return error?.statusCode === 401 || 
           error?.status === 401 ||
           (typeof error?.message === 'string' && 
            error.message.toLowerCase().includes('unauthorized'));
  }

  /**
   * Check if error is validation related
   */
  private isValidationError(error: any): boolean {
    return error?.statusCode === 400 || 
           error?.status === 400 ||
           (typeof error?.message === 'string' && 
            (error.message.toLowerCase().includes('validation') ||
             error.message.toLowerCase().includes('invalid')));
  }

  /**
   * Extract error message from various error formats
   */
  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.errorMessages && Array.isArray(error.errorMessages)) {
      return error.errorMessages.join(', ');
    }
    
    if (error?.errors) {
      const errorMessages = Object.values(error.errors);
      if (errorMessages.length > 0) {
        return errorMessages.join(', ');
      }
    }
    
    return 'Unknown error occurred';
  }
} 