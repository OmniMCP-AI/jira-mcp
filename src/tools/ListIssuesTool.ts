/**
 * List Issues Tool
 * MCP tool for searching and retrieving Jira issues
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IJiraClient } from '../jira/JiraClientAdapter.js';
import { ListIssuesParams, JiraSearchResult } from '../types/index.js';

export interface IListIssuesTool {
  getDefinition(): Tool;
  execute(args: any): Promise<JiraSearchResult>;
}

export class ListIssuesTool implements IListIssuesTool {
  private readonly jiraClient: IJiraClient;

  constructor(jiraClient: IJiraClient) {
    this.jiraClient = jiraClient;
  }

  /**
   * Get the MCP tool definition
   */
  public getDefinition(): Tool {
    return {
      name: 'list-issues',
      description: 'Search and retrieve Jira issues with filtering capabilities',
      inputSchema: {
        type: 'object',
        properties: {
          jql: {
            type: 'string',
            description: 'JQL (Jira Query Language) query string to filter issues. Examples: "assignee = currentUser()", "project = PROJ AND status = Open"'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 50, max: 1000)',
            minimum: 1,
            maximum: 1000,
            default: 50
          },
          startAt: {
            type: 'number',
            description: 'Starting index for pagination (default: 0)',
            minimum: 0,
            default: 0
          },
          fields: {
            type: 'string',
            description: 'Comma-separated list of fields to include in results (e.g., "summary,status,assignee,priority"). If not specified, returns all fields.'
          }
        },
        additionalProperties: false
      }
    };
  }

  /**
   * Execute the list-issues tool
   * @param args - Tool arguments
   * @returns Search results with issues
   */
  public async execute(args: any): Promise<JiraSearchResult> {
    const params = this.validateAndParseParams(args);
    
    try {
      const result = await this.jiraClient.searchIssues(params);
      
      // Add metadata to the result for better user experience
      const enhancedResult = {
        ...result,
        metadata: {
          query: params.jql || 'No JQL query (returning all issues)',
          returnedCount: result.issues.length,
          totalAvailable: result.total,
          hasMore: (result.startAt + result.issues.length) < result.total,
          nextStartAt: result.startAt + result.issues.length
        }
      };

      return enhancedResult;
    } catch (error) {
      throw new Error(`Failed to list issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and parse tool parameters
   * @param args - Raw arguments from MCP
   * @returns Validated ListIssuesParams
   */
  private validateAndParseParams(args: any): ListIssuesParams {
    if (!args || typeof args !== 'object') {
      return {}; // Return empty params for default search
    }

    const params: ListIssuesParams = {};

    // Validate JQL
    if (args.jql !== undefined) {
      if (typeof args.jql !== 'string') {
        throw new Error('jql parameter must be a string');
      }
      params.jql = args.jql.trim();
    }

    // Validate maxResults
    if (args.maxResults !== undefined) {
      if (typeof args.maxResults !== 'number' || args.maxResults < 1 || args.maxResults > 1000) {
        throw new Error('maxResults must be a number between 1 and 1000');
      }
      params.maxResults = Math.floor(args.maxResults);
    }

    // Validate startAt
    if (args.startAt !== undefined) {
      if (typeof args.startAt !== 'number' || args.startAt < 0) {
        throw new Error('startAt must be a non-negative number');
      }
      params.startAt = Math.floor(args.startAt);
    }

    // Validate fields
    if (args.fields !== undefined) {
      if (typeof args.fields !== 'string') {
        throw new Error('fields parameter must be a string');
      }
      
      const fieldsString = args.fields.trim();
      if (fieldsString.length > 0) {
        // Validate field names (basic validation)
        const fieldNames = fieldsString.split(',').map((f: string) => f.trim());
        const invalidFields = fieldNames.filter((field: string) => 
          field.length === 0 || !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/.test(field)
        );
        
        if (invalidFields.length > 0) {
          throw new Error(`Invalid field names: ${invalidFields.join(', ')}. Field names must contain only letters, numbers, and underscores.`);
        }
        
        params.fields = fieldsString;
      }
    }

    return params;
  }
} 