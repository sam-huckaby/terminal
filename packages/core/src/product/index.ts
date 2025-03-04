import { z } from "zod";
import { useTransaction } from "../drizzle/transaction";
import {
  ProductSubscriptionSetting,
  productTable,
  ProductTags,
  productVariantInventoryTable,
  productVariantTable,
} from "./product.sql";
import { eq } from "drizzle-orm";
import { first, groupBy, map, pipe, values } from "remeda";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import { Common } from "../common";
import { Examples } from "../examples";
import { ProductFilter } from "./filter";

export module Product {
  export const Variant = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.ProductVariant.id,
      }),
      name: z.string().openapi({
        description: "Name of the product variant.",
        example: Examples.ProductVariant.name,
      }),
      price: z.number().int().min(0).openapi({
        description: "Price of the product variant in cents (USD).",
        example: Examples.ProductVariant.price,
      }),
    })
    .openapi({
      ref: "ProductVariant",
      description: "Variant of a product in the Terminal shop.",
      example: Examples.ProductVariant,
    });

  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.Product.id,
      }),
      name: z.string().openapi({
        description: "Name of the product.",
        example: Examples.Product.name,
      }),
      description: z.string().openapi({
        description: "Description of the product.",
        example: Examples.Product.description,
      }),
      variants: Variant.array().openapi({
        description: "List of variants of the product.",
        example: Examples.Product.variants,
      }),
      order: z.number().int().optional().openapi({
        description:
          "Order of the product used when displaying a sorted list of products.",
        example: Examples.Product.order,
      }),
      subscription: ProductSubscriptionSetting.optional().openapi({
        description: "Whether the product must be or can be subscribed to.",
        example: Examples.Product.subscription,
      }),
      tags: ProductTags.optional().openapi({
        description: "Tags for the product.",
        example: Examples.Product.tags,
      }),
    })
    .openapi({
      ref: "Product",
      description: "Product sold in the Terminal shop.",
      example: Examples.Product,
    });

  export type Info = z.infer<typeof Info>;

  export const list = () =>
    useTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(productTable)
        .leftJoin(
          productVariantTable,
          eq(productTable.id, productVariantTable.productID),
        )
        .orderBy(productTable.order);
      const result = pipe(
        rows,
        groupBy((x) => x.product.id),
        values(),
        map(
          (group): Info => ({
            id: group[0].product.id,
            name: group[0].product.name,
            description: group[0].product.description,
            order: group[0].product.order || undefined,
            subscription: group[0].product.subscription || undefined,
            variants: !group[0].product_variant
              ? []
              : group.map((item) => ({
                  id: item.product_variant!.id,
                  name: item.product_variant!.name,
                  price: item.product_variant!.price,
                })),
            tags: group[0].product.tags || undefined,
          }),
        ),
      ).filter((item) =>
        ProductFilter.run(ProductFilter.use(), item.tags || {}),
      );
      return result as Info[];
    });

  export const fromID = fn(Info.shape.id, (input) =>
    useTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(productTable)
        .leftJoin(
          productVariantTable,
          eq(productTable.id, productVariantTable.productID),
        )
        .where(eq(productTable.id, input));
      const result = pipe(
        rows,
        groupBy((x) => x.product.id),
        values(),
        map(
          (group): Info => ({
            id: group[0].product.id,
            name: group[0].product.name,
            description: group[0].product.description,
            variants: !group[0].product_variant
              ? []
              : group.map((item) => ({
                  id: item.product_variant!.id,
                  name: item.product_variant!.name,
                  price: item.product_variant!.price,
                })),
            tags: group[0].product.tags || undefined,
          }),
        ),
        first(),
      );
      return result;
    }),
  );

  export const edit = fn(
    Info.pick({
      name: true,
      description: true,
      id: true,
      order: true,
      subscription: true,
      tags: true,
    }).partial({
      name: true,
      description: true,
      order: true,
      tags: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        await tx
          .update(productTable)
          .set({
            name: input.name,
            description: input.description,
            order: input.order,
            subscription: input.subscription || null,
            tags: input.tags || null,
          })
          .where(eq(productTable.id, input.id));
      }),
  );

  export const create = fn(
    Info.pick({ name: true, description: true, id: true }).partial({
      id: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        const id = input.id || createID("product");
        await tx.insert(productTable).values({
          id,
          name: input.name,
          description: input.description,
        });
        return id;
      }),
  );

  export const addVariant = fn(
    z.object({
      productID: Info.shape.id,
      name: Variant.shape.name,
      price: Variant.shape.price,
      id: Variant.shape.id.optional(),
    }),
    (input) =>
      useTransaction(async (tx) => {
        const id = input.id || createID("productVariant");
        const productID = await tx
          .select({
            productID: productTable.id,
          })
          .from(productTable)
          .where(eq(productTable.id, input.productID))
          .then((x) => x[0]?.productID);
        if (!productID) throw new Error("Product not found");
        await tx.insert(productVariantTable).values({
          productID,
          id,
          name: input.name,
          price: input.price,
        });
        return id;
      }),
  );

  export const editVariant = fn(
    z.object({
      id: Variant.shape.id,
      name: Variant.shape.name.optional(),
      price: Variant.shape.price.optional(),
      inventoryIDs: z.string().array().optional(),
    }),
    (input) =>
      useTransaction(async (tx) => {
        await tx
          .update(productVariantTable)
          .set({
            name: input.name,
            price: input.price,
          })
          .where(eq(productVariantTable.id, input.id));

        if (input.inventoryIDs) {
          await tx
            .delete(productVariantInventoryTable)
            .where(eq(productVariantInventoryTable.productVariantID, input.id));
          if (input.inventoryIDs.length > 0)
            await tx.insert(productVariantInventoryTable).values(
              input.inventoryIDs.map((id) => ({
                productVariantID: input.id,
                inventoryID: id,
              })),
            );
        }
      }),
  );

  export const removeVariant = fn(Variant.shape.id, (input) =>
    useTransaction(async (tx) => {
      return tx
        .delete(productVariantTable)
        .where(eq(productVariantTable.id, input))
        .then((result) => result.rowsAffected);
    }),
  );

  export const TEMPORARY_FIXED_WEIGHT_OZ = 12;
}
