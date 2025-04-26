import { Resource } from "sst";
import { Stripe } from "stripe";

const fileContent = `ch_3RH7eTDgGJQx1Mr617VkbKyY
ch_3RH7eSDgGJQx1Mr6124FeDxC
ch_3RH7eQDgGJQx1Mr63WvDqLsf
ch_3RH7ePDgGJQx1Mr61zcjEHFb
ch_3RH7eNDgGJQx1Mr61h7Laeso
ch_3RH7eMDgGJQx1Mr62lDGQAFx
ch_3RH7eIDgGJQx1Mr61ps4AXyE
ch_3RH7eHDgGJQx1Mr627uCGK4z
ch_3RH7eFDgGJQx1Mr62A1E6hOT
ch_3RH7eEDgGJQx1Mr64mhmXBDs
ch_3RH7eDDgGJQx1Mr62Und5qT4
ch_3RH7eCDgGJQx1Mr61cDh1QwM
ch_3RH7eBDgGJQx1Mr61FbbK0pK
ch_3RH7eADgGJQx1Mr60FAvlUjE
ch_3REM38DgGJQx1Mr61sqRo1as
ch_3REM34DgGJQx1Mr63jQHSJx1
ch_3RDd67DgGJQx1Mr63rwLrOYx
ch_3RDd66DgGJQx1Mr63DMvcyKX
ch_3RCu8wDgGJQx1Mr63yrLgs0d
ch_3RCXfYDgGJQx1Mr62fhzv7NZ
ch_3RCO8FDgGJQx1Mr64GhmH5Uk
ch_3RCO8EDgGJQx1Mr62Qf8dgaZ
ch_3RCO8CDgGJQx1Mr60gk1FTZP
ch_3RCO8BDgGJQx1Mr62H41ZhKe
ch_3RCO8ADgGJQx1Mr63GHFJO2m
ch_3RCO89DgGJQx1Mr62DZxcNsZ
ch_3RCO87DgGJQx1Mr61rrTfSHS
ch_3RCO86DgGJQx1Mr60pS4rGW1
ch_3RCO85DgGJQx1Mr64Fr7QL57
ch_3RCO84DgGJQx1Mr62fdL1utw
ch_3RCO81DgGJQx1Mr64gUTgYV6
ch_3RCO80DgGJQx1Mr63e0XPAE9
ch_3RCO7yDgGJQx1Mr625HsfvNh
ch_3RCO7xDgGJQx1Mr62SufWIFo
ch_3RCO7vDgGJQx1Mr61YDmiU5d
ch_3RCO7uDgGJQx1Mr63bM0TxVA
ch_3RCO7rDgGJQx1Mr64gIT7Kxj
ch_3RCO7pDgGJQx1Mr61EAm9zfe
ch_3RCO7oDgGJQx1Mr61IjJWz89
ch_3RCO7mDgGJQx1Mr61oPDNKIM
ch_3RCO7lDgGJQx1Mr62jE5D7o3
ch_3RCO7kDgGJQx1Mr60qQJws9p
ch_3RCO7iDgGJQx1Mr60Yss14ba
ch_3RCO7hDgGJQx1Mr62CNzkjd3
ch_3RCO7fDgGJQx1Mr63XjvB89j
ch_3RCO7eDgGJQx1Mr60Y90vtJk
ch_3RCO7cDgGJQx1Mr63YioQ8ip
ch_3RCO7ZDgGJQx1Mr63BnRjeeA
ch_3RCO7YDgGJQx1Mr62FU6bQbM
ch_3RCO7WDgGJQx1Mr60DBHkkCg
ch_3RCO7VDgGJQx1Mr60NGzJnN6
ch_3RCO7UDgGJQx1Mr627I7Q0ge
ch_3RCO7TDgGJQx1Mr64hx8gMdt
ch_3RCO7RDgGJQx1Mr64ngrjJmX
ch_3RCO7QDgGJQx1Mr60GgHQIyR
ch_3RCO7PDgGJQx1Mr64UjqBX8E
ch_3RCO7ODgGJQx1Mr63ZVo6AY9
ch_3RCO7NDgGJQx1Mr61du0SlYT
ch_3RCO7MDgGJQx1Mr614dofl3a
ch_3RCO7LDgGJQx1Mr60j48Ce7T
ch_3RCO7KDgGJQx1Mr61qAa1T5e
ch_3RCO7JDgGJQx1Mr60dIs6L0y
ch_3RCO7IDgGJQx1Mr64p1uRsSr
ch_3RCO7HDgGJQx1Mr62b0TD5m1
ch_3RCO7FDgGJQx1Mr64sxLxzyG
ch_3RCO7DDgGJQx1Mr60sYolWFN
ch_3RCO7BDgGJQx1Mr64krQZzXG
ch_3RCO7ADgGJQx1Mr61dlTfnRE
ch_3RCO77DgGJQx1Mr64n8U8bLg
ch_3RCO76DgGJQx1Mr62RGiMDhb
ch_3RCO74DgGJQx1Mr60c6teXHu
ch_3RCO72DgGJQx1Mr64D9tDySP
ch_3RCO71DgGJQx1Mr63xcQgbuP
ch_3RCO70DgGJQx1Mr61oyh36xc
ch_3RCO6yDgGJQx1Mr62DwhKw1n
ch_3RCO6vDgGJQx1Mr62qxoeR2D
ch_3RCO6uDgGJQx1Mr61SXTAKPt
ch_3RCO6tDgGJQx1Mr60IaB00o1
ch_3RCO6rDgGJQx1Mr60svDa8Y6
ch_3RCO6qDgGJQx1Mr60zzFHeFG
ch_3RCO6pDgGJQx1Mr60PDgMI2G
ch_3RCO6nDgGJQx1Mr61I39JEMl
ch_3RCO6mDgGJQx1Mr63FFiqsVb
ch_3RCO6lDgGJQx1Mr60TyIVe2X
ch_3RCO6jDgGJQx1Mr62jhUGFOu
ch_3RCO6gDgGJQx1Mr62IuyVa2i
ch_3RCO6eDgGJQx1Mr62b0L6gYY
ch_3RCO6dDgGJQx1Mr61bNG26dp
ch_3RCO6cDgGJQx1Mr644vUbLqW
ch_3RCO6bDgGJQx1Mr63f4MmJ7X
ch_3RCO6ZDgGJQx1Mr61d1Jo0ia
ch_3RCO6YDgGJQx1Mr64FiO7VcN
ch_3RCO6WDgGJQx1Mr63OM7VJcx
ch_3RCO6VDgGJQx1Mr64rhQFQDO
ch_3RCO6UDgGJQx1Mr64cDSpibR
ch_3RCO6SDgGJQx1Mr64M75iGn3
ch_3RCO6RDgGJQx1Mr64DtAqdvl
ch_3RCO6QDgGJQx1Mr64kbNMWto
ch_3RCO6PDgGJQx1Mr60G7y1iHc
ch_3RCO6NDgGJQx1Mr64si3WVKG
ch_3RCO6MDgGJQx1Mr60J0ipHqg
ch_3RCO6LDgGJQx1Mr60xk508kL
ch_3RCO6KDgGJQx1Mr63ed7RqYX
ch_3RCO6JDgGJQx1Mr63W5UbmQJ
ch_3RCO6HDgGJQx1Mr62jTaCcak
ch_3RCO6FDgGJQx1Mr62DPXYyEv
ch_3RCO6DDgGJQx1Mr61T4UKYQ2
ch_3RCO6BDgGJQx1Mr60SbxXaBE
ch_3RCO6ADgGJQx1Mr622fJx5Xi
ch_3RCO67DgGJQx1Mr63S2fynnM
ch_3RCO65DgGJQx1Mr63JNSJI2k
ch_3RCO64DgGJQx1Mr62WyHhTmR
ch_3RCO63DgGJQx1Mr60aKecfRR
ch_3RCO61DgGJQx1Mr63U3MeEMD
ch_3RCO60DgGJQx1Mr61aU5oJfd
ch_3RCO5zDgGJQx1Mr63XMF8Kr1
ch_3RCO5xDgGJQx1Mr62P49Nhe7
ch_3RCO5wDgGJQx1Mr60u9qokrw
ch_3RCO5vDgGJQx1Mr62sj4n95B
ch_3RCO5uDgGJQx1Mr64rIFIKpB
ch_3RCO5tDgGJQx1Mr638P2Evnf
ch_3RCO5sDgGJQx1Mr624BRcKAX
ch_3RCO5qDgGJQx1Mr61JumXmqx
ch_3RCO5pDgGJQx1Mr62X5dwGqI
ch_3RCO5mDgGJQx1Mr63Bn1xSa2
ch_3RCO5lDgGJQx1Mr62Po6zKFA
ch_3RCO5iDgGJQx1Mr60F7SQ6OQ
ch_3RCO5gDgGJQx1Mr61yqUCOsw
ch_3RCO5fDgGJQx1Mr62C24f9Hz
ch_3RCO5eDgGJQx1Mr64sXF0voQ
ch_3RCO5cDgGJQx1Mr60dL79sx6
ch_3RCO5bDgGJQx1Mr60FO530L2
ch_3RCO5ZDgGJQx1Mr60HY5iw7i
ch_3RCO5YDgGJQx1Mr6171iGDYY
ch_3RCO3NDgGJQx1Mr63aszjcRU
ch_3RCO3MDgGJQx1Mr60xaRnrXQ
ch_3RCO3LDgGJQx1Mr61gldq4ZM
ch_3RCO3IDgGJQx1Mr62nfSiaXG
ch_3RCO3HDgGJQx1Mr62UxFFRSo
ch_3RCO3GDgGJQx1Mr63mdzhrMy
ch_3RCO3FDgGJQx1Mr64MZ1aAEd
ch_3RCO3DDgGJQx1Mr60T44v35x
ch_3RCO3CDgGJQx1Mr645OBgbPF
ch_3RCO3BDgGJQx1Mr64v2EViyc
ch_3RCO39DgGJQx1Mr641oLznlk
ch_3RCO28DgGJQx1Mr627tr3aDe
ch_3RCO24DgGJQx1Mr61GT34sez
ch_3RCO23DgGJQx1Mr63skmv2Q0
ch_3RCO22DgGJQx1Mr62y97IFSx
ch_3RCO21DgGJQx1Mr620DTJTIm
ch_3RCO1xDgGJQx1Mr63gPGMIgr
ch_3RCO1uDgGJQx1Mr63RLtq9b7
ch_3RCO1tDgGJQx1Mr64s4R48L6
ch_3RCO1sDgGJQx1Mr6432AbZbe
ch_3RCO1rDgGJQx1Mr63Zwu2FLk
ch_3RCO1qDgGJQx1Mr60YrddPxV`;

