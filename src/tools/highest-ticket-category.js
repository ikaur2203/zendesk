import { zendeskClient } from '../zendesk-client.js';

export const highestTicketCategoryTool = {
  name: "highest_ticket_category",
  description: "Calculate the category with the highest percentage of tickets.",
  schema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async () => {
    try {
      // Fetch all tickets
      let tickets = [];
      let page = 1;
      let result;

      do {
        result = await zendeskClient.listTickets({ page, per_page: 100 });
        tickets = tickets.concat(result.tickets);
        page++;
      } while (result.next_page);

      // Group tickets by category (using tags as an example)
      const categoryCounts = {};
      tickets.forEach(ticket => {
        (ticket.tags || []).forEach(tag => {
          categoryCounts[tag] = (categoryCounts[tag] || 0) + 1;
        });
      });

      // Calculate percentages
      const totalTickets = tickets.length;
      const categoryPercentages = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        percentage: ((count / totalTickets) * 100).toFixed(2)
      }));

      // Find the highest percentage category
      const highestCategory = categoryPercentages.reduce((max, current) => current.percentage > max.percentage ? current : max, { category: null, percentage: 0 });

      return {
        content: [{
          type: "text",
          text: `The category with the highest percentage of tickets is '${highestCategory.category}' with ${highestCategory.percentage}% of tickets.`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error calculating highest ticket category: ${error.message}` }],
        isError: true
      };
    }
  }
};
