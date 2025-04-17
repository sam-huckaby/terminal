package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m model) _createBoxInner(
	content string,
	selected bool,
	position lipgloss.Position,
	padding int,
	totalWidth int,
) string {
	padded := lipgloss.PlaceHorizontal(totalWidth, position, content)
	base := m.theme.Base().Border(lipgloss.NormalBorder()).Width(totalWidth)

	var style lipgloss.Style
	if selected {
		style = base.BorderForeground(m.theme.Accent())
	} else {
		style = base.BorderForeground(m.theme.Border())
	}
	return style.PaddingLeft(padding).Render(padded)
}

func (m model) CreateBox(content string, selected bool) string {
	return m._createBoxInner(content, selected, lipgloss.Left, 1, m.widthContent-2)
}

func (m model) CreateBoxCustom(content string, selected bool, totalWidth int) string {
	return m._createBoxInner(content, selected, lipgloss.Left, 1, totalWidth)
}

func (m model) formatListItem(text string, focused bool) string {
	return m.formatListItemCustom(text, focused, m.widthContent, true)
}

func (m model) formatListItemCustom(text string, focused bool, totalWidth int, showRadio bool) string {
	accent := m.theme.TextAccent().Render

	content := "     " + text
	hint := ""
	if focused {
		content = accent(" ☉   " + text)
		hint = accent("enter")
	}

	if !showRadio {
		content = text
	}

	padding := 6
	if !showRadio {
		padding = 2
	}

	var lines = strings.Split(content, "\n")
	var firstLine = lines[0]
	hintSpace := totalWidth - lipgloss.Width(hint) - lipgloss.Width(firstLine) - padding
	lines[0] = firstLine + m.theme.Base().Width(hintSpace).Render() + hint
	return lipgloss.JoinVertical(
		lipgloss.Left,
		lines...,
	)
}
