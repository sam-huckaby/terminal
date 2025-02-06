import { type Component, type ComponentProps, splitProps, Show } from 'solid-js'
import Line from '@components/line'
import Input from '@components/input'

type InputLineProps = {} & ComponentProps<typeof Input>

const InputLineComponent: Component<InputLineProps> = (props) => {
  let inputRef: HTMLInputElement | undefined
  const [line] = splitProps(props, ['state', 'message'])

  const handleFocus = () => {
    inputRef?.focus()
    // @ts-expect-error
    if (props.onClick) props.onClick()
  }

  return (
    <Line {...line} tabindex="-1" onClick={handleFocus}>
      <Input ref={inputRef} onClick={handleFocus} {...props} />
      <Show when={props.state === 'normal'}>{props.children}</Show>
    </Line>
  )
}

export default InputLineComponent
