package tui

import (
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	terminal "github.com/terminaldotshop/terminal-sdk-go"
	"github.com/terminaldotshop/terminal/go/pkg/tui/validate"
)

type shippingView = int

const (
	shippingListView shippingView = iota
	shippingFormView
)

type shippingInput struct {
	name     string
	street1  string
	street2  string
	city     string
	province string
	country  string
	zip      string
	phone    string
}

type shippingState struct {
	view          shippingView
	selected      int
	deleting      *int
	input         shippingInput
	form          *huh.Form
	submitting    bool
	viewport      viewport.Model
	viewportReady bool
}

type SelectedShippingUpdatedMsg struct {
	shippingID string
}

type ShippingAddressAddedMsg struct {
	shippingID string
	addresses  []terminal.Address
}

func (m model) updateShippingViewport() model {
	headerHeight := lipgloss.Height(m.HeaderView())
	breadcrumbsHeight := lipgloss.Height(m.BreadcrumbsView())
	footerHeight := lipgloss.Height(m.FooterView())
	verticalMarginHeight := headerHeight + footerHeight + breadcrumbsHeight

	availableHeight := m.heightContainer - verticalMarginHeight

	if !m.state.shipping.viewportReady {
		// Initialize viewport for the first time
		m.state.shipping.viewport = viewport.New(m.widthContent, availableHeight)
		m.state.shipping.viewport.KeyMap = viewport.KeyMap{}
		m.state.shipping.viewportReady = true
	} else {
		// Update existing viewport
		m.state.shipping.viewport.Width = m.widthContent
		m.state.shipping.viewport.Height = availableHeight
	}

	return m
}

// ensures the currently focused form input is visible in the viewport
func (m model) ensureShippingFocusedInputIsVisible() model {
	var focusedIndex int
	focusedField := m.state.shipping.form.GetFocusedField().GetKey()
	if focusedField == "name" {
		focusedIndex = 0
	} else if focusedField == "street1" {
		focusedIndex = 1
	} else if focusedField == "street2" {
		focusedIndex = 2
	} else if focusedField == "city" {
		focusedIndex = 3
	} else if focusedField == "province" {
		focusedIndex = 4
	} else if focusedField == "country" {
		focusedIndex = 5
	} else if focusedField == "zip" {
		focusedIndex = 6
	} else if focusedField == "phone" {
		focusedIndex = 7
	} else {
		focusedIndex = 0
	}

	if m.state.shipping.viewportReady && m.state.shipping.view == shippingFormView {
		// Make sure the current focused input is visible
		inputHeight := 4 // Average height of an input field with padding

		// For columns layout (non-small screens), inputs are split into two columns
		// The left column has inputs 0-3, the right column has inputs 4-7
		// We need to calculate the vertical position based on which column the input is in
		fieldsPerCol := 4 // 4 fields in each column

		var targetY int

		if m.size == small {
			// On small screens, layout is stacked
			targetY = focusedIndex * inputHeight
		} else {
			// On larger screens, layout is in columns
			// Calculate which column and row the focused input is in
			rowIndex := focusedIndex % fieldsPerCol // 0-3 for position within column

			// Calculate vertical position based only on row index
			targetY = rowIndex * inputHeight
		}

		// If field is above viewport, scroll up
		if targetY < m.state.shipping.viewport.YOffset {
			m.state.shipping.viewport.SetYOffset(targetY)
		}

		// If field is below viewport, scroll down
		viewportBottom := m.state.shipping.viewport.YOffset + m.state.shipping.viewport.Height
		if targetY+inputHeight > viewportBottom {
			m.state.shipping.viewport.SetYOffset(targetY + inputHeight - m.state.shipping.viewport.Height)
		}
	}

	return m
}

func (m model) ShippingSwitch() (model, tea.Cmd) {
	m = m.SwitchPage(shippingPage)
	m.state.footer.commands = []footerCommand{
		{key: "esc", value: "back"},
		{key: "↑/↓", value: "addresses"},
		{key: "x/del", value: "remove"},
		{key: "enter", value: "select"},
	}
	m.state.shipping.submitting = false
	m = m.updateShippingViewport()
	m.state.shipping.form = m.createShippingForm()
	m.state.shipping.view = shippingListView
	if len(m.addresses) == 0 {
		m.state.shipping.view = shippingFormView
	}

	m = m.updateShippingForm()
	return m, m.state.shipping.form.Init()
}

