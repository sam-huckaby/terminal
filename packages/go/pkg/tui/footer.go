package tui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/terminaldotshop/terminal-sdk-go"
)

type footerState struct {
	commands []footerCommand
}

type footerCommand struct {
	key   string
	value string
}

// ToggleRegion switches between regions and creates a new client with the updated region header
func (m model) ToggleRegion() (model, tea.Cmd) {
	// Toggle between "na" and "eu"
	newRegion := terminal.RegionEu
	if m.region != nil && *m.region == terminal.RegionEu {
		newRegion = terminal.RegionNa
	}

	// Update the model's region
	m.region = &newRegion

	// Create new client with updated region
	m.client = m.CreateSDKClient()

	// Return command to reload data
	cmd := func() tea.Msg {
		m.client.Cart.Clear(m.context)
		response, _ := m.client.View.Init(m.context)
		return response.Data
	}

	return m, cmd
}

func (m model) FooterView() string {
	bold := m.theme.TextAccent().Bold(true).Render
	base := m.theme.Base().Render

	table := m.theme.Base().
		Width(m.widthContainer).
		BorderTop(true).
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(m.theme.Border()).
		PaddingBottom(1).
		Align(lipgloss.Center)

	if m.size == small && m.hasMenu {
		return table.Render(bold("m") + base(" menu"))
	}

	// Note: Region selection is now handled server-side based on client IP
	// but we keep the UI indicator to show which region's products are displayed
	naFlag := "🇺🇸" // US flag for North America
	euFlag := "🇪🇺" // EU flag

	var regionSelector string
	if m.region == nil || *m.region == terminal.RegionNa {
		regionSelector = base(" " + naFlag + " (US)")
	} else {
		regionSelector = base(" " + euFlag + " (EU)")
	}

	// Add other commands
	commands := []string{}
	for _, cmd := range m.state.footer.commands {
		commands = append(commands, bold(" "+cmd.key+" ")+base(cmd.value+"  "))
	}

	lines := []string{}
	if m.page == shopPage {
		lines = append(lines, bold("r")+regionSelector)
		lines = append(lines, base("  "))
	}
	lines = append(lines, commands...)

	// Add the region selector and the rest of the commands
	return lipgloss.JoinVertical(
		lipgloss.Center,
		"free shipping on US orders over $40",
		table.Render(
			lipgloss.JoinHorizontal(
				lipgloss.Center,
				lines...,
			),
		))
}
