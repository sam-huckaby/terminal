import { splitProps, type Component, type JSX } from 'solid-js'

type ButtonProps = {} & JSX.ButtonHTMLAttributes<HTMLButtonElement>

const ButtonComponent: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'classList'])
  return (
    <button
      {...others}
      classList={{
        ...local.classList,
        'text-gray-11 h-full focus:bg-gray-6 focus:outline-none': true,
        'hover:enabled:bg-gray-5 active:enabled:bg-gray-6': true,
        'px-4 flex items-center text-nowrap': true,
        [local.class ?? '']: true,
      }}
    >
      {props.children}
    </button>
  )
}

export default ButtonComponent
