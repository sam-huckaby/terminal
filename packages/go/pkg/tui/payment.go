package tui

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/log"
	"github.com/stripe/stripe-go/v78"
	"github.com/terminaldotshop/terminal-sdk-go"
	"github.com/terminaldotshop/terminal/go/pkg/api"
	"github.com/terminaldotshop/terminal/go/pkg/tui/qrfefe"
	"github.com/terminaldotshop/terminal/go/pkg/tui/validate"
)

type paymentView = int

const (
	paymentListView paymentView = iota
	paymentFormView
	paymentHttpsView
)

type paymentInput struct {
	number string
	month  string
	year   string
	zip    string
}

type paymentState struct {
	selected   int
	deleting   *int
	view       paymentView
	input      paymentInput
	form       *huh.Form
	submitting bool
	generating bool
	error      string
	url        *string
}

type SelectedCardUpdatedMsg struct {
	cardID string
}

type PollPaymentInitMsg struct {
	paymentUrl string
}

type PollPaymentStatusMsg struct {
	cardCount int
}

type PollPaymentCompleteMsg struct {
	cards []terminal.Card
}

func (m model) GetSelectedCard() *terminal.Card {
	if m.IsSubscribing() {
		for _, card := range m.cards {
			if card.ID == m.subscription.CardID.Value {
				return &card
			}
		}
		return nil
	}

	for _, card := range m.cards {
		if card.ID == m.cart.CardID {
			return &card
		}
	}
	return nil
}

func (m model) PaymentSwitch() (model, tea.Cmd) {
	if m.IsCartEmpty() && !m.IsSubscribing() {
		return m, nil
	}
	m = m.SwitchPage(paymentPage)
	m.state.footer.commands = []footerCommand{
		{key: "esc", value: "back"},
		{key: "↑/↓", value: "cards"},
		{key: "x/del", value: "remove"},
		{key: "enter", value: "select"},
	}
	m.state.payment.submitting = false
	m.state.payment.form = huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("name").
				Key("name").
				Value(&m.user.User.Name).
				Validate(validate.NotEmpty("name")),
			huh.NewInput().
				Title("email address").
				Key("email").
				Value(&m.user.User.Email).
				Validate(
					validate.Compose(
						validate.NotEmpty("email address"),
						validate.EmailValidator,
					),
				),
			huh.NewInput().
				Title("card number").
				Key("number").
				Value(&m.state.payment.input.number).
				Validate(validate.CcnValidator),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("expiry month").
				Key("month").
				Value(&m.state.payment.input.month).
				Validate(
					validate.Compose(
						validate.NotEmpty("expiry month"),
						validate.IsDigits("expiry month"),
						validate.MustBeLen(2, "expiry month"),
					),
				),
			huh.NewInput().
				Title("expiry year").
				Key("year").
				Value(&m.state.payment.input.year).
				Validate(
					validate.Compose(
						validate.NotEmpty("expiry year"),
						validate.IsDigits("expiry year"),
						validate.MustBeLen(2, "expiry year"),
					),
				),
			huh.NewInput().
				Title("cvc number").
				Key("cvc").
				Validate(
					validate.Compose(
						validate.NotEmpty("cvc"),
						validate.IsDigits("cvc"),
						validate.WithinLen(3, 4, "cvc"),
					),
				),
			huh.NewInput().
				Title("zip").
				Key("zip").
				Value(&m.state.payment.input.zip).
				Validate(
					validate.Compose(
						validate.NotEmpty("zip"),
					),
				),
		),
	).
		WithTheme(m.theme.Form()).
		WithShowHelp(false)

	m.state.payment.view = paymentListView
	// if len(m.cards) == 0 {
	// 	m.state.payment.view = paymentFormView
	// }

	m = m.updatePaymentForm()
	return m, m.state.payment.form.Init()
}

type VisibleError struct {
	message string
}

func getCleanCardNumber(cardNumber string) string {
	var cleanNumber strings.Builder
	for _, char := range cardNumber {
		if char >= '0' && char <= '9' {
			cleanNumber.WriteRune(char)
		}
	}
	return cleanNumber.String()
}

func formatLast4(last4 string) string {
	hiddenPart := "**** **** **** "
	return hiddenPart + last4
}

