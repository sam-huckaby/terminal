package tui

import (
	"fmt"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	terminal "github.com/terminaldotshop/terminal-sdk-go"
)

type finalState struct {
	viewport      viewport.Model
	viewportReady bool
}

func (m model) updateFinalViewport() model {
	headerHeight := lipgloss.Height(m.HeaderView())
	breadcrumbsHeight := lipgloss.Height(m.BreadcrumbsView())
	footerHeight := lipgloss.Height(m.FooterView())
	verticalMarginHeight := headerHeight + footerHeight + breadcrumbsHeight

	availableHeight := m.heightContainer - verticalMarginHeight

	if !m.state.final.viewportReady {
		// Initialize viewport for the first time
		m.state.final.viewport = viewport.New(m.widthContent, availableHeight)
		m.state.final.viewport.KeyMap = viewport.DefaultKeyMap()
		m.state.final.viewportReady = true
	} else {
		// Update existing viewport
		m.state.final.viewport.Width = m.widthContent
		m.state.final.viewport.Height = availableHeight
	}

	return m
}

func (m model) FinalSwitch() (model, tea.Cmd) {
	m = m.SwitchPage(finalPage)
	m.state.footer.commands = []footerCommand{
		{key: "enter", value: "done"},
	}
	m.cart.Items = []terminal.CartItem{}
	m.cart.Subtotal = 0
	m = m.updateFinalViewport()

	// Update viewport content
	if m.state.final.viewportReady {
		content := m.generateFinalContent()
		m.state.final.viewport.SetContent(content)
	}
	return m, nil
}

func (m model) FinalUpdate(msg tea.Msg) (model, tea.Cmd) {
	// Update viewport dimensions if window size changed
	if _, ok := msg.(tea.WindowSizeMsg); ok {
		m = m.updateFinalViewport()

		// Update viewport content
		if m.state.final.viewportReady {
			content := m.generateFinalContent()
			m.state.final.viewport.SetContent(content)
		}
	}

	// Handle viewport scrolling
	var cmd tea.Cmd
	if m.state.final.viewportReady {
		m.state.final.viewport, cmd = m.state.final.viewport.Update(msg)
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "enter", "esc":
			return m, tea.Quit
		}
	}
	return m, cmd
}

func (m model) generateFinalContent() string {
	return m.theme.Base().Width(m.widthContent).Padding(0, 1).Render(lipgloss.JoinVertical(
		lipgloss.Left,
		m.theme.TextAccent().Render("Thank you for ordering with Terminal Products, Inc.")),
		"\n\nAt this very moment as you sit, stunned and in awe of the CLI experience that just befell you, a personalized order confirmation email is on its way to your inbox.\n\nSimultaneously, news of your order is being celebrated wildly by the team. Perhaps too wildly by some. Once the excitement of your order has subsided to manageable levels your order will be sealed, shipped, and tracked courtesy of our very own Chief of SST.\n\nYours sincerely,\n\nDax, Adam, Prime, Teej, David\n\nTerminal Products, Inc.",
		fmt.Sprintf("\n\nps. %s", m.theme.TextBrand().Render("https://www.terminal.shop/xxx")),
	)
}

func (m model) FinalView() string {
	if !m.state.final.viewportReady {
		m = m.updateFinalViewport()
	}

	// Update viewport content
	content := m.generateFinalContent()
	m.state.final.viewport.SetContent(content)

	return lipgloss.Place(
		m.widthContainer,
		lipgloss.Height(m.state.final.viewport.View()),
		lipgloss.Center,
		lipgloss.Center,
		m.state.final.viewport.View(),
	)
}
