import { zendeskClient } from '../zendesk-client.js';

export const highestTicketCategoryTool = {
  name: "highest_ticket_category",
  description: "Calculate the category with the highest percentage of tickets.",
  schema: {}, // Simplified schema to avoid validation issues
  handler: async (params = {}) => {
    try {
      // Debug input - commented out to avoid MCP protocol issues
      // console.log('Handler called with params:', params);

      // Fetch all tickets
      let tickets = [];
      let page = 1;
      let result;

      do {
        // Debug API calls - commented out to avoid MCP protocol issues  
        // console.log(`Fetching tickets page ${page}`);
        result = await zendeskClient.listTickets({ page, per_page: 100 });
        if (!result || !Array.isArray(result.tickets)) {
          throw new Error("Invalid API response: tickets array not found");
        }
        tickets = tickets.concat(result.tickets);
        page++;
        if (result.next_page) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit delay
        }
      } while (result.next_page);

      // Debug ticket count - commented out to avoid MCP protocol issues
      // console.log(`Total tickets fetched: ${tickets.length}`);

      if (tickets.length === 0) {
        return {
          content: [{ type: "text", text: "No tickets found in Zendesk." }],
          isError: false
        };
      }

      // Group tickets by category (using custom field 'category')
      const categoryCounts = {};
      tickets.forEach(ticket => {
        const category = ticket.custom_fields?.find(field => field.id === 'category')?.value || "uncategorized";
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      // Debug category counts - commented out to avoid MCP protocol issues
      // console.log("Category counts:", categoryCounts);

      // Calculate percentages
      const totalTickets = tickets.length;
      const categoryPercentages = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count,
        percentage: ((count / totalTickets) * 100).toFixed(2)
      }));

      // Find the highest percentage category
      const highestCategory = categoryPercentages.reduce(
        (max, current) => (parseFloat(current.percentage) > parseFloat(max.percentage) ? current : max),
        { category: null, percentage: 0 }
      );

      // Debug result - commented out to avoid MCP protocol issues
      // console.log("Highest category:", highestCategory);

      return {
        content: [
          {
            type: "text",
            text: `The category with the highest percentage of tickets is '${highestCategory.category}' with ${highestCategory.percentage}% (${highestCategory.count} tickets).`
          },
          {
            type: "text",
            text: `Total tickets processed: ${totalTickets}`
          }
        ]
      };
    } catch (error) {
      // Debug error - commented out to avoid MCP protocol issues
      // console.error("Error in highestTicketCategoryTool:", error);
      return {
        content: [{ type: "text", text: `Error calculating highest ticket category: ${error.message}` }],
        isError: true
      };
    }
  }
};

// Function to categorize tickets by their subjects and calculate percentages
export function categorizeTicketsBySubject(tickets) {
    const categoryCounts = {};

    // Iterate through tickets and categorize by subject
    tickets.forEach(ticket => {
        const subject = ticket.subject || "Uncategorized";
        if (!categoryCounts[subject]) {
            categoryCounts[subject] = 0;
        }
        categoryCounts[subject]++;
    });

    // Calculate percentages
    const totalTickets = tickets.length;
    const categoryPercentages = Object.entries(categoryCounts).map(([category, count]) => {
        return {
            category,
            count,
            percentage: ((count / totalTickets) * 100).toFixed(2) + "%"
        };
    });

    // Sort categories by count in descending order
    categoryPercentages.sort((a, b) => b.count - a.count);

    return categoryPercentages;
}

// Process the 213 tickets assigned to the Business Application group
const tickets = [/* Array of 213 tickets */]; // Replace with actual ticket data
const categorizedData = categorizeTicketsBySubject(tickets);
// console.log('Categorized Data:', categorizedData); // Commented out to avoid MCP protocol issues