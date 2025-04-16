package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	terminal "github.com/terminaldotshop/terminal-sdk-go"
)

type finalSubState struct {
	weeks         int
	submitting    bool
	complete      bool
	viewport      viewport.Model
	viewportReady bool
}

type SubscriptionCompleteMsg struct{}

func (m model) updateFinalSubViewport() model {
	headerHeight := lipgloss.Height(m.HeaderView())
	breadcrumbsHeight := lipgloss.Height(m.BreadcrumbsView())
	footerHeight := lipgloss.Height(m.FooterView())
	verticalMarginHeight := headerHeight + footerHeight + breadcrumbsHeight

	availableHeight := m.heightContainer - verticalMarginHeight

	if !m.state.finalSub.viewportReady {
		// Initialize viewport for the first time
		m.state.finalSub.viewport = viewport.New(m.widthContent, availableHeight)
		m.state.finalSub.viewport.KeyMap = viewport.KeyMap{}
		m.state.finalSub.viewportReady = true
	} else {
		// Update existing viewport
		m.state.finalSub.viewport.Width = m.widthContent
		m.state.finalSub.viewport.Height = availableHeight
	}

	return m
}

func (m model) FinalSubSwitch() (model, tea.Cmd) {
	m = m.SwitchPage(finalSubPage)
	m.state.footer.commands = []footerCommand{
		{key: "+/-", value: "schedule"},
		{key: "enter", value: "subscribe"},
		{key: "esc", value: "skip"},
	}
	m.cart.Items = []terminal.CartItem{}
	m.cart.Subtotal = 0

	m.state.finalSub.weeks = 3
	m.state.finalSub.submitting = false
	m.state.finalSub.complete = false
	m = m.updateFinalSubViewport()

	// Update viewport content
	if m.state.finalSub.viewportReady {
		content := m.generateFinalSubContent()
		m.state.finalSub.viewport.SetContent(content)
	}

	return m, nil
}

func (m model) FinalSubUpdate(msg tea.Msg) (model, tea.Cmd) {
	// Update viewport dimensions if window size changed
	if _, ok := msg.(tea.WindowSizeMsg); ok {
		m = m.updateFinalSubViewport()

		// Update viewport content
		if m.state.finalSub.viewportReady {
			content := m.generateFinalSubContent()
			m.state.finalSub.viewport.SetContent(content)
		}
	}

	// Handle viewport scrolling
	var cmd tea.Cmd
	if m.state.finalSub.viewportReady {
		m.state.finalSub.viewport, cmd = m.state.finalSub.viewport.Update(msg)
	}

	switch msg := msg.(type) {
	case SubscriptionCompleteMsg:
		m.state.finalSub.submitting = false
		m.state.finalSub.complete = true
		m.state.footer.commands = []footerCommand{
			{key: "enter", value: "continue"},
		}
		return m, nil

	case error:
		m.state.finalSub.submitting = false
		return m, cmd

	case tea.KeyMsg:
		switch msg.String() {
		case "esc":
			return m.FinalSwitch() // Skip subscription
		case "enter":
			if m.state.finalSub.complete {
				return m.FinalSwitch()
			}

			m.state.finalSub.submitting = true
			return m, func() tea.Msg {
				for _, item := range m.order.Items {
					subscription := terminal.SubscriptionParam{
						Quantity:         terminal.F(item.Quantity),
						ProductVariantID: terminal.F(item.ProductVariantID),
						Schedule: terminal.F[terminal.SubscriptionScheduleUnionParam](
							terminal.SubscriptionScheduleWeeklyParam{
								Type:     terminal.F(terminal.SubscriptionScheduleWeeklyTypeWeekly),
								Interval: terminal.F(int64(m.state.finalSub.weeks)),
							},
						),
						AddressID: terminal.F(m.cart.AddressID),
						CardID:    terminal.F(m.cart.CardID),
					}
					params := terminal.SubscriptionNewParams{Subscription: subscription}
					_, err := m.client.Subscription.New(m.context, params)
					if err != nil {
						return err
					}
				}

				return SubscriptionCompleteMsg{}
			}

		case "+", "=", "l", "up", "right":
			if m.state.finalSub.complete {
				return m, nil
			}
			if m.state.finalSub.weeks < 12 {
				m.state.finalSub.weeks++ // Increase weeks between deliveries
			}
		case "-", "h", "down", "left":
			if m.state.finalSub.complete {
				return m, nil
			}
			if m.state.finalSub.weeks > 1 {
				m.state.finalSub.weeks-- // Decrease weeks between deliveries
			}
		}
	}
	return m, cmd
}

func (m model) generateFinalSubContent() string {
	base := m.theme.Base().Render
	accent := m.theme.TextAccent().Render

	if m.state.finalSub.submitting {
		return base(" creating subscription...")
	}

	if m.state.finalSub.complete {
		return base(" subscribed! press enter to continue...")
	}

	var view strings.Builder
	view.WriteString("order complete!" + "\n\n")
	view.WriteString(m.theme.TextAccent().Render("subscribe to your order?") + "\n\n")

	for _, item := range m.order.Items {
		product, _ := m.GetProductFromOrderItem(item)
		view.WriteString(fmt.Sprintf("%s (x%d)\n", product.Name, item.Quantity))
	}

	view.WriteString("\n")
	weeks := base(
		"delivery every  - ",
	) + accent(
		fmt.Sprintf("%d", m.state.finalSub.weeks),
	) + base(
		" +  weeks",
	)
	view.WriteString(weeks)
	view.WriteString("\n\n")
	view.WriteString(m.theme.TextBrand().Render("press enter to subscribe, esc to skip") + "\n")

	return m.theme.Base().Padding(0, 1).Render(view.String())
}

func (m model) FinalSubView() string {
	if !m.state.finalSub.viewportReady {
		m = m.updateFinalSubViewport()
	}

	// Update viewport content
	content := m.generateFinalSubContent()
	m.state.finalSub.viewport.SetContent(content)

	return lipgloss.Place(
		m.widthContainer,
		lipgloss.Height(m.state.finalSub.viewport.View()),
		lipgloss.Center,
		lipgloss.Center,
		m.state.finalSub.viewport.View(),
	)
}

func (m model) GetProductFromOrderItem(orderItem terminal.OrderItem) (*terminal.Product, int) {
	index := -1
	for i, product := range m.products {
		if product.Variants[0].ID == orderItem.ProductVariantID {
			index = i
			break
		}
	}

	var product *terminal.Product
	if index == -1 {
		return nil, index
	} else {
		product = &m.products[index]
	}

	return product, index
}
