import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IJiraClient } from '../jira/JiraClientAdapter.js';
import { AddCommentParams, JiraComment } from '../types/index.js';

export interface IAddCommentTool {
  getDefinition(): Tool;
  execute(args: any): Promise<JiraComment>;
}

export class AddCommentTool implements IAddCommentTool {
  private readonly jiraClient: IJiraClient;

  constructor(jiraClient: IJiraClient) {
    this.jiraClient = jiraClient;
  }

  /**
   * Get the MCP tool definition
   */
  public getDefinition(): Tool {
    return {
      name: 'add-comment',
      description: 'Add a comment to a Jira issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: {
            type: 'string',
            description: 'The key of the issue to comment on (e.g., "PROJ-123")',
          },
          body: {
            type: 'string',
            description: 'The comment text to add',
          }
        },
        required: ['issueKey', 'body'],
        additionalProperties: false
      }
    };
  }

  /**
   * Execute the add-comment tool
   * @param args - Tool arguments
   * @returns The created comment object
   */
  public async execute(args: any): Promise<JiraComment> {
    const params = this.validateAndParseParams(args);
    try {
      const comment = await this.jiraClient.addComment(params.issueKey, params.body);
      return comment;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and parse tool parameters
   * @param args - Raw arguments from MCP
   * @returns Validated AddCommentParams
   */
  private validateAndParseParams(args: any): AddCommentParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments are required for adding a comment');
    }
    if (!args.issueKey || typeof args.issueKey !== 'string') {
      throw new Error('issueKey is required and must be a string');
    }
    if (!args.body || typeof args.body !== 'string') {
      throw new Error('body is required and must be a string');
    }
    return {
      issueKey: args.issueKey.trim(),
      body: args.body.trim()
    };
  }
} 