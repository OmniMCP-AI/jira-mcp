/**
 * Jira MCP Server Types
 * Defines interfaces and types for Jira integration
 */

// Define JiraApiOptions interface manually since it might not be exported
export interface JiraApiOptions {
  protocol: 'http' | 'https';
  host: string;
  port?: number;
  apiVersion: string;
  base?: string;
  intermediatePath?: string;
  strictSSL?: boolean;
  request?: any;
  timeout?: number;
  username?: string;
  password?: string;
  oauth?: {
    consumer_key: string;
    private_key: string;
    token: string;
    token_secret: string;
    signature_method?: string;
  };
  bearer?: string;
}

// Jira configuration interfaces
export interface JiraConfig {
  host: string;
  protocol: 'http' | 'https';
  port?: number;
  apiVersion: string;
  auth: JiraAuthConfig;
}

export interface JiraAuthConfig {
  type: 'basic' | 'token' | 'oauth';
  username?: string;
  password?: string;
  email?: string;
  apiToken?: string;
  oauth?: {
    consumer_key: string;
    private_key: string;
    token: string;
    token_secret: string;
  };
}

// Tool parameter interfaces
export interface ListIssuesParams {
  jql?: string;
  maxResults?: number;
  startAt?: number;
  fields?: string;
}

export interface CreateIssueParams {
  projectKey: string;
  issueType: string;
  summary: string;
  description?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  customFields?: Record<string, any>;
}

// Jira API response types
export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      id: string;
    };
    priority?: {
      name: string;
      id: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    labels: string[];
    created: string;
    updated: string;
    [key: string]: any;
  };
}

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  subtask: boolean;
}

// Error types
export class JiraConnectionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'JiraConnectionError';
  }
}

export class JiraAuthenticationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'JiraAuthenticationError';
  }
}

export class JiraValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'JiraValidationError';
  }
}

// Environment variable schema
export interface EnvironmentVariables {
  JIRA_HOST: string;
  JIRA_PROTOCOL?: string;
  JIRA_PORT?: string;
  JIRA_API_VERSION?: string;
  JIRA_USERNAME?: string;
  JIRA_PASSWORD?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_OAUTH_CONSUMER_KEY?: string;
  JIRA_OAUTH_PRIVATE_KEY?: string;
  JIRA_OAUTH_TOKEN?: string;
  JIRA_OAUTH_TOKEN_SECRET?: string;
}

export interface AddCommentParams {
  issueKey: string;
  body: string;
}

export interface JiraComment {
  id: string;
  body: string;
  author: {
    displayName: string;
    emailAddress?: string;
    [key: string]: any;
  };
  created: string;
  updated: string;
  [key: string]: any;
}

// Group and group member types
export interface JiraGroup {
  name: string;
  self?: string;
  description?: string;
  [key: string]: any;
}

export interface JiraGroupMember {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
  [key: string]: any;
} 