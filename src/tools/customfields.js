import { z } from 'zod';
    import { zendeskClient } from '../zendesk-client.js';

    export const ticketsTools = [
      {
        name: "list_custom_fields",
        description: "List custom fields in Zendesk",
        schema: {
          page: z.number().optional().describe("Page number for pagination"),
          per_page: z.number().optional().describe("Number of tickets per page (max 100)"),
        },
        handler: async ({ page, per_page }) => {
          try {
            const params = { page, per_page };
            const result = await zendeskClient.listCustomFields(params);
            return {
              content: [{ 
                type: "text", 
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error listing custom fields: ${error.message}` }],
              isError: true
            };
          }
        }
      },
      {
        name: "get_custom_field",
        description: "Get a specific custom field by ID",
        schema: {
          id: z.number().describe("Custom Field ID")
        },
        handler: async ({ id }) => {
          try {
            const result = await zendeskClient.getCustomField(id);
            return {
              content: [{ 
                type: "text", 
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error getting custom field: ${error.message}` }],
              isError: true
            };
          }
        }
      }
    ];