func (m model) updateShippingForm() model {
	if m.size == small {
		m.state.shipping.form = m.state.shipping.form.
			WithLayout(huh.LayoutStack).
			WithWidth(m.widthContent)
	} else {
		m.state.shipping.form = m.state.shipping.form.
			WithLayout(huh.LayoutColumns(2)).
			WithWidth(m.widthContent)
	}

	return m
}

func (m model) nextAddress() (model, tea.Cmd) {
	next := m.state.shipping.selected + 1
	max := len(m.addresses)
	if next > max {
		next = max
	}

	m.state.shipping.selected = next
	return m, nil
}

func (m model) previousAddress() (model, tea.Cmd) {
	next := max(m.state.shipping.selected-1, 0)
	m.state.shipping.selected = next
	return m, nil
}

func (m model) SetShipping(shippingID string) error {
	if m.IsSubscribing() {
		return nil
	}

	params := terminal.CartSetAddressParams{AddressID: terminal.F(shippingID)}
	_, err := m.client.Cart.SetAddress(m.context, params)
	if err != nil {
		return err
	}
	return nil
}

func (m model) GetSelectedAddress() *terminal.Address {
	if m.IsSubscribing() {
		for _, address := range m.addresses {
			if address.ID == m.subscription.AddressID.Value {
				return &address
			}
		}
		return nil
	}

	for _, address := range m.addresses {
		if address.ID == m.cart.AddressID {
			return &address
		}
	}
	return nil
}

func (m model) chooseAddress() (model, tea.Cmd) {
	if m.state.shipping.selected < len(m.addresses) { // existing address
		shippingID := m.addresses[m.state.shipping.selected].ID

		m.state.shipping.submitting = true
		return m, func() tea.Msg {
			err := m.SetShipping(shippingID)
			if err != nil {
				return err
			}
			return SelectedShippingUpdatedMsg{shippingID: shippingID}
		}
	} else { // new
		m.state.shipping.input = shippingInput{country: "US"}
		m.state.shipping.view = shippingFormView
		m.state.shipping.form = m.createShippingForm()
		m = m.updateShippingForm()
		return m, m.state.shipping.form.Init()
	}
}

func (m model) shippingListUpdate(msg tea.Msg) (model, tea.Cmd) {
	cmds := []tea.Cmd{}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "j", "down", "tab":
			if m.state.shipping.deleting == nil {
				return m.nextAddress()
			}
		case "k", "up", "shift+tab":
			if m.state.shipping.deleting == nil {
				return m.previousAddress()
			}
		case "delete", "d", "backspace", "x":
			if m.state.shipping.deleting == nil && m.state.shipping.selected < len(m.addresses) {
				m.state.shipping.deleting = &m.state.shipping.selected
			}
			return m, nil
		case "y":
			if m.state.shipping.deleting != nil {
				m.state.shipping.deleting = nil
				_, err := m.client.Address.Delete(m.context, m.addresses[m.state.shipping.selected].ID)
				if err != nil {
					return m, func() tea.Msg { return err }
				}
				if len(m.addresses)-1 == 0 && m.page == accountPage {
					m.state.account.focused = false
				}
				return m, func() tea.Msg {
					shipping, err := m.client.Address.List(m.context)
					if err != nil {
						return err
					}
					return shipping.Data
				}
			}
			return m, nil
		case "n":
			m.state.shipping.deleting = nil
			return m, nil
		case "enter":
			if m.state.shipping.deleting == nil {
				return m.chooseAddress()
			}
		case "esc":
			if m.state.shipping.deleting != nil {
				m.state.shipping.deleting = nil
			} else if m.IsSubscribing() {
				if m.SubscribeItemCount() == 1 {
					return m.ShopSwitch()
				}
				return m.SubscribeSwitch()
			} else {
				return m.CartSwitch()
			}
		}
	}

	return m, tea.Batch(cmds...)
}

