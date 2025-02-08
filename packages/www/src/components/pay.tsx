import { type Component, type JSX, Match, Show, Switch } from 'solid-js'
import Editor from '@components/editor'
import InputLine from '@components/input-line'
import { hc } from 'hono/client'
import type { Routes } from '@terminal/functions/api'
import { z } from 'zod'
import {
  createForm,
  getError,
  setResponse,
  zodForm,
} from '@modular-forms/solid'
import Stripe from 'stripe'
import Line from './line'
import Input from './input'
import Spinner from './spinner'
import Button from './button'

type PayProps = {
  apiUrl: string
  stripePk: string
  name?: string
} & JSX.HTMLAttributes<HTMLDivElement>

const PayComponent: Component<PayProps> = (props) => {
  const stripe = new Stripe(props.stripePk)
  const [form, { Form, Field }] = createForm({
    validate: zodForm(
      z.object({
        name: z.string().nonempty('# required'),
        cardNumber: z.string().nonempty('# required'),
        expMonth: z
          .string()
          .nonempty('# required')
          .regex(/\d{1,2}/, '# invalid month'),
        expYear: z
          .string()
          .nonempty('# required')
          .regex(/\d{2,4}/, '# invalid year'),
        cvc: z.string().nonempty('# required'),
      }),
    ),
  })

  return (
    <Form
      onSubmit={async (data) => {
        const token = await stripe.tokens.create({
          card: {
            name: data.name,
            number: data.cardNumber.replace(/\s/g, ''),
            exp_month: data.expMonth,
            exp_year: data.expYear,
            cvc: data.cvc,
          },
        })

        const client = hc<Routes>(props.apiUrl, {
          headers: {
            Authorization: `Bearer ${window.location.hash.slice(1)}`,
          },
        })

        const response = await client.card.$post({
          json: { token: token.id },
        })
        if (response.ok) {
          setResponse(form, {
            status: 'success',
            message:
              'Card successfully added to your Terminal account.\nYou can close this window now.',
          })
        } else {
          const json = (await response.json()) as unknown as {
            code: string
            message: string
          }
          setResponse(form, { status: 'error', message: json.message })
        }
      }}
    >
      <div class="flex px-6 gap-7 md:gap-11 items-center text-gray-10 absolute -top-12">
        <span class="text-2xl -mt-1">◲</span>
        <h1 class="lowercase">
          {props.name ? props.name + "'s" : 'your'} terminal account
        </h1>
      </div>
      <Editor>
        <Line>
          <h2 class="text-white">add payment information</h2>
        </Line>
        <Switch>
          <Match when={form.response.status === 'success'}>
            <Line state="success">payment information updated</Line>
            <Line />
            <Line class="text-white">complete purchase</Line>
            <Line state="warning">confirm payment in your terminal</Line>
          </Match>
          <Match when={!form.submitting || form.response.status === 'error'}>
            <Field name="name">
              {(field, props) => (
                <InputLine
                  {...props}
                  autofocus
                  autocomplete="cc-name"
                  placeholder="name on card"
                  state={field.error ? 'error' : 'normal'}
                  message={field.error}
                />
              )}
            </Field>
            <Field name="cardNumber">
              {(field, props) => (
                <InputLine
                  {...props}
                  autofocus={false}
                  type="tel"
                  inputmode="numeric"
                  pattern="[0-9\s]{13,19}"
                  autocomplete="cc-number"
                  maxlength="19"
                  placeholder="card number"
                  state={field.error ? 'error' : 'normal'}
                  message={field.error}
                />
              )}
            </Field>
            <Line
              tabindex="-1"
              state={
                !!getError(form, 'expMonth') || !!getError(form, 'expYear')
                  ? 'error'
                  : 'normal'
              }
            >
              <div class="flex items-start justify-start w-full flex-wrap">
                <div class="flex w-[197px] items-start">
                  <Field name="expMonth">
                    {(_field, props) => (
                      <Input
                        {...props}
                        autofocus={false}
                        state="normal"
                        classList={{
                          'max-w-6 w-6': true,
                          'animate-shake': !!getError(form, 'expMonth'),
                        }}
                        type="tel"
                        inputmode="numeric"
                        pattern="[0-9]{1,2}"
                        autocomplete="cc-exp-month"
                        maxlength="2"
                        placeholder="mm"
                      />
                    )}
                  </Field>
                  <span class="mx-2">/</span>
                  <Field name="expYear">
                    {(_field, props) => (
                      <Input
                        {...props}
                        autofocus={false}
                        state="normal"
                        classList={{
                          'animate-shake': !!getError(form, 'expMonth'),
                        }}
                        type="tel"
                        inputmode="numeric"
                        pattern="[0-9]{2,4}"
                        autocomplete="cc-exp-year"
                        maxlength="4"
                        placeholder="yy"
                      />
                    )}
                  </Field>
                </div>
                <Show
                  when={
                    !!getError(form, 'expMonth') || !!getError(form, 'expYear')
                  }
                >
                  <span class="text-gray-10">
                    {getError(form, 'expMonth') || getError(form, 'expYear')}
                  </span>
                </Show>
              </div>
            </Line>
            <Field name="cvc">
              {(field, props) => (
                <InputLine
                  {...props}
                  autofocus={false}
                  type="tel"
                  inputmode="numeric"
                  pattern="[0-9]{3,4}"
                  autocomplete="cc-csc"
                  maxlength="4"
                  placeholder="cvc"
                  state={field.error ? 'error' : 'normal'}
                  message={field.error}
                />
              )}
            </Field>
            <Line>
              <Button
                type="submit"
                class="bg-orange hover:enabled:bg-orange/80 text-white"
              >
                add payment information
              </Button>
            </Line>
            <Show when={form.response.status === 'error'}>
              <Line state="error" class="lowercase">
                {form.response.message}
              </Line>
            </Show>
            <Show when={form.response.status !== 'error'}>
              <Line />
            </Show>
            <Line state="warning">processed securely by stripe</Line>
          </Match>
          <Match when={form.submitting}>
            <Line state="busy">
              <Spinner />
            </Line>
          </Match>
        </Switch>
      </Editor>
    </Form>
  )
}

export default PayComponent