func formatExpiration(expiration terminal.CardExpiration) string {
	return fmt.Sprintf("%02d/%02d", expiration.Month, expiration.Year%100)
}

func (m model) updatePaymentForm() model {
	if m.size == small {
		m.state.payment.form = m.state.payment.form.
			WithLayout(huh.LayoutStack).
			WithWidth(m.widthContent)
	} else {
		m.state.payment.form = m.state.payment.form.
			WithLayout(huh.LayoutColumns(2)).
			WithWidth(m.widthContent)
	}

	return m
}

func (m model) nextPaymentMethod() (model, tea.Cmd) {
	next := m.state.payment.selected + 1
	max := len(m.cards) + 1 // add new, add new https
	if next > max {
		next = max
	}

	m.state.payment.selected = next
	return m, nil
}

func (m model) previousPaymentMethod() (model, tea.Cmd) {
	next := m.state.payment.selected - 1
	if next < 0 {
		next = 0
	}

	m.state.payment.selected = next
	return m, nil
}

func (m model) SetCard(cardID string) {
	if m.IsSubscribing() {
		return
	}

	params := terminal.CartSetCardParams{CardID: terminal.F(cardID)}
	m.client.Cart.SetCard(m.context, params)
}

func (m model) choosePaymentMethod() (model, tea.Cmd) {
	if m.state.payment.selected < len(m.cards) { // existing method
		cardID := m.cards[m.state.payment.selected].ID
		return m, func() tea.Msg {
			m.SetCard(cardID)
			return SelectedCardUpdatedMsg{cardID: cardID}
		}
	} else if m.state.payment.selected == len(m.cards) { // new ssh
		m.state.payment.input = paymentInput{}
		m.state.payment.view = paymentFormView
	} else if m.state.payment.selected == len(m.cards)+1 { // new https
		m.state.payment.generating = true
		m.state.payment.view = paymentHttpsView
		return m, func() tea.Msg {
			resp, _ := m.client.Card.Collect(m.context)
			return PollPaymentInitMsg{paymentUrl: resp.Data.URL}
		}
	}

	return m, nil
}

func (m model) paymentListUpdate(msg tea.Msg) (model, tea.Cmd) {
	cmds := []tea.Cmd{}

	m.state.footer.commands = []footerCommand{
		{key: "esc", value: "back"},
		{key: "↑/↓", value: "cards"},
		{key: "x/del", value: "remove"},
		{key: "enter", value: "select"},
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "j", "down", "tab":
			if m.state.payment.deleting == nil {
				return m.nextPaymentMethod()
			}
		case "k", "up", "shift+tab":
			if m.state.payment.deleting == nil {
				return m.previousPaymentMethod()
			}
		case "delete", "d", "backspace", "x":
			if m.state.payment.deleting == nil && m.state.payment.selected < len(m.cards) {
				m.state.payment.deleting = &m.state.payment.selected
			}
			return m, nil
		case "y":
			if m.state.payment.deleting != nil {
				m.state.payment.deleting = nil
				m.client.Card.Delete(m.context, m.cards[m.state.payment.selected].ID)
				if len(m.cards)-1 == 0 && m.page == accountPage {
					m.state.account.focused = false
				}
				return m, func() tea.Msg {
					cards, _ := m.client.Card.List(m.context)
					return cards.Data
				}
			}
			return m, nil
		case "n":
			m.state.payment.deleting = nil
			return m, nil
		case "enter":
			if m.state.payment.deleting == nil {
				return m.choosePaymentMethod()
			}
		case "esc":
			if m.state.payment.deleting != nil {
				m.state.payment.deleting = nil
			} else {
				return m.ShippingSwitch()
			}
		}
	}

	return m, tea.Batch(cmds...)
}

