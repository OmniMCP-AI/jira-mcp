/**
 * Create Issue Tool
 * MCP tool for creating new Jira issues
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IJiraClient } from '../jira/JiraClientAdapter.js';
import { CreateIssueParams, JiraIssue } from '../types/index.js';

export interface ICreateIssueTool {
  getDefinition(): Tool;
  execute(args: any): Promise<JiraIssue>;
}

export class CreateIssueTool implements ICreateIssueTool {
  private readonly jiraClient: IJiraClient;

  constructor(jiraClient: IJiraClient) {
    this.jiraClient = jiraClient;
  }

  /**
   * Get the MCP tool definition
   */
  public getDefinition(): Tool {
    return {
      name: 'create-issue',
      description: 'Create a new Jira issue with proper field validation',
      inputSchema: {
        type: 'object',
        properties: {
          projectKey: {
            type: 'string',
            description: 'The project key where the issue will be created (e.g., "PROJ", "DEV")',
            pattern: '^[A-Z][A-Z0-9]*$'
          },
          issueType: {
            type: 'string',
            description: 'The type of issue to create (e.g., "Bug", "Task", "Story", "Epic")'
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the issue (required, max 255 characters)',
            maxLength: 255
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue (optional)'
          },
          priority: {
            type: 'string',
            description: 'Priority level (e.g., "High", "Medium", "Low", "Critical", "Blocker")'
          },
          assignee: {
            type: 'string',
            description: 'Username or email of the person to assign the issue to'
          },
          labels: {
            type: 'array',
            description: 'Array of labels to add to the issue',
            items: {
              type: 'string'
            }
          },
          customFields: {
            type: 'object',
            description: 'Custom field values as key-value pairs (field names should be in customfield_xxxxx format)',
            additionalProperties: true
          }
        },
        required: ['projectKey', 'issueType', 'summary'],
        additionalProperties: false
      }
    };
  }

  /**
   * Execute the create-issue tool
   * @param args - Tool arguments
   * @returns Created issue object
   */
  public async execute(args: any): Promise<JiraIssue> {
    const params = this.validateAndParseParams(args);
    
    try {
      const issue = await this.jiraClient.createIssue(params);
      
      // Return enhanced result with success information
      return {
        ...issue,
        metadata: {
          created: true,
          url: this.buildIssueUrl(issue.key),
          message: `Issue ${issue.key} created successfully`
        }
      } as JiraIssue;
    } catch (error) {
      throw new Error(`Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and parse tool parameters
   * @param args - Raw arguments from MCP
   * @returns Validated CreateIssueParams
   */
  private validateAndParseParams(args: any): CreateIssueParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments are required for creating an issue');
    }

    // Validate required fields
    if (!args.projectKey || typeof args.projectKey !== 'string') {
      throw new Error('projectKey is required and must be a string');
    }

    if (!args.issueType || typeof args.issueType !== 'string') {
      throw new Error('issueType is required and must be a string');
    }

    if (!args.summary || typeof args.summary !== 'string') {
      throw new Error('summary is required and must be a string');
    }

    // Validate project key format
    const projectKeyPattern = /^[A-Z][A-Z0-9]*$/;
    if (!projectKeyPattern.test(args.projectKey)) {
      throw new Error('projectKey must contain only uppercase letters and numbers, starting with a letter');
    }

    // Validate summary length
    if (args.summary.trim().length === 0) {
      throw new Error('summary cannot be empty');
    }

    if (args.summary.length > 255) {
      throw new Error('summary cannot exceed 255 characters');
    }

    const params: CreateIssueParams = {
      projectKey: args.projectKey.trim().toUpperCase(),
      issueType: args.issueType.trim(),
      summary: args.summary.trim()
    };

    // Validate optional fields
    if (args.description !== undefined) {
      if (typeof args.description !== 'string') {
        throw new Error('description must be a string');
      }
      params.description = args.description.trim();
    }

    if (args.priority !== undefined) {
      if (typeof args.priority !== 'string') {
        throw new Error('priority must be a string');
      }
      params.priority = args.priority.trim();
    }

    if (args.assignee !== undefined) {
      if (typeof args.assignee !== 'string') {
        throw new Error('assignee must be a string');
      }
      params.assignee = args.assignee.trim();
    }

    if (args.labels !== undefined) {
      if (!Array.isArray(args.labels)) {
        throw new Error('labels must be an array');
      }
      
      const validLabels = args.labels.filter((label: any) => {
        if (typeof label !== 'string') {
          throw new Error('all labels must be strings');
        }
        return label.trim().length > 0;
      }).map((label: string) => label.trim());

      if (validLabels.length > 0) {
        params.labels = validLabels;
      }
    }

    if (args.customFields !== undefined) {
      if (typeof args.customFields !== 'object' || Array.isArray(args.customFields)) {
        throw new Error('customFields must be an object');
      }
      
      // Validate custom field keys (should follow Jira's custom field naming)
      const validCustomFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(args.customFields)) {
        if (typeof key !== 'string' || key.trim().length === 0) {
          throw new Error('custom field keys must be non-empty strings');
        }
        
        // Basic validation for custom field format
        if (!key.startsWith('customfield_') && !key.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)) {
          console.warn(`Custom field key "${key}" may not be valid. Consider using customfield_xxxxx format.`);
        }
        
        validCustomFields[key] = value;
      }
      
      if (Object.keys(validCustomFields).length > 0) {
        params.customFields = validCustomFields;
      }
    }

    return params;
  }

  /**
   * Build issue URL for easier access
   * @param issueKey - The issue key
   * @returns URL to the issue (placeholder for now)
   */
  private buildIssueUrl(issueKey: string): string {
    // Note: In a real implementation, we'd need the Jira base URL from config
    return `<jira-instance>/browse/${issueKey}`;
  }
} 