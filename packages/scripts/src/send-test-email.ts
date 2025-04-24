import { Order } from "@terminal/core/order/order";
import { z } from "zod";
import {
  getTestAddressID,
  getTestCardID,
  getTestProductVariantID,
} from "@terminal/functions/test/api/util";
import { User } from "@terminal/core/user/index";
import { Actor } from "@terminal/core/actor";

// Parse command line arguments
const args = process.argv.slice(2);
const schema = z.object({
  to: z.string().email(),
  template: z
    .enum(["order", "subscription", "shipped", "custom"])
    .default("custom"),
  subject: z.string().optional(),
  body: z.string().optional(),
  from: z.string().default("test"),
});

function printUsage() {
  console.log(`
Usage: bun email [options]

Options:
  --to <email>           Recipient email address (required)
  --template <type>      Email template type: order, subscription, shipped, custom (default: custom)
  --subject <text>       Email subject (for custom template)
  --body <text>          Email body (for custom template)
  --from <sender>        Sender identifier (default: test)

Examples:
  # Send custom email
  bun email --to user@example.com --template custom --subject "Test Email" --body "This is a test email"

  # Send order confirmation template
  bun email --to user@example.com --template order

  # Send subscription confirmation template
  bun email --to user@example.com --template subscription

  # Send order shipped template
  bun email --to user@example.com --template shipped
`);
  process.exit(1);
}

// Parse arguments into an object
const parsedArgs: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i]?.startsWith("--")) {
    const key = args[i]?.slice(2);
    const value =
      args[i + 1] && !args[i + 1]?.startsWith("--") ? args[i + 1] : "true";
    parsedArgs[key!] = value!;
    if (value !== "true") i++;
  }
}

// If no arguments or help flag, show usage
if (args.length === 0 || parsedArgs.help === "true") {
  printUsage();
}

try {
  const options = schema.parse(parsedArgs);
  const user = await User.create({
    email: options.to,
  });

  async function main() {
    console.log(`Sending ${options.template} email to ${options.to}...`);

    switch (options.template) {
      case "order": {
        await Order.create({
          variants: {
            [await getTestProductVariantID()]: 1,
          },
          cardID: await getTestCardID(),
          addressID: await getTestAddressID(),
        });
        break;
      }
      case "shipped": {
        const orderID = await Order.create({
          variants: {
            [await getTestProductVariantID()]: 1,
          },
          cardID: await getTestCardID(),
          addressID: await getTestAddressID(),
        });
        await Order.update({
          id: orderID,
          trackingNumber: "1Z999AA10123456784",
          trackingStatus: "TRANSIT",
          trackingStatusDetails: "Package has left the facility",
          trackingURL: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
        });
        break;
      }
    }

    console.log("Email sent successfully!");
  }

  await Actor.provide("system", { userID: user }, async () => {
    main().catch((error) => {
      console.error("Error sending email:", error);
      process.exit(1);
    });
  });
} catch (error) {
  console.error("Invalid arguments:", error);
  printUsage();
}

