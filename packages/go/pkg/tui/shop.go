package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/terminaldotshop/terminal-sdk-go"
	"github.com/terminaldotshop/terminal/go/pkg/tui/theme"
)

type shopState struct {
	selected int
}

func (m model) ShopSwitch() (model, tea.Cmd) {
	m = m.SwitchPage(shopPage)
	m.state.subscribe.product = nil

	m.state.footer.commands = []footerCommand{
		{key: "+/-", value: "qty"},
		{key: "c", value: "cart"},
		{key: "q", value: "quit"},
	}

	if len(m.products) > 1 {
		m.state.footer.commands = append(
			[]footerCommand{{key: "↑/↓", value: "products"}},
			m.state.footer.commands...,
		)
	}

	m = m.UpdateSelectedTheme()
	return m, nil
}

func (m model) ShopUpdate(msg tea.Msg) (model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		product := m.products[m.state.shop.selected]
		switch msg.String() {
		case "tab", "down", "j":
			return m.UpdateSelected(false)
		case "shift+tab", "up", "k":
			return m.UpdateSelected(true)
		case "+", "=", "right", "l":
			if product.Subscription == terminal.ProductSubscriptionRequired {
				return m, nil
			}
			productVariantID := m.products[m.state.shop.selected].Variants[0].ID
			return m.UpdateCart(productVariantID, 1)
		case "-", "left", "h":
			if product.Subscription == terminal.ProductSubscriptionRequired {
				return m, nil
			}
			productVariantID := m.products[m.state.shop.selected].Variants[0].ID
			return m.UpdateCart(productVariantID, -1)
		case "enter":
			if product.Subscription == terminal.ProductSubscriptionRequired {
				subscribed := false
				subscriptionId := ""
				for _, s := range m.subscriptions {
					for _, v := range product.Variants {
						if v.ID == s.ProductVariantID {
							subscriptionId = s.ID
							subscribed = true
						}
					}
				}
				if subscribed {
					return m.SubscriptionManageSwitch(subscriptionId)
				} else {
					m.state.subscribe.product = &product
					return m.SubscribeSwitch()
				}
			}
			return m.CartSwitch()
		}
	}

	return m, nil
}

func (m model) UpdateSelected(previous bool) (model, tea.Cmd) {
	var next int
	if previous {
		next = m.state.shop.selected - 1
	} else {
		next = m.state.shop.selected + 1
	}

	if next < 0 {
		next = 0
	}
	max := len(m.products) - 1
	if next > max {
		next = max
	}

	m.state.shop.selected = next
	m = m.UpdateSelectedTheme()
	return m, nil
}

func (m model) reorderProducts() model {
	var featured, originals []terminal.Product

	// Split into featured and originals while maintaining relative order within each category
	for _, p := range m.products {
		if val, exists := p.Tags["featured"]; !exists || val != "true" {
			originals = append(originals, p)
		} else {
			featured = append(featured, p)
		}
	}

	// Combine featured first, then originals
	m.products = append(featured, originals...)

	// Reset selection to avoid any out-of-bounds issues
	if len(m.products) > 0 {
		m.state.shop.selected = 0
	}

	return m
}

