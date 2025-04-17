package theme

import (
	"github.com/charmbracelet/huh"
)

// copy returns a copy of a TextInputStyles with all children styles copied.
func copyTextStyles(t huh.TextInputStyles) huh.TextInputStyles {
	return huh.TextInputStyles{
		Cursor:      t.Cursor.Copy(),
		Placeholder: t.Placeholder.Copy(),
		Prompt:      t.Prompt.Copy(),
		Text:        t.Text.Copy(),
	}
}

// copy returns a copy of a FieldStyles with all children styles copied.
func copyFieldStyles(f huh.FieldStyles) huh.FieldStyles {
	return huh.FieldStyles{
		Base:           f.Base.Copy(),
		Title:          f.Title.Copy(),
		Description:    f.Description.Copy(),
		ErrorIndicator: f.ErrorIndicator.Copy(),
		ErrorMessage:   f.ErrorMessage.Copy(),
		SelectSelector: f.SelectSelector.Copy(),
		// NextIndicator:       f.NextIndicator.Copy(),
		// PrevIndicator:       f.PrevIndicator.Copy(),
		Option: f.Option.Copy(),
		// Directory:           f.Directory.Copy(),
		// File:                f.File.Copy(),
		MultiSelectSelector: f.MultiSelectSelector.Copy(),
		SelectedOption:      f.SelectedOption.Copy(),
		SelectedPrefix:      f.SelectedPrefix.Copy(),
		UnselectedOption:    f.UnselectedOption.Copy(),
		UnselectedPrefix:    f.UnselectedPrefix.Copy(),
		FocusedButton:       f.FocusedButton.Copy(),
		BlurredButton:       f.BlurredButton.Copy(),
		TextInput:           copyTextStyles(f.TextInput),
		Card:                f.Card.Copy(),
		NoteTitle:           f.NoteTitle.Copy(),
		Next:                f.Next.Copy(),
	}
}
