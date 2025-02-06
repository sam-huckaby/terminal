import { type Component, type JSX, type ParentProps } from 'solid-js'

type EditorProps = ParentProps & JSX.HTMLAttributes<HTMLDivElement>

const EditorComponent: Component<EditorProps> = (props) => {
  return (
    <div
      {...props}
      classList={{
        editor: true,
        'leading-10': true,
        [props.class ?? '']: !!props.class,
      }}
    >
      {props.children}
    </div>
  )
}

export default EditorComponent
