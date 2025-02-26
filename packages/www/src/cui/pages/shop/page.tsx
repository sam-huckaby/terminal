import type Terminal from '@terminaldotshop/sdk'
import { formatPrice } from '../../styles'
import { Layout } from '../../layouts/base'
import { useProducts, useCart, useUpdateCartItem } from '../../hooks'
import { CartItemQuantity } from '../../components'
import { useRouter } from '@textjs/core/router'
import { useCurrentRouteHandlers } from '@textjs/core/keyboard'
import React from 'react'
import { Button } from '@textjs/core/components'

function ProductSection(props: {
  title: string
  products: Terminal.Product[]
  selectedProduct: Terminal.Product | undefined
  highlightColor: string
}) {
  return (
    <div>
      <span className="text-white">~ {props.title} ~</span>
      {props.products.map((product) => (
        <div
          key={product.id}
          className="px-1"
          style={{
            backgroundColor:
              props.selectedProduct?.id === product.id
                ? props.highlightColor
                : undefined,
          }}
        >
          <span
            className={{
              'text-gray': true,
              'text-white': props.selectedProduct?.id === product.id,
            }}
          >
            {product.name}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ShopPage() {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const router = useRouter()
  const { data: products } = useProducts()
  const { data: cart } = useCart()
  const { mutate: updateItem } = useUpdateCartItem()

  useCurrentRouteHandlers('/shop', [
    {
      keys: ['ArrowDown', 'j'],
      handler: () => {
        if (!products) return
        setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1))
      },
    },
    {
      keys: ['ArrowUp', 'k'],
      handler: () => {
        setSelectedIndex((prev) => Math.max(0, prev - 1))
      },
    },
    {
      keys: ['ArrowRight', 'l', '+'],
      handler: () => {
        if (!products || !cart) return
        const product = products[selectedIndex]
        if (product && product.subscription !== 'required') {
          const variant = product.variants[0]
          const item = cart.items.find((i) => i.productVariantID === variant.id)
          updateItem({
            variantId: variant.id,
            quantity: (item?.quantity || 0) + 1,
          })
        }
      },
    },
    {
      keys: ['ArrowLeft', 'h', '-'],
      handler: () => {
        if (!products || !cart) return
        const product = products[selectedIndex]
        if (product && product.subscription !== 'required') {
          const variant = product.variants[0]
          const item = cart.items.find((i) => i.productVariantID === variant.id)
          if (item) {
            updateItem({
              variantId: variant.id,
              quantity: Math.max(0, item.quantity - 1),
            })
          }
        }
      },
    },
    {
      keys: ['enter'],
      handler: () => router.navigate('/cart'),
    },
  ])

  if (!products || !cart) return <span>loading...</span>

  const featured = products.filter((p) => p.tags?.featured === 'true')
  const originals = products.filter((p) => p.tags?.featured !== 'true')
  const selectedProduct = products[selectedIndex]
  const selectedVariant = selectedProduct?.variants[0]
  const selectedCartItem = cart?.items.find(
    (i) => i.productVariantID === selectedVariant.id,
  ) ?? {
    id: '',
    productVariantID: selectedVariant.id,
    quantity: 0,
    subtotal: 0,
  }
  const highlightColor = selectedProduct.tags?.color ?? '#FF5C00'

  return (
    <Layout>
      <div className="flex gap-2">
        <div className="w-1/3 gap-1">
          <ProductSection
            title="featured"
            products={featured}
            selectedProduct={selectedProduct}
            highlightColor={highlightColor}
          />
          <ProductSection
            title="originals"
            products={originals}
            selectedProduct={selectedProduct}
            highlightColor={highlightColor}
          />
        </div>
        <div className="w-2/3">
          <div className="px-1 grow">
            <div className="gap-1">
              <span className="text-white">{selectedProduct.name}</span>
              <span className="text-gray">{selectedVariant.name}</span>
              <span style={{ color: highlightColor }}>
                {formatPrice(selectedVariant.price)}
              </span>
              <span className="text-gray">{selectedProduct.description}</span>
              {selectedProduct.subscription === 'required' ? (
                <Button
                  trigger="enter"
                  hintType="after"
                  color={highlightColor}
                  onClick={() => console.warn('clicked')}
                >
                  subscribe
                </Button>
              ) : (
                <CartItemQuantity item={selectedCartItem} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