func (m model) shippingFormUpdate(msg tea.Msg) (model, tea.Cmd) {
	cmds := []tea.Cmd{}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "esc":
			m.state.shipping.view = shippingListView
			return m, nil
		}

	case ShippingAddressAddedMsg:
		m.addresses = msg.addresses

		return m, func() tea.Msg {
			err := m.SetShipping(msg.shippingID)
			if err != nil {
				return err
			}

			return SelectedShippingUpdatedMsg{shippingID: msg.shippingID}
		}
	}

	m = m.updateShippingForm()

	// Update the form
	next, cmd := m.state.shipping.form.Update(msg)
	cmds = append(cmds, cmd)
	m.state.shipping.form = next.(*huh.Form)

	errors := m.state.shipping.form.Errors()
	if len(errors) > 0 {
		cmds = append(cmds, func() tea.Msg { return errors[0] })
		return m, tea.Batch(cmds...)
	}

	// If the viewport is ready, adjust the viewport
	if m.state.shipping.viewportReady {
		// Call our helper function to ensure the focused input is visible
		m = m.ensureShippingFocusedInputIsVisible()
	}

	if !m.state.shipping.submitting && m.state.shipping.form.State == huh.StateCompleted {
		m.state.shipping.submitting = true

		form := m.state.shipping.form
		m.state.shipping.input = shippingInput{
			name:     form.GetString("name"),
			street1:  form.GetString("street1"),
			street2:  form.GetString("street2"),
			city:     form.GetString("city"),
			province: form.GetString("province"),
			country:  form.GetString("country"),
			zip:      form.GetString("zip"),
			phone:    form.GetString("phone"),
		}

		return m, func() tea.Msg {
			if m.state.shipping.input.country != "US" && m.state.shipping.input.phone == "" {
				return VisibleError{message: "phone is required for international orders"}
			}

			params := terminal.AddressNewParams{
				Name:     terminal.String(m.state.shipping.input.name),
				Street1:  terminal.String(m.state.shipping.input.street1),
				Street2:  terminal.String(m.state.shipping.input.street2),
				City:     terminal.String(m.state.shipping.input.city),
				Province: terminal.String(m.state.shipping.input.province),
				Country:  terminal.String(m.state.shipping.input.country),
				Zip:      terminal.String(m.state.shipping.input.zip),
				Phone:    terminal.String(m.state.shipping.input.phone),
			}
			response, err := m.client.Address.New(m.context, params)
			if err != nil {
				return err
			}
			addresses, err := m.client.Address.List(m.context)
			if err != nil {
				return err
			}
			return ShippingAddressAddedMsg{
				shippingID: response.Data,
				addresses:  addresses.Data,
			}
		}
	}

	return m, tea.Batch(cmds...)
}

func (m model) ShippingUpdate(msg tea.Msg) (model, tea.Cmd) {
	// Update viewport dimensions if window size changed
	if _, ok := msg.(tea.WindowSizeMsg); ok {
		m = m.updateShippingViewport()
	}

	switch msg := msg.(type) {
	case error:
		if m.state.shipping.view != shippingFormView || m.state.shipping.form.State == huh.StateCompleted {
			current := m.state.shipping.view
			m, cmd := m.ShippingSwitch()
			m.state.shipping.view = current
			return m, cmd
		}
	case SelectedShippingUpdatedMsg:
		if m.IsSubscribing() {
			m.subscription.AddressID = terminal.String(msg.shippingID)
		} else {
			m.cart.AddressID = msg.shippingID
			cart, err := m.client.Cart.Get(m.context)
			if err != nil {
				return m, func() tea.Msg { return err }
			}
			m.cart = cart.Data
		}
		return m.PaymentSwitch()
	}

	// Get content before updating
	var content string
	if m.state.shipping.view == shippingListView {
		m, cmd := m.shippingListUpdate(msg)

		// Keep selected item in view if selection changed
		if m.state.shipping.viewportReady {
			content = m.shippingListView()
			m.state.shipping.viewport.SetContent(content)

			// Scroll to keep selected item in view
			itemHeight := 3 // Approximate height of an address box
			targetY := m.state.shipping.selected * itemHeight

			// If item is above viewport, scroll up
			if targetY < m.state.shipping.viewport.YOffset {
				m.state.shipping.viewport.SetYOffset(targetY)
			}

			// If item is below viewport, scroll down
			if targetY+itemHeight > m.state.shipping.viewport.YOffset+m.state.shipping.viewport.Height {
				m.state.shipping.viewport.SetYOffset(targetY - m.state.shipping.viewport.Height + itemHeight + 1)
			}

			// If last item, scroll to bottom
			if m.state.shipping.selected == len(m.addresses) {
				m.state.shipping.viewport.GotoBottom()
			}
		}

		return m, cmd
	} else {
		m, cmd := m.shippingFormUpdate(msg)

		if m.state.shipping.viewportReady {
			content = m.shippingFormView()
			m.state.shipping.viewport.SetContent(content)
			m = m.ensureShippingFocusedInputIsVisible()
		}

		return m, cmd
	}
}

