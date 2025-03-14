import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Resource } from "sst";
import { Log } from "../util/log";

export namespace Email {
  const log = Log.create({ namespace: "email" });
  export const Client = new SESv2Client({});

  export async function send(
    from: string,
    to: string,
    subject: string,
    body: string,
  ) {
    from = from + "@" + Resource.ShortDomainEmail.sender;
    log.info("sending email", { subject, from, to });
    await Client.send(
      new SendEmailCommand({
        Destination: {
          ToAddresses: [to],
        },
        Content: {
          Simple: {
            Body: {
              Text: {
                Data: body,
              },
            },
            Subject: {
              Data: subject,
            },
          },
        },
        FromEmailAddress: `Terminal <${from}>`,
      }),
    );
  }
}