func (m model) ShopView() string {
	base := m.theme.Base().Render
	accent := m.theme.TextAccent().Render
	bold := m.theme.TextHighlight().Bold(true).Render
	button := m.theme.Base().
		PaddingLeft(1).
		PaddingRight(1).
		Align(lipgloss.Center).
		Background(m.theme.Highlight()).
		Foreground(m.theme.Background()).
		Render
	product := m.products[m.state.shop.selected]
	variantID := product.Variants[0].ID
	cartItem, _ := m.GetCartItem(variantID)
	minus := base("- ")
	plus := base(" +")
	count := accent(fmt.Sprintf(" %d ", cartItem.Quantity))
	quantity := minus + count + plus

	menuWidth := 0
	var featuredCount int

	// Calculate max width and count featured products
	for _, p := range m.products {
		w := lipgloss.Width(p.Name)
		if w > menuWidth {
			menuWidth = w
		}
		if val, exists := p.Tags["featured"]; exists && val == "true" {
			featuredCount++
		}
	}

	// Only consider section header widths if we have featured products
	if featuredCount > 0 {
		featuredHeader := "~ featured ~"
		originalsHeader := "~ originals ~"
		headerWidth := lipgloss.Width(featuredHeader)
		if w := lipgloss.Width(originalsHeader); w > headerWidth {
			headerWidth = w
		}
		if headerWidth > menuWidth {
			menuWidth = headerWidth
		}
	}

	var menuItem lipgloss.Style
	var highlightedMenuItem lipgloss.Style
	var sectionHeader lipgloss.Style

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
		sectionHeader = m.theme.Base().
			Width(menuWidth).
			Align(lipgloss.Center).
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
		sectionHeader = m.theme.Base().
			Width(menuWidth+2).
			Padding(0, 1).
			Foreground(m.theme.Accent())
	}

	if product.Subscription == terminal.ProductSubscriptionRequired {
		subscribed := false
		for _, s := range m.subscriptions {
			for _, v := range product.Variants {
				if v.ID == s.ProductVariantID {
					subscribed = true
				}
			}
		}

		if subscribed {
			quantity = button("manage sub") + " enter"
		} else {
			quantity = button("subscribe") + " enter"
		}
	}

	var products strings.Builder

	// If we have featured products, show sections
	if featuredCount > 0 {
		products.WriteString(sectionHeader.Render("~ featured ~"))
		products.WriteString("\n")

		for i := 0; i < featuredCount; i++ {
			var content string
			if i == m.state.shop.selected {
				content = highlightedMenuItem.Render(m.products[i].Name)
			} else {
				content = menuItem.Render(m.products[i].Name)
			}
			products.WriteString(content + "\n")
		}

		if featuredCount < len(m.products) {
			products.WriteString("\n")
			products.WriteString(sectionHeader.Render("~ originals ~"))
			products.WriteString("\n")

			for i := featuredCount; i < len(m.products); i++ {
				var content string
				if i == m.state.shop.selected {
					content = highlightedMenuItem.Render(m.products[i].Name)
				} else {
					content = menuItem.Render(m.products[i].Name)
				}
				products.WriteString(content + "\n")
			}
			products.WriteString("\n")
		}
	} else {
		// No sections, just list all products
		for i, p := range m.products {
			var content string
			if i == m.state.shop.selected {
				content = highlightedMenuItem.Render(p.Name)
			} else {
				content = menuItem.Render(p.Name)
			}
			products.WriteString(content + "\n")
		}
	}

	productList := m.theme.Base().Padding(0, 1).Render(products.String())
	productListWidth := lipgloss.Width(productList)
	detailPaddingLeft := 2
	detailWidth := m.widthContent - productListWidth - detailPaddingLeft
	detailStyle := m.theme.Base().
		PaddingLeft(detailPaddingLeft).
		Width(detailWidth)

	name := accent(product.Name)
	variantNames := ""
	for _, variant := range product.Variants {
		if variant.Name == product.Variants[len(product.Variants)-1].Name {
			variantNames += variant.Name
		} else {
			variantNames += variant.Name + "/"
		}
	}

	detail := lipgloss.JoinVertical(
		lipgloss.Left,
		name,
		base(strings.ToLower(variantNames)),
		"",
		bold(fmt.Sprintf("$%.2v", product.Variants[0].Price/100)),
		"",
		product.Description,
		"\n",
		quantity,
	)

	var content string
	if len(m.products) == 1 {
		content = m.theme.Base().Width(m.widthContent).Render(detail)
	} else if m.size < large {
		detailStyle := m.theme.Base().
			Width(m.widthContent)
		content = m.theme.Base().
			Width(m.widthContent).
			Render(lipgloss.JoinVertical(
				lipgloss.Top,
				productList,
				detailStyle.Render(detail),
			))
	} else {
		content = m.theme.Base().
			Width(m.widthContent).
			Render(lipgloss.JoinHorizontal(
				lipgloss.Top,
				productList,
				detailStyle.Render(detail),
			))
	}

	return content
}

func (m model) UpdateSelectedTheme() model {
	var highlight string
	product := m.products[m.state.shop.selected]
	if strings.ToLower(product.Name) == "segfault" {
		highlight = "#169FC1"
	} else if strings.ToLower(product.Name) == "dark mode" {
		highlight = "#118B39"
	} else if strings.ToLower(product.Name) == "[object object]" {
		highlight = "#F5BB1D"
	} else if strings.ToLower(product.Name) == "404" {
		highlight = "#D53C81"
	} else if strings.ToLower(product.Name) == "artisan" {
		highlight = "#EB4432"
	}

	if highlight != "" {
		m.theme = theme.BasicTheme(m.renderer, &highlight)
	} else {
		m.theme = theme.BasicTheme(m.renderer, nil)
	}

	return m
}
