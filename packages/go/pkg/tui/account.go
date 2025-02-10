package tui

import (
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type accountState struct {
	selected int
	focused  bool
}

func (m model) AccountSwitch() (model, tea.Cmd) {
	m = m.SwitchPage(accountPage)
	m.state.account.selected = 0
	m.state.account.focused = false
	m.state.tokens = tokensState{
		selected: 0,
	}
	m.state.footer.commands = []footerCommand{
		{key: "↑/↓", value: "navigate"},
		{key: "enter", value: "select"},
	}

	return m, nil
}

func (m model) AccountUpdate(msg tea.Msg) (model, tea.Cmd) {
	accountPage := m.accountPages[m.state.account.selected]

	if m.state.account.focused {
		switch msg := msg.(type) {
		case tea.KeyMsg:
			switch msg.String() {
			case "esc", "left", "h":
				s := m.state.account.selected
				m, c := m.AccountSwitch()
				m.state.account.selected = s
				return m, c
			}
		}

		switch accountPage {
		case subscriptionsPage:
			return m.SubscriptionsUpdate(msg)
		case tokensPage:
			return m.TokensUpdate(msg)
		case ordersPage:
			return m.OrdersUpdate(msg)
		case shippingPage:
			return m.ShippingUpdate(msg)
		case paymentPage:
			return m.PaymentUpdate(msg)
		}
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		// product := m.products[m.state.shop.selected]
		switch msg.String() {
		case "tab", "down", "j":
			return m.UpdateSelectedAccountPage(false)
		case "shift+tab", "up", "k":
			return m.UpdateSelectedAccountPage(true)
		case "enter", "right", "l":
			if accountPage == subscriptionsPage ||
				accountPage == ordersPage ||
				accountPage == tokensPage {
				m.state.account.focused = true
				switch accountPage {
				case subscriptionsPage:
					return m.SubscriptionsUpdate(msg)
				case tokensPage:
					return m.TokensUpdate(msg)
				case ordersPage:
					return m.OrdersUpdate(msg)
				}

			}
			return m, nil
		}
	}

	return m, nil
}

func getAccountPageName(accountPage page) string {
	switch accountPage {
	case ordersPage:
		return "Order History"
	case subscriptionsPage:
		return "Subscriptions"
	case tokensPage:
		return "Access Tokens"
	case shippingPage:
		return "Addresses"
	case paymentPage:
		return "Payment Methods"
	case faqPage:
		return "FAQ"
	case aboutPage:
		return "About"
	}

	return ""
}

func (m model) GetAccountPageContent(accountPage page, totalWidth int) string {
	switch accountPage {
	case ordersPage:
		return m.OrdersView(totalWidth, m.state.account.focused)
	case subscriptionsPage:
		return m.SubscriptionsView(totalWidth, m.state.account.focused)
	case tokensPage:
		return m.TokensView(totalWidth, m.state.account.focused)
	case shippingPage:
		return m.ShippingView(totalWidth, m.state.account.focused)
	case faqPage:
		return m.FaqView()
	case aboutPage:
		return m.AboutView()
	}

	return ""
}

func (m model) AccountView() string {
	// base := m.theme.Base().Render
	// accent := m.theme.TextAccent().Render
	// bold := m.theme.TextHighlight().Bold(true).Render
	// button := m.theme.Base().
	// 	PaddingLeft(1).
	// 	PaddingRight(1).
	// 	Align(lipgloss.Center).
	// 	Background(m.theme.Highlight()).
	// 	Foreground(m.theme.Background()).
	// 	Render

	accountPage := m.accountPages[m.state.account.selected]

	menuWidth := 0
	pages := strings.Builder{}
	for _, page := range m.accountPages {
		w := lipgloss.Width(getAccountPageName(page))
		if w > menuWidth {
			menuWidth = w
		}
	}

	var menuItem lipgloss.Style
	var highlightedMenuItem lipgloss.Style

	if m.size < large {
		menuWidth = m.widthContent

		menuItem = m.theme.Base().
			Width(menuWidth).
			Align(lipgloss.Center)
		highlightedMenuItem = m.theme.Base().
			Width(menuWidth).
			Align(lipgloss.Center).
			Background(m.theme.Highlight()).
			Foreground(m.theme.Accent())
	} else {
		menuItem = m.theme.Base().
			Width(menuWidth+2).
			Padding(0, 1)
		highlightedMenuItem = m.theme.Base().
			Width(menuWidth+2).
			Padding(0, 1).
			Background(m.theme.Highlight()).
			Foreground(m.theme.Accent())
	}

	for i, p := range m.accountPages {
		name := getAccountPageName(p)

		var content string
		if i == m.state.account.selected {
			content = highlightedMenuItem.Render(name)
		} else {
			content = menuItem.Render(name)
		}

		pages.WriteString(content + "\n")
	}

	pageList := m.theme.Base().Padding(0, 1).Render(pages.String())
	pageListWidth := lipgloss.Width(pageList)

	detailPaddingLeft := 2
	detailWidth := m.widthContent - pageListWidth - detailPaddingLeft
	detailStyle := m.theme.Base().
		PaddingLeft(detailPaddingLeft).
		Width(detailWidth)
	// name := accent(getAccountPageName(accountPage))

	var content string
	if m.size < large {
		detail := m.GetAccountPageContent(accountPage, m.widthContent-2)
		detailStyle := m.theme.Base().
			Width(m.widthContent)

		content = m.theme.Base().
			Width(m.widthContent).
			Render(lipgloss.JoinVertical(
				lipgloss.Top,
				pageList,
				detailStyle.Render(detail),
			))
	} else {
		detail := m.GetAccountPageContent(accountPage, detailWidth-4)
		content = m.theme.Base().
			Width(m.widthContent).
			Render(lipgloss.JoinHorizontal(
				lipgloss.Top,
				pageList,
				detailStyle.Render(detail),
			))
	}

	return content
}

func (m model) UpdateSelectedAccountPage(previous bool) (model, tea.Cmd) {
	var next int
	if previous {
		next = m.state.account.selected - 1
	} else {
		next = m.state.account.selected + 1
	}

	if next < 0 {
		next = 0
	}
	max := len(m.accountPages) - 1
	if next > max {
		next = max
	}

	m.state.account.selected = next
	m.switched = true
	return m, nil
}
