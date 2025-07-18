/**
 * Jira MCP Server
 * Main server class that coordinates all components
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigurationManager, IConfigurationManager } from './config/ConfigurationManager.js';
import { JiraClientAdapter, IJiraClient } from './jira/JiraClientAdapter.js';
import { ListIssuesTool, IListIssuesTool } from './tools/ListIssuesTool.js';
import { CreateIssueTool, ICreateIssueTool } from './tools/CreateIssueTool.js';
import { AddCommentTool, IAddCommentTool } from './tools/AddCommentTool.js';
import {
  JiraConfig,
  JiraConnectionError,
  JiraAuthenticationError,
  JiraValidationError
} from './types/index.js';

export interface IJiraMcpServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class JiraMcpServer implements IJiraMcpServer {
  private readonly server: Server;
  private readonly configManager: IConfigurationManager;
  private jiraClient: IJiraClient | null = null;
  private listIssuesTool: IListIssuesTool | null = null;
  private createIssueTool: ICreateIssueTool | null = null;
  private addCommentTool: IAddCommentTool | null = null;
  private isInitialized = false;

  constructor(configManager?: IConfigurationManager) {
    this.server = new Server(
      {
        name: 'jira-mcp',
        version: '1.0.0',
        description: 'MCP server for Jira integration using jira-client'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.configManager = configManager || new ConfigurationManager();
    this.setupEventHandlers();
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    try {
      await this.initializeServer();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error('Jira MCP Server started successfully');
    } catch (error) {
      console.error('Failed to start Jira MCP Server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  public async stop(): Promise<void> {
    try {
      await this.server.close();
      console.error('Jira MCP Server stopped');
    } catch (error) {
      console.error('Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Initialize server components
   */
  private async initializeServer(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load configuration
      const config = this.configManager.loadConfiguration();
      console.error(`Connecting to Jira at ${config.protocol}://${config.host}`);

      // Initialize Jira client
      this.jiraClient = new JiraClientAdapter(config);
      await this.jiraClient.connect();

      // Initialize tools
      this.listIssuesTool = new ListIssuesTool(this.jiraClient);
      this.createIssueTool = new CreateIssueTool(this.jiraClient);
      this.addCommentTool = new AddCommentTool(this.jiraClient);

      this.isInitialized = true;
      console.error('Jira MCP Server initialized successfully');
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  /**
   * Setup MCP event handlers
   */
  private setupEventHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.isInitialized) {
        await this.initializeServer();
      }

      return {
        tools: [
          this.listIssuesTool!.getDefinition(),
          this.createIssueTool!.getDefinition(),
          this.addCommentTool!.getDefinition()
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.isInitialized) {
        await this.initializeServer();
      }

      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list-issues':
            const searchResult = await this.listIssuesTool!.execute(args);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchResult, null, 2)
                }
              ]
            };

          case 'create-issue':
            const createdIssue = await this.createIssueTool!.execute(args);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(createdIssue, null, 2)
                }
              ]
            };

          case 'add-comment':
            const comment = await this.addCommentTool!.execute(args);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(comment, null, 2)
                }
              ]
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
            }
          ],
          isError: true
        };
      }
    });

    // Handle server errors
    this.server.onerror = (error) => {
      console.error('MCP Server error:', error);
    };
  }

  /**
   * Handle initialization errors with appropriate messaging
   */
  private handleInitializationError(error: unknown): void {
    if (error instanceof JiraValidationError) {
      console.error(`Configuration error: ${error.message}`);
      console.error('Please check your environment variables and try again.');
      console.error('Required variables: JIRA_HOST and authentication credentials');
      // process.exit(1);
    }

    if (error instanceof JiraAuthenticationError) {
      console.error(`Authentication error: ${error.message}`);
      console.error('Please verify your Jira credentials.');
      // process.exit(1);
    }

    if (error instanceof JiraConnectionError) {
      console.error(`Connection error: ${error.message}`);
      console.error('Please check your Jira host and network connectivity.');
      // process.exit(1);
    }

    console.error(`Unexpected error during initialization: ${error}`);
    // process.exit(1);
  }
}

/**
 * Factory function to create and start the server
 */
export async function createJiraMcpServer(): Promise<IJiraMcpServer> {
  const server = new JiraMcpServer();
  return server;
} 