func (m model) paymentFormUpdate(msg tea.Msg) (model, tea.Cmd) {
	cmds := []tea.Cmd{}

	m.state.footer.commands = []footerCommand{
		{key: "esc", value: "back"},
		{key: "tab", value: "next"},
		{key: "enter", value: "submit"},
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "esc":
			if len(m.cards) == 0 {
				return m.ShippingSwitch()
			}
			m.state.payment.view = paymentListView
			return m, nil
		}
	case *stripe.Token:
		params := terminal.CardNewParams{Token: terminal.F(msg.ID)}
		response, err := m.client.Card.New(m.context, params)

		if err != nil {
			m, cmd := m.PaymentSwitch()
			m.state.payment.view = paymentFormView
			m.state.payment.error = api.GetErrorMessage(err)
			return m, cmd
		}

		cards, _ := m.client.Card.List(m.context)
		m.cards = cards.Data
		return m, func() tea.Msg {
			m.SetCard(response.Data)
			return SelectedCardUpdatedMsg{cardID: response.Data}
		}

	case VisibleError:
		m, cmd := m.PaymentSwitch()
		m.state.payment.view = paymentFormView
		m.state.payment.error = msg.message
		return m, cmd
	}

	m = m.updatePaymentForm()

	next, cmd := m.state.payment.form.Update(msg)
	m.state.payment.form = next.(*huh.Form)
	cmds = append(cmds, cmd)
	if !m.state.payment.submitting && m.state.payment.form.State == huh.StateCompleted {
		m.state.payment.error = ""
		m.state.payment.submitting = true

		form := m.state.payment.form
		m.user.User.Name = form.GetString("name")
		m.user.User.Email = form.GetString("email")
		m.state.payment.input = paymentInput{
			number: form.GetString("number"),
			month:  form.GetString("month"),
			year:   form.GetString("year"),
			zip:    form.GetString("zip"),
		}

		return m, tea.Batch(func() tea.Msg {
			result, err := api.StripeCreditCard(&stripe.CardParams{
				Name:       stripe.String(m.user.User.Name),
				Number:     stripe.String(getCleanCardNumber(m.state.payment.input.number)),
				ExpMonth:   stripe.String(m.state.payment.input.month),
				ExpYear:    stripe.String(m.state.payment.input.year),
				CVC:        stripe.String(form.GetString("cvc")),
				AddressZip: stripe.String(m.state.payment.input.zip),
			})
			if err != nil {
				log.Error(*err)
				return VisibleError{message: *err}
			}
			return result
		}, func() tea.Msg {
			params := terminal.ProfileUpdateParams{
				Name:  terminal.String(m.user.User.Name),
				Email: terminal.String(m.user.User.Email),
			}
			response, err := m.client.Profile.Update(m.context, params)
			if err != nil {
			}
			return response.Data
		})
	}

	return m, tea.Batch(cmds...)
}

func (m model) paymentHttpsUpdate(msg tea.Msg) (model, tea.Cmd) {
	cmds := []tea.Cmd{}

	m.state.footer.commands = []footerCommand{
		{key: "esc", value: "back"},
	}

	switch msg := msg.(type) {
	case PollPaymentInitMsg:
		m.state.payment.url = &msg.paymentUrl
		m.state.payment.generating = false
		return m, func() tea.Msg {
			return PollPaymentStatusMsg{cardCount: len(m.cards)}
		}
	case PollPaymentStatusMsg:
		return m, tea.Tick(time.Second, func(t time.Time) tea.Msg {
			cards, _ := m.client.Card.List(m.context)
			if len(cards.Data) > msg.cardCount {
				return PollPaymentCompleteMsg{cards: cards.Data}
			}
			return PollPaymentStatusMsg{cardCount: msg.cardCount}
		})
	case PollPaymentCompleteMsg:
		m.cards = msg.cards
		m.state.payment.selected = len(m.cards) - 1
		cardID := m.cards[m.state.payment.selected].ID
		return m, func() tea.Msg {
			m.SetCard(cardID)
			return SelectedCardUpdatedMsg{cardID: cardID}
		}

	case tea.KeyMsg:
		switch msg.String() {
		case "esc":
			m.state.payment.view = paymentListView
			return m, nil
		}
	}

	return m, tea.Batch(cmds...)
}

func (m model) PaymentUpdate(msg tea.Msg) (model, tea.Cmd) {
	switch msg := msg.(type) {
	case SelectedCardUpdatedMsg:
		if m.IsSubscribing() {
			m.subscription.CardID = terminal.String(msg.cardID)
		} else {
			m.cart.CardID = msg.cardID
		}
		return m.ConfirmSwitch()
	}

	if m.state.payment.view == paymentFormView {
		return m.paymentFormUpdate(msg)
	} else if m.state.payment.view == paymentHttpsView {
		return m.paymentHttpsUpdate(msg)
	} else {
		return m.paymentListUpdate(msg)
	}
}