func (m model) ShippingView() string {
	if m.state.shipping.submitting {
		return m.theme.Base().Width(m.widthContent).Render("  calculating shipping costs...")
	}

	if !m.state.shipping.viewportReady {
		m = m.updateShippingViewport()
	}

	return lipgloss.Place(
		m.widthContainer,
		lipgloss.Height(m.state.shipping.viewport.View()),
		lipgloss.Center,
		lipgloss.Center,
		m.state.shipping.viewport.View(),
	)
}

func (m model) formatAddress(address terminal.Address, focused bool) string {
	parts := []string{}
	parts = append(parts, address.Street1+", ")
	if address.Street2 != "" {
		parts = append(parts, address.Street2+", ")
	}
	parts = append(parts, address.City+", "+address.Province+", "+address.Country+", ")
	parts = append(parts, address.Zip)

	return m.formatListItem(lipgloss.JoinHorizontal(lipgloss.Left, parts...), focused)
}

func (m model) shippingListView() string {
	base := m.theme.Base().Render
	accent := m.theme.TextAccent().Render

	addresses := []string{}
	for i, address := range m.addresses {
		content := m.formatAddress(address, i == m.state.shipping.selected)
		if m.state.shipping.deleting != nil && *m.state.shipping.deleting == i {
			content = m.formatListItem(accent("are you sure?")+base(" (y/n)"), true)
		}
		box := m.CreateBox(content, i == m.state.shipping.selected)
		addresses = append(addresses, box)
	}

	newAddressIndex := len(m.addresses)
	newAddress := m.CreateBox(
		m.formatListItem("add new address", m.state.shipping.selected == newAddressIndex),
		m.state.shipping.selected == newAddressIndex,
	)
	addresses = append(addresses, newAddress)
	addressList := lipgloss.JoinVertical(lipgloss.Left, addresses...)

	return m.theme.Base().Render(lipgloss.JoinVertical(
		lipgloss.Left,
		" select shipping address",
		addressList,
	))
}

func (m model) shippingFormView() string {
	return lipgloss.JoinVertical(
		lipgloss.Left,
		m.state.shipping.form.View(),
	)
}

func (m model) createShippingForm() *huh.Form {
	return huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("name").
				Key("name").
				Value(&m.user.User.Name).
				Validate(validate.NotEmpty("name")),
			huh.NewInput().
				Title("street 1").
				Key("street1").
				Value(&m.state.shipping.input.street1).
				Validate(validate.NotEmpty("street 1")),
			huh.NewInput().
				Title("street 2").
				Key("street2").
				Value(&m.state.shipping.input.street2),
			huh.NewInput().
				Title("city").
				Key("city").
				Value(&m.state.shipping.input.city).
				Validate(validate.NotEmpty("city")),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("state").
				Key("province").
				Value(&m.state.shipping.input.province),
			huh.NewInput().
				Title("country").
				Key("country").
				Value(&m.state.shipping.input.country).
				Validate(validate.NotEmpty("country")),
			huh.NewInput().
				Title("phone").
				Key("phone").
				Value(&m.state.shipping.input.phone),
			huh.NewInput().
				Title("postal code").
				Key("zip").
				Value(&m.state.shipping.input.zip).
				Validate(validate.NotEmpty("postal code")),
		),
	).
		WithTheme(m.theme.Form()).
		WithShowErrors(false).
		WithShowHelp(false)
}