// Initialize Stripe client
const stripe = new Stripe(Resource.StripeSecret.value);

// Amount to refund in cents ($8.00)
const REFUND_AMOUNT = 800;

async function processRefunds() {
  try {
    const chargeIds = fileContent.trim().split("\n");

    console.log(`Processing ${chargeIds.length} refunds of $8.00 each...`);

    let successCount = 0;
    let failureCount = 0;
    const errors: Record<string, string> = {};

    // Process each charge ID
    for (const chargeId of chargeIds) {
      const trimmedId = chargeId.trim();
      if (!trimmedId) continue;

      try {
        // Create a partial refund for $8.00
        const refund = await stripe.refunds.create({
          charge: trimmedId,
          amount: REFUND_AMOUNT,
          reason: "requested_by_customer",
        });

        console.log(
          `✅ Successfully refunded $8.00 to charge ${trimmedId} (refund ID: ${refund.id})`,
        );
        successCount++;
      } catch (error) {
        console.error(
          `❌ Failed to refund charge ${trimmedId}: ${(error as Error).message}`,
        );
        errors[trimmedId] = (error as Error).message;
        failureCount++;
      }
    }

    // Print summary
    console.log("\n--- Refund Summary ---");
    console.log(`Total charges processed: ${chargeIds.length}`);
    console.log(`Successful refunds: ${successCount}`);
    console.log(`Failed refunds: ${failureCount}`);

    if (failureCount > 0) {
      console.log("\n--- Failed Refunds ---");
      for (const [chargeId, errorMsg] of Object.entries(errors)) {
        console.log(`${chargeId}: ${errorMsg}`);
      }
    }
  } catch (error) {
    console.error("Error processing refunds:", (error as Error).message);
  }
}

await processRefunds();