func (m model) PaymentView() string {
	if m.state.payment.submitting {
		return m.theme.Base().Width(m.widthContent).Render("verifying payment details...")
	}
	if m.state.payment.generating {
		return m.theme.Base().Width(m.widthContent).Render("generating payment link...")
	}

	if m.state.payment.view == paymentFormView {
		return m.paymentFormView()
	} else if m.state.payment.view == paymentHttpsView {
		return m.paymentHttpsView()
	} else {
		return m.paymentListView()
	}
}

func (m model) paymentListView() string {
	base := m.theme.Base().Render
	accent := m.theme.TextAccent().Render
	methods := []string{}
	for i, card := range m.cards {
		number := formatLast4(accent(card.Last4))
		contentWidth := lipgloss.Width(number)

		expir := accent(formatExpiration(card.Expiration))
		brand := base(card.Brand)
		space := contentWidth - lipgloss.Width(brand) - lipgloss.Width(expir)
		expLine := lipgloss.JoinHorizontal(
			lipgloss.Center,
			brand,
			m.theme.Base().Width(space).Render(),
			expir,
		)
		content := lipgloss.JoinVertical(lipgloss.Left, number, expLine)
		if m.state.payment.deleting != nil && *m.state.payment.deleting == i {
			content = accent("are you sure?") + base("\n(y/n)")
		}

		method := m.CreateBox(content, i == m.state.payment.selected)
		methods = append(methods, method)
	}

	newInSshIndex := len(m.cards)
	newInHttpsIndex := newInSshIndex + 1
	newInSsh := m.CreateCenteredBox(
		"add payment method (ssh)",
		m.state.payment.selected == newInSshIndex,
	)
	newInHttps := m.CreateCenteredBox(
		"add payment method (https)",
		m.state.payment.selected == newInHttpsIndex,
	)
	methods = append(methods, newInSsh)
	methods = append(methods, newInHttps)

	hint := "use selected payment method"
	if m.state.payment.selected == newInSshIndex {
		hint = "create new payment method (here)"
	} else if m.state.payment.selected == newInHttpsIndex {
		hint = "create new payment method (browser)"
	}

	return m.theme.Base().Render(lipgloss.JoinVertical(
		lipgloss.Left,
		m.paymentCostsView(),
		lipgloss.JoinVertical(lipgloss.Left, methods...),
		accent("enter ")+base(hint),
	))
}

func (m model) paymentFormView() string {
	return m.theme.Base().Render(lipgloss.JoinVertical(
		lipgloss.Left,
		m.paymentCostsView(),
		"\n",
		// "\ncreate new payment method:\n",
		m.state.payment.form.View(),
		m.theme.TextError().Render(m.state.payment.error),
	))
}

func (m model) paymentHttpsView() string {
	base := m.theme.Base().Render
	accent := m.theme.TextAccent().Render

	qr, _, err := qrfefe.Generate(0, *m.state.payment.url)
	if err != nil {
	}

	instructions := lipgloss.JoinVertical(
		lipgloss.Center,
		base("scan the QR code\n"),
		base("or copy the URL below"),
		accent(*m.state.payment.url),
	)

	space := m.widthContent - lipgloss.Width(qr) - lipgloss.Width(instructions)

	return m.theme.Base().Render(lipgloss.JoinVertical(
		lipgloss.Left,
		lipgloss.JoinHorizontal(
			lipgloss.Center,
			qr,
			m.theme.Base().Width(space).Render(),
			instructions,
		),
	))
}

func (m model) paymentCostsView() string {
	view := strings.Builder{}
	price := m.cart.Amount.Subtotal
	shipping := m.cart.Amount.Shipping

	if m.IsSubscribing() {
		price = m.state.subscribe.product.Variants[m.state.subscribe.selected].Price
		shipping = 0
	}

	view.WriteString(fmt.Sprintf("Subtotal: %s", formatUSD(int(price))) + ", ")
	view.WriteString(fmt.Sprintf("Shipping: %s", formatUSD(int(shipping))) + ", ")
	view.WriteString(
		m.theme.TextAccent().
			Render(fmt.Sprintf("Total: %s", formatUSD(int(price+shipping)))),
	)

	return view.String()
}